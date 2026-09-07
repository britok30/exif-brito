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
  expect((await get('photos', 'thumb', 'gone.jpg')).status).toBe(404);
});

it('refuses cross-site embeds before fetching storage', async () => {
  const response = await GET(new Request('https://www.kelbrxto.com/api/image/photos/thumb/a.jpg', {
    headers: { 'Sec-Fetch-Site': 'cross-site' },
  }), { params: Promise.resolve({ key: ['photos', 'thumb', 'a.jpg'] }) });
  expect(response.status).toBe(403);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(mocks.sign).not.toHaveBeenCalled();
});

it('serves a resized, metadata-free display copy for original keys, never original bytes', async () => {
  const { default: sharp } = await import('sharp');
  const original = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#abcdef' } })
    .jpeg().withExif({ IFD0: { Artist: 'Private source metadata' } }).toBuffer();
  mocks.fetch.mockResolvedValueOnce(new Response(new Uint8Array(original), { headers: { 'content-type': 'image/jpeg' } }));
  const response = await get('display', 'photos', 'original.jpg');
  const display = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(display).metadata();
  expect(response.status).toBe(200);
  expect(display.equals(original)).toBe(false);
  expect(metadata.width).toBe(2560);
  expect(metadata.exif).toBeUndefined();
  expect(response.headers.get('cross-origin-resource-policy')).toBe('same-site');
});

it('never falls back to original bytes if conversion fails', async () => {
  expect((await get('display', 'photos', 'invalid.jpg')).status).toBe(502);
});

it('retires the old public original URL without fetching storage', async () => {
  expect((await get('photos', 'original.jpg')).status).toBe(404);
  expect(mocks.sign).not.toHaveBeenCalled();
});
