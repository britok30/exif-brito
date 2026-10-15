import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/seo/site';
export default function robots(): MetadataRoute.Robots {
  return { rules:[
    {userAgent:'*',allow:['/','/api/image/'],disallow:['/admin/','/sign-in','/api/','/live',
      // Stacked filters (two or more parameters) and the layout switch: unbounded
      // combinations of one gallery. Single-filter pages like /?camera=… stay open.
      '/*?*&','/*?view=']},
    // No AI use of these personal photographs: training, assistants or AI search.
    // Cloudflare's WAF also blocks these user agents outright; Google-Extended and
    // Applebot-Extended are robots-only tokens (they opt the search crawlers'
    // fetches out of AI training) and can only be expressed here.
    {userAgent:['Amazonbot','Applebot-Extended','Bytespider','CCBot','ChatGPT-User','Claude-SearchBot','Claude-User','Claude-Web','ClaudeBot','anthropic-ai',
      'CloudflareBrowserRenderingCrawler','cohere-ai','cohere-training-data-crawler','Diffbot','DuckAssistBot','FacebookBot','Gemini-Deep-Research','Google-CloudVertexBot',
      'Google-Extended','GPTBot','ImagesiftBot','img2dataset','meta-externalagent','meta-externalfetcher','MistralAI-User','OAI-SearchBot','omgili','PerplexityBot',
      'Perplexity-User','Timpibot','YouBot','AI2Bot','Kangaroo Bot','PanguBot'],disallow:'/'},
  ],sitemap:absoluteUrl('/sitemap.xml') };
}
