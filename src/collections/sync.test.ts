import { beforeEach, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';

const mocks = vi.hoisted(() => ({
  results: [] as unknown[][], deletes: [] as unknown[], inserts: [] as unknown[], batch: vi.fn(async () => []),
  revalidatePhotos: vi.fn(), revalidatePath: vi.fn(),
}));
function query(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'where']) chain[method] = () => chain;
  chain.then = (resolve: (value: unknown[]) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}
vi.mock('@/db', async () => ({
  ...await import('@/db/schema'),
  db: {
    select: () => query(mocks.results.shift() ?? []),
    delete: () => ({ where: (predicate: unknown) => { mocks.deletes.push(predicate); return Promise.resolve(); } }),
    insert: () => ({ values: (rows: unknown) => ({ onConflictDoNothing: () => { mocks.inserts.push(rows); return Promise.resolve(); } }) }),
    batch: mocks.batch,
  },
}));
vi.mock('@/photo/query', () => ({ revalidatePhotos: mocks.revalidatePhotos }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
import { syncDestinationCollections } from './sync';

const tokyo = { id: 'tokyo-album', location: { automaticLocations: ['Tokyo, Japan'] } };
const photo = (id: string, locationName: string, hidden = false) => ({ id, hidden, locationName, tags: [], takenAt: new Date('2024-01-01') });

beforeEach(() => {
  mocks.results.length = 0; mocks.deletes.length = 0; mocks.inserts.length = 0;
  vi.clearAllMocks();
});

it('does nothing to memberships when nothing changes, and never issues an unbounded delete', async () => {
  mocks.results.push([tokyo], [photo('p1', 'Tokyo, Japan')], [{ albumId: 'tokyo-album', photoId: 'p1', sortOrder: 0 }]);
  await syncDestinationCollections(['p1']);
  expect(mocks.deletes).toHaveLength(0);
  expect(mocks.inserts).toHaveLength(0);
  expect(mocks.revalidatePhotos).not.toHaveBeenCalled();
  expect(mocks.revalidatePath).toHaveBeenCalledWith('/collections', 'layout');
});

it('adds a matching photograph and expires the cached lists', async () => {
  mocks.results.push([tokyo], [photo('p2', 'Tokyo, Japan')], []);
  await syncDestinationCollections(['p2']);
  expect(mocks.inserts).toEqual([[{ albumId: 'tokyo-album', photoId: 'p2', sortOrder: 0 }]]);
  expect(mocks.deletes).toHaveLength(0);
  expect(mocks.revalidatePhotos).toHaveBeenCalledTimes(1);
});

it('removes only the memberships that no longer match', async () => {
  mocks.results.push([tokyo], [photo('p3', 'Paris, France')], [{ albumId: 'tokyo-album', photoId: 'p3', sortOrder: 0 }]);
  await syncDestinationCollections(['p3']);
  expect(mocks.deletes).toHaveLength(1);
  const condition = new PgDialect().sqlToQuery(mocks.deletes[0] as Parameters<PgDialect['sqlToQuery']>[0]);
  expect(condition.params).toEqual(['tokyo-album', 'p3']);
  expect(mocks.revalidatePhotos).toHaveBeenCalledTimes(1);
});

it('skips the database entirely without photographs or destination collections', async () => {
  await syncDestinationCollections([]);
  mocks.results.push([{ id: 'curated', location: null }]);
  await syncDestinationCollections(['p4']);
  expect(mocks.inserts).toHaveLength(0);
  expect(mocks.deletes).toHaveLength(0);
});
