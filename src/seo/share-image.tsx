import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import type { Photo } from '@/db';
import { getDisplayUrl } from '@/photo/url';

const WIDTH = 1200;
const HEIGHT = 630;

/** A photograph's card never changes once rendered (storage keys are immutable), so the CDN keeps it for a week. */
export const PHOTO_CARD_CACHE = 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=2592000';
/** The site card follows the newest photograph, so it is refreshed hourly. */
export const SITE_CARD_CACHE = 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400';

/**
 * A 1200×630 social card: the display copy cropped to fill, encoded once by
 * sharp. No base64 round trip through Satori for a photograph; that path is
 * kept only for the wordmark card when there is nothing to show.
 */
export async function shareImage(photo?: Photo, cacheControl = PHOTO_CARD_CACHE) {
  if (photo?.hidden) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  if (!photo) {
    return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#000' }}>
      <div style={{ display: 'flex', fontSize: 100, fontWeight: 400 }}>Brito</div>
    </div>, { width: WIDTH, height: HEIGHT, headers: { 'Cache-Control': cacheControl } });
  }
  try {
    const upstream = await fetch(await getDisplayUrl(photo.thumbnailUrl || photo.url, 60), { signal: AbortSignal.timeout(10000) });
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const card = await sharp(Buffer.from(await upstream.arrayBuffer()))
      .rotate()
      .resize({ width: WIDTH, height: HEIGHT, fit: 'cover', position: 'centre' })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return new Response(new Uint8Array(card), { headers: {
      'Content-Type': 'image/jpeg', 'Cache-Control': cacheControl, 'X-Content-Type-Options': 'nosniff',
    } });
  } catch {
    return new Response('Preview unavailable', { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
