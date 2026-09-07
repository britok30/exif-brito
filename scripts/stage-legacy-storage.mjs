import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { neon } from '@neondatabase/serverless';
import { validateLegacyArchive } from '../src/migration/legacy.ts';
import { generateThumbnailBuffer, readPhotoDimensions } from '../src/photo/server.ts';
import { knownLocationFromTags } from '../src/photo/location.ts';
import { reverseGeocode } from '../src/platforms/google-maps.ts';

// Stage originals and display renditions before the transactional database import.
// The exclusions file contains reviewed { legacyId, existingId } duplicate pairs.
// Nothing is removed from either library. Deterministic object keys allow retries.
async function main() {
  const [sourceFile, exclusionsFile, outputFile, flag] = process.argv.slice(2);
  if (!sourceFile || !exclusionsFile || !outputFile || flag !== '--apply') {
    throw new Error('Usage: node --experimental-strip-types scripts/stage-legacy-storage.mjs source.json exclusions.json output.json --apply');
  }
  const source = validateLegacyArchive(JSON.parse(await readFile(sourceFile, 'utf8')));
  const exclusions = JSON.parse(await readFile(exclusionsFile, 'utf8'));
  if (!Array.isArray(exclusions)) throw new Error('Expected reviewed duplicate pairs');
  const destination = await neon(process.env.DATABASE_URL)`SELECT id FROM photos`;
  const existing = new Set(destination.map(p => p.id));
  const sourceIds = new Set(source.map(p => p.id));
  const excluded = new Set();
  for (const pair of exclusions) {
    if (!sourceIds.has(pair.legacyId) || !existing.has(pair.existingId)) throw new Error('Duplicate mapping does not match the source and destination');
    excluded.add(pair.legacyId);
  }
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_S3_REGION;
  if (!bucket || !region) throw new Error('Destination storage is not configured');
  const client = new S3Client({ region, credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
  } });
  const base = `https://${bucket}.s3.${region}.amazonaws.com`;
  const prepared = [];
  const queue = source.filter(p => !excluded.has(p.id) && !existing.has(p.id));
  let next = 0;
  let stopped = false;
  async function put(key, body, contentType) {
    const sha = createHash('sha256').update(body).digest('hex');
    try {
      const stored = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      if (stored.Metadata?.sha256 === sha && stored.ContentLength === body.length) return `${base}/${key}`;
      throw new Error('Existing migration object differs; refusing to overwrite');
    } catch (error) {
      if (error.$metadata?.httpStatusCode !== 404) throw error;
    }
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body,
      ContentType: contentType, Metadata: { sha256: sha }, IfNoneMatch: '*' }));
    return `${base}/${key}`;
  }
  const results = await Promise.allSettled(Array.from({ length: 3 }, async () => {
    while (!stopped && next < queue.length) {
      const photo = queue[next++];
      try {
        const response = await fetch(photo.url, { signal: AbortSignal.timeout(90000) });
        if (!response.ok) throw new Error(`Source image ${photo.id} returned HTTP ${response.status}`);
        const original = Buffer.from(await response.arrayBuffer());
        const hash = createHash('sha256').update(original).digest('hex');
        const key = `photos/legacy/${photo.id}-${hash.slice(0,16)}`;
        const [dimensions, preview] = await Promise.all([readPhotoDimensions(original), generateThumbnailBuffer(original)]);
        const url = await put(`${key}.${photo.extension}`, original, response.headers.get('content-type') || 'image/jpeg');
        const thumbnailUrl = await put(`${key}-display.jpg`, preview, 'image/jpeg');
        let locationName = photo.locationName || knownLocationFromTags(photo.tags);
        if (!locationName && photo.latitude != null && photo.longitude != null) {
          const place = await reverseGeocode(photo.latitude, photo.longitude);
          locationName = place?.city && place.country ? `${place.city}, ${place.country}` : place?.formatted;
        }
        prepared.push({ ...photo, ...dimensions, url, thumbnailUrl,
          locationName });
        if (prepared.length % 10 === 0) console.log(`Copied ${prepared.length}/${queue.length} photographs`);
      } catch (error) { stopped = true; throw error; }
    }
  }));
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
  await writeFile(outputFile, JSON.stringify(prepared, null, 2), { mode: 0o600 });
  console.log(`Prepared ${prepared.length}; excluded ${excluded.size} reviewed duplicates. Database unchanged.`);
}

main().catch(error => {
  console.error(error.constructor === Error ? error.message : 'Storage staging failed; database unchanged. Retry to reuse completed copies.');
  process.exitCode = 1;
});
