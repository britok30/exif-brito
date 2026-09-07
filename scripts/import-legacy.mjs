import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { photos } from '../src/db/schema.ts';
import { normalizeLocationName, knownLocationFromTags } from '../src/photo/location.ts';
import { validateLegacyArchive } from '../src/migration/legacy.ts';

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const file = args.find(arg => !arg.startsWith('--'));
  if (args.some(arg => arg.startsWith('--') && arg !== '--apply') || (!file && !process.env.LEGACY_DATABASE_URL)) {
    throw new Error('Usage: npm run import:legacy -- archive.json [--apply], or set LEGACY_DATABASE_URL');
  }
  // Source connection is used only for SELECT. No schema or storage changes.
  const source = file ? JSON.parse(await readFile(file, 'utf8'))
    : await neon(process.env.LEGACY_DATABASE_URL)`SELECT * FROM photos ORDER BY taken_at, id`;
  const rows = validateLegacyArchive(source).map(photo => ({ ...photo,
    locationName: photo.locationName ? normalizeLocationName(photo.locationName) : knownLocationFromTags(photo.tags),
  }));
  console.log(`Validated ${rows.length} photographs; ${rows.filter(p => p.hidden).length} hidden.`);
  console.log('IDs, original URLs, capture dates, EXIF, recipes, captions, and tags are retained.');
  if (!apply) {
    console.log('Dry run complete. No changes made. Add --apply to insert missing photos.');
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to apply the import');
  if (!rows.length) return;
  const db = drizzle(neon(process.env.DATABASE_URL), { casing: 'snake_case' });
  // A batch is transactional: a failed chunk rolls back the entire import.
  const queries = [];
  for (let i = 0; i < rows.length; i += 100) {
    queries.push(db.insert(photos).values(rows.slice(i, i + 100)).onConflictDoNothing({ target: photos.id }).returning({ id: photos.id }));
  }
  const result = await db.batch(queries);
  const inserted = result.reduce((count, batch) => count + batch.length, 0);
  console.log(`Imported ${inserted}; skipped ${rows.length - inserted} existing IDs. Existing records were not overwritten.`);
}

main().catch(error => {
  // Database errors can contain connection details or row contents.
  console.error(error?.constructor === Error || error instanceof SyntaxError ? error.message : 'Import failed. No changes committed; check source format and destination schema/connection.');
  process.exitCode = 1;
});
