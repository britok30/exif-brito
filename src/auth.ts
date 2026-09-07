import NextAuth from 'next-auth';
import { createHash, timingSafeEqual } from 'node:crypto';
import Credentials from 'next-auth/providers/credentials';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async credentials => {
        const email = String(credentials?.email ?? '');
        const password = String(credentials?.password ?? '');
        if (
          ADMIN_EMAIL &&
          ADMIN_PASSWORD &&
          timingSafeEqual(createHash('sha256').update(email).digest(), createHash('sha256').update(ADMIN_EMAIL).digest()) &&
          timingSafeEqual(createHash('sha256').update(password).digest(), createHash('sha256').update(ADMIN_PASSWORD).digest())
        ) {
          return { id: 'admin', email: ADMIN_EMAIL, name: 'Admin' };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/sign-in',
  },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
});
