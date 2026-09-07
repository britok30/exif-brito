import { describe, it, expect, vi } from 'vitest';

vi.mock('@/db', () => ({
  db: {},
  photos: {},
}));

import { mapExifToPhotoInsert } from './index';
import type { ExtractedExif } from '@/exif';

describe('mapExifToPhotoInsert', () => {
  const baseLocation = { url: 'https://bucket.s3.us-east-2.amazonaws.com/photos/x.jpg', extension: 'jpg' };

  it('rounds fractional focal lengths to integers (schema stores integer focal length)', () => {
    const exif: ExtractedExif = {
      aspectRatio: 1.5,
      focalLength: 6.764999865652793,
      focalLengthIn35mmFormat: 24.2,
    };
    const insert = mapExifToPhotoInsert(exif, baseLocation);
    expect(insert.focalLength).toBe(7);
    expect(insert.focalLengthIn35mmFormat).toBe(24);
  });

  it('defaults takenAt / takenAtNaive when EXIF has no timestamp', () => {
    const exif: ExtractedExif = { aspectRatio: 1.5 };
    const insert = mapExifToPhotoInsert(exif, baseLocation);
    expect(insert.takenAt).toBeInstanceOf(Date);
    expect(insert.takenAtNaive).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });

  it('preserves taken-at timestamp when EXIF provides one', () => {
    const d = new Date('2024-08-15T14:30:00Z');
    const exif: ExtractedExif = { aspectRatio: 1.5, takenAt: d, takenAtNaive: '2024-08-15T14:30:00' };
    const insert = mapExifToPhotoInsert(exif, baseLocation);
    expect(insert.takenAt).toBe(d);
    expect(insert.takenAtNaive).toBe('2024-08-15T14:30:00');
  });

  it('passes through Fuji film + recipe', () => {
    const exif: ExtractedExif = {
      aspectRatio: 1.5,
      film: 'classic-chrome',
      recipeData: {
        dynamicRange: { range: 'standard', setting: 'auto', development: 100 },
        whiteBalance: { type: 'auto', red: 0, blue: 0 },
        grainEffect: { roughness: 'off', size: 'off' },
      },
    };
    const insert = mapExifToPhotoInsert(exif, baseLocation);
    expect(insert.film).toBe('classic-chrome');
    expect(insert.recipeData).toEqual(exif.recipeData);
  });

  it('copies camera, lens, exposure, and GPS fields through', () => {
    const exif: ExtractedExif = {
      aspectRatio: 1.5,
      width: 4000,
      height: 3000,
      make: 'Apple',
      model: 'iPhone 15 Pro Max',
      lensMake: 'Apple',
      lensModel: 'iPhone 15 Pro Max back triple camera 6.765mm f/1.78',
      fNumber: 1.78,
      iso: 800,
      exposureTime: 1 / 30,
      exposureCompensation: -0.33,
      latitude: 25.78,
      longitude: -80.19,
    };
    const insert = mapExifToPhotoInsert(exif, baseLocation);
    expect(insert).toMatchObject({
      width: 4000,
      height: 3000,
      make: 'Apple',
      model: 'iPhone 15 Pro Max',
      lensMake: 'Apple',
      fNumber: 1.78,
      iso: 800,
      latitude: 25.78,
      longitude: -80.19,
    });
  });
});
