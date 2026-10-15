import type { Metadata } from 'next';
import { auth } from '@/auth';
import { isOwner } from '@/security/owner';
import { PhotoPageView, photoPageMetadata } from '@/photo/PhotoPage';
import { PerRequestSearchParams } from '@/photo/search-params';

/** A photograph rendered per request for the owner; reached only through the rewrites in next.config.ts. */
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return photoPageMetadata((await params).id);
}

export default async function LivePhotoPage({ params }: Props) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  return <PerRequestSearchParams><PhotoPageView id={id} owner={isOwner(session)} /></PerRequestSearchParams>;
}
