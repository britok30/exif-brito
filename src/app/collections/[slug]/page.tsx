import { cache } from 'react';
import { publicMetadata } from '@/seo/metadata';
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
const findCollection = cache(getCollection);
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const collection = await findCollection((await params).slug);
  if (!collection) return { title:'Collection not found', robots:{index:false,follow:false} };
  return publicMetadata({ title:`${collection.title} Photography`, description:collection.description || `Explore ${collection.photos.length} photographs from ${collection.title} in Brito’s photographic journal. Places, people, and passing moments.`, path:`/collections/${collection.slug}`,photoId:collection.photos[0]?.id });
}
export default async function CollectionPage({ params }: Props) {
  const collection = await findCollection((await params).slug);
  if (!collection) notFound();
  const entries = withImageSources(collection.photos);
  return <PhotoViewerProvider photos={entries.map(viewerPhoto)}><main id="main" tabIndex={-1} className="archive-page"><GalleryHeader />
    <Reveal className="gallery-intro series-intro"><div><Link href="/collections" className="gallery-label">Collections</Link><h1>{collection.title}</h1></div>
      {collection.description && <p className="series-description">{collection.description}</p>}</Reveal>
    <section className="archive-content" aria-label={collection.title}><header className="archive-toolbar"><p>A photographic series</p><span className="archive-total">{entries.length} photographs</span><ViewSwitcher /></header>
      <PhotoCollection photos={entries} /></section><GalleryFooter />
  </main></PhotoViewerProvider>;
}
