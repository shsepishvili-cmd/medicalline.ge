import React from 'react';
import type { Metadata } from 'next';
import BlogClient from './BlogClient'; // ჩვენი ახალი კომპონენტი

// ✅ აი ეს არის მთავარი SEO-სთვის!
export const metadata: Metadata = {
  title: 'ბლოგი და სიახლეები | Medical Line Georgia',
  description: 'უახლესი სტატიები სტომატოლოგიურ აპარატურაზე: Eighteeth, ავტოკლავები, სკანერები და ექიმების რჩევები.',
  keywords: ['სტომატოლოგიური ბლოგი', 'Eighteeth', 'რენტგენი', 'სკანერი', 'Medical Line'],
};

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-24 uppercase">
      {/* აქ ვტვირთავთ კლიენტის ნაწილს */}
      <BlogClient />
    </main>
  );
}