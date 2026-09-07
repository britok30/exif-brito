import { PhotoLibraryPage } from '@/photo/PhotoLibraryPage';
import type { LibraryParams } from '@/photo/library';

export const metadata = { title: 'Published photographs' };
export default async function Page({ searchParams }: { searchParams: Promise<LibraryParams> }) {
  return <PhotoLibraryPage params={await searchParams} visibility="published" />;
}
