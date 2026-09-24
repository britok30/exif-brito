import { expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ photos: [{ id: 'aaaaaaa1' }, { id: 'aaaaaaa2' }] as Array<{ id: string }> }));
vi.mock('@/photo/query', () => ({ getPhotos: vi.fn(async () => mocks.photos) }));
import { GET } from './route';

it('redirects to one of the public photographs, uncached', async () => {
  const response = await GET(new Request('https://www.kelbrxto.com/random'));
  expect(response.status).toBe(307);
  expect(response.headers.get('location')).toMatch(/^https:\/\/www\.kelbrxto\.com\/p\/aaaaaaa[12]$/);
  expect(response.headers.get('cache-control')).toContain('no-store');
});

it('falls back to the gallery when there is nothing to show', async () => {
  mocks.photos = [];
  expect((await GET(new Request('https://www.kelbrxto.com/random'))).headers.get('location')).toBe('https://www.kelbrxto.com/');
});
