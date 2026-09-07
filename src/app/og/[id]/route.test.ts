import { expect, it, vi, beforeEach } from 'vitest';
const mocks=vi.hoisted(()=>({get:vi.fn(),render:vi.fn()}));
vi.mock('@/photo/query',()=>({getPhotoById:mocks.get}));
vi.mock('@/seo/share-image',()=>({shareImage:mocks.render}));
import { GET } from './route';
const request=(id:string)=>GET(new Request('https://www.kelbrxto.com/og/'+id),{params:Promise.resolve({id})});
beforeEach(()=>{vi.clearAllMocks();mocks.render.mockResolvedValue(new Response('preview'));});
it('never renders hidden, missing, or malformed photo IDs',async()=>{
 mocks.get.mockResolvedValue({id:'abcdefgh',hidden:true});
 expect((await request('abcdefgh')).status).toBe(404);
 mocks.get.mockResolvedValue(undefined);
 expect((await request('abcdefgh')).status).toBe(404);
 expect((await request('../private')).status).toBe(404);
 expect(mocks.render).not.toHaveBeenCalled();
});
it('renders only a published photograph',async()=>{
 const photo={id:'abcdefgh',hidden:false};mocks.get.mockResolvedValue(photo);
 expect((await request('abcdefgh')).status).toBe(200);
 expect(mocks.render).toHaveBeenCalledWith(photo);
});
