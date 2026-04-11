"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { ChevronLeft, Scale, Users, Zap, Clock, ShieldCheck, Eye } from 'lucide-react';

export default function BlogComparison() {
  // 2. ნახვების გენერატორი - ვიყენებთ useEffect-ს hydration error-ის თავიდან ასაცილებლად
  const [views, setViews] = React.useState(0);

  React.useEffect(() => {
    setViews(4120 + Math.floor(Math.random() * 200));
  }, []);

  return (
    <article className="min-h-screen bg-white font-sans text-slate-900 pb-20 uppercase tracking-tighter">
      
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md py-4 border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 flex justify-between items-center">
          <Link href="/blog" className="flex items-center gap-2 font-black text-xs text-blue-600 hover:gap-4 transition-all">
            <ChevronLeft size={16} /> ბლოგზე დაბრუნება
          </Link>
          <div className="flex items-center gap-4 text-slate-400 font-black text-[10px]">
            {/* 3. ნახვების გამოჩენა */}
            <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-blue-600">
              <Eye size={12} /> <span>{views || '...'}</span>
            </span>
            <span>სტატია • 7 წთ საკითხავი</span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-[10px] font-bold mb-6 inline-block italic">ტექნოლოგიური შედარება</span>
          <h1 className="text-4xl md:text-6xl font-black leading-[0.9] mb-8 italic">
            ინტრაორალური სკანერი vs საანაბეჭდო კოვზი - რომელი სჯობს რეალურ პრაქტიკაში?
          </h1>
          <p className="text-slate-500 font-bold normal-case tracking-normal text-lg max-w-2xl mx-auto italic">
            დრო, სიზუსტე და პაციენტის კომფორტი: როგორ ავირჩიოთ ოპტიმალური მეთოდი კონკრეტული კლინიკური შემთხვევისთვის.
          </p>
        </div>
      </header>

      {/* Article Content */}
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-12 text-slate-700 normal-case tracking-normal font-medium text-lg leading-relaxed">
        <section className="space-y-6">
          <p>
            იმ წამს, როცა პაციენტს კოვზით ანაბეჭდს უღებთ და გეგმით იცით, რომ შემდეგი ნაბიჯი <strong>CAD/CAM რესტავრაციაა</strong>, ყველაზე ძვირი რესურსი დრო ხდება. აქედან იწყება რეალური კითხვა: ინტრაორალური სკანერი თუ კლასიკური ანაბეჭდი?
          </p>
          <p>
            ეს თემა არ არის „ციფრული კარგი, კოვზით ცუდი“. ორივე მეთოდი მუშაობს, მაგრამ სწორი არჩევანი დამოკიდებულია არა მხოლოდ სიზუსტეზე, არამედ <strong>workflow-ზე</strong>, ლაბორატორიის მზადყოფნაზე და პაციენტის პროფილზე.
          </p>
        </section>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-12">
          <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100">
            <Zap className="text-blue-600 mb-4" />
            <h3 className="font-black uppercase text-xl mb-2 italic text-blue-900">ციფრული სკანირება</h3>
            <p className="text-sm opacity-80 font-bold">ჯაჭვი მოკლდება: იღებთ სკანს, ამოწმებთ ეკრანზე და იმავე წუთში ასწორებთ ხარვეზს. ფაილი მომენტალურად იგზავნება ლაბორატორიაში.</p>
          </div>
          <div className="p-8 bg-slate-100 rounded-[2.5rem] border border-slate-200">
            <Clock className="text-slate-600 mb-4" />
            <h3 className="font-black uppercase text-xl mb-2 italic text-slate-900">კლასიკური ანაბეჭდი</h3>
            <p className="text-sm opacity-80 font-bold">გუნდი გაწვრთნილია, ინფრასტრუქტურა ყველგანაა. არ გჭირდებათ დამატებითი კომპიუტერები და ფაილების მართვის ახალი წესები.</p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none underline decoration-orange-500 underline-offset-8 mb-6">
            სიზუსტე - სად არის რეალური სხვაობა?
          </h2>
          <p>
            სკანერი კარგია იქ, სადაც გჭირდებათ დეტალის ნახვა ადგილზე. ყელის ზონა, იმპლანტის ფორმა - თქვენ ამოწმებთ ეკრანზე მაშინვე, სანამ პაციენტი სკამზეა. კლასიკურ ანაბეჭდში შეცდომის აღმოჩენა (ბუშტუკი მარგინთან, დეფორმაცია) ხშირად გვიან ხდება, რაც იწვევს რიმეიქებს და პაციენტის განმეორებით ვიზიტს.
          </p>
        </section>

        <div className="bg-slate-900 text-white p-10 rounded-[3rem] space-y-6 italic mt-10">
          <h4 className="text-2xl font-black uppercase italic border-b border-white/20 pb-4">იდეალური სცენარი ჰიბრიდულია:</h4>
          <ul className="space-y-4 font-bold text-slate-300">
            <li className="flex gap-3"><Scale size={20} className="text-orange-500 shrink-0"/> სკანერი ყოველდღიურ ერთეულებზე (გვირგვინები, ვინირები).</li>
            <li className="flex gap-3"><Users size={20} className="text-orange-500 shrink-0"/> კოვზი სპეციფიკურ სიტუაციებში ან როგორც სარეზერვო გზა.</li>
            <li className="flex gap-3"><ShieldCheck size={20} className="text-orange-500 shrink-0"/> სტაბილური ტექნიკური მხარდაჭერა და გუნდის ტრენინგი.</li>
          </ul>
        </div>
      </div>

      {/* 4. ინდივიდუალური Facebook კომენტარები */}
      <section className="py-20 bg-slate-50 px-6 border-t border-slate-100 mt-10">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-black mb-10 italic text-center underline decoration-orange-500 underline-offset-8">დისკუსია / კითხვები</h3>
          
          <div id="fb-root"></div>
          <Script async defer crossOrigin="anonymous" src="https://connect.facebook.net/ka_GE/sdk.js#xfbml=1&version=v18.0" strategy="afterInteractive" />
          
          {/* ❗️ აქ წერია მეორე სტატიის უნიკალური ლინკი */}
          <div 
            className="fb-comments" 
            data-href="https://medicalline.ge/blog/intraoraluri-skaneri-vs-anabechdi" 
            data-width="100%" 
            data-numposts="10">
          </div>
        </div>
      </section>

    </article>
  );
}