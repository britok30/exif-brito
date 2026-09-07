import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
import { normalizeLocationName, knownLocationFromTags } from '../src/photo/location.ts';

const apply = process.argv.includes('--apply');
const sql = neon(process.env.DATABASE_URL);
const rows = await sql`SELECT id, location_name, tags, updated_at::text AS updated_at FROM photos ORDER BY id`;
const changes = rows.flatMap(row => {
  const next = row.location_name?.trim() ? normalizeLocationName(row.location_name) : knownLocationFromTags(row.tags);
  return next && next !== row.location_name ? [{ ...row, next }] : [];
});
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', inspected: rows.length, changes: changes.map(row => ({ id: row.id, location: row.next })) }));
if (apply && changes.length) {
  const backup = `/tmp/brito-locations-${Date.now()}.json`;
  await writeFile(backup, JSON.stringify(changes, null, 2), { mode: 0o600, flag: 'wx' });
  const results = await sql.transaction(changes.map(row => sql`
    UPDATE photos SET location_name = ${row.next}, updated_at = now()
    WHERE id = ${row.id} AND location_name IS NOT DISTINCT FROM ${row.location_name}
      AND updated_at IS NOT DISTINCT FROM ${row.updated_at}::timestamptz
    RETURNING id
  `));
  const updated = results.flat().length;
  console.log(JSON.stringify({ updated, skippedConcurrentChanges: changes.length - updated, backup }));
  const after = await sql`SELECT id, location_name FROM photos ORDER BY id`;
  const changedIds = new Set(changes.map(row => row.id));
  const untouched = rows.filter(row => !changedIds.has(row.id));
  console.log(JSON.stringify({ otherLocationsPreserved: untouched.every(row => after.find(item => item.id === row.id)?.location_name === row.location_name) }));
}
