"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { 
  ArrowLeft, Share2, Zap, Camera, Cpu, Eye, 
  PlayCircle, Globe, Printer, Activity, Glasses 
} from 'lucide-react';

export default function GDDAContent() {
  
  useEffect(() => {
    if (window.FB) {
      window.FB.XFBML.parse();
    }
  }, []);

  const handleShare = () => {
    const currentUrl = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, 'fbShare', 'width=600,height=400');
  };

  return (
      <main className="min-h-screen bg-slate-50 font-sans pb-24 uppercase tracking-tighter">
        <div id="fb-root"></div>
        <Script async defer crossOrigin="anonymous" src="https://connect.facebook.net/ka_GE/sdk.js#xfbml=1&version=v19.0" strategy="lazyOnload" />

        <nav className="bg-slate-900 text-white py-6 px-6 sticky top-0 z-50 shadow-xl">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
             <Link href="/blog" className="flex items-center gap-2 hover:text-blue-400 transition">
                <ArrowLeft size={20}/> <span className="font-bold uppercase text-[10px] tracking-widest text-slate-400">ბლოგი</span>
             </Link>
             <h1 className="text-xl font-black uppercase italic text-blue-500 tracking-tighter">Medical Blog</h1>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 py-12">
          <article className="bg-white rounded-[3rem] overflow-hidden border border-slate-200 shadow-2xl">
            
            {/* HERO IMAGE */}
            <div className="h-[600px] bg-slate-900 flex items-center justify-center overflow-hidden relative border-b">
              <img src="/images/expo_hero.jpeg" alt="GDDA 2025" className="w-full h-full object-cover opacity-60 scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
              <div className="absolute bottom-10 left-10 right-10 text-white text-center md:text-left">
                  <div className="bg-blue-600 px-6 py-3 rounded-full text-[10px] font-black uppercase mb-8 inline-block shadow-2xl tracking-[0.3em]">OFFICIAL REPORT</div>
                  <h1 className="text-4xl md:text-7xl font-black leading-[0.95] tracking-tighter mb-6 drop-shadow-2xl">
                    ქართული სტომატოლოგიის <br/> ახალი ერა
                  </h1>
              </div>
            </div>

            <div className="p-8 md:p-16">
              <div className="flex flex-wrap gap-3 mb-16 justify-center md:justify-start">
                {["GLOBAL STANDARDS", "DIGITAL LAB", "ENDODONTICS"].map((tag, t) => (
                  <span key={t} className="bg-slate-900 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 italic"># {tag}</span>
                ))}
              </div>

              <div className="space-y-12 text-slate-700 font-medium leading-relaxed mb-20">
                <p className="text-2xl md:text-4xl font-black text-slate-900 leading-[1.2] tracking-tighter italic border-l-[12px] border-blue-600 pl-8 mb-16 uppercase">
                  MEDICAL LINE-ის მისია უცვლელია: <span className="text-blue-600">გლობალური ინოვაციების</span> ინტეგრაცია ადგილობრივ ბაზარზე.
                </p>

                <div className="prose prose-lg text-slate-600 max-w-none mb-16">
                  <p className="text-lg leading-relaxed font-bold">
                    GDDA DENTAL EXPO 2025-ზე ჩვენმა გუნდმა წარმოადგინა არა მხოლოდ ცალკეული აპარატურა, არამედ **სრული ციფრული ეკოსისტემა**. დიაგნოსტიკიდან დაწყებული, ენდოდონტიური მკურნალობითა და ლაბორატორიული წარმოებით დამთავრებული — ჩვენ ვფარავთ თანამედროვე კლინიკის ყველა საჭიროებას.
                  </p>
                </div>

                {/* --- MAIN TECHNOLOGY SHOWCASE (GRID) --- */}
                <div className="space-y-12 my-24">
                  
                  {/* HELIOS 700 */}
                  <div className="bg-slate-50 p-12 rounded-[3rem] border border-slate-100 shadow-sm border-l-[10px] border-l-blue-600 hover:shadow-2xl transition-all duration-500 group">
                    <div className="flex flex-col md:flex-row gap-10 items-start">
                      <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-300 shrink-0"><Zap size={48} className="text-white fill-white" /></div>
                      <div>
                        <h3 className="text-3xl font-black text-slate-900 mb-6 tracking-tighter uppercase italic">HELIOS 700: სკანირება ვირტუალურ რეალობაში</h3>
                        <p className="normal-case text-lg text-slate-600 leading-relaxed font-medium">
                          სკანირების მომავალი აქ არის. **უკაბელო სკანერი** და **VR სათვალე** ექიმს საშუალებას აძლევს, პაციენტის პირის ღრუ დაინახოს ციფრულ განზომილებაში, რაც უზრუნველყოფს მაქსიმალურ კომფორტს და ერგონომიკას.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* FINSCAN AI */}
                  <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-xl border-l-[10px] border-l-slate-900 hover:shadow-2xl transition-all duration-500 group">
                    <div className="flex flex-col md:flex-row gap-10 items-start">
                      <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center shrink-0 shadow-2xl"><Cpu size={48} className="text-white" /></div>
                      <div>
                        <h3 className="text-3xl font-black text-slate-900 mb-6 tracking-tighter uppercase italic">FINSCAN F350 AI: ინტელექტუალური დიაგნოსტიკა</h3>
                        <p className="normal-case text-lg text-slate-600 leading-relaxed font-medium">
                          ხელოვნური ინტელექტით აღჭურვილი ტომოგრაფი, რომელიც ავტომატურად ახდენს პათოლოგიების იდენტიფიცირებას. ეს არის დიაგნოსტიკის სისწრაფის და სიზუსტის ახალი სტანდარტი.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* DIGITAL LAB */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-12 rounded-[3rem] shadow-2xl border-l-[10px] border-l-orange-500 group relative overflow-hidden">
                    <div className="flex flex-col md:flex-row gap-10 items-start relative z-10">
                      <div className="w-24 h-24 bg-orange-500 rounded-[2rem] flex items-center justify-center shrink-0 shadow-lg"><Printer size={48} className="text-white" /></div>
                      <div>
                        <h3 className="text-3xl font-black text-white mb-6 tracking-tighter uppercase italic">ციფრული ლაბორატორია</h3>
                        <p className="normal-case text-lg text-slate-300 leading-relaxed font-medium">
                          კლინიკა და ლაბორატორია ერთ სივრცეში. უახლესი **3D პრინტერები** და **CAD/CAM სისტემები** საშუალებას გვაძლევს, ქირურგიული თარგები და დროებითი კონსტრუქციები დავამზადოთ რეკორდულ დროში, მაქსიმალური სიზუსტით.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* TWO COLUMN GRID FOR OTHERS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* ENDODONTICS */}
                     <div className="bg-blue-50 p-10 rounded-[3rem] border border-blue-100 hover:shadow-xl transition-all">
                        <Activity size={40} className="text-blue-600 mb-6" />
                        <h3 className="text-2xl font-black text-slate-900 mb-4 uppercase italic">ჭკვიანი ენდოდონტია</h3>
                        <p className="normal-case text-sm text-slate-600 font-bold">
                           Eighteeth-ის უახლესი ენდო-მოტორები და აპექს-ლოკატორები. უსაფრთხოების და პროგნოზირებადობის გარანტია რთული არხების მკურნალობისას.
                        </p>
                     </div>

                     {/* OPTICS & MICROSCOPE */}
                     <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-200 hover:shadow-xl transition-all">
                        <div className="flex gap-4 mb-6">
                            <Eye size={40} className="text-slate-900" />
                            <Glasses size={40} className="text-slate-500" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-4 uppercase italic">ოპტიკური მიმართულება</h3>
                        <p className="normal-case text-sm text-slate-600 font-bold">
                           ACUVISION X მიკროსკოპი და Eighteeth Brilliance ლუპები. ჩვენ ვზრუნავთ ექიმის მხედველობაზე და ვქმნით იდეალურ ხილვადობას სამუშაო ველზე.
                        </p>
                     </div>
                  </div>
                </div>

                {/* --- VIDEO --- */}
                <div className="my-32 text-center relative">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10"></div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter italic bg-white px-10 inline-block">
                        ექსპოს ქრონიკები <PlayCircle size={40} className="inline-block ml-4 text-blue-600 align-middle"/>
                    </h2>
                    <div className="mt-12 relative w-full aspect-video rounded-[3rem] overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] border-8 border-white bg-slate-900">
                        <video className="w-full h-full object-cover" controls preload="metadata" poster="/images/expo_hero.jpeg">
                            <source src="/videos/expo_recap.mp4" type="video/mp4" />
                        </video>
                    </div>
                </div>

                {/* --- PHOTOS --- */}
                <div className="my-32">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white h-96 group hover:-translate-y-2 transition-transform duration-500">
                            <img src="/images/expo_photo1.jpeg" alt="GDDA Moment 1" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
                        </div>
                        <div className="rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white h-96 group hover:-translate-y-2 transition-transform duration-500">
                            <img src="/images/expo_photo2.jpeg" alt="GDDA Moment 2" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
                        </div>
                    </div>
                </div>

                {/* --- FINAL STATEMENT --- */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-20 rounded-[4rem] shadow-2xl text-center relative overflow-hidden my-24 group">
                   <Globe className="absolute top-10 right-10 text-white/10 group-hover:rotate-12 transition-transform duration-700" size={200} />
                   <h4 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-10 leading-none relative z-10">ერთად ვქმნით <br/> მომავალს</h4>
                   <p className="text-xl font-bold uppercase leading-relaxed text-blue-100 relative z-10 max-w-3xl mx-auto border-t border-white/20 pt-10">
                     მადლობა ნდობისთვის. MEDICAL LINE აგრძელებს მუშაობას, რათა ქართულმა სტომატოლოგიამ დაიკავოს ღირსეული ადგილი მსოფლიო რუკაზე.
                   </p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between py-12 border-y border-slate-100 mb-16 gap-8">
                <button onClick={handleShare} className="w-full md:w-auto flex items-center justify-center gap-4 text-white bg-slate-900 px-12 py-6 rounded-[2rem] hover:bg-blue-600 transition-all duration-300 font-black text-xs uppercase shadow-2xl tracking-[0.2em] active:scale-95 group">
                  <Share2 size={20} className="group-hover:rotate-12 transition-transform"/> გააზიარე სიახლე
                </button>
              </div>

              <div className="bg-slate-50 p-12 rounded-[4rem] border border-slate-100 shadow-inner">
                 <div className="fb-comments" data-href="https://medicalline.ge/blog/gdda-expo-2025" data-width="100%" data-numposts="5"></div>
              </div>

            </div>
          </article>
        </div>
      </main>
  );
}