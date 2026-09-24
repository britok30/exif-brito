import { getPhotos } from '@/photo/query';
import { shareImage, SITE_CARD_CACHE } from '@/seo/share-image';
export const dynamic = 'force-dynamic';
export async function GET() { return shareImage((await getPhotos(1))[0], SITE_CARD_CACHE); }
