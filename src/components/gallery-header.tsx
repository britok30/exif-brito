import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export function GalleryHeader() {
  return <nav className="gallery-nav" aria-label="Gallery navigation">
    <Link href="/" className="gallery-wordmark">Brito</Link>
    <div className="gallery-nav-links">
      <ThemeToggle />
      <Link href="/#archive" className="gallery-back"><ArrowLeft size={14} aria-hidden="true" />Gallery</Link>
    </div>
  </nav>;
}
