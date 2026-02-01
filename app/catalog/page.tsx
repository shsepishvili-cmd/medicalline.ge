"use client";

import React, { useState } from 'react';
import { CheckCircle2, MessageCircle, ArrowLeft, Search, X } from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: number;
  name: string;
  img: string;
  cat: string;
  description: string;
  specs: string[];
}

export default function CatalogPage() {
  const [filter, setFilter] = useState<string>('ყველა');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const products: Product[] = [
    // --- APEX LOCATORS (ენდოდონტია) ---
    { id: 1, name: "FindPex", img: "/images/findpex.png", cat: "ენდოდონტია", description: "ახალი თაობის აპექს ლოკატორი.პლანშეტური ეკრანით", specs: ["ფერადი LCD", "ზუსტი გაზომვა"] },
    { id: 2, name: "E-PEX", img: "/images/epex.png", cat: "ენდოდონტია", description: "კლასიკური ზუსტი აპექს ლოკატორი.", specs: ["Multi-frequency", "ინტეგრირებადი"] },
    { id: 3, name: "AirPex", img: "/images/airpex.jpg", cat: "ენდოდონტია", description: "უსადენო, სუპერ-კომპაქტური აპექს ლოკატორი.", specs: ["წონა: 15გ", "LED დისპლეი"] },

    // --- ENDO MOTORS (ენდოდონტია) ---
    { id: 4, name: "E-Connect S+", img: "/images/econnectsplus.png", cat: "ენდოდონტია", description: "Brushless ენდო-მოტორი აპექს ლოკატორით.", specs: ["1500 rpm", "Brushless ძრავი"] },
    { id: 5, name: "E-Connect S", img: "/images/econnects.png", cat: "ენდოდონტია", description: "ენდო-მოტორი აპექს ლოკატორით.", specs: ["OLED ეკრანი", "ინტეგრირებული"] },
    { id: 6, name: "E-CONNECT", img: "/images/econnect.png", cat: "ენდოდონტია", description: "ენდო-მოტორი (Basic Version).", specs: ["სტანდარტული ფუნქციები"] },
    { id: 7, name: "E-xtreme", img: "/images/extreme.png", cat: "ენდოდონტია", description: "ულტრა-მსუბუქი (99გ) ენდო-მოტორი.", specs: ["360° თავაკი", "ჩუმი ძრავი"] },
    { id: 8, name: "E-Value E", img: "/images/evaluee.png", cat: "ენდოდონტია", description: "უსადენო მოტორი Adaptive Torque-ით.", specs: ["მინიატიურული თავაკი"] },
    { id: 9, name: "E-Value", img: "/images/evalue.png", cat: "ენდოდონტია", description: "ეკონომიური და საიმედო ენდო-მოტორი.", specs: ["საბაზისო ფუნქციები"] },

    // --- ENDO FILES (ენდოდონტია - ფაილები) ---
    { id: 10, name: "E-FLEX GOLD", img: "/images/eflexgold.png", cat: "ენდოდონტია", description: "თერმულად დამუშავებული ოქროსფერი NiTi ფაილები.", specs: ["მაღალი ჭრა", "Gold Heat"] },
    { id: 11, name: "E-FLEX BLUE", img: "/images/eflexblue.png", cat: "ენდოდონტია", description: "ლურჯი NiTi ფაილები Controlled Memory-ით.", specs: ["მაღალი მოქნილობა"] },
    { id: 12, name: "E-FLEX S", img: "/images/eflexs.png", cat: "ენდოდონტია", description: "სტანდარტული NiTi ფაილების სისტემა.", specs: ["უნივერსალური"] },
    { id: 13, name: "E-FLEX REC", img: "/images/eflexrec.png", cat: "ენდოდონტია", description: "რეკიპროკული მოძრაობის ფაილები.", specs: ["Reciprocating", "გამძლეობა"] },
    { id: 14, name: "E-FLEX ONE", img: "/images/eflexone.png", cat: "ენდოდონტია", description: "Single File სისტემა.", specs: ["ერთი ფაილი", "M-Wire"] },
    { id: 15, name: "E-FLEX MINI", img: "/images/eflexmini.png", cat: "ენდოდონტია", description: "მოკლე ფაილები რთული წვდომისთვის.", specs: ["შეზღუდული გახსნა"] },
    { id: 16, name: "E-FLEX RT", img: "/images/eflexrt.png", cat: "ენდოდონტია", description: "Retreatment ფაილები (გადამკურნალება).", specs: ["გუტაპერჩას მოცილება"] },
    { id: 17, name: "E-FLEX PATH", img: "/images/eflexpath.png", cat: "ენდოდონტია", description: "გლიდ პათის (ковровая дорожка) შესაქმნელი ფაილები.", specs: ["უსაფრთხო გავლა"] },
    { id: 18, name: "E-STYLE GOLD & BLUE", img: "/images/estyle.png", cat: "ენდოდონტია", description: "E-Style სერიის როტაციული ფაილები.", specs: ["Gold & Blue ვარიანტები"] },
    { id: 19, name: "Hand Files", img: "/images/handsfiles.png", cat: "ენდოდონტია", description: "K-Files, H-Files, Reamers (ხელის ფაილები).", specs: ["უჟანგავი ფოლადი"] },

    // --- OBTURATION & CONSUMABLES (ენდოდონტია) ---
    { id: 20, name: "Space-Pack & Space-Fill", img: "/images/spacepack.jpg", cat: "ენდოდონტია", description: "ობტურაციის სრული სისტემა.", specs: ["Downpack + Backfill"] },
    { id: 21, name: "Fast-Pack Pro", img: "/images/fastpackpro.png", cat: "ენდოდონტია", description: "პროფესიონალური Downpack აპარატი.", specs: ["სწრაფი გაცხელება"] },
    { id: 22, name: "Fast-Fill", img: "/images/fastfill.png", cat: "ენდოდონტია", description: "გუტაპერჩას ინჟექტორი (Backfill).", specs: ["3D შევსება"] },
    { id: 23, name: "Gutta Percha Points", img: "/images/gutta.jpg", cat: "ენდოდონტია", description: "სტანდარტული და პროტეიპერ გუტაპერჩები.", specs: ["ზუსტი ზომები"] },
    { id: 24, name: "Absorbent Paper Points", img: "/images/absorber.jpg", cat: "ენდოდონტია", description: "ქაღალდის წკირები არხის გასაშრობად.", specs: ["მაღალი შეწოვადობა"] },

    // --- ULTRASONIC & IRRIGATION (ენდოდონტია/ჰიგიენა) ---
    { id: 25, name: "UltraMint / UltraMint Pro", img: "/images/ultramint.png", cat: "ჰიგიენა", description: "სკალერი (Ultrasonic Scaler).", specs: ["სენსორული", "Pro ვერსია ბოთლით"] },
    { id: 26, name: "Ultra X", img: "/images/ultrax.jpg", cat: "ენდოდონტია", description: "ულტრაბგერითი აქტივატორი.", specs: ["45 kHz", "ირიგაციისთვის"] },
    { id: 27, name: "E-FLOW", img: "/images/eflow.png", cat: "ენდოდონტია", description: "გაცხელებადი საირიგაციო სისტემა.", specs: ["თბილი ხსნარები"] },

    // --- X-RAY & IMAGING (რადიოლოგია) ---
    { id: 28, name: "HyperLight", img: "/images/hyperlightm.png", cat: "რადიოლოგია", description: "პორტატული რენტგენი (სტანდარტული).", specs: ["65kV", "მსუბუქი"] },
    { id: 29, name: "HyperLight-G", img: "/images/hyperlightg.png", cat: "რადიოლოგია", description: "პორტატული რენტგენი (Gun Type).", specs: ["ერგონომიული"] },
    { id: 30, name: "HyperLight-M", img: "/images/hyperlightm.png", cat: "რადიოლოგია", description: "პორტატული რენტგენი მინიმალური ზომით.", specs: ["კომპაქტური"] },
    { id: 31, name: "NanoPix 1 / 2", img: "/images/nanopix1.png", cat: "რადიოლოგია", description: "რადიოვიზიოგრაფი (Size 1 და Size 2).", specs: ["მაღალი რეზოლუცია"] },
    { id: 32, name: "NanoPix 1.5", img: "/images/nanopix1.5.png", cat: "რადიოლოგია", description: "უნივერსალური ზომის სენსორი.", specs: ["შუალედური ზომა"] },
    { id: 33, name: "NanoPix-E 1.3", img: "/images/nanopix1.3.png", cat: "რადიოლოგია", description: "ეკონომიური სენსორი.", specs: ["CSI ტექნოლოგია"] },
    { id: 34, name: "NanoPix-M", img: "/images/nanopixm.png", cat: "რადიოლოგია", description: "M-Tech ტექნოლოგიის სენსორი.", specs: ["გამძლე კაბელი"] },
    { id: 35, name: "FinScan F350", img: "/images/finscan.png", cat: "რადიოლოგია", description: "CBCT აპარატი (ტომოგრაფი).", specs: ["16x10 FOV", "Canon-ის მილი"] },

    // --- DIGITAL IMPRESSIONS (სკანერები) ---
    { id: 36, name: "Helios 700", img: "/images/helios700.png", cat: "ციფრული სკანერები", description: "უსადენო სკანერი (ფლაგმანი).", specs: ["Wi-Fi 6", "16μm"] },
    { id: 37, name: "Helios 680", img: "/images/helios680.png", cat: "ციფრული სკანერები", description: "ულტრა-მსუბუქი სკანერი.", specs: ["161 გრამი"] },
    { id: 38, name: "Helios 600", img: "/images/helios600.png", cat: "ციფრული სკანერები", description: "მაღალი სიჩქარის სკანერი.", specs: ["AI ტექნოლოგია"] },
    { id: 39, name: "Helios 500", img: "/images/helios500.png", cat: "ციფრული სკანერები", description: "კომპაქტური სკანერი.", specs: ["საბაზისო მოდელი"] },

    // --- OPTICS (ოპტიკა) ---
    { id: 40, name: "Acuvision X", img: "/images/acuvisionx.jpg", cat: "ოპტიკა", description: "სტომატოლოგიური მიკროსკოპი.", specs: ["Full HD", "Vario Focus"] },
    { id: 41, name: "Brilliance", img: "/images/brilliance.jpg", cat: "ოპტიკა", description: "სტანდარტული ლუპები.", specs: ["Flip-up"] },
    { id: 42, name: "Brilliance BP", img: "/images/brilliancebp.png", cat: "ოპტიკა", description: "სპორტული ჩარჩოს ლუპები.", specs: ["მსუბუქი"] },
    { id: 43, name: "Brilliance 48°", img: "/images/brilliance48.png", cat: "ოპტიკა", description: "ერგონომიული ლუპები (Deflection).", specs: ["კისრის დაცვა"] },
    { id: 44, name: "Brilliance 48° Pro", img: "/images/brilliance48pro.jpg", cat: "ოპტიკა", description: "პროფესიონალური ერგონომიული ლუპები.", specs: ["უმაღლესი ხედვა"] },
    { id: 45, name: "Wireless Z+", img: "/images/wirelessz.jpg", cat: "ოპტიკა", description: "უსადენო განათება (Headlight).", specs: ["ძლიერი ნათება"] },

    // --- SURGERY & IMPLANT (ქირურგია) ---
    { id: 46, name: "MotorSurg", img: "/images/motorsurg.png", cat: "ქირურგია", description: "ფიზიოდისპენსერი.", specs: ["80 N.cm", "სენსორული"] },
    { id: 47, name: "Motorturbo & E-asp1", img: "/images/motorturbo.png", cat: "ქირურგია", description: "ელექტრო ძრავი და ასპირაციის სისტემა.", specs: ["1:5 თავაკი"] },
    { id: 48, name: "SurfyOne", img: "/images/surfyone.png", cat: "ქირურგია", description: "პიეზო ქირურგიული აპარატი.", specs: ["ძვლის ჭრა", "სინუს ლიფტინგი"] },

    // --- CURING & OTHERS (სხვა) ---
    { id: 49, name: "CuringPen-X", img: "/images/curinpenx.png", cat: "სხვა", description: "პოლიმერიზაციის ნათურა (ფლაგმანი).", specs: ["მეტალის კორპუსი"] },
    { id: 50, name: "CuringPen", img: "/images/curingpen.jpg", cat: "სხვა", description: "სტანდარტული პოლიმერიზაციის ნათურა.", specs: ["ძლიერი სხივი"] },
    { id: 51, name: "CuringPen-E", img: "/images/curinpene.png", cat: "სხვა", description: "ეკონომიური პოლიმერიზაციის ნათურა.", specs: ["მსუბუქი"] },
    { id: 52, name: "SofTouch", img: "/images/softouch.jpg", cat: "სხვა", description: "ბინოკულარის განათება კაბელით.", specs: ["კომპიუტერული მართვა"] },
    
    // --- STERILIZATION (სტერილიზაცია) ---
    { id: 53, name: "E-Sanit", img: "/images/esanit.png", cat: "ჰიგიენა", description: "B-კლასის ავტოკლავი.", specs: ["23L / 18L", "პრინტერი"] }
  ];

  const categories = ['ყველა', 'ენდოდონტია', 'რადიოლოგია', 'ციფრული სკანერები', 'ქირურგია', 'ოპტიკა', 'ჰიგიენა', 'სხვა'];

  const filteredProducts = products.filter(p => {
    const matchesFilter = filter === 'ყველა' || p.cat === filter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-slate-50 py-24 px-6 uppercase tracking-tighter font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <Link href="/" className="flex items-center gap-2 text-slate-500 font-bold hover:text-blue-600 transition tracking-normal underline">
            <ArrowLeft size={20}/> მთავარზე
          </Link>
          <h1 className="text-4xl md:text-5xl font-black uppercase">კატალოგი</h1>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="მოძებნე..." 
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm shadow-sm"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {categories.map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-6 py-2 rounded-full font-bold text-[10px] transition-all duration-300 ${filter === c ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-white text-slate-500 border border-slate-200'}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredProducts.map((item) => (
            <div key={item.id} onClick={() => setSelectedProduct(item)} className="group cursor-pointer relative bg-white rounded-[2.5rem] p-8 border border-slate-100 hover:shadow-2xl transition-all duration-500 flex flex-col items-center overflow-hidden">
              <div className="relative w-full h-56 mb-6 flex items-center justify-center overflow-hidden rounded-2xl">
                <img src={item.img} alt={item.name} className="max-h-full max-w-full object-contain transition-all duration-700 transform group-hover:scale-110"
                  onError={(e: any) => { e.target.src = 'https://via.placeholder.com/400x400/f8fafc/3b82f6?text=' + item.name; }} />
              </div>
              <div className="w-full text-center">
                <span className="text-[10px] font-black text-slate-400 mb-1 block uppercase">{item.cat}</span>
                <h3 className="text-base font-black text-slate-900 mb-6 h-10 flex items-center justify-center uppercase leading-none">{item.name}</h3>
                <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-colors">დეტალურად</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal / Popup */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
          <div className="relative bg-white w-full max-w-5xl rounded-[3rem] overflow-hidden flex flex-col md:flex-row p-8 animate-in zoom-in duration-300 max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 p-3 bg-slate-100 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm">
              <X size={24} />
            </button>
            <div className="md:w-1/2 flex items-center justify-center p-4">
              <img src={selectedProduct.img} alt={selectedProduct.name} className="max-h-[400px] object-contain drop-shadow-2xl" 
                onError={(e: any) => { e.target.src = 'https://via.placeholder.com/400x400/f8fafc/3b82f6?text=' + selectedProduct.name; }} />
            </div>
            <div className="md:w-1/2 p-8 md:p-16 overflow-y-auto">
              <span className="text-blue-600 font-black text-xs mb-2 block uppercase tracking-widest">{selectedProduct.cat}</span>
              <h2 className="text-4xl font-black text-slate-900 mb-6 uppercase leading-none">{selectedProduct.name}</h2>
              <p className="text-slate-600 text-lg font-bold leading-relaxed mb-8 italic">{selectedProduct.description}</p>
              <div className="space-y-4 mb-10 text-slate-700 font-bold text-sm">
                {selectedProduct.specs.map((spec: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-blue-500 shrink-0" /> {spec}
                  </div>
                ))}
              </div>
              <button onClick={() => window.open(`https://wa.me/995514011116?text=გამარჯობა, მაინტერესებს: ${selectedProduct.name}`, '_blank')}
                className="w-full py-5 bg-green-500 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 tracking-normal shadow-xl active:scale-95">
                <MessageCircle size={20} /> WhatsApp ფასი
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}