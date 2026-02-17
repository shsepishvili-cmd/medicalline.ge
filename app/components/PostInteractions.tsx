"use client";

import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import { Facebook, MessageCircle, Link as LinkIcon, Check } from 'lucide-react';

export default function PostInteractions({ postUrl, postTitle }: { postUrl: string, postTitle: string }) {
  const [copied, setCopied] = useState(false);

  // ❗️ ეს აიძულებს ფეისბუქს, რომ კომენტარები ყოველთვის გამოაჩინოს
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).FB) {
      (window as any).FB.XFBML.parse();
    }
  }, [postUrl]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(postUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-16">
      {/* 🔗 გაზიარების სექცია */}
      <div className="border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50 p-6 rounded-2xl mb-12 shadow-sm">
        <span className="font-bold text-slate-700 text-lg">გაუზიარეთ კოლეგებს:</span>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <button 
            onClick={copyToClipboard}
            className={`flex items-center gap-2 px-5 h-12 rounded-full font-bold transition-all shadow border ${
              copied ? 'bg-green-500 text-white border-green-500' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="ლინკის კოპირება"
          >
            {copied ? <Check size={18} /> : <LinkIcon size={18} />}
            <span className="text-sm">{copied ? 'დაკოპირდა!' : 'ლინკის კოპირება'}</span>
          </button>
          
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${postUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 rounded-full bg-white text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow border border-slate-200">
            <Facebook size={22} />
          </a>
          
          <a href={`https://api.whatsapp.com/send?text=${postTitle} %0A%0A ${postUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 rounded-full bg-white text-green-500 hover:bg-green-500 hover:text-white transition-all shadow border border-slate-200">
            <MessageCircle size={22} />
          </a>
          
          <a href={`viber://forward?text=${postTitle} %0A%0A ${postUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-12 h-12 rounded-full bg-white text-purple-600 hover:bg-purple-600 hover:text-white transition-all shadow border border-slate-200">
            <MessageCircle size={22} className="rotate-90" />
          </a>
        </div>
      </div>

      {/* 💬 ფეისბუქის კომენტარების სექცია */}
      <section className="py-16 bg-slate-50 px-6 border border-slate-100 relative overflow-hidden rounded-[2.5rem] shadow-xl shadow-blue-900/5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-20"></div>
        <h3 className="text-2xl md:text-3xl font-black mb-10 text-center text-slate-900 underline decoration-blue-600 decoration-4 underline-offset-8">
          დისკუსია / გამოხმაურება
        </h3>
        <div id="fb-root"></div>
        <Script async defer crossOrigin="anonymous" src="https://connect.facebook.net/ka_GE/sdk.js#xfbml=1&version=v18.0" strategy="lazyOnload" />
        <div className="w-full overflow-hidden rounded-xl flex justify-center">
          <div className="fb-comments w-full" data-href={postUrl} data-width="100%" data-numposts="10"></div>
        </div>
      </section>
    </div>
  );
}