"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  CheckCircle2, MessageCircle, ArrowLeft, 
  Search, X, CreditCard, Sparkles, Brain, ChevronRight, ChevronLeft, FileText, Share2, Link as LinkIcon 
} from 'lucide-react';
import Link from 'next/link';

// მონაცემების იმპორტი
import { products as part1 } from './data-part1';
import { products as part2 } from './data-part2';

const products = [...part1, ...part2];

export default function CatalogClient() {
  const [filter, setFilter] = useState('ყველა');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const searchParams = useSearchParams();

  // 1. ლინკის შემოწმება
  useEffect(() => {
    const productSlug = searchParams.get('product');
    if (productSlug) {
      const foundProduct = products.find(p => p.slug === productSlug);
      if (foundProduct) setSelectedProduct(foundProduct);
    }
  }, [searchParams]);

  // 2. გახსნა / დახურვა / კოპირება
  const openProduct = (item: any) => {
    setSelectedProduct(item);
    window.history.pushState(null, '', `?product=${item.slug}`);
  };

  const closeProduct = () => {
    setSelectedProduct(null);
    window.history.pushState(null, '', '/catalog');
    setCopied(false);
  };

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 3. ✅ სლაიდერის ლოგიკა (Next / Prev)
  const navigateProduct = useCallback((direction: 'next' | 'prev') => {
    if (!selectedProduct) return;

    // ვპოულობთ მიმდინარე პროდუქტის ინდექსს სიაში
    const currentIndex = products.findIndex(p => p.id === selectedProduct.id);
    let newIndex;

    if (direction === 'next') {
      // თუ ბოლოა, გადადის პირველზე (Loop)
      newIndex = currentIndex === products.length - 1 ? 0 : currentIndex + 1;
    } else {
      // თუ პირველია, გადადის ბოლოზე
      newIndex = currentIndex === 0 ? products.length - 1 : currentIndex - 1;
    }

    const newProduct = products[newIndex];
    setSelectedProduct(newProduct);
    
    // URL-ის განახლება
    window.history.replaceState(null, '', `?product=${newProduct.slug}`);
  }, [selectedProduct]);

  // 4. ✅ კლავიატურის ისრებით მართვა
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedProduct) return;
      
      if (e.key === 'ArrowRight') navigateProduct('next');
      if (e.key === 'ArrowLeft') navigateProduct('prev');
      if (e.key === 'Escape') closeProduct();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProduct, navigateProduct]);

  // ფილტრაცია
  const categories = ['ყველა', 'ენდოდონტია', 'რადიოლოგია', 'ციფრული სკანერები', 'ქირურგია', 'ოპტიკა', 'ჰიგიენა', 'სხვა'];

  const filteredProducts = products.filter(p => {
    const matchesFilter = filter === 'ყველა' || p.cat === filter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-40 py-4">
        <Link href="/" className="flex items-center gap-2 text-slate-500 font-bold hover:text-blue-600 transition underline decoration-2">
          <ArrowLeft size={20}/> მთავარზე
        </Link>
        <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter">კატალოგი</h1>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="მოძებნე..." 
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white shadow-xl focus:ring-2 focus:ring-blue-500 font-bold text-sm outline-none border-none"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-3 mb-16">
        {categories.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-6 py-2 rounded-full font-black text-[10px] tracking-widest transition-all ${filter === c ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredProducts.map((item) => (
          <div key={item.id} className="group bg-white rounded-[2.5rem] p-6 border border-slate-100 hover:shadow-2xl transition-all flex flex-col items-center overflow-hidden">
            <div onClick={() => openProduct(item)} className="cursor-pointer w-full flex flex-col items-center h-full">
              <div className="relative w-full h-48 mb-6 flex items-center justify-center bg-slate-50 rounded-[2rem] p-6">
                <img src={item.img} alt={item.name} className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-700" />
              </div>
              <div className="w-full text-center mb-6 px-2">
                <span className="text-[10px] font-black text-blue-500 block mb-1">{item.cat}</span>
                <h3 className="text-lg font-black text-slate-900 leading-none h-10 flex items-center justify-center text-center">{item.name}</h3>
              </div>
              <div className="w-full grid grid-cols-2 gap-2 mt-auto">
                <button className="py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] hover:bg-blue-600 transition uppercase">ნახვა</button>
                <a href="https://ganvadeba.credo.ge/account/landing/authorization" target="_blank" onClick={(e) => e.stopPropagation()} className="flex items-center justify-center py-3 bg-orange-500 text-white rounded-xl font-black text-[9px] shadow-lg hover:bg-orange-600 transition uppercase">
                  <CreditCard size={12} className="mr-1"/> განვადება
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md" onClick={closeProduct}>
          <div className="relative bg-white w-full max-w-6xl rounded-[3rem] overflow-hidden flex flex-col md:flex-row p-6 md:p-8 max-h-[95vh] shadow-2xl" onClick={e => e.stopPropagation()}>
            
            {/* ⬅️ მარცხენა ისარი */}
            <button onClick={() => navigateProduct('prev')} className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-4 bg-white/80 hover:bg-blue-600 hover:text-white rounded-full shadow-xl transition-all hidden md:flex backdrop-blur-sm group">
               <ChevronLeft size={24} className="group-hover:-translate-x-1 transition-transform"/>
            </button>

            {/* ➡️ მარჯვენა ისარი */}
            <button onClick={() => navigateProduct('next')} className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-4 bg-white/80 hover:bg-blue-600 hover:text-white rounded-full shadow-xl transition-all hidden md:flex backdrop-blur-sm group">
               <ChevronRight size={24} className="group-hover:translate-x-1 transition-transform"/>
            </button>

            {/* დახურვის ღილაკი */}
            <button onClick={closeProduct} className="absolute top-6 right-6 p-3 bg-slate-100 rounded-full hover:bg-red-500 hover:text-white transition-all z-50 shadow-lg">
              <X size={24} />
            </button>

            {/* სურათის მხარე */}
            <div className="md:w-1/2 flex items-center justify-center p-6 bg-slate-50 rounded-[2.5rem] mb-6 md:mb-0 relative">
               <button onClick={copyLink} className="absolute top-6 left-6 p-2 bg-white rounded-full text-blue-600 shadow-lg hover:scale-110 transition flex items-center gap-2 px-4 z-20">
                 {copied ? <CheckCircle2 size={16}/> : <Share2 size={16}/>}
                 <span className="text-[10px] font-black uppercase tracking-widest">{copied ? "ლინკი აღებულია" : "გაზიარება"}</span>
               </button>
              
              {/* სურათის ანიმაცია შეცვლისას */}
              <div key={selectedProduct.id} className="animate-in zoom-in duration-500">
                 <img src={selectedProduct.img} alt={selectedProduct.name} className="max-h-[350px] md:max-h-[450px] object-contain drop-shadow-2xl" />
              </div>
            </div>

            {/* ინფორმაციის მხარე */}
            <div className="md:w-1/2 md:pl-10 overflow-y-auto pr-2">
              {/* მობილურისთვის ისრები ზემოთ */}
              <div className="flex md:hidden justify-between mb-4">
                 <button onClick={() => navigateProduct('prev')} className="p-2 bg-slate-100 rounded-full"><ChevronLeft size={20}/></button>
                 <button onClick={() => navigateProduct('next')} className="p-2 bg-slate-100 rounded-full"><ChevronRight size={20}/></button>
              </div>

              <div key={selectedProduct.id} className="animate-in slide-in-from-right-4 duration-300">
                <span className="text-blue-600 font-black text-xs block mb-2 tracking-widest">{selectedProduct.cat}</span>
                <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 leading-none">{selectedProduct.name}</h2>
                <p className="text-slate-500 text-base md:text-lg font-bold mb-8 italic leading-snug">"{selectedProduct.description}"</p>
                
                {/* AI Section */}
                <div className="mb-8 p-6 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-600 p-2 rounded-xl text-white">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-blue-400 tracking-[0.2em] leading-none mb-1">MEDICAL AI</h4>
                        <p className="text-white font-black text-sm uppercase">ინფორმაცია ქართულად</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 relative z-10">
                    <Link href={`/blog?search=${selectedProduct.name}`} className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl flex items-center justify-between px-5 transition-all border border-white/10">
                      <div className="flex items-center gap-3"><FileText size={16} className="text-blue-400" /><span className="text-[10px] font-black uppercase tracking-widest">წაიკითხე ბლოგზე</span></div>
                      <ChevronRight size={14} />
                    </Link>
                    <button onClick={() => window.open(`https://www.google.com/search?q=${selectedProduct.name}+Eighteeth+ინსტრუქცია+Medical+Line`, '_blank')} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl flex items-center justify-between px-5 transition-all border border-slate-700">
                      <div className="flex items-center gap-3"><Search size={16} className="text-blue-400" /><span className="text-[10px] font-black uppercase tracking-widest">მოძებნე ქართულად</span></div>
                      <ChevronRight size={14} className="text-slate-500" />
                    </button>
                    <button onClick={() => window.open(`https://chatgpt.com/?q=გთხოვ+ქართულად+დაწვრილებით+გააანალიზო+სტომატოლოგიური+აპარატი+Eighteeth+${selectedProduct.name}.+აღწერე+მისი+კლინიკური+უპირატესობები.`, '_blank')} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-between px-5 transition-all shadow-xl">
                      <div className="flex items-center gap-3"><Brain size={16} /><span className="text-[10px] font-black uppercase tracking-widest">AI ანალიზი (GEO)</span></div>
                      <Sparkles size={14} className="animate-pulse" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  {selectedProduct.specs.map((spec: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-slate-700 font-bold text-[11px] bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <CheckCircle2 size={16} className="text-blue-500 shrink-0" /> {spec}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  <button onClick={() => window.open(`https://wa.me/995514011116?text=გამარჯობა, მაინტერესებს: ${selectedProduct.name}`, '_blank')} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-3 hover:bg-blue-600 transition shadow-xl">
                    <MessageCircle size={20} /> WHATSAPP ფასი
                  </button>
                  <button onClick={() => window.open('https://ganvadeba.credo.ge/account/landing/authorization', '_blank')} className="w-full py-5 border-2 border-orange-500 text-orange-600 rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-3 hover:bg-orange-50 transition">
                    <CreditCard size={20} /> შეამოწმე ლიმიტი
                  </button>
                  <button onClick={() => window.open(`https://wa.me/995514011116?text=მაინტერესებს ონლაინ განვადება: ${selectedProduct.name}`, '_blank')} className="w-full py-5 bg-orange-500 text-white rounded-[1.5rem] font-black text-xs flex items-center justify-center gap-3 hover:bg-orange-600 transition shadow-xl">
                    მოითხოვე განვადება
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}