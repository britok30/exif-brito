import { getPhotos } from '@/photo/query';
import { shareImage } from '@/seo/share-image';
export const dynamic = 'force-dynamic';
export async function GET() { return shareImage((await getPhotos(1))[0]); }
