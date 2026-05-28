'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SparklesIcon, CommandLineIcon, CpuChipIcon, ShareIcon } from '@heroicons/react/24/outline'
import { ExecuteGuard } from '@/components/admin/PermissionGuard'

export default function BrainstormingSkillPage() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchConfig = async () => {
    try {
      const resp = await fetch('/api/admin/master/provisioning/my-skill-config?slug=brainstorming-sync')
      const data = await resp.json()
      setConfig(data)
    } catch (err) {
      console.error('Erro ao carregar skill config')
    } finally {
      setLoading(false)
    }
  }

  const generateInsight = async () => {
    setIsGenerating(true)
    try {
      const resp = await fetch('/api/admin/master/skills/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'brainstorming-sync' })
      })
      const data = await resp.json()
      if (data.success) {
        setAiInsight(data.insight)
      }
    } catch (err) {
      console.error('Erro ao gerar insight:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  useEffect(() => {
    if (config && !aiInsight && !isGenerating) {
      generateInsight()
    }
  }, [config])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
       <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  )

  const allMappingsCount = (config?.requirements?.length || 0) + (config?.custom_mappings?.length || 0);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header Premium */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-12 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <SparklesIcon className="h-48 w-48 text-white rotate-12" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-indigo-500/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] flex items-center">
              <SparklesIcon className="h-4 w-4 mr-2 text-indigo-300" />
              Artemis Superpower Active
            </div>
          </div>
          
          <h1 className="text-5xl font-black tracking-tighter mb-4">Creative Brainstorming <span className="text-indigo-400">Core</span></h1>
          <p className="text-indigo-100/70 text-lg max-w-xl font-medium leading-relaxed">
            Motor de inteligência estratégica que analisa o seu banco de dados para gerar insights de vendas imobiliárias em tempo real.
          </p>
        </div>
      </div>

      {/* Grid de Impacto */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status do Data Bridging */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl">
           <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center">
             <CommandLineIcon className="h-5 w-5 mr-3 text-indigo-500" />
             Status do Mapeamento de Dados (Data Bridging)
           </h3>

           <div className="space-y-6">
              {/* Pontes do DNA (Padrão) */}
              {(config?.requirements || []).map((req: any, idx: number) => {
                const mapping = config.mappings?.[req.id] || config.mappings?.[req.label] || req.default_mapping;
                const isDefaultFallback = mapping === req.default_mapping && !config.mappings?.[req.id] && !config.mappings?.[req.label];

                return (
                  <div key={idx} className="flex items-center justify-between p-6 bg-indigo-50/30 rounded-3xl border border-indigo-100/30 transition-all">
                     <div className="flex items-center space-x-4">
                       <div className="p-3 bg-white rounded-2xl shadow-sm">
                         <CpuChipIcon className={`h-6 w-6 ${mapping ? 'text-indigo-600' : 'text-gray-300'}`} />
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{req.label}</p>
                         <p className={`text-lg font-black italic uppercase ${mapping ? 'text-indigo-900' : 'text-gray-400'}`}>
                           {mapping || 'Não Mapeado'}
                         </p>
                       </div>
                     </div>
                     <div className={`text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest flex items-center ${mapping ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                       <div className={`h-2 w-2 rounded-full mr-2 ${mapping ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></div>
                       {isDefaultFallback ? 'Ativo (Padrão DNA)' : (mapping ? 'Ativo' : 'Pendente')}
                     </div>
                  </div>
                )
              })}

              {/* Pontes Ad Hoc (Personalizadas) */}
              {(config?.custom_mappings || []).map((extra: any, idx: number) => (
                <div key={`extra-${idx}`} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-200/50 transition-all">
                   <div className="flex items-center space-x-4">
                     <div className="p-3 bg-white rounded-2xl shadow-sm">
                       <ShareIcon className="h-6 w-6 text-slate-400" />
                     </div>
                     <div>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{extra.label} (Custom)</p>
                       <p className="text-lg font-black text-slate-800 italic uppercase">
                         {extra.table}.{extra.column}
                       </p>
                     </div>
                   </div>
                   <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full uppercase tracking-widest flex items-center">
                     <div className="h-2 w-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                     Ativo (Ad Hoc)
                   </div>
                </div>
              ))}
           </div>

           <div className="mt-12 p-8 bg-indigo-50/10 rounded-[2rem] border border-indigo-100/20">
              <p className="text-xs font-black text-indigo-900/60 leading-relaxed italic uppercase tracking-widest">
                 "Motor Master configurado para processar dados de {allMappingsCount} fontes distintas e gerar inteligência convergente."
              </p>
           </div>
        </div>

        {/* Simulação de Benefício Tangível */}
        <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden group">
           <div className="relative z-10">
             <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-10">Sugestão da IA em Tempo Real</h4>
             
             {isGenerating ? (
               <div className="space-y-4 py-8">
                  <div className="h-3 bg-white/10 rounded-full w-full animate-pulse"></div>
                  <div className="h-3 bg-white/10 rounded-full w-5/6 animate-pulse"></div>
                  <div className="h-3 bg-white/10 rounded-full w-4/6 animate-pulse"></div>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] text-center pt-4">Raciocinando...</p>
               </div>
             ) : (
               <div className="min-h-[200px]">
                 <p className="text-2xl font-black leading-tight mb-8">
                   {aiInsight || "Aguardando inicialização da Inteligência..."}
                 </p>
                 <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                   Baseado em: {Object.values(config?.mappings || {}).join(" + ") || 'Mapeamento Master'}
                 </p>
               </div>
             )}
           </div>
           
           <ExecuteGuard resource="brainstorming-sync">
             <button
              onClick={generateInsight}
              disabled={isGenerating}
              className="w-full py-5 bg-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-900/40 hover:bg-indigo-500 transition-all relative z-10 disabled:opacity-50"
             >
                {isGenerating ? 'Processando Automação...' : 'Regerar Brainstorming'}
             </button>
           </ExecuteGuard>

           <div className="absolute -bottom-20 -left-20 h-64 w-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>
        </div>
      </div>
    </div>
  )
}
