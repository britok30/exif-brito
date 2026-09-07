import { expect, it, vi } from 'vitest';
const auth = vi.hoisted(() => vi.fn());
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/review/local', () => ({ readReview: vi.fn(), reviewOriginal: vi.fn(), reviewDirectory: '/unused' }));
vi.mock('@/db', async () => ({ ...await import('@/db/schema'), db: {} }));
import * as upload from '@/app/api/upload/route';
import * as save from '@/app/api/photos/route';
import * as discard from '@/app/api/photos/discard/route';
import * as geocode from '@/app/api/geocode/route';
import * as places from '@/app/api/places/route';
import * as publish from '@/app/api/photos/publish/route';
import * as clear from '@/app/api/photos/clear-unpublished/route';
import * as edit from '@/app/api/photos/[id]/route';
import * as source from '@/app/api/photos/[id]/source/route';
import * as review from '@/app/api/review/[id]/route';
import * as collections from '@/app/api/collections/[id]/route';
import { deletePhotoAction } from '@/photo/actions';

const routes = [
  ['upload', 'POST', upload.POST], ['save', 'POST', save.POST], ['discard', 'POST', discard.POST],
  ['geocode', 'GET', geocode.GET], ['places', 'GET', places.GET], ['publish', 'POST', publish.POST],
  ['clear snapshot', 'GET', clear.GET], ['clear', 'POST', clear.POST], ['edit', 'PATCH', edit.PATCH],
  ['original', 'GET', source.GET], ['review', 'GET', review.GET],
  ['collections save', 'PUT', collections.PUT], ['collections delete', 'DELETE', collections.DELETE],
] as const;
for (const [label, method, handler] of routes) {
  it(`${label} rejects visitors and non-owners even without Proxy`, async () => {
    for (const session of [null, { user: {} }, { user: { email: 'other@example.com' } }]) {
      auth.mockResolvedValue(session);
      const response = await handler(new Request('http://localhost/api/test', { method }) as never, { params: Promise.resolve({ id: 'abcdefgh' }) });
      expect(response.status).toBe(401);
    }
  });
  if (method !== 'GET') it(`${label} rejects cross-origin writes even for the owner`, async () => {
    auth.mockResolvedValue({ user: { email: 'owner@example.com' } });
    const response = await handler(new Request('http://localhost/api/test', { method, headers: { origin: 'https://evil.example' } }) as never, { params: Promise.resolve({ id: 'abcdefgh' }) });
    expect(response.status).toBe(403);
  });
}
it('direct photo-deletion actions reject non-owners', async () => {
  for (const session of [null, { user: { email: 'other@example.com' } }]) {
    auth.mockResolvedValue(session);
    expect(await deletePhotoAction('abcdefgh')).toEqual({ ok: false, error: 'unauthorized' });
  }
});
