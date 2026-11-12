"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { ChevronLeft, ChevronRight, Clock, Calendar, ArrowLeft } from 'lucide-react';

type BlogClientProps = {
  blogArticles: any[];
  currentPage: number;
  totalPages: number;
};

export default function BlogClient({ blogArticles, currentPage, totalPages }: BlogClientProps) {
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).FB) {
      (window as any).FB.XFBML.parse();
    }
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      <nav className="py-6 px-6 bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeft size={20} /> მთავარი გვერდი
          </Link>
          <h1 className="text-xl font-black text-slate-800 tracking-wider">MEDICAL LINE BLOG</h1>
        </div>
      </nav>

      <header className="py-16 px-6 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6 text-slate-900 uppercase italic">სიახლეები და სტატიები</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            პროფესიული რჩევები, ტექნოლოგიური მიმოხილვები და სიახლეები თანამედროვე სტომატოლოგიისთვის.
          </p>
        </div>
      </header>

      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogArticles && blogArticles.map((post: any) => (
            <Link 
              href={`/blog/${post.slug}`} 
              key={post.id}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                <Image 
                  src={post.image || '/images/placeholder.jpg'} 
                  alt={post.title} 
                  fill 
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 mb-3">
                  <span className="flex items-center gap-1"><Calendar size={14}/> {post.date}</span>
                  <span className="flex items-center gap-1"><Clock size={14}/> {post.readTime}</span>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-slate-500 text-sm mb-6 line-clamp-3">
                  {post.excerpt || post.description || ""}
                </p>
                <div className="flex items-center gap-1 text-blue-600 font-bold text-sm mt-auto">
                  სრულად კითხვა <ChevronRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {totalPages > 1 && (
          <nav
            aria-label="ბლოგის გვერდები"
            className="max-w-7xl mx-auto mt-12 flex flex-col items-center gap-4"
          >
            <p className="text-sm font-semibold text-slate-500">
              გვერდი {currentPage} / {totalPages}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {currentPage > 1 ? (
                <Link
                  href={currentPage === 2 ? '/blog' : `/blog?page=${currentPage - 1}`}
                  aria-label="წინა გვერდი"
                  className="inline-flex h-11 items-center gap-1 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-blue-600 hover:text-blue-600"
                >
                  <ChevronLeft size={18} /> წინა
                </Link>
              ) : (
                <span className="inline-flex h-11 cursor-not-allowed items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-400">
                  <ChevronLeft size={18} /> წინა
                </span>
              )}

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <Link
                  key={page}
                  href={page === 1 ? '/blog' : `/blog?page=${page}`}
                  aria-label={`გვერდი ${page}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                  className={`inline-flex h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-bold transition-colors ${
                    page === currentPage
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-blue-600 hover:text-blue-600'
                  }`}
                >
                  {page}
                </Link>
              ))}

              {currentPage < totalPages ? (
                <Link
                  href={`/blog?page=${currentPage + 1}`}
                  aria-label="შემდეგი გვერდი"
                  className="inline-flex h-11 items-center gap-1 rounded-md border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-blue-600 hover:text-blue-600"
                >
                  შემდეგი <ChevronRight size={18} />
                </Link>
              ) : (
                <span className="inline-flex h-11 cursor-not-allowed items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-bold text-slate-400">
                  შემდეგი <ChevronRight size={18} />
                </span>
              )}
            </div>
          </nav>
        )}
      </section>

      <section className="py-24 bg-slate-50 px-6 border-t border-slate-200 mt-16">
        <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl">
          <h3 className="text-3xl font-black mb-10 text-center">დისკუსია / გამოხმაურება</h3>
          <div id="fb-root"></div>
          <Script 
            id="facebook-jssdk"
            async 
            defer 
            crossOrigin="anonymous" 
            src="https://connect.facebook.net/ka_GE/sdk.js#xfbml=1&version=v18.0" 
            strategy="lazyOnload" 
          />
          <div className="fb-comments" data-href="https://medicalline.ge/blog" data-width="100%" data-numposts="10"></div>
        </div>
      </section>

      <footer className="py-8 flex justify-center border-t">
        <div id="top-ge-counter-container" data-site-id="118515"></div>
        <Script src="https://counter.top.ge/counter.js" strategy="afterInteractive" />
      </footer>
    </main>
  );
}
