"use client";

import Link from 'next/link';
import Script from 'next/script';
import { ArrowLeft, BookOpen, Phone, Mail, MapPin } from 'lucide-react';

export default function RchevebPage() {
  return (
    <main className="min-h-screen bg-white font-sans text-slate-900 uppercase tracking-tighter overflow-x-hidden">

      {/* --- HEADER --- */}
      <nav className="w-full bg-white border-b border-slate-100 shadow-sm py-4 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-black text-[11px] uppercase tracking-widest transition"
          >
            <ArrowLeft size={16} />
            მთავარი
          </Link>
          <Link href="/" className="text-lg font-black uppercase tracking-tighter text-blue-600">
            Medical Line Georgia
          </Link>
          <a
            href="tel:514011116"
            className="hidden md:flex items-center gap-2 font-black text-[13px] text-slate-700 hover:text-blue-600 transition"
          >
            <Phone size={15} className="text-blue-600" /> 514 011 116
          </a>
        </div>
      </nav>

      {/* --- HERO BANNER --- */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-20 px-6 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-800/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-24 h-24 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-center justify-center flex-shrink-0">
            <BookOpen size={44} className="text-blue-400" />
          </div>
          <div className="text-center md:text-left">
            <p className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.4em] mb-3">კლინიკებისთვის</p>
            <h1 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter leading-none mb-4">
              საინტერესო <br/> რჩევები
            </h1>
            <p className="text-slate-400 font-bold text-base normal-case tracking-normal max-w-xl">
              სასარგებლო სტატიები, ინსტრუქციები და პროფესიული რჩევები სტომატოლოგებისთვის
            </p>
          </div>
        </div>
      </section>

      {/* --- SORO EMBED --- */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div id="soro-blog" className="min-h-[500px]"></div>
          <Script
            src="https://app.trysoro.com/api/embed/d2061d8a-816f-4b03-8f75-b11203d59f5d"
            strategy="lazyOnload"
          />
        </div>
      </section>

      {/* --- FOOTER MINI --- */}
      <footer className="bg-slate-900 py-12 px-6 text-center text-white rounded-t-[3rem] mt-12">
        <h3 className="text-xl font-black uppercase tracking-tighter mb-4 italic">Medical Line Georgia</h3>
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-slate-400 font-bold text-xs tracking-widest uppercase">
          <p className="flex items-center gap-2">
            <MapPin size={14} className="text-blue-500" /> თბილისი, დ. ჯაბიძის #8
          </p>
          <p className="flex items-center gap-2">
            <Mail size={14} className="text-blue-500" /> ltdmedicalline@gmail.com
          </p>
          <a href="tel:514011116" className="flex items-center gap-2 hover:text-white transition">
            <Phone size={14} className="text-blue-500" /> 514 011 116
          </a>
        </div>
        <p className="text-slate-600 text-[10px] uppercase font-bold tracking-[0.3em] mt-8">
          © 2026 MEDICAL LINE GEORGIA
        </p>
      </footer>

    </main>
  );
}