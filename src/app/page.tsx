import { publicMetadata } from '@/seo/metadata';
import { SITE_TITLE, SITE_DESCRIPTION } from '@/seo/site';
import Link from 'next/link';
import { Reveal } from '@/components/motion/reveal';
import { Settle } from '@/components/motion/settle';
import { FilterPanel } from '@/components/motion/filter-panel';
import { GalleryFooter } from '@/components/gallery-footer';
import { InstagramIcon } from '@/components/icons/instagram-icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { auth } from '@/auth';
import { getPhotos } from '@/photo/query';
import { withImageSources } from '@/photo/url';
import { PhotoCollection } from '@/photo/PhotoCollection';
import { PhotoViewerProvider } from '@/photo/PhotoViewerProvider';
import { viewerPhoto } from '@/photo/viewer-data';
import { PhotoFacets } from '@/photo/PhotoFacets';
import { ViewSwitcher, ClearPhotoSelection } from '@/photo/ViewSwitcher';
import { applyPhotoFilter, buildPhotoFacets, parsePhotoFilter } from '@/photo/filters';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const cover = (await getPhotos(1))[0];
  return publicMetadata({title:SITE_TITLE,description:SITE_DESCRIPTION,path:'/',photoId:cover?.id});
}

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const [search, session] = await Promise.all([searchParams, auth()]);
  const filter = parsePhotoFilter(search);
  const isAdmin = Boolean(session?.user);
  const allPhotos = await getPhotos();
  const facets = buildPhotoFacets(allPhotos);
  const photos = withImageSources(applyPhotoFilter(allPhotos, filter));
  const years = new Map<string, typeof photos>();
  for (const photo of photos) {
    const year = photo.takenAtNaive.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), photo]);
  }
  const filtered = Object.values(filter).some(Boolean);

  return (
    <PhotoViewerProvider photos={photos.map(viewerPhoto)}><main id="main" tabIndex={-1} className="archive-page">
      <nav aria-label="Main navigation" className="gallery-nav">
        <Link href="/" className="gallery-wordmark">Brito</Link>
        <div className="gallery-nav-links">
          <a href="#archive" aria-current="page">Photographs</a>
          <ThemeToggle />
          <Link href="/collections">Collections</Link>
          <a href="https://instagram.com/kelbrxto" target="_blank" rel="noopener noreferrer" aria-label="Brito on Instagram" className="inline-flex min-h-8 min-w-8 items-center justify-center"><InstagramIcon size={18} strokeWidth={1.5} aria-hidden="true" /></a>
        </div>
      </nav>

      <Reveal className="gallery-intro" y={16}>
        <div><h1>Photographs.</h1></div>
        <p className="gallery-intro-note">Places, people,<br />and passing moments.</p>
      </Reveal>

      <section id="archive" aria-label="Photographs" className="archive-content">
        <header className="archive-toolbar">
          <p>{filtered ? 'Your selection' : 'All photographs'}</p>
          <span className="archive-total">{photos.length} photographs / {years.size} {years.size === 1 ? 'year' : 'years'}</span>
          <ViewSwitcher />
        </header>
        <FilterPanel defaultOpen={filtered}>
          <div className="py-7"><PhotoFacets facets={facets} /></div>
          {filtered && <ClearPhotoSelection className="mb-6 inline-block text-xs underline underline-offset-4">Clear selection</ClearPhotoSelection>}
        </FilterPanel>

        {photos.length > 0 ? Array.from(years, ([year, entries], index) => (
          <section key={year} aria-labelledby={`year-${year}`} className="archive-year">
            <Settle><Reveal><header className="archive-year-heading">
              <h2 id={`year-${year}`}>{year}</h2>
              <p>{entries.length}<span>{entries.length === 1 ? 'photograph' : 'photographs'}</span></p>
            </header></Reveal></Settle>
            <PhotoCollection photos={entries} isAdmin={isAdmin} priority={index === 0} />
          </section>
        )) : <div className="archive-empty">
          <h2>{allPhotos.length ? 'No photographs in this selection.' : 'The first photograph begins here.'}</h2>
          {allPhotos.length > 0 ? <ClearPhotoSelection className="underline underline-offset-4">View all photographs</ClearPhotoSelection>
            : isAdmin && <Link href="/admin/upload" className="underline underline-offset-4">Add your first photograph</Link>}
        </div>}
      </section>

      <GalleryFooter />
    </main></PhotoViewerProvider>
  );
}
