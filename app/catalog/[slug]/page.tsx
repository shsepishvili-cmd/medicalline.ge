import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { products as part1 } from '../data-part1';
import { products as part2 } from '../data-part2';
import AiButtons from './AiButtons'; // 👈 ჩვენი ახალი კომპონენტი
import { 
  ArrowLeft, MessageCircle, CheckCircle2, 
  Sparkles, FileText, ChevronRight, Share2 
} from 'lucide-react';

const allProducts = [...part1, ...part2];

async function getProduct(slug: string) {
  const decodedSlug = decodeURIComponent(slug);
  return allProducts.find((p) => p.slug === decodedSlug) || null;
}

export async function generateStaticParams() {
  return allProducts.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  return (
    <main className="min-h-screen bg-white pt-24 pb-20 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/catalog" className="inline-flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
            <ArrowLeft size={16}/> უკან დაბრუნება
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
              <h1 className="text-4xl md:text-6xl font-black text-[#1E293B] mb-4 uppercase italic italic tracking-tighter">{product.name}</h1>
              <p className="text-[#64748B] text-lg font-medium italic mb-10 italic">"{product.description}"</p>
            </div>

            {/* ✅ MEDICAL AI ბლოკი */}
            <div className="mb-10 bg-[#0F172A] rounded-[2.5rem] p-8 border border-slate-800">
               <div className="flex items-center gap-4 mb-8">
                 <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Sparkles size={20} /></div>
                 <div>
                   <h4 className="text-[10px] font-black text-blue-400 tracking-[0.2em] mb-1 uppercase">MEDICAL AI</h4>
                   <p className="text-white font-black text-sm uppercase">ინფორმაცია ქართულად</p>
                 </div>
               </div>

               <div className="space-y-3">
                 <Link href="/blog" className="w-full py-4 bg-[#1E293B] text-slate-300 rounded-2xl flex items-center justify-between px-6 border border-slate-800">
                   <div className="flex items-center gap-4">
                     <span className="text-blue-500"><FileText size={16}/></span>
                     <span className="text-[11px] font-black uppercase tracking-widest">წაიკითხე ბლოგზე</span>
                   </div>
                   <ChevronRight size={14} className="text-slate-600" />
                 </Link>

                 {/* 🚀 აქ შემოდის ჩვენი ინტერაქტიული ღილაკები */}
                 <AiButtons productName={product.name} />
               </div>
            </div>

            <a href={`https://wa.me/995514011116?text=გამარჯობა, მაინტერესებს ${product.name}`} target="_blank" className="w-full py-6 bg-[#0F172A] text-white rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-4 uppercase tracking-widest shadow-xl">
              <MessageCircle size={20} /> WHATSAPP ფასი
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}