export interface GeocodeResult {
  city?: string;
  country?: string;
  formatted?: string;
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodeApiResult {
  formatted_address?: string;
  address_components?: AddressComponent[];
}

interface GeocodeApiResponse {
  status: string;
  results: GeocodeApiResult[];
}

const findComponent = (
  components: AddressComponent[] | undefined,
  type: string,
): AddressComponent | undefined =>
  components?.find(c => c.types.includes(type));

// Roll up administrative subdivisions Google returns as "X City" / bare
// ward names into the parent metropolis the user actually means.
// Tokyo's 23 special wards consolidate to "Tokyo".
const TOKYO_WARDS = [
  'Adachi', 'Arakawa', 'Bunkyo', 'Chiyoda', 'Chuo', 'Edogawa',
  'Itabashi', 'Katsushika', 'Kita', 'Koto', 'Meguro', 'Minato',
  'Nakano', 'Nerima', 'Ota', 'Setagaya', 'Shibuya', 'Shinagawa',
  'Shinjuku', 'Suginami', 'Sumida', 'Taito', 'Toshima',
];

export const CITY_REMAP: Record<string, string> = Object.fromEntries(
  TOKYO_WARDS.flatMap(ward => [
    [ward, 'Tokyo'],
    [`${ward} City`, 'Tokyo'],
    [`${ward}-ku`, 'Tokyo'],
  ]),
);

export const normalizeCity = (city?: string): string | undefined => {
  if (!city) return city;
  return CITY_REMAP[city] ?? city;
};

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodeResult | undefined> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return undefined;

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${latitude},${longitude}`);
  url.searchParams.set('key', key);

  let data: GeocodeApiResponse;
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return undefined;
    data = (await res.json()) as GeocodeApiResponse;
  } catch {
    return undefined;
  }

  if (data.status !== 'OK' || data.results.length === 0) return undefined;

  // Prefer a result with a locality (city) component, then fall back to others.
  const ranked = [...data.results].sort((a, b) => {
    const aHasLocality = findComponent(a.address_components, 'locality') ? 1 : 0;
    const bHasLocality = findComponent(b.address_components, 'locality') ? 1 : 0;
    return bHasLocality - aHasLocality;
  });
  const top = ranked[0];

  const localityish =
    findComponent(top.address_components, 'locality') ??
    findComponent(top.address_components, 'postal_town') ??
    findComponent(top.address_components, 'administrative_area_level_3') ??
    findComponent(top.address_components, 'administrative_area_level_2') ??
    findComponent(top.address_components, 'administrative_area_level_1');

  const country = findComponent(top.address_components, 'country');

  return {
    city: normalizeCity(localityish?.long_name),
    country: country?.long_name,
    formatted: top.formatted_address,
  };
}
