"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { 
  ArrowLeft, Calendar, Tag, ThumbsUp, Share2, 
  Droplets, CheckCircle2, AlertTriangle, Settings, Clock
} from 'lucide-react';

export default function EsanitArticle() {
  
  if ((window as any).FB) {
  (window as any).FB.XFBML.parse();
}

  const handleShare = () => {
    const currentUrl = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, 'fbShare', 'width=600,height=400');
  };

  const tips = [
    { t: "1. ინსტრუქცია", d: "უპირველეს ყოვლისა, გაეცანით ექსპლუატაციის წესებს. Esanit-ის ყოველ მოდელს აქვს თავისი სპეციფიკა, რომელიც უნდა იცოდეთ." },
    { t: "2. ზედაპირი", d: "ავტოკლავი უნდა იდგეს იდეალურად სწორ ზედაპირზე, რათა წყლის დრენაჟი და ვაკუუმირება მოხდეს შეფერხების გარეშე." },
    { t: "3. ვენტილაცია", d: "დატოვეთ მინიმუმ 10 სმ დაშორება უკანა კედლიდან და 5 სმ გვერდებიდან. აპარატს სჭირდება ჰაერის თავისუფალი ცირკულაცია." },
    { t: "4. მზის შუქი", d: "მოერიდეთ აპარატის დადგმას პირდაპირი მზის სხივების ქვეშ. ამან შეიძლება გამოიწვიოს კორპუსის გადახურება და სენსორების არაზუსტი მუშაობა." },
    { t: "5. ინსტრუმენტების შერჩევა", d: "დარწმუნდით, რომ ინსტრუმენტები ვარგისია 135°C ორთქლით სტერილიზაციისთვის. ყურადღება მიაქციეთ შესაბამის მარკირებას." },
    { t: "6. წინასწარი გასუფთავება", d: "ინსტრუმენტები უნდა იყოს დეზინფიცირებული და სუფთა. ბიოლოგიური ნარჩენები აზიანებს კამერის ზედაპირს და ფილტრებს." },
    { t: "7. სწორი განლაგება", d: "ინსტრუმენტები (ღია ან პაკეტებში) დაალაგეთ ერთ ფენად. ისინი არ უნდა ეხებოდეს ერთმანეთს და კამერის კედლებს." },
    { t: "8. წყლის ხარისხი", d: "გამოიყენეთ მხოლოდ დისტილატი. გამტარობა არ უნდა აღემატებოდეს 15 მიკროსიმენსს. ნადები ნაადრევად აზიანებს ვაკუუმ-ტუმბოს." },
    { t: "9. ავზის ჰიგიენა", d: "თვეში ერთხელ დაცალეთ წყლის ავზი და გაწმინდეთ სადეზინფექციო საშუალებით, შემდეგ კარგად გამორეცხეთ." },
    { t: "10. რეზინის მოვლა", d: "ყოველდღიურად გაწმინდეთ კარის რეზინის შუასადები (Gasket) რბილი ქსოვილით. ეს უზრუნველყოფს იდეალურ ჰერმეტულობას." },
    { t: "11. განიავება", d: "არასამუშაო საათებში ავტოკლავის კარი დატოვეთ ნახევრად ღია მდგომარეობაში, რათა ნესტი სრულად გამოვიდეს კამერიდან." },
    { t: "12. ტექ-მომსახურება", d: "სამ თვეში ერთხელ მაინც ჩაატარეთ გეგმიური ტექნიკური ინსპექცია სერტიფიცირებულ სპეციალისტთან." }
  ];

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-24 uppercase">
      <div id="fb-root"></div>
      <Script async defer crossOrigin="anonymous" src="https://connect.facebook.net/ka_GE/sdk.js#xfbml=1&version=v19.0" strategy="lazyOnload" />

      {/* --- NAV BAR --- */}
      <nav className="bg-slate-900 text-white py-6 px-6 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
           <Link href="/blog" className="flex items-center gap-2 hover:text-blue-400 transition">
              <ArrowLeft size={20}/> <span className="font-bold uppercase text-xs tracking-widest">ბლოგზე დაბრუნება</span>
           </Link>
           <h1 className="text-xl font-black uppercase tracking-tighter italic text-blue-500">Medical Blog</h1>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <article className="bg-white rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm">
          
          <div className="h-96 bg-slate-100 flex items-center justify-center p-8 overflow-hidden relative border-b">
            <img src="/images/autoclave_main.jpg" alt="Esanit Maintenance" className="w-full h-full object-contain" />
            <div className="absolute top-6 left-6 bg-white px-4 py-2 rounded-full text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 shadow-sm border border-slate-100">
              <Calendar size={14}/> 19 თებერვალი, 2026
            </div>
          </div>

          <div className="p-8 md:p-12">
            <div className="flex flex-wrap gap-2 mb-8">
              {["სერვისი", "რჩევები", "ჰიგიენა"].map((tag, t) => (
                <span key={t} className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-blue-100">
                  <Tag size={10}/> {tag}
                </span>
              ))}
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase leading-none mb-10 tracking-tighter">
              12 რჩევა Esanit-ის ავტოკლავის მოსავლელად
            </h1>

            <div className="space-y-10 text-slate-600 font-medium leading-relaxed mb-12">
              <p className="text-lg italic border-l-4 border-blue-500 pl-6 bg-slate-50 py-6 rounded-r-2xl font-bold uppercase shadow-sm">
                ავტოკლავი კლინიკის გულია. სწორი ექსპლუატაცია არა მხოლოდ სტერილიზაციის გარანტიაა, არამედ აპარატის ხანგრძლივი მუშაობის წინაპირობა.
              </p>

              <div className="grid grid-cols-1 gap-6 my-12">
                {tips.map((item, i) => (
                  <div key={i} className="flex items-start gap-5 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-blue-200 transition-all shadow-sm">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shrink-0 font-black italic shadow-lg">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 text-sm uppercase mb-2 tracking-tight">{item.t}</h3>
                      <p className="text-xs font-bold text-slate-500 normal-case leading-relaxed">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-2xl flex items-center gap-8 relative overflow-hidden">
                 <div className="relative z-10 flex items-center gap-6">
                    <Settings size={48} className="shrink-0 animate-spin-slow text-blue-400" />
                    <p className="text-sm font-black italic uppercase leading-relaxed text-blue-100">
                      ინჟინრის რჩევა: ბაქტერიოლოგიური ფილტრის შეცვლა ყოველ 500 ციკლში აუცილებელია. გაჭედილი ფილტრი აზიანებს ვაკუუმ-ტუმბოს.
                    </p>
                 </div>
              </div>
            </div>

            <div className="flex items-center gap-6 py-8 border-y border-slate-100 mb-12">
              <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase">
                <ThumbsUp size={18} /> Social Evidence
              </div>
              <button onClick={handleShare} className="flex items-center gap-3 text-white bg-blue-600 px-8 py-4 rounded-2xl hover:bg-blue-700 transition font-black text-[10px] uppercase ml-auto shadow-xl shadow-blue-200">
                <Share2 size={16} /> გააზიარე სტატია
              </button>
            </div>

            {/* REAL FACEBOOK COMMENTS */}
            <div className="mt-12 bg-slate-50 p-8 rounded-[3rem] border border-slate-100 shadow-inner">
               <h3 className="text-slate-900 font-black uppercase text-xs mb-8 flex items-center gap-3 tracking-widest border-b pb-4">
                  რეალური გამოხმაურებები
               </h3>
               <div className="fb-comments" data-href="https://medicalline.ge/blog/esanit-autoclave-maintenance" data-width="100%" data-numposts="5"></div>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
// vercel please update