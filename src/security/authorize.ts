import { auth } from '@/auth';
import { isOwner, isSameOriginMutation } from './owner';

export async function authorizeStudio(request?: Request) {
  if (!isOwner(await auth())) return Response.json({ error: 'Please sign in with the owner account.' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  if (request && !isSameOriginMutation(request)) return Response.json({ error: 'Forbidden' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  return null;
}
