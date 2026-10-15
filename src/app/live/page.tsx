import { auth } from '@/auth';
import { isOwner } from '@/security/owner';
import { parsePhotoFilter } from '@/photo/filters';
import { HomeGallery, homeMetadata } from '@/photo/HomeGallery';
import { PerRequestSearchParams } from '@/photo/search-params';

/**
 * The gallery rendered per request: the owner's view (studio controls on each
 * tile) and every filtered view. Reached only through the rewrites in
 * next.config.ts, so its address stays / and its metadata is the home page's.
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ searchParams }: PageProps) {
  return homeMetadata(parsePhotoFilter(await searchParams));
}

export default async function LiveHomePage({ searchParams }: PageProps) {
  const [search, session] = await Promise.all([searchParams, auth()]);
  return <PerRequestSearchParams><HomeGallery filter={parsePhotoFilter(search)} isAdmin={isOwner(session)} /></PerRequestSearchParams>;
}
