import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), getPhotoById: vi.fn(), isS3Url: vi.fn(), s3SignedUrl: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/photo/query', () => ({ getPhotoById: mocks.getPhotoById }));
vi.mock('@/storage/s3', () => ({ isS3Url: mocks.isS3Url, s3SignedUrl: mocks.s3SignedUrl }));
import { GET } from './route';
const request = new Request('http://localhost/api/photos/abcdefgh/source');
const params = { params: Promise.resolve({ id: 'abcdefgh' }) };
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue({ user: { email: 'owner@example.com' } }); mocks.isS3Url.mockReturnValue(true); });
afterEach(() => vi.unstubAllGlobals());
it('requires the owner before looking up a source file', async () => {
  mocks.auth.mockResolvedValue(null);
  expect((await GET(request, params)).status).toBe(401);
  expect(mocks.getPhotoById).not.toHaveBeenCalled();
});
it('does not expose ordinary photos or external storage as RAW imports', async () => {
  mocks.getPhotoById.mockResolvedValue({ url: 'https://storage/photos/ordinary.jpg' });
  expect((await GET(request, params)).status).toBe(404);
  mocks.getPhotoById.mockResolvedValue({ url: `https://external/photos/sd-raw-${'a'.repeat(64)}.jpg` });
  mocks.isS3Url.mockReturnValue(false);
  expect((await GET(request, params)).status).toBe(404);
  expect(mocks.s3SignedUrl).not.toHaveBeenCalled();
});
it('streams the untouched source as an authenticated, non-cacheable download', async () => {
  mocks.getPhotoById.mockResolvedValue({ url: `https://storage/photos/sd-raw-${'a'.repeat(64)}.jpg` });
  mocks.s3SignedUrl.mockResolvedValue('https://signed.example/raw');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('RAW BYTES')));
  const response = await GET(request, params);
  expect(mocks.s3SignedUrl).toHaveBeenCalledWith(`photos/raw/sd-raw-${'a'.repeat(64)}.raf`, 'GET', 300);
  expect(await response.text()).toBe('RAW BYTES');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('content-disposition')).toContain('attachment');
});
