import { ImageResponse } from 'next/og';
import type { Photo } from '@/db';
import { getDisplayUrl } from '@/photo/url';

export async function shareImage(photo?: Photo) {
  if (photo?.hidden) return new Response('Not found',{status:404,headers:{'Cache-Control':'private, no-store'}});
  let source: string | undefined;
  if (photo) {
    const upstream = await fetch(await getDisplayUrl(photo.thumbnailUrl || photo.url),{signal:AbortSignal.timeout(10000)});
    if (!upstream.ok) return new Response('Preview unavailable',{status:502,headers:{'Cache-Control':'no-store'}});
    source = `data:${upstream.headers.get('content-type') || 'image/jpeg'};base64,${Buffer.from(await upstream.arrayBuffer()).toString('base64')}`;
  }
  return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#fff',color:'#000'}}>
    {source ? <img src={source} alt="" width={1200} height={630} style={{objectFit:'cover',objectPosition:'center'}} /> : <div style={{display:'flex',fontSize:100,fontWeight:400}}>Brito</div>}
  </div>,{width:1200,height:630,headers:{'Cache-Control':'public, max-age=300, s-maxage=300'}});
}
