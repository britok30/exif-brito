import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reverseGeocode } from './google-maps';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('reverseGeocode', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
  });

  it('returns undefined when no API key is configured', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    expect(await reverseGeocode(48.85, 2.35)).toBeUndefined();
  });

  it('returns city/country/formatted from a locality result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({
          status: 'OK',
          results: [
            {
              formatted_address: 'Paris, France',
              address_components: [
                { long_name: 'Paris', short_name: 'Paris', types: ['locality', 'political'] },
                { long_name: 'France', short_name: 'FR', types: ['country', 'political'] },
              ],
            },
          ],
        }),
      ),
    );

    const result = await reverseGeocode(48.8566, 2.3522);
    expect(result).toEqual({
      city: 'Paris',
      country: 'France',
      formatted: 'Paris, France',
    });
  });

  it('prefers a result with a locality component over one without', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({
          status: 'OK',
          results: [
            {
              formatted_address: '5 Rue Foo, 75001 Paris, France',
              address_components: [
                { long_name: 'France', short_name: 'FR', types: ['country', 'political'] },
              ],
            },
            {
              formatted_address: 'Paris, France',
              address_components: [
                { long_name: 'Paris', short_name: 'Paris', types: ['locality', 'political'] },
                { long_name: 'France', short_name: 'FR', types: ['country', 'political'] },
              ],
            },
          ],
        }),
      ),
    );

    const result = await reverseGeocode(48.8566, 2.3522);
    expect(result?.city).toBe('Paris');
  });

  it('falls back to administrative area when no locality is present (e.g. Lauterbrunnen, CH)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json({
          status: 'OK',
          results: [
            {
              formatted_address: 'Lauterbrunnen, Switzerland',
              address_components: [
                {
                  long_name: 'Lauterbrunnen',
                  short_name: 'Lauterbrunnen',
                  types: ['administrative_area_level_3', 'political'],
                },
                {
                  long_name: 'Switzerland',
                  short_name: 'CH',
                  types: ['country', 'political'],
                },
              ],
            },
          ],
        }),
      ),
    );

    const result = await reverseGeocode(46.5934, 7.9085);
    expect(result?.city).toBe('Lauterbrunnen');
    expect(result?.country).toBe('Switzerland');
  });

  it('returns undefined on non-OK API status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ status: 'ZERO_RESULTS', results: [] })),
    );
    expect(await reverseGeocode(0, 0)).toBeUndefined();
  });

  it('returns undefined on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('net'); }));
    expect(await reverseGeocode(48.85, 2.35)).toBeUndefined();
  });
});
