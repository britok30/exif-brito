// Gives imported photographs whose display copy sits outside photos/thumb/ a
// real thumbnail, made exactly as an upload makes one (src/photo/server.ts:
// rotate, 2560px wide, white flatten, ICC kept, mozjpeg q90 4:4:4, no EXIF).
// /api/image re-encodes anything outside photos/thumb/ with sharp on every
// uncached request to keep EXIF and GPS private; after this none are left.
//
//   node scripts/backfill-thumbnails.mjs [--apply]
//
// Without --apply it only reports what would change. The old display copies
// are left in storage; nothing is deleted.
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import sharp from 'sharp';
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const env = name => process.env[name] ?? '';
const apply = process.argv.includes('--apply');
const bucket = env('AWS_S3_BUCKET');
const endpoint = env('AWS_S3_ENDPOINT').replace(/\/+$/, '');
const base = endpoint && bucket ? `${endpoint}/${bucket}` : `https://${bucket}.s3.${env('AWS_S3_REGION')}.amazonaws.com`;
const s3 = new S3Client({
  region: env('AWS_S3_REGION') || 'auto',
  credentials: { accessKeyId: env('AWS_S3_ACCESS_KEY_ID'), secretAccessKey: env('AWS_S3_SECRET_ACCESS_KEY') },
  ...(endpoint ? { endpoint, forcePathStyle: true, requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' } : {}),
});
const sql = neon(env('DATABASE_URL'));

// Same as thumbnailKeyFor in src/app/api/photos/route.ts.
const thumbnailKeyFor = key => `photos/thumb/${(key.split('/').pop() ?? key).replace(/\.[^.]+$/, '')}.jpg`;
const thumbnail = buffer => sharp(buffer)
  .rotate()
  .resize({ width: 2560, withoutEnlargement: true })
  .flatten({ background: '#ffffff' })
  .keepIccProfile()
  .jpeg({ quality: 90, mozjpeg: true, progressive: true, chromaSubsampling: '4:4:4' })
  .toBuffer();
const exists = key => s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })).then(() => true, error => {
  if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') return false;
  throw error;
});

const rows = await sql.query(
  `select id, url, thumbnail_url from photos where thumbnail_url not like $1 and url like $2 order by id`,
  ['%/photos/thumb/%', `${base}/%`],
);
console.log(`${rows.length} photographs have a display copy outside photos/thumb/`);
if (!apply) {
  for (const row of rows.slice(0, 3)) console.log(`  ${row.id}: ${row.thumbnail_url.slice(base.length + 1)} → ${thumbnailKeyFor(row.url.slice(base.length + 1))}`);
  console.log('Dry run. Re-run with --apply to write them.');
  process.exit(0);
}

let done = 0, skipped = 0;
const failed = [];
const queue = [...rows];
await Promise.all(Array.from({ length: 4 }, async () => {
  for (let row = queue.shift(); row; row = queue.shift()) {
    const key = row.url.slice(base.length + 1);
    const target = thumbnailKeyFor(key);
    try {
      if (await exists(target)) { skipped++; console.log(`skip ${row.id}: ${target} already exists`); continue; }
      const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const body = await thumbnail(Buffer.from(await object.Body.transformToByteArray()));
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: target, Body: body, ContentType: 'image/jpeg' }));
      await sql.query(`update photos set thumbnail_url = $1, updated_at = now() where id = $2 and thumbnail_url = $3`, [`${base}/${target}`, row.id, row.thumbnail_url]);
      done++;
      if (done % 25 === 0) console.log(`${done}/${rows.length}`);
    } catch (error) {
      failed.push(row.id);
      console.error(`fail ${row.id}: ${error?.message ?? error}`);
    }
  }
}));
console.log(`Done: ${done} written, ${skipped} skipped, ${failed.length} failed${failed.length ? ` (${failed.join(', ')})` : ''}`);
