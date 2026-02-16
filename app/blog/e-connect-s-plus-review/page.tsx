"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Share2, Facebook, X } from 'lucide-react';

export default function EConnectArticle() {
  const [showShareTooltip, setShowShareTooltip] = useState(false);

  // ეს ფუნქცია ხსნის ფეისბუქის გასაზიარებელ ფანჯარას
  const handleShare = () => {
    // ვიღებთ მიმდინარე გვერდის მისამართს
    const currentUrl = window.location.href;
    // ვქმნით ფეისბუქის სპეციალურ ლინკს
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
    // ვხსნით პატარა ფანჯარაში (Popup)
    window.open(facebookUrl, 'fbShare', 'width=600,height=400');
  };

  // პატარა ეფექტი: გვერდის ჩატვირთვიდან 2 წამში აჩვენოს მანიშნებელი ღილაკზე
  useEffect(() => {
    const timer = setTimeout(() => setShowShareTooltip(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-white font-sans pb-24 relative">
       {/* --- FLOATING SHARE BUTTON (ახალი ნავაროტკა) --- */}
       <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2">
          {/* მანიშნებელი ტექსტი */}
          <div className={`bg-slate-900 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-lg transition-all duration-500 ${showShareTooltip ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
             გაუზიარე კოლეგებს!
             <button onClick={() => setShowShareTooltip(false)} className="ml-2 opacity-50 hover:opacity-100"><X size={12}/></button>
          </div>
          
          {/* მთავარი ღილაკი */}
          <button 
            onClick={handleShare}
            onMouseEnter={() => setShowShareTooltip(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all duration-300 group relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col items-center gap-1">
               <Share2 size={24} className="group-hover:hidden transition-all"/>
               <Facebook size={24} className="hidden group-hover:block transition-all"/>
            </div>
            {/* ანიმაციური ფონი */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
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
        <div className="flex justify-between items-start">
           <span className="text-blue-600 font-black text-xs uppercase tracking-widest mb-4 block">ენდოდონტია</span>
           {/* მობილურისთვის დამატებითი გაზიარების ღილაკი ზემოთ */}
           <button onClick={handleShare} className="md:hidden text-slate-400 hover:text-blue-600 transition">
              <Share2 size={20}/>
           </button>
        </div>
        
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase leading-tight mb-8">E-CONNECT S+ — რატომ არის ეს ენდომოტორი შეუცვლელი?</h1>
        
        {/* მთავარი სურათი */}
        <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 mb-12 flex justify-center">
            <img src="/images/econnectsplus.png" alt="E-Connect S+" className="max-h-[400px] w-auto object-contain"/>
        </div>

        <div className="prose prose-slate prose-lg mx-auto">
          <p className="font-bold text-xl text-slate-800 mb-6">
            თანამედროვე ენდოდონტიაში სიზუსტე და კომფორტი გადამწყვეტია. Eighteeth-ის E-Connect S+ არის მოტორი, რომელიც აერთიანებს უსადენო თავისუფლებას, სიმძლავრეს და ინტელექტუალურ ფუნქციებს.
          </p>
          
          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-4">1. BRUSHLESS ძრავი - სიჩუმე და ძალა</h3>
          <p className="text-slate-600 mb-6">
            E-Connect S+ აღჭურვილია უახლესი თაობის "Brushless" (ნახშირის გარეშე) ძრავით. ეს ნიშნავს:
          </p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-center gap-2 font-bold text-slate-700"><CheckCircle2 size={18} className="text-blue-500"/> 10-ჯერ უფრო ხანგრძლივი მუშაობის რესურსი.</li>
            <li className="flex items-center gap-2 font-bold text-slate-700"><CheckCircle2 size={18} className="text-blue-500"/> მინიმალური ხმაური და ვიბრაცია.</li>
            <li className="flex items-center gap-2 font-bold text-slate-700"><CheckCircle2 size={18} className="text-blue-500"/> სტაბილური ბრუნვა დატვირთვის დროსაც კი.</li>
          </ul>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-4">2. ინტეგრირებული აპექს ლოკატორი</h3>
          <p className="text-slate-600 mb-6">
            აღარ არის საჭირო ცალკე აპექს ლოკატორის გამოყენება. E-Connect S+-ს აქვს ჩაშენებული ლოკატორი, რომელიც მუშაობს რეალურ დროში. 
            ეკრანზე ხედავთ ფაილის ზუსტ მდებარეობას არხში მუშაობის პროცესში.
          </p>
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 my-6">
            <h4 className="font-black text-blue-800 uppercase text-sm mb-2">APICAL ACTION ფუნქციები:</h4>
            <p className="text-sm text-slate-700 font-medium">
               როცა ფაილი უახლოვდება აპექსს, მოტორს შეუძლია ავტომატურად: შეანელოს სვლა, გაჩერდეს ან დაიწყოს უკუსვლა (Auto Reverse). ეს გამორიცხავს აპექსის დარღვევას.
            </p>
          </div>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-4">3. როტაცია და რეციპროკაცია</h3>
          <p className="text-slate-600 mb-6">
            აპარატს აქვს როგორც სრული ბრუნვის (Rotation), ისე რეციპროკული (Reciprocating) მოძრაობის რეჟიმები. თავსებადია მსოფლიოში არსებულ თითქმის ყველა ფაილების სისტემასთან.
            თქვენ შეგიძლიათ დააყენოთ სასურველი კუთხეები (მაგ: 150°/30°) მაქსიმალური ეფექტურობისთვის.
          </p>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-4">4. ერგონომიკა</h3>
          <p className="text-slate-600 mb-6">
             მინიატურული თავაკი ბრუნავს 360 გრადუსით, რაც საშუალებას გაძლევთ მარტივად მიუდგეთ ნებისმიერ კბილს. აპარატი არის ძალიან მსუბუქი და დაბალანსებული, რაც ამცირებს ხელის დაღლილობას ხანგრძლივი მუშაობისას.
          </p>
        </div>

        {/* CTA Button */}
        <div className="mt-12 pt-12 border-t border-slate-200">
           <Link href="/catalog" className="w-full py-5 bg-orange-500 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 active:scale-95">
              შეამოწმე ფასი და განვადება
           </Link>
        </div>
      </article>
    </main>
  );
}