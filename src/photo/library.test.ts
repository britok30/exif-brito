import { expect, it } from 'vitest';
import { selectLibraryPage } from './library';

const photo = (id: number, hidden: boolean | null = true) => ({ id, hidden, title: null, caption: null,
  locationName: id % 2 ? 'London, UK' : 'Lisbon, Portugal', tags: ['Travel'], takenAtNaive: '2025-08-30T12:00:00' });

it('filters hidden and published photographs independently of pagination', () => {
  const photos = [photo(1), photo(2, false), photo(3, null)];
  expect(selectLibraryPage(photos, { visibility: 'hidden' }).entries.map(p => p.id)).toEqual([1]);
  expect(selectLibraryPage(photos, { visibility: 'published' }).entries.map(p => p.id)).toEqual([2, 3]);
  expect(selectLibraryPage(photos, { visibility: ['hidden'] }).total).toBe(3);
});
it('combines destination and text filters and preserves capture order', () => {
  const result = selectLibraryPage([photo(4), photo(1), photo(2)], { location: 'Lisbon, Portugal', q: 'TRAVEL' });
  expect(result.entries.map(p => p.id)).toEqual([4, 2]);
  expect(selectLibraryPage([photo(1)], { q: '2025-08' }).total).toBe(1);
});
it('bounds pages after filtering and never produces an empty trailing page', () => {
  const photos = Array.from({ length: 97 }, (_, i) => photo(i));
  const last = selectLibraryPage(photos, { page: '999' });
  expect([last.page, last.start, last.end, last.entries[0].id]).toEqual([3, 97, 97, 96]);
  for (const page of ['NaN', '-2', '1.5', 'Infinity']) expect(selectLibraryPage(photos, { page }).page).toBe(1);
  const empty = selectLibraryPage(photos, { q: 'unmatched', page: '9' });
  expect([empty.page, empty.start, empty.end, empty.total]).toEqual([1, 0, 0, 0]);
});
