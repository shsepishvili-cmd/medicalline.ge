"use client"; // ✅ ეს რჩება აქ, რადგან ინტერაქტიულია

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Calendar, Eye, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { blogArticles } from './blogData'; // მონაცემების იმპორტი

export default function BlogClient() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const postsPerPage = 10;

  const filteredArticles = useMemo(() => {
    return blogArticles.filter(art => 
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredArticles.length / postsPerPage);
  const currentArticles = filteredArticles.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Navbar (Search ნაწილი) */}
      <nav className="bg-slate-900 text-white py-6 px-6 sticky top-0 z-50 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center gap-2 hover:text-blue-400 transition order-2 md:order-1">
            <ArrowLeft size={20}/> <span className="font-bold uppercase text-[10px] tracking-widest text-slate-400">მთავარზე</span>
          </Link>
          <h1 className="text-2xl font-black uppercase tracking-tighter order-1 md:order-2 italic text-blue-500">Medical Blog</h1>
          <div className="relative w-full md:w-64 order-3 text-white">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="ძიება..." 
              className="w-full bg-slate-800 border-none rounded-xl py-2 pl-10 pr-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>
      </nav>

      {/* Grid List */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {currentArticles.map((article) => (
            <Link href={`/blog/${article.slug}`} key={article.id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-slate-200 hover:shadow-2xl transition-all duration-500 flex flex-col h-full border-b-8 border-transparent hover:border-blue-600">
              <div className="h-72 bg-slate-100 flex items-center justify-center p-8 overflow-hidden relative">
                 <img src={article.image} alt={article.title} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"/>
                 <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-[9px] font-black uppercase text-slate-600 flex items-center gap-2 shadow-sm border border-slate-100">
                    <Calendar size={12} className="text-blue-600"/> {article.date}
                 </div>
              </div>
              
              <div className="p-8 flex flex-col flex-grow">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <span className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                    <Eye size={12}/> {article.baseViews} ნახვა
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                    <Clock size={12}/> {article.readTime}
                  </span>
                </div>

                <h2 className="text-2xl font-black text-slate-900 uppercase leading-none mb-4 group-hover:text-blue-600 transition tracking-tighter line-clamp-2">
                  {article.title}
                </h2>
                
                <p className="text-slate-600 font-medium leading-relaxed mb-8 flex-grow line-clamp-3">
                  {article.excerpt}
                </p>
                
                <div className="mt-auto flex justify-between items-center pt-6 border-t border-slate-100">
                  <span className="text-blue-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all">
                    წაიკითხე სრულად <ArrowRight size={18}/>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 pt-8 border-t border-slate-200">
            {[...Array(totalPages)].map((_, i) => (
              <button key={i} onClick={() => paginate(i + 1)} className={`w-14 h-14 rounded-2xl font-black transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-200'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}