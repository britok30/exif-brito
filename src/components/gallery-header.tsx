import { SearchButton } from '@/search/SearchProvider';
import Link from 'next/link';
import IconGrid from '@/components/icons/IconGrid';
import { ThemeToggle } from '@/components/theme-toggle';
import { StudioNav } from '@/components/studio-nav';

export function GalleryHeader() {
  return <nav className="gallery-nav" aria-label="Gallery navigation">
    <Link href="/" className="gallery-wordmark">Brito</Link>
    <div className="gallery-nav-links">
      <StudioNav />
      <SearchButton /><ThemeToggle />
      <Link href="/#archive" className="gallery-back gallery-icon-link" aria-label="Gallery" title="Gallery"><span aria-hidden="true"><IconGrid /></span></Link>
    </div>
  </nav>;
}
