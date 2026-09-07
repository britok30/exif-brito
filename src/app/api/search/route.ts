import { eq, isNull, or } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db, photos, albums, albumPhoto } from '@/db';
import { shortPhotoLocation } from '@/photo/location';
import { formatCaptureDate } from '@/photo/format';
import { getPhotos, PHOTOS_TAG } from '@/photo/query';
import { imagePath } from '@/photo/url';
import { isS3Url } from '@/storage/s3';
import { searchKeywords } from '@/search/entries';
import type { SearchEntry } from '@/search/types';

export const dynamic = 'force-dynamic';

/** Collections with at least one public photograph: a small list, cached on its own. */
const listCollections = unstable_cache(async () => {
  const visible = or(eq(photos.hidden, false), isNull(photos.hidden));
  return db.selectDistinct({ slug: albums.slug, title: albums.title }).from(albums)
    .innerJoin(albumPhoto, eq(albumPhoto.albumId, albums.id))
    .innerJoin(photos, eq(photos.id, albumPhoto.photoId)).where(visible);
}, ['search', 'collections'], { tags: [PHOTOS_TAG] });

/**
 * Public search index. Photographs come from the cached, chunked public list,
 * so the index itself never becomes one oversized cache entry. Storage URLs
 * never leave the server; photographs carry only the proxy path of a rendition.
 */
export async function GET() {
  const [photographs, collections] = await Promise.all([getPhotos(), listCollections()]);
  const entries: SearchEntry[] = [
    ...collections.map(c => ({ id: `collection:${c.slug}`, name: c.title, subtitle: 'Collection',
      keywords: `${c.title}, ${c.slug.replaceAll('-', ' ')}`, path: `/collections/${encodeURIComponent(c.slug)}`, section: 'Collections' as const, image: null })),
    ...photographs.map(p => {
      const place = shortPhotoLocation(p);
      const source = p.thumbnailUrl || p.url;
      return { id: `photo:${p.id}`, name: p.title || place || 'Untitled photograph',
        subtitle: [place, formatCaptureDate(p)].filter(Boolean).join(' / '),
        keywords: searchKeywords(p),
        path: `/p/${p.id}`, section: 'Photographs' as const,
        image: isS3Url(source) ? imagePath(source) : null };
    }),
  ];
  return Response.json(entries, { headers: { 'Cache-Control': 'no-store' } });
}
