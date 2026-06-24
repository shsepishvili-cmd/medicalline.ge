import React from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { products as part1 } from '../data-part1';
import { products as part2 } from '../data-part2';
import AiButtons from './AiButtons';
import OfferAdminButton from './OfferAdminButton';
import ProductViewTracker from '@/app/components/ProductViewTracker';
import TrackedAnchor from '@/app/components/TrackedAnchor';
import { absoluteImageUrl, buildPageMetadata, siteConfig } from '@/app/lib/seo';
import {
  ArrowLeft,
  MessageCircle,
  Sparkles,
  FileText,
  ChevronRight,
} from 'lucide-react';

const allProducts = [...part1, ...part2];

async function getProduct(slug: string) {
  const decodedSlug = decodeURIComponent(slug);
  return allProducts.find((p) => p.slug === decodedSlug) || null;
}

export async function generateStaticParams() {
  return allProducts.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return buildPageMetadata({
      path: `/catalog/${slug}`,
      title: 'Product Not Found | Medical Line',
      description: 'Requested product could not be found.',
    });
  }

  return buildPageMetadata({
    path: `/catalog/${product.slug}`,
    title: `${product.name} | ${product.cat}`,
    description: product.description,
    image: product.img,
    keywords: [product.name, product.cat, ...(product.specs || []).slice(0, 3)],
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    category: product.cat,
    image: [absoluteImageUrl(product.img)],
    brand: {
      '@type': 'Brand',
      name: 'Eighteeth',
    },
    sku: String(product.id),
    url: `${siteConfig.url}/catalog/${product.slug}`,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'GEL',
      seller: {
        '@type': 'Organization',
        name: siteConfig.name,
      },
      url: `${siteConfig.url}/catalog/${product.slug}`,
    },
  };

  return (
    <main className="min-h-screen bg-white pt-24 pb-20 px-4 md:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <ProductViewTracker productName={product.name} productCategory={product.cat} />

      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/catalog" className="inline-flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
            <ArrowLeft size={16} /> Back to Catalog
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="relative aspect-square bg-[#F8FAFC] rounded-[4rem] flex items-center justify-center p-12 overflow-hidden border border-slate-50">
            <div className="relative w-full h-full">
              <Image src={product.img} alt={product.name} fill className="object-contain" priority />
            </div>
          </div>

          <div className="flex flex-col pt-4">
            <div className="mb-8">
              <span className="text-blue-600 font-black uppercase tracking-widest text-[10px] block mb-4">EIGHTEETH | {product.cat}</span>
              <h1 className="text-4xl md:text-6xl font-black text-[#1E293B] mb-4 uppercase italic tracking-tighter">{product.name}</h1>
              <p className="text-[#64748B] text-lg font-medium italic mb-10">"{product.description}"</p>
            </div>

            <div className="mb-10 bg-[#0F172A] rounded-[2.5rem] p-8 border border-slate-800">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-blue-400 tracking-[0.2em] mb-1 uppercase">Medical AI</h4>
                  <p className="text-white font-black text-sm uppercase">Info in Georgian</p>
                </div>
              </div>

              <div className="space-y-3">
                <Link href="/blog" className="w-full py-4 bg-[#1E293B] text-slate-300 rounded-2xl flex items-center justify-between px-6 border border-slate-800">
                  <div className="flex items-center gap-4">
                    <span className="text-blue-500"><FileText size={16} /></span>
                    <span className="text-[11px] font-black uppercase tracking-widest">Read on Blog</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-600" />
                </Link>

                <AiButtons productName={product.name} />
              </div>
            </div>

            <OfferAdminButton slug={product.slug} />

            <TrackedAnchor
              href={`https://wa.me/995514011116?text=${encodeURIComponent(`გამარჯობა, მაინტერესებს ${product.name}. გთხოვთ მომაწოდოთ ფასი და დეტალები.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              leadChannel="whatsapp"
              trackingParams={{
                product_name: product.name,
                product_category: product.cat,
                cta_location: 'product_page',
              }}
              className="w-full py-6 bg-[#0F172A] text-white rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-4 uppercase tracking-widest shadow-xl"
            >
              <MessageCircle size={20} /> WhatsApp Price
            </TrackedAnchor>

            <TrackedAnchor
              href="https://m.me/medicalline.ge"
              target="_blank"
              rel="noopener noreferrer"
              leadChannel="messenger"
              trackingParams={{
                product_name: product.name,
                product_category: product.cat,
                cta_location: 'product_page',
              }}
              className="w-full mt-3 py-6 bg-[#0084FF] text-white rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-4 uppercase tracking-widest shadow-xl"
            >
              <MessageCircle size={20} /> Messenger
            </TrackedAnchor>
          </div>
        </div>
      </div>
    </main>
  );
}
