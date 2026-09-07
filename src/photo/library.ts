import type { Photo } from '@/db';
import { shortPhotoLocation } from './location';

export const LIBRARY_PAGE_SIZE = 48;
export type LibraryParams = Record<string, string | string[] | undefined>;
type LibraryPhoto = Pick<Photo, 'hidden' | 'title' | 'caption' | 'locationName' | 'tags' | 'takenAtNaive'>;

export function selectLibraryPage<T extends LibraryPhoto>(photos: T[], params: LibraryParams) {
  const value = (key: string) => typeof params[key] === 'string' ? params[key] as string : '';
  const visibility = ['hidden', 'published'].includes(value('visibility')) ? value('visibility') : 'all';
  const location = value('location');
  const q = value('q').trim();
  const locations = [...new Set(photos.map(shortPhotoLocation).filter((name): name is string => !!name))].sort((a, b) => a.localeCompare(b));
  const matches = photos.filter(photo => {
    if (visibility === 'hidden' && !photo.hidden) return false;
    if (visibility === 'published' && photo.hidden) return false;
    if (location && shortPhotoLocation(photo) !== location) return false;
    return !q || [photo.title, photo.caption, photo.locationName, ...(photo.tags || []), photo.takenAtNaive]
      .filter(Boolean).join(' ').toLocaleLowerCase().includes(q.toLocaleLowerCase());
  });
  const pageCount = Math.max(1, Math.ceil(matches.length / LIBRARY_PAGE_SIZE));
  const requested = Number(value('page'));
  const page = Math.min(pageCount, Number.isSafeInteger(requested) && requested > 0 ? requested : 1);
  const start = (page - 1) * LIBRARY_PAGE_SIZE;
  const entries = matches.slice(start, start + LIBRARY_PAGE_SIZE);
  return { entries, total: matches.length, page, pageCount, start: matches.length ? start + 1 : 0,
    end: start + entries.length, visibility, location, q, locations };
}
