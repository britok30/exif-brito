import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { GalleryHeader } from '@/components/gallery-header';
import { StudioIntro } from '@/components/studio-intro';
import { readReview } from '@/review/local';
import { PhotoReview } from '@/review/PhotoReview';
export const metadata = { title: 'Review photographs', robots: { index: false, follow: false } };
export default async function ReviewPage() {
  if (!(await auth())?.user) redirect('/sign-in?callbackUrl=%2Fadmin%2Freview');
  const review = await readReview();
  return <main id="main" tabIndex={-1} className="archive-page"><GalleryHeader />
    <StudioIntro title={review?.title || 'Your photographs.'} note={<>Choose the frames worth keeping.<br />Soft ones are set aside for you.</>}
      actions={<Link href="/admin/photos" className="studio-button">Photo library</Link>} />
    {review ? <section className="archive-content" aria-label="Review"><PhotoReview key={review.version} version={review.version} items={review.items.map(({path: _path, modified: _modified, ...item}) => item)} /></section>
      : <section className="archive-content"><div className="archive-empty"><h2>No local review is ready yet.</h2><Link href="/admin/upload" className="underline underline-offset-4">Add photographs instead</Link></div></section>}
  </main>;
}
