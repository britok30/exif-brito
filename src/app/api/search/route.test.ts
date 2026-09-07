import { expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
const mocks = vi.hoisted(() => ({ photos: vi.fn(), distinct: vi.fn(), conditions: [] as unknown[] }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn(), updateTag: vi.fn() }));
vi.mock('@/photo/query', () => ({ getPhotos: mocks.photos, PHOTOS_TAG: 'photos' }));
vi.mock('@/db', async () => ({ ...await import('@/db/schema'), db: { selectDistinct: mocks.distinct } }));
import { GET } from './route';
function query(rows: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'innerJoin']) chain[method] = () => chain;
  chain.where = (condition: unknown) => { mocks.conditions.push(condition); return Promise.resolve(rows); };
  return chain;
}
it('indexes the cached public list and only published collections, without storage fields', async () => {
  mocks.photos.mockResolvedValueOnce([{ id: 'abcdefgh', title: null, caption: 'Along the river', locationName: 'London, UK', tags: ['travel'], takenAtNaive: '2025-11-10T12:00:00', url: 'private-original', thumbnailUrl: 'private-preview' }]);
  mocks.distinct.mockReturnValueOnce(query([{ slug: 'london', title: 'London' }]));
  const response = await GET();
  const entries = await response.json();
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(entries.map((e: { path: string }) => e.path)).toEqual(['/collections/london', '/p/abcdefgh']);
  expect(entries[1].keywords).toContain('Along the river');
  expect(entries[1].keywords).toContain('travel');
  expect(entries[1].subtitle).toBe('London, UK / November 10, 2025');
  expect(entries[1].image).toBeNull();
  expect(JSON.stringify(entries)).not.toContain('private-');
  for (const condition of mocks.conditions) {
    const sql = new PgDialect().sqlToQuery(condition as Parameters<PgDialect['sqlToQuery']>[0]);
    expect(sql.sql).toContain('"photos"."hidden" =');
    expect(sql.sql).toContain('"photos"."hidden" is null');
    expect(sql.params).toContain(false);
  }
});
