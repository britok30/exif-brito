import { and, asc, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db, albums, albumPhoto, photos } from '@/db';
import { galleryColumns, MAX_INLINE_BLUR_LENGTH, PHOTOS_TAG, reviveDates } from '@/photo/query';
import { BLUR_TILES } from '@/photo/gallery-photo';

const visible = or(eq(photos.hidden, false), isNull(photos.hidden));

/**
 * Collections with just what a card or the studio needs from each member: the
 * cover's image and description, and the ids for counting and editing. Blur,
 * colour and recipe data stay in the database.
 */
async function loadCollections(includeHidden: boolean) {
  const [collections, members] = await Promise.all([
    db.select().from(albums).orderBy(desc(albums.createdAt), asc(albums.id)),
    db.select({
      albumId: albumPhoto.albumId, id: photos.id, title: photos.title, semanticDescription: photos.semanticDescription,
      url: photos.url, thumbnailUrl: photos.thumbnailUrl,
    }).from(albumPhoto)
      .innerJoin(photos, eq(photos.id, albumPhoto.photoId))
      .where(includeHidden ? undefined : visible)
      .orderBy(asc(albumPhoto.sortOrder), asc(albumPhoto.photoId)),
  ]);
  return collections.map(collection => ({ ...collection, photos: members.filter(member => member.albumId === collection.id) }))
    .filter(collection => includeHidden || collection.photos.length > 0);
}

const cachedPublicCollections = unstable_cache(() => loadCollections(false), ['collections', 'list'], { tags: [PHOTOS_TAG] });

/** Public collections are cached with the photo lists; every photo or album change expires them together. */
export const getCollections = (includeHidden = false) => includeHidden ? loadCollections(true) : cachedPublicCollections();

const cachedCollection = unstable_cache(async (slug: string) => {
  const [collection] = await db.select().from(albums).where(eq(albums.slug, slug)).limit(1);
  if (!collection) return null;
  // Blur placeholders only for the first screens, as on the home page, so a
  // large series stays well inside the 2 MB cache entry limit.
  const members = await db.select({
    ...galleryColumns(false),
    blurData: sql<string | null>`case when row_number() over (order by ${albumPhoto.sortOrder}, ${albumPhoto.photoId}) <= ${BLUR_TILES}
      and length(${photos.blurData}) <= ${MAX_INLINE_BLUR_LENGTH} then ${photos.blurData} end`,
  }).from(albumPhoto).innerJoin(photos, eq(photos.id, albumPhoto.photoId))
    .where(and(eq(albumPhoto.albumId, collection.id), visible))
    .orderBy(asc(albumPhoto.sortOrder), asc(albumPhoto.photoId));
  return members.length ? { ...collection, photos: members } : null;
}, ['collections', 'one'], { tags: [PHOTOS_TAG] });

export async function getCollection(slug: string) {
  const collection = await cachedCollection(slug);
  return collection && { ...collection, photos: collection.photos.map(reviveDates) };
}
