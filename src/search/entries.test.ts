import { expect, it } from 'vitest';
import { isSearchEntry, searchKeywords } from './entries';

it('indexes dates, descriptions, equipment and film without needing a title', () => {
  const keywords = searchKeywords({ id: 'abcdefgh', title: null, caption: 'River at dusk', locationName: 'London, UK', tags: ['travel'], takenAtNaive: '2025-11-10T23:59:00', semanticDescription: 'A red bus on a street', make: 'FUJIFILM', model: 'X100VI', lensModel: '23mm', film: 'classic-chrome' });
  for (const term of ['London', 'November', 'Nov', '2025-11-10', 'red bus', 'FUJIFILM', 'X100VI', '23mm', 'classic chrome', 'travel', 'abcdefgh']) expect(keywords).toContain(term);
});

it('accepts only internal photograph or collection navigation', () => {
  const entry = { id: 'photo:abcdefgh', name: 'London', subtitle: '', keywords: '', path: '/p/abcdefgh', section: 'Photographs' };
  expect(isSearchEntry(entry)).toBe(true);
  expect(isSearchEntry({ ...entry, section: 'Collections', path: '/collections/london' })).toBe(true);
  for (const path of ['https://example.com', '//example.com', 'javascript:alert(1)', '/admin/photos', '/api/image/photos/a.jpg']) expect(isSearchEntry({ ...entry, path })).toBe(false);
  expect(isSearchEntry({ ...entry, keywords: undefined })).toBe(false);
});
