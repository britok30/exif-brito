import { and, asc, desc, eq, isNull, or } from 'drizzle-orm';
import { db, albums, albumPhoto, photos } from '@/db';

export async function getCollections(includeHidden = false) {
  const [collections, members] = await Promise.all([
    db.select().from(albums).orderBy(desc(albums.createdAt), asc(albums.id)),
    db.select({ albumId: albumPhoto.albumId, photo: photos }).from(albumPhoto)
      .innerJoin(photos, eq(photos.id, albumPhoto.photoId))
      .where(includeHidden ? undefined : or(eq(photos.hidden, false), isNull(photos.hidden)))
      .orderBy(asc(albumPhoto.sortOrder), asc(albumPhoto.photoId)),
  ]);
  return collections.map(collection => ({ ...collection, photos: members.filter(member => member.albumId === collection.id).map(member => member.photo) }))
    .filter(collection => includeHidden || collection.photos.length > 0);
}
export async function getCollection(slug: string) {
  const [collection] = await db.select().from(albums).where(eq(albums.slug, slug)).limit(1);
  if (!collection) return null;
  const members = await db.select({ photo: photos }).from(albumPhoto).innerJoin(photos, eq(photos.id, albumPhoto.photoId))
    .where(and(eq(albumPhoto.albumId, collection.id), or(eq(photos.hidden, false), isNull(photos.hidden))))
    .orderBy(asc(albumPhoto.sortOrder), asc(albumPhoto.photoId));
  return members.length ? { ...collection, photos: members.map(member => member.photo) } : null;
}
