"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { ArrowLeft, Share2, Facebook, X, Glasses, ScanEye, Scale, CheckCircle2, MessageSquare, Award, Lightbulb, Settings, HelpCircle } from 'lucide-react';

export default function LoupesContent() {
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
           <span className="font-bold uppercase text-xs tracking-widest">გზამკვლევი</span>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* ტეგები */}
        <div className="flex gap-2 mb-6">
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">ოპტიკა</span>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">რჩევები</span>
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Eighteeth</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase leading-tight mb-8">სრული გზამკვლევი: როგორ ავარჩიოთ ბინოკულარული ლუპები 2026 წელს?</h1>
        
        {/* მთავარი სურათი */}
        <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-8 mb-12 flex justify-center shadow-inner">
            <img src="/images/loupes_main.jpg" alt="Dental Loupes" className="max-h-[400px] w-auto object-contain drop-shadow-2xl"/>
        </div>

        <div className="prose prose-slate prose-lg mx-auto">
          <p className="font-bold text-xl text-slate-800 mb-6">
            ბინოკულარული ლუპა თანამედროვე სტომატოლოგისთვის უკვე აღარ არის ფუფუნება — ეს არის აუცილებელი ინსტრუმენტი, რომელიც პირდაპირ კავშირშია შესრულებული სამუშაოს ხარისხსა და ექიმის ჯანმრთელობასთან.
          </p>
          <p className="text-slate-600 mb-8">
             ხშირად ექიმები ლუპის არჩევისას მხოლოდ გადიდებას აქცევენ ყურადღებას, თუმცა რეალურად გასათვალისწინებელია: წონა, ხედვის არე (Field of View), სიღრმისეული ხედვა (Depth of Field) და ჩარჩოს ერგონომიკა. ამ სტატიაში განვიხილავთ ყველა დეტალს Eighteeth Brilliance სერიის მაგალითზე.
          </p>
          
          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <ScanEye className="text-blue-600"/> 1. გადიდება: 2.5x, 3.0x თუ მეტი?
          </h3>
          <p className="text-slate-600 mb-6">
            სწორი გადიდების არჩევა დამოკიდებულია თქვენს სპეციალიზაციაზე. არასწორად შერჩეულმა გადიდებამ შეიძლება თავბრუსხვევა და თვალის დაღლა გამოიწვიოს.
          </p>
          <ul className="space-y-4 mb-8">
             <li className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <span className="text-slate-900 font-black block mb-2 text-lg">2.5x - 3.0x (ოქროს სტანდარტი)</span>
                <span className="text-slate-700 text-sm leading-relaxed">
                   ეს არის ყველაზე პოპულარული არჩევანი თერაპევტებისთვის, იმპლანტოლოგებისა და ორთოპედებისთვის. უპირატესობა არის <strong>ფართო ხედვის არე</strong> — თქვენ ხედავთ არა მარტო კბილს, არამედ მთლიან კვადრანტს, რაც ამარტივებს ინსტრუმენტების მიწოდებას და ორიენტაციას.
                </span>
             </li>
             <li className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <span className="text-slate-900 font-black block mb-2 text-lg">3.5x - 4.5x (ენდო და მიკრო)</span>
                <span className="text-slate-700 text-sm leading-relaxed">
                   აუცილებელია ენდოდონტიისთვის, როდესაც არხების ძებნა გიწევთ. ამ დროს ხედვის არე მცირდება, მაგრამ დეტალიზაცია იზრდება. დამწყებებისთვის რთულია შეჩვევა, მაგრამ პროფესიონალებისთვის შეუცვლელია.
                </span>
             </li>
          </ul>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <Settings className="text-blue-600"/> 2. Flip-up თუ TTL?
          </h3>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
             <div>
                <h4 className="font-bold text-slate-900 mb-2">Flip-up (ასაკეცი)</h4>
                <p className="text-sm text-slate-600 mb-4">
                   ლინზები დამაგრებულია ჩარჩოზე მექანიზმით. შეგიძლიათ ნებისმიერ დროს აწიოთ მაღლა.
                </p>
                <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                   <li>რეგულირდება გუგების მანძილი (PD)</li>
                   <li>შეუძლია გამოიყენოს სხვადასხვა ექიმმა</li>
                   <li>ოდნავ უფრო მძიმეა</li>
                </ul>
             </div>
             <div>
                <h4 className="font-bold text-slate-900 mb-2">TTL (Through The Lens)</h4>
                <p className="text-sm text-slate-600 mb-4">
                   ლინზები ჩაშენებულია პირდაპირ შუშაში. მზადდება ინდივიდუალურად.
                </p>
                <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                   <li>უფრო მსუბუქია</li>
                   <li>უფრო ფართო ხედვის არე (ლინზა თვალთან ახლოსაა)</li>
                   <li>ვერ გამოიყენებს სხვა პირი</li>
                </ul>
             </div>
          </div>
          <p className="font-bold italic text-slate-700 border-l-4 border-blue-500 pl-4 py-2 bg-slate-50">
             Medical Line Georgia გირჩევთ <strong>Flip-up</strong> სისტემას Brilliance სერიიდან, რადგან ის არის უნივერსალური, მსუბუქი და ადვილად რეგულირებადი.
          </p>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <Scale className="text-blue-600"/> 3. წონა - გადამწყვეტი ფაქტორი
          </h3>
          <p className="text-slate-600 mb-6">
            ბევრი ექიმი ყიდულობს იაფფასიან ლუპას და 1 თვეში თავს ანებებს, რადგან ცხვირზე დაწოლა და კისრის ტკივილი გაუსაძლისია.
          </p>
          
          <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl my-8 relative overflow-hidden">
             <div className="relative z-10">
                <h4 className="text-2xl font-black uppercase mb-4 text-yellow-400">Eighteeth Brilliance-ის რევოლუცია</h4>
                <p className="mb-6 text-slate-300 font-medium">
                   Eighteeth-მა გამოიყენა ავიაციაში აპრობირებული <strong>მაგნიუმის შენადნობი</strong>. შედეგად მივიღეთ ლუპა, რომელიც იმდენად მსუბუქია, რომ მუშაობისას მისი არსებობა გავიწყდებათ.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                   <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                      <span className="block font-black text-lg mb-1">Schott Glass (გერმანია)</span>
                      <p className="text-xs text-slate-300">უმაღლესი გამჭვირვალობის მინები, რომლებიც არ ამახინჯებს ფერებს და არ ღლის თვალს.</p>
                   </div>
                   <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                      <span className="block font-black text-lg mb-1">Super Light Frame</span>
                      <p className="text-xs text-slate-300">სპეციალური დიზაინი, რომელიც თანაბრად ანაწილებს წონას ცხვირსა და ყურებზე.</p>
                   </div>
                </div>
             </div>
             <Glasses className="absolute -bottom-10 -right-10 text-white/5 w-64 h-64 rotate-12"/>
          </div>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <Lightbulb className="text-blue-600"/> 4. განათება აუცილებელია?
          </h3>
          <p className="text-slate-600 mb-6">
             ლუპა ზრდის გამოსახულებას, მაგრამ ამავე დროს ამცირებს შუქის რაოდენობას, რომელიც თვალში ხვდება. ამიტომ, კარგი ლუპა განათების გარეშე ნახევრად ეფექტურია.
          </p>
          <div className="flex gap-4 items-center bg-yellow-50 p-4 rounded-xl border border-yellow-200">
              <CheckCircle2 className="text-yellow-600 min-w-[24px]"/>
              <p className="text-sm text-slate-700 font-bold">
                 Brilliance ლუპებს მოყვება უსადენო ან სადენიანი განათების დამაგრების შესაძლებლობა, რაც ქმნის იდეალურ სამუშაო პირობებს ჩრდილების გარეშე.
              </p>
          </div>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-12 mb-6 flex items-center gap-3">
             <Award className="text-blue-600"/> დასკვნა: რომელი მოდელია თქვენთვის?
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
             <div className="group cursor-pointer">
                <div className="rounded-2xl overflow-hidden mb-4 border border-slate-200 aspect-square">
                   <img src="/images/brilliance_classic.jpg" alt="Classic" className="w-full h-full object-cover group-hover:scale-110 transition duration-500"/>
                </div>
                <h4 className="font-black text-lg uppercase text-blue-600">Brilliance (სტანდარტული)</h4>
                <p className="text-sm text-slate-600 mt-2 font-medium">დამწყებებისთვის და ზოგადი პრაქტიკოსებისთვის.</p>
                <p className="text-xs text-slate-400 mt-2">მსუბუქი, Flip-up, მარტივი რეგულირება.</p>
             </div>
             <div className="group cursor-pointer">
                <div className="rounded-2xl overflow-hidden mb-4 border border-slate-200 aspect-square">
                   <img src="/images/brilliance_pro.jpg" alt="Pro" className="w-full h-full object-cover group-hover:scale-110 transition duration-500"/>
                </div>
                <h4 className="font-black text-lg uppercase text-blue-600">Brilliance 48 Pro</h4>
                <p className="text-sm text-slate-600 mt-2 font-medium">ენდოდონტებისა და ქირურგებისთვის.</p>
                <p className="text-xs text-slate-400 mt-2">Edge-to-Edge მკვეთრი გამოსახულება, ასფერული ლინზები.</p>
             </div>
          </div>

          <div className="bg-slate-100 p-6 rounded-2xl mt-8">
             <h4 className="font-black uppercase mb-2 flex items-center gap-2"><HelpCircle size={18}/> როგორ მოვუაროთ?</h4>
             <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                <li>გაწმინდეთ მხოლოდ კომპლექტში არსებული მიკროფიბრის ნაჭრით.</li>
                <li>დეზინფექციისთვის გამოიყენეთ სპირტის შემცველი ხელსახოცები (არა სპრეი პირდაპირ ლინზაზე).</li>
                <li>შეინახეთ მყარ ყუთში ტრანსპორტირებისას.</li>
             </ul>
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
                  data-href="https://medicalline.ge/blog/loupes-guide" 
                  data-width="100%" 
                  data-numposts="5">
                </div>
             </div>
        </div>

        {/* CTA Button */}
        <div className="mt-12">
           <Link href="/catalog" className="w-full py-5 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 active:scale-95">
              მოითხოვე დემო ვიზიტი
           </Link>
        </div>
      </article>
    </main>
  );
}