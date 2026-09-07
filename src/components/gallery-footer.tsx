import Link from 'next/link';
import { InstagramIcon } from '@/components/icons/instagram-icon';
import { BackToTop } from '@/components/motion/back-to-top';

export function GalleryFooter() {
  return <footer className="gallery-footer">
    <div className="gallery-colophon">
      <Link href="/" className="gallery-signature" aria-label="Brito home">Brito</Link>
      <p>Photographs by Brito.<br />© {new Date().getFullYear()}</p>
    </div>
    <div className="gallery-footer-links">
      <a href="https://instagram.com/kelbrxto" target="_blank" rel="noopener noreferrer"><InstagramIcon size={15} aria-hidden="true" />Instagram</a>
      <BackToTop />
    </div>
  </footer>;
}
