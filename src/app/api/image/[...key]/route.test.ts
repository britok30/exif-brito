import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ sign: vi.fn(), fetch: vi.fn() }));
vi.mock('@/storage/s3', () => ({ s3SignedUrl: mocks.sign }));
vi.stubGlobal('fetch', mocks.fetch);
import { GET } from './route';
const get = (...key: string[]) => GET(new Request('http://localhost/api/image/' + key.join('/')), { params: Promise.resolve({ key }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.sign.mockResolvedValue('https://bucket.test/signed');
  mocks.fetch.mockResolvedValue(new Response('jpeg-bytes', { status: 200, headers: { 'content-type': 'image/jpeg', 'content-length': '10' } }));
});
it('streams the stored rendition with immutable caching', async () => {
  const response = await get('photos', 'thumb', 'abc123.jpg');
  expect(mocks.sign).toHaveBeenCalledWith('photos/thumb/abc123.jpg', 'GET', 300);
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toBe('image/jpeg');
  expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  expect(await response.text()).toBe('jpeg-bytes');
});
it('refuses keys outside the photo store without touching storage', async () => {
  for (const key of [['secrets', 'keys.jpg'], ['photos', '..', 'x.jpg'], ['photos', 'notes.txt']]) {
    expect((await get(...key)).status).toBe(404);
  }
  expect(mocks.sign).not.toHaveBeenCalled();
});
it('reports missing objects as not found', async () => {
  mocks.fetch.mockResolvedValueOnce(new Response('', { status: 403 }));
  expect((await get('photos', 'gone.jpg')).status).toBe(404);
});
