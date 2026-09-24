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
import { galleryPhotos } from '@/photo/gallery-photo';
import { ViewSwitcher } from '@/photo/ViewSwitcher';
import { absoluteUrl, serializeJsonLd } from '@/seo/site';
import { photoLabel } from '@/seo/metadata';
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
  const entries = galleryPhotos(collection.photos);
  const url = absoluteUrl(`/collections/${collection.slug}`);
  const jsonLd = [{
    '@context': 'https://schema.org', '@type': 'CollectionPage', name: collection.title, url,
    description: collection.description || undefined,
    mainEntity: { '@type': 'ItemList', numberOfItems: collection.photos.length,
      itemListElement: collection.photos.map((photo, index) => ({ '@type': 'ListItem', position: index + 1, url: absoluteUrl(`/p/${photo.id}`), name: photoLabel(photo) })) },
  }, {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Collections', item: absoluteUrl('/collections') },
      { '@type': 'ListItem', position: 2, name: collection.title, item: url },
    ],
  }];
  return <PhotoViewerProvider seed={entries.map(viewerPhoto)}><main id="main" tabIndex={-1} className="archive-page"><GalleryHeader />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
    <Reveal className="gallery-intro series-intro" delay={0.08}><div><Link href="/collections" className="gallery-label">Collections</Link><h1>{collection.title}</h1></div>
      {collection.description && <p className="series-description">{collection.description}</p>}</Reveal>
    <section className="archive-content" aria-label={collection.title}><header className="archive-toolbar"><p>A photographic series</p><span className="archive-total">{entries.length} photographs</span><ViewSwitcher /></header>
      <h2 className="sr-only">Photographs in {collection.title}</h2>
      <PhotoCollection photos={entries} /></section><GalleryFooter />
  </main></PhotoViewerProvider>;
}
