import { MetadataRoute } from 'next';
import { products as part1 } from './catalog/data-part1';
import { products as part2 } from './catalog/data-part2';
import { blogArticles } from './blog/blogData';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://medicalline.ge';
  const allProducts = [...part1, ...part2];

  // 1. მთავარი სტატიკური გვერდები
  const staticUrls: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/catalog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/service`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/gallery`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/rchevebi`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  // 2. კატალოგის პროდუქტები
  const productUrls: MetadataRoute.Sitemap = allProducts.map((product) => ({
    url: `${baseUrl}/catalog/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // 3. ბლოგ სტატიები (blogData.ts + dedicated folder pages)
  const blogDataUrls: MetadataRoute.Sitemap = blogArticles.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  // 4. dedicated folder-based ბლოგ გვერდები (blogData-ში არ არის)
  const dedicatedBlogUrls: MetadataRoute.Sitemap = [
    'airpex-review',
    'dentaluri-tomografia-cbct-fasi',
    'e-connect-s-plus-review',
    'eighteeth-oficialuri-warmomadgeneli',
    'endomotori-apeks-lokatorit',
    'finscan-installations',
    'gdda-expo-2025',
    'helios-700-review',
    'how-to-choose-dental-chair',
    'intraoraluri-skaneri-vs-anabechdi',
    'loupes-guide',
    'rentgen-licenzireba-saqartveloshi',
    'rogor-avirchiot-intraoraluri-skaneri',
    'supplier-guide',
  ]
    .filter((slug) => !blogArticles.find((p) => p.slug === slug)) // duplicates-ის გამორიცხვა
    .map((slug) => ({
      url: `${baseUrl}/blog/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));

  return [...staticUrls, ...productUrls, ...blogDataUrls, ...dedicatedBlogUrls];
}
