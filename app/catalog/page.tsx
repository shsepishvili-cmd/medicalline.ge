import React, { Suspense } from 'react';
import type { Metadata, ResolvingMetadata } from 'next';
import CatalogClient from './CatalogClient'; // იმპორტი ახალი ფაილიდან
import { products as part1 } from './data-part1';
import { products as part2 } from './data-part2';

const products = [...part1, ...part2];

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// ეს ფუნქცია აგენერირებს დინამიურ სურათს Facebook/WhatsApp-ისთვის
export async function generateMetadata(
  { searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // ველოდებით პარამეტრებს (Next.js 15-ის მოთხოვნა)
  const sp = await searchParams;
  const productSlug = sp.product;

  // ვეძებთ პროდუქტს
  const product = products.find((p) => p.slug === productSlug);

  // თუ პროდუქტი მოიძებნა, ვაბრუნებთ მის სურათს და სათაურს
  if (product) {
    // სურათის სრული URL (აუცილებელია სოციალური ქსელებისთვის)
    const imageUrl = `https://medicalline.ge${product.img}`;

    return {
      title: `${product.name} | Medical Line Georgia`,
      description: product.description,
      openGraph: {
        title: `${product.name} - დეტალური ინფორმაცია`,
        description: product.description,
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 600,
            alt: product.name,
          },
        ],
      },
    };
  }

  // თუ პროდუქტი არ არის არჩეული, ვაბრუნებთ ზოგად ინფოს
  return {
    title: "პროდუქციის კატალოგი | Medical Line Georgia",
    description: "უმაღლესი ხარისხის სტომატოლოგიური აპარატურა: ენდომოტორები, სკანერები, რენტგენები.",
  };
}

export default function CatalogPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-24 px-6 font-sans text-slate-900 uppercase">
      <Suspense fallback={<div className="h-screen flex items-center justify-center font-bold text-slate-400">იტვირთება...</div>}>
        <CatalogClient />
      </Suspense>
    </main>
  );
}