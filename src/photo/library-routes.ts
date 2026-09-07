import type { LibraryParams } from './library';

export type LibraryVisibility = 'all' | 'hidden' | 'published';
export function libraryPath(visibility: string) {
  return visibility === 'hidden' ? '/admin/unpublished' : visibility === 'published' ? '/admin/published' : '/admin/photos';
}

export function libraryHref(visibility: string, params: LibraryParams = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'visibility' && typeof value === 'string' && value) query.set(key, value);
  }
  const path = libraryPath(visibility);
  return query.size ? `${path}?${query}` : path;
}
