import { createHash } from 'node:crypto';
import { and, count, eq, gte, lt } from 'drizzle-orm';
import { db, signInFailures } from '@/db';

const WINDOW_MS = 15 * 60 * 1000;
/** Failed attempts allowed from one address per window, and the count from everyone that slows every attempt down. */
export const PER_SOURCE_LIMIT = 5;
export const GLOBAL_LIMIT = 50;
const KEEP_MS = 24 * 60 * 60 * 1000;

/** The client address as Vercel reports it, hashed with the auth secret so no raw IP is stored. */
export function signInSource(request?: Request): string {
  // Vercel sets both headers itself, overwriting anything a client sends.
  const address = request?.headers.get('x-real-ip')?.trim() || request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return createHash('sha256').update(`${process.env.AUTH_SECRET ?? ''}:${address}`).digest('hex').slice(0, 64);
}

export interface SignInGate {
  /** This address has used up its attempts for the window. */
  blocked: boolean;
  /** Everyone together has failed a lot recently: slow down, but never lock the owner out. */
  slow: boolean;
}

/**
 * Records an attempt and then counts, so parallel requests each see the ones
 * before them and cannot all slip under the limit. A successful sign-in clears
 * its address's rows, so what remains are failures. A database outage fails
 * open, so the owner is never locked out by the limiter itself; the password
 * check and the fixed failure delay still apply.
 */
export async function registerSignInAttempt(source: string, now = Date.now()): Promise<SignInGate> {
  try {
    await db.insert(signInFailures).values({ source, createdAt: new Date(now) });
    const since = new Date(now - WINDOW_MS);
    const [[mine], [everyone]] = await Promise.all([
      db.select({ total: count() }).from(signInFailures).where(and(eq(signInFailures.source, source), gte(signInFailures.createdAt, since))),
      db.select({ total: count() }).from(signInFailures).where(gte(signInFailures.createdAt, since)),
    ]);
    // Old rows are only history; trim them now and then.
    if (Math.random() < 0.1) await db.delete(signInFailures).where(lt(signInFailures.createdAt, new Date(now - KEEP_MS)));
    return { blocked: Number(mine?.total ?? 0) > PER_SOURCE_LIMIT, slow: Number(everyone?.total ?? 0) > GLOBAL_LIMIT };
  } catch (error) {
    console.error('Sign-in limiter unavailable', error);
    return { blocked: false, slow: false };
  }
}

export async function clearSignInFailures(source: string) {
  try { await db.delete(signInFailures).where(eq(signInFailures.source, source)); }
  catch (error) { console.error('Could not clear sign-in failures', error); }
}
