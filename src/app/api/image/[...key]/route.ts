import { s3SignedUrl } from '@/storage/s3';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

// Storage keys never change once written, so renditions can be cached forever.
const KEY_PATTERN = /^photos\/[\w\-./]+\.(jpe?g|png|webp|avif|gif|heic|heif|tiff?)$/i;

/** Streams a stored photograph by key, giving next/image a stable, cacheable source. */
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  const parts = (await params).key;
  const displayOnly = parts[0] === 'display';
  const key = (displayOnly ? parts.slice(1) : parts).join('/');
  if (!KEY_PATTERN.test(key) || key.includes('..')) return new Response('Not found', { status: 404 });

  // Retire the former original-download URLs. A separate display namespace
  // prevents browsers from reusing previously cached original responses.
  if (!displayOnly && !key.startsWith('photos/thumb/')) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const upstream = await fetch(await s3SignedUrl(key, 'GET', 300));
  if (!upstream.ok || !upstream.body) return new Response('Not found', { status: upstream.status === 404 || upstream.status === 403 ? 404 : 502 });

  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Cross-Origin-Resource-Policy': 'same-site',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
    'Vary': 'Sec-Fetch-Site',
  });
  // Legacy photos without a display copy still render, but original bytes and
  // embedded GPS/EXIF never leave storage through this public endpoint.
  if (!key.startsWith('photos/thumb/')) {
    try {
      const display = await sharp(Buffer.from(await upstream.arrayBuffer()))
        .rotate()
        .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
        .keepIccProfile()
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
      headers.set('Content-Type', 'image/jpeg');
      return new Response(new Uint8Array(display), { headers });
    } catch {
      return new Response('Image unavailable', { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
  }
  const length = upstream.headers.get('content-length');
  if (length) headers.set('Content-Length', length);
  return new Response(upstream.body, { headers });
}
