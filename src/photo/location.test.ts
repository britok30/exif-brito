import { expect, it } from 'vitest';
import { shortPhotoLocation, normalizeLocationName, knownLocationFromTags } from './location';

it('shows the city and country instead of a Japanese street address', () => {
  const photo = { locationName: '13 Fukuinekakimotochō, Higashiyama Ward, Kyoto, 605-0985, Japan', tags: ['travel'] };
  expect(shortPhotoLocation(photo)).toBe('Kyoto, Japan');
  expect(photo.locationName).toContain('13 Fukuinekakimotochō');
});
it('handles US state/ZIP and Spanish postal prefixes', () => {
  expect(shortPhotoLocation({ locationName: '100 Main St, Miami, FL 33101, USA', tags: [] })).toBe('Miami, United States');
  expect(shortPhotoLocation({ locationName: 'Calle Mayor 1, 28013 Madrid, Spain', tags: [] })).toBe('Madrid, Spain');
});
it('preserves concise labels and only uses tags as a fallback or matching city', () => {
  expect(shortPhotoLocation({ locationName: 'Kyoto, Japan', tags: ['Travel'] })).toBe('Kyoto, Japan');
  expect(shortPhotoLocation({ locationName: null, tags: ['Kyoto'] })).toBe('Kyoto, Japan');
  expect(shortPhotoLocation({ locationName: null, tags: [] })).toBeUndefined();
});

it('standardizes known manual city labels without guessing unknown places', () => {
  expect(normalizeLocationName(' kyoto ')).toBe('Kyoto, Japan');
  expect(normalizeLocationName('TOKYO,Japan')).toBe('Tokyo, Japan');
  expect(normalizeLocationName('Springfield')).toBe('Springfield');
  expect(normalizeLocationName('Kyoto, USA')).toBe('Kyoto, USA');
  expect(knownLocationFromTags(['Travel', 'Tokyo'])).toBe('Tokyo, Japan');
  expect(knownLocationFromTags(['Kyoto', 'Tokyo'])).toBeUndefined();
});
it('removes Tokyo postal codes only from display, preserving the full address', () => {
  const locationName = '2-chōme-6-10 Toranomon, Minato City, Tokyo 105-0001, Japan';
  expect(shortPhotoLocation({ locationName, tags: ['Tokyo'] })).toBe('Tokyo, Japan');
  expect(shortPhotoLocation({ locationName, tags: [] })).toBe('Tokyo, Japan');
  expect(normalizeLocationName(locationName)).toBe(locationName);
});

it('standardizes London labels while preserving other Londons and full addresses', () => {
  for (const label of ['London', ' london,UK ', 'London, United Kingdom']) expect(normalizeLocationName(label)).toBe('London, UK');
  expect(knownLocationFromTags(['London', 'Travel'])).toBe('London, UK');
  expect(normalizeLocationName('London, Canada')).toBe('London, Canada');
  expect(normalizeLocationName('10 Downing Street, London, UK')).toBe('10 Downing Street, London, UK');
});

it('standardizes the reviewed towns and Google province labels without displaying SA as a city', () => {
  for (const [input,expected] of [['Split','Split, Croatia'],['Dubrovnik','Dubrovnik, Croatia'],['Grindelwald','Grindelwald, Switzerland'],['Positano, SA, Italy','Positano, Italy'],['Amalfi, SA, Italy','Amalfi, Italy']]) {
    expect(normalizeLocationName(input)).toBe(expected);
    expect(shortPhotoLocation({locationName:input,tags:[]})).toBe(expected);
  }
});
