import { isSearchEntry } from './entries';
import type { SearchEntry } from './types';

/**
 * The index is fetched once per page load, ahead of time when the browser is
 * idle or the visitor reaches for the search button, so the palette opens with
 * results already in hand. A failed load is forgotten so the next open retries.
 */
let index: Promise<SearchEntry[]> | null = null;
export function loadIndex(): Promise<SearchEntry[]> {
  index ??= fetch('/api/search')
    .then(response => { if (!response.ok) throw new Error('Search unavailable'); return response.json() as Promise<unknown>; })
    .then(data => {
      if (!Array.isArray(data) || !data.every(isSearchEntry)) throw new Error('Invalid search response');
      return data;
    })
    .catch(error => { index = null; throw error; });
  return index;
}
