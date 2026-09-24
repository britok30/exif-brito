import { isOwner } from '@/security/owner';
import { SearchButton } from '@/search/SearchProvider';
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
import { galleryPhotos } from '@/photo/gallery-photo';
import { PhotoCollection } from '@/photo/PhotoCollection';

import { PhotoViewerProvider } from '@/photo/PhotoViewerProvider';
import { PhotoFacets } from '@/photo/PhotoFacets';
import { ViewSwitcher, ClearPhotoSelection } from '@/photo/ViewSwitcher';
import { applyPhotoFilter, buildPhotoFacets, describePhotoFilter, filterSearchParams, isFiltered, parsePhotoFilter } from '@/photo/filters';

/** Tiles rendered on the server; the rest arrive in batches as the reader scrolls. */
const INITIAL_TILES = 96;

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

/**
 * A filtered gallery (one camera, film, lens, place, subject, focal length or
 * year) is a page of its own: its own title, description, share image and
 * canonical address, so it can be found and shared rather than folding into
 * the home page.
 */
export async function generateMetadata({ searchParams }: PageProps) {
  const filter = parsePhotoFilter(await searchParams);
  const all = await getPhotos();
  if (!isFiltered(filter)) return publicMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: '/', photoId: all[0]?.id });
  const photos = applyPhotoFilter(all, filter);
  const label = describePhotoFilter(filter, all) ?? 'Selected';
  const metadata = publicMetadata({
    title: `${label} photographs`,
    description: `${photos.length} ${photos.length === 1 ? 'photograph' : 'photographs'} in Brito’s photographic journal: ${label}.`,
    path: `/?${filterSearchParams(filter)}`, photoId: photos[0]?.id,
  });
  // A single facet is a page worth finding; empty selections and combinations are not.
  const facets = [...filterSearchParams(filter).keys()].length;
  // The layout's title template does not reach a page in its own segment.
  const titled = { ...metadata, title: { absolute: `${label} photographs — Brito` } };
  return photos.length && facets === 1 ? titled : { ...titled, robots: { index: false, follow: true } };
}

export default async function HomePage({ searchParams }: PageProps) {
  const [search, session] = await Promise.all([searchParams, auth()]);
  const filter = parsePhotoFilter(search);
  const isAdmin = isOwner(session);
  const allPhotos = await getPhotos();
  const facets = buildPhotoFacets(allPhotos);
  const photos = applyPhotoFilter(allPhotos, filter);
  const years = new Map<string, typeof photos>();
  for (const photo of photos) {
    const year = photo.takenAtNaive.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), photo]);
  }
  // Only the first screens are serialised; each year's remainder streams in on demand.
  let budget = INITIAL_TILES;
  const sections = Array.from(years, ([year, entries]) => {
    const initial = galleryPhotos(entries.slice(0, budget));
    budget = Math.max(0, budget - initial.length);
    return { year, total: entries.length, initial };
  });
  const filtered = isFiltered(filter);
  const query = filterSearchParams(filter).toString();

  return (
    <PhotoViewerProvider listUrl={`/api/viewer${query ? `?${query}` : ''}`}><main id="main" tabIndex={-1} className="archive-page">
      <nav aria-label="Main navigation" className="gallery-nav">
        <Link href="/" className="gallery-wordmark">Brito</Link>
        <div className="gallery-nav-links">
          <SearchButton /><ThemeToggle />
          <Link href="/collections">Collections</Link>
          <a href="https://instagram.com/kelbrxto" target="_blank" rel="noopener noreferrer" aria-label="Brito on Instagram" className="inline-flex min-h-8 min-w-8 items-center justify-center"><InstagramIcon size={18} strokeWidth={1.5} aria-hidden="true" /></a>
        </div>
      </nav>

      <Reveal className="gallery-intro" y={16} delay={0.08}>
        <div><h1>Photographs.</h1></div>
        <p className="gallery-intro-note">Places, people,<br />and passing moments.</p>
      </Reveal>

      <section id="archive" aria-label="Photographs" className="archive-content">
        <header className="archive-toolbar">
          <p>{filtered ? describePhotoFilter(filter, allPhotos) ?? 'Your selection' : 'All photographs'}</p>
          <span className="archive-total">{photos.length} photographs / {years.size} {years.size === 1 ? 'year' : 'years'}</span>
          <ViewSwitcher />
        </header>
        <FilterPanel defaultOpen={filtered}>
          <div className="py-7"><PhotoFacets facets={facets} /></div>
          {filtered && <ClearPhotoSelection className="mb-6 inline-block text-xs underline underline-offset-4">Clear selection</ClearPhotoSelection>}
        </FilterPanel>

        {photos.length > 0 ? sections.map(({ year, total, initial }, index) => (
          <section key={year} aria-labelledby={`year-${year}`} className="archive-year">
            <Settle><Reveal><header className="archive-year-heading">
              <h2 id={`year-${year}`}>{year}</h2>
              <p>{total}<span>{total === 1 ? 'photograph' : 'photographs'}</span></p>
            </header></Reveal></Settle>
            <PhotoCollection photos={initial} isAdmin={isAdmin} priority={index === 0} more={initial.length < total ? { year, total, filter } : undefined} />
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
