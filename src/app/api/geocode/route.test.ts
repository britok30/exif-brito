import { describe, it, expect, vi } from 'vitest';

vi.mock('@/platforms/google-maps', () => ({
  reverseGeocode: vi.fn(async (lat: number, lng: number) => {
    if (lat === 48.85 && lng === 2.35) {
      return { city: 'Paris', country: 'France', formatted: 'Paris, France' };
    }
    return undefined;
  }),
}));

const get = async (qs: string) => {
  const { GET } = await import('./route');
  const req = new Request(`http://localhost/api/geocode?${qs}`);
  return GET(req as never);
};

describe('GET /api/geocode', () => {
  it('returns 400 when lat/lng are missing or invalid', async () => {
    expect((await get('')).status).toBe(400);
    expect((await get('lat=foo&lng=bar')).status).toBe(400);
  });

  it('returns geocoded location when coords resolve', async () => {
    const res = await get('lat=48.85&lng=2.35');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.location).toEqual({
      city: 'Paris',
      country: 'France',
      formatted: 'Paris, France',
    });
  });

  it('returns 200 with undefined location when no match', async () => {
    const res = await get('lat=0&lng=0');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.location).toBeUndefined();
  });
});
