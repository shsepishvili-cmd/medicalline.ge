"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Phone, Facebook, Instagram, Youtube,
  Home, Grid, MapPin,
  ChevronRight, MessageCircle, CheckCircle2, Mail, ArrowRight, Star, Camera, BookOpen
} from 'lucide-react';

const TopGe = () => {
  useEffect(() => {
    const existingScript = document.getElementById('top-ge-script');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'top-ge-script';
    script.src = "https://counter.top.ge/counter.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (script) script.remove();
    };
  }, []);

  return (
    <div className="relative z-[110] flex items-center justify-center min-h-[50px] my-6">
       <div id="top-ge-counter-container" data-site-id="118515"></div>
    </div>
  );
};

// --- Custom Icons ---
const TiktokIcon = ({ size = 22, color = "currentColor" }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
  </svg>
);

const WhatsappIcon = ({ size = 28, color = "currentColor" }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.015-1.04 2.476 0 1.46 1.065 2.871 1.213 3.07.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
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
    { title: "ენდომოტორი", img: "/images/extreme.png", color: "bg-blue-50" },
    { title: "ინტრაორალური სკანერი", img: "/images/helios700.png", color: "bg-slate-50" },
    { title: "დენტალური ტომოგრაფი", img: "/images/finscan.png", color: "bg-gray-50" },
    { title: "დენტალური მიკროსკოპი", img: "/images/acuvisionx.jpg", color: "bg-gray-50" },
  ];

  const reviews = [
    { name: "დრ. გიორგი ბერიძე", text: "Helios 700-მა ჩემი კლინიკის მუშაობა სრულიად შეცვალა. სკანირება არის უსწრაფესი, ხოლო სიზუსტე - იდეალური. რეკომენდაცია ჩემგან!", rating: 5, product: "Helios 700" },
    { name: "დრ. ნინო კახიანი", text: "E-Connect S+ არის საუკეთესო ენდომოტორი, რაც კი გამომიყენებია. ძალიან ჩუმია, მსუბუქი და აპექს ლოკატორიც ზუსტად მუშაობს.", rating: 5, product: "E-Connect S+" },
    { name: "დრ. დავით მ.", text: "HyperLight პორტატული რენტგენი ძალიან მოსახერხებელია. სურათის ხარისხი არ ჩამოუვარდება სტაციონარულ აპარატებს.", rating: 5, product: "HyperLight" },
    { name: "დრ. ანა ს.", text: "Medical Line-ის გუნდს დიდი მადლობა ოპერატიულობისთვის. განვადება 10 წუთში დამიმტკიცეს და ინსტალაციაც მალევე გააკეთეს.", rating: 5, product: "Service" },
    { name: "დრ. ლევან ქ.", text: "Eighteeth-ის პროდუქცია ფასი/ხარისხით ნამდვილად უკონკურენტოა საქართველოში. უკვე მე-3 აპარატს ვყიდულობ თქვენთან.", rating: 5, product: "General" }
  ];

  return (
    <main className="min-h-screen bg-white font-sans text-slate-900 pb-24 md:pb-0 overflow-x-hidden selection:bg-blue-100 uppercase tracking-tighter relative">

      {/* --- SIDEBARS --- */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-[100] hidden md:flex flex-col">
        <button onClick={() => window.open('https://ganvadeba.credo.ge/account/landing/authorization', '_blank')} className="w-12 h-44 bg-orange-500 text-white flex flex-col items-center justify-center rounded-r-2xl hover:w-16 transition-all shadow-lg shadow-orange-500/20 group">
          <div className="flex flex-col items-center gap-4 py-4 italic">
            <span className="[writing-mode:vertical-lr] rotate-180 font-black uppercase text-[10px] tracking-widest">განვადება</span>
          </div>
        </button>
      </div>

      {/* Desktop Social sidebar */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[100] hidden md:flex flex-col gap-2">
        <a href={socialLinks.whatsapp} target="_blank" className="w-12 h-12 bg-[#25D366] text-white flex items-center justify-center rounded-l-xl hover:w-16 transition-all shadow-lg group"><WhatsappIcon size={24}/></a>
        <a href={socialLinks.facebook} target="_blank" className="w-12 h-12 bg-[#1877F2] text-white flex items-center justify-center rounded-l-xl hover:w-16 transition-all shadow-lg group"><Facebook size={22}/></a>
        <a href={socialLinks.instagram} target="_blank" className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-l-xl hover:w-16 transition-all shadow-lg group"><Instagram size={22}/></a>
        <a href={socialLinks.tiktok} target="_blank" className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-l-xl hover:w-16 transition-all shadow-lg group"><TiktokIcon size={20} color="white" /></a>
      </div>

      {/* --- HEADER --- */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-sm py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className={`text-lg md:text-2xl font-black uppercase tracking-tighter z-50 relative ${isScrolled ? 'text-blue-600' : 'text-white'}`}>Medical Line Georgia</Link>
          <div className="hidden md:flex items-center gap-8 font-black text-[11px] uppercase tracking-widest">
            <Link href="/" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>მთავარი</Link>
            <Link href="#about" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>ჩვენს შესახებ</Link>
            <Link href="#services" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>სერვისი</Link>
            <Link href="/catalog" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>პროდუქცია</Link>
            <Link href="/gallery" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>გალერეა</Link>
            <Link href="/blog" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition underline decoration-blue-500 underline-offset-4`}>ბლოგი</Link>
            <Link href="#contact" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>კონტაქტი</Link>
          </div>
          <a href="tel:514011116" className={`hidden md:flex items-center gap-2 font-black text-[14px] px-4 py-2 rounded-full border ${isScrolled ? 'text-slate-900 border-slate-200' : 'text-white border-white/30'}`}><Phone size={16} className="text-blue-600" /> 514 011 116</a>
        </div>
      </nav>

      {/* --- HERO --- */}
      <section className="relative h-screen min-h-[600px] flex items-center overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 z-0">
          <img src="/images/cover.png" alt="Background" className="w-full h-full object-cover brightness-[0.35] scale-105 animate-pulse-slow"/>
        </div>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-center w-full relative z-10 pt-16">
          <div className="space-y-6 text-center md:text-left">
            <span className="inline-block bg-blue-600/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest italic">Inovation Together</span>
            <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9]">Eighteeth <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Medical</span></h1>
            <div className="flex justify-center md:justify-start gap-3 mt-8">
              <Link href="/catalog" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95">კატალოგი</Link>
              <Link href="#contact" className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 italic">კონსულტაცია</Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- LOGOES SECTION --- */}
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

      {/* --- ABOUT --- */}
      <section id="about" className="py-24 bg-white px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="relative h-[300px] md:h-[450px] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-slate-50">
            <img src="/images/2.jpg" alt="About" className="w-full h-full object-cover" />
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl font-black uppercase leading-none tracking-tighter italic underline decoration-blue-600 underline-offset-8">ჩვენს შესახებ</h2>
            <p className="text-slate-600 text-lg leading-relaxed normal-case tracking-normal font-medium">
              Medical Line Georgia — Eighteeth-ის ექსკლუზიური პარტნიორი საქართველოში. <span className="font-black text-slate-900 bg-blue-50 px-2 rounded">10 წელზე მეტი გამოცდილებით</span>, ჩვენი მისიაა ქართველ სტომატოლოგებს გავუმარტივოთ წვდომა თანამედროვე ციფრულ ტექნოლოგიებზე, უზრუნველვყოთ უმაღლესი ხარისხის სერვისი და მუდმივი პროფესიული მხარდაჭერა.
            </p>
          </div>
        </div>
      </section>

      {/* --- SERVICES --- */}
      <section id="services" className="py-24 bg-slate-50 px-6 border-y border-slate-100 scroll-mt-20">
        <div className="max-w-7xl mx-auto mb-12">
            <h2 className="text-3xl font-black uppercase tracking-tighter italic underline decoration-blue-600 underline-offset-8">სერვისი</h2>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { t: "მონტაჟი", d: "აპარატურის ინსტალაცია და გამართვა", i: <CheckCircle2 /> },
            { t: "ტრენინგი", d: "პერსონალის სწავლება და კონსულტაცია", i: <MessageCircle /> },
            { t: "სერვისი", d: "24/7 ტექნიკური მხარდაჭერა და გარანტია", i: <Phone /> }
          ].map((s, i) => (
            <div key={i} className="p-8 bg-white rounded-[2.5rem] border border-slate-200 group hover:bg-blue-600 transition-all duration-500 hover:shadow-2xl">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white transition-all">{s.i}</div>
              <h4 className="font-black uppercase text-slate-900 group-hover:text-white transition-colors text-xl">{s.t}</h4>
              <p className="text-slate-500 font-bold normal-case tracking-normal group-hover:text-blue-50 transition-colors mt-2">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- CATEGORIES --- */}
      <section id="catalog" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto mb-12 flex justify-between items-end">
            <h2 className="text-3xl font-black uppercase tracking-tighter italic underline decoration-blue-600 underline-offset-8">პროდუქცია</h2>
            <Link href="/catalog" className="text-blue-600 font-black text-xs italic">ყველა კატეგორია <ChevronRight size={14} className="inline"/></Link>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <Link href="/catalog" key={i} className={`group relative h-[250px] md:h-[350px] ${cat.color} rounded-[2.5rem] overflow-hidden p-8 flex flex-col justify-between hover:shadow-2xl transition-all duration-500 border border-slate-50`}>
              <h3 className="text-xl font-black uppercase text-slate-900 leading-none z-10">{cat.title}</h3>
              <img src={cat.img} alt={cat.title} className="absolute bottom-4 right-4 w-[85%] h-auto object-contain group-hover:scale-110 transition-all duration-700" />
            </Link>
          ))}
        </div>
      </section>

      {/* --- BLOG PREVIEW --- */}
      <section className="py-24 bg-slate-50 px-6 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-black uppercase italic leading-none underline decoration-black underline-offset-8">ბლოგი</h2>
              <p className="font-bold text-blue-600 mt-4">სიახლეები და რჩევები ექიმებისთვის</p>
            </div>
            <Link href="/blog" className="font-black text-xs hover:text-blue-600 transition flex items-center gap-1">ყველა სტატია <ArrowRight size={16}/></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/blog/gdda-expo-2025" className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 transition-all hover:shadow-2xl">
              <h3 className="text-2xl font-black mb-3 group-hover:text-blue-600 transition uppercase tracking-tighter italic">GDDA EXPO 2025 - სრული მიმოხილვა</h3>
              <p className="text-slate-500 font-bold text-sm normal-case tracking-normal italic">როგორ წარსდგა MEDICAL LINE გამოფენაზე და რა იყო მთავარი სიახლეები.</p>
            </Link>
            <Link href="/blog/esanit-autoclave-maintenance" className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 transition-all hover:shadow-2xl">
              <h3 className="text-2xl font-black mb-3 group-hover:text-blue-600 transition uppercase tracking-tighter italic">ავტოკლავის მოვლის 12 წესი</h3>
              <p className="text-slate-500 font-bold text-sm normal-case tracking-normal italic">ინჟინრის რჩევები თქვენი აპარატურის ხანგრძლივი მუშაობისთვის.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* --- საინტერესო რჩევები BANNER (SORO-ს ნაცვლად) --- */}
      <section className="py-12 bg-white px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/rchevebi"
            className="group relative flex flex-col md:flex-row items-center justify-between gap-8 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-[3rem] px-10 md:px-16 py-12 md:py-16 overflow-hidden shadow-2xl border border-blue-900/30 hover:shadow-blue-900/30 transition-all duration-500"
          >
            {/* Background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.15)_0%,_transparent_60%)] pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-600/20 transition-all duration-700" />

            {/* Left: Icon + Text */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 z-10 text-center md:text-left">
              <div className="w-20 h-20 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/30 transition-all duration-300">
                <BookOpen size={36} className="text-blue-400" />
              </div>
              <div>
                <p className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.4em] mb-2">კლინიკებისთვის</p>
                <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
                  საინტერესო <br className="hidden md:block"/> რჩევები
                </h2>
                <p className="text-slate-400 font-bold text-sm normal-case tracking-normal mt-3">
                  სასარგებლო სტატიები, ინსტრუქციები და პროფესიული რჩევები
                </p>
              </div>
            </div>

            {/* Right: CTA Button */}
            <div className="z-10 flex-shrink-0">
              <span className="inline-flex items-center gap-3 bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest group-hover:bg-blue-500 transition-all duration-300 shadow-xl shadow-blue-900/40 group-hover:shadow-blue-600/40 group-hover:scale-105 active:scale-95">
                წაიკითხე
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* --- GALLERY BANNER --- */}
      <section className="py-12 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <Link href="/gallery" className="group relative block h-[250px] md:h-[300px] rounded-[3rem] overflow-hidden border-4 border-slate-100 shadow-2xl">
            <img src="/images/cover.png" alt="Gallery" className="w-full h-full object-cover brightness-[0.4] group-hover:brightness-[0.3] group-hover:scale-105 transition-all duration-700"/>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <Camera size={48} className="text-white mb-4 opacity-80"/>
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter mb-4">ფოტო გალერეა</h2>
              <span className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest group-hover:bg-blue-700 transition shadow-lg">დაათვალიერე</span>
            </div>
          </Link>
        </div>
      </section>

      {/* --- REVIEWS --- */}
      <section className="py-24 bg-slate-50 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto text-center">
           <h2 className="text-3xl font-black uppercase mb-12 italic underline decoration-blue-600 underline-offset-8">რას ამბობენ ექიმები</h2>
           <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar">
             {reviews.map((r, i) => (
                <div key={i} className="min-w-[300px] md:min-w-0 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative snap-center flex flex-col justify-between hover:shadow-xl transition-all">
                   <div>
                       <div className="absolute top-6 right-8 opacity-10">
                           <Star size={48} className="text-slate-900 fill-slate-900"/>
                       </div>
                       <div className="flex gap-1 mb-4 text-orange-400">
                          {[...Array(r.rating)].map((_, i) => <Star key={i} size={16} fill="currentColor"/>)}
                       </div>
                       <p className="text-slate-600 font-bold italic mb-6 text-left leading-relaxed text-sm">"{r.text}"</p>
                   </div>
                   <div className="text-left border-t border-slate-50 pt-4">
                       <h4 className="font-black uppercase text-slate-900 text-sm">{r.name}</h4>
                       <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{r.product}</span>
                   </div>
                </div>
             ))}
           </div>
           <button
             onClick={() => window.open('https://www.facebook.com/medicalline.ge/reviews', '_blank')}
             className="mt-8 bg-[#1877F2] text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3 mx-auto active:scale-95"
           >
              <Facebook size={20}/> დაგვიტოვეთ შეფასება Facebook-ზე
           </button>
        </div>
      </section>

      {/* --- CONTACT --- */}
      <section id="contact" className="py-24 bg-white px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="bg-slate-50 p-10 rounded-[3rem] shadow-sm border border-slate-100">
            <h2 className="text-3xl font-black uppercase mb-8 italic">დაგვიკავშირდით</h2>
            <form action="https://formspree.io/f/xjgoknev" method="POST" className="space-y-4">
              <input type="text" name="name" required className="w-full p-5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold uppercase text-xs" placeholder="თქვენი სახელი"/>
              <input type="text" name="phone" required className="w-full p-5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold uppercase text-xs" placeholder="ტელეფონის ნომერი"/>
              <textarea name="message" rows={4} required className="w-full p-5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition-all font-bold uppercase text-xs" placeholder="შეტყობინება (რომელი აპარატურა გაინტერესებთ?)"></textarea>
              <button type="submit" className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-blue-700 transition-all">გაგზავნა</button>
            </form>
          </div>
          <div className="h-[400px] lg:h-[500px] rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-white grayscale hover:grayscale-0 transition-all duration-700">
             <iframe
               src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2974.237495918335!2d44.83381831214001!3d41.80164397113052!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40446d697dced4bf%3A0xfd8f7a5b9f3bae56!2sMedical%20Line%20Georgia%20LTD!5e0!3m2!1sen!2sge!4v1771001679314!5m2!1sen!2sge"
               width="100%"
               height="100%"
               style={{ border: 0 }}
               allowFullScreen
               loading="lazy"
               referrerPolicy="no-referrer-when-downgrade">
             </iframe>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 py-20 px-6 text-center text-white rounded-t-[4rem]">
         <div className="flex flex-col items-center gap-8 mb-12 italic">
            <h3 className="text-3xl font-black uppercase tracking-tighter">Medical Line Georgia</h3>
            <div className="flex flex-col gap-3 text-slate-400 font-bold text-sm tracking-widest uppercase">
               <p className="flex items-center justify-center gap-2 underline decoration-blue-600 underline-offset-4">
                  <MapPin size={18} className="text-blue-500" /> თბილისი, დ. ჯაბიძის #8
               </p>
               <p className="flex items-center justify-center gap-2">
                  <Mail size={18} className="text-blue-500" /> ltdmedicalline@gmail.com
               </p>
               <a href="tel:514011116" className="flex items-center justify-center gap-2 hover:text-white transition-colors">
                  <Phone size={18} className="text-blue-500" /> 514 011 116
               </a>
            </div>
            <div className="mt-8 flex justify-center">
              <TopGe />
            </div>
         </div>
         <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.4em]">© 2026 MEDICAL LINE GEORGIA | DESINGED BY SHOTA SEPISHVILI</p>
      </footer>

      {/* 🟢 FLOATING WHATSAPP BUTTON (Mobile) */}
      <a
        href={socialLinks.whatsapp}
        target="_blank"
        rel="noreferrer"
        className="md:hidden fixed bottom-24 right-4 z-[100] bg-[#25D366] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_14px_0_rgba(37,211,102,0.39)] border-[3px] border-white hover:scale-110 transition-transform"
      >
        <WhatsappIcon size={26} color="white" />
      </a>

      {/* --- MOBILE NAV --- */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-lg border-t border-slate-200 z-[90] flex justify-around px-2 items-center py-3 pb-8 md:hidden shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <Link href="/" className="flex flex-col items-center gap-1 text-blue-600 hover:text-blue-800 transition w-14">
          <Home size={22} />
          <span className="text-[9px] font-black uppercase tracking-wider text-center">მთავარი</span>
        </Link>
        <Link href="/catalog" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition w-14">
          <Grid size={22} />
          <span className="text-[9px] font-black uppercase tracking-wider text-center">კატალოგი</span>
        </Link>
        <Link href="/gallery" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition w-14">
          <Camera size={22} />
          <span className="text-[9px] font-black uppercase tracking-wider text-center">გალერეა</span>
        </Link>
        <Link href="/blog" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition w-14">
          <BookOpen size={22} />
          <span className="text-[9px] font-black uppercase tracking-wider text-center">ბლოგი</span>
        </Link>
        <Link href="#contact" className="flex flex-col items-center gap-1 text-slate-400 hover:text-blue-600 transition w-14">
          <MapPin size={22} />
          <span className="text-[9px] font-black uppercase tracking-wider text-center">კონტაქტი</span>
        </Link>
      </div>

    </main>
  );
}