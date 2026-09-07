import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getCollections } from '@/collections/query';
import { CollectionStudio } from '@/collections/CollectionStudio';
import { GalleryHeader } from '@/components/gallery-header';
import { StudioIntro } from '@/components/studio-intro';
import { getLibrary } from '@/photo/query';
import { imagePath } from '@/photo/url';
import { shortPhotoLocation } from '@/photo/location';
export const metadata = { title: 'Manage collections', robots: { index: false, follow: false } };
export default async function ManageCollections() {
  if (!(await auth())?.user) redirect('/sign-in?callbackUrl=%2Fadmin%2Fcollections');
  const [collections, library] = await Promise.all([getCollections(true), getLibrary()]);
  return <main id="main" tabIndex={-1} className="archive-page"><GalleryHeader />
    <StudioIntro title="Your collections." note={<>Gather a place, a journey,<br />or a feeling into a series.</>}
      actions={<Link href="/admin/photos" className="studio-button">Photo library</Link>} />
    <section className="archive-content" aria-label="Collections">
      <header className="archive-toolbar"><p>All collections</p><span className="archive-total">{collections.length} {collections.length === 1 ? 'collection' : 'collections'} / {library.length} photographs</span><span /></header>
      <CollectionStudio initial={collections.map(item => ({ id: item.id, title: item.title, slug: item.slug, description: item.description || '', photoIds: item.photos.map(photo => photo.id) }))}
        photos={library.map(photo => ({ id: photo.id, title: [photo.title, shortPhotoLocation(photo)].filter(Boolean).join(' · ') || 'Untitled', hidden: !!photo.hidden, src: imagePath(photo.thumbnailUrl || photo.url) }))} />
    </section></main>;
}
