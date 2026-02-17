import { MetadataRoute } from 'next';
// მონაცემების იმპორტი შენი კატალოგის ფაილებიდან
// (დარწმუნდი, რომ გზა სწორია. თუ data-part ფაილები catalog საქაღალდეშია, ასე იქნება:)
import { products as part1 } from './catalog/data-part1'; 
import { products as part2 } from './catalog/data-part2';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://medicalline.ge';
  const allProducts = [...part1, ...part2];

  // 1. დინამიური პროდუქტების ლინკები ავტომატურად
  const productUrls = allProducts.map((product) => ({
    url: `${baseUrl}/catalog/${product.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const, // Google-ს ვეუბნებით, რომ კვირაში ერთხელ შეამოწმოს
    priority: 0.9, // მაღალი პრიორიტეტი SEO-სთვის
  }));

  // 2. სტატიკური/მთავარი გვერდები
  const staticUrls = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0, // ყველაზე მთავარი გვერდი
    },
    {
      url: `${baseUrl}/catalog`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }
  ];

  // ვაერთიანებთ მთავარ გვერდებს და პროდუქტებს ერთ რუკად
  return [...staticUrls, ...productUrls];
}