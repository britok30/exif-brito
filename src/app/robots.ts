import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/seo/site';
export default function robots(): MetadataRoute.Robots {
  return { rules:{userAgent:'*',allow:['/','/api/image/'],disallow:['/admin/','/sign-in','/api/']},sitemap:absoluteUrl('/sitemap.xml') };
}
