import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import CatalogClient from './CatalogClient';
import { products as part1 } from './data-part1';
import { products as part2 } from './data-part2';
import { absoluteUrl, buildPageMetadata, siteConfig } from '@/app/lib/seo';

function getAllProducts() {
  return [...part1, ...part2];
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const productSlug = params.product;
  const allProducts = getAllProducts();
  const product = allProducts.find((item) => item.slug === productSlug);

  if (product) {
    return buildPageMetadata({
      path: `/catalog?product=${product.slug}`,
      title: `${product.name} | Catalog`,
      description: product.description,
      image: product.img,
      keywords: [product.cat, product.name],
    });
  }

  return buildPageMetadata({
    path: '/catalog',
    title: 'Catalog | Medical Line',
    description:
      'იხილეთ Medical Line Georgia-ს კატალოგი: ინტრაორალური სკანერები, ენდომოტორები, CBCT სისტემები, მიკროსკოპები და სხვა სტომატოლოგიური აპარატურა.',
    keywords: ['dental catalog georgia', 'სტომატოლოგიური კატალოგი', 'dental equipment'],
  });
}

export default async function CatalogPage() {
  const allProducts = getAllProducts();

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Medical Line Catalog',
    url: absoluteUrl('/catalog'),
    description:
      'სტომატოლოგიური აპარატურის კატალოგი ინტრაორალური სკანერებით, CBCT-ებით, ენდომოტორებით და სხვა მოწყობილობებით.',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: allProducts.slice(0, 20).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(`/catalog/${product.slug}`),
        name: product.name,
      })),
    },
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
    },
  };

  return (
    <main className="min-h-screen bg-slate-50 py-24 px-6 font-sans text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <Suspense fallback={<div className="h-screen flex items-center justify-center font-bold text-slate-400">იტვირთება...</div>}>
        <CatalogClient initialProducts={allProducts} />
      </Suspense>
    </main>
  );
}
