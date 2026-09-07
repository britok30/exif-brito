import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), update: vi.fn(), set: vi.fn(), where: vi.fn(), returning: vi.fn(), inArray: vi.fn(), eq: vi.fn(), and: vi.fn(), revalidate: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/photo/query', () => ({ revalidatePhotos: mocks.revalidate }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/db', () => ({ db: { update: mocks.update }, photos: { id: 'photo-id', hidden: 'photo-hidden' } }));
vi.mock('drizzle-orm', () => ({ inArray: mocks.inArray, eq: mocks.eq, and: mocks.and }));
import { POST } from './route';
const post = (body: unknown) => POST(new Request('http://localhost/api/photos/publish', { method: 'POST', body: JSON.stringify(body) }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: 'admin' } });
  mocks.update.mockReturnValue({ set: mocks.set }); mocks.set.mockReturnValue({ where: mocks.where });
  mocks.where.mockReturnValue({ returning: mocks.returning }); mocks.returning.mockResolvedValue([{ id: 'abcdefgh' }]);
  mocks.inArray.mockReturnValue('selected-ids'); mocks.eq.mockReturnValue('hidden-only'); mocks.and.mockReturnValue('both-conditions');
});
it('requires sign-in before reading or writing selections', async () => {
  mocks.auth.mockResolvedValue(null);
  expect((await post({ ids: ['abcdefgh'] })).status).toBe(401);
  expect(mocks.update).not.toHaveBeenCalled();
});
it('rejects empty, malformed, and oversized selections without changing photographs', async () => {
  for (const body of [null, {}, { ids: [] }, { ids: ['abcdefgh', '*'] }, { ids: [123] }, { ids: Array(5001).fill('abcdefgh') }]) {
    expect((await post(body)).status).toBe(400);
  }
  expect(mocks.update).not.toHaveBeenCalled();
});
it('atomically publishes only the selected hidden IDs, preserving files and editorial details', async () => {
  const response = await post({ ids: ['abcdefgh', 'ijklmnop', 'abcdefgh'] });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ published: ['abcdefgh'] });
  expect(mocks.inArray).toHaveBeenCalledWith('photo-id', ['abcdefgh', 'ijklmnop']);
  expect(mocks.eq).toHaveBeenCalledWith('photo-hidden', true);
  expect(mocks.and).toHaveBeenCalledWith('selected-ids', 'hidden-only');
  expect(mocks.where).toHaveBeenCalledWith('both-conditions');
  expect(mocks.set).toHaveBeenCalledWith({ hidden: false, updatedAt: expect.any(Date) });
  expect(mocks.update).toHaveBeenCalledTimes(1);
  expect(mocks.revalidate).toHaveBeenCalledOnce();
});
it('supports safe retries and reports failures without exposing database details', async () => {
  mocks.returning.mockResolvedValueOnce([]);
  expect(await (await post({ ids: ['abcdefgh'] })).json()).toEqual({ published: [] });
  mocks.returning.mockRejectedValueOnce(new Error('secret connection details'));
  const response = await post({ ids: ['abcdefgh'] });
  expect(response.status).toBe(500);
  expect(await response.text()).not.toContain('secret');
});
