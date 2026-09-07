import type { SearchEntry } from './types';
import { formatCameraName } from '@/photo/camera';

export interface SearchPhoto {
  id: string; title: string | null; caption: string | null; locationName: string | null;
  tags: string[] | null; takenAtNaive: string;
  semanticDescription?: string | null; make?: string | null; model?: string | null;
  lensModel?: string | null; film?: string | null;
}

/** Dates are camera-local calendar dates, not timestamps to shift by timezone. */
export function searchKeywords(photo: SearchPhoto): string {
  const date = photo.takenAtNaive.slice(0, 10);
  const month = Number(date.slice(5, 7));
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthName = months[month - 1];
  return [photo.title, photo.caption, photo.semanticDescription, photo.locationName,
    ...(photo.tags || []), photo.make, photo.model, formatCameraName(photo.make, photo.model), photo.lensModel, photo.film?.replaceAll('-', ' '),
    date, monthName, monthName?.slice(0, 3), photo.id].filter(Boolean).join(', ');
}

export function isSearchEntry(value: unknown): value is SearchEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  const image = entry.image;
  return ['id', 'name', 'subtitle', 'keywords', 'path'].every(key => typeof entry[key] === 'string') &&
    (image === null || (typeof image === 'string' && image.startsWith('/api/image/'))) &&
    ((entry.section === 'Photographs' && /^\/p\/[a-z0-9]{8}$/i.test(entry.path as string)) ||
     (entry.section === 'Collections' && /^\/collections\/[^/?#]+$/.test(entry.path as string)));
}
