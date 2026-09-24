import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ counts: [] as number[], fail: false, inserted: [] as unknown[], deleted: 0 }));
function countQuery() {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.where = () => chain;
  chain.then = (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
    mocks.fail ? Promise.reject(new Error('relation does not exist')).catch(reject) : Promise.resolve([{ total: mocks.counts.shift() ?? 0 }]).then(resolve);
  return chain;
}
vi.mock('@/db', async () => ({
  ...await import('@/db/schema'),
  db: {
    select: () => countQuery(),
    insert: () => ({ values: async (row: unknown) => { if (mocks.fail) throw new Error('down'); mocks.inserted.push(row); } }),
    delete: () => ({ where: async () => { mocks.deleted++; } }),
  },
}));
import { GLOBAL_LIMIT, PER_SOURCE_LIMIT, registerSignInAttempt, signInSource } from './sign-in-limit';

beforeEach(() => { mocks.counts.length = 0; mocks.fail = false; mocks.inserted.length = 0; mocks.deleted = 0; vi.spyOn(console, 'error').mockImplementation(() => {}); });

it('never stores the raw client address', () => {
  const source = signInSource(new Request('https://x.test', { headers: { 'x-real-ip': '203.0.113.9' } }));
  expect(source).toMatch(/^[a-f0-9]{64}$/);
  expect(source).not.toContain('203.0.113.9');
  expect(signInSource(new Request('https://x.test', { headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' } }))).toBe(source);
});

it('records the attempt before counting, pauses one address past its limit, and only slows everyone', async () => {
  mocks.counts.push(PER_SOURCE_LIMIT, 0);
  expect(await registerSignInAttempt('a')).toEqual({ blocked: false, slow: false });
  expect(mocks.inserted).toHaveLength(1);
  mocks.counts.push(PER_SOURCE_LIMIT + 1, 0);
  expect((await registerSignInAttempt('a')).blocked).toBe(true);
  // A flood from many addresses never blocks the owner's own address outright.
  mocks.counts.push(1, GLOBAL_LIMIT + 1);
  expect(await registerSignInAttempt('owner')).toEqual({ blocked: false, slow: true });
});

it('fails open when the table is unavailable, so the owner is never locked out by the limiter', async () => {
  mocks.fail = true;
  expect(await registerSignInAttempt('a')).toEqual({ blocked: false, slow: false });
});
