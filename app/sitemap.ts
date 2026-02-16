import { MetadataRoute } from 'next';
import { blogArticles } from './blog/blogData'; 
import { products as part1 } from './catalog/data-part1'; 
import { products as part2 } from './catalog/data-part2';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://medicalline.ge';
  
  // ვაერთიანებთ ყველა პროდუქტს ერთ სიაში
  const allProducts = [...part1, ...part2];

  // 1. ყველა ბლოგის სტატიის გენერაცია (ავტომატურად)
  const blogUrls = blogArticles.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // 2. ყველა კატალოგის პროდუქტის გენერაცია (ავტომატურად)
  const productUrls = allProducts.map((product) => ({
    url: `${baseUrl}/catalog/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // 3. მთავარი გვერდები
  const staticPages = [
    { url: '', priority: 1, freq: 'daily' },
    { url: '/catalog', priority: 0.9, freq: 'daily' },
    { url: '/blog', priority: 0.9, freq: 'daily' },
    { url: '/gallery', priority: 0.5, freq: 'weekly' },
    { url: '/about', priority: 0.5, freq: 'monthly' },
    { url: '/contact', priority: 0.5, freq: 'monthly' },
    { url: '/service', priority: 0.6, freq: 'monthly' },
  ].map((route) => ({
    url: `${baseUrl}${route.url}`,
    lastModified: new Date(),
    changeFrequency: route.freq as any,
    priority: route.priority,
  }));

  // ვაერთიანებთ ყველაფერს ერთ დიდ მასივში
  return [...staticPages, ...blogUrls, ...productUrls];
}