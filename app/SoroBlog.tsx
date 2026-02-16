"use client";

import Script from 'next/script';

export default function SoroBlog() {
  return (
    <section className="py-24 bg-white px-6 border-t border-slate-100">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-black uppercase italic mb-12 underline decoration-blue-600 underline-offset-8">
          Soro პუბლიკაციები
        </h2>
        
        {/* კონტეინერი სადაც Soro ჩატვირთავს სტატიებს */}
        <div id="soro-blog" className="min-h-[400px]"></div>

        {/* Soro-ს დინამიური სკრიპტი შენი უნიკალური ID-ით */}
        <Script 
          src="https://app.trysoro.com/api/embed/d2061d8a-816f-4b03-8f75-b11203d59f5d" 
          strategy="lazyOnload"
        />
      </div>
    </section>
  );
}