import NextAuth, { CredentialsSignin } from 'next-auth';
import { createHash, timingSafeEqual } from 'node:crypto';
import Credentials from 'next-auth/providers/credentials';
import { clearSignInFailures, registerSignInAttempt, signInSource } from '@/security/sign-in-limit';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
/** Every failed attempt takes at least this long, so guessing is slow even within the limit. */
const FAILURE_DELAY_MS = 750;
/** Under a wide attack, every failure takes this long instead; the owner can still sign in. */
const SLOW_FAILURE_DELAY_MS = 3000;

/** Too many failed attempts from this address in the last fifteen minutes. */
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
        const gate = await registerSignInAttempt(source);
        if (gate.blocked) throw new SignInRateLimited();
        const email = String(credentials?.email ?? '');
        const password = String(credentials?.password ?? '');
        // Both comparisons always run, so timing reveals nothing about which one failed.
        const emailOk = matches(email, ADMIN_EMAIL);
        const passwordOk = matches(password, ADMIN_PASSWORD);
        if (ADMIN_EMAIL && ADMIN_PASSWORD && emailOk && passwordOk) {
          await clearSignInFailures(source);
          return { id: 'admin', email: ADMIN_EMAIL, name: 'Admin' };
        }
        const delay = gate.slow ? SLOW_FAILURE_DELAY_MS : FAILURE_DELAY_MS;
        await new Promise(resolve => setTimeout(resolve, Math.max(0, delay - (Date.now() - started))));
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/sign-in',
  },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
});
