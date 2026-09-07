import { getPhotoById } from '@/photo/query';
import { shareImage } from '@/seo/share-image';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if (!/^[a-z0-9]{8}$/i.test(id)) return new Response('Not found',{status:404});
  const photo=await getPhotoById(id);
  if (!photo || photo.hidden) return new Response('Not found',{status:404,headers:{'Cache-Control':'private, no-store'}});
  return shareImage(photo);
}
