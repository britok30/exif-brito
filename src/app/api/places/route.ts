import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(request: Request) {
  if (!(await auth())?.user) return NextResponse.json({ error: 'Please sign in to search locations.' }, { status: 401 });
  const input = new URL(request.url).searchParams.get('input')?.trim() || '';
  if (input.length < 2 || input.length > 255) return NextResponse.json({ suggestions: [] });
  const key = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: 'Location search is unavailable. You can still enter a location.' }, { status: 503 });
  try {
    const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST', cache: 'no-store', signal: AbortSignal.any([request.signal, AbortSignal.timeout(7000)]),
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat' },
      // The collection spans countries; avoid Google's default IP-based local bias.
      body: JSON.stringify({ input, languageCode: 'en', includeQueryPredictions: false,
        locationBias: { rectangle: { low: { latitude: -90, longitude: -180 }, high: { latitude: 90, longitude: 180 } } },
      }),
    });
    if (!response.ok) throw new Error('Places unavailable');
    const data = await response.json();
    const suggestions = (data.suggestions || []).flatMap((item: { placePrediction?: { placeId?: string; text?: { text?: string }; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } } } }) => {
      const place = item.placePrediction;
      return place?.placeId && place.text?.text ? [{ id: place.placeId, text: place.text.text,
        main: place.structuredFormat?.mainText?.text || place.text.text, secondary: place.structuredFormat?.secondaryText?.text || '' }] : [];
    }).slice(0, 5);
    return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Location search is unavailable. You can still enter a location.' }, { status: 503 });
  }
}
