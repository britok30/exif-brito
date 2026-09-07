'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PAGES = [
  { href: '/admin', label: 'Studio' },
  { href: '/admin/photos', label: 'Photographs' },
  { href: '/admin/collections', label: 'Collections' },
  { href: '/admin/upload', label: 'Uploads' },
  { href: '/admin/review', label: 'Review' },
];

/** The studio's pages as one slash phrase in the header, the current one in ink. Renders only inside the studio. */
export function StudioNav() {
  const pathname = usePathname();
  if (!pathname.startsWith('/admin')) return null;
  // The library's sibling routes (unpublished, published) all belong to Photographs.
  const current = (href: string) => href === '/admin' ? pathname === '/admin'
    : href === '/admin/photos' ? /^\/admin\/(photos|unpublished|published)/.test(pathname) : pathname.startsWith(href);
  return <nav className="slash-toggle studio-nav" aria-label="Studio">
    {PAGES.flatMap((page, index) => [
      index > 0 && <span key={`${page.href}-slash`} aria-hidden="true">/</span>,
      <Link key={page.href} href={page.href} aria-current={current(page.href) ? 'page' : undefined}>{page.label}</Link>,
    ])}
  </nav>;
}
