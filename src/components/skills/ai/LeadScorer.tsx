'use client';

import React from 'react';
import { BrainCircuit, Sparkles, Cpu } from 'lucide-react';

export default function LeadScorer({ data, config }: any) {
  return (
    <div className="p-12 rounded-[2.5rem] bg-gradient-to-br from-gray-900 to-slate-900 text-white min-h-[450px] flex flex-col justify-center items-center text-center border-4 border-slate-800 shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
        <Cpu size={200} />
      </div>
      
      <div className="p-5 rounded-full bg-emerald-500/10 mb-8 border-2 border-emerald-500/20 relative z-10 shadow-lg shadow-emerald-500/10">
        <BrainCircuit size={64} className="text-emerald-400" />
      </div>
      
      <h2 className="text-4xl font-black tracking-tight mb-4 relative z-10">Artemis AI Lead Scorer</h2>
      <p className="text-slate-400 max-w-lg text-xl leading-relaxed relative z-10">
        Nível de inteligência <span className="text-emerald-400 font-bold">Artemis 4.0</span> ativado. 
        Seus leads agora são pontuados automaticamente com base em comportamento preditivo.
      </p>
      
      <div className="mt-12 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md relative z-10 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-black uppercase tracking-widest text-emerald-400">Status da IA</span>
          <span className="px-2 py-0.5 bg-emerald-500 text-black text-[10px] font-black rounded uppercase tracking-tighter">Online</span>
        </div>
        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full w-[85%] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
