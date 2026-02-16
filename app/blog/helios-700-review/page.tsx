"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Share2, Facebook } from 'lucide-react';

export default function HeliosArticle() {
  return (
    <main className="min-h-screen bg-white font-sans pb-24">
       <nav className="bg-slate-900 text-white py-6 px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
           <Link href="/blog" className="hover:text-blue-400 transition"><ArrowLeft/></Link>
           <span className="font-bold uppercase text-xs tracking-widest">სტატია</span>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <span className="text-blue-600 font-black text-xs uppercase tracking-widest mb-4 block">ტექნოლოგიები</span>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 uppercase leading-tight mb-8">HELIOS 700 - რატომ არის ეს სკანერი საუკეთესო არჩევანი?</h1>
        
        <img src="/images/helios700.png" alt="Helios 700" className="w-full h-auto object-contain bg-slate-50 rounded-[2rem] mb-12 border border-slate-100 p-8"/>

        <div className="prose prose-slate prose-lg mx-auto">
          <p className="font-bold text-xl text-slate-800 mb-6">
            ციფრული სტომატოლოგია უკვე აღარ არის მომავალი - ეს დღევანდელობაა. Eighteeth-ის Helios 700 არის ინსტრუმენტი, რომელიც ცვლის თამაშის წესებს.
          </p>
          
          <h3 className="text-2xl font-black uppercase text-slate-900 mt-8 mb-4">1. სიზუსტე, რომელიც გაოცებთ</h3>
          <p className="text-slate-600 mb-6">
            Helios 700-ის ერთ-ერთი მთავარი უპირატესობა მისი სიზუსტეა (20 მიკრონზე ნაკლები). ეს ნიშნავს, რომ თქვენი ორთოპედიული ნამუშევრები იქნება იდეალურად მორგებული, რაც ამცირებს კორექციის დროს და ზრდის პაციენტის კმაყოფილებას.
          </p>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-8 mb-4">2. სისწრაფე და AI ტექნოლოგია</h3>
          <p className="text-slate-600 mb-6">
            სკანერი აღჭურვილია ხელოვნური ინტელექტით, რომელიც ავტომატურად "ასუფთავებს" სკანირებულ მონაცემებს - აშორებს ენას, ლოყას და ნერწყვს რეალურ დროში. სრული თაღის სკანირება შესაძლებელია 30 წამზე ნაკლებ დროში.
          </p>

          <h3 className="text-2xl font-black uppercase text-slate-900 mt-8 mb-4">3. ფასი და პირობები</h3>
          <p className="text-slate-600 mb-6">
            სხვა ბრენდებისგან განსხვავებით, Helios 700 არ მოითხოვს ყოველწლიურ გადასახადს (Subscription fee). პროგრამული განახლებები არის სრულიად უფასო მთელი ცხოვრების განმავლობაში.
          </p>
        </div>

        <div className="mt-12 pt-12 border-t border-slate-200">
           <Link href="/catalog" className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition">
              ნახე სკანერი კატალოგში
           </Link>
        </div>
      </article>
    </main>
  );
}