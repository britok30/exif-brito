import { expect, it } from 'vitest';
import { collectionSlug, parseCollection } from './validation';
const value = { title: ' Kyoto ', slug: 'kyoto', description: ' A quiet morning. ', photoIds: ['ezuihkxn', 'AJPSPIpE'] };
it('keeps intentional order and trims editorial text', () => {
  expect(parseCollection(value)).toEqual({ ...value, title: 'Kyoto', description: 'A quiet morning.' });
});
it('rejects duplicate, missing, malformed and oversized selections', () => {
  for (const photoIds of [[], ['ezuihkxn', 'ezuihkxn'], ['../other'], [5], Array(2001).fill('ezuihkxn')]) expect(parseCollection({ ...value, photoIds })).toBeNull();
});
it('rejects unsafe URLs and missing or oversized editorial fields', () => {
  for (const change of [{ slug: '../admin' }, { slug: 'New Series' }, { slug: 'a'.repeat(121) }, { title: ' ' }, { description: 'x'.repeat(5001) }]) expect(parseCollection({ ...value, ...change })).toBeNull();
});
it('creates readable URL names from accented titles', () => {
  expect(collectionSlug('  São Paulo / 2026  ')).toBe('sao-paulo-2026');
  expect(collectionSlug('a'.repeat(119) + ' other')).toBe('a'.repeat(119));
});
