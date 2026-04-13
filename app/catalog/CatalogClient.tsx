"use client";

import React, { useState } from 'react';
import { ArrowLeft, Search, CreditCard } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { trackEvent } from '@/app/lib/analytics';

interface AiFeature {
  icon: string;
  title: string;
  desc: string;
}

interface Product {
  id: number;
  slug: string;
  name: string;
  img: string;
  cat: string;
  description: string;
  specs?: string[];
  aiFeatures?: AiFeature[];
  price?: number | string;
}

export default function CatalogClient({ initialProducts }: { initialProducts: Product[] }) {
  const [filter, setFilter] = useState('ყველა');
  const [searchQuery, setSearchQuery] = useState('');

  const products = initialProducts || [];

  const categories = ['ყველა', ...Array.from(new Set(products.map(p => p.cat).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const matchesFilter = filter === 'ყველა' || p.cat === filter;

    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) return matchesFilter;

    const matchesSearch =
      (p.name && p.name.toLowerCase().includes(searchLower)) ||
      (p.cat && p.cat.toLowerCase().includes(searchLower)) ||
      (p.description && p.description.toLowerCase().includes(searchLower));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header & Search სექცია */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-40 py-4">
        <Link href="/" className="flex items-center gap-2 text-slate-500 font-bold hover:text-blue-600 transition underline decoration-2">
          <ArrowLeft size={20}/> მთავარზე
        </Link>
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase">კატალოგი</h1>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="მოძებნე (მაგ: ენდომოტორი)..."
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white shadow-xl focus:ring-2 focus:ring-blue-500 font-bold text-sm outline-none text-slate-900"
            value={searchQuery}
            onChange={(e) => {
              const nextValue = e.target.value;
              setSearchQuery(nextValue);
              if (nextValue.trim().length >= 2) {
                trackEvent('catalog_search', { query: nextValue.trim() });
              }
            }}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-3 mb-16">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => {
              setFilter(c);
              trackEvent('catalog_filter_select', { category: c });
            }}
            className={`px-6 py-2 rounded-full font-black text-[10px] tracking-widest uppercase transition-all ${filter === c ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((item) => (
            <div key={item.id || item.slug} className="group bg-white rounded-[2.5rem] p-6 border border-slate-100 hover:shadow-2xl transition-all flex flex-col items-center overflow-hidden relative">

              <Link href={`/catalog/${item.slug}`} onClick={() => trackEvent('product_card_click', { product_name: item.name, product_category: item.cat, cta_location: 'catalog_grid' })} className="cursor-pointer w-full flex flex-col items-center h-full">
                <div className="relative w-full h-48 mb-6 flex items-center justify-center bg-slate-50 rounded-[2rem] p-4 overflow-hidden">
                  <Image
                    src={item.img}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    className="object-contain group-hover:scale-110 transition-transform duration-700 p-4"
                  />
                </div>
                <div className="w-full text-center mb-6 px-2 flex-grow">
                  <span className="text-[9px] font-black text-blue-600 block mb-3 bg-blue-50 border border-blue-100 w-max mx-auto px-3 py-1.5 rounded-full tracking-widest uppercase">
                    {item.cat || 'პროდუქცია'}
                  </span>
                  <h3 className="text-base font-black text-slate-900 leading-snug min-h-[2.5rem] flex items-center justify-center text-center">
                    {item.name}
                  </h3>
                  {item.price && <p className="text-blue-600 font-black mt-2">{item.price} ₾</p>}
                </div>
              </Link>

              <div className="w-full grid grid-cols-2 gap-2 mt-auto relative z-10">
                <Link href={`/catalog/${item.slug}`} onClick={() => trackEvent('product_card_click', { product_name: item.name, product_category: item.cat, cta_location: 'catalog_button' })} className="flex items-center justify-center py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] hover:bg-blue-600 transition uppercase text-center">
                  ნახვა
                </Link>
                <a href="https://ganvadeba.credo.ge/account/landing/authorization" target="_blank" rel="noopener noreferrer" onClick={() => trackEvent('financing_click', { product_name: item.name, product_category: item.cat, cta_location: 'catalog_grid' })} className="flex items-center justify-center py-3 bg-orange-500 text-white rounded-xl font-black text-[9px] shadow-lg hover:bg-orange-600 transition uppercase text-center">
                  <CreditCard size={12} className="mr-1"/> განვადება
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <p className="text-slate-400 font-bold uppercase tracking-widest">პროდუქტი ვერ მოიძებნა</p>
          </div>
        )}
      </div>
    </div>
  );
}
