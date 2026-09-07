import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ rows: new Map<string, Record<string, unknown>>() }));
vi.mock('@/db', async () => ({
  photos: (await import('@/db/schema')).photos,
  db: {
    insert: () => ({ values: (row: Record<string, unknown>) => ({ onConflictDoNothing: () => ({ returning: async () => {
      const id = String(row.id);
      if (state.rows.has(id)) return [];
      state.rows.set(id, row); return [row];
    } }) }) }),
    select: () => ({ from: () => ({ where: () => ({ limit: async () => [...state.rows.values()] }) }) }),
  },
}));
import { createUploadedPhoto } from './upload-record';

beforeEach(() => state.rows.clear());
it('concurrent retries of an upload return the same photo and insert only once', async () => {
  const input = { url: 'https://example.com/photos/one.jpg', extension: 'jpg', takenAt: new Date(), takenAtNaive: '2024-01-01T00:00:00' };
  const [first, retry] = await Promise.all([createUploadedPhoto('photos/one.jpg', input), createUploadedPhoto('photos/one.jpg', input)]);
  expect(first.id).toMatch(/^[a-z0-9]{8}$/);
  expect(retry.id).toBe(first.id);
  expect(state.rows.size).toBe(1);
});
