import { authorizeStudio } from '@/security/authorize';
import { NextRequest, NextResponse } from 'next/server';
import { s3Delete } from '@/storage/s3';
import { isUploadKey } from '@/photo/upload-policy';
import { findUploadedPhoto } from '@/photo/upload-record';
import { db, photos } from '@/db';
import { eq } from 'drizzle-orm';
import { revalidatePhotos } from '@/photo/query';

export async function POST(req: NextRequest) {
  const denied = await authorizeStudio(req);
  if (denied) return denied;
  const { key } = (await req.json().catch(() => null)) ?? {};

  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }
  if (!isUploadKey(key)) {
    return NextResponse.json({ error: 'invalid key' }, { status: 400 });
  }

  try {
    if (await findUploadedPhoto(key)) return NextResponse.json({ error: 'This photograph is already published and cannot be discarded.' }, { status: 409 });
    await s3Delete(key);
    await s3Delete(`photos/thumb/${key.split('/').pop()!.replace(/\.[^.]+$/, '')}.jpg`);
    // A publish may have landed between the check and the delete. Its original
    // is gone, so remove the row rather than leave a broken photograph.
    const raced = await findUploadedPhoto(key);
    if (raced) {
      await db.delete(photos).where(eq(photos.id, raced.id));
      revalidatePhotos();
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Could not discard upload', key, error);
    return NextResponse.json({ error: 'Storage couldn’t be reached. Retry in a moment.' }, { status: 502 });
  }
}
