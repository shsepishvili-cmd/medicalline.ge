import { blogArticles } from './blogData';
import BlogClient from './BlogClient';
import { buildPageMetadata, siteConfig } from '@/app/lib/seo';

export const metadata = buildPageMetadata({
  path: '/blog',
  title: 'Blog | Medical Line',
  description:
    'Medical Line Georgia-ს ბლოგში ნახავთ სტატიებს სტომატოლოგიურ აპარატურაზე, ციფრულ სტომატოლოგიაზე, კლინიკის მართვაზე და პროდუქტის მიმოხილვებზე.',
  keywords: ['dental blog georgia', 'სტომატოლოგიური ბლოგი', 'Medical Line blog'],
});

export default function BlogPage() {
  const blogSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${siteConfig.name} Blog`,
    description:
      'სტატიები სტომატოლოგიურ აპარატურაზე, ციფრულ სტომატოლოგიაზე და კლინიკური პრაქტიკის გაუმჯობესებაზე.',
    url: `${siteConfig.url}/blog`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <BlogClient blogArticles={blogArticles} />
    </>
  );
}
