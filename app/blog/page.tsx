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
  {
    id: 102,
    slug: 'helios-700-review',
    title: 'Helios 700 - რატომ არის ეს სკანერი საუკეთესო არჩევანი?',
    excerpt:
      'Eighteeth Helios 700 არის ინტრაორალური სკანერი, რომელიც აერთიანებს სიზუსტეს, სისწრაფეს, AI ტექნოლოგიას და უფასო პროგრამულ განახლებებს.',
    date: '2 თებერვალი, 2026',
    image: '/images/helios700.png',
    category: 'ტექნოლოგიები',
    tags: ['Helios 700', 'Eighteeth', 'ინტრაორალური სკანერი', 'ციფრული სტომატოლოგია'],
    readTime: '5 წთ',
    baseViews: 1300,
  },
  {
    id: 103,
    slug: 'e-connect-s-plus-review',
    title: 'E-Connect S+ - რატომ არის ეს ენდომოტორი შეუცვლელი?',
    excerpt:
      'Eighteeth E-Connect S+ აერთიანებს brushless ძრავს, ინტეგრირებულ აპექს ლოკატორს, როტაციისა და რეციპროკაციის რეჟიმებს და კომფორტულ ერგონომიკას.',
    date: '2 თებერვალი, 2026',
    image: '/images/econnectsplus.png',
    category: 'ენდოდონტია',
    tags: ['E-Connect S+', 'Eighteeth', 'ენდომოტორი', 'აპექს ლოკატორი'],
    readTime: '5 წთ',
    baseViews: 1600,
  },
];

const ARTICLES_PER_PAGE = 9;
const PINNED_BLOG_SLUGS = [
  'eighteeth-sidelab-p1-chairside-3d-printer',
  'eighteeth-onefit-intraoral-sensor-positioner',
  'eighteeth-ultrajet-s3-air-polisher-ultrasonic-scaler',
  'sterilizaciis-kutxis-mowyoba-klinikashi',
  'low-speed-handpiece-guide',
  'endo-files-selection-guide',
  'eighteeth-e-xtreme-mini-endo-motor',
  'eighteeth-curingpen-x-led-curing-light',
  'eighteeth-nanopix-e-13-digital-sensor',
  'eighteeth-e-sanit-autoclave-steam-sterilizer',
  'soga-ilaser-plus-3-wavelength-diode-laser',
  'eighteeth-hyperlight-a-portable-x-ray',
  'acuvision-x1-dental-microscope',
  'gsa-congress-2026-medical-line',
  'perio-edu-tskaltubo-conference-2026',
  'acuvision-x-endo-microscope-guide',
];

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const pinnedBlogArticles = blogArticles.filter((article) =>
    PINNED_BLOG_SLUGS.includes(article.slug),
  );
  const featuredSlugs = new Set([...featuredArticles, ...pinnedBlogArticles].map((article) => article.slug));
  const allArticles = [
    ...featuredArticles,
    ...pinnedBlogArticles,
    ...blogArticles.filter((article) => !featuredSlugs.has(article.slug)),
  ];
  const totalPages = Math.ceil(allArticles.length / ARTICLES_PER_PAGE);
  const requestedPage = Number.parseInt(page || '1', 10);
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const visibleArticles = allArticles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);

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
      <BlogClient
        blogArticles={visibleArticles}
        currentPage={currentPage}
        totalPages={totalPages}
      />
    </>
  );
}
