import { notFound } from 'next/navigation';
import { blogArticles } from '../blogData'; 
import BlogContent from './BlogContent';

// ეს ფუნქცია არეგულირებს SEO-ს (სათაურს და აღწერას)
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = blogArticles.find((p) => p.slug === params.slug);
  if (!post) return { title: 'სტატია ვერ მოიძებნა | Medical Line' };
  
  return { 
    title: `${post.title} | Medical Line`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    }
  };
}

// ეს ფუნქცია აგენერირებს ყველა ბლოგ პოსტს წინასწარ, რომ სწრაფი იყოს
export function generateStaticParams() {
  return blogArticles.map((post) => ({ slug: post.slug }));
}

// მთავარი გვერდი
export default function Page({ params }: { params: { slug: string } }) {
  const post = blogArticles.find((p) => p.slug === params.slug);
  
  if (!post) {
    notFound(); // თუ არასწორ ლინკზე შევიდა, 404 გვერდზე გადააგდებს
  }
  
  return <BlogContent post={post} />;
}