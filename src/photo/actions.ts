'use server';

import { revalidatePath } from 'next/cache';
import { revalidatePhotos } from './query';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, photos } from '@/db';
import { S3_BASE_URL, isS3Url, s3Delete } from '@/storage/s3';

const keyFromUrl = (url?: string | null): string | undefined => {
  if (!url || !S3_BASE_URL || !isS3Url(url)) return undefined;
  return url.slice(S3_BASE_URL.length + 1);
};

export interface DeletePhotoResult {
  ok: boolean;
  error?: string;
}

export async function deletePhotoAction(
  id: string,
): Promise<DeletePhotoResult> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: 'unauthorized' };
  }

  const [photo] = await db
    .select()
    .from(photos)
    .where(eq(photos.id, id))
    .limit(1);

  if (!photo) {
    return { ok: false, error: 'not_found' };
  }

  // Delete the DB row first so the UI is consistent even if S3 cleanup fails.
  await db.delete(photos).where(eq(photos.id, id));

  // Best-effort S3 cleanup. Orphaned objects are recoverable manually.
  const originalKey = keyFromUrl(photo.url);
  const thumbnailKey = keyFromUrl(photo.thumbnailUrl);
  await Promise.allSettled(
    [originalKey, thumbnailKey]
      .filter((k): k is string => Boolean(k))
      .map(k => s3Delete(k)),
  );

  revalidatePhotos('action');
  revalidatePath('/');
  return { ok: true };
}
