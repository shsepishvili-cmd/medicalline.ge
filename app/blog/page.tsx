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

const featuredArticles = [
  {
    id: 22,
    slug: 'orion-kit-digital-implant-solution',
    title: 'Orion Kit: ციფრული იმპლანტაციის workflow Helios სკანერთან ერთად',
    excerpt:
      'Eighteeth Orion Kit აერთიანებს Helios ინტრაორალურ სკანირებასა და 3D ფოტოგრამეტრიის პრინციპებზე დაფუძნებულ იმპლანტის მონაცემების აღებას ერთ სამუშაო პროცესში.',
    date: '12 მაისი, 2026',
    image: '/images/helios700.png',
    category: 'ციფრული სტომატოლოგია',
    tags: ['Orion Kit', 'Eighteeth', 'Helios 700', 'ციფრული იმპლანტაცია'],
    readTime: '7 წთ',
    baseViews: 900,
  },
];

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
      <BlogClient blogArticles={[...featuredArticles, ...blogArticles]} />
    </>
  );
}
