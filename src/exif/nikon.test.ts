import { describe, it, expect, vi } from 'vitest';
import {
  getNikonPictureControl,
  isNikonExif,
  parseNikonMakerNote,
} from './nikon';
import type { ExifData } from 'ts-exif-parser';

interface PictureControlFixture {
  name: string;
  tagId?: number;
  endian?: 'LE' | 'BE';
}

// Builds a minimally valid Nikon MakerNote with a single PictureControlData tag.
// Data block layout (108 bytes, matching Nikon spec):
//   0..3  : version
//   4..7  : version
//   8..27 : picture control name (20 bytes, null-padded)
//   28+   : remaining fields (unused here)
const buildNikonMakerNote = ({
  name,
  tagId = 0x0023,
  endian = 'LE',
}: PictureControlFixture): Buffer => {
  const isLE = endian === 'LE';
  const u16 = (n: number) => {
    const b = Buffer.alloc(2);
    isLE ? b.writeUInt16LE(n, 0) : b.writeUInt16BE(n, 0);
    return b;
  };
  const u32 = (n: number) => {
    const b = Buffer.alloc(4);
    isLE ? b.writeUInt32LE(n, 0) : b.writeUInt32BE(n, 0);
    return b;
  };

  const header = Buffer.concat([
    Buffer.from('Nikon\x00', 'ascii'),
    Buffer.from([0x02, 0x10, 0x00, 0x00]), // version + padding (10 bytes total)
  ]);

  const tiffHeader = Buffer.concat([
    Buffer.from(isLE ? [0x49, 0x49] : [0x4d, 0x4d]), // endian marker
    isLE ? Buffer.from([0x2a, 0x00]) : Buffer.from([0x00, 0x2a]), // magic 42
    u32(8), // ifdOffset relative to tiffStart → IFD starts at 10+8=18
  ]);

  const tagEntry = Buffer.concat([
    u16(tagId),
    u16(7),            // type: undefined
    u32(108),          // count: 108-byte picture control block
    u32(22),           // offset relative to tiffStart (10+22 = 32, right after IFD)
  ]);

  const ifd = Buffer.concat([u16(1), tagEntry]);

  const data = Buffer.alloc(108);
  data.write(name, 8, 'ascii');

  return Buffer.concat([header, tiffHeader, ifd, data]);
};

describe('isNikonExif', () => {
  it('matches NIKON CORPORATION case-insensitively', () => {
    expect(isNikonExif({ tags: { Make: 'NIKON CORPORATION' } } as ExifData)).toBe(true);
    expect(isNikonExif({ tags: { Make: 'Nikon Corporation' } } as ExifData)).toBe(true);
  });

  it('rejects non-Nikon makes', () => {
    expect(isNikonExif({ tags: { Make: 'FUJIFILM' } } as ExifData)).toBe(false);
    expect(isNikonExif({ tags: {} } as ExifData)).toBe(false);
  });
});

describe('parseNikonMakerNote', () => {
  it('visits tags in little-endian maker notes', () => {
    const note = buildNikonMakerNote({ name: 'STANDARD\0', endian: 'LE' });
    const seen: number[] = [];
    parseNikonMakerNote(note, tagId => seen.push(tagId));
    expect(seen).toEqual([0x0023]);
  });

  it('visits tags in big-endian maker notes', () => {
    const note = buildNikonMakerNote({ name: 'STANDARD\0', endian: 'BE' });
    const seen: number[] = [];
    parseNikonMakerNote(note, tagId => seen.push(tagId));
    expect(seen).toEqual([0x0023]);
  });

  it('silently returns on non-Nikon signature', () => {
    const note = Buffer.from('Canon\x00\x02\x00\x00\x00\x49\x49\x2A\x00', 'ascii');
    const visitor = vi.fn();
    parseNikonMakerNote(note, visitor);
    expect(visitor).not.toHaveBeenCalled();
  });

  it('silently returns on undersized buffer', () => {
    const visitor = vi.fn();
    parseNikonMakerNote(Buffer.from('Nikon'), visitor);
    expect(visitor).not.toHaveBeenCalled();
  });
});

describe('getNikonPictureControl', () => {
  it('extracts standard picture control from canonical buffer', () => {
    const note = buildNikonMakerNote({ name: 'STANDARD\0' });
    expect(getNikonPictureControl(note)).toBe('standard');
  });

  it('normalizes whitespace in multi-word names', () => {
    const note = buildNikonMakerNote({ name: 'RICH TONE PORTRAIT\0' });
    expect(getNikonPictureControl(note)).toBe('rich-tone-portrait');
  });

  it('trims null bytes and whitespace', () => {
    const note = buildNikonMakerNote({ name: 'VIVID   \0\0\0' });
    expect(getNikonPictureControl(note)).toBe('vivid');
  });

  it('returns undefined when picture control tag is absent', () => {
    const note = buildNikonMakerNote({ name: 'STANDARD\0', tagId: 0xaaaa });
    expect(getNikonPictureControl(note)).toBeUndefined();
  });

  it('returns undefined for non-Nikon signature', () => {
    expect(getNikonPictureControl(Buffer.from('bogus'))).toBeUndefined();
  });
});
