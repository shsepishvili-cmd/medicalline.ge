import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { blogArticles } from '../blogData';
import BlogContent from './BlogContent';
import { absoluteImageUrl, buildPageMetadata, siteConfig } from '@/app/lib/seo';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = blogArticles.find((item) => item.slug === slug);

  if (!post) {
    return buildPageMetadata({
      path: `/blog/${slug}`,
      title: 'Article Not Found | Medical Line',
      description: 'Requested blog article could not be found.',
    });
  }

  return buildPageMetadata({
    path: `/blog/${slug}`,
    title: post.title,
    description: post.excerpt,
    image: post.image,
    keywords: [post.category, ...(post.tags || [])],
    type: 'article',
  });
}

export function generateStaticParams() {
  return blogArticles.map((post) => ({ slug: post.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogArticles.find((item) => item.slug === slug);

  if (!post) {
    notFound();
  }

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: [absoluteImageUrl(post.image)],
    author: {
      '@type': 'Organization',
      name: siteConfig.name,
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      logo: {
        '@type': 'ImageObject',
        url: absoluteImageUrl('/images/ml-logo.png'),
      },
    },
    mainEntityOfPage: `${siteConfig.url}/blog/${slug}`,
    articleSection: post.category,
    keywords: (post.tags || []).join(', '),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <BlogContent post={post} />
    </>
  );
}
