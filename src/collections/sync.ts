import { and, eq, inArray, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db, albums, albumPhoto, photos } from '@/db';
import { automaticLocations, planDestinationMembership } from './destinations';
import { revalidatePhotos } from '@/photo/query';

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
  if (plan.add.length || plan.remove.length) await applyPlan(plan);
  revalidatePath('/collections', 'layout');
  revalidatePath('/admin/collections');
}

async function applyPlan(plan: ReturnType<typeof planDestinationMembership>) {
  // Built only when there is something to remove: `or()` of nothing would match every membership.
  const remove = plan.remove.length
    ? db.delete(albumPhoto).where(or(...plan.remove.map(member => and(eq(albumPhoto.albumId, member.albumId), eq(albumPhoto.photoId, member.photoId)))))
    : undefined;
  const add = plan.add.length ? db.insert(albumPhoto).values(plan.add).onConflictDoNothing() : undefined;
  if (remove && add) await db.batch([remove, add]);
  else await (remove ?? add);
  // Cached collection lists and the search index carry the photos tag.
  revalidatePhotos();
}
