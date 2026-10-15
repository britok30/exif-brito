import type { Metadata } from 'next';
import { PhotoPageView, photoPageMetadata } from '@/photo/PhotoPage';

type Props = { params: Promise<{ id: string }> };

/**
 * Public photograph pages: none are built ahead, but returning [] makes each
 * one render on its first visit and then serve from cache until a photograph
 * changes. Hidden photographs 404 here; the owner reaches them through the
 * /live rewrite in next.config.ts, which renders per request.
 */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return photoPageMetadata((await params).id);
}

export default async function PhotoPage({ params }: Props) {
  return <PhotoPageView id={(await params).id} owner={false} />;
}
