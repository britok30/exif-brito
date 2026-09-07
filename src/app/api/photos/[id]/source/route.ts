import { authorizeStudio } from '@/security/authorize';
import { getPhotoById } from '@/photo/query';
import { rawSourceKey } from '@/photo/raw-source';
import { isS3Url, s3SignedUrl } from '@/storage/s3';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorizeStudio(_request);
  if (denied) return denied;
  const { id } = await params;
  if (!/^[a-z0-9]{8}$/i.test(id)) return new Response('Not found', { status: 404 });
  const photo = await getPhotoById(id);
  const key = photo && isS3Url(photo.url) ? rawSourceKey(photo.url) : undefined;
  if (!key) return new Response('Not found', { status: 404 });
  try {
    const upstream = await fetch(await s3SignedUrl(key, 'GET', 300), { cache: 'no-store' });
    if (!upstream.ok || !upstream.body) return new Response('Original unavailable', { status: 502 });
    return new Response(upstream.body, { headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${id}.RAF"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch { return new Response('Original unavailable', { status: 502 }); }
}
