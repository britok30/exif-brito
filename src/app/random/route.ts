import { getPhotos } from '@/photo/query';

export const dynamic = 'force-dynamic';

/** A different public photograph on every visit. */
export async function GET(request: Request) {
  const photos = await getPhotos();
  const target = photos.length ? `/p/${photos[Math.floor(Math.random() * photos.length)].id}` : '/';
  return new Response(null, { status: 307, headers: { Location: new URL(target, request.url).toString(), 'Cache-Control': 'private, no-store' } });
}
