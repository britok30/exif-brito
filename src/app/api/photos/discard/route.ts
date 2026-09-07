import { authorizeStudio } from '@/security/authorize';
import { NextRequest, NextResponse } from 'next/server';
import { s3Delete } from '@/storage/s3';
import { isUploadKey } from '@/photo/upload-policy';
import { findUploadedPhoto } from '@/photo/upload-record';

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
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'delete failed' },
      { status: 502 },
    );
  }
}
