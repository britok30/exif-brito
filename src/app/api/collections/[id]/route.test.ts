import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), batch: vi.fn(), found: vi.fn(), remove: vi.fn(), revalidate: vi.fn() }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate, revalidateTag: vi.fn(), updateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));
vi.mock('@/db', async () => {
  const schema = await import('@/db/schema');
  return { ...schema, db: {
    select: () => ({ from: () => ({ where: mocks.found }) }),
    insert: (table: unknown) => ({ values: (values: unknown) => ({ table, values, onConflictDoUpdate: () => ({ table, values }) }) }),
    delete: (table: unknown) => ({ where: () => { mocks.remove(table); return { table }; } }),
    batch: mocks.batch,
  } };
});
import { PUT, DELETE } from './route';
import { albums } from '@/db';
const id = '55652a9f-08bf-4977-9590-dc877d061d98';
const value = { title: 'Kyoto', slug: 'kyoto', description: '', photoIds: ['ezuihkxn', 'AJPSPIpE'] };
const put = (body: unknown = value) => PUT(new Request('http://localhost/api/collections/' + id, { method: 'PUT', body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ user: {} }); mocks.found.mockResolvedValue(value.photoIds.map(id => ({ id }))); mocks.batch.mockResolvedValue([]); });
it('requires authentication for writes and removal', async () => {
  mocks.auth.mockResolvedValue(null);
  expect((await put()).status).toBe(401);
  expect((await DELETE(new Request('http://localhost'), { params: Promise.resolve({ id }) })).status).toBe(401);
  expect(mocks.batch).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
});
it('saves metadata and ordered membership in one atomic batch', async () => {
  expect((await put()).status).toBe(200);
  const operations = mocks.batch.mock.calls[0][0];
  expect(operations).toHaveLength(3);
  expect(operations[2].values).toEqual(value.photoIds.map((photoId, sortOrder) => ({ albumId: id, photoId, sortOrder })));
});
it('rejects missing photographs without changing the collection', async () => {
  mocks.found.mockResolvedValue([]); expect((await put()).status).toBe(400); expect(mocks.batch).not.toHaveBeenCalled();
});
it('reports slug conflicts and preserves safe error messages', async () => {
  mocks.batch.mockRejectedValueOnce({ cause: { code: '23505' } }); expect((await put()).status).toBe(409);
  mocks.batch.mockRejectedValueOnce(new Error('secret database details')); const result = await put();
  expect(result.status).toBe(500); expect(await result.text()).not.toContain('secret');
});
it('deletes only the collection, preserving library photographs', async () => {
  expect((await DELETE(new Request('http://localhost'), { params: Promise.resolve({ id }) })).status).toBe(200);
  expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(albums);
});
