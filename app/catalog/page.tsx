import React, { Suspense } from 'react';
import type { Metadata, ResolvingMetadata } from 'next';
import CatalogClient from './CatalogClient'; 
import { products as part1 } from './data-part1';
import { products as part2 } from './data-part2';
import { client } from '@/sanity/client'; 

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// 1. ფუნქცია, რომელიც აერთიანებს მონაცემებს ორივე წყაროდან
async function getAllProducts() {
  const manualProducts = [...part1, ...part2];
  let sanityProducts = [];
  
  try {
    sanityProducts = await client.fetch(`*[_type == "product"]{
      "id": _id,
      name,
      price,
      "slug": name, 
      "img": image.asset->url,
      "cat": "სხვა", 
      "description": "აღწერა დაემატება Sanity-დან"
    }`);
  } catch (error) {
    console.error("Sanity fetch error:", error);
  }

  // Sanity-ს პროდუქტებს ვაყენებთ წინ, რომ ახალი დამატებული პირველი გამოჩნდეს
  return [...sanityProducts, ...manualProducts];
}

// 2. SEO და Metadata გენერაცია
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const productSlug = sp.product;
  
  const allProducts = await getAllProducts();
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
  const allProducts = await getAllProducts();

  return (
    <main className="min-h-screen bg-slate-50 py-24 px-6 font-sans text-slate-900 uppercase">
      <Suspense fallback={<div className="h-screen flex items-center justify-center font-bold text-slate-400">იტვირთება...</div>}>
        {/* გადავაწოდოთ სრული სია CatalogClient-ს */}
        <CatalogClient initialProducts={allProducts} />
      </Suspense>
    </main>
  );
}