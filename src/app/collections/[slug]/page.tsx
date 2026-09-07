import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCollection } from '@/collections/query';
import { GalleryHeader } from '@/components/gallery-header';
import { GalleryFooter } from '@/components/gallery-footer';
import { Reveal } from '@/components/motion/reveal';
import { PhotoCollection } from '@/photo/PhotoCollection';
import { PhotoViewerProvider } from '@/photo/PhotoViewerProvider';
import { viewerPhoto } from '@/photo/viewer-data';
import { withImageSources } from '@/photo/url';
import { ViewSwitcher } from '@/photo/ViewSwitcher';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const collection = await getCollection((await params).slug);
  return { title: collection?.title || 'Collection not found', description: collection?.description || undefined };
}
export default async function CollectionPage({ params }: Props) {
  const collection = await getCollection((await params).slug);
  if (!collection) notFound();
  const entries = withImageSources(collection.photos);
  return <PhotoViewerProvider photos={entries.map(viewerPhoto)}><main id="main" tabIndex={-1} className="archive-page"><GalleryHeader />
    <Reveal className="gallery-intro series-intro"><div><Link href="/collections" className="gallery-label">Collections</Link><h1>{collection.title}</h1></div>
      {collection.description && <p className="series-description">{collection.description}</p>}</Reveal>
    <section className="archive-content" aria-label={collection.title}><header className="archive-toolbar"><p>A photographic series</p><span className="archive-total">{entries.length} photographs</span><ViewSwitcher /></header>
      <PhotoCollection photos={entries} /></section><GalleryFooter />
  </main></PhotoViewerProvider>;
}
