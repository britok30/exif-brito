import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, photos } from '../src/db';
import { CITY_REMAP, normalizeCity } from '../src/platforms/google-maps';

async function main() {
  const all = await db.select().from(photos);
  console.log(`Scanning ${all.length} photos...`);

  let updated = 0;
  for (const photo of all) {
    const tags = photo.tags ?? [];
    if (tags.length === 0) continue;

    const original = tags[0];
    const remapped = normalizeCity(original);
    if (remapped === original) continue;

    const nextTags = [remapped!, ...tags.slice(1)];
    await db.update(photos).set({ tags: nextTags }).where(eq(photos.id, photo.id));
    console.log(`  ${photo.id}: "${original}" → "${remapped}"`);
    updated += 1;
  }

  console.log(`\nDone. Updated ${updated} photo${updated === 1 ? '' : 's'}.`);
  console.log(`Remap table covers ${Object.keys(CITY_REMAP).length} entries.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
