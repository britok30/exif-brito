import { isOwner } from '@/security/owner';
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
import { libraryHref, libraryPath, type LibraryVisibility } from '@/photo/library-routes';

export async function PhotoLibraryPage({ params, visibility }: { params: LibraryParams; visibility: LibraryVisibility }) {
  const path = libraryPath(visibility);
  if (!isOwner(await auth())) redirect(`/sign-in?callbackUrl=${encodeURIComponent(path)}`);
  const library = await getLibrary();
  const selection = selectLibraryPage(library, { ...params, visibility });
  const entries = withImageSources(selection.entries);
  const hidden = library.filter(photo => photo.hidden).length;
  const pageHref = (page: number) => libraryHref(visibility, { ...params, page: String(page) });
  return <PhotoViewerProvider photos={entries.map(viewerPhoto)}><main id="main" tabIndex={-1} className="archive-page">
    <GalleryHeader />
    <StudioIntro title={visibility === 'hidden' ? 'Unpublished.' : visibility === 'published' ? 'Published.' : 'Your photographs.'}
      note={visibility === 'published' ? <>Everything on view,<br />newest first.</> : visibility === 'hidden' ? <>Waiting for your eye.<br />Publish when you’re ready.</> : <>The whole library,<br />on view and waiting.</>}
      actions={<Link href="/admin/upload" className="studio-button primary">Add photographs</Link>} />
    <section className="archive-content photo-library" aria-label="Photo library">
      <LibraryFilters key={`${visibility}:${selection.q}`} q={selection.q} visibility={selection.visibility} location={selection.location} locations={selection.locations} />
      <LibrarySelection hiddenIds={visibility === 'published' ? [] : library.filter(photo => photo.hidden).map(photo => photo.id)}>
      <header className="archive-toolbar"><p>{selection.visibility === 'hidden' ? 'Unpublished photographs' : selection.visibility === 'published' ? 'Published photographs' : 'All photographs'}</p>
        <span className="archive-total">{selection.start}–{selection.end} of {selection.total.toLocaleString()}{visibility === 'all' ? ` / ${hidden.toLocaleString()} unpublished` : ''}</span><ViewSwitcher /></header>
      {entries.length ? <PhotoCollection photos={entries} isAdmin /> : <div className="archive-empty"><h2>{library.length ? 'No photographs match this selection.' : 'Add your first photograph to begin.'}</h2><Link href={library.length ? path : '/admin/upload'} className="underline underline-offset-4">{library.length ? 'Clear filters' : 'Add photographs'}</Link></div>}
      {selection.pageCount > 1 && <nav className="archive-toolbar library-pagination" aria-label="Photo library pages">
        {selection.page > 1 ? <Link href={pageHref(selection.page - 1)} prefetch={false}>← Previous</Link> : <span className="is-quiet">← Previous</span>}
        <form action={path} className="library-page-jump">
          {Object.entries(params).map(([key, value]) => key !== 'page' && key !== 'visibility' && typeof value === 'string' ? <input key={key} type="hidden" name={key} value={value} /> : null)}
          <label htmlFor="library-page">Page</label>
          <input key={selection.page} id="library-page" name="page" type="number" inputMode="numeric" min={1} max={selection.pageCount} defaultValue={selection.page} required aria-describedby="library-page-count" />
          <span id="library-page-count">of {selection.pageCount}</span>
        </form>
        {selection.page < selection.pageCount ? <Link href={pageHref(selection.page + 1)} prefetch={false}>Next →</Link> : <span className="is-quiet">Next →</span>}
      </nav>}
      </LibrarySelection>
    </section>
  </main></PhotoViewerProvider>;
}
