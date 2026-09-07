import { db, photos, type Photo } from '@/db';
import { count, desc, eq, or, isNull, getTableColumns, sql } from 'drizzle-orm';
import { revalidateTag, unstable_cache, updateTag } from 'next/cache';

/** Every cached photo list carries this tag; mutations expire it. */
export const PHOTOS_TAG = 'photos';

// Inline placeholders beyond this size cost more than they save; legacy imports
// carry blur data far too large to ship for every tile, so it stays in the database.
export const MAX_INLINE_BLUR_LENGTH = 2000;

/**
 * Rows for the gallery and studio lists. Colour analysis is never read by a
 * list, and blur placeholders only matter near the top of a page, so they
 * are kept for the first chunk alone; every other row leaves them out.
 */
const galleryColumns = (withBlur: boolean) => ({
  ...getTableColumns(photos),
  blurData: withBlur
    ? sql<string | null>`case when length(${photos.blurData}) <= ${MAX_INLINE_BLUR_LENGTH} then ${photos.blurData} end`
    : sql<string | null>`null::text`,
  colorData: sql<unknown>`null::jsonb`,
});

const publicOnly = or(eq(photos.hidden, false), isNull(photos.hidden));
const newestFirst = [desc(photos.takenAt), desc(photos.id)];

// The cache stores JSON, so timestamps come back as strings and need reviving.
const reviveDates = (row: Photo): Photo => ({
  ...row,
  takenAt: new Date(row.takenAt),
  updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
  createdAt: row.createdAt ? new Date(row.createdAt) : null,
});

/**
 * Next caches at most 2 MB per entry, and a list of thousands of photographs
 * is larger than that. Each list is stored as chunks of a few hundred rows,
 * keyed by scope and index; every chunk carries the photos tag, so a change
 * expires them together and they are rebuilt in parallel on the next visit.
 */
type Scope = 'public' | 'library';
/** Imports written straight to the database cannot expire the tag; the studio refreshes on its own after this long. */
const LIBRARY_REFRESH_SECONDS = 300;
const CHUNK = 300;
const scopeWhere = (scope: Scope) => scope === 'public' ? publicOnly : undefined;

const countPhotos = unstable_cache(
  async (scope: Scope) => Number((await db.select({ total: count() }).from(photos).where(scopeWhere(scope)))[0]?.total ?? 0),
  ['photos', 'count'], { tags: [PHOTOS_TAG], revalidate: LIBRARY_REFRESH_SECONDS },
);
const listChunk = unstable_cache(
  async (scope: Scope, index: number): Promise<Photo[]> => db.select(galleryColumns(index === 0)).from(photos)
    .where(scopeWhere(scope)).orderBy(...newestFirst).limit(CHUNK).offset(index * CHUNK),
  ['photos', 'chunk'], { tags: [PHOTOS_TAG], revalidate: LIBRARY_REFRESH_SECONDS },
);
async function listPhotos(scope: Scope): Promise<Photo[]> {
  const total = await countPhotos(scope);
  const chunks = await Promise.all(Array.from({ length: Math.ceil(total / CHUNK) }, (_, index) => listChunk(scope, index)));
  return chunks.flat().map(reviveDates);
}

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
  const rows = await listPhotos('public');
  return limit ? rows.slice(0, limit) : rows;
}

/** Every photograph including hidden ones, for the private studio. */
export async function getLibrary(): Promise<Photo[]> {
  // Cached like the public list; the studio's Refresh action or the periodic
  // refresh picks up imports written straight to the database.
  return listPhotos('library');
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
