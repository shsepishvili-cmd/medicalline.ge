"use client";
import React from 'react';
import { Brain, Sparkles, Activity, ShieldCheck } from 'lucide-react';

export default function AiProductAssistant({ features }: { features: any[] }) {
  if (!features || features.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 border border-blue-100 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg animate-pulse">
          <Brain size={20} />
        </div>
        <h4 className="text-sm font-black text-blue-900 tracking-widest uppercase">AI დიაგნოსტიკური ანალიზი</h4>
        <Sparkles size={16} className="text-blue-400 ml-auto" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {features.map((f, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white flex gap-4 items-start transition-all hover:shadow-md">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
               <Activity size={18} />
            </div>
            <div>
              <p className="text-[11px] font-black text-blue-900 uppercase mb-1">{f.title}</p>
              <p className="text-xs text-slate-600 font-bold leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-blue-100 flex items-center gap-2 text-[10px] font-bold text-blue-500 italic">
        <ShieldCheck size={14} /> Eighteeth Medical-ის ავტორიზებული AI ალგორითმი
      </div>
    </div>
  );
}