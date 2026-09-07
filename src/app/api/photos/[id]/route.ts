import { syncDestinationCollections } from '@/collections/sync';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { revalidatePhotos } from '@/photo/query';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, photos } from '@/db';
import { parsePhotoEdits } from '@/photo/edit';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await auth())?.user) return NextResponse.json({ error: 'Please sign in again before saving.' }, { status: 401 });
  const { id } = await params;
  if (!/^[a-z0-9]{8}$/i.test(id)) return NextResponse.json({ error: 'Photograph not found.' }, { status: 404 });
  const edits = parsePhotoEdits(await request.json().catch(() => null));
  if (!edits) return NextResponse.json({ error: 'Check your photo details and try again.' }, { status: 400 });
  try {
    // Only editorial fields change. Original files, EXIF and capture dates remain intact.
    const [photo] = await db.update(photos).set({ ...edits,
      title: edits.title || null, caption: edits.caption || null, locationName: edits.locationName || null,
      updatedAt: new Date(),
    }).where(eq(photos.id, id)).returning({ id: photos.id });
    if (!photo) return NextResponse.json({ error: 'This photograph no longer exists.' }, { status: 404 });
    await syncDestinationCollections([id]);
    revalidatePhotos();
    revalidatePath('/');
    revalidatePath(`/p/${id}`);
    revalidatePath('/admin', 'layout');
    return NextResponse.json({ photo });
  } catch {
    return NextResponse.json({ error: 'Your changes couldn’t be saved. Please try again.' }, { status: 500 });
  }
}
