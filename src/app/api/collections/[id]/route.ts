import { authorizeStudio } from '@/security/authorize';
import { revalidatePath } from 'next/cache';
import { eq, inArray } from 'drizzle-orm';
import { db, albums, albumPhoto, photos } from '@/db';
import { parseCollection } from '@/collections/validation';
import { revalidatePhotos } from '@/photo/query';

const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
function refresh() { revalidatePhotos(); revalidatePath('/collections', 'layout'); revalidatePath('/admin/collections'); }
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorizeStudio(request);
  if (denied) return denied;
  const { id } = await params;
  const value = parseCollection(await request.json().catch(() => null));
  if (!validId(id) || !value) return Response.json({ error: 'Add a title, a valid URL name, and at least one photograph.' }, { status: 400 });
  try {
    const found = await db.select({ id: photos.id }).from(photos).where(inArray(photos.id, value.photoIds));
    if (found.length !== value.photoIds.length) return Response.json({ error: 'A selected photograph no longer exists. Reload the library and try again.' }, { status: 400 });
    const fields = { title: value.title, slug: value.slug, description: value.description, updatedAt: new Date() };
    // Neon batches execute as one transaction: metadata and sequence succeed together.
    await db.batch([
      db.insert(albums).values({ id, ...fields }).onConflictDoUpdate({ target: albums.id, set: fields }),
      db.delete(albumPhoto).where(eq(albumPhoto.albumId, id)),
      db.insert(albumPhoto).values(value.photoIds.map((photoId, sortOrder) => ({ albumId: id, photoId, sortOrder }))),
    ]);
    refresh();
    return Response.json({ id, slug: value.slug });
  } catch (error) {
    const cause = error as { code?: string; cause?: { code?: string } };
    const conflict = cause.code === '23505' || cause.cause?.code === '23505';
    return Response.json({ error: conflict ? 'That URL name belongs to another collection. Choose a different one.' : 'Your collection couldn’t be saved. Please try again.' }, { status: conflict ? 409 : 500 });
  }
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorizeStudio(_request);
  if (denied) return denied;
  const { id } = await params;
  if (!validId(id)) return Response.json({ error: 'Collection not found.' }, { status: 404 });
  try {
    await db.delete(albums).where(eq(albums.id, id));
    refresh();
    return Response.json({ ok: true });
  } catch { return Response.json({ error: 'The collection couldn’t be removed. Please try again.' }, { status: 500 }); }
}
