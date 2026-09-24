import { OrientationTypes, type ExifData, type ExifTags } from 'ts-exif-parser';

export const DEFAULT_ASPECT_RATIO = 1.5;

export const getExifValue = (
  key: keyof ExifTags,
  exif: ExifData,
  exifr: Record<string, unknown> | undefined,
  exifrKey?: string,
) =>
  (exif.tags as Record<string, unknown> | undefined)?.[key] ??
  exifr?.[exifrKey ?? key];

const isOffsetString = (value: unknown): value is string =>
  typeof value === 'string' && /^[+-]\d\d:\d\d$/.test(value);

// The offset recorded with the capture time comes first; OffsetTime belongs to
// the file's modification time and can differ after an edit on another continent.
const OFFSET_KEYS = ['OffsetTimeOriginal', 'OffsetTimeDigitized', 'OffsetTime'] as const;

export const getOffsetFromExif = (
  exif: ExifData,
  exifr: Record<string, unknown> | undefined,
): string | undefined => {
  const tags = (exif.tags ?? {}) as Record<string, unknown>;
  for (const key of OFFSET_KEYS) {
    const value = tags[key] ?? exifr?.[key];
    if (isOffsetString(value)) return value;
  }
  // Some makers store the offset under their own tag names.
  return (Object.values(tags).find(isOffsetString) ??
    Object.values(exifr ?? {}).find(isOffsetString)) as string | undefined;
};

const pad = (value: number) => String(value).padStart(2, '0');

export interface Dimensions {
  width?: number;
  height?: number;
  aspectRatio: number;
}

export const getDimensionsFromExif = (
  exif: ExifData,
  exifr: Record<string, unknown> | undefined,
): Dimensions => {
  const orientation = exif.tags?.Orientation || OrientationTypes.TOP_LEFT;
  const exifWidth = exif.imageSize?.width;
  const exifHeight = exif.imageSize?.height;
  const exifrWidth = exifr?.ImageWidth as number | undefined;
  const exifrHeight = exifr?.ImageHeight as number | undefined;

  let width: number | undefined;
  let height: number | undefined;

  switch (orientation) {
    case OrientationTypes.RIGHT_TOP:
    case OrientationTypes.LEFT_BOTTOM:
      width = exifHeight ?? exifrHeight;
      height = exifWidth ?? exifrWidth;
      break;
    default:
      width = exifWidth ?? exifrWidth;
      height = exifHeight ?? exifrHeight;
  }

  const aspectRatio = width && height ? width / height : DEFAULT_ASPECT_RATIO;
  return { width, height, aspectRatio };
};

export const convertApertureValueToFNumber = (
  apertureValue?: string | number,
): number | undefined => {
  if (apertureValue === undefined || apertureValue === null) return undefined;
  const n = typeof apertureValue === 'string' ? parseFloat(apertureValue) : apertureValue;
  if (!Number.isFinite(n)) return undefined;

  const lookup: Record<number, number> = {
    0: 1, 1: 1.4, 2: 2, 3: 2.8, 4: 4, 5: 5.6, 6: 8, 7: 11, 8: 16, 9: 22, 10: 32,
  };
  if (Number.isInteger(n) && n in lookup) return lookup[n];

  const v = Math.round(Math.pow(2, n / 2) * 10) / 10;
  return Number.isFinite(v) ? v : undefined;
};

export const parseTakenAt = (
  dateTimeOriginal?: Date | string | number,
  offset?: string,
): { takenAt?: Date; takenAtNaive?: string } => {
  if (dateTimeOriginal === undefined || dateTimeOriginal === null) return {};

  let iso: string | undefined;
  if (dateTimeOriginal instanceof Date) {
    // exifr revives EXIF's zone-less timestamps as local time, so read them back
    // with local getters; toISOString() would shift them by the server's offset.
    const d = dateTimeOriginal;
    if (!isNaN(d.getTime())) {
      iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  } else if (typeof dateTimeOriginal === 'number') {
    const d = new Date(dateTimeOriginal * (dateTimeOriginal < 1e12 ? 1000 : 1));
    if (!isNaN(d.getTime())) {
      iso = d.toISOString().replace(/\.\d{3}Z$/, '');
    }
  } else if (typeof dateTimeOriginal === 'string') {
    iso = normalizeExifDate(dateTimeOriginal);
  }

  if (!iso) return {};

  const takenAt = offset
    ? new Date(`${iso}${offset}`)
    : new Date(`${iso}Z`);

  return {
    takenAt: isNaN(takenAt.getTime()) ? undefined : takenAt,
    takenAtNaive: iso,
  };
};

const normalizeExifDate = (raw: string): string | undefined => {
  const match = raw.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return undefined;
  const [, y, m, d, h, mi, s] = match;
  return `${y}-${m}-${d}T${h}:${mi}:${s}`;
};
