"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Phone, Facebook, Instagram, Youtube, 
  Home, Grid, Image as ImageIcon, MapPin, 
  ChevronRight, MessageCircle, Camera, CheckCircle2, Mail, ArrowRight
} from 'lucide-react';

const TiktokIcon = ({ size = 22, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
  </svg>
);

export default function MedicalLineHome() {
  const [isScrolled, setIsScrolled] = useState(false);

  const socialLinks = {
    whatsapp: "https://wa.me/995514011116",
    facebook: "https://www.facebook.com/medicalline.ge",
    instagram: "https://www.instagram.com/medicalgeorgialtd",
    youtube: "https://www.youtube.com/@medicallinegeorgia858",
    tiktok: "https://www.tiktok.com/@medicalline"
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = [
    { title: "ენდომოტორი", img: "/images/econnect2.png", color: "bg-blue-50" },
    { title: "ინტრაორალური სკანერი", img: "/images/helios700.png", color: "bg-slate-50" },
    { title: "დენტალური ტომოგრაფი", img: "/images/finscan.png", color: "bg-gray-50" },
    { title: "დენტალური მიკროსკოპი", img: "/images/acuvisionx.png", color: "bg-gray-50" },
  ];

  const gallery = [
    "/images/5.jpg", "/images/1.jpg", "/images/3.jpg",
    "/images/7.jpg", "/images/4.jpg", "/images/6.jpg"
  ];

  return (
    <main className="min-h-screen bg-white font-sans text-slate-900 pb-24 md:pb-0 overflow-x-hidden selection:bg-blue-100 uppercase tracking-tighter">
      
      {/* --- SIDEBARS --- */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-[100] hidden md:flex flex-col">
        <button onClick={() => window.open('https://ganvadeba.credo.ge/account/landing/authorization', '_blank')} className="w-12 h-44 bg-orange-500 text-white flex flex-col items-center justify-center rounded-r-2xl hover:w-16 transition-all shadow-lg group">
          <div className="flex flex-col items-center gap-4 py-4 italic">
            <span className="[writing-mode:vertical-lr] rotate-180 font-black uppercase text-[10px] tracking-widest">განვადება</span>
          </div>
        </button>
      </div>

      {/* --- HEADER --- */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-sm py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className={`text-lg md:text-2xl font-black uppercase tracking-tighter z-50 relative ${isScrolled ? 'text-blue-600' : 'text-white'}`}>Medical Line Georgia</Link>
          <div className="hidden md:flex items-center gap-8 font-black text-[12px] uppercase tracking-widest">
            <Link href="/" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>მთავარი</Link>
            <Link href="/catalog" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>პროდუქცია</Link>
            <Link href="/blog" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition underline decoration-blue-500 underline-offset-4`}>ბლოგი</Link>
            <Link href="#contact" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>კონტაქტი</Link>
          </div>
        </div>
      </nav>

      {/* --- HERO --- */}
      <section className="relative h-screen min-h-[600px] flex items-center overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 z-0">
          <img src="/images/cover.png" alt="Background" className="w-full h-full object-cover brightness-[0.35] scale-105 animate-pulse-slow"/>
        </div>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-center w-full relative z-10 pt-16">
          <div className="space-y-6 text-center md:text-left">
            <span className="inline-block bg-blue-600/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest italic">Eighteeth Medical</span>
            <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9]">Inovation <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Together</span></h1>
            <div className="flex justify-center md:justify-start gap-3 mt-8">
              <Link href="/catalog" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95">კატალოგი</Link>
              <Link href="#contact" className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 italic">კონსულტაცია</Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- LOGOES SECTION (ფერადი და ორიგინალი წარწერებით) --- */}
      <div className="py-12 bg-white border-b border-slate-50 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-20">
            <div className="flex flex-col items-center gap-3">
              <img src="/images/ml-logo.png" className="h-16 md:h-20 object-contain" alt="Medical Line" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Official Distributor</span>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-200 rotate-12"></div>
            <div className="flex flex-col items-center gap-3">
              <img src="/images/eighteeth-logo.png" className="h-12 md:h-16 object-contain" alt="Eighteeth" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Exclusive Partner</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- CATEGORIES (სურათების ზომა გასწორებულია) --- */}
      <section id="catalog" className="py-16 bg-white px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 underline decoration-blue-600 italic">კატეგორიები</h2>
            <Link href="/catalog" className="text-blue-600 font-bold text-xs italic">ყველა <ChevronRight size={14}/></Link>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <Link href="/catalog" key={i} className={`group relative h-[200px] md:h-[300px] ${cat.color} rounded-[2rem] overflow-hidden p-5 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-500`}>
              <h3 className="text-sm md:text-lg font-black uppercase text-slate-900 leading-none z-10">{cat.title}</h3>
              <img src={cat.img} alt={cat.title} className="absolute bottom-0 right-0 w-[65%] h-auto object-contain group-hover:scale-110 transition-all duration-500" />
            </Link>
          ))}
        </div>
      </section>

      {/* --- BLOG PREVIEW --- */}
      <section className="py-16 bg-slate-50 px-6 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter italic">ბლოგი</h2>
              <p className="text-blue-600 font-bold text-sm">პროფესიონალური რჩევები</p>
            </div>
            <Link href="/blog" className="font-black text-xs hover:text-blue-600 transition flex items-center gap-1">ყველა <ArrowRight size={14}/></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/blog/helios-700-review" className="group bg-white p-6 rounded-[2rem] border border-slate-100 hover:shadow-xl transition-all">
              <h3 className="text-xl font-black mb-2 group-hover:text-blue-600 transition uppercase tracking-tighter">HELIOS 700 - ციფრული რევოლუცია</h3>
              <p className="text-slate-500 font-bold text-xs normal-case tracking-normal">რატომ გადადიან ექიმები Eighteeth-ის სკანერზე?</p>
            </Link>
            <Link href="/blog/rentgen-licenzireba-saqartveloshi" className="group bg-white p-6 rounded-[2rem] border border-slate-100 hover:shadow-xl transition-all">
              <h3 className="text-xl font-black mb-2 group-hover:text-blue-600 transition uppercase tracking-tighter">რენტგენის ლიცენზირება</h3>
              <p className="text-slate-500 font-bold text-xs normal-case tracking-normal">სრული ინფორმაცია კლინიკის მოსაწყობად.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* --- SERVICES --- */}
      <section id="services" className="py-16 md:py-24 bg-white px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto mb-8 italic">
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-slate-900 underline decoration-blue-600 underline-offset-8">ჩვენი სერვისი</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { t: "მონტაჟი", d: "აპარატურის ინსტალაცია და გამართვა", i: <CheckCircle2 /> },
            { t: "ტრენინგი", d: "პერსონალის სწავლება", i: <MessageCircle /> },
            { t: "სერვისი", d: "24/7 ტექნიკური მხარდაჭერა", i: <Phone /> }
          ].map((s, i) => (
            <div key={i} className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 group hover:bg-blue-600 transition-all duration-500">
              <div className="w-12 h-12 bg-white text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">{s.i}</div>
              <h4 className="font-black uppercase text-slate-900 group-hover:text-white transition-colors">{s.t}</h4>
              <p className="text-slate-500 text-xs font-bold group-hover:text-blue-50 transition-colors">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- CONTACT & FOOTER (მისამართი და ფოსტა აღდგენილია) --- */}
      <section id="contact" className="py-16 md:py-24 bg-white px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="bg-slate-50 p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <h2 className="text-2xl font-black uppercase mb-6 italic">დაგვიკავშირდით</h2>
            <form action="https://formspree.io/f/xjgoknev" method="POST" className="space-y-4">
              <input type="text" name="name" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" placeholder="სახელი"/>
              <input type="text" name="phone" required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" placeholder="ტელეფონი"/>
              <textarea name="message" rows={4} required className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" placeholder="შეტყობინება"></textarea>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-blue-700 transition-all">გაგზავნა</button>
            </form>
          </div>
          <div className="h-[400px] lg:h-[500px] rounded-[3.5rem] overflow-hidden shadow-2xl grayscale hover:grayscale-0 transition-all duration-700 border-4 border-white">
             <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2977.584347895232!2d44.7801!3d41.7251!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDHCsDQzJzMwLjQiTiA0NMKwNDYnNDguNCJF!5e0!3m2!1sen!2sge!4v1640000000000!5m2!1sen!2sge" 
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"></iframe>
          </div>
        </div>
      </section>

      <footer className="bg-slate-900 py-20 px-6 text-center text-white rounded-t-[4rem]">
         <div className="flex flex-col items-center gap-6 mb-12 italic">
            <h3 className="text-3xl font-black uppercase tracking-tighter">Medical Line Georgia</h3>
            <div className="flex flex-col gap-3 text-slate-400 font-bold text-sm tracking-widest uppercase">
               <p className="flex items-center justify-center gap-2 underline decoration-blue-600 underline-offset-4">
                  <MapPin size={18} className="text-blue-500" /> თბილისი, დ. ჯაბიძის #8
               </p>
               <p className="flex items-center justify-center gap-2">
                  <Mail size={18} className="text-blue-500" /> info@medicalline.ge
               </p>
               <a href="tel:514011116" className="flex items-center justify-center gap-2 hover:text-white transition-colors">
                  <Phone size={18} className="text-blue-500" /> 514 011 116
               </a>
            </div>
         </div>
         <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.4em]">
            © 2026 Medical Line Georgia. All rights reserved. Designed by Shota Sepishvili
         </p>
      </footer>
    </main>
  );
}