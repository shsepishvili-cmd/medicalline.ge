import type { MetadataRoute } from 'next';
import { siteConfig } from './lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/clinic',
          '/dashboard',
          '/login',
          '/signup',
          '/invoice-login',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
