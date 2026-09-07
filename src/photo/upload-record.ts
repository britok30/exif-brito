import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, photos, type PhotoInsert } from '@/db';
import { S3_BASE_URL } from '@/storage/s3';

export async function findUploadedPhoto(key: string) {
  const [photo] = await db.select().from(photos).where(eq(photos.url, `${S3_BASE_URL}/${key}`)).limit(1);
  return photo;
}
export async function createUploadedPhoto(key: string, input: Omit<PhotoInsert, 'id'>) {
  // An upload has one stable identity, even when a response is lost or two tabs retry.
  const digest = createHash('sha256').update(key).digest('hex');
  const id = (BigInt(`0x${digest}`) % (BigInt(36) ** BigInt(8))).toString(36).padStart(8, '0');
  const [created] = await db.insert(photos).values({ ...input, id }).onConflictDoNothing({ target: photos.id }).returning();
  if (created) return created;
  const existing = await findUploadedPhoto(key);
  if (!existing) throw new Error('Photo identity conflict. Please choose this file again.');
  return existing;
}
