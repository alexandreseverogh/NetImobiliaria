'use client';

import React from 'react';
import { DollarSign, TrendingUp, Target, Zap } from 'lucide-react';

export default function RevenueIntelligence({ data, config }: any) {
  const primaryColor = config?.primary_color || '#a855f7';

  return (
    <div className="p-8 rounded-[2rem] bg-slate-900 text-white min-h-[400px] flex flex-col justify-center items-center text-center border border-white/10 shadow-2xl overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
      
      <div className="p-4 rounded-3xl bg-purple-500/10 mb-6 border border-purple-500/20">
        <DollarSign size={48} className="text-purple-400 animate-pulse" />
      </div>
      
      <h2 className="text-3xl font-black tracking-tight mb-2">Revenue Intelligence</h2>
      <p className="text-slate-400 max-w-md text-lg">
        Análise preditiva de faturamento e ROI em tempo real. Esta Skill está ativa e pronta para parametrização.
      </p>
      
      <div className="grid grid-cols-3 gap-8 mt-12 w-full max-w-2xl text-left">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Previsão Pro</p>
          <p className="text-xl font-bold">R$ 2.4M</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Eficiência</p>
          <p className="text-xl font-bold">94.2%</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">NPS Global</p>
          <p className="text-xl font-bold">88</p>
        </div>
      </div>
    </div>
  );
}
