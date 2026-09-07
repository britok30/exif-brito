import { describe, it, expect } from 'vitest';
import {
  FujifilmRecipe,
  getFujifilmRecipe,
  getFujifilmSimulation,
  isFujifilmExif,
  processClarity,
  processDynamicRangeSetting,
  processGrainSize,
  processNoiseReduction,
  processSaturation,
  processSharpness,
  processTone,
  processWeakStrong,
  processWhiteBalanceComponent,
  processWhiteBalanceType,
} from './fujifilm';
import type { ExifData } from 'ts-exif-parser';

interface Tag {
  id: number;
  type: 1 | 3 | 4 | 9;
  values: number[];
}

const buildMakerNote = (tags: Tag[]): Buffer => {
  const HEADER = 14;
  const BYTES_PER_TAG = 12;
  const buf = Buffer.alloc(HEADER + tags.length * BYTES_PER_TAG);
  buf.writeUInt16LE(tags.length, 12);

  tags.forEach((tag, i) => {
    const index = HEADER + i * BYTES_PER_TAG;
    buf.writeUInt16LE(tag.id, index);
    buf.writeUInt16LE(tag.type, index + 2);
    buf.writeUInt16LE(tag.values.length, index + 4);
    tag.values.forEach((v, j) => {
      if (tag.type === 3) buf.writeUInt16LE(v, index + 8 + j * 2);
      else if (tag.type === 4) buf.writeUInt32LE(v, index + 8 + j * 4);
      else if (tag.type === 9) buf.writeInt32LE(v, index + 8 + j * 4);
      else if (tag.type === 1) buf.writeInt8(v, index + 8 + j);
    });
  });

  return buf;
};

describe('isFujifilmExif', () => {
  it('matches FUJIFILM make case-insensitively', () => {
    expect(isFujifilmExif({ tags: { Make: 'FUJIFILM' } } as ExifData)).toBe(true);
    expect(isFujifilmExif({ tags: { Make: 'fujifilm' } } as ExifData)).toBe(true);
  });

  it('rejects other makes', () => {
    expect(isFujifilmExif({ tags: { Make: 'NIKON' } } as ExifData)).toBe(false);
    expect(isFujifilmExif({ tags: {} } as ExifData)).toBe(false);
  });
});

describe('getFujifilmSimulation (synthetic MakerNote)', () => {
  it('reads classic chrome from FilmMode tag', () => {
    const note = buildMakerNote([{ id: 0x1401, type: 3, values: [0x600] }]);
    expect(getFujifilmSimulation(note)).toBe('classic-chrome');
  });

  it('reads acros from Saturation tag and prefers it over FilmMode', () => {
    const note = buildMakerNote([
      { id: 0x1003, type: 3, values: [0x500] },
      { id: 0x1401, type: 3, values: [0x000] },
    ]);
    expect(getFujifilmSimulation(note)).toBe('acros');
  });

  it('returns undefined when no recognized tag is present', () => {
    const note = buildMakerNote([{ id: 0x9999, type: 3, values: [0] }]);
    expect(getFujifilmSimulation(note)).toBeUndefined();
  });
});

describe('getFujifilmRecipe (synthetic MakerNote)', () => {
  it('returns all defaults when no tags present', () => {
    const note = buildMakerNote([]);
    const recipe = getFujifilmRecipe(note);
    expect(recipe.dynamicRange).toEqual({ range: 'standard', setting: 'auto', development: 100 });
    expect(recipe.whiteBalance).toEqual({ type: 'auto', red: 0, blue: 0 });
    expect(recipe.grainEffect).toEqual({ roughness: 'off', size: 'off' });
  });

  it('applies multiple tags', () => {
    const note = buildMakerNote([
      { id: 0x1400, type: 3, values: [3] },            // wide dynamic range
      { id: 0x1402, type: 3, values: [0x100] },        // standard setting
      { id: 0x1041, type: 3, values: [0xffe0] },       // highlight: raw -32 as uint16
      { id: 0x1001, type: 3, values: [0x4] },          // sharpness +2
      { id: 0x1002, type: 3, values: [0x100] },        // WB daylight
      { id: 0x100a, type: 3, values: [40, 20] },       // WB red=2, blue=1
      { id: 0x1048, type: 3, values: [32] },           // chrome effect weak
      { id: 0x1047, type: 3, values: [64] },           // grain rough strong
      { id: 0x104c, type: 3, values: [16] },           // grain small
    ]);
    const r = getFujifilmRecipe(note);
    expect(r.dynamicRange.range).toBe('wide');
    expect(r.dynamicRange.setting).toBe('standard');
    expect(r.highlight).toBe(-(0xffe0 / 16)); // parser reads raw uint16, processTone negates /16
    expect(r.sharpness).toBe(2);
    expect(r.whiteBalance.type).toBe('daylight');
    expect(r.whiteBalance.red).toBe(2);
    expect(r.whiteBalance.blue).toBe(1);
    expect(r.colorChromeEffect).toBe('weak');
    expect(r.grainEffect).toEqual<FujifilmRecipe['grainEffect']>({ roughness: 'strong', size: 'small' });
  });
});

describe('pure processors', () => {
  it('processTone', () => {
    expect(processTone(0)).toBe(0);
    expect(processTone(16)).toBe(-1);
    expect(processTone(-32)).toBe(2);
  });

  it('processSaturation known values', () => {
    expect(processSaturation(0x400)).toBe(-2);
    expect(processSaturation(0x80)).toBe(1);
    expect(processSaturation(0x999)).toBe(0);
  });

  it('processNoiseReduction', () => {
    expect(processNoiseReduction(0x200)).toBe(-2);
    expect(processNoiseReduction(0x1e0)).toBe(4);
    expect(processNoiseReduction(0x0)).toBe(0);
  });

  it('processSharpness', () => {
    expect(processSharpness(0x0)).toBe(-4);
    expect(processSharpness(0x84)).toBe(1);
    expect(processSharpness(0x99)).toBe(0);
  });

  it('processClarity divides by 1000', () => {
    expect(processClarity(2000)).toBe(2);
    expect(processClarity(-1000)).toBe(-1);
  });

  it('processWeakStrong', () => {
    expect(processWeakStrong(0)).toBe('off');
    expect(processWeakStrong(32)).toBe('weak');
    expect(processWeakStrong(64)).toBe('strong');
  });

  it('processGrainSize', () => {
    expect(processGrainSize(0)).toBe('off');
    expect(processGrainSize(16)).toBe('small');
    expect(processGrainSize(32)).toBe('large');
  });

  it('processWhiteBalanceType', () => {
    expect(processWhiteBalanceType(0x100)).toBe('daylight');
    expect(processWhiteBalanceType(0xff0)).toBe('kelvin');
    expect(processWhiteBalanceType(0xdeadbeef)).toBe('auto');
  });

  it('processDynamicRangeSetting', () => {
    expect(processDynamicRangeSetting(0x001)).toBe('manual');
    expect(processDynamicRangeSetting(0x200)).toBe('wide-1');
    expect(processDynamicRangeSetting(0x8000)).toBe('film-simulation');
    expect(processDynamicRangeSetting(0xdead)).toBe('auto');
  });

  it('processWhiteBalanceComponent divides by 20', () => {
    expect(processWhiteBalanceComponent(40)).toBe(2);
    expect(processWhiteBalanceComponent(-20)).toBe(-1);
  });
});
