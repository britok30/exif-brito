import { redirect } from 'next/navigation';
import { PhotoLibraryPage } from '@/photo/PhotoLibraryPage';
import { libraryHref } from '@/photo/library-routes';
import type { LibraryParams } from '@/photo/library';

export const metadata = { title: 'Photo library' };
export default async function AllPhotographs({ searchParams }: { searchParams: Promise<LibraryParams> }) {
  const params = await searchParams;
  if (params.visibility === 'hidden' || params.visibility === 'published') redirect(libraryHref(params.visibility, params));
  return <PhotoLibraryPage params={params} visibility="all" />;
}
