import { customAlphabet } from 'nanoid';
import { db, photos, type PhotoInsert, type Photo } from '@/db';
import type { ExtractedExif } from '@/exif';

const generatePhotoId = customAlphabet(
  'abcdefghijklmnopqrstuvwxyz0123456789',
  8,
);

export interface PhotoLocation {
  key: string;
  url: string;
  extension: string;
}

export const mapExifToPhotoInsert = (
  exif: ExtractedExif,
  { url, extension }: Omit<PhotoLocation, 'key'>,
): Omit<PhotoInsert, 'id'> => ({
  url,
  extension,
  width: exif.width,
  height: exif.height,
  aspectRatio: exif.aspectRatio,
  title: exif.title,
  caption: exif.caption,
  tags: exif.tags,
  make: exif.make,
  model: exif.model,
  lensMake: exif.lensMake,
  lensModel: exif.lensModel,
  focalLength: exif.focalLength ? Math.round(exif.focalLength) : undefined,
  focalLengthIn35mmFormat: exif.focalLengthIn35mmFormat
    ? Math.round(exif.focalLengthIn35mmFormat)
    : undefined,
  fNumber: exif.fNumber,
  iso: exif.iso,
  exposureTime: exif.exposureTime,
  exposureCompensation: exif.exposureCompensation,
  latitude: exif.latitude,
  longitude: exif.longitude,
  takenAt: exif.takenAt ?? new Date(),
  takenAtNaive:
    exif.takenAtNaive ?? new Date().toISOString().replace(/\.\d{3}Z$/, ''),
  film: typeof exif.film === 'string' ? exif.film : undefined,
  recipeData: exif.recipeData,
});

export const createPhoto = async (
  input: Omit<PhotoInsert, 'id'>,
): Promise<Photo> => {
  const id = generatePhotoId();
  const [row] = await db
    .insert(photos)
    .values({ id, ...input })
    .returning();
  return row;
};
