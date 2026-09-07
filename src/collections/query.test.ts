import { beforeEach, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
const mocks = vi.hoisted(() => ({ select: vi.fn(), predicates: [] as unknown[] }));
vi.mock('@/db', async () => ({ ...await import('@/db/schema'), db: { select: mocks.select } }));
import { getCollection, getCollections } from './query';
function query(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'innerJoin', 'orderBy', 'limit']) chain[method] = () => chain;
  chain.where = (predicate: unknown) => { mocks.predicates.push(predicate); return chain; };
  chain.then = (resolve: (value: unknown[]) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}
beforeEach(() => { mocks.select.mockReset(); mocks.predicates.length = 0; });
it('filters hidden photographs in the public SQL query and omits empty series', async () => {
  mocks.select.mockReturnValueOnce(query([{ id: 'empty' }, { id: 'visible' }])).mockReturnValueOnce(query([{ albumId: 'visible', photo: { id: 'photo123' } }]));
  expect((await getCollections()).map(item => item.id)).toEqual(['visible']);
  const condition = new PgDialect().sqlToQuery(mocks.predicates[0] as Parameters<PgDialect['sqlToQuery']>[0]);
  expect(condition.sql).toContain('"photos"."hidden" ='); expect(condition.sql).toContain('"photos"."hidden" is null'); expect(condition.params).toContain(false);
});
it('applies the same privacy condition to a directly linked series', async () => {
  mocks.select.mockReturnValueOnce(query([{ id: 'series' }])).mockReturnValueOnce(query([]));
  expect(await getCollection('private-series')).toBeNull();
  const condition = new PgDialect().sqlToQuery(mocks.predicates[1] as Parameters<PgDialect['sqlToQuery']>[0]);
  expect(condition.sql).toContain('"photos"."hidden" ='); expect(condition.params).toContain(false);
});
it('lets the private editor retain hidden members and empty collections', async () => {
  mocks.select.mockReturnValueOnce(query([{ id: 'empty' }])).mockReturnValueOnce(query([]));
  expect(await getCollections(true)).toHaveLength(1); expect(mocks.predicates[0]).toBeUndefined();
});
