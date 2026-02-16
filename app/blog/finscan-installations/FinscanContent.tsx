"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script'; // ეს დავამატეთ
import { ArrowLeft, CheckCircle2, Share2, Facebook, X, Camera, TrendingUp, Star, Wrench, Radiation, MessageSquare } from 'lucide-react';

export default function FinscanContent() {
  const [showShareTooltip, setShowShareTooltip] = useState(false);

  const handleShare = () => {
    const currentUrl = window.location.href;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
    window.open(facebookUrl, 'fbShare', 'width=600,height=400');
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowShareTooltip(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Facebook-ის ინიციალიზაცია გვერდის ჩატვირთვისას
  useEffect(() => {
    if (window.FB) {
      window.FB.XFBML.parse();
    }
  });

  return (
    <main className="min-h-screen bg-white font-sans pb-24 relative">
       
       {/* --- FACEBOOK SDK (აუცილებელია კომენტარებისთვის) --- */}
       <div id="fb-root"></div>
       <Script
         async
         defer
         crossOrigin="anonymous"
         src="https://connect.facebook.net/ka_GE/sdk.js#xfbml=1&version=v19.0"
         strategy="lazyOnload"
       />

       {/* --- FLOATING SHARE BUTTON --- */}
       <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2">
          <div className={`bg-slate-900 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-lg transition-all duration-500 ${showShareTooltip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
             გააზიარე სიახლე!
             <button onClick={() => setShowShareTooltip(false)} className="ml-2 opacity-50 hover:opacity-100"><X size={12}/></button>
          </div>
          <button 
            onClick={handleShare}
            onMouseEnter={() => setShowShareTooltip(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col items-center gap-1">
               <Share2 size={24} className="group-hover:hidden transition-all"/>
               <Facebook size={24} className="hidden group-hover:block transition-all"/>
            </div>
          </button>
       </div>

       {/* ნავიგაცია */}
       <nav className="bg-slate-900 text-white py-6 px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
           <Link href="/blog" className="hover:text-blue-400 transition"><ArrowLeft/></Link>
           <span className="font-bold uppercase text-xs tracking-widest">სტატია</span>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <span className="text-blue-600 font-black text-xs uppercase tracking-widest mb-4 block">წარმატებული პროექტები</span>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase leading-tight mb-8">FINSCAN F350 - N1 არჩევანი საქართველოს წამყვანი კლინიკებისთვის</h1>
        
        {/* მთავარი პროდუქტის სურათი */}
        <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 mb-12 flex justify-center">
            <img src="/images/finscan.png" alt="Finscan F350" className="max-h-[400px] w-auto object-contain"/>
        </div>

        <div className="prose prose-slate prose-lg mx-auto">
          <p className="font-bold text-xl text-slate-800 mb-8">
            Medical Line Georgia აგრძელებს ქართული სტომატოლოგიური ბაზრის ტექნოლოგიურ გარდაქმნას. <span className="text-blue-600">უკვე არაერთ კლინიკაში წარმატებით ოპერირებს</span> უახლესი თაობის ტომოგრაფი FinScan F350, რომელიც დღეისათვის უკონკურენტოა თავის კლასში.
          </p>

          {/* --- FOTO 1 --- */}
          <div className="my-10 group">
             <div className="rounded-[2rem] overflow-hidden border border-slate-200 shadow-lg relative aspect-video">
                <img 
                   src="/images/f1.jpeg" 
                   alt="Finscan installation process" 
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 to-transparent p-6">
                    <p className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Camera size={16} className="text-blue-400"/> ინსტალაციის პროცესი კლინიკაში
                    </p>
                </div>
             </div>
          </div>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <Star className="text-orange-500 fill-orange-500"/> რატომ ირჩევენ კლინიკები FINSCAN-ს?
          </h3>
          
          <p className="text-slate-600 mb-6">
            თანამედროვე კლინიკისთვის საკუთარი ტომოგრაფი აღარ არის ფუფუნება, ეს არის აუცილებლობა. FinScan F350-ის არჩევით კლინიკა იღებს:
          </p>

          <div className="grid gap-4 mb-10">
             <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <span className="font-black text-slate-900 block uppercase text-sm mb-2 flex items-center gap-2"><TrendingUp size={18}/> კლინიკის პრესტიჟი და შემოსავალი</span>
                <span className="text-slate-600 text-sm font-medium">პაციენტი აღარ გადის სხვა ცენტრში გადასაღებად. დიაგნოსტიკა ხდება ადგილზე, რაც ზრდის მკურნალობის სისწრაფეს და კლინიკის შემოსავალს.</span>
             </div>
             <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <span className="font-black text-slate-900 block uppercase text-sm mb-2 flex items-center gap-2"><CheckCircle2 size={18}/> 3-ერთში უნივერსალური სისტემა</span>
                <span className="text-slate-600 text-sm font-medium">CBCT (3D), პანორამა და ცეფალომეტრია ერთ აპარატში. ფარავს სტომატოლოგიის ყველა მიმართულებას: იმპლანტოლოგია, ენდოდონტია, ორთოდონტია.</span>
             </div>
          </div>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <Wrench className="text-blue-600"/> პროფესიონალური მონტაჟი
          </h3>
          <p className="text-slate-600 mb-8">
             აპარატურის შეძენა მხოლოდ საქმის ნახევარია. უმნიშვნელოვანესია მისი სწორი ინსტალაცია და კალიბრაცია. ჩვენი სერტიფიცირებული ინჟინრები უზრუნველყოფენ, რომ აპარატმა იმუშაოს მაქსიმალური სიზუსტით პირველივე დღიდან.
          </p>

          {/* --- FOTO 2 & 3 --- */}
          <div className="my-12 relative">
             <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg z-20 border-2 border-slate-900">
                <Radiation size={16}/> ტექნიკური ზონა: კალიბრაცია
             </div>

             <div className="bg-slate-900 rounded-[2.5rem] p-6 pt-12 md:p-10 relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px]"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                   <div className="rounded-2xl overflow-hidden border-2 border-yellow-400/50 shadow-xl aspect-[4/3] group">
                      <img 
                         src="/images/f2.jpeg" 
                         alt="Finscan calibration team" 
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                   </div>
                   <div className="rounded-2xl overflow-hidden border-2 border-yellow-400/50 shadow-xl aspect-[4/3] group">
                      <img 
                         src="/images/f3.jpeg" 
                         alt="Finscan setup process" 
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                   </div>
                </div>
                <p className="text-slate-400 text-center mt-6 text-xs font-bold uppercase tracking-wider">
                   უმაღლესი სიზუსტის უზრუნველყოფა
                </p>
             </div>
          </div>

          <p className="text-slate-600 mb-6 font-bold bg-green-50 p-4 rounded-xl border border-green-100 text-center">
            ✅ ჩვენს პარტნიორ კლინიკებში FinScan F350 უკვე წარმატებით ემსახურება პაციენტებს.
          </p>
        </div>

        {/* --- FACEBOOK COMMENTS SECTION --- */}
        <div className="mt-12 pt-12 border-t border-slate-200">
             <h3 className="text-2xl font-black uppercase text-slate-900 mb-8 flex items-center gap-3">
                <MessageSquare className="text-blue-600"/> კომენტარები
             </h3>
             <div className="bg-slate-50 p-4 rounded-3xl">
                <div 
                  className="fb-comments" 
                  data-href="https://medicalline.ge/blog/finscan-installations" 
                  data-width="100%" 
                  data-numposts="5">
                </div>
             </div>
        </div>

        {/* CTA Button */}
        <div className="mt-12">
           <Link href="/catalog" className="w-full py-5 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95">
              ნახე ტომოგრაფი კატალოგში
           </Link>
        </div>
      </article>
    </main>
  );
}