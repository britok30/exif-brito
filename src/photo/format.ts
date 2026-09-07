import type { Photo } from '@/db/schema';

export function formatExposureTime(seconds: number | null | undefined): string | undefined {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return undefined;
  return seconds >= 1 ? `${Number(seconds.toFixed(3))}s` : `1/${Math.round(1 / seconds)}s`;
}

export function formatCaptureDate(photo: Pick<Photo, 'takenAtNaive'>): string {
  // Camera-local time must not shift when a visitor is in another timezone.
  const date = new Date(`${photo.takenAtNaive.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}
