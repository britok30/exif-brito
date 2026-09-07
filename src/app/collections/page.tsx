import { publicMetadata } from '@/seo/metadata';
import { getPhotos } from '@/photo/query';
import Link from 'next/link';
import Image from 'next/image';
import { GalleryHeader } from '@/components/gallery-header';
import { GalleryFooter } from '@/components/gallery-footer';
import { Reveal } from '@/components/motion/reveal';
import { ImageReveal } from '@/photo/ImageReveal';
import { getCollections } from '@/collections/query';
import { imagePath } from '@/photo/url';
export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const cover = (await getPhotos(1))[0];
  return publicMetadata({title:'Photography Collections',description:'Explore Brito’s photography by destination. Visual journeys through cities, coastlines, and everyday life.',path:'/collections',photoId:cover?.id});
}
export default async function CollectionsPage() {
  const collections = await getCollections();
  return <main id="main" tabIndex={-1} className="archive-page"><GalleryHeader />
    <Reveal className="gallery-intro" delay={0.08}><h1>Collections.</h1><p className="gallery-intro-note">A closer look.<br />One series at a time.</p></Reveal>
    <div className="archive-content"><header className="archive-toolbar"><p>All collections</p><span className="archive-total">{collections.length} {collections.length === 1 ? 'collection' : 'collections'}</span><span /></header><div className="series-grid">{collections.map(collection => {
      const cover = collection.photos[0]; const src = imagePath(cover.thumbnailUrl || cover.url);
      return <ImageReveal key={collection.id}><Link href={`/collections/${collection.slug}`} className="series-card">
        <div className="series-cover"><Image src={src} alt={cover.semanticDescription || cover.title || collection.title} fill sizes="(max-width: 700px) calc(100vw - 40px), 45vw" quality={80} unoptimized={!src.startsWith('/')} /></div>
        <div className="series-caption"><h2>{collection.title}</h2><span>{collection.photos.length} photographs</span></div>
        {collection.description && <p className="series-excerpt">{collection.description}</p>}
      </Link></ImageReveal>;
    })}</div>
    {!collections.length && <p className="archive-empty">New collections are taking shape.</p>}</div><GalleryFooter />
  </main>;
}
