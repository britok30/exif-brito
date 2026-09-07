import { revalidatePath } from 'next/cache';
import { authorizeStudio } from '@/security/authorize';
import { revalidatePhotos } from '@/photo/query';

/** Expire every cached photo list and studio page, for changes made outside the app such as imports. */
export async function POST(request: Request) {
  const denied = await authorizeStudio(request);
  if (denied) return denied;
  revalidatePhotos();
  revalidatePath('/admin', 'layout');
  revalidatePath('/');
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}
