import NextAuth, { CredentialsSignin } from 'next-auth';
import { createHash, timingSafeEqual } from 'node:crypto';
import Credentials from 'next-auth/providers/credentials';
import { clearSignInFailures, recordSignInFailure, signInBlocked, signInSource } from '@/security/sign-in-limit';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
/** Every failed attempt takes at least this long, so guessing is slow even within the limit. */
const FAILURE_DELAY_MS = 750;

/** Too many failed attempts from this address, or from everyone, in the last fifteen minutes. */
export class SignInRateLimited extends CredentialsSignin {
  code = 'rate_limited';
}

const matches = (value: string, expected: string) =>
  timingSafeEqual(createHash('sha256').update(value).digest(), createHash('sha256').update(expected).digest());

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials, request) => {
        const started = Date.now();
        const source = signInSource(request);
        if (await signInBlocked(source)) throw new SignInRateLimited();
        const email = String(credentials?.email ?? '');
        const password = String(credentials?.password ?? '');
        // Both comparisons always run, so timing reveals nothing about which one failed.
        const emailOk = matches(email, ADMIN_EMAIL);
        const passwordOk = matches(password, ADMIN_PASSWORD);
        if (ADMIN_EMAIL && ADMIN_PASSWORD && emailOk && passwordOk) {
          await clearSignInFailures(source);
          return { id: 'admin', email: ADMIN_EMAIL, name: 'Admin' };
        }
        await recordSignInFailure(source);
        await new Promise(resolve => setTimeout(resolve, Math.max(0, FAILURE_DELAY_MS - (Date.now() - started))));
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/sign-in',
  },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
});
