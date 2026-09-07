import { db, photos, type Photo } from '@/db';
import { desc, eq, or, isNull, getTableColumns, sql } from 'drizzle-orm';
import { revalidateTag, unstable_cache, updateTag } from 'next/cache';

/** Every cached photo list carries this tag; mutations expire it. */
export const PHOTOS_TAG = 'photos';

// Inline placeholders beyond this size cost more than they save; legacy imports
// carry blur data far too large to ship for every tile, so it stays in the database.
export const MAX_INLINE_BLUR_LENGTH = 2000;

const galleryColumns = {
  ...getTableColumns(photos),
  blurData: sql<string | null>`case when length(${photos.blurData}) <= ${MAX_INLINE_BLUR_LENGTH} then ${photos.blurData} end`,
};

const publicOnly = or(eq(photos.hidden, false), isNull(photos.hidden));
const newestFirst = [desc(photos.takenAt), desc(photos.id)];

// The cache stores JSON, so timestamps come back as strings and need reviving.
const reviveDates = (row: Photo): Photo => ({
  ...row,
  takenAt: new Date(row.takenAt),
  updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
  createdAt: row.createdAt ? new Date(row.createdAt) : null,
});

const listPublicPhotos = unstable_cache(
  async (): Promise<Photo[]> => db.select(galleryColumns).from(photos).where(publicOnly).orderBy(...newestFirst),
  ['photos', 'public'], { tags: [PHOTOS_TAG] },
);
const listIndex = unstable_cache(
  async () => db.select({
    id: photos.id, title: photos.title, locationName: photos.locationName, tags: photos.tags,
    caption: photos.caption, semanticDescription: photos.semanticDescription,
    url: photos.url, thumbnailUrl: photos.thumbnailUrl, width: photos.width, height: photos.height, aspectRatio: photos.aspectRatio,
  }).from(photos).where(publicOnly).orderBy(...newestFirst),
  ['photos', 'index'], { tags: [PHOTOS_TAG] },
);

/** Public photographs, newest first, with oversized blur placeholders left out. Cached until a photograph changes. */
export async function getPhotos(limit?: number): Promise<Photo[]> {
  const rows = (await listPublicPhotos()).map(reviveDates);
  return limit ? rows.slice(0, limit) : rows;
}

/** Every photograph including hidden ones, for the private studio. */
export async function getLibrary(): Promise<Photo[]> {
  // Studio should reflect in-progress imports. A large private library can also
  // exceed the data cache's per-entry size, unlike the curated public gallery.
  return db.select(galleryColumns).from(photos).orderBy(...newestFirst);
}

export type PhotoIndexEntry = Awaited<ReturnType<typeof listIndex>>[number];

/** Just enough of the public archive to place a photograph, link its neighbours and drive the viewer. */
export const getPhotoIndex = (): Promise<PhotoIndexEntry[]> => listIndex();

export async function getPhotoById(id: string): Promise<Photo | undefined> {
  const [row] = await db.select().from(photos).where(eq(photos.id, id)).limit(1);
  return row;
}

/** Expire the cached lists after a photograph is added, edited or removed. */
export function revalidatePhotos(context: 'action' | 'route' = 'route') {
  if (context === 'action') updateTag(PHOTOS_TAG);
  else revalidateTag(PHOTOS_TAG, { expire: 0 });
}
