import type { MetadataRoute } from 'next';
import { products as part1 } from './catalog/data-part1';
import { products as part2 } from './catalog/data-part2';
import { blogArticles } from './blog/blogData';
import { absoluteUrl } from './lib/seo';

const allProducts = [...part1, ...part2];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = [
    '/',
    '/about',
    '/blog',
    '/catalog',
    '/contact',
    '/engineer',
    '/gallery',
    '/game',
    '/rchevebi',
    '/service',
  ];

  const staticUrls: MetadataRoute.Sitemap = staticRoutes.map((path, index) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: index === 0 ? 1 : path === '/catalog' || path === '/blog' ? 0.9 : 0.7,
  }));

  const productUrls: MetadataRoute.Sitemap = allProducts.map((product) => ({
    url: absoluteUrl(`/catalog/${product.slug}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const blogUrls: MetadataRoute.Sitemap = blogArticles.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  const gameUrls: MetadataRoute.Sitemap = [
    '/game/endo-rescue',
    '/game/scanner-rush',
    '/game/xray-alignment',
  ].map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticUrls, ...productUrls, ...blogUrls, ...gameUrls];
}
