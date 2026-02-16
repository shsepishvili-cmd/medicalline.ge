"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RentgenArticle() {
  return (
    <main className="min-h-screen bg-white font-sans pb-24">
       <nav className="bg-slate-900 text-white py-6 px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
           <Link href="/blog" className="hover:text-blue-400 transition"><ArrowLeft/></Link>
           <span className="font-bold uppercase text-xs tracking-widest">სტატია</span>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <span className="text-blue-600 font-black text-xs uppercase tracking-widest mb-4 block">კანონმდებლობა</span>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 uppercase leading-tight mb-8">რენტგენის ლიცენზირება საქართველოში - რა არის საჭირო?</h1>
        
        <img src="/images/hyperlightm.png" alt="X-Ray" className="w-full h-auto object-contain bg-slate-50 rounded-[2rem] mb-12 border border-slate-100 p-8"/>

        <div className="prose prose-slate prose-lg mx-auto">
          <p className="font-bold text-xl text-slate-800 mb-6">
            სტომატოლოგიური კლინიკის გახსნისას ერთ-ერთი ყველაზე საპასუხისმგებლო ეტაპი რენტგენოლოგიური კაბინეტის მოწყობა და ლიცენზირებაა.
          </p>
          
          <h3 className="text-2xl font-black uppercase text-slate-900 mt-8 mb-4">1. ფართი და დაცვა</h3>
          <p className="text-slate-600 mb-6">
            რენტგენის კაბინეტი უნდა იყოს იზოლირებული. კედლები უნდა იყოს დაფარული სპეციალური რენტგენო-დამცავი მასალით (ბარიუმი ან ტყვია). HyperLight-ის მსგავსი პორტატული რენტგენების შემთხვევაში ლიცენზირება არ ხდება, თქვენ დაგჭირდებათ კედელზე დასამაგრებელი და საგორავებელი რენტგენები.
          </p>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-8 mb-4">2. საჭირო დოკუმენტაცია</h3>
          <ul className="list-disc pl-5 text-slate-600 mb-6 space-y-2">
             <li>განცხადება ბირთვული და რადიაციული უსაფრთხოების სააგენტოში.</li>
             <li>ფართის აზომვითი ნახაზი.</li>
             <li>აპარატის პასპორტი და სერტიფიკატი (რასაც Medical Line გაწვდით).</li>
             <li>პერსონალის კვალიფიკაციის დამადასტურებელი საბუთები.</li>
          </ul>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-8 mb-4">3. Medical Line-ის დახმარება</h3>
          <p className="text-slate-600 mb-6">
            ჩვენ არა მხოლოდ გთავაზობთ აპარატურას, არამედ გეხმარებით ლიცენზირების პროცესში. ჩვენი ინჟინრები უზრუნველყოფენ აპარატის მონტაჟს სტანდარტების დაცვით.
          </p>
        </div>
         <div className="mt-12 pt-12 border-t border-slate-200">
           <Link href="/catalog" className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition">
              ნახე რენტგენები კატალოგში
           </Link>
        </div>
      </article>
    </main>
  );
}