// Finds stored objects that no photograph points to: uploads abandoned before
// publishing, and originals kept when the review library was cleared. Lists
// them by default; deletes them only with --apply. Objects younger than a day
// are always left alone, since an upload may still be on its way to publishing.
//
//   node scripts/sweep-orphans.mjs              (report only)
//   node scripts/sweep-orphans.mjs --apply      (delete what the report lists)
//   node scripts/sweep-orphans.mjs --min-age-hours=72
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const env = name => process.env[name] ?? '';
const apply = process.argv.includes('--apply');
const minAgeHours = Number(process.argv.find(arg => arg.startsWith('--min-age-hours='))?.split('=')[1] ?? 24);
if (!Number.isFinite(minAgeHours) || minAgeHours < 1) throw new Error('--min-age-hours must be at least 1');

const bucket = env('AWS_S3_BUCKET'), endpoint = env('AWS_S3_ENDPOINT').replace(/\/+$/, ''), region = env('AWS_S3_REGION');
const base = endpoint && bucket ? `${endpoint}/${bucket}` : bucket && region ? `https://${bucket}.s3.${region}.amazonaws.com` : '';
if (!base || !env('DATABASE_URL')) { console.error('Set DATABASE_URL and the AWS_S3_* storage variables.'); process.exit(1); }

const client = new S3Client({
  region: region || 'auto',
  credentials: { accessKeyId: env('AWS_S3_ACCESS_KEY_ID'), secretAccessKey: env('AWS_S3_SECRET_ACCESS_KEY') },
  ...(endpoint && { endpoint, forcePathStyle: true, requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' }),
});

// Every key a photograph refers to: its original, its display copy, and a RAW
// file kept beside a camera JPEG (see src/photo/raw-source.ts).
const sql = neon(env('DATABASE_URL'));
const rows = await sql`select url, thumbnail_url from photos`;
const referenced = new Set();
for (const { url, thumbnail_url } of rows) {
  for (const value of [url, thumbnail_url]) if (value?.startsWith(`${base}/`)) referenced.add(value.slice(base.length + 1));
  const raw = /\/photos\/(sd-raw-[a-f0-9]{64})\.jpg$/.exec(url ?? '');
  if (raw) referenced.add(`photos/raw/${raw[1]}.raf`);
}

const objects = [];
for (let token; ;) {
  const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'photos/', ContinuationToken: token }));
  objects.push(...(page.Contents ?? []));
  if (!page.IsTruncated) break;
  token = page.NextContinuationToken;
}

const cutoff = Date.now() - minAgeHours * 3600_000;
const orphans = objects.filter(object => !referenced.has(object.Key) && object.LastModified && object.LastModified.getTime() < cutoff);
const bytes = orphans.reduce((sum, object) => sum + (object.Size ?? 0), 0);
console.log(`${rows.length} photographs, ${objects.length} stored objects, ${orphans.length} unreferenced and older than ${minAgeHours}h (${(bytes / 1e6).toFixed(1)} MB).`);
for (const object of orphans) console.log(`  ${object.Key}  ${object.LastModified.toISOString().slice(0, 10)}  ${((object.Size ?? 0) / 1e6).toFixed(1)} MB`);

if (!apply) { if (orphans.length) console.log('Report only. Re-run with --apply to delete these objects.'); process.exit(0); }
for (let index = 0; index < orphans.length; index += 1000) {
  const batch = orphans.slice(index, index + 1000);
  const result = await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch.map(object => ({ Key: object.Key })), Quiet: true } }));
  for (const error of result.Errors ?? []) console.error(`  could not delete ${error.Key}: ${error.Message}`);
}
console.log(`Deleted ${orphans.length} objects.`);
