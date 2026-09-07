import { normalizeLocationName, knownLocationFromTags } from '@/photo/location';
import { NextRequest, NextResponse } from 'next/server';
import { extractExif } from '@/exif';
import { S3_BASE_URL, s3FetchBuffer, s3Put } from '@/storage/s3';
import { mapExifToPhotoInsert } from '@/photo';
import { revalidatePhotos } from '@/photo/query';
import { createUploadedPhoto, findUploadedPhoto } from '@/photo/upload-record';
import { isUploadKey, MAX_UPLOAD_BYTES } from '@/photo/upload-policy';
import {
  generateBlurDataUrl,
  readPhotoDimensions,
  generateThumbnailBuffer,
} from '@/photo/server';
import { reverseGeocode } from '@/platforms/google-maps';

interface RequestBody {
  key?: string;
  title?: string;
  caption?: string;
  tags?: string[];
  locationName?: string;
  hidden?: boolean;
}

const trim = (s?: string) => {
  if (!s) return undefined;
  const v = s.trim();
  return v.length > 0 ? v : undefined;
};

const thumbnailKeyFor = (originalKey: string) => {
  // photos/abc.jpg → photos/thumb/abc.jpg (always .jpg since sharp re-encodes)
  const filename = originalKey.split('/').pop() ?? originalKey;
  const stem = filename.replace(/\.[^.]+$/, '');
  return `photos/thumb/${stem}.jpg`;
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as RequestBody | null;
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const { key } = body;

  if (!isUploadKey(key)) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }
  if (!S3_BASE_URL) {
    return NextResponse.json({ error: 'S3 is not configured' }, { status: 500 });
  }

  if (['title', 'caption', 'locationName'].some(field => body[field as keyof RequestBody] != null && typeof body[field as keyof RequestBody] !== 'string') ||
      (body.hidden != null && typeof body.hidden !== 'boolean') ||
      (body.tags != null && (!Array.isArray(body.tags) || body.tags.some(tag => typeof tag !== 'string' || tag.length > 255))) ||
      (body.title?.length ?? 0) > 255 || (body.locationName?.length ?? 0) > 255) {
    return NextResponse.json({ error: 'Invalid photo details' }, { status: 400 });
  }
  const existing = await findUploadedPhoto(key);
  if (existing) return NextResponse.json({ photo: existing });

  let buffer: Buffer;
  try {
    buffer = await s3FetchBuffer(key);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'fetch failed' },
      { status: 502 },
    );
  }

  if (buffer.length > MAX_UPLOAD_BYTES) return NextResponse.json({ error: 'Image exceeds the 50 MB limit' }, { status: 413 });

  try {
    // Run EXIF, thumbnail and blur generation in parallel — they all read the
    // same buffer and don't depend on each other.
    const [exif, thumbnailBuffer, blurDataUrl, dimensions] = await Promise.all([
      extractExif(buffer),
      generateThumbnailBuffer(buffer),
      generateBlurDataUrl(buffer),
      readPhotoDimensions(buffer),
    ]);

    const thumbnailKey = thumbnailKeyFor(key);
    const thumbnailUrl = await s3Put(thumbnailBuffer, thumbnailKey, 'image/jpeg');

    const extension = (key.split('.').pop() ?? 'jpg').toLowerCase();
    const insert = mapExifToPhotoInsert({ ...exif, ...dimensions }, {
      url: `${S3_BASE_URL}/${key}`,
      extension,
    });

    let locationName = body.locationName === undefined ? undefined : trim(body.locationName) ?? null;
    if (body.locationName === undefined && exif.latitude != null && exif.longitude != null) {
      const geo = await reverseGeocode(exif.latitude, exif.longitude);
      locationName = geo?.formatted;
    }

    const merged = {
      ...insert,
      title: body.title === undefined ? insert.title : trim(body.title) ?? null,
      caption: body.caption === undefined ? insert.caption : trim(body.caption) ?? null,
      tags: body.tags ?? insert.tags,
      hidden: body.hidden ?? false,
      locationName: locationName ? normalizeLocationName(locationName) : knownLocationFromTags(body.tags ?? insert.tags) ?? locationName,
      thumbnailUrl,
      blurData: blurDataUrl,
    };

    const photo = await createUploadedPhoto(key, merged);
    revalidatePhotos();
    return NextResponse.json({ photo });
  } catch {
    return NextResponse.json({ error: /\.(heic|heif)$/i.test(key)
      ? 'This HEIC/HEIF image could not be processed. Export it as JPEG and try again.'
      : 'Could not publish this photograph. Retry; an already saved photo will not be duplicated.' }, { status: 500 });
  }
}
