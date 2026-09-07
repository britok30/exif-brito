import { describe, expect, it } from 'vitest';
import { mapLegacyPhoto, validateLegacyArchive } from './legacy';

const source = { id: 'abc12345', url: 'https://photos.example/original.jpg', extension: 'jpg', taken_at: '2024-01-01T04:00:00Z', taken_at_naive: '2023-12-31T23:00:00' };

describe('legacy archive import', () => {
  it('preserves EXIF, local time, visibility, zero values, and serialized recipes', () => {
    const photo = mapLegacyPhoto({ ...source, focal_length_in_35mm_format: 35, exposure_compensation: 0, latitude: 0, hidden: true, recipe_data: '{"color":2}', tags: ['New York'], caption: 'Original caption' });
    expect(photo).toMatchObject({ id: source.id, takenAtNaive: source.taken_at_naive, focalLengthIn35mmFormat: 35, exposureCompensation: 0, latitude: 0, hidden: true, recipeData: { color: 2 }, tags: ['New York'], caption: 'Original caption' });
    expect(photo.takenAt.toISOString()).toBe(source.taken_at.replace('Z', '.000Z'));
  });
  it('supports old application aliases and raw database aliases', () => {
    expect(mapLegacyPhoto({ ...source, focalLengthIn35MmFormat: 50, film_simulation: 'classic-chrome', fujifilm_recipe: '{"color":1}' })).toMatchObject({ focalLengthIn35mmFormat: 50, film: 'classic-chrome', recipeData: { color: 1 } });
  });
  it('validates the entire archive and rejects duplicates before inserting', () => {
    expect(() => validateLegacyArchive([source, source])).toThrow('Photo 2: Duplicate');
    expect(() => validateLegacyArchive([source, { ...source, id: 'second', taken_at: 'bad' }])).toThrow('Photo 2: Invalid takenAt');
    expect(validateLegacyArchive({ photos: [source] })).toHaveLength(1);
  });
  it('refuses truncation, invalid JSON, and ambiguous visibility', () => {
    expect(() => mapLegacyPhoto({ ...source, id: 'too-long-id' })).toThrow('refusing to truncate');
    expect(() => mapLegacyPhoto({ ...source, recipe_data: '{' })).toThrow();
    expect(() => mapLegacyPhoto({ ...source, hidden: 'false' })).toThrow('Invalid hidden');
  });
});
