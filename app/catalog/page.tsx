import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import CatalogClient from './CatalogClient'; 
import { products as part1 } from './data-part1';
import { products as part2 } from './data-part2';

// 1. ფუნქცია, რომელიც აერთიანებს მხოლოდ ლოკალურ მონაცემებს
function getAllProducts() {
  // რადგან Sanity აღარ გვაქვს, ვიყენებთ მხოლოდ მანუალურ პროდუქტებს
  return [...part1, ...part2];
}

// 2. SEO და Metadata გენერაცია
export async function generateMetadata({ searchParams }: { searchParams: any }): Promise<Metadata> {
  const sp = await searchParams;
  const productSlug = sp.product;
  
  const allProducts = getAllProducts();
  const product = allProducts.find((p) => p.slug === productSlug);

  if (product) {
    return {
      title: `${product.name} | Medical Line Georgia`,
      description: product.description,
      openGraph: {
        title: `${product.name} - დეტალური ინფორმაცია`,
        images: [{ url: product.img.startsWith('http') ? product.img : `https://medicalline.ge${product.img}` }],
      },
    };
  }

  return {
    title: "პროდუქციის კატალოგი | Medical Line Georgia",
    description: "უმაღლესი ხარისხის სტომატოლოგიური აპარატურა.",
  };
}

// 3. მთავარი გვერდის კომპონენტი
export default async function CatalogPage() {
  const allProducts = getAllProducts();

  return (
    <main className="min-h-screen bg-slate-50 py-24 px-6 font-sans text-slate-900 uppercase">
      <Suspense fallback={<div className="h-screen flex items-center justify-center font-bold text-slate-400">იტვირთება...</div>}>
        <CatalogClient initialProducts={allProducts} />
      </Suspense>
    </main>
  );
}