import { isOwner } from '@/security/owner';
import Link from 'next/link';
import Image from 'next/image';
import { imagePath } from '@/photo/url';
import { redirect } from 'next/navigation';
import { count } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, albums } from '@/db';
import { getLibrary } from '@/photo/query';
import { shortPhotoLocation } from '@/photo/location';
import { ClearUnpublished } from '@/photo/ClearUnpublished';
import { GalleryHeader } from '@/components/gallery-header';
import { StudioIntro } from '@/components/studio-intro';

export const metadata = { title: 'Studio' };

export default async function StudioDashboard() {
  if (!isOwner(await auth())) redirect('/sign-in?callbackUrl=%2Fadmin');
  const [library, [collections]] = await Promise.all([getLibrary(), db.select({ total: count() }).from(albums)]);
  const unpublished = library.filter(photo => photo.hidden);
  const destinations = new Map<string, { total: number; photo: (typeof unpublished)[number] }>();
  for (const photo of unpublished) {
    const location = shortPhotoLocation(photo) || '';
    const existing = destinations.get(location);
    if (existing) existing.total += 1;
    else destinations.set(location, { total: 1, photo });
  }
  const figures = [
    { label: 'Unpublished', total: unpublished.length, href: '/admin/unpublished', note: 'Waiting for your eye' },
    { label: 'Published', total: library.length - unpublished.length, href: '/admin/published', note: 'On view' },
    { label: 'Photographs', total: library.length, href: '/admin/photos', note: 'In the library' },
    { label: 'Collections', total: collections.total, href: '/admin/collections', note: 'Places and series' },
  ];
  const ordered = [...destinations].sort(([a], [b]) => (a || '￿').localeCompare(b || '￿'));
  return <main id="main" tabIndex={-1} className="archive-page"><GalleryHeader />
    <StudioIntro title="Your studio." note={<>A place for everything.<br />You decide what goes on view.</>}
      actions={<Link className="studio-button primary" href="/admin/upload">Add photographs</Link>} />
    <div className="archive-content studio-dashboard">
      <section className="studio-figures" aria-label="Library at a glance">
        {figures.map(figure => <Link key={figure.label} href={figure.href} className="studio-figure">
          <span>{figure.label}</span><strong>{figure.total.toLocaleString()}</strong><small>{figure.note}</small>
        </Link>)}
      </section>

      <section aria-labelledby="unpublished-heading">
        <header className="archive-toolbar"><p id="unpublished-heading">Unpublished by destination</p>
          <span className="archive-total">{unpublished.length.toLocaleString()} photographs / {destinations.size} {destinations.size === 1 ? 'destination' : 'destinations'}</span>
          <Link href="/admin/unpublished" className="studio-button">Browse all unpublished</Link></header>
        {unpublished.length ? <ul className="studio-destinations">
          {ordered.map(([location, { total, photo }]) => <li key={location}>
            <Link href={`/admin/unpublished${location ? `?${new URLSearchParams({ location })}` : ''}`}>
              <span className="studio-destination-thumbnail"><Image src={imagePath(photo.thumbnailUrl || photo.url)} alt="" fill sizes="96px" quality={60} /></span>
              <span className="studio-destination-name">{location || 'No location yet'}</span>
              <span className="studio-destination-count">{total.toLocaleString()}</span>
            </Link>
          </li>)}
        </ul> : <p className="studio-note">Nothing is waiting. Add photographs whenever you’re ready.</p>}
      </section>

      <section aria-labelledby="clear-heading">
        <header className="archive-toolbar"><p id="clear-heading">Clear the unpublished library</p>
          <span className="archive-total">Published photographs and stored files are kept</span>
          <ClearUnpublished count={unpublished.length} /></header>
        <p className="studio-note">Removes every unpublished photograph, including its collection memberships. You confirm the exact count first. Restoring them means importing again.</p>
      </section>
    </div>
  </main>;
}
