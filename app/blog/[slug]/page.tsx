import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { notFound } from 'next/navigation';
import { ChevronLeft, Calendar, Clock, Eye } from 'lucide-react';
import { blogArticles } from '../blogData'; // 👈 იღებს მონაცემებს წინა საქაღალდიდან

// 1. ჯადოსნური ნაწილი: ავტომატური Facebook/SEO გაზიარება
export async function generateMetadata({ params }: { params: { slug: string } }) {
  // ვეძებთ კონკრეტულ პოსტს მისი slug-ით
  const post = blogArticles.find((p) => p.slug === params.slug);

  if (!post) {
    return { title: 'სტატია ვერ მოიძებნა' };
  }

  const description = post.excerpt || (post as any).description || 'Medical Line Blog';

  return {
    title: `${post.title} | Medical Line Blog`,
    description: description,
    openGraph: {
      title: post.title,
      description: description,
      url: `https://medicalline.ge/blog/${post.slug}`, // 👈 ავტომატურად სვამს სწორ ლინკს
      siteName: 'Medical Line Georgia',
      images: [
        {
          url: `https://medicalline.ge${post.image}`, // 👈 ავტომატურად აკეთებს სრულ ლინკს სურათისთვის
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      locale: 'ka_GE',
      type: 'article',
    },
  };
}

// 2. ვეუბნებით Next.js-ს, წინასწარ დააგენერიროს ყველა პოსტი სისწრაფისთვის
export function generateStaticParams() {
  return blogArticles.map((post) => ({
    slug: post.slug,
  }));
}

// მთავარი კომპონენტი
export default function DynamicBlogPost({ params }: { params: { slug: string } }) {
  const post = blogArticles.find((p) => p.slug === params.slug);

  if (!post) {
    notFound(); // თუ ლინკი არასწორია, გადააგდებს 404 გვერდზე
  }

  // 3. ტყუილი ნახვების გენერაცია: იღებს baseViews-ს blogData-დან და უმატებს 1-დან 150-მდე რიცხვს
  const base = post.baseViews || 1500;
  const fakeViews = base + Math.floor(Math.random() * 150);

  return (
    <article className="min-h-screen bg-white font-sans text-slate-900 pb-20 uppercase tracking-tighter">
      
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md py-4 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <Link href="/blog" className="flex items-center gap-2 font-black text-xs text-blue-600 hover:gap-4 transition-all">
            <ChevronLeft size={16} /> ბლოგზე დაბრუნება
          </Link>
          <div className="flex items-center gap-4 text-slate-400 font-black text-[10px]">
            {/* ნახვების გამოჩენა */}
            <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-blue-600">
              <Eye size={12} /> <span suppressHydrationWarning>{fakeViews}</span>
            </span>
            <span className="flex items-center gap-1"><Calendar size={12}/> {post.date}</span>
            <span className="flex items-center gap-1"><Clock size={12}/> {post.readTime}</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold mb-6 inline-block italic">
            {(post as any).category || post.tags?.[0] || 'სტატია'}
          </span>
          <h1 className="text-3xl md:text-5xl font-black leading-[1.1] mb-8 italic">
            {post.title}
          </h1>
        </div>
      </header>

      {/* Cover Image */}
      <div className="max-w-4xl mx-auto px-6 -mt-10 relative z-10">
        <div className="relative h-[300px] md:h-[450px] w-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-100">
          <Image 
            src={post.image || '/images/placeholder.jpg'} 
            alt={post.title} 
            fill 
            className="object-cover" 
            unoptimized
          />
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-3xl mx-auto px-6 py-16 text-slate-700 normal-case tracking-normal font-medium text-lg leading-relaxed">
        {/* აქ წაიკითხავს შენს HTML ტექსტს blogData.ts-დან */}
        <div 
          className="prose prose-lg prose-blue max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content || `<p>${post.excerpt || (post as any).description}</p>` }} 
        />
      </div>

      {/* 4. ინდივიდუალური Facebook კომენტარები */}
      <section className="py-20 bg-slate-50 px-6 border-t border-slate-100 mt-10">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-black mb-10 italic text-center underline decoration-blue-600 underline-offset-8">დისკუსია / კითხვები</h3>
          
          <div id="fb-root"></div>
          <Script async defer crossOrigin="anonymous" src="https://connect.facebook.net/ka_GE/sdk.js#xfbml=1&version=v18.0" strategy="afterInteractive" />
          
          {/* ❗️ აქაც ავტომატურად ჩაჯდება ამ პოსტის უნიკალური ლინკი */}
          <div 
            className="fb-comments" 
            data-href={`https://medicalline.ge/blog/${post.slug}`} 
            data-width="100%" 
            data-numposts="10">
          </div>
        </div>
      </section>

    </article>
  );
}