'use client';

import React from 'react';
import { LayoutGrid, Zap, Filter } from 'lucide-react';

export default function KanbanLeads({ data, config }: any) {
  return (
    <div className="p-8 rounded-[2rem] bg-indigo-950 text-white min-h-[400px] flex flex-col justify-center items-center text-center border border-indigo-500/20 shadow-2xl overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_70%)]" />
      
      <div className="p-4 rounded-3xl bg-indigo-500/10 mb-6 border border-indigo-500/20 relative z-10">
        <LayoutGrid size={48} className="text-indigo-400" />
      </div>
      
      <h2 className="text-3xl font-black tracking-tight mb-2 relative z-10">Kanban Ultra High Performance</h2>
      <p className="text-indigo-200/60 max-w-md text-lg relative z-10">
        Fluxo acelerado de leads com automação de status por IA.
      </p>
      
      <div className="mt-8 flex items-center gap-4 relative z-10">
        <div className="px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs font-bold uppercase tracking-widest text-indigo-300">
          Superpower Active
        </div>
      </div>
    </div>
  );
}
