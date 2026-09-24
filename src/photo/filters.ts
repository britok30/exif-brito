import type { Photo } from '@/db';
import { formatCameraName } from './camera';
import { knownLocationFromTags, shortPhotoLocation } from './location';
import { labelForFujifilmSimulation } from '@/exif/fujifilm';
import { formatAppleLensText, isLensApple } from '@/platforms/apple';

export type FacetKind = 'tag' | 'place' | 'film' | 'camera' | 'lens' | 'focal' | 'year';

export interface PhotoFilter {
  tag?: string;
  place?: string;
  film?: string;
  camera?: string;
  lens?: string;
  focal?: number;
  year?: number;
}

export interface FacetValue {
  value: string;
  label: string;
  count: number;
}

export interface PhotoFacets {
  tags: FacetValue[];
  places: FacetValue[];
  films: FacetValue[];
  cameras: FacetValue[];
  lenses: FacetValue[];
  focalLengths: FacetValue[];
  years: FacetValue[];
}

type FilterablePhoto = Pick<Photo, 'tags' | 'locationName' | 'film' | 'make' | 'model' | 'lensModel' | 'focalLength' | 'takenAtNaive'>;

/** The raw EXIF pair, so filter links keep working whatever label the camera is given. */
export const cameraOf = (p: Pick<Photo, 'make' | 'model'>): string | undefined => {
  const parts = [p.make, p.model].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(' ') : undefined;
};

/**
 * Where a photograph was taken, for the Places filter: its address, or a place
 * known from its tags. Unlike the display label, never an arbitrary first tag,
 * so subjects such as "street" stay out of Places.
 */
export const placeOf = (p: Pick<Photo, 'locationName' | 'tags'>): string | undefined =>
  p.locationName?.trim() ? shortPhotoLocation(p) : knownLocationFromTags(p.tags);

const isPlaceTag = (tag: string) => Boolean(knownLocationFromTags([tag]));

// The capture date as the camera recorded it, so a photograph filed under a year
// on the page is found by that year's filter whatever the server's time zone.
const yearOf = (p: Pick<Photo, 'takenAtNaive'>): number | undefined => {
  const year = Number.parseInt(p.takenAtNaive?.slice(0, 4) ?? '', 10);
  return Number.isFinite(year) ? year : undefined;
};

const positiveInt = (value?: string) => {
  const number = value ? Number.parseInt(value, 10) : undefined;
  return number && Number.isFinite(number) && number > 0 ? number : undefined;
};

export function parsePhotoFilter(search: Record<string, string | undefined>): PhotoFilter {
  return {
    tag: search.tag || undefined,
    place: search.place || undefined,
    film: search.film || undefined,
    camera: search.camera || undefined,
    lens: search.lens || undefined,
    focal: positiveInt(search.focal),
    year: positiveInt(search.year),
  };
}

export const isFiltered = (filter: PhotoFilter) => Object.values(filter).some(Boolean);

export function applyPhotoFilter<T extends FilterablePhoto>(photos: T[], filter: PhotoFilter): T[] {
  return photos.filter(p => {
    if (filter.tag && !(p.tags ?? []).includes(filter.tag)) return false;
    if (filter.place && placeOf(p) !== filter.place) return false;
    if (filter.film && p.film !== filter.film) return false;
    if (filter.camera && cameraOf(p) !== filter.camera) return false;
    if (filter.lens && p.lensModel !== filter.lens) return false;
    if (filter.focal && p.focalLength !== filter.focal) return false;
    if (filter.year && yearOf(p) !== filter.year) return false;
    return true;
  });
}

/** Query string for a filter, in a stable order, for links and API calls. */
export function filterSearchParams(filter: PhotoFilter): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ['tag', 'place', 'film', 'camera', 'lens', 'focal', 'year'] as const) {
    if (filter[key]) params.set(key, String(filter[key]));
  }
  return params;
}

/** Link to the gallery narrowed to one value. */
export const filterHref = (kind: FacetKind, value: string | number) =>
  `/?${filterSearchParams({ [kind]: value } as PhotoFilter)}#archive`;

export const lensLabel = (lens: string) => isLensApple(lens) ? formatAppleLensText(lens) : lens;

/** A short, human description of the active filter, e.g. “Classic Chrome, 2024”, for titles. */
export function describePhotoFilter(filter: PhotoFilter, photos: Pick<Photo, 'make' | 'model'>[] = []): string | undefined {
  const cameraPhoto = filter.camera ? photos.find(p => cameraOf(p) === filter.camera) : undefined;
  const parts = [
    filter.place,
    filter.tag,
    filter.film && labelForFujifilmSimulation(filter.film),
    filter.camera && (cameraPhoto ? formatCameraName(cameraPhoto.make, cameraPhoto.model) : undefined) || filter.camera,
    filter.lens && lensLabel(filter.lens),
    filter.focal && `${filter.focal}mm`,
    filter.year && String(filter.year),
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
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

export function buildPhotoFacets(photos: FilterablePhoto[]): PhotoFacets {
  return {
    // Place names among the tags are listed under Places, not twice.
    tags: tally(
      photos.flatMap(p => (p.tags ?? []).filter(t => !isPlaceTag(t)).map(t => ({ value: t }))),
    ),
    places: tally(
      photos
        .map(p => placeOf(p))
        .filter((v): v is string => Boolean(v))
        .map(v => ({ value: v })),
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
    focalLengths: tally(
      photos
        .map(p => p.focalLength)
        .filter((v): v is number => Boolean(v && v > 0))
        .map(v => ({ value: String(v), label: `${v}mm` })),
    ).sort((a, b) => Number(a.value) - Number(b.value)),
    years: tally(
      photos
        .map(p => yearOf(p))
        .filter((v): v is number => Number.isFinite(v))
        .map(v => ({ value: String(v) })),
    ).sort((a, b) => Number(b.value) - Number(a.value)),
  };
}
