import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { GalleryHeader } from '@/components/gallery-header';
import { StudioIntro } from '@/components/studio-intro';
import { withImageSources } from '@/photo/url';
import { getLibrary } from '@/photo/query';
import { LibrarySelection } from '@/photo/LibrarySelection';
import { PhotoCollection } from '@/photo/PhotoCollection';
import { PhotoViewerProvider } from '@/photo/PhotoViewerProvider';
import { ViewSwitcher } from '@/photo/ViewSwitcher';
import { LibraryFilters } from '@/photo/LibraryFilters';
import { viewerPhoto } from '@/photo/viewer-data';
import { selectLibraryPage, type LibraryParams } from '@/photo/library';

export const metadata = { title: 'Photo library', robots: { index: false, follow: false } };
export default async function PhotoLibrary({ searchParams }: { searchParams: Promise<LibraryParams> }) {
  if (!(await auth())?.user) redirect('/sign-in?callbackUrl=%2Fadmin%2Fphotos');
  const params = await searchParams;
  const library = await getLibrary();
  const selection = selectLibraryPage(library, params);
  const entries = withImageSources(selection.entries);
  const hidden = library.filter(photo => photo.hidden).length;
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (typeof value === 'string' && key !== 'page') query.set(key, value);
    query.set('page', String(page));
    return `/admin/photos?${query}`;
  };
  return <PhotoViewerProvider photos={entries.map(viewerPhoto)}><main id="main" tabIndex={-1} className="archive-page">
    <GalleryHeader />
    <StudioIntro title="Your photographs." note={<>Choose your favorites.<br />Publish when you’re ready.</>}
      actions={<><Link href="/admin/photos?visibility=hidden" className="studio-button">Unpublished photographs</Link><Link href="/admin/collections" className="studio-button">Collections</Link><Link href="/admin/upload" className="studio-button primary">Add photographs</Link></>} />
    <section className="archive-content photo-library" aria-label="Photo library">
      <LibraryFilters q={selection.q} visibility={selection.visibility} location={selection.location} locations={selection.locations} />
      <LibrarySelection hiddenIds={library.filter(photo => photo.hidden).map(photo => photo.id)}>
      <header className="archive-toolbar"><p>{selection.visibility === 'hidden' ? 'Hidden photographs' : selection.visibility === 'published' ? 'Published photographs' : 'All photographs'}</p>
        <span className="archive-total">{selection.start}–{selection.end} of {selection.total} / {hidden} hidden</span><ViewSwitcher /></header>
      {entries.length ? <PhotoCollection photos={entries} isAdmin /> : <div className="archive-empty"><h2>{library.length ? 'No photographs match this selection.' : 'Add your first photograph to begin.'}</h2><Link href={library.length ? '/admin/photos' : '/admin/upload'} className="underline underline-offset-4">{library.length ? 'Clear filters' : 'Add photographs'}</Link></div>}
      {selection.pageCount > 1 && <nav className="library-pagination" aria-label="Photo library pages">
        {selection.page > 1 ? <Link href={pageHref(selection.page - 1)} className="studio-button" prefetch={false}>Previous</Link> : <span />}
        <p>Page {selection.page} of {selection.pageCount}</p>
        {selection.page < selection.pageCount ? <Link href={pageHref(selection.page + 1)} className="studio-button" prefetch={false}>Next</Link> : <span />}
      </nav>}
      </LibrarySelection>
    </section>
  </main></PhotoViewerProvider>;
}
