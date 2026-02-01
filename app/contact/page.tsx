"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Phone, MapPin, Facebook, Instagram, Youtube, 
  Menu, X, Send, ChevronRight, CheckCircle2, MessageCircle, Camera
} from 'lucide-react';

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = [
    { title: "ენდოდონტია", img: "/images/Helios.jpg.png", color: "bg-blue-50" },
    { title: "ციფრული სკანერები", img: "/images/Helios.jpg.png", color: "bg-slate-50" },
    { title: "CBCT რენტგენი", img: "/images/FinscanF350.png", color: "bg-gray-50" },
    { title: "სავარძლები", img: "/images/g4.jpg", color: "bg-blue-50" },
  ];

  // გალერეის ფოტოები (მაგალითისთვის)
  const gallery = [
    "/images/Helios.jpg.png",
    "/images/g4.jpg",
    "/images/FinscanF350.png",
    "/images/Helios.jpg.png",
    "/images/g4.jpg",
    "/images/FinscanF350.png"
  ];

  return (
    <main className="min-h-screen bg-white font-sans text-slate-900">
      
      {/* --- SOCIAL SIDEBAR --- */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[100] hidden md:flex flex-col gap-2 p-4">
        <a href="https://wa.me/995514011116" target="_blank" className="w-12 h-12 bg-[#25D366] text-white flex items-center justify-center rounded-l-2xl hover:pr-8 hover:w-20 transition-all duration-300 group shadow-lg">
          <MessageCircle size={24} />
        </a>
        <a href="#" target="_blank" className="w-12 h-12 bg-[#1877F2] text-white flex items-center justify-center rounded-l-2xl hover:pr-8 hover:w-20 transition-all duration-300 group shadow-lg">
          <Facebook size={24} />
        </a>
        <a href="#" target="_blank" className="w-12 h-12 bg-[#E4405F] text-white flex items-center justify-center rounded-l-2xl hover:pr-8 hover:w-20 transition-all duration-300 group shadow-lg">
          <Instagram size={24} />
        </a>
        <a href="#" target="_blank" className="w-12 h-12 bg-[#FF0000] text-white flex items-center justify-center rounded-l-2xl hover:pr-8 hover:w-20 transition-all duration-300 group shadow-lg">
          <Youtube size={24} />
        </a>
      </div>

      {/* 1. NAVIGATION */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled || isMobileMenuOpen ? 'bg-white shadow-md py-5' : 'bg-transparent py-7 text-white'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className={`text-2xl font-black uppercase tracking-tighter ${isScrolled || isMobileMenuOpen ? 'text-blue-600' : 'text-white'}`}>
            Medical Line
          </Link>
          <div className={`hidden md:flex items-center gap-10 font-black text-[13px] uppercase tracking-[0.15em] ${isScrolled ? 'text-slate-900' : 'text-white'}`}>
            <Link href="/" className="hover:text-blue-500 transition">მთავარი</Link>
            <Link href="#about" className="hover:text-blue-500 transition">ჩვენს შესახებ</Link>
            <Link href="#catalog" className="hover:text-blue-500 transition">პროდუქცია</Link>
            <Link href="#gallery" className="hover:text-blue-500 transition">გალერეა</Link>
            <Link href="#contact" className="hover:text-blue-500 transition">კონტაქტი</Link>
          </div>
          <div className="flex items-center gap-6">
            <a href="tel:514011116" className={`hidden lg:flex items-center gap-2 font-black text-[14px] tracking-widest ${isScrolled ? 'text-slate-900' : 'text-white'}`}>
              <Phone size={16} className="text-blue-600" /> 514 011 116
            </a>
            <button className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="text-slate-900" /> : <Menu className={isScrolled ? 'text-slate-900' : 'text-white'} size={28} />}
            </button>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative h-[90vh] bg-[#0a0f1a] flex items-center overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center w-full z-10 pt-20">
          <div className="space-y-10 text-white">
            <h1 className="text-6xl md:text-8xl font-black leading-[0.85] uppercase tracking-tighter">
              Eighteeth <br/> <span className="text-blue-500">Georgia</span>
            </h1>
            <p className="text-slate-400 text-xl font-medium leading-relaxed max-w-md">
              ციფრული სტომატოლოგიის ექსკლუზიური გადაწყვეტილებები.
            </p>
            <Link href="#catalog" className="inline-block bg-white text-slate-900 px-12 py-6 rounded-xl font-black uppercase text-[12px] tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-2xl">
              კატალოგის ნახვა
            </Link>
          </div>
          <div className="relative h-[500px] w-full">
            <Image src="/images/Helios.jpg.png" alt="Helios" fill className="object-contain drop-shadow-2xl scale-110" priority />
          </div>
        </div>
      </section>

      {/* 3. ABOUT SECTION (ახალი) */}
      <section id="about" className="py-32 bg-white px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div className="relative h-[500px] rounded-[3rem] overflow-hidden shadow-2xl">
            <Image src="/images/g4.jpg" alt="About Us" fill className="object-cover" />
          </div>
          <div className="space-y-8">
            <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900">ჩვენს შესახებ</h2>
            <p className="text-slate-500 text-lg leading-relaxed font-medium">
              Medical Line Georgia არის Eighteeth-ის ოფიციალური დისტრიბუტორი საქართველოში. ჩვენი მიზანია დავნერგოთ უახლესი ციფრული ტექნოლოგიები ქართულ სტომატოლოგიურ ბაზარზე.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-4">
              <div className="p-6 bg-slate-50 rounded-2xl border-l-4 border-blue-600">
                <h4 className="font-black text-2xl text-blue-600">100%</h4>
                <p className="text-xs font-bold uppercase text-slate-500 tracking-widest">ორიგინალი ხარისხი</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border-l-4 border-blue-600">
                <h4 className="font-black text-2xl text-blue-600">24/7</h4>
                <p className="text-xs font-bold uppercase text-slate-500 tracking-widest">სერვის მხარდაჭერა</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRODUCT SECTION */}
      <section id="catalog" className="py-32 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900 mb-16 italic underline decoration-blue-600 decoration-8 underline-offset-10">პროდუქცია</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {categories.map((cat, i) => (
              <div key={i} className={`group relative h-[420px] ${cat.color} rounded-[2.5rem] overflow-hidden border border-slate-100 hover:shadow-2xl transition-all duration-500`}>
                <div className="p-10 relative z-10">
                  <h3 className="text-2xl font-black uppercase leading-none mb-3 group-hover:text-blue-600 transition-colors">{cat.title}</h3>
                  <ChevronRight size={24} className="text-slate-300 group-hover:text-blue-600 transition-all" />
                </div>
                <div className="absolute bottom-0 right-0 w-full h-1/2 p-8 transition-transform duration-700 group-hover:scale-110">
                  <Image src={cat.img} alt={cat.title} fill className="object-contain object-bottom" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. GALLERY SECTION (ახალი) */}
      <section id="gallery" className="py-32 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <Camera className="text-blue-600" size={32} />
            <h2 className="text-5xl font-black uppercase tracking-tighter text-slate-900">გალერეა</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-8">
            {gallery.map((src, i) => (
              <div key={i} className="relative h-[300px] rounded-[2rem] overflow-hidden group shadow-lg">
                <Image src={src} alt="Gallery" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-all"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. MAP & CONTACT */}
      <section id="contact" className="py-32 bg-slate-900 px-6 text-white rounded-[4rem] mx-4 mb-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20">
          <div className="space-y-10">
            <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">დაგვიკავშირდით <br/> <span className="text-blue-500">კონსულტაციისთვის</span></h2>
            <form className="space-y-6">
              <input type="text" placeholder="სახელი" className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-600 transition" />
              <textarea placeholder="შეტყობინება" rows={4} className="w-full p-5 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-600 transition"></textarea>
              <button className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-white hover:text-slate-900 transition-all">გაგზავნა</button>
            </form>
          </div>
          <div className="space-y-12">
            <div className="h-[400px] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/10 relative">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d355.7001402206416!2d44.77351658428236!3d41.72265004245749!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1ska!2sge!4v1715600000000!5m2!1ska!2sge" 
                width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy">
              </iframe>
            </div>
            <div className="flex justify-between items-center font-bold text-slate-400 uppercase text-[10px] tracking-widest">
              <span>დავით ჯაბიძის #8, თბილისი</span>
              <span>+995 514 011 116</span>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}