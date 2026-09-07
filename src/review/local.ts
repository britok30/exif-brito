import 'server-only';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
export const reviewDirectory = path.join(process.cwd(), '.local', 'photo-review');
export interface ReviewItem { id: string; path: string; name: string; size: number; modified: number; width: number; height: number; takenAt: string | null; focus: 'clear' | 'check' | 'blurred'; note: string }
export interface PhotoReview { version: string; sourceRoot: string; title: string; locationName?: string; items: ReviewItem[] }
export async function readReview(): Promise<PhotoReview | null> {
  try { return JSON.parse(await readFile(path.join(reviewDirectory, 'manifest.json'), 'utf8')); }
  catch { return null; }
}
export async function reviewOriginal(review: PhotoReview, item: ReviewItem) {
  const [root, file] = await Promise.all([realpath(review.sourceRoot), realpath(item.path)]);
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Invalid source');
  const info = await stat(file);
  if (!info.isFile() || info.size !== item.size || Math.abs(info.mtimeMs - item.modified) > 1) throw Error('Source changed');
  return file;
}
