'use client'

import React from 'react'
import { ClockIcon, ChartBarIcon, FireIcon, PresentationChartLineIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'

export default function CycleDashboardPage() {
  const t = useTheme()
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className={`flex items-center justify-between border-b pb-4 ${t.borderSub}`}>
        <div>
          <h1 className={`text-2xl font-black tracking-tight uppercase italic flex items-center ${t.textPrimary}`}>
            <ClockIcon className="h-6 w-6 mr-3 text-blue-500" />
            Engenharia de Ciclos <span className="text-blue-500 ml-2">& Gargalos</span>
          </h1>
          <p className={`text-sm font-medium mt-1 ${t.textSecondary}`}>
            Análise de rastreamento de Kanban (Time in Stage & SLAs de Corretores)
          </p>
        </div>
      </div>

      <div className={`${t.isDark ? 'bg-blue-900/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'} border rounded-2xl p-6 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <ChartBarIcon className="w-48 h-48 text-blue-500" />
        </div>
        <div className="relative z-10 w-2/3">
          <h2 className={`text-xl font-bold mb-2 ${t.textPrimary}`}>Visão de Gargalos Ativada</h2>
          <p className={`text-sm ${t.textSecondary}`}>
            A infraestrutura de banco de dados para capturar a duração temporal das etapas foi definida.
            A partir de agora, o Sistema de Gatilhos Mapeados arquivará a entrada e saída exata de cada cartão pelo Pipeline.
          </p>
          <button className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center">
            <PresentationChartLineIcon className="h-4 w-4 mr-2" />Sincronizar Eventos de Ciclo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${t.cardBg} p-6 rounded-3xl`}>
          <div className={`flex items-center mb-3 ${t.textSecondary}`}>
            <ClockIcon className="h-5 w-5 mr-2" />
            <span className="text-xs uppercase font-bold tracking-widest">Lead Cycle Time (Médio)</span>
          </div>
          <div className={`text-3xl font-black ${t.textPrimary}`}>12<span className={`text-sm ml-1 ${t.textMuted}`}>Dias</span></div>
          <div className="mt-2 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 inline-block px-2 py-0.5 rounded border border-emerald-500/20">
            -2 dias vs. último mês
          </div>
        </div>

        <div className={`${t.cardBg} p-6 rounded-3xl`}>
          <div className={`flex items-center mb-3 ${t.textSecondary}`}>
            <FireIcon className="h-5 w-5 mr-2 text-red-500 opacity-70" />
            <span className="text-xs uppercase font-bold tracking-widest">Maior Gargalo</span>
          </div>
          <div className={`text-3xl font-black ${t.textPrimary}`}>Negociação</div>
          <div className={`text-sm font-medium mt-1 ${t.textMuted}`}>Tempo médio retido: 8.5 dias</div>
        </div>

        <div className={`${t.cardBg} p-6 rounded-3xl`}>
          <div className={`flex items-center mb-3 ${t.textSecondary}`}>
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs uppercase font-bold tracking-widest">SLA Time to First Action</span>
          </div>
          <div className={`text-3xl font-black ${t.textPrimary}`}>4.2<span className={`text-sm ml-1 ${t.textMuted}`}>Horas</span></div>
          <div className={`w-full rounded-full h-1.5 mt-4 ${t.isDark ? 'bg-white/5' : 'bg-gray-200'}`}>
            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '45%' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
