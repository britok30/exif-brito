import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), remove: vi.fn(), where: vi.fn(), returning: vi.fn(), inArray: vi.fn(), eq: vi.fn(), and: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/photo/query', () => ({ revalidatePhotos: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/db', () => ({ db: { delete: mocks.remove }, photos: { id: 'id', hidden: 'hidden' } }));
vi.mock('drizzle-orm', () => ({ inArray: mocks.inArray, eq: mocks.eq, and: mocks.and }));
import { GET, POST } from './route';
const post = (body: unknown) => POST(new Request('http://localhost/api/photos/clear-unpublished', { method: 'POST', body: JSON.stringify(body) }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: 'admin' } });
  mocks.remove.mockReturnValue({ where: mocks.where }); mocks.where.mockReturnValue({ returning: mocks.returning });
  mocks.returning.mockResolvedValue([{ id: 'abcdefgh' }]);
  mocks.inArray.mockReturnValue('snapshot'); mocks.eq.mockReturnValue('unpublished'); mocks.and.mockReturnValue('both');
});
it('requires authentication for both snapshot and deletion', async () => {
  mocks.auth.mockResolvedValue(null);
  expect((await GET()).status).toBe(401);
  expect((await post({ ids: ['abcdefgh'], confirmation: 'CLEAR' })).status).toBe(401);
  expect(mocks.remove).not.toHaveBeenCalled();
});
it('rejects unconfirmed, empty, malformed and oversized requests', async () => {
  for (const body of [null, {}, { ids: ['abcdefgh'] }, { ids: [], confirmation: 'CLEAR' }, { ids: ['*'], confirmation: 'CLEAR' }, { ids: Array(20001).fill('abcdefgh'), confirmation: 'CLEAR' }]) expect((await post(body)).status).toBe(400);
  expect(mocks.remove).not.toHaveBeenCalled();
});
it('removes only snapshot IDs that remain unpublished in one atomic statement', async () => {
  const response = await post({ ids: ['abcdefgh', 'ijklmnop', 'abcdefgh'], confirmation: 'CLEAR' });
  expect(await response.json()).toEqual({ removed: 1 });
  expect(mocks.inArray).toHaveBeenCalledWith('id', ['abcdefgh', 'ijklmnop']);
  expect(mocks.eq).toHaveBeenCalledWith('hidden', true);
  expect(mocks.and).toHaveBeenCalledWith('snapshot', 'unpublished');
  expect(mocks.where).toHaveBeenCalledWith('both');
  expect(mocks.remove).toHaveBeenCalledOnce();
});
it('is safe to retry and does not expose database failures', async () => {
  mocks.returning.mockResolvedValueOnce([]);
  expect(await (await post({ ids: ['abcdefgh'], confirmation: 'CLEAR' })).json()).toEqual({ removed: 0 });
  mocks.returning.mockRejectedValueOnce(new Error('secret'));
  const response = await post({ ids: ['abcdefgh'], confirmation: 'CLEAR' });
  expect(response.status).toBe(500); expect(await response.text()).not.toContain('secret');
});
