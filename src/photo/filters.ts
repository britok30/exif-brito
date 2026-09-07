import type { Photo } from '@/db';
import { formatCameraName } from './camera';

export type FacetKind = 'tag' | 'film' | 'camera' | 'lens' | 'year';

export interface PhotoFilter {
  tag?: string;
  film?: string;
  camera?: string;
  lens?: string;
  year?: number;
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface PhotoFacets {
  tags: FacetValue[];
  films: FacetValue[];
  cameras: FacetValue[];
  lenses: FacetValue[];
  years: FacetValue[];
}

const cameraOf = (p: Photo): string | undefined => {
  const parts = [p.make, p.model].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(' ') : undefined;
};

const yearOf = (p: Photo): number | undefined => {
  if (!p.takenAt) return undefined;
  const d = p.takenAt instanceof Date ? p.takenAt : new Date(p.takenAt);
  return isNaN(d.getTime()) ? undefined : d.getFullYear();
};

export function parsePhotoFilter(search: Record<string, string | undefined>): PhotoFilter {
  const year = search.year ? Number.parseInt(search.year, 10) : undefined;
  return {
    tag: search.tag || undefined,
    film: search.film || undefined,
    camera: search.camera || undefined,
    lens: search.lens || undefined,
    year: Number.isFinite(year) ? year : undefined,
  };
}

export function applyPhotoFilter(photos: Photo[], filter: PhotoFilter): Photo[] {
  return photos.filter(p => {
    if (filter.tag && !(p.tags ?? []).includes(filter.tag)) return false;
    if (filter.film && p.film !== filter.film) return false;
    if (filter.camera && cameraOf(p) !== filter.camera) return false;
    if (filter.lens && p.lensModel !== filter.lens) return false;
    if (filter.year && yearOf(p) !== filter.year) return false;
    return true;
  });
}

const tally = (entries: Array<{ value: string; label?: string }>): FacetValue[] => {
  const counts = new Map<string, { label: string; count: number }>();
  for (const { value, label } of entries) {
    const existing = counts.get(value);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(value, { label: label ?? value, count: 1 });
    }
  }
  return Array.from(counts, ([value, { label, count }]) => ({ value, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

export function buildPhotoFacets(photos: Photo[]): PhotoFacets {
  return {
    tags: tally(
      photos.flatMap(p => (p.tags ?? []).map(t => ({ value: t }))),
    ),
    films: tally(
      photos
        .filter(p => p.film)
        .map(p => ({ value: p.film as string })),
    ),
    cameras: tally(
      photos
        // The value stays the raw EXIF pair so existing filter links keep working; only the label is formatted.
        .map(p => { const value = cameraOf(p); return value ? { value, label: formatCameraName(p.make, p.model) ?? value } : undefined; })
        .filter((v): v is { value: string; label: string } => Boolean(v)),
    ),
    lenses: tally(
      photos
        .map(p => p.lensModel)
        .filter((v): v is string => Boolean(v))
        .map(v => ({ value: v })),
    ),
    years: tally(
      photos
        .map(p => yearOf(p))
        .filter((v): v is number => Number.isFinite(v))
        .map(v => ({ value: String(v) })),
    ).sort((a, b) => Number(b.value) - Number(a.value)),
  };
}
