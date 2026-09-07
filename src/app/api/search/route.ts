import { desc, eq, isNull, or } from 'drizzle-orm';
import { unstable_cache } from 'next/cache';
import { db, photos, albums, albumPhoto } from '@/db';
import { shortPhotoLocation } from '@/photo/location';
import { formatCaptureDate } from '@/photo/format';
import { PHOTOS_TAG } from '@/photo/query';
import { imagePath } from '@/photo/url';
import { isS3Url } from '@/storage/s3';
import { searchKeywords } from '@/search/entries';
import type { SearchEntry } from '@/search/types';

export const dynamic = 'force-dynamic';

/**
 * Public search index: published photographs and the collections that contain
 * them. Storage URLs never leave the server; photographs carry only the proxy
 * path of a small rendition. Cached until a photograph or collection changes.
 */
const buildIndex = unstable_cache(async (): Promise<SearchEntry[]> => {
  const visible = or(eq(photos.hidden, false), isNull(photos.hidden));
  const [photographs, collections] = await Promise.all([
    db.select({ id: photos.id, title: photos.title, caption: photos.caption,
      locationName: photos.locationName, tags: photos.tags, takenAtNaive: photos.takenAtNaive,
      semanticDescription: photos.semanticDescription, make: photos.make, model: photos.model, lensModel: photos.lensModel, film: photos.film,
      url: photos.url, thumbnailUrl: photos.thumbnailUrl })
      .from(photos).where(visible).orderBy(desc(photos.takenAtNaive), desc(photos.id)),
    db.selectDistinct({ slug: albums.slug, title: albums.title }).from(albums)
      .innerJoin(albumPhoto, eq(albumPhoto.albumId, albums.id))
      .innerJoin(photos, eq(photos.id, albumPhoto.photoId)).where(visible),
  ]);
  return [
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
}, ['search', 'index'], { tags: [PHOTOS_TAG] });

export async function GET() {
  return Response.json(await buildIndex(), { headers: { 'Cache-Control': 'no-store' } });
}
