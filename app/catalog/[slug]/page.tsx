import React from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { products as part1 } from '../data-part1';
import { products as part2 } from '../data-part2';
import { Metadata } from 'next';

const allProducts = [...part1, ...part2];

// 1. ეს ფუნქცია Google-ს ეუბნება ყველა პროდუქტის ლინკს წინასწარ
export async function generateStaticParams() {
  return allProducts.map((product) => ({
    slug: product.slug,
  }));
}

// 2. დინამიური SEO თითოეული პროდუქტისთვის
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = await params;
  const product = allProducts.find((p) => p.slug === slug);
  
  if (!product) return { title: 'პროდუქტი არ მოიძებნა' };

  return {
    title: `${product.name} | Medical Line Georgia`,
    description: product.description,
    openGraph: {
      images: [product.img],
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const product = allProducts.find((p) => p.slug === slug);

  if (!product) notFound();

  return (
    <main className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* პროდუქტის სურათი */}
        <div className="relative h-[400px] bg-slate-50 rounded-[3rem] overflow-hidden p-10">
          <Image 
            src={product.img} 
            alt={product.name} 
            fill 
            className="object-contain p-8"
          />
        </div>

        {/* პროდუქტის ინფო */}
        <div>
          <span className="text-blue-600 font-black uppercase tracking-widest text-xs">
            {product.category}
          </span>
          <h1 className="text-4xl font-black text-slate-900 mt-4 mb-6 uppercase italic">
            {product.name}
          </h1>
          <p className="text-slate-600 leading-relaxed text-lg mb-8">
            {product.description}
          </p>
          <div className="bg-slate-900 text-white p-6 rounded-2xl inline-block font-bold">
            კოდი: {product.id}
          </div>
        </div>
      </div>
    </main>
  );
}