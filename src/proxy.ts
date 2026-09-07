import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth(req => {
  if (req.auth) return;

  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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
