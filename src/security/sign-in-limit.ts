import { createHash } from 'node:crypto';
import { and, count, eq, gte, lt } from 'drizzle-orm';
import { db, signInFailures } from '@/db';

const WINDOW_MS = 15 * 60 * 1000;
/** Failed attempts allowed from one address, and from everyone together, per window. */
export const PER_SOURCE_LIMIT = 5;
export const GLOBAL_LIMIT = 50;
const KEEP_MS = 24 * 60 * 60 * 1000;

/** The client address as Vercel reports it, hashed with the auth secret so no raw IP is stored. */
export function signInSource(request?: Request): string {
  // Vercel sets both headers itself, overwriting anything a client sends.
  const address = request?.headers.get('x-real-ip')?.trim() || request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  return createHash('sha256').update(`${process.env.AUTH_SECRET ?? ''}:${address}`).digest('hex').slice(0, 64);
}

/**
 * Whether sign-in is paused for this source. A database outage fails open, so
 * the owner is never locked out by the limiter itself; the password check and
 * the fixed failure delay still apply.
 */
export async function signInBlocked(source: string, now = Date.now()): Promise<boolean> {
  try {
    const since = new Date(now - WINDOW_MS);
    const [[mine], [everyone]] = await Promise.all([
      db.select({ total: count() }).from(signInFailures).where(and(eq(signInFailures.source, source), gte(signInFailures.createdAt, since))),
      db.select({ total: count() }).from(signInFailures).where(gte(signInFailures.createdAt, since)),
    ]);
    return Number(mine?.total ?? 0) >= PER_SOURCE_LIMIT || Number(everyone?.total ?? 0) >= GLOBAL_LIMIT;
  } catch (error) {
    console.error('Sign-in limiter unavailable', error);
    return false;
  }
}

export async function recordSignInFailure(source: string, now = Date.now()) {
  try {
    await db.insert(signInFailures).values({ source, createdAt: new Date(now) });
    // Old rows are only history; trim them now and then.
    if (Math.random() < 0.1) await db.delete(signInFailures).where(lt(signInFailures.createdAt, new Date(now - KEEP_MS)));
  } catch (error) {
    console.error('Could not record a failed sign-in', error);
  }
}

export async function clearSignInFailures(source: string) {
  try { await db.delete(signInFailures).where(eq(signInFailures.source, source)); }
  catch (error) { console.error('Could not clear sign-in failures', error); }
}
