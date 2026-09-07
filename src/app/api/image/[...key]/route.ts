import { s3SignedUrl } from '@/storage/s3';

export const dynamic = 'force-dynamic';

// Storage keys never change once written, so renditions can be cached forever.
const KEY_PATTERN = /^photos\/[\w\-./]+\.(jpe?g|png|webp|avif|gif|heic|heif|tiff?)$/i;

/** Streams a stored photograph by key, giving next/image a stable, cacheable source. */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join('/');
  if (!KEY_PATTERN.test(key) || key.includes('..')) return new Response('Not found', { status: 404 });

  const upstream = await fetch(await s3SignedUrl(key, 'GET', 300));
  if (!upstream.ok || !upstream.body) return new Response('Not found', { status: upstream.status === 404 || upstream.status === 403 ? 404 : 502 });

  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  const length = upstream.headers.get('content-length');
  if (length) headers.set('Content-Length', length);
  return new Response(upstream.body, { headers });
}
