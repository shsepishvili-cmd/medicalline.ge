'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Clock, Calendar } from 'lucide-react';

export default function BlogContent({ post }: { post: any }) {
  return (
    <article className="min-h-screen bg-white pb-20">
      <nav className="py-6 px-6 border-b sticky top-0 bg-white z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/blog" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors">
            <ArrowLeft size={20} /> ბლოგზე დაბრუნება
          </Link>
        </div>
      </nav>

      <header className="max-w-4xl mx-auto px-6 pt-12">
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
          {post.title}
        </h1>
        <div className="flex gap-6 text-slate-400 text-sm mb-12 border-b pb-6">
          <span className="flex items-center gap-1"><Calendar size={16}/> {post.date}</span>
          <span className="flex items-center gap-1"><Clock size={16}/> {post.readTime}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6">
        <div className="relative h-[300px] md:h-[500px] w-full rounded-3xl overflow-hidden mb-12 shadow-xl">
          <Image 
            src={post.image || '/images/cover.png'} 
            alt={post.title} 
            fill 
            className="object-cover" 
            priority 
          />
        </div>

        <div 
          className="prose prose-slate prose-lg max-w-none prose-headings:text-slate-900 prose-p:text-slate-600"
          dangerouslySetInnerHTML={{ __html: post.content }} 
        />
      </div>
    </article>
  );
}