import { auth } from '@/auth';
import { isOwner, isSameOriginMutation } from '@/security/owner';
import { NextResponse } from 'next/server';

export default auth(req => {
  if (isOwner(req.auth)) {
    if (!isSameOriginMutation(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Content-Security-Policy', "frame-ancestors 'none'");
    return response;
  }

  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const signIn = new URL('/sign-in', req.nextUrl);
  signIn.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
  return NextResponse.redirect(signIn);
});

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/upload',
    '/api/photos',
    '/api/photos/:path*',
    '/api/geocode',
    '/api/places',
    '/api/collections/:path*',
    '/api/review/:path*',
  ],
};
