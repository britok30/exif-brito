import exifr from 'exifr';
import { getFujifilmSimulation, type FujifilmSimulation } from './fujifilm';

export interface ClientExif {
  width?: number;
  height?: number;
  aspectRatio: number;
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
  title?: string;
  caption?: string;
  tags?: string[];
  film?: FujifilmSimulation;
}

const asNumber = (v: unknown): number | undefined => {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
};

const asString = (v: unknown): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
};

export async function extractClientExif(file: File): Promise<ClientExif> {
  let raw: Record<string, unknown> | undefined;
  try {
    raw = (await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      xmp: true,
      makerNote: true,
    })) as Record<string, unknown> | undefined;
  } catch {
    raw = undefined;
  }

  const r = raw ?? {};
  const width = asNumber(r.ExifImageWidth ?? r.ImageWidth);
  const height = asNumber(r.ExifImageHeight ?? r.ImageHeight);
  const aspectRatio = width && height ? width / height : 1.5;

  const titleField = (r.title as { value?: string } | undefined)?.value;
  const descriptionField =
    (r.description as { value?: string } | undefined)?.value ??
    (r.ImageDescription as string | undefined);

  const tagsRaw = r.subject;
  const tags = Array.isArray(tagsRaw) ? tagsRaw.map(String) : undefined;

  const takenAtRaw = r.DateTimeOriginal ?? r.CreateDate ?? r.ModifyDate;
  const takenAt =
    takenAtRaw instanceof Date
      ? takenAtRaw
      : typeof takenAtRaw === 'string'
        ? new Date(takenAtRaw.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'))
        : undefined;

  let film: FujifilmSimulation | undefined;
  const make = asString(r.Make);
  if (make?.toUpperCase() === 'FUJIFILM') {
    const makerNoteRaw = r.makerNote ?? r.MakerNote;
    let bytes: Uint8Array | undefined;
    if (makerNoteRaw instanceof Uint8Array) {
      bytes = makerNoteRaw;
    } else if (makerNoteRaw instanceof ArrayBuffer) {
      bytes = new Uint8Array(makerNoteRaw);
    }
    if (bytes) {
      try {
        film = getFujifilmSimulation(bytes);
      } catch {
        film = undefined;
      }
    }
  }

  return {
    width,
    height,
    aspectRatio,
    make: asString(r.Make),
    model: asString(r.Model),
    lensMake: asString(r.LensMake),
    lensModel: asString(r.LensModel),
    focalLength: asNumber(r.FocalLength),
    focalLengthIn35mmFormat: asNumber(r.FocalLengthIn35mmFormat),
    fNumber: asNumber(r.FNumber ?? r.ApertureValue),
    iso: asNumber(r.ISO ?? r.ISOSpeedRatings),
    exposureTime: asNumber(r.ExposureTime),
    exposureCompensation: asNumber(r.ExposureCompensation),
    latitude: asNumber(r.latitude ?? r.GPSLatitude),
    longitude: asNumber(r.longitude ?? r.GPSLongitude),
    takenAt: takenAt && !isNaN(takenAt.getTime()) ? takenAt : undefined,
    title: asString(titleField),
    caption: asString(descriptionField),
    tags,
    film,
  };
}
