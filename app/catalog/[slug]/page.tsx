import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { products as part1 } from '../data-part1';
import { products as part2 } from '../data-part2';
import { client } from '@/sanity/client'; 
import { 
  ArrowLeft, MessageCircle, CheckCircle2, Search, 
  Sparkles, Brain, FileText, ChevronRight, Share2 
} from 'lucide-react';

const manualProducts = [...part1, ...part2];

async function getProduct(slug: string) {
  const decodedSlug = decodeURIComponent(slug);
  const manual = manualProducts.find((p) => p.slug === decodedSlug);
  if (manual) return manual;

  try {
    // coalesce გამოიყენება იმისთვის, რომ თუ cat ცარიელია, ავტომატურად ჩაიწეროს სასურველი ტექსტი
    return await client.fetch(`*[_type == "product" && name == $slug][0]{
      "id": _id,
      name,
      price,
      "slug": name,
      "img": image.asset->url,
      "cat": coalesce(cat, "სხვა პარტნიორი ბრენდები"),
      description,
      specs
    }`, { slug: decodedSlug });
  } catch (e) { return null; }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) notFound();

  // ვამოწმებთ არის თუ არა Eighteeth-ის ბრენდი Badge-ისთვის
  const isEighteeth = product.cat !== 'სხვა პარტნიორი ბრენდები';

  return (
    <main className="min-h-screen bg-white pt-24 pb-20 px-4 md:px-6 font-sans selection:bg-blue-100">
      <div className="max-w-7xl mx-auto">
        
        {/* ნავიგაცია */}
        <div className="mb-6">
          <Link href="/catalog" className="inline-flex items-center gap-2 text-slate-400 hover:text-blue-600 transition font-bold uppercase text-[10px] tracking-widest">
            <ArrowLeft size={16}/> უკან დაბრუნება
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-20 items-start">
          
          {/* მარცხენა მხარე: სურათი */}
          <div className="relative aspect-square bg-[#F8FAFC] rounded-[4rem] flex items-center justify-center p-12 overflow-hidden group shadow-sm border border-slate-50">
             <button className="absolute top-8 left-8 z-10 bg-white shadow-md px-4 py-2 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter text-slate-500 hover:bg-slate-50 transition">
                <Share2 size={14} className="text-blue-600"/> გაზიარება
             </button>
             
             <div className="relative w-full h-full">
                <Image 
                  src={product.img} 
                  alt={product.name} 
                  fill 
                  className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-transform duration-700"
                  priority 
                />
             </div>
          </div>

          {/* მარჯვენა მხარე: ინფორმაცია */}
          <div className="flex flex-col pt-4">
            <div className="mb-8">
              <span className="text-blue-600 font-black uppercase tracking-widest text-[10px] block mb-4">
                {isEighteeth ? `EIGHTEETH | ${product.cat}` : product.cat}
              </span>
              <h1 className="text-4xl md:text-6xl font-black text-[#1E293B] mb-4 leading-[0.9] uppercase italic tracking-tighter">
                {product.name}
              </h1>
              <div className="bg-[#1E293B] text-white px-4 py-1.5 rounded-lg inline-block font-bold text-[12px] mb-8">
                კოდი: {product.id?.slice(0, 5) || '56'}
              </div>
              <p className="text-[#64748B] text-lg md:text-xl font-medium italic leading-relaxed mb-10 max-w-lg">
                "{product.description || 'ინოვაციური დიზაინის მქონე სტომატოლოგიური დანადგარი გაძლიერებული ფუნქციონალით.'}"
              </p>
            </div>

            {/* მახასიათებლები */}
            <div className="space-y-3 mb-12">
              {(product.specs || ['პრემიუმ ოპტიკა', 'ინტეგრირებული მიკრომოტორი', 'ინტუიციური მართვა']).map((spec: string, i: number) => (
                <div key={i} className="flex items-center gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100/50">
                  <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center">
                    <CheckCircle2 size={14} className="text-blue-500" />
                  </div>
                  <span className="text-[#1E293B] font-bold text-sm uppercase tracking-tight">{spec}</span>
                </div>
              ))}
            </div>

            {/* MEDICAL AI ბლოკი */}
            <div className="mb-10 bg-[#0F172A] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden border border-slate-800">
               <div className="flex items-center gap-4 mb-8">
                 <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                   <Sparkles size={20} />
                 </div>
                 <div>
                   <h4 className="text-[10px] font-black text-blue-400 tracking-[0.2em] leading-none mb-1 uppercase">MEDICAL AI</h4>
                   <p className="text-white font-black text-sm uppercase">ინფორმაცია ქართულად</p>
                 </div>
               </div>

               <div className="space-y-3">
                 <button className="w-full py-4 bg-[#1E293B] hover:bg-[#334155] text-slate-300 rounded-2xl flex items-center justify-between px-6 transition-all border border-slate-800">
                   <div className="flex items-center gap-4">
                     <span className="text-blue-500"><FileText size={16}/></span>
                     <span className="text-[11px] font-black uppercase tracking-widest">წაიკითხე ბლოგზე</span>
                   </div>
                   <ChevronRight size={14} className="text-slate-600" />
                 </button>

                 <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-between px-6 transition-all shadow-xl shadow-blue-600/20 group">
                   <div className="flex items-center gap-4">
                     <Brain size={18} />
                     <span className="text-[11px] font-black uppercase tracking-widest text-left">AI ანალიზი (GEO)</span>
                   </div>
                   <Sparkles size={14} className="animate-pulse" />
                 </button>
               </div>
            </div>

            {/* მთავარი ღილაკები */}
            <div className="flex flex-col gap-4">
              <a href={`https://wa.me/995514011116?text=${product.name}`} target="_blank" className="w-full py-6 bg-[#0F172A] text-white rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-4 hover:bg-blue-600 transition-all uppercase tracking-widest shadow-xl">
                <MessageCircle size={20} /> WHATSAPP ფასი
              </a>
              
              <div className="grid grid-cols-2 gap-4">
                 <button className="py-5 border-2 border-[#F97316] text-[#F97316] rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-orange-50 transition">
                   შეამოწმე ლიმიტი
                 </button>
                 <button className="py-5 bg-[#F97316] text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-[#EA580C] transition shadow-lg shadow-orange-500/20">
                   მოითხოვე განვადება
                 </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}