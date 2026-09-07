import type { MetadataRoute } from 'next';
import { eq, isNull, or } from 'drizzle-orm';
import { db, photos, albums, albumPhoto } from '@/db';
import { imagePath } from '@/photo/url';
import { absoluteUrl } from '@/seo/site';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const visible = or(eq(photos.hidden,false),isNull(photos.hidden));
  const [entries,collections] = await Promise.all([
    db.select({id:photos.id,url:photos.url,thumbnailUrl:photos.thumbnailUrl,updatedAt:photos.updatedAt}).from(photos).where(visible),
    db.select({slug:albums.slug,updatedAt:albums.updatedAt}).from(albums).innerJoin(albumPhoto,eq(albumPhoto.albumId,albums.id))
      .innerJoin(photos,eq(photos.id,albumPhoto.photoId)).where(visible),
  ]);
  return [
    {url:absoluteUrl('/')},{url:absoluteUrl('/collections')},
    ...[...new Map(collections.map(c=>[c.slug,c])).values()].map(c=>({url:absoluteUrl(`/collections/${c.slug}`),...(c.updatedAt?{lastModified:c.updatedAt}:{})})),
    ...entries.map(p=>({url:absoluteUrl(`/p/${p.id}`),...(p.updatedAt?{lastModified:p.updatedAt}:{}),images:[absoluteUrl(imagePath(p.thumbnailUrl || p.url))]})),
  ];
}
