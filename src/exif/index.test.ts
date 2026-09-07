import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { extractExif, type ExtractedExif } from './index';

const fixture = (name: string) =>
  path.join(__dirname, '__fixtures__', name);

const load = (name: string) => readFileSync(fixture(name));

describe.runIf(existsSync(fixture('fuji.JPG')))('extractExif: Fuji X100VI fixture', () => {
  let exif: ExtractedExif;
  beforeAll(async () => {
    exif = await extractExif(load('fuji.JPG'));
  });

  it('extracts camera identity', () => {
    expect(exif.make).toBe('FUJIFILM');
    expect(exif.model).toBe('X100VI');
  });

  it('extracts exposure metadata', () => {
    expect(exif.focalLength).toBe(23);
    expect(exif.fNumber).toBe(2);
    expect(exif.iso).toBe(1250);
    expect(exif.exposureTime).toBeCloseTo(1 / 34, 3);
    expect(exif.exposureCompensation).toBe(-1);
  });

  it('extracts dimensions', () => {
    expect(exif.width).toBe(7728);
    expect(exif.height).toBe(5152);
    expect(exif.aspectRatio).toBeCloseTo(1.5, 3);
  });

  it('extracts GPS', () => {
    expect(exif.latitude).toBeCloseTo(25.78, 1);
    expect(exif.longitude).toBeCloseTo(-80.19, 1);
  });

  it('extracts taken-at timestamp', () => {
    expect(exif.takenAt).toBeInstanceOf(Date);
    expect(exif.takenAtNaive).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });

  it('extracts Fujifilm film simulation', () => {
    expect(exif.film).toBe('classic-chrome');
  });

  it('extracts Fujifilm recipe', () => {
    expect(exif.recipeData).toBeDefined();
    expect(exif.recipeData?.whiteBalance.red).toBe(3);
    expect(exif.recipeData?.whiteBalance.blue).toBe(-5);
    expect(exif.recipeData?.color).toBe(2);
    expect(exif.recipeData?.sharpness).toBe(-2);
    expect(exif.recipeData?.colorChromeEffect).toBe('strong');
    expect(exif.recipeData?.grainEffect).toEqual({ roughness: 'strong', size: 'small' });
  });
});

describe.runIf(existsSync(fixture('leica.JPG')))('extractExif: Leica Q2 fixture', () => {
  let exif: ExtractedExif;
  beforeAll(async () => {
    exif = await extractExif(load('leica.JPG'));
  });

  it('extracts camera identity', () => {
    expect(exif.make).toBe('LEICA CAMERA AG');
    expect(exif.model).toBe('LEICA Q2');
  });

  it('extracts lens', () => {
    expect(exif.lensModel).toContain('SUMMILUX');
  });

  it('extracts exposure metadata', () => {
    expect(exif.focalLength).toBe(28);
    expect(exif.focalLengthIn35mmFormat).toBe(28);
    expect(exif.fNumber).toBeCloseTo(1.7, 1);
    expect(exif.iso).toBe(4000);
    expect(exif.exposureTime).toBeCloseTo(0.02, 3);
  });

  it('extracts dimensions', () => {
    expect(exif.width).toBe(8368);
    expect(exif.height).toBe(5584);
  });

  it('does not attach film simulation or recipe for non-Fuji camera', () => {
    expect(exif.film).toBeUndefined();
    expect(exif.recipeData).toBeUndefined();
  });
});

describe.runIf(existsSync(fixture('iphone12.JPG')))('extractExif: iPhone 12 Pro Max fixture', () => {
  let exif: ExtractedExif;
  beforeAll(async () => {
    exif = await extractExif(load('iphone12.JPG'));
  });

  it('extracts Apple camera identity', () => {
    expect(exif.make).toBe('Apple');
    expect(exif.model).toBe('iPhone 12 Pro Max');
    expect(exif.lensMake).toBe('Apple');
    expect(exif.lensModel).toContain('iPhone 12 Pro Max');
    expect(exif.lensModel).toMatch(/f\/1\.6/);
  });

  it('extracts portrait-orientation dimensions', () => {
    expect(exif.width).toBe(3024);
    expect(exif.height).toBe(4032);
    expect(exif.aspectRatio).toBeCloseTo(0.75, 2);
  });

  it('extracts exposure metadata', () => {
    expect(exif.focalLength).toBeCloseTo(5.1, 1);
    expect(exif.focalLengthIn35mmFormat).toBe(26);
    expect(exif.fNumber).toBeCloseTo(1.6, 1);
    expect(exif.iso).toBe(32);
  });

  it('extracts GPS', () => {
    expect(exif.latitude).toBeCloseTo(38.72, 1);
    expect(exif.longitude).toBeCloseTo(-9.13, 1);
  });

  it('does not attach film simulation or recipe', () => {
    expect(exif.film).toBeUndefined();
    expect(exif.recipeData).toBeUndefined();
  });
});

describe.runIf(existsSync(fixture('iphone15.JPG')))('extractExif: iPhone 15 Pro Max fixture', () => {
  let exif: ExtractedExif;
  beforeAll(async () => {
    exif = await extractExif(load('iphone15.JPG'));
  });

  it('extracts Apple camera identity', () => {
    expect(exif.make).toBe('Apple');
    expect(exif.model).toBe('iPhone 15 Pro Max');
    expect(exif.lensMake).toBe('Apple');
    expect(exif.lensModel).toContain('iPhone 15 Pro Max');
    expect(exif.lensModel).toMatch(/f\/1\.78/);
  });

  it('extracts portrait-orientation dimensions', () => {
    expect(exif.width).toBe(6048);
    expect(exif.height).toBe(8064);
    expect(exif.aspectRatio).toBeCloseTo(0.75, 2);
  });

  it('extracts exposure metadata', () => {
    expect(exif.focalLength).toBeCloseTo(6.77, 1);
    expect(exif.focalLengthIn35mmFormat).toBe(24);
    expect(exif.fNumber).toBeCloseTo(1.8, 1);
    expect(exif.iso).toBe(800);
  });

  it('does not attach film simulation or recipe', () => {
    expect(exif.film).toBeUndefined();
    expect(exif.recipeData).toBeUndefined();
  });
});

describe.runIf(existsSync(fixture('nikon.JPG')))('extractExif: Nikon Z 8 fixture (Lightroom export)', () => {
  let exif: ExtractedExif;
  beforeAll(async () => {
    exif = await extractExif(load('nikon.JPG'));
  });

  it('extracts Nikon camera identity', () => {
    expect(exif.make).toBe('NIKON CORPORATION');
    expect(exif.model).toBe('NIKON Z 8');
  });

  it('extracts native Z-mount lens metadata', () => {
    expect(exif.lensMake).toBe('NIKON');
    expect(exif.lensModel).toContain('NIKKOR Z');
  });

  it('extracts exposure metadata', () => {
    expect(exif.focalLength).toBe(70);
    expect(exif.focalLengthIn35mmFormat).toBe(70);
    expect(exif.fNumber).toBeCloseTo(2.8, 1);
    expect(exif.iso).toBe(12800);
  });

  it('extracts dimensions', () => {
    expect(exif.width).toBe(8256);
    expect(exif.height).toBe(5504);
    expect(exif.aspectRatio).toBeCloseTo(1.5, 3);
  });

  it('does not attach picture control (Lightroom strips Nikon MakerNote on export)', () => {
    expect(exif.film).toBeUndefined();
    expect(exif.recipeData).toBeUndefined();
  });
});

describe('extractExif: empty / invalid input', () => {
  it('returns default shape without throwing on non-image buffer', async () => {
    const exif = await extractExif(Buffer.from('not an image'));
    expect(exif.aspectRatio).toBe(1.5);
    expect(exif.make).toBeUndefined();
    expect(exif.film).toBeUndefined();
  });
});
