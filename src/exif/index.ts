import { ExifParserFactory, type ExifData } from 'ts-exif-parser';
import exifr from 'exifr';
import {
  convertApertureValueToFNumber,
  getDimensionsFromExif,
  getExifValue,
  getOffsetFromExif,
  parseTakenAt,
} from './helpers';
import {
  FujifilmRecipe,
  FujifilmSimulation,
  getFujifilmRecipe,
  getFujifilmSimulation,
  isFujifilmExif,
} from './fujifilm';
import {
  NikonPictureControl,
  getNikonPictureControl,
  isNikonExif,
} from './nikon';

export interface ExtractedExif {
  width?: number;
  height?: number;
  aspectRatio: number;
  title?: string;
  caption?: string;
  tags?: string[];
  make?: string;
  model?: string;
  lensMake?: string;
  lensModel?: string;
  focalLength?: number;
  focalLengthIn35mmFormat?: number;
  fNumber?: number;
  iso?: number;
  exposureTime?: number;
  exposureCompensation?: number;
  latitude?: number;
  longitude?: number;
  takenAt?: Date;
  takenAtNaive?: string;
  film?: FujifilmSimulation | NikonPictureControl | string;
  recipeData?: FujifilmRecipe;
}

const asNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : undefined;
};

const asString = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
};

export const extractExif = async (bytes: Buffer | ArrayBuffer): Promise<ExtractedExif> => {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);

  const parser = ExifParserFactory.create(buffer);
  parser.enableBinaryFields(false);

  let exif: ExifData;
  try {
    exif = parser.parse();
  } catch {
    // The legacy parser is JPEG-focused. Still let exifr read other containers.
    exif = { tags: {} } as ExifData;
  }

  const exifrData = (await exifr
    .parse(buffer, { xmp: true })
    .catch(() => undefined)) as Record<string, unknown> | undefined;

  let film: ExtractedExif['film'];
  let recipeData: FujifilmRecipe | undefined;

  if (isFujifilmExif(exif) || isNikonExif(exif)) {
    try {
      parser.enableBinaryFields(true);
      const exifBinary = parser.parse();
      const makerNote = exifBinary.tags?.MakerNote;
      if (Buffer.isBuffer(makerNote)) {
        if (isFujifilmExif(exif)) {
          film = getFujifilmSimulation(makerNote);
          recipeData = getFujifilmRecipe(makerNote);
        } else if (isNikonExif(exif)) {
          film = getNikonPictureControl(makerNote);
        }
      }
    } catch {
      // fall through — film/recipe simply stay undefined
    }
  }

  const get = (key: Parameters<typeof getExifValue>[0], exifrKey?: string) =>
    getExifValue(key, exif, exifrData, exifrKey);

  const title = asString(
    (exifrData?.title as { value?: string } | undefined)?.value,
  );
  const description = asString(
    (exif.tags as Record<string, unknown> | undefined)?.ImageDescription ??
      exifrData?.ImageDescription ??
      (exifrData?.description as { value?: string } | undefined)?.value,
  );

  const { width, height, aspectRatio } = getDimensionsFromExif(exif, exifrData);
  const offset = getOffsetFromExif(exif, exifrData);
  const { takenAt, takenAtNaive } = parseTakenAt(
    get('DateTimeOriginal') as Date | string | undefined,
    offset,
  );

  const fNumber =
    asNumber(get('FNumber')) ??
    convertApertureValueToFNumber(get('ApertureValue') as string | number | undefined);

  const iso = asNumber(get('ISO')) ?? asNumber(get('ISOSpeed'));

  const tags = Array.isArray(exifrData?.subject)
    ? (exifrData!.subject as unknown[]).map(String)
    : undefined;

  return {
    width,
    height,
    aspectRatio,
    title: title && title !== description ? title : description,
    caption: title && title !== description ? description : undefined,
    tags,
    make: asString(get('Make')),
    model: asString(get('Model')),
    lensMake: asString(get('LensMake')),
    lensModel: asString(get('LensModel')),
    focalLength: asNumber(get('FocalLength')),
    focalLengthIn35mmFormat: asNumber(get('FocalLengthIn35mmFormat')),
    fNumber,
    iso,
    exposureTime: asNumber(get('ExposureTime')),
    exposureCompensation: asNumber(get('ExposureCompensation')),
    latitude: asNumber(get('GPSLatitude', 'latitude')),
    longitude: asNumber(get('GPSLongitude', 'longitude')),
    takenAt,
    takenAtNaive,
    film,
    recipeData,
  };
};

export type { FujifilmRecipe, FujifilmSimulation } from './fujifilm';
export type { NikonPictureControl } from './nikon';
