import React from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { products as part1 } from '../data-part1';
import { products as part2 } from '../data-part2';
import AiButtons from './AiButtons';
import OfferAdminButton from './OfferAdminButton';
import ProductGallery from './ProductGallery';
import ProductViewTracker from '@/app/components/ProductViewTracker';
import TrackedAnchor from '@/app/components/TrackedAnchor';
import { absoluteImageUrl, buildPageMetadata, siteConfig } from '@/app/lib/seo';
import { loadQuickCatalogProduct } from '@/app/lib/quick-catalog';
import { applyCorrection, loadCatalogCorrections } from '@/app/lib/catalog-corrections';
import {
  ArrowLeft,
  MessageCircle,
  Sparkles,
  FileText,
  ChevronRight,
} from 'lucide-react';

const allProducts = [...part1, ...part2];

// Show the exhibition offer only for active products selected for Expo 2026.
// The QR stays on the permanent product page, while the price request is
// handled by the Expo checkout so its EXPO2026 lead source is preserved.
async function isExpoProduct(slug: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return false;

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (productError || !product) return false;

    const { data: expoSelection, error: selectionError } = await supabase
      .from('expo_catalog_items')
      .select('product_id')
      .eq('product_id', product.id)
      .limit(1);
    return !selectionError && !!expoSelection?.length;
  } catch {
    return false;
  }
}

// Admin-added products are rendered on demand and refreshed every minute.
export const revalidate = 60;

async function getProduct(slug: string) {
  const decodedSlug = decodeURIComponent(slug);
  const builtIn = allProducts.find((p) => p.slug === decodedSlug);
  if (!builtIn) return loadQuickCatalogProduct(decodedSlug);
  // Admin corrections: hidden products are gone, corrected ones show the edit.
  const correction = (await loadCatalogCorrections()).get(builtIn.slug);
  if (correction?.hidden) return null;
  return applyCorrection(builtIn, correction);
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
  const expoEligible = await isExpoProduct(product.slug);

  const productBrand = 'brand' in product && typeof product.brand === 'string'
    ? product.brand
    : product.slug === 'le-ray-w' ? 'LifeDent' : 'Eighteeth';
  const productImages = 'images' in product && Array.isArray(product.images)
    ? product.images
    : [product.img];

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    category: product.cat,
    image: productImages.map(absoluteImageUrl),
    brand: {
      '@type': 'Brand',
      name: productBrand,
    },
    sku: String(product.id),
    url: `${siteConfig.url}/catalog/${product.slug}`,
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
          <ProductGallery images={productImages} productName={product.name} />

          <div className="flex flex-col pt-4">
            <div className="mb-8">
              <span className="text-blue-600 font-black uppercase tracking-widest text-[10px] block mb-4">{productBrand.toUpperCase()} | {product.cat}</span>
              <h1 className="text-4xl md:text-6xl font-black text-[#1E293B] mb-4 uppercase italic tracking-tighter">{product.name}</h1>
              <p className="text-[#64748B] text-lg font-medium italic mb-10">“{product.description}”</p>
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

            {expoEligible ? (
              <Link
                href={`/expo2026?product=${encodeURIComponent(product.slug)}`}
                className="mb-3 flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-emerald-700 px-5 py-5 text-center text-sm font-black text-white shadow-lg transition-colors hover:bg-emerald-800"
              >
                <Sparkles size={20} aria-hidden="true" />
                მოითხოვე Expo-ს სპეციალური ფასი
              </Link>
            ) : null}

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

        <section className="mt-12 grid lg:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7 md:p-9">
            <h2 className="text-2xl font-black text-slate-900 mb-5">ტექნიკური მახასიათებლები</h2>
            {product.specs?.length ? <ul className="grid gap-3">{product.specs.map((spec) => <li key={spec} className="flex gap-3 text-slate-600 leading-7"><span className="text-blue-600 font-black">✓</span><span>{spec}</span></li>)}</ul> : <p className="text-slate-600 leading-7">დეტალური ტექნიკური სპეციფიკაციისა და კომპლექტაციისთვის დაგვიკავშირდით.</p>}
          </div>
          <div className="rounded-3xl bg-blue-950 text-white p-7 md:p-9">
            <h2 className="text-2xl font-black mb-4">ფასი, მიწოდება და გარანტია</h2>
            <p className="text-blue-100 leading-7 mb-5">საბოლოო ფასი, ვალუტა, დღგ-ის სტატუსი, გადახდის პირობები და მიწოდების ვადა განისაზღვრება ინდივიდუალურ კომერციულ შეთავაზებაში.</p>
            <ul className="grid gap-3 text-sm text-blue-100">
              <li><strong className="text-white">ხელმისაწვდომობა:</strong> დასადასტურებელია მოთხოვნის დროს</li>
              <li><strong className="text-white">გარანტია:</strong> შეთავაზებისა და საგარანტიო დოკუმენტის შესაბამისად</li>
              <li><strong className="text-white">გადახდა:</strong> მხოლოდ მოქმედი შეთავაზების მიღებისა და პირობების დადასტურების შემდეგ</li>
            </ul>
            <div className="flex flex-wrap gap-4 mt-6 text-sm font-bold">
              <Link className="text-blue-300 underline" href="/delivery-returns">მიწოდება და დაბრუნება</Link>
              <Link className="text-blue-300 underline" href="/terms">წესები და პირობები</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
