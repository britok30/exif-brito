import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { auth } from '@/auth';
import { readReview, reviewDirectory, reviewOriginal } from '@/review/local';
export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await auth())?.user) return Response.json({ error: 'Please sign in to review photographs.' }, { status: 401 });
  const { id } = await params;
  if (!/^[a-f0-9]{20}$/.test(id)) return new Response(null, { status: 404 });
  const review = await readReview(); const item = review?.items.find(item => item.id === id);
  if (!review || !item) return new Response(null, { status: 404 });
  try {
    const original = new URL(request.url).searchParams.get('original') === '1';
    const file = original ? await reviewOriginal(review, item) : path.join(reviewDirectory, id + '.jpg');
    const bytes = await readFile(file);
    return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return Response.json({ error: 'Reconnect the same SD card to prepare this photograph.' }, { status: 409 }); }
}
