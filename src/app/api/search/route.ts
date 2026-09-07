import { desc, eq, isNull, or } from 'drizzle-orm';
import { db, photos, albums, albumPhoto } from '@/db';
import { shortPhotoLocation } from '@/photo/location';
import { searchKeywords } from '@/search/entries';
import type { SearchEntry } from '@/search/types';

export const dynamic = 'force-dynamic';

/** Public search deliberately omits hidden photographs and storage URLs. */
export async function GET() {
  const visible = or(eq(photos.hidden, false), isNull(photos.hidden));
  const [photographs, collections] = await Promise.all([
    db.select({ id: photos.id, title: photos.title, caption: photos.caption,
      locationName: photos.locationName, tags: photos.tags, takenAtNaive: photos.takenAtNaive,
      semanticDescription: photos.semanticDescription, make: photos.make, model: photos.model, lensModel: photos.lensModel, film: photos.film })
      .from(photos).where(visible).orderBy(desc(photos.takenAtNaive), desc(photos.id)),
    db.selectDistinct({ slug: albums.slug, title: albums.title }).from(albums)
      .innerJoin(albumPhoto, eq(albumPhoto.albumId, albums.id))
      .innerJoin(photos, eq(photos.id, albumPhoto.photoId)).where(visible),
  ]);
  const entries: SearchEntry[] = [
    ...collections.map(c => ({ id: `collection:${c.slug}`, name: c.title, subtitle: 'Collection',
      keywords: `${c.title}, ${c.slug.replaceAll('-', ' ')}`, path: `/collections/${encodeURIComponent(c.slug)}`, section: 'Collections' as const })),
    ...photographs.map(p => {
      const place = shortPhotoLocation(p);
      const date = p.takenAtNaive.slice(0, 10);
      return { id: `photo:${p.id}`, name: p.title || place || 'Untitled photograph',
        subtitle: [place, date, p.id].filter(Boolean).join(' · '),
        keywords: searchKeywords(p),
        path: `/p/${p.id}`, section: 'Photographs' as const };
    }),
  ];
  return Response.json(entries, { headers: { 'Cache-Control': 'no-store' } });
}
