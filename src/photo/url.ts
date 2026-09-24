import { S3_BASE_URL, isS3Url, s3SignedUrl } from '@/storage/s3';

const SIGNED_URL_EXPIRES_IN_SECONDS = 5 * 60; // server-side fetches only

export async function getDisplayUrl(
  url: string,
  expiresIn: number = SIGNED_URL_EXPIRES_IN_SECONDS,
): Promise<string> {
  if (!isS3Url(url) || !S3_BASE_URL) return url;
  const key = url.slice(S3_BASE_URL.length + 1);
  return s3SignedUrl(key, 'GET', expiresIn);
}

/** Stable, unsigned path for next/image; falls back to the URL itself outside S3. */
export function imagePath(url: string): string {
  if (!isS3Url(url) || !S3_BASE_URL) return url;
  const key = url.slice(S3_BASE_URL.length + 1);
  return `/api/image/${key.startsWith('photos/thumb/') ? key : `display/${key}`}`;
}
