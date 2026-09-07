// Copies every photo object from the configured bucket (AWS_S3_*) to another
// S3-compatible bucket (TARGET_S3_*), for example Cloudflare R2. Safe to re-run:
// objects already present at the destination with the same size are skipped.
//
//   node scripts/copy-storage.mjs [prefix]      (default prefix: photos/)
import 'dotenv/config';
import { S3Client, ListObjectsV2Command, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const env = name => process.env[name] ?? '';
const compat = endpoint => endpoint ? {
  endpoint, forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
} : {};

const source = {
  bucket: env('AWS_S3_BUCKET'),
  client: new S3Client({
    region: env('AWS_S3_REGION') || 'auto',
    credentials: { accessKeyId: env('AWS_S3_ACCESS_KEY_ID'), secretAccessKey: env('AWS_S3_SECRET_ACCESS_KEY') },
    ...compat(env('AWS_S3_ENDPOINT')),
  }),
};
const target = {
  bucket: env('TARGET_S3_BUCKET'),
  client: new S3Client({
    region: env('TARGET_S3_REGION') || 'auto',
    credentials: { accessKeyId: env('TARGET_S3_ACCESS_KEY_ID'), secretAccessKey: env('TARGET_S3_SECRET_ACCESS_KEY') },
    ...compat(env('TARGET_S3_ENDPOINT')),
  }),
};
if (!source.bucket || !target.bucket || !env('TARGET_S3_ACCESS_KEY_ID')) {
  console.error('Set AWS_S3_* for the source and TARGET_S3_ENDPOINT, TARGET_S3_BUCKET, TARGET_S3_ACCESS_KEY_ID and TARGET_S3_SECRET_ACCESS_KEY for the destination.');
  process.exit(1);
}

const prefix = process.argv[2] ?? 'photos/';
const objects = [];
for (let token; ;) {
  const page = await source.client.send(new ListObjectsV2Command({ Bucket: source.bucket, Prefix: prefix, ContinuationToken: token }));
  objects.push(...(page.Contents ?? []));
  if (!page.IsTruncated) break;
  token = page.NextContinuationToken;
}
console.log(`${objects.length} objects under ${prefix} in ${source.bucket}`);

const existingSize = async key => {
  try { return (await target.client.send(new HeadObjectCommand({ Bucket: target.bucket, Key: key }))).ContentLength; }
  catch (error) { if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') return undefined; throw error; }
};

let copied = 0, skipped = 0, bytes = 0;
const queue = [...objects];
const worker = async () => {
  for (let object = queue.shift(); object; object = queue.shift()) {
    const key = object.Key;
    if ((await existingSize(key)) === object.Size) { skipped++; continue; }
    const got = await source.client.send(new GetObjectCommand({ Bucket: source.bucket, Key: key }));
    const body = Buffer.from(await got.Body.transformToByteArray());
    await target.client.send(new PutObjectCommand({ Bucket: target.bucket, Key: key, Body: body, ContentType: got.ContentType, Metadata: got.Metadata }));
    copied++; bytes += body.length;
    if (copied % 25 === 0) console.log(`  copied ${copied}, skipped ${skipped}, ${(bytes / 1e9).toFixed(2)} GB so far`);
  }
};
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`Done: copied ${copied} (${(bytes / 1e9).toFixed(2)} GB), skipped ${skipped} already present.`);
