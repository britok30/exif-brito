import { describe, it, expect } from 'vitest';
import {
  convertApertureValueToFNumber,
  getDimensionsFromExif,
  getOffsetFromExif,
  parseTakenAt,
} from './helpers';
import type { ExifData } from 'ts-exif-parser';
import { OrientationTypes } from 'ts-exif-parser';

describe('convertApertureValueToFNumber', () => {
  it('maps integer aperture values via lookup', () => {
    expect(convertApertureValueToFNumber(0)).toBe(1);
    expect(convertApertureValueToFNumber(2)).toBe(2);
    expect(convertApertureValueToFNumber(5)).toBe(5.6);
    expect(convertApertureValueToFNumber(8)).toBe(16);
    expect(convertApertureValueToFNumber(10)).toBe(32);
  });

  it('computes non-integer apertures via formula', () => {
    expect(convertApertureValueToFNumber(4.5)).toBeCloseTo(4.8, 1);
    expect(convertApertureValueToFNumber(2.97)).toBeCloseTo(2.8, 1);
  });

  it('accepts strings', () => {
    expect(convertApertureValueToFNumber('4')).toBe(4);
  });

  it('returns undefined for invalid input', () => {
    expect(convertApertureValueToFNumber(undefined)).toBeUndefined();
    expect(convertApertureValueToFNumber('not-a-number')).toBeUndefined();
  });
});

describe('getDimensionsFromExif', () => {
  const makeExif = (orientation: number, w?: number, h?: number): ExifData =>
    ({
      tags: { Orientation: orientation } as ExifData['tags'],
      imageSize: w && h ? { width: w, height: h } : undefined,
    }) as ExifData;

  it('returns straight dimensions for normal orientation', () => {
    const d = getDimensionsFromExif(makeExif(OrientationTypes.TOP_LEFT, 4000, 3000), undefined);
    expect(d).toEqual({ width: 4000, height: 3000, aspectRatio: 4000 / 3000 });
  });

  it('swaps dimensions when orientation is rotated 90deg', () => {
    const d = getDimensionsFromExif(makeExif(OrientationTypes.RIGHT_TOP, 4000, 3000), undefined);
    expect(d).toEqual({ width: 3000, height: 4000, aspectRatio: 3000 / 4000 });
  });

  it('falls back to exifr dimensions', () => {
    const exif = { tags: { Orientation: OrientationTypes.TOP_LEFT } } as ExifData;
    const d = getDimensionsFromExif(exif, { ImageWidth: 2000, ImageHeight: 1000 });
    expect(d).toEqual({ width: 2000, height: 1000, aspectRatio: 2 });
  });

  it('returns default aspect ratio when nothing is available', () => {
    const exif = { tags: { Orientation: OrientationTypes.TOP_LEFT } } as ExifData;
    expect(getDimensionsFromExif(exif, undefined).aspectRatio).toBe(1.5);
  });
});

describe('getOffsetFromExif', () => {
  it('finds offset string in exif tags', () => {
    const exif = { tags: { OffsetTimeOriginal: '-05:00', Make: 'FUJIFILM' } } as unknown as ExifData;
    expect(getOffsetFromExif(exif, undefined)).toBe('-05:00');
  });

  it('falls back to exifr', () => {
    const exif = { tags: {} } as ExifData;
    expect(getOffsetFromExif(exif, { OffsetTime: '+01:00' })).toBe('+01:00');
  });

  it('returns undefined when no offset present', () => {
    const exif = { tags: { Make: 'FUJIFILM' } } as unknown as ExifData;
    expect(getOffsetFromExif(exif, { ImageWidth: 4000 })).toBeUndefined();
  });
});

describe('parseTakenAt', () => {
  it('parses EXIF-format date string with offset', () => {
    const { takenAt, takenAtNaive } = parseTakenAt('2024:08:15 14:30:00', '-04:00');
    expect(takenAtNaive).toBe('2024-08-15T14:30:00');
    expect(takenAt?.toISOString()).toBe('2024-08-15T18:30:00.000Z');
  });

  it('assumes UTC when no offset provided', () => {
    const { takenAt } = parseTakenAt('2024:08:15 14:30:00');
    expect(takenAt?.toISOString()).toBe('2024-08-15T14:30:00.000Z');
  });

  it('accepts Date instance', () => {
    const d = new Date('2024-08-15T14:30:00Z');
    const { takenAt, takenAtNaive } = parseTakenAt(d);
    expect(takenAtNaive).toBe('2024-08-15T14:30:00');
    expect(takenAt?.toISOString()).toBe('2024-08-15T14:30:00.000Z');
  });

  it('returns empty object for undefined input', () => {
    expect(parseTakenAt(undefined)).toEqual({});
  });

  it('returns empty object for malformed string', () => {
    expect(parseTakenAt('garbage')).toEqual({});
  });
});
