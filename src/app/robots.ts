import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/seo/site';
export default function robots(): MetadataRoute.Robots {
  return { rules:[
    {userAgent:'*',allow:['/','/api/image/'],disallow:['/admin/','/sign-in','/api/']},
    // Also retain these preferences at the origin, outside Cloudflare's managed robots response.
    {userAgent:['Amazonbot','Applebot-Extended','Bytespider','CCBot','ClaudeBot','CloudflareBrowserRenderingCrawler','Google-Extended','GPTBot','meta-externalagent'],disallow:'/'},
  ],sitemap:absoluteUrl('/sitemap.xml') };
}
