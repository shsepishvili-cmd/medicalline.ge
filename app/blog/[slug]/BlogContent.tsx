'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { ArrowLeft, Clock, Calendar, Share2, Facebook, X, MessageSquare, Phone, Eye } from 'lucide-react';
import { blogArticles } from '../blogData';

export default function BlogContent({ post }: { post: any }) {
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [viewCount, setViewCount] = useState<number | null>(null);

  const handleShare = () => {
    if (typeof window === 'undefined') return;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(facebookUrl, 'fbShare', 'width=600,height=400');
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowShareTooltip(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).FB) {
      (window as any).FB.XFBML.parse();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch(`/api/analytics/blog-views/${post.slug}`, { cache: 'no-store' })
        .then((response) => response.json())
        .then((payload) => {
          if (!cancelled && payload?.ok) {
            setViewCount(Number(payload.views || 0));
          }
        })
        .catch(() => {});
    }, 700);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [post.slug]);

  const pageUrl = typeof window !== 'undefined'
    ? window.location.href
    : `https://medicalline.ge/blog/${post.slug}`;
  const relatedArticles = blogArticles
    .filter((article: any) => article.slug !== post.slug)
    .slice(0, 3);

  return (
    <article className="min-h-screen bg-white pb-20">
      {/* Facebook SDK */}
      <div id="fb-root"></div>
      <Script
        id="facebook-sdk"
        async
        defer
        crossOrigin="anonymous"
        src="https://connect.facebook.net/ka_GE/sdk.js#xfbml=1&version=v19.0"
        strategy="lazyOnload"
      />

      {/* Floating Share Button */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2">
        <div className={`bg-slate-900 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-lg transition-all duration-500 ${showShareTooltip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          გააზიარე!
          <button onClick={() => setShowShareTooltip(false)} className="ml-2 opacity-50 hover:opacity-100"><X size={12} /></button>
        </div>
        <button
          onClick={handleShare}
          onMouseEnter={() => setShowShareTooltip(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group"
        >
          <Share2 size={22} className="group-hover:hidden" />
          <Facebook size={22} className="hidden group-hover:block" />
        </button>
      </div>

      {/* Nav */}
      <nav className="py-6 px-6 border-b sticky top-0 bg-white z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/blog" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold">
            <ArrowLeft size={20} /> ბლოგზე დაბრუნება
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="max-w-4xl mx-auto px-6 pt-12">
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-block">
          {post.category}
        </span>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
          {post.title}
        </h1>
        <div className="flex gap-6 text-slate-400 text-sm mb-12 border-b pb-6">
          <span className="flex items-center gap-1"><Calendar size={16} /> {post.date}</span>
          <span className="flex items-center gap-1"><Clock size={16} /> {post.readTime}</span>
          <span className="flex items-center gap-1"><Eye size={16} /> {viewCount ?? post.baseViews ?? 0}</span>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6">
        <div className={post.imageFit === 'contain-full'
          ? 'relative w-full aspect-video rounded-3xl overflow-hidden mb-12 bg-white border border-slate-200 flex items-center justify-center'
          : 'relative h-[220px] md:h-[360px] w-full rounded-3xl overflow-hidden mb-12 bg-slate-100 flex items-center justify-center'}>
          <Image
            src={post.image || '/images/cover.png'}
            alt={post.title}
            fill
            className={post.imageFit === 'cover' ? 'object-cover p-0' : post.imageFit === 'contain-full' ? 'object-contain p-0' : 'object-contain p-6'}
            priority
          />
        </div>

        <div
          className="blog-content max-w-none text-slate-700 leading-relaxed text-base"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-8 md:p-12 text-center">
          <p className="text-blue-300 text-xs font-black uppercase tracking-widest mb-3">Medical Line Georgia</p>
          <h3 className="text-2xl md:text-3xl font-black text-white mb-4">გაინტერესებთ ეს პროდუქცია?</h3>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">დაგვიკავშირდით კონსულტაციისთვის ან ეწვიეთ ჩვენს კატალოგს</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/995514011116"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-[#25D366] text-white font-black rounded-2xl hover:bg-green-500 transition shadow-lg"
            >
              <Phone size={18} /> WhatsApp კონსულტაცია
            </a>
            <Link
              href="/catalog"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-black rounded-2xl hover:bg-white/20 transition border border-white/20"
            >
              კატალოგი
            </Link>
          </div>
        </div>

        {relatedArticles.length > 0 && (
          <section className="mt-16 pt-12 border-t border-slate-200">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-blue-600 text-xs font-black uppercase tracking-widest mb-2">Medical Line Blog</p>
                <h3 className="text-2xl font-black text-slate-900">სხვა სტატიები</h3>
              </div>
              <Link href="/blog" className="text-sm font-black text-blue-600 hover:text-blue-800 transition-colors">
                ყველა სტატია
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {relatedArticles.map((article: any) => (
                <Link
                  href={`/blog/${article.slug}`}
                  key={article.id}
                  className="group rounded-2xl border border-slate-200 overflow-hidden bg-white hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                    <Image
                      src={article.image || '/images/placeholder.jpg'}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      unoptimized
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400 mb-3">
                      <span className="flex items-center gap-1"><Calendar size={13} /> {article.date}</span>
                      <span className="flex items-center gap-1"><Clock size={13} /> {article.readTime}</span>
                    </div>
                    <h4 className="text-base font-black text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h4>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Facebook Comments */}
        <div className="mt-16 pt-12 border-t border-slate-200">
          <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
            <MessageSquare className="text-blue-600" /> კომენტარები
          </h3>
          <div className="bg-slate-50 p-4 rounded-3xl">
            <div
              className="fb-comments"
              data-href={pageUrl}
              data-width="100%"
              data-numposts="5"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
