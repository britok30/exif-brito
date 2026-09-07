import { S3_BASE_URL, isS3Url, s3SignedUrl } from '@/storage/s3';

import { MAX_INLINE_BLUR_LENGTH } from './query';

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60 * 6; // 6 hours

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

/**
 * Gallery pages need only the stable proxy path per photograph: no signing,
 * so a page with hundreds of tiles costs no per-request crypto.
 */
export function withImageSources<T extends { url: string; thumbnailUrl?: string | null; blurData?: string | null }>(
  items: T[],
): Array<T & { imageSrc: string }> {
  return items.map(item => ({
    ...item,
    blurData: item.blurData && item.blurData.length <= MAX_INLINE_BLUR_LENGTH ? item.blurData : null,
    imageSrc: imagePath(item.thumbnailUrl || item.url),
  }));
}

export interface PhotoWithDisplayUrls {
  displayUrl: string;       // signed, sized for grid/lightbox (~2560px wide)
  fullUrl: string;          // signed original
  imageSrc: string;         // stable path for next/image renditions
}

export async function withDisplayUrls<
  T extends { id: string; url: string; thumbnailUrl?: string | null; blurData?: string | null },
>(items: T[]): Promise<Array<T & PhotoWithDisplayUrls>> {
  return Promise.all(
    items.map(async item => {
      const fullUrl = await getDisplayUrl(item.url);
      const displayUrl = item.thumbnailUrl
        ? await getDisplayUrl(item.thumbnailUrl)
        : fullUrl;
      const blurData = item.blurData && item.blurData.length <= MAX_INLINE_BLUR_LENGTH ? item.blurData : null;
      return { ...item, blurData, displayUrl, fullUrl, imageSrc: imagePath(item.thumbnailUrl || item.url) };
    }),
  );
}
