"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowLeft, Share2, Facebook, X, ShieldCheck, Wrench, Handshake, FileCheck, BadgeCheck, MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SupplierContent() {
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
    if (window.FB) {
      window.FB.XFBML.parse();
    }
  });

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
           <span className="font-bold uppercase text-xs tracking-widest">ბიზნეს რჩევები</span>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* ტეგები */}
        <div className="flex gap-2 mb-6">
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">ბიზნესი</span>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">რჩევები</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase leading-tight mb-8">როგორ ავარჩიოთ სანდო მომწოდებელი? 5 ოქროს წესი ექიმებისთვის</h1>
        
        {/* მთავარი სურათი */}
        <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 mb-12 flex justify-center shadow-inner">
            <img src="/images/supplier_main.jpg" alt="Business Handshake" className="max-h-[400px] w-full object-cover rounded-xl drop-shadow-2xl"/>
        </div>

        <div className="prose prose-slate prose-lg mx-auto">
          <p className="font-bold text-xl text-slate-800 mb-8">
            სტომატოლოგიური აპარატურის შეძენა სერიოზული ინვესტიციაა. არასწორად შერჩეულმა მომწოდებელმა შეიძლება დაგიკარგოთ არა მარტო ფული, არამედ დრო და ნერვები. როგორ დავიცვათ თავი?
          </p>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 my-8 rounded-r-xl">
             <div className="flex items-center gap-2 mb-2 text-yellow-700 font-bold uppercase text-sm">
                <AlertTriangle size={18}/> პრობლემა:
             </div>
             <p className="text-slate-700 italic m-0 text-sm">
                "აპარატი ვიყიდე 'ხელიდან' იაფად, გაფუჭდა და ახლა გამყიდველი ტელეფონს არ იღებს / ნაწილები არ აქვს." — ეს არის ყველაზე ხშირი ჩივილი ექიმებისგან.
             </p>
          </div>
          
          <p className="text-slate-600 mb-8">
             იმისათვის, რომ მსგავს სიტუაციაში არ აღმოჩნდეთ, გთავაზობთ 5 კრიტერიუმს, რომლითაც უნდა შეაფასოთ ნებისმიერი კომპანია შეძენამდე.
          </p>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <BadgeCheck className="text-blue-600"/> 1. ოფიციალური დისტრიბუტორი თუ გადამყიდველი?
          </h3>
          <p className="text-slate-600 mb-4">
            ყოველთვის იკითხეთ: <strong>"ხართ თუ არა ქარხნის ოფიციალური წარმომადგენელი?"</strong>.
          </p>
          <ul className="space-y-3 mb-6">
             <li className="flex gap-3 text-slate-700 text-sm"><CheckCircle2 className="text-green-500 min-w-[20px]"/> <span><strong>ოფიციალური დილერი:</strong> აქვს პირდაპირი კავშირი ქარხანასთან, სათადარიგო ნაწილები ადგილზე და ქარხნული გარანტია.</span></li>
             <li className="flex gap-3 text-slate-700 text-sm"><X className="text-red-500 min-w-[20px]"/> <span><strong>გადამყიდველი:</strong> ყიდულობს მესამე პირისგან. ფასზე ვერ აგებს პასუხს და პრობლემის შემთხვევაში ქარხანას ვერ დაუკავშირდება.</span></li>
          </ul>
          <p className="text-sm bg-blue-50 text-blue-800 p-3 rounded-lg font-medium border border-blue-100">
             ℹ️ Medical Line Georgia არის <strong>Eighteeth-ის ექსკლუზიური და ოფიციალური პარტნიორი</strong> საქართველოში.
          </p>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <Wrench className="text-blue-600"/> 2. სერვისი: რა ხდება გაყიდვის შემდეგ?
          </h3>
          <p className="text-slate-600 mb-6">
            ყველაზე კარგი აპარატიც კი შეიძლება გაფუჭდეს ან დასჭირდეს კალიბრაცია. მთავარი კითხვაა: <strong>ვინ მოგიგვარებთ პრობლემას?</strong>
          </p>
          
          {/* FOTO 2: სერვისი */}
          <div className="my-8 rounded-2xl overflow-hidden shadow-lg border border-slate-200">
             <img src="/images/service_team.jpg" alt="Service Center" className="w-full h-64 object-cover"/>
             <div className="bg-slate-900 p-4 text-white text-center">
                <p className="text-xs font-bold uppercase tracking-widest">ჩვენ არ ვყიდით მხოლოდ "ყუთებს" — ჩვენ ვყიდით მხარდაჭერას</p>
             </div>
          </div>

          <p className="text-slate-600 mb-6">
             სანდო მომწოდებელს უნდა ჰყავდეს <strong>საკუთარი ინჟინრები</strong> და ჰქონდეს სათადარიგო ნაწილების მარაგები. თუ კომპანია გეუბნებათ "გავაგზავნით ჩინეთში და 2 თვეში ჩამოვა", ეს თქვენი ბიზნესისთვის დამღუპველია.
          </p>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <Handshake className="text-blue-600"/> 3. რეპუტაცია და გამოცდილება
          </h3>
          <p className="text-slate-600 mb-6">
             რამდენი ხანია კომპანია ბაზარზეა? 1 წელი? 10 წელი?
             Medical Line Georgia უკვე <strong>10 წელზე მეტია</strong> ემსახურება ქართველ სტომატოლოგებს. ჩვენი რეპუტაცია ჩვენი ყველაზე დიდი აქტივია.
          </p>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <FileCheck className="text-blue-600"/> 4. გარანტია და საბუთები
          </h3>
          <p className="text-slate-600 mb-6">
             მოითხოვეთ ოფიციალური ინვოისი და საგარანტიო ტალონი. "სიტყვიერი გარანტია" ხშირად არ სრულდება. ჩვენთან ნებისმიერი შენაძენი ფორმდება იურიდიულად გამართულად, რაც გაძლევთ სიმშვიდის გარანტიას.
          </p>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <ShieldCheck className="text-blue-600"/> 5. ტრენინგი და სწავლება
          </h3>
          <p className="text-slate-600 mb-6">
             რთული აპარატურის (მაგ: ტომოგრაფი, სკანერი) შეძენისას აუცილებელია პერსონალის სწავლება. ჩვენ არ გტოვებთ მარტო ახალ ტექნოლოგიასთან — ჩვენი გუნდი ჩაგიტარებთ ტრენინგს აპარატის სრულ ათვისებამდე.
          </p>

          <div className="mt-12 p-8 bg-slate-900 rounded-[2rem] text-center text-white relative overflow-hidden">
             <div className="relative z-10">
                <h4 className="text-2xl font-black uppercase mb-4 text-blue-400">შეიძინეთ მშვიდად</h4>
                <p className="mb-6 text-slate-300 font-medium">
                   Medical Line Georgia — ეს არის ხარისხი, რომელსაც ენდობა საქართველოს წამყვანი კლინიკები.
                </p>
                <Link href="/catalog" className="inline-block bg-white text-slate-900 px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-50 transition transform hover:scale-105">
                   ნახეთ ჩვენი პროდუქცია
                </Link>
             </div>
          </div>

        </div>

        {/* --- FACEBOOK COMMENTS --- */}
        <div className="mt-12 pt-12 border-t border-slate-200">
             <h3 className="text-2xl font-black uppercase text-slate-900 mb-8 flex items-center gap-3">
                <MessageSquare className="text-blue-600"/> კომენტარები
             </h3>
             <div className="bg-slate-50 p-4 rounded-3xl">
                <div 
                  className="fb-comments" 
                  data-href="https://medicalline.ge/blog/supplier-guide" 
                  data-width="100%" 
                  data-numposts="5">
                </div>
             </div>
        </div>
      </article>
    </main>
  );
}