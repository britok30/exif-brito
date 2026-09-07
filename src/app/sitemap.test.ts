import { expect,it,vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
const mocks=vi.hoisted(()=>({select:vi.fn(),conditions:[] as unknown[]}));
vi.mock('@/db',async()=>({...await import('@/db/schema'),db:{select:mocks.select}}));
vi.mock('@/photo/url',()=>({imagePath:()=>'/api/image/photos/thumb/example.jpg'}));
import sitemap from './sitemap';
function query(rows:unknown[]){const chain:Record<string,unknown>={};for(const method of ['from','innerJoin'])chain[method]=()=>chain;chain.where=(condition:unknown)=>{mocks.conditions.push(condition);return Promise.resolve(rows);};return chain;}
it('lists only published photo and nonempty collection URLs, deduplicating collections and including images',async()=>{
 mocks.select.mockReturnValueOnce(query([{id:'abcdefgh',url:'original',thumbnailUrl:'thumbnail',updatedAt:null}])).mockReturnValueOnce(query([{slug:'rome',updatedAt:null},{slug:'rome',updatedAt:null}]));
 const entries=await sitemap();
 expect(entries.map(p=>p.url)).toEqual(['https://www.kelbrxto.com/','https://www.kelbrxto.com/collections','https://www.kelbrxto.com/collections/rome','https://www.kelbrxto.com/p/abcdefgh']);
 expect(entries.at(-1)?.images).toEqual(['https://www.kelbrxto.com/api/image/photos/thumb/example.jpg']);
 for(const condition of mocks.conditions){const sql=new PgDialect().sqlToQuery(condition as Parameters<PgDialect['sqlToQuery']>[0]);expect(sql.sql).toContain('"photos"."hidden" =');expect(sql.sql).toContain('"photos"."hidden" is null');expect(sql.params).toContain(false);}
});
