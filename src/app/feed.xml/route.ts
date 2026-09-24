import { getPhotos } from '@/photo/query';
import { imagePath } from '@/photo/url';
import { photoLabel } from '@/seo/metadata';
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from '@/seo/site';
import { formatCaptureDate } from '@/photo/format';
import { shortPhotoLocation } from '@/photo/location';

export const dynamic = 'force-dynamic';
const ITEMS = 50;

const escape = (value: string) => value.replace(/[<>&'"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!);

/** The newest photographs as RSS, each with a web-sized rendition for readers. */
export async function GET() {
  const photos = (await getPhotos()).filter(photo => !photo.excludeFromFeeds).slice(0, ITEMS);
  const items = photos.map(photo => {
    const link = absoluteUrl(`/p/${photo.id}`);
    const image = absoluteUrl(`/_next/image?url=${encodeURIComponent(imagePath(photo.thumbnailUrl || photo.url))}&w=1440&q=80`);
    const place = shortPhotoLocation(photo);
    const summary = [photo.caption || photo.semanticDescription, [place, formatCaptureDate(photo)].filter(Boolean).join(' · ')].filter(Boolean).join('\n\n');
    const alt = photo.semanticDescription || photo.caption || photoLabel(photo);
    const published = photo.createdAt ?? photo.takenAt;
    return `    <item>
      <title>${escape(photoLabel(photo))}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(published).toUTCString()}</pubDate>
      <description>${escape(`<p><img src="${image}" alt="${escape(alt)}" /></p>${summary ? `<p>${escape(summary).replace(/\n\n/g, '</p><p>')}</p>` : ''}`)}</description>
      <media:content url="${escape(image)}" medium="image" type="image/jpeg"${photo.width ? ` width="${Math.min(1440, photo.width)}"` : ''} />
${(photo.tags ?? []).map(tag => `      <category>${escape(tag)}</category>`).join('\n')}
    </item>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escape(SITE_TITLE)}</title>
    <link>${absoluteUrl('/')}</link>
    <description>${escape(SITE_DESCRIPTION)}</description>
    <language>en</language>
    <copyright>© ${escape(SITE_NAME)}</copyright>
    <atom:link href="${absoluteUrl('/feed.xml')}" rel="self" type="application/rss+xml" />
${photos[0] ? `    <lastBuildDate>${new Date(photos[0].createdAt ?? photos[0].takenAt).toUTCString()}</lastBuildDate>\n` : ''}${items.join('\n')}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400' } });
}
