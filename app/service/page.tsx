"use client";

import React from 'react';
import { Settings, Tool, GraduationCap, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export default function ServicePage() {
  const services = [
    {
      title: "მონტაჟი და ინსტალაცია",
      desc: "ჩვენი სერტიფიცირებული ინჟინრები უზრუნველყოფენ აპარატურის სრულყოფილ მონტაჟს საერთაშორისო სტანდარტების დაცვით.",
      icon: <Settings className="w-8 h-8 text-blue-600" />
    },
    {
      title: "პერსონალის ტრენინგი",
      desc: "აპარატის ჩაბარებისას ვატარებთ დეტალურ ტრენინგს ექიმებისა და ასისტენტებისთვის, რათა მაქსიმალურად აითვისონ ციფრული ფუნქციები.",
      icon: <GraduationCap className="w-8 h-8 text-blue-600" />
    },
    {
      title: "ტექნიკური მხარდაჭერა",
      desc: "24/7 მხარდაჭერა ნებისმიერ ტექნიკურ საკითხზე. სწრაფი რეაგირება და დისტანციური დახმარება საჭიროების შემთხვევაში.",
      icon: <ShieldCheck className="w-8 h-8 text-blue-600" />
    }
  ];

  return (
    <main className="min-h-screen bg-white pt-32">
      
      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 mb-24">
        <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-white relative overflow-hidden">
          <div className="max-w-2xl relative z-10">
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-8">
              პროფესიონალური <br/> <span className="text-blue-500">სერვისი</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-10">
              ჩვენი გუნდი უზრუნველყოფს Eighteeth-ის აპარატურის სრულ ტექნიკურ ციკლს — შერჩევიდან გრძელვადიან საგარანტიო მომსახურებამდე.
            </p>
            <button className="bg-blue-600 px-8 py-4 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-white hover:text-blue-900 transition-all">
              დაგვიკავშირდით სერვისისთვის
            </button>
          </div>
          {/* ფონური დეკორაცია */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 blur-[100px] rounded-full"></div>
        </div>
      </section>

      {/* 2. სერვისების ჩამონათვალი */}
      <section className="max-w-7xl mx-auto px-6 mb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {services.map((s, i) => (
            <div key={i} className="group p-10 bg-slate-50 rounded-[2.5rem] hover:bg-white hover:shadow-2xl transition-all duration-500 border border-slate-100">
              <div className="mb-8 w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                {s.icon}
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-4">{s.title}</h3>
              <p className="text-slate-500 leading-relaxed font-medium">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. რატომ ჩვენ? */}
      <section className="bg-blue-600 py-24 text-white">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl font-black uppercase tracking-tighter italic">რატომ უნდა აირჩიოთ ჩვენი სერვისი?</h2>
            <div className="space-y-6">
              {[
                "ორიგინალი სათადარიგო ნაწილები",
                "სერტიფიცირებული ინჟინრები",
                "სწრაფი რეაგირების დრო (მაქს. 24 საათი)",
                "აპარატურის დროებითი ჩანაცვლება რემონტის დროს"
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-4">
                  <CheckCircle2 className="text-blue-200" size={24} />
                  <span className="text-lg font-bold uppercase tracking-tight">{text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative h-[400px] rounded-[3rem] overflow-hidden shadow-2xl">
            <Image 
              src="/images/g4.jpg" 
              alt="Service Support" 
              fill 
              className="object-cover"
            />
          </div>
        </div>
      </section>

    </main>
  );
}