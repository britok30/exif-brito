import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, photos } from '@/db';
import { isOwner } from '@/security/owner';

/** Public, outside the studio-guarded /api/photos prefix. A photograph's film recipe, fetched when its dialog opens. Hidden photographs are only served to the owner. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{8}$/i.test(id)) return Response.json({ error: 'Not found' }, { status: 404 });
  const [photo] = await db.select({ hidden: photos.hidden, recipe: photos.recipeData }).from(photos).where(eq(photos.id, id)).limit(1);
  if (!photo || (photo.hidden && !isOwner(await auth()))) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ recipe: photo.recipe ?? null }, { headers: { 'Cache-Control': photo.hidden ? 'private, no-store' : 'public, max-age=3600' } });
}
