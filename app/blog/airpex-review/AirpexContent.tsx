"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowLeft, Share2, Facebook, X, Zap, Smartphone, Wifi, CheckCircle2, Battery, MessageSquare } from 'lucide-react';

export default function AirpexContent() {
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

  useEffect(() => {
  // window-ს "ვატყუებთ", რომ ნებისმიერი (any) ტიპის ობიექტია
  if ((window as any).FB) {
    (window as any).FB.XFBML.parse();
  }
}, []);

  return (
    <main className="min-h-screen bg-white font-sans pb-24 relative">
       
       {/* --- FACEBOOK SDK --- */}
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
             გააზიარე!
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
           <span className="font-bold uppercase text-xs tracking-widest">მიმოხილვა</span>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <span className="text-blue-600 font-black text-xs uppercase tracking-widest mb-4 block">ინოვაცია</span>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase leading-tight mb-8">AIRPEX - მსოფლიოში ყველაზე პატარა აპექს ლოკატორი</h1>
        
        {/* მთავარი სურათი (airpex1.jpg) */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-[2rem] border border-slate-100 p-8 mb-12 flex justify-center shadow-inner">
            <img src="/images/airpex1.jpg" alt="Airpex Apex Locator" className="max-h-[400px] w-auto object-contain drop-shadow-2xl"/>
        </div>

        <div className="prose prose-slate prose-lg mx-auto">
          <p className="font-bold text-xl text-slate-800 mb-8">
            დაივიწყეთ ჩახლართული სადენები და მძიმე აპარატები. Eighteeth წარმოგიდგენთ <span className="text-blue-600">AirPex</span>-ს — აპექს ლოკატორს, რომელიც სულ რაღაც 15 გრამს იწონის და უსადენო დატენვის ტექნოლოგიით მუშაობს.
          </p>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <Smartphone className="text-blue-600"/> ერგონომიკა და ზომა
          </h3>
          <p className="text-slate-600 mb-6">
            AirPex-ის მთავარი ხიბლი მისი ზომაა. ის პრაქტიკულად <strong>ბეჭდის ზომისაა</strong> და შეგიძლიათ პირდაპირ თითზე გაიკეთოთ მუშაობის დროს, ან მიამაგროთ პაციენტის წინსაფარზე მაგნიტური სამაგრით.
          </p>
          
          {/* --- FOTO 2: თითზე (airpex2.jpg) --- */}
          <div className="my-10 group">
             <div className="rounded-[2rem] overflow-hidden border border-slate-200 shadow-lg relative aspect-video">
                <img 
                   src="/images/airpex2.jpg" 
                   alt="Airpex usage" 
                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
             </div>
             <p className="text-center text-xs text-slate-400 font-bold uppercase mt-2 tracking-widest">სულ რაღაც 15 გრამი</p>
          </div>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <Wifi className="text-blue-600"/> უსადენო დატენვა
          </h3>
          <p className="text-slate-600 mb-6">
            ეს არის პირველი აპექს ლოკატორი <strong>უსადენო დატენვის ფუნქციით (Wireless Charging)</strong>. კომპლექტში შედის დახვეწილი დასადგამი, რომელიც ავტომატურად ტენის მოწყობილობას, როგორც კი მას ზედ მოათავსებთ.
          </p>

          {/* --- FOTO 3: დატენვა (airpex3.jpg) --- */}
          <div className="bg-slate-900 rounded-[2rem] p-8 my-8 relative overflow-hidden shadow-2xl">
             <div className="absolute top-4 right-4 text-yellow-400 animate-pulse">
                <Zap size={32} fill="currentColor"/>
             </div>
             <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                <div>
                    <h4 className="text-white font-black uppercase text-xl mb-4">მუდმივად დამუხტული</h4>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-2 text-slate-300 text-sm font-bold"><Battery size={16} className="text-green-400"/> 5 საათი უწყვეტი მუშაობა</li>
                        <li className="flex items-center gap-2 text-slate-300 text-sm font-bold"><CheckCircle2 size={16} className="text-blue-400"/> მაგნიტური კონტაქტი</li>
                    </ul>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-700 aspect-video">
                   <img src="/images/airpex3.jpg" alt="Airpex Charging" className="w-full h-full object-cover"/>
                </div>
             </div>
          </div>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6">რატომ AirPex?</h3>
          <ul className="space-y-4 mb-8">
             <li className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-4 items-center">
                <div className="bg-white p-2 rounded-full shadow-sm text-blue-600 font-black text-xl">1</div>
                <span className="text-slate-700 font-bold">FPGA ჩიპი უზრუნველყოფს 98%-იან სიზუსტეს</span>
             </li>
             <li className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex gap-4 items-center">
                <div className="bg-white p-2 rounded-full shadow-sm text-slate-600 font-black text-xl">2</div>
                <span className="text-slate-700 font-bold">OLED ეკრანი მკვეთრი გამოსახულებით</span>
             </li>
             <li className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex gap-4 items-center">
                <div className="bg-white p-2 rounded-full shadow-sm text-slate-600 font-black text-xl">3</div>
                <span className="text-slate-700 font-bold">კომპაქტური აქსესუარები</span>
             </li>
          </ul>

          <p className="text-slate-600 mb-6 font-bold bg-green-50 p-4 rounded-xl border border-green-100 text-center">
            ✅ AirPex - ეს არის თავისუფლება ენდოდონტიაში.
          </p>
        </div>

        {/* --- FACEBOOK COMMENTS --- */}
        <div className="mt-12 pt-12 border-t border-slate-200">
             <h3 className="text-2xl font-black uppercase text-slate-900 mb-8 flex items-center gap-3">
                <MessageSquare className="text-blue-600"/> კომენტარები
             </h3>
             <div className="bg-slate-50 p-4 rounded-3xl">
                <div 
                  className="fb-comments" 
                  data-href="https://medicalline.ge/blog/airpex-review" 
                  data-width="100%" 
                  data-numposts="5">
                </div>
             </div>
        </div>

        {/* CTA Button */}
        <div className="mt-12">
           <Link href="/catalog" className="w-full py-5 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95">
              ნახე ფასი და დეტალები
           </Link>
        </div>
      </article>
    </main>
  );
}