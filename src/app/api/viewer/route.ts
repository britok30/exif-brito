import { getPhotos } from '@/photo/query';
import { applyPhotoFilter, parsePhotoFilter } from '@/photo/filters';
import { imagePath } from '@/photo/url';
import { viewerPhoto } from '@/photo/viewer-data';
import { PUBLIC_LIST_CACHE } from '@/photo/public-cache';

export const dynamic = 'force-dynamic';

/**
 * The viewer's running order for a gallery view, fetched once the page is idle
 * instead of being serialised into every page for every photograph.
 */
export async function GET(request: Request) {
  const filter = parsePhotoFilter(Object.fromEntries(new URL(request.url).searchParams));
  const photos = applyPhotoFilter(await getPhotos(), filter)
    .map(photo => viewerPhoto({ ...photo, imageSrc: imagePath(photo.thumbnailUrl || photo.url) }));
  return Response.json(photos, { headers: { 'Cache-Control': PUBLIC_LIST_CACHE } });
}
