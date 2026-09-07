import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('@/auth', () => ({ auth: (handler: unknown) => handler }));
import proxy from '@/proxy';
const run = proxy as unknown as (request: NextRequest & { auth: unknown }) => Response;
function request(path: string, session: unknown, method = 'GET', origin?: string) {
  return Object.assign(new NextRequest(`https://www.kelbrxto.com${path}`, { method, headers: origin ? { origin } : undefined }), { auth: session });
}
it('redirects visitors and unrelated accounts away from Studio', () => {
  for (const session of [null, { user: { email: 'other@example.com' } }]) {
    const response = run(request('/admin/unpublished?page=2', session));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).searchParams.get('callbackUrl')).toBe('/admin/unpublished?page=2');
  }
});
it('denies anonymous private API calls', () => {
  expect(run(request('/api/upload', null, 'POST')).status).toBe(401);
});
it('allows the owner with private and anti-framing headers', () => {
  const response = run(request('/admin', { user: { email: 'owner@example.com' } }));
  expect(response.headers.get('x-middleware-next')).toBe('1');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.headers.get('x-frame-options')).toBe('DENY');
  expect(response.headers.get('content-security-policy')).toBe("frame-ancestors 'none'");
});
it('denies cross-origin writes with an otherwise valid owner session', () => {
  expect(run(request('/api/photos', { user: { email: 'owner@example.com' } }, 'POST', 'https://evil.example')).status).toBe(403);
});
