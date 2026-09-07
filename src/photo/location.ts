import type { Photo } from '@/db';

// Explicit collection vocabulary; unknown city names are never assigned a country.
const knownLocations: Record<string, string> = {
  cefalu: 'Cefalù, Italy', 'cefalù': 'Cefalù, Italy', 'cefalu, italy': 'Cefalù, Italy',
  'cefalù, pa, italy': 'Cefalù, Italy', 'cefalu, pa, italy': 'Cefalù, Italy',
  split: 'Split, Croatia', dubrovnik: 'Dubrovnik, Croatia',
  grindelwald: 'Grindelwald, Switzerland',
  positano: 'Positano, Italy', 'positano, sa, italy': 'Positano, Italy',
  amalfi: 'Amalfi, Italy', 'amalfi, sa, italy': 'Amalfi, Italy', furore: 'Furore, Italy',
  'miami, fl, usa': 'Miami, United States', 'miami, usa': 'Miami, United States',
  london: 'London, UK', 'london, uk': 'London, UK', 'london, united kingdom': 'London, UK',
  kyoto: 'Kyoto, Japan', 'kyoto, japan': 'Kyoto, Japan',
  tokyo: 'Tokyo, Japan', 'tokyo, japan': 'Tokyo, Japan',
  barcelona: 'Barcelona, Spain', madrid: 'Madrid, Spain',
  miami: 'Miami, United States', chicago: 'Chicago, United States',
  toronto: 'Toronto, Canada', lisbon: 'Lisbon, Portugal',
  rome: 'Rome, Italy', 'piano-di-sorrento': 'Piano di Sorrento, Italy',
  sorrento: 'Sorrento, Italy', 'amalfi-coast': 'Amalfi Coast, Italy',
  florence: 'Florence, Italy', venice: 'Venice, Italy',
  paris: 'Paris, France', zurich: 'Zurich, Switzerland',
  luzern: 'Lucerne, Switzerland', bern: 'Bern, Switzerland',
  lauterbrunnen: 'Lauterbrunnen, Switzerland',
};

export function normalizeLocationName(value: string): string {
  const trimmed = value.trim();
  return knownLocations[trimmed.toLowerCase().replace(/\s*,\s*/g, ', ')] || trimmed;
}

export function knownLocationFromTags(tags: string[] | null | undefined): string | undefined {
  const locations = [...new Set((tags || []).map(tag => knownLocations[tag.trim().toLowerCase()]).filter(Boolean))];
  return locations.length === 1 ? locations[0] : undefined;
}

const localityWithoutPostalCode = (value: string) => value.replace(/^\d{4,6}\s+/, '').replace(/\s+\d{3}-\d{4}$/, '').trim();

/** Presentation only: never replaces the original address or uses a geocoding request. */
export function shortPhotoLocation(photo: Pick<Photo, 'locationName' | 'tags'>): string | undefined {
  const address = photo.locationName?.trim();
  if (!address) return knownLocationFromTags(photo.tags) || (photo.tags?.[0] ? normalizeLocationName(photo.tags[0]) : undefined);
  const normalized = normalizeLocationName(address);
  if (normalized !== address) return normalized;
  const parts = address.split(',').map(part => part.trim()).filter(Boolean);
  if (parts.length <= 2) return normalizeLocationName(parts.join(', '));
  const country = parts.at(-1)!;
  const local = parts.slice(0, -1);
  const taggedCity = photo.tags?.find(tag => local.some(part => localityWithoutPostalCode(part).toLowerCase() === tag.toLowerCase()));
  const city = taggedCity || local.reverse().find(part =>
    !/^\d[\d\s-]*$/.test(part) && !/^[A-Z]{2}\s+\d{5}(?:-\d{4})?$/.test(part) &&
    !/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(part));
  const label = city ? localityWithoutPostalCode(city) : undefined;
  return label && label !== country ? normalizeLocationName(`${label}, ${country}`) : country;
}
