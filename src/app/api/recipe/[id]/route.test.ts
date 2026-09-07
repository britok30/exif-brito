import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rows: [] as unknown[] }));
vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/db', async () => ({ ...await import('@/db/schema'), db: { select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(mocks.rows) }) }) }) } }));
import { GET } from './route';
const get = (id: string) => GET(new Request(`http://localhost/api/recipe/${id}`), { params: Promise.resolve({ id }) });
beforeEach(() => { mocks.auth.mockResolvedValue(null); process.env.ADMIN_EMAIL = 'owner@example.com'; });
it('serves a public photograph’s recipe and caches it', async () => {
  mocks.rows = [{ hidden: false, recipe: { whiteBalance: { type: 'auto', red: 0, blue: 0 } } }];
  const response = await get('abcdefgh');
  expect(response.status).toBe(200);
  expect((await response.json()).recipe.whiteBalance.type).toBe('auto');
  expect(response.headers.get('cache-control')).toContain('max-age');
});
it('keeps hidden photographs to the owner and rejects bad ids', async () => {
  mocks.rows = [{ hidden: true, recipe: { whiteBalance: { type: 'auto' } } }];
  expect((await get('abcdefgh')).status).toBe(404);
  mocks.auth.mockResolvedValue({ user: { email: 'owner@example.com' } });
  expect((await get('abcdefgh')).status).toBe(200);
  expect((await get('../etc')).status).toBe(404);
});
