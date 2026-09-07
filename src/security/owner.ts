/** Only the configured owner may use Studio, even if another session is valid. */
export function isOwner(session: { user?: { email?: string | null } } | null | undefined) {
  const owner = process.env.ADMIN_EMAIL;
  return Boolean(owner && session?.user?.email === owner);
}

/** Reject browser mutations originating on another site, including sibling subdomains. */
export function isSameOriginMutation(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  const origin = request.headers.get('origin');
  return request.headers.get('sec-fetch-site') !== 'cross-site' && (!origin || origin === new URL(request.url).origin);
}
