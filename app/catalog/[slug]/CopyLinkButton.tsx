"use client";

import React, { useState } from 'react';
import { Share2, CheckCircle2 } from 'lucide-react';

export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={copyLink} 
      className="absolute top-6 left-6 p-3 bg-white/90 backdrop-blur-sm rounded-full text-blue-600 shadow-xl hover:scale-105 transition-all flex items-center gap-2 px-5 z-20 border border-slate-100"
    >
      {copied ? <CheckCircle2 size={18}/> : <Share2 size={18}/>}
      <span className="text-xs font-black uppercase tracking-widest">
        {copied ? "ლინკი აღებულია" : "გაზიარება"}
      </span>
    </button>
  );
}