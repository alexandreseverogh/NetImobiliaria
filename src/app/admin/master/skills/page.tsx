'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  SparklesIcon, 
  CpuChipIcon as CpuIcon, 
  ChartBarIcon, 
  BoltIcon, 
  CloudArrowDownIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon
} from '@heroicons/react/24/outline'
import { CreateGuard } from '@/components/admin/PermissionGuard'

interface MegaSkill {
  id: string
  name: string
  description: string
  category: 'IA' | 'BI' | 'Performance' | 'Design'
  version: string
  origin: string
  power_level: number
  is_imported: boolean
  preview_image: string
}

const GLOBAL_CATALOG: MegaSkill[] = [
  {
    id: 'artemis-ai-v4',
    name: 'Artemis AI Lead Scorer',
    description: 'Análise preditiva de comportamento de leads usando GPT-4o para pontuação automática.',
    category: 'IA',
    version: '4.2.1',
    origin: 'Frankfurt, Alemanha',
    power_level: 98,
    is_imported: true,
    preview_image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'brainstorming-sync',
    name: 'Creative Brainstorming Core',
    description: 'Motor de criatividade que gera roteiros de vendas e estratégias de marketing baseadas em dados do tenant.',
    category: 'IA',
    version: '1.5.0',
    origin: 'Austin, Texas',
    power_level: 87,
    is_imported: false,
    preview_image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'executive-plans-v2',
    name: 'Iron Strategy Executive Plans',
    description: 'Transforma dados brutos em planos de ação executivos com projeções financeiras para 24 meses.',
    category: 'BI',
    version: '2.4.1',
    origin: 'Zürich, Suíça',
    power_level: 94,
    is_imported: false,
    preview_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'revenue-intel-pro',
    name: 'Revenue Intelligence Pro',
    description: 'BI em tempo real com projeção de ROI e CAC automatizado para imobiliárias de alto padrão.',
    category: 'BI',
    version: '2.0.5',
    origin: 'Palo Alto, Califórnia',
    power_level: 92,
    is_imported: true,
    preview_image: 'https://images.unsplash.com/photo-1551288049-bbbda536339a?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'kanban-ultra-v3',
    name: 'Kanban Ultra Performance',
    description: 'Fluxo de trabalho acelerado com automação de transição de status por reconhecimento de intenção.',
    category: 'Performance',
    version: '3.0.0',
    origin: 'São Paulo, Brasil',
    power_level: 89,
    is_imported: true,
    preview_image: 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'lead-nurturing-ai',
    name: 'Artemis Lead-Nurturing',
    description: 'Cadência infinita de contatos via multicanais (WhatsApp/E-mail) com ajuste de tom por humor do lead.',
    category: 'IA',
    version: '1.0.8',
    origin: 'Tel Aviv, Israel',
    power_level: 91,
    is_imported: false,
    preview_image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=800'
  }
]

export default function SkillsMarketplace() {
  const [selectedSkill, setSelectedSkill] = useState<MegaSkill | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const handleImport = async (skill: MegaSkill) => {
    setIsImporting(true)
    try {
      const resp = await fetch('/api/admin/master/skills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          skill: {
            id: skill.id,
            name: skill.name,
            category: skill.category,
            origin: skill.origin,
            version: skill.version,
            requirements: [
              { label: 'Histórico de Atividade', target: 'activity_logs', type: 'json' },
              { label: 'Perfil de Preferências', target: 'user_preferences', type: 'json' }
            ]
          }
        })
      })

      if (resp.ok) {
        alert(`Skill ${skill.name} incorporada à Artemis com sucesso!`)
        setSelectedSkill(null)
      } else {
        alert('Erro ao importar skill da rede global.')
      }
    } catch (err) {
      console.error('Erro na rede global:', err)
    } finally {
      setIsImporting(false)
    }
  }
  
  const categories = Array.from(new Set(GLOBAL_CATALOG.map(s => s.category)))

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans selection:bg-indigo-500/30">
      {/* Header Estilo Netflix */}
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center space-x-6">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20">
            <RocketLaunchIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">Skills <span className="text-indigo-500">Marketplace</span></h1>
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em]">Tecnologia Global Conectada à sua Plataforma</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative group">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 group-hover:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar novos superpoderes..."
              className="bg-zinc-900 border-none rounded-full pl-10 pr-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500 w-64 transition-all"
            />
          </div>
          <div className="px-4 py-2 bg-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all cursor-pointer">
            Sincronizar Catálogo
          </div>
        </div>
      </header>

      {/* Hero Central */}
      <section className="relative h-[400px] rounded-[3rem] overflow-hidden mb-16 group border border-white/5">
        <img 
          src="https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=2000" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[2000ms]"
          alt="Hero"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        <div className="absolute bottom-12 left-12 max-w-2xl">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-4">
            <SparklesIcon className="h-5 w-5" />
            <span>Novo Lançamento Global</span>
          </div>
          <h2 className="text-6xl font-black mb-4 tracking-tighter leading-none">Artemis Core <br/>Intelligence <span className="text-indigo-500">4.2</span></h2>
          <p className="text-gray-300 text-lg mb-8 leading-relaxed">
            A última palavra em processamento neurais para o mercado imobiliário, direto de Frankfurt. Importe agora para elevar o nível das suas empresas subjacentes.
          </p>
          <div className="flex items-center space-x-4">
            <button className="bg-white text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all flex items-center">
              <CheckBadgeIcon className="h-5 w-5 mr-2" /> Já Importado
            </button>
            <button className="bg-white/10 backdrop-blur-md border border-white/10 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all">
              Saiba Mais
            </button>
          </div>
        </div>
      </section>

      {/* Categorias Netflix-Style */}
      <div className="space-y-16">
        {categories.map(cat => (
          <section key={cat}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black tracking-tight flex items-center">
                {cat === 'IA' && <CpuIcon className="h-6 w-6 mr-3 text-indigo-500" />}
                {cat === 'BI' && <ChartBarIcon className="h-6 w-6 mr-3 text-emerald-500" />}
                {cat === 'Performance' && <BoltIcon className="h-6 w-6 mr-3 text-amber-500" />}
                {cat === 'Design' && <SparklesIcon className="h-6 w-6 mr-3 text-pink-500" />}
                {cat} <span className="ml-3 text-zinc-700 text-sm font-bold uppercase tracking-widest">Global Marketplace</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {GLOBAL_CATALOG.filter(s => s.category === cat).map(skill => (
                <motion.div 
                  key={skill.id}
                  whileHover={{ y: -10 }}
                  onClick={() => setSelectedSkill(skill)}
                  className="bg-zinc-900/40 rounded-3xl overflow-hidden border border-white/5 cursor-pointer hover:border-indigo-500/50 transition-all relative group shadow-2xl"
                >
                  <div className="h-48 overflow-hidden relative">
                    <img src={skill.preview_image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={skill.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                    <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-black tracking-widest uppercase border border-white/10">
                      v{skill.version}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="text-sm font-black tracking-tight">{skill.name}</h4>
                       <span className="text-[10px] font-mono text-indigo-400">{skill.power_level}% POWER</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed mb-6">
                      {skill.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">
                        <GlobeAltIcon className="h-3.5 w-3.5 mr-1" /> {skill.origin}
                      </div>
                      {skill.is_imported ? (
                        <div className="text-emerald-500 flex items-center space-x-1">
                           <CheckBadgeIcon className="h-5 w-5" />
                        </div>
                      ) : (
                        <button className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-xl transition-all">
                           <CloudArrowDownIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Modal de Detalhes Estilo Netflix Preview */}
      <AnimatePresence>
        {selectedSkill && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-8"
            onClick={() => setSelectedSkill(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-zinc-950 w-full max-w-4xl rounded-[3rem] overflow-hidden border border-white/10 shadow-3xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-80 relative">
                <img src={selectedSkill.preview_image} className="w-full h-full object-cover opacity-80" alt="Detail" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                <button 
                  onClick={() => setSelectedSkill(null)}
                  className="absolute top-6 right-6 p-3 bg-black/40 rounded-full hover:bg-black/60 transition-all"
                >
                  <SparklesIcon className="h-6 w-6 rotate-45" />
                </button>
                <div className="absolute bottom-8 left-12">
                   <h2 className="text-4xl font-black tracking-tighter mb-2">{selectedSkill.name}</h2>
                   <div className="flex items-center space-x-4">
                     <span className="text-indigo-400 font-black text-sm uppercase tracking-widest">{selectedSkill.category} ELITE</span>
                     <span className="text-zinc-500 font-bold text-sm">{selectedSkill.origin}</span>
                   </div>
                </div>
              </div>
              
              <div className="p-12 grid grid-cols-3 gap-12">
                <div className="col-span-2 space-y-6">
                  <p className="text-lg text-zinc-300 leading-relaxed italic">
                    "{selectedSkill.description}"
                  </p>
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4">Requisitos de Dados</h5>
                    <ul className="text-xs space-y-2 text-zinc-400">
                      <li>• Tabela de Imóveis (Campo: ValorVenda)</li>
                      <li>• Tabela de Leads (Campos: Email, Origem, DataCadastro)</li>
                      <li>• Histórico de Interações (Últimos 12 meses)</li>
                    </ul>
                  </div>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Desenvolvedor</label>
                    <p className="text-sm font-bold">Artemis Global Labs <CheckBadgeIcon className="h-4 w-4 inline text-indigo-500" /></p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Power Level</label>
                    <div className="text-3xl font-black text-indigo-500 font-mono italic">{selectedSkill.power_level}%</div>
                  </div>
                  
                  {selectedSkill.is_imported ? (
                    <button className="w-full bg-indigo-600 disabled:opacity-50 py-5 rounded-2xl text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-500/20">
                      Skill já ativa no Hub Master
                    </button>
                  ) : (
                    <CreateGuard resource="revenue-intelligence-elite">
                      <button
                        onClick={() => handleImport(selectedSkill)}
                        disabled={isImporting}
                        className="w-full bg-white text-black py-5 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all disabled:bg-gray-400"
                      >
                        {isImporting ? 'Sincronizando...' : 'Importar Skill'}
                      </button>
                    </CreateGuard>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
