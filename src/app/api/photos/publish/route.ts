import { syncDestinationCollections } from '@/collections/sync';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, photos } from '@/db';
import { revalidatePhotos } from '@/photo/query';

export async function POST(request: Request) {
  if (!(await auth())?.user) return NextResponse.json({ error: 'Please sign in again before publishing.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.ids) || !body.ids.length || body.ids.length > 5000 ||
    body.ids.some((id: unknown) => typeof id !== 'string' || !/^[a-z0-9]{8}$/i.test(id))) {
    return NextResponse.json({ error: 'Choose photographs to publish.' }, { status: 400 });
  }
  const ids = [...new Set<string>(body.ids)];
  try {
    // A single statement publishes only the explicitly selected hidden photographs.
    const published = await db.update(photos).set({ hidden: false, updatedAt: new Date() })
      .where(and(inArray(photos.id, ids), eq(photos.hidden, true))).returning({ id: photos.id });
    await syncDestinationCollections(ids);
    revalidatePhotos();
    revalidatePath('/');
    revalidatePath('/admin', 'layout');
    for (const id of ids) revalidatePath(`/p/${id}`);
    return NextResponse.json({ published: published.map(photo => photo.id) });
  } catch {
    return NextResponse.json({ error: 'Publishing couldn’t finish. Your selection is saved; please try again.' }, { status: 500 });
  }
}
