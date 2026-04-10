"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Phone, Facebook, Instagram } from 'lucide-react';

const TiktokIcon = ({ size = 22, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
  </svg>
);

const WhatsappIcon = ({ size = 28, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a5.8 5.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.015-1.04 2.476 0 1.46 1.065 2.871 1.213 3.07.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

const socialLinks = {
  whatsapp: "https://wa.me/995514011116",
  facebook: "https://www.facebook.com/medicalline.ge",
  instagram: "https://www.instagram.com/medicalgeorgialtd",
  tiktok: "https://www.tiktok.com/@medicalline",
};

export default function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Ganvadeba sidebar */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-[100] hidden md:flex flex-col">
        <a
          href="https://ganvadeba.credo.ge/account/landing/authorization"
          target="_blank"
          rel="noopener noreferrer"
          className="w-12 h-44 bg-orange-500 text-white flex flex-col items-center justify-center rounded-r-2xl hover:w-16 transition-all shadow-lg shadow-orange-500/20"
        >
          <span className="[writing-mode:vertical-lr] rotate-180 font-black uppercase text-[10px] tracking-widest italic">
            განვადება
          </span>
        </a>
      </div>

      {/* Social sidebar */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[100] hidden md:flex flex-col gap-2">
        <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-[#25D366] text-white flex items-center justify-center rounded-l-xl hover:w-16 transition-all shadow-lg">
          <WhatsappIcon size={24} />
        </a>
        <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-[#1877F2] text-white flex items-center justify-center rounded-l-xl hover:w-16 transition-all shadow-lg">
          <Facebook size={22} />
        </a>
        <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-l-xl hover:w-16 transition-all shadow-lg">
          <Instagram size={22} />
        </a>
        <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="w-12 h-12 bg-black text-white flex items-center justify-center rounded-l-xl hover:w-16 transition-all shadow-lg">
          <TiktokIcon size={20} color="white" />
        </a>
      </div>

      {/* Nav */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-sm py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link
            href="/"
            className={`text-lg md:text-2xl font-black uppercase tracking-tighter z-50 relative ${isScrolled ? 'text-blue-600' : 'text-white'}`}
          >
            Medical Line Georgia
          </Link>
          <div className="hidden md:flex items-center gap-8 font-black text-[11px] uppercase tracking-widest">
            <Link href="/" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>მთავარი</Link>
            <Link href="#about" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>ჩვენს შესახებ</Link>
            <Link href="#services" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>სერვისი</Link>
            <Link href="/catalog" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>პროდუქცია</Link>
            <Link href="/gallery" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>გალერეა</Link>
            <Link href="/blog" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition underline decoration-blue-500 underline-offset-4`}>ბლოგი</Link>
            <Link href="#contact" className={`${isScrolled ? 'text-slate-900' : 'text-white'} hover:text-blue-500 transition`}>კონტაქტი</Link>
          </div>
          <a
            href="tel:514011116"
            className={`hidden md:flex items-center gap-2 font-black text-[14px] px-4 py-2 rounded-full border ${isScrolled ? 'text-slate-900 border-slate-200' : 'text-white border-white/30'}`}
          >
            <Phone size={16} className="text-blue-600" /> 514 011 116
          </a>
        </div>
      </nav>
    </>
  );
}
