import { authorizeStudio } from '@/security/authorize';
import { NextResponse } from 'next/server';
import { reverseGeocode } from '@/platforms/google-maps';

export async function GET(req: Request) {
  const denied = await authorizeStudio(req);
  if (denied) return denied;
  const params = new URL(req.url).searchParams;
  const lat = parseFloat(params.get('lat') ?? '');
  const lng = parseFloat(params.get('lng') ?? '');

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json(
      { error: 'lat (−90 to 90) and lng (−180 to 180) are required' },
      { status: 400 },
    );
  }

  const location = await reverseGeocode(lat, lng);
  return NextResponse.json({ location });
}
