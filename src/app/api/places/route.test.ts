import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock('@/auth', () => ({ auth }));
import { GET } from './route';
const query = (input: string) => GET(new Request(`http://localhost/api/places?input=${encodeURIComponent(input)}`));
beforeEach(() => { auth.mockResolvedValue({ user: { id: 'admin', email: 'owner@example.com' } }); vi.stubEnv('GOOGLE_PLACES_API_KEY', ''); vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key'); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
it('requires sign-in before making a provider request', async () => {
  auth.mockResolvedValue(null); expect((await query('Kyoto')).status).toBe(401); expect(fetch).not.toHaveBeenCalled();
});
it('does not query Google for short or oversized inputs', async () => {
  for (const value of ['k', ' ', 'x'.repeat(256)]) expect(await (await query(value)).json()).toEqual({ suggestions: [] });
  expect(fetch).not.toHaveBeenCalled();
});
it('returns only usable suggestions with an explicit field mask', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ suggestions: [
    { placePrediction: { placeId: 'city', text: { text: 'Kyoto, Japan' }, structuredFormat: { mainText: { text: 'Kyoto' }, secondaryText: { text: 'Japan' } } } },
    { queryPrediction: { text: { text: 'ignore' } } },
  ] })));
  const response = await query('Kyoto');
  expect(await response.json()).toEqual({ suggestions: [{ id: 'city', text: 'Kyoto, Japan', main: 'Kyoto', secondary: 'Japan' }] });
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(fetch).toHaveBeenCalledWith('https://places.googleapis.com/v1/places:autocomplete', expect.objectContaining({ method: 'POST', cache: 'no-store', body: JSON.stringify({ input: 'Kyoto', languageCode: 'en', includeQueryPredictions: false, locationBias: { rectangle: { low: { latitude: -90, longitude: -180 }, high: { latitude: 90, longitude: 180 } } } }) }));
});
it('keeps manual entry available when configuration or Google fails', async () => {
  vi.stubEnv('GOOGLE_MAPS_API_KEY', ''); expect((await query('Kyoto')).status).toBe(503);
  vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key');
  vi.mocked(fetch).mockResolvedValue(new Response('private provider error', { status: 403 }));
  const response = await query('Kyoto'); expect(response.status).toBe(503); expect(await response.text()).not.toContain('private provider');
});
