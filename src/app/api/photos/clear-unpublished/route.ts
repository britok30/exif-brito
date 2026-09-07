import { authorizeStudio } from '@/security/authorize';
import { db, photos } from '@/db';
import { and, eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { revalidatePhotos } from '@/photo/query';

export async function GET() {
  const denied = await authorizeStudio();
  if (denied) return denied;
  const rows = await db.select({ id: photos.id }).from(photos).where(eq(photos.hidden, true));
  return Response.json({ ids: rows.map(photo => photo.id) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const denied = await authorizeStudio(request);
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  if (body?.confirmation !== 'CLEAR' || !Array.isArray(body.ids) || !body.ids.length || body.ids.length > 20000 ||
    body.ids.some((id: unknown) => typeof id !== 'string' || !/^[a-z0-9]{8}$/i.test(id))) {
    return Response.json({ error: 'Confirm the photographs to clear.' }, { status: 400 });
  }
  try {
    // Snapshot IDs exclude later imports; the predicate protects photos published since confirmation.
    // Retain storage objects deliberately: clearing the review library does not destroy originals.
    const removed = await db.delete(photos).where(and(inArray(photos.id, [...new Set<string>(body.ids)]), eq(photos.hidden, true)))
      .returning({ id: photos.id });
    revalidatePhotos();
    revalidatePath('/admin', 'layout');
    return Response.json({ removed: removed.length });
  } catch {
    return Response.json({ error: 'Couldn’t finish clearing. Refresh the dashboard before trying again.' }, { status: 500 });
  }
}
