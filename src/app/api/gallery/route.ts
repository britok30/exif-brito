import { getPhotos } from '@/photo/query';
import { applyPhotoFilter, parsePhotoFilter } from '@/photo/filters';
import { toGalleryPhoto } from '@/photo/gallery-photo';

export const dynamic = 'force-dynamic';
const MAX_BATCH = 120;

/** A batch of public gallery tiles for one year, in page order, from the cached list. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const year = url.searchParams.get('year') ?? '';
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
  const limit = Math.min(MAX_BATCH, Math.max(1, Number(url.searchParams.get('limit')) || MAX_BATCH));
  if (!/^\d{4}$/.test(year)) return Response.json({ error: 'A year is required.' }, { status: 400 });
  const filter = parsePhotoFilter(Object.fromEntries(url.searchParams));
  const photos = applyPhotoFilter(await getPhotos(), filter).filter(photo => photo.takenAtNaive.startsWith(year));
  return Response.json({ total: photos.length, photos: photos.slice(offset, offset + limit).map(photo => toGalleryPhoto(photo, false)) },
    { headers: { 'Cache-Control': 'no-store' } });
}
