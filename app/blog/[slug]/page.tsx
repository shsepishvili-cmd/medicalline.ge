import { notFound } from 'next/navigation';
import { blogArticles } from '../blogData';
import BlogContent from './BlogContent';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogArticles.find((p) => p.slug === slug);
  if (!post) return { title: 'სტატია ვერ მოიძებნა | Medical Line' };

  const absoluteImage = post.image.startsWith('http')
    ? post.image
    : `https://medicalline.ge${post.image}`;

  return {
    title: `${post.title} | Medical Line`,
    description: post.excerpt,
    alternates: {
      canonical: `https://medicalline.ge/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://medicalline.ge/blog/${slug}`,
      siteName: 'Medical Line Georgia',
      type: 'article',
      publishedTime: post.date,
      images: [
        {
          url: absoluteImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [absoluteImage],
    },
  };
}

export function generateStaticParams() {
  return blogArticles.map((post) => ({ slug: post.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogArticles.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  return <BlogContent post={post!} />;
}
