import { expect, it } from 'vitest';
import { photoMetadata, publicMetadata } from './metadata';
import { serializeJsonLd, SITE_TITLE } from './site';
const photo={id:'abcdefgh',title:null,caption:null,semanticDescription:null,locationName:'Positano, SA, Italy',tags:[],hidden:false,takenAtNaive:'2025-08-19T14:32:50'};
it('gives a public photograph its own canonical and stable large social preview',()=>{
 const metadata=photoMetadata(photo);
 expect(metadata.title).toBe('Positano, Italy · 2025-08-19');
 expect(metadata.alternates?.canonical).toBe('https://www.kelbrxto.com/p/abcdefgh');
 expect(metadata.openGraph).toMatchObject({images:[{url:'https://www.kelbrxto.com/og/abcdefgh',width:1200,height:630}]});
 expect(metadata.twitter).toMatchObject({card:'summary_large_image'});
});
it('keeps hidden photographs out of indexing and social previews',()=>{
 const result=photoMetadata({...photo,hidden:true,title:'Private title',caption:'Private caption'});
 expect(result.robots).toEqual({index:false,follow:false});
 expect(JSON.stringify(result)).not.toContain('Private');
 expect(result.openGraph).toMatchObject({images:[]});
});
it('uses the canonical www host and avoids duplicating the site name in its home title',()=>{
 const result=publicMetadata({title:SITE_TITLE,description:'Journal',path:'/'});
 expect(result.title).toEqual({absolute:SITE_TITLE});
 expect(result.openGraph).toMatchObject({title:SITE_TITLE,url:'https://www.kelbrxto.com/'});
});
it('escapes user-written text before putting structured data inside a script',()=>{
 const serialized=serializeJsonLd({caption:'</script><script>alert(1)</script>'});
 expect(serialized).not.toContain('<');
 expect(JSON.parse(serialized).caption).toBe('</script><script>alert(1)</script>');
});
