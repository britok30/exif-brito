import { expect, it, vi } from 'vitest';
const photos = [
  { id: 'aaaaaaa1', title: 'Harbour', locationName: 'Lisbon, Portugal', tags: [], semanticDescription: 'Boats at dusk', caption: null,
    url: 'https://test-bucket.s3.us-east-2.amazonaws.com/photos/one.jpg', thumbnailUrl: 'https://test-bucket.s3.us-east-2.amazonaws.com/photos/thumb/one.jpg',
    width: 3000, height: 2000, aspectRatio: 1.5, film: 'classic-chrome', make: null, model: null, lensModel: null, focalLength: 23, takenAtNaive: '2024-05-01T10:00:00' },
  { id: 'aaaaaaa2', title: null, locationName: 'Kyoto, Japan', tags: [], semanticDescription: null, caption: 'Rain',
    url: 'https://test-bucket.s3.us-east-2.amazonaws.com/photos/two.jpg', thumbnailUrl: null,
    width: null, height: null, aspectRatio: 0.8, film: null, make: null, model: null, lensModel: null, focalLength: 35, takenAtNaive: '2023-05-01T10:00:00' },
];
vi.mock('@/photo/query', () => ({ getPhotos: vi.fn(async () => photos) }));
import { GET } from './route';

it('returns the running order with proxy paths only, never storage URLs, and caches it at the CDN', async () => {
  const response = await GET(new Request('https://www.kelbrxto.com/api/viewer'));
  const body = await response.json();
  expect(body.map((photo: { id: string }) => photo.id)).toEqual(['aaaaaaa1', 'aaaaaaa2']);
  expect(body[0]).toEqual({ id: 'aaaaaaa1', title: 'Harbour', alt: 'Boats at dusk', src: '/api/image/photos/thumb/one.jpg', width: 3000, height: 2000 });
  expect(body[1].src).toBe('/api/image/display/photos/two.jpg');
  expect(JSON.stringify(body)).not.toContain('amazonaws');
  expect(response.headers.get('cache-control')).toContain('s-maxage=');
});

it('follows the gallery filter', async () => {
  const body = await (await GET(new Request('https://www.kelbrxto.com/api/viewer?focal=35'))).json();
  expect(body.map((photo: { id: string }) => photo.id)).toEqual(['aaaaaaa2']);
});
