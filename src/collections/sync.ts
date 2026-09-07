import { and, eq, inArray, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db, albums, albumPhoto, photos } from '@/db';
import { automaticLocations, planDestinationMembership } from './destinations';

export async function syncDestinationCollections(photoIds: string[]) {
  if (!photoIds.length) return;
  const destinations = (await db.select().from(albums)).filter(album => automaticLocations(album.location).length);
  if (!destinations.length) return;
  const [entries, members] = await Promise.all([
    db.select({ id: photos.id, hidden: photos.hidden, locationName: photos.locationName, tags: photos.tags, takenAt: photos.takenAt })
      .from(photos).where(inArray(photos.id, [...new Set(photoIds)])),
    db.select().from(albumPhoto).where(inArray(albumPhoto.albumId, destinations.map(album => album.id))),
  ]);
  const plan = planDestinationMembership(destinations, members, entries);
  const remove = db.delete(albumPhoto).where(or(...plan.remove.map(member => and(eq(albumPhoto.albumId, member.albumId), eq(albumPhoto.photoId, member.photoId)))));
  if (plan.add.length && plan.remove.length) {
    await db.batch([remove, db.insert(albumPhoto).values(plan.add).onConflictDoNothing()]);
  } else if (plan.add.length) await db.insert(albumPhoto).values(plan.add).onConflictDoNothing();
  else if (plan.remove.length) await remove;
  revalidatePath('/collections', 'layout');
  revalidatePath('/admin/collections');
}
