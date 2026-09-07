import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), read: vi.fn(), review: vi.fn(), original: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('node:fs/promises', () => ({ readFile: mocks.read }));
vi.mock('@/review/local', () => ({ readReview: mocks.review, reviewOriginal: mocks.original, reviewDirectory: '/private/review' }));
import { GET } from './route';
const id = '0123456789abcdef0123';
const get = (value = id, original = false) => GET(new Request(`http://localhost/api/review/${value}${original ? '?original=1' : ''}`), { params: Promise.resolve({ id: value }) });
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: {} }); mocks.review.mockResolvedValue({ items: [{ id }] }); mocks.read.mockResolvedValue(Buffer.from('image')); mocks.original.mockResolvedValue('/card/photo.JPG'); });
it('never reads local files for unauthenticated visitors', async () => {
  mocks.auth.mockResolvedValue(null); expect((await get()).status).toBe(401); expect(mocks.review).not.toHaveBeenCalled(); expect(mocks.read).not.toHaveBeenCalled();
});
it('rejects arbitrary paths and files outside the manifest', async () => {
  expect((await get('../private')).status).toBe(404);
  expect((await get('a'.repeat(20))).status).toBe(404); expect(mocks.read).not.toHaveBeenCalled();
});
it('serves previews privately without accessing originals', async () => {
  const response = await get(); expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(mocks.read).toHaveBeenCalledWith('/private/review/'+id+'.jpg'); expect(mocks.original).not.toHaveBeenCalled();
});
it('requires a matching card file before returning an original', async () => {
  mocks.original.mockRejectedValueOnce(Error('Source changed')); expect((await get(id,true)).status).toBe(409); expect(mocks.read).not.toHaveBeenCalled();
});
