import { expect, it, vi } from 'vitest';
vi.mock('./query', () => ({ MAX_INLINE_BLUR_LENGTH: 2000 }));
import type { Photo } from '@/db';
import { toGalleryPhoto } from './gallery-photo';

it('sends a tile only the proxy path of its rendition, never storage URLs', () => {
  const tile = toGalleryPhoto({
    id: 'aaaaaaa1', url: 'https://test-bucket.s3.us-east-2.amazonaws.com/photos/one.JPG',
    thumbnailUrl: 'https://test-bucket.s3.us-east-2.amazonaws.com/photos/thumb/one.jpg', takenAtNaive: '2024-01-01T00:00:00',
    recipeData: null, blurData: null,
  } as unknown as Photo, false);
  expect(tile.imageSrc).toBe('/api/image/photos/thumb/one.jpg');
  expect('url' in tile).toBe(false);
  expect('thumbnailUrl' in tile).toBe(false);
  expect(JSON.stringify(tile)).not.toContain('amazonaws');
});
