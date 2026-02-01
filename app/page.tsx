"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Phone, Facebook, Instagram, Youtube, 
  Home, Grid, Image as ImageIcon, MapPin, 
  ChevronRight, MessageCircle, Camera, CheckCircle2, Mail, Menu, ArrowRight
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
    <main className="min-h-screen bg-white font-sans text-slate-900 pb-24 md:pb-0 overflow-x-hidden selection:bg-blue-100">
      
      {/* --- LEFT SIDEBAR: Credo --- */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-[100] hidden md:flex flex-col">
        <button 
          onClick={() => window.open('https://ganvadeba.credo.ge/account/landing/authorization', '_blank')}
          className="w-12 h-44 bg-orange-500 text-white flex flex-col items-center justify-center rounded-r-2xl hover:w-16 transition-all shadow-lg group overflow-hidden"
        >
          <div className="flex flex-col items-center gap-4 py-4">
            <img src="/images/credo.png" className="w-8 h-auto brightness-0 invert" alt="Credo" 
              onError={(e: any) => { e.target.style.display = 'none'; }} />
            <span className="[writing-mode:vertical-lr] rotate-180 font-black uppercase text-[10px] tracking-widest whitespace-nowrap">
              განვადების ლიმიტი
            </span>
          </div>
        </button>
      </div>

      {/* --- RIGHT SIDEBAR: Social --- */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[100] hidden md:flex flex-col gap-2">
        <a href={socialLinks.whatsapp} target="_blank" className="w-12 h-12 bg-[#25D366] text-white flex items-center justify-center rounded-l-xl hover:w-16 transition-all shadow-lg group">
            <MessageCircle size={22} className="group-hover:scale-110 transition-transform"/>
        </a>
        <a href={socialLinks.facebook} target="_blank" className="w-12 h-12 bg-[#1877F2] text-white flex items-center justify-center rounded-l-xl hover:w-16 transition-all shadow-lg group">
            <Facebook size={22} className="group-hover:scale-110 transition-transform"/>
        </a>
        <a href={socialLinks.instagram} target="_blank" className="w-12 h-12 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center rounded-l-xl hover:w-16 transition-all shadow-lg group">
            <Instagram size={22} className="group-hover:scale-110 transition-transform"/>
        </a>
        <a href={socialLinks.youtube} target="_blank" className="w-12 h-12 bg-[#FF0000] text-white flex items-center justify-center rounded-l-xl hover:w-16 transition-all shadow-lg group">
            <Youtube size={22} className="group-hover:scale-110 transition-transform"/>
        </a>
        <a href={socialLinks.tiktok} target="_blank" className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-l-xl hover:w-16 transition-all shadow-lg group">
            <TiktokIcon size={20} color="white" />
        </a>
      </div>

      {/* --- HEADER --- */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className={`text-lg md:text-2xl font-black uppercase tracking-tighter z-50 relative ${isScrolled ? 'text-blue-600' : 'text-white'}`}>
            Medical Line Georgia
          </Link>
          <div className="hidden md:flex items-center gap-8 font-black text-[12px] uppercase tracking-widest">
            <Link href="/" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>მთავარი</Link>
            <Link href="#about" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>ჩვენს შესახებ</Link>
            <Link href="#services" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>სერვისი</Link>
            <Link href="/catalog" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>პროდუქცია</Link>
            <Link href="/blog" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition underline decoration-blue-500 underline-offset-4`}>ბლოგი</Link>
            <Link href="#contact" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>კონტაქტი</Link>
          </div>
          <a href="tel:514011116" className={`hidden md:flex items-center gap-2 font-black text-[14px] px-4 py-2 rounded-full border ${isScrolled ? 'text-slate-900 border-slate-200' : 'text-white border-white/30'}`}>
            <Phone size={16} className="text-blue-600" /> 514 011 116
          </a>
        </div>
      </nav>

      {/* --- HERO --- */}
      <section className="relative h-screen min-h-[600px] flex items-center overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 z-0">
          <img src="/images/cover.png" alt="Background" className="w-full h-full object-cover brightness-[0.35] scale-105 animate-pulse-slow"/>
        </div>
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-center w-full relative z-10 pt-16">
          <div className="space-y-6 text-center md:text-left">
            <span className="inline-block bg-blue-600/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">ექსკლუზიური დისტრიბუტორი</span>
            <h1 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9]">Eighteeth <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Medical</span></h1>
            <p className="text-slate-300 text-base md:text-xl max-w-md mx-auto md:mx-0 font-medium">სტომატოლოგიური ინოვაციები ერთად</p>
            <div className="flex justify-center md:justify-start gap-3">
              <Link href="/catalog" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95">კატალოგი</Link>
              <Link href="#contact" className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95">კონსულტაცია</Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- LOGOES --- */}
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
      <section id="about" className="py-16 md:py-24 bg-white px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="relative h-[300px] md:h-[450px] rounded-[2.5rem] overflow-hidden shadow-2xl">
            <img src="/images/2.jpg" alt="About" className="w-full h-full object-cover" />
          </div>
          <div className="space-y-6 text-slate-900">
            <h2 className="text-3xl font-black uppercase leading-none tracking-tighter">10 წლიანი გამოცდილება სტომატოლოგიურ ბაზარზე</h2>
            <p className="text-slate-600 text-lg leading-relaxed">Medical Line Georgia-ს ისტორია უკვე ათწლეულს ითვლის. ჩვენი გუნდი დაკომპლექტებულია პროფესიონალებით, რომლებმაც იციან ციფრული სტომატოლოგიის თითოეული ნიუანსი.</p>
            <ul className="grid grid-cols-1 gap-4">
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="font-bold text-slate-700">Eighteeth-ის ექსკლუზიური დისტრიბუცია</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="font-bold text-slate-700">ავტორიზებული სერვის-ცენტრი საქართველოში</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="font-bold text-slate-700">ინდივიდუალური ტრენინგები ექიმებისთვის</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* --- SERVICES --- */}
      <section id="services" className="py-16 md:py-24 bg-slate-50 px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto mb-8">
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-slate-900">ჩვენი <span className="text-blue-600">სერვისი</span></h2>
        </div>
        <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto pb-6 snap-x scrollbar-hide">
          {[
            { t: "მონტაჟი", d: "აპარატურის ინსტალაცია და გამართვა", i: <CheckCircle2 /> },
            { t: "ტრენინგი", d: "პერსონალის სწავლება", i: <MessageCircle /> },
            { t: "სერვისი", d: "24/7 ტექნიკური მხარდაჭერა", i: <Phone /> }
          ].map((s, i) => (
            <div key={i} className="min-w-[260px] snap-center p-6 bg-white rounded-[2rem] border border-slate-100 flex flex-col gap-4 hover:shadow-lg transition-all">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">{s.i}</div>
              <div><h4 className="font-black uppercase text-slate-900">{s.t}</h4><p className="text-slate-500 text-xs font-bold">{s.d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* --- CATEGORIES --- */}
      <section id="catalog" className="py-16 bg-white px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-slate-900">კატეგორიები</h2>
            <Link href="/catalog" className="text-blue-600 font-bold text-xs">ყველა <ChevronRight size={14}/></Link>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <Link href="/catalog" key={i} className={`group relative h-[200px] md:h-[300px] ${cat.color} rounded-[2rem] overflow-hidden p-5 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-500`}>
              <h3 className="text-sm md:text-lg font-black uppercase text-slate-900 leading-none">{cat.title}</h3>
              <img src={cat.img} alt={cat.title} className="absolute bottom-0 right-0 w-[80%] h-auto object-contain group-hover:scale-110 transition-all duration-500" />
            </Link>
          ))}
        </div>
      </section>

      {/* --- BLOG PREVIEW (დამატებულია კატეგორიების შემდეგ) --- */}
      <section className="py-16 bg-slate-50 px-6 border-y border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter">ბლოგი</h2>
              <p className="text-blue-600 font-bold text-sm">სიახლეები და რჩევები ექიმებისთვის</p>
            </div>
            <Link href="/blog" className="font-black text-xs hover:text-blue-600 transition flex items-center gap-1">ყველა სტატია <ArrowRight size={14}/></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Link href="/blog/helios-700-review" className="group bg-white p-6 rounded-[2rem] border border-slate-100 hover:shadow-xl transition-all">
              <h3 className="text-xl font-black mb-2 group-hover:text-blue-600 transition uppercase tracking-tighter">HELIOS 700 - ციფრული რევოლუცია</h3>
              <p className="text-slate-500 font-bold text-xs normal-case tracking-normal">გაიგეთ, რატომ ირჩევენ ექიმები Eighteeth-ის სკანერს...</p>
            </Link>
            <Link href="/blog/rentgen-licenzireba-saqartveloshi" className="group bg-white p-6 rounded-[2rem] border border-slate-100 hover:shadow-xl transition-all">
              <h3 className="text-xl font-black mb-2 group-hover:text-blue-600 transition uppercase tracking-tighter">რენტგენის ლიცენზირება</h3>
              <p className="text-slate-500 font-bold text-xs normal-case tracking-normal">სრული ინფორმაცია რენტგენის კაბინეტის მოსაწყობად.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* --- GALLERY --- */}
      <section id="gallery" className="py-16 bg-slate-900 text-white px-6 rounded-t-[3rem] -mt-10 scroll-mt-20">
        <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter">გალერეა</h2>
            <Camera className="text-blue-500" />
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-3">
          {gallery.map((src, i) => (
            <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-white/10 group">
              <img src={src} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="Gallery" />
            </div>
          ))}
        </div>
      </section>

      {/* --- CONTACT & MAP --- */}
      <section id="contact" className="py-16 md:py-24 bg-slate-50 px-6 scroll-mt-20 text-slate-900">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 md:gap-16">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            <h2 className="text-2xl font-black uppercase mb-6 text-slate-900">დაგვიკავშირდით</h2>
            <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-blue-900 font-bold text-sm">📍 ჩვენი მისამართია: თბილისი, დ. ჯაბიძის #8</p>
            </div>
            <form action="https://formspree.io/f/xjgoknev" method="POST" className="space-y-4">
              <input type="text" name="name" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all" placeholder="სახელი"/>
              <input type="text" name="phone" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all" placeholder="ტელეფონი"/>
              <textarea name="message" rows={4} required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500 transition-all" placeholder="შეტყობინება"></textarea>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-blue-700 transition-all">გაგზავნა</button>
            </form>
          </div>
          <div className="h-[400px] lg:h-auto rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-white relative">
             <iframe src="http://googleusercontent.com/maps.google.com/8" 
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" 
                className="grayscale hover:grayscale-0 transition-all duration-500"></iframe>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 py-16 px-6 text-center border-t border-slate-800 text-white">
         <div className="flex flex-col items-center gap-6 mb-8">
            <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">
                Medical Line <br/> <span className="text-blue-500 text-sm tracking-widest">Georgia</span>
            </h3>
            <div className="flex flex-col gap-3 text-slate-400 text-sm font-medium">
               <p className="flex items-center justify-center gap-2">
                  <MapPin size={18} className="text-blue-500" /> თბილისი, დ. ჯაბიძის #8
               </p>
               <p className="flex items-center justify-center gap-2">
                  <Mail size={18} className="text-blue-500" /> ltdmedicalline@gmail.com
               </p>
               <a href="tel:514011116" className="flex items-center justify-center gap-2 hover:text-white transition-colors">
                  <Phone size={18} className="text-blue-500" /> 514 011 116
               </a>
            </div>
         </div>
         <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">
            © 2026 Medical Line Georgia. All rights reserved. Designed by Shota Sepishvili
         </p>
      </footer>

      {/* --- MOBILE NAV --- */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-lg border-t border-slate-200 z-[100] flex justify-around items-center py-3 pb-5 md:hidden">
        <Link href="/" className="flex flex-col items-center gap-1 text-blue-600">
          <Home size={24} strokeWidth={2.5} /><span className="text-[10px] font-bold">მთავარი</span>
        </Link>
        <Link href="/catalog" className="flex flex-col items-center gap-1 text-slate-400">
          <Grid size={24} strokeWidth={2.5} /><span className="text-[10px] font-bold">კატალოგი</span>
        </Link>
        <div className="relative -top-6">
           <a href={socialLinks.whatsapp} target="_blank" className="flex items-center justify-center w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg animate-pulse">
             <MessageCircle size={28} fill="white" />
           </a>
        </div>
        <Link href="/blog" className="flex flex-col items-center gap-1 text-slate-400">
          <ImageIcon size={24} strokeWidth={2.5} /><span className="text-[10px] font-bold">ბლოგი</span>
        </Link>
        <Link href="#contact" className="flex flex-col items-center gap-1 text-slate-400">
          <MapPin size={24} strokeWidth={2.5} /><span className="text-[10px] font-bold">კონტაქტი</span>
        </Link>
      </div>
    </main>
  );
}