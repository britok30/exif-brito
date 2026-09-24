import { expect, it } from 'vitest';
import type { Photo } from '@/db';
import { applyPhotoFilter, buildPhotoFacets, describePhotoFilter, filterHref, filterSearchParams, isFiltered, parsePhotoFilter } from './filters';

const photo = (overrides: Partial<Photo>) => ({
  tags: [], locationName: null, film: null, make: null, model: null, lensModel: null, focalLength: null,
  takenAtNaive: '2024-06-01T12:00:00', ...overrides,
}) as Pick<Photo, 'tags' | 'locationName' | 'film' | 'make' | 'model' | 'lensModel' | 'focalLength' | 'takenAtNaive'>;

it('parses only well-formed numbers for year and focal length', () => {
  expect(parsePhotoFilter({ year: '2024', focal: '35' })).toMatchObject({ year: 2024, focal: 35 });
  expect(parsePhotoFilter({ year: 'abc', focal: '-5' })).toMatchObject({ year: undefined, focal: undefined });
  expect(isFiltered(parsePhotoFilter({}))).toBe(false);
});

it('files a photograph under the year the camera recorded, whatever the server zone', () => {
  // Late on New Year's Eve in New York is already the next year in UTC.
  const eve = photo({ takenAtNaive: '2023-12-31T23:30:00', takenAt: new Date('2024-01-01T04:30:00Z') } as Partial<Photo>);
  expect(applyPhotoFilter([eve], { year: 2023 })).toHaveLength(1);
  expect(applyPhotoFilter([eve], { year: 2024 })).toHaveLength(0);
});

it('filters by place and focal length', () => {
  const photos = [photo({ locationName: 'Kyoto, Japan', focalLength: 23 }), photo({ locationName: 'Paris, France', focalLength: 35 })];
  expect(applyPhotoFilter(photos, { place: 'Kyoto, Japan' })).toEqual([photos[0]]);
  expect(applyPhotoFilter(photos, { focal: 35 })).toEqual([photos[1]]);
  const facets = buildPhotoFacets(photos);
  expect(facets.focalLengths.map(f => f.label)).toEqual(['23mm', '35mm']);
  expect(facets.places.map(f => f.value).sort()).toEqual(['Kyoto, Japan', 'Paris, France']);
});

it('builds stable links and readable titles for a selection', () => {
  expect(filterSearchParams({ year: 2024, camera: 'FUJIFILM X100VI' }).toString()).toBe('camera=FUJIFILM+X100VI&year=2024');
  expect(filterHref('focal', 35)).toBe('/?focal=35#archive');
  expect(describePhotoFilter({ focal: 35, year: 2024 })).toBe('35mm, 2024');
  expect(describePhotoFilter({})).toBeUndefined();
});
