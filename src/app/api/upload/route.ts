import { NextRequest, NextResponse } from 'next/server';
import { MAX_UPLOAD_BYTES, UPLOAD_TYPES } from '@/photo/upload-policy';
import { S3_BASE_URL, generateStorageId, s3SignedUrl } from '@/storage/s3';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export async function POST(req: NextRequest) {
  const { filename, contentType, size } = (await req.json().catch(() => null)) ?? {} as {
    filename?: string;
    contentType?: string;
    size?: number;
  };

  if (typeof filename !== 'string' || !filename || typeof contentType !== 'string' || !contentType) {
    return NextResponse.json(
      { error: 'filename and contentType are required' },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: `unsupported contentType: ${contentType}` },
      { status: 400 },
    );
  }

  if (size !== undefined && (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES)) return NextResponse.json({ error: 'Choose a non-empty image up to 50 MB' }, { status: 400 });

  if (!S3_BASE_URL) {
    return NextResponse.json(
      { error: 'S3 is not configured' },
      { status: 500 },
    );
  }

  const ext = filename.includes('.') ? filename.split('.').pop() : 'jpg';
  if (!ext || UPLOAD_TYPES[ext.toLowerCase()] !== contentType) return NextResponse.json({ error: 'File extension does not match its image type' }, { status: 400 });
  const key = `photos/${generateStorageId()}.${ext}`;

  const uploadUrl = await s3SignedUrl(key, 'PUT', 60 * 5, contentType);

  return NextResponse.json({
    key,
    uploadUrl,
    publicUrl: `${S3_BASE_URL}/${key}`,
  });
}
