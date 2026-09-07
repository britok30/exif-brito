vi.mock('@/collections/sync', () => ({ syncDestinationCollections: vi.fn(async () => {}) }));
import { syncDestinationCollections } from '@/collections/sync';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), update: vi.fn(), set: vi.fn(), where: vi.fn(), returning: vi.fn(), revalidate: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate, revalidateTag: vi.fn(), updateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('@/db', () => ({ db: { update: mocks.update }, photos: { id: 'id' } }));
import { PATCH } from './route';
const details = { title: '  Kyoto  ', caption: '  A quiet morning.  ', locationName: '', tags: [' Japan ', 'Japan', ''], hidden: false };
const patch = (body: unknown) => PATCH(new Request('http://localhost/api/photos/ezuihkxn', { method: 'PATCH', body: JSON.stringify(body) }), { params: Promise.resolve({ id: 'ezuihkxn' }) });
beforeEach(() => {
  vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: { id: 'admin' } });
  mocks.update.mockReturnValue({ set: mocks.set }); mocks.set.mockReturnValue({ where: mocks.where });
  mocks.where.mockReturnValue({ returning: mocks.returning }); mocks.returning.mockResolvedValue([{ id: 'ezuihkxn' }]);
});
it('rejects unauthenticated writes before accessing the database', async () => {
  mocks.auth.mockResolvedValue(null); expect((await patch(details)).status).toBe(401); expect(mocks.update).not.toHaveBeenCalled();
});
it('updates only editorial fields and refreshes the public and private views', async () => {
  expect((await patch(details)).status).toBe(200);
  expect(mocks.set).toHaveBeenCalledWith({ title: 'Kyoto', caption: 'A quiet morning.', locationName: null, tags: ['Japan'], hidden: false, updatedAt: expect.any(Date) });
  expect(mocks.revalidate.mock.calls.map(call => call[0])).toEqual(['/', '/p/ezuihkxn', '/admin/photos']);
});
it('allows clearing fields and hiding and restoring a photograph', async () => {
  await patch({ ...details, title: '', caption: '', tags: [], hidden: true });
  expect(mocks.set).toHaveBeenLastCalledWith(expect.objectContaining({ title: null, caption: null, tags: [], hidden: true }));
  await patch({ ...details, hidden: false });
  expect(mocks.set).toHaveBeenLastCalledWith(expect.objectContaining({ hidden: false }));
});
it('rejects storage or EXIF changes, invalid values and oversized fields', async () => {
  for (const body of [{ ...details, url: 'https://other.test' }, { ...details, iso: 100 }, { ...details, hidden: 'false' }, { ...details, title: 'x'.repeat(256) }, { ...details, tags: [1] }]) {
    expect((await patch(body)).status).toBe(400);
  }
  expect(mocks.update).not.toHaveBeenCalled();
});
it('reports missing records and database failures without exposing details', async () => {
  mocks.returning.mockResolvedValueOnce([]); expect((await patch(details)).status).toBe(404);
  mocks.returning.mockRejectedValueOnce(new Error('private database details'));
  const response = await patch(details); expect(response.status).toBe(500); expect(await response.text()).not.toContain('private database');
});

it('standardizes a manually entered city when editing', async () => {
  await patch({ ...details, locationName: ' Tokyo ' });
  expect(mocks.set).toHaveBeenCalledWith(expect.objectContaining({ locationName: 'Tokyo, Japan' }));
});
