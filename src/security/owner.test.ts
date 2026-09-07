import { afterEach, expect, it, vi } from 'vitest';
import { isOwner, isSameOriginMutation } from './owner';
afterEach(() => vi.unstubAllEnvs());
it('fails closed for missing configuration, visitors, and non-owner sessions', () => {
  for (const session of [null, undefined, {}, { user: {} }, { user: { email: 'someone@example.com' } }]) expect(isOwner(session)).toBe(false);
  expect(isOwner({ user: { email: 'owner@example.com' } })).toBe(true);
  vi.stubEnv('ADMIN_EMAIL', '');
  expect(isOwner({ user: { email: 'owner@example.com' } })).toBe(false);
});
it('rejects cross-origin and opaque-origin writes but permits same-origin requests', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    for (const origin of ['https://evil.example', 'https://sub.kelbrxto.com', 'null']) expect(isSameOriginMutation(new Request('https://www.kelbrxto.com/api/photos', { method, headers: { origin } }))).toBe(false);
    expect(isSameOriginMutation(new Request('https://www.kelbrxto.com/api/photos', { method, headers: { origin: 'https://www.kelbrxto.com' } }))).toBe(true);
    expect(isSameOriginMutation(new Request('https://www.kelbrxto.com/api/photos', { method, headers: { 'sec-fetch-site': 'cross-site' } }))).toBe(false);
  }
});
