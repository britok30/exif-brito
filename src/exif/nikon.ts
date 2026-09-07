import type { ExifData } from 'ts-exif-parser';

export const NIKON_MAKE = 'NIKON CORPORATION';

export const isNikonExif = (exif: ExifData) =>
  exif.tags?.Make?.toUpperCase() === NIKON_MAKE;

// --- MakerNote parser ---
// Nikon MakerNote format:
//   bytes 0..4  : "Nikon" ASCII signature
//   bytes 5..9  : version + padding (skipped)
//   bytes 10..17: TIFF header — endian marker (II=LE, MM=BE) + magic + ifdOffset
//   bytes 10+ifdOffset..: IFD entries (12 bytes each) preceded by 2-byte count

type NikonTagValue = string | Buffer;
type NikonTagVisitor = (tagId: number, value: NikonTagValue) => void;

export const parseNikonMakerNote = (bytes: Buffer, visit: NikonTagVisitor) => {
  if (bytes.length < 18 || bytes.toString('ascii', 0, 5) !== 'Nikon') return;

  const tiffStart = 10;
  const isLE = bytes.toString('hex', tiffStart, tiffStart + 2) === '4949';

  const readUInt16 = (o: number) =>
    isLE ? bytes.readUInt16LE(o) : bytes.readUInt16BE(o);
  const readUInt32 = (o: number) =>
    isLE ? bytes.readUInt32LE(o) : bytes.readUInt32BE(o);

  const ifdOffset = readUInt32(tiffStart + 4);
  let cursor = tiffStart + ifdOffset;
  if (cursor + 2 > bytes.length) return;

  const tagCount = readUInt16(cursor);
  cursor += 2;

  for (let i = 0; i < tagCount; i++) {
    if (cursor + 12 > bytes.length) break;

    const tagId = readUInt16(cursor);
    const type = readUInt16(cursor + 2);
    const count = readUInt32(cursor + 4);
    const valueField = cursor + 8;

    // Only ASCII (2) and Undefined (7) are interesting for Picture Control
    if (type === 2 || type === 7) {
      const dataOffset = count > 4 ? tiffStart + readUInt32(valueField) : valueField;
      if (dataOffset + count <= bytes.length) {
        const slice = bytes.subarray(dataOffset, dataOffset + count);
        visit(tagId, type === 2 ? slice.toString('ascii', 0, count - 1) : slice);
      }
    }

    cursor += 12;
  }
};

// --- Picture Control extraction ---

const TAG_ID_PICTURE_CONTROL_DATA = 0x0023;
const PICTURE_CONTROL_NAME_OFFSET = 8;
const PICTURE_CONTROL_NAME_LENGTH = 20;

export const NIKON_PICTURE_CONTROLS = [
  'auto', 'standard', 'neutral', 'vivid', 'monochrome',
  'portrait', 'landscape', 'flat',
  'rich-tone-portrait', 'deep-tone-monochrome', 'flat-monochrome',
  'dream', 'morning', 'pop', 'sunday', 'somber', 'dramatic',
  'silence', 'bleached', 'melancholic', 'pure', 'denim',
  'toy', 'sepia', 'blue', 'red', 'pink',
  'charcoal', 'graphite', 'binary', 'carbon',
] as const;

export type NikonPictureControl = (typeof NIKON_PICTURE_CONTROLS)[number];

const normalize = (raw: string) =>
  raw.replace(/\0/g, '').trim().toLowerCase().replace(/\s+/g, '-');

export const getNikonPictureControl = (
  makerNote: Buffer,
): NikonPictureControl | string | undefined => {
  let result: string | undefined;

  parseNikonMakerNote(makerNote, (tagId, value) => {
    if (tagId !== TAG_ID_PICTURE_CONTROL_DATA) return;
    if (!Buffer.isBuffer(value)) return;
    if (value.length < PICTURE_CONTROL_NAME_OFFSET + PICTURE_CONTROL_NAME_LENGTH) return;

    const raw = value.toString(
      'ascii',
      PICTURE_CONTROL_NAME_OFFSET,
      PICTURE_CONTROL_NAME_OFFSET + PICTURE_CONTROL_NAME_LENGTH,
    );
    const normalized = normalize(raw);
    if (normalized) result = normalized;
  });

  return result;
};
