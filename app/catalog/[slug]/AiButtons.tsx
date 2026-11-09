"use client";

import React from 'react';
import { Brain, Sparkles, Search } from 'lucide-react';
import { trackEvent } from '@/app/lib/analytics';

export default function AiButtons({ productName }: { productName: string }) {
  const handleAiAnalysis = () => {
    const prompt = `ქართულად ამიხსენი სტომატოლოგიური პროდუქტი "${productName}". მომეცი მოკლე აღწერა, ძირითადი ფუნქციები, გამოყენების შემთხვევები, უპირატესობები ექიმისთვის და რა კითხვები უნდა დავსვა შეძენამდე. პასუხი იყოს ქართულად.`;
    trackEvent('ai_analysis_open', { product_name: productName });
    window.open(`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`, '_blank');
  };

  const handleGoogleSearch = () => {
    trackEvent('google_search_open', { product_name: productName });
    window.open(`https://www.google.com/search?q=${encodeURIComponent(`${productName} სტომატოლოგიური აპარატი მიმოხილვა მახასიათებლები ფასი`)}`, '_blank');
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleAiAnalysis}
        className="w-full py-4 bg-[#1E293B] hover:bg-[#334155] text-slate-300 rounded-2xl flex items-center justify-between px-6 transition-all border border-slate-800 group"
      >
        <div className="flex items-center gap-4">
          <Brain size={18} className="text-blue-500 group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-black uppercase tracking-widest text-left">AI ანალიზი ქართულად</span>
        </div>
        <Sparkles size={14} className="text-slate-600 animate-pulse" />
      </button>

      <button
        onClick={handleGoogleSearch}
        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-between px-6 transition-all shadow-xl shadow-blue-600/20 group"
      >
        <div className="flex items-center gap-4">
          <Search size={18} className="group-hover:rotate-12 transition-transform" />
          <span className="text-[11px] font-black uppercase tracking-widest text-left">ქართული ძებნა</span>
        </div>
        <Sparkles size={14} className="animate-pulse" />
      </button>
    </div>
  );
}
