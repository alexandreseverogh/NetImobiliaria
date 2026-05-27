'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CubeIcon, 
  TableCellsIcon, 
  SparklesIcon, 
  AdjustmentsVerticalIcon,
  Squares2X2Icon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

type GovernanceData = {
  segments: any[]
  modules: any[]
  allFeatures: any[]
}

export default function GovernanceCockpit() {
  const [data, setData] = useState<GovernanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'segments' | 'modules' | 'inventory'>('inventory')
  const [search, setSearch] = useState('')
  
  // Estados para Modais
  const [editingSkill, setEditingSkill] = useState<any | null>(null)
  const [availableTables, setAvailableTables] = useState<string[]>([])
  const [isSavingSkill, setIsSavingSkill] = useState(false)
  const [isAssociating, setIsAssociating] = useState<{ type: 'feature' | 'module', targetId: string } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch('/api/admin/master/governance/data')
      if (!resp.ok) {
        const errText = await resp.text();
        setError(`Erro HTTP ${resp.status}: ${errText.substring(0, 100)}`);
        return;
      }
      const json = await resp.json()
      if (json.success) {
        setData(json)
      } else {
        setError(json.error || 'Erro desconhecido na API');
      }
    } catch (err: any) {
      console.error('Erro ao carregar governança:', err)
      setError(`Erro de Rede: ${err.message}`);
    } finally {
      setLoading(false)
    }
  }

  const handleDeassociation = async (sourceId: string, targetId: string, type: 'feature' | 'module') => {
    if (!confirm(`Deseja realmente desvincular este ${type === 'feature' ? 'item' : 'módulo'}? Isso afetará o acesso de todos os tenants!`)) return

    try {
      const resp = await fetch('/api/admin/master/governance/association', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: type === 'feature' ? 'feature-module' : 'module-segment',
          sourceId: sourceId,
          targetId: targetId
        })
      })
      if (resp.ok) {
        fetchData()
        toast.success('Desvinculado com sucesso!')
      }
    } catch (err) {
      console.error('Erro na desassociação:', err)
      toast.error('Erro ao desvincular')
    }
  }

  const handleAssociation = async (sourceId: string) => {
    if (!isAssociating) return
    try {
      const resp = await fetch('/api/admin/master/governance/association', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: isAssociating.type === 'feature' ? 'feature-module' : 'module-segment',
          sourceId: sourceId,
          targetId: isAssociating.targetId
        })
      })
      if (resp.ok) {
        fetchData()
        setIsAssociating(null)
        toast.success('Associação concluída!')
      }
    } catch (err) {
      console.error('Erro na associação:', err)
      toast.error('Erro ao associar')
    }
  }

  const toggleSkillStatus = async (feature: any) => {
    const nextStatus = !feature.is_skill
    try {
      const resp = await fetch('/api/admin/master/governance/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId: feature.id, is_skill: nextStatus })
      })
      if (resp.ok) {
        fetchData()
        toast.success(nextStatus ? 'Skill Ativada!' : 'Skill Desativada')
      }
    } catch (err) {
      console.error('Erro ao atualizar feature:', err)
    }
  }

  const loadTables = async () => {
    try {
      const resp = await fetch('/api/admin/master/governance/tables')
      const data = await resp.json()
      if (data.success) setAvailableTables(data.tables)
    } catch (err) {
      console.error('Erro ao carregar tabelas')
    }
  }

  const handleUpdateSkillProtocol = async (metadata: any) => {
    if (!editingSkill) return
    setIsSavingSkill(true)
    try {
      const resp = await fetch('/api/admin/master/governance/association', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'skill_metadata',
          feature_id: editingSkill.id,
          metadata
        })
      })
      const data = await resp.json()
      if (data.success) {
        toast.success('DNA da Skill atualizado!')
        setEditingSkill(null)
        fetchData()
      }
    } catch (err) {
      toast.error('Erro ao salvar protocolo')
    } finally {
      setIsSavingSkill(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-red-500/10 border border-red-500/50 p-12 rounded-3xl max-w-2xl text-white">
        <h2 className="text-red-500 text-2xl font-black mb-4 uppercase tracking-tighter">Erro de Comunicação Master</h2>
        <p className="text-gray-400 mb-8 font-mono text-sm">{error}</p>
        <button onClick={fetchData} className="px-8 py-3 bg-white text-black rounded-xl font-black uppercase text-xs">Reconectar</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 font-sans">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent italic">
            ARTEMIS GOVERNANCE COCKPIT
          </h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Matriz de Produto & Skill Protocol Engineering</p>
        </div>
        <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-2xl border border-white/10">
          {(['inventory', 'modules', 'segments'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab ? 'bg-white text-black shadow-xl' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab === 'inventory' ? 'Inventário' : tab === 'modules' ? 'Módulos' : 'Segmentos'}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <aside className="col-span-3 space-y-6">
          <div className="relative group">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar átomo..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="bg-gradient-to-br from-indigo-900/40 to-transparent p-6 rounded-3xl border border-indigo-500/20">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-4 text-center">Métricas Master</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Total Features</span>
                <span className="text-2xl font-black">{data?.allFeatures.length}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Protocolos IA</span>
                <span className="text-2xl font-black text-indigo-400">{data?.allFeatures.filter(f => f.is_skill).length}</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="col-span-9">
          {activeTab === 'inventory' && data && (
            <div className="grid grid-cols-1 gap-4">
              {(data?.allFeatures || [])
                .filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
                .map((feature, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }} key={feature.id}
                  className={`group relative bg-white/5 border border-white/10 rounded-3xl p-6 transition-all hover:bg-white/[0.08] ${feature.is_skill ? 'ring-1 ring-indigo-500/30 ring-inset' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-5">
                      <div className={`p-4 rounded-2xl ${feature.is_skill ? 'bg-indigo-500/20 text-indigo-400 shadow-lg' : 'bg-white/5 text-gray-700'}`}>
                        {feature.is_skill ? <SparklesIcon className="h-6 w-6" /> : <CubeIcon className="h-6 w-6" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-3">
                           <h4 className="font-black text-lg tracking-tight">{feature.name}</h4>
                           <span className="text-[8px] font-mono text-gray-600 bg-white/5 px-2 py-0.5 rounded uppercase tracking-widest">{feature.slug}</span>
                        </div>
                        <p className="text-gray-500 text-[11px] mt-1 pr-12 line-clamp-1">{feature.description || 'Logística funcional sem metadados descritivos.'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                       {feature.is_skill && (
                         <button 
                            onClick={() => { setEditingSkill(feature); loadTables(); }}
                            className="bg-white text-black hover:bg-gray-200 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl"
                         >
                           Editar Protocolo
                         </button>
                       )}
                       <button 
                        onClick={() => toggleSkillStatus(feature)}
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                          feature.is_skill ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-white border border-white/10'
                        }`}
                       >
                         {feature.is_skill ? <><CheckCircleIcon className="h-4 w-4" /><span>Premium Skill</span></> : <><span>Tornar Skill</span></>}
                       </button>
                    </div>
                  </div>

                  {feature.is_skill && (
                    <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                       <div className="flex items-center space-x-3 text-indigo-400 text-[9px] font-black uppercase tracking-widest">
                          <TableCellsIcon className="h-4 w-4" />
                          <span>{feature.skill_metadata?.requirements?.length || 0} Slots de Mapeamento de Dados</span>
                       </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'modules' && data && (
            <div className="grid grid-cols-2 gap-6">
               {(data?.modules || []).map(module => (
                 <div key={module.id} className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:border-indigo-500/30 transition-all group">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-xl font-black tracking-tighter">{module.name}</h3>
                       <AdjustmentsVerticalIcon className="h-6 w-6 text-gray-600 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div className="space-y-4">
                       <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-4">Funcionalidades</span>
                       {(module.features || []).map((f: any) => (
                         <div key={f.id} className="flex items-center justify-between text-[11px] p-3 bg-white/5 rounded-xl border border-transparent hover:border-white/10">
                            <div className="flex items-center space-x-3">
                               <span className="font-bold text-gray-400">{f.name}</span>
                               {f.is_skill && <SparklesIcon className="h-3 w-3 text-indigo-400" />}
                            </div>
                            <button 
                              onClick={() => handleDeassociation(f.id, module.id, 'feature')}
                              className="p-1.5 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              title="Desvincular funcionalidade"
                            >
                               <TrashIcon className="h-3 w-3" />
                            </button>
                         </div>
                       ))}
                       <button onClick={() => setIsAssociating({ type: 'feature', targetId: module.id })} className="w-full mt-4 py-3 border border-dashed border-white/20 rounded-xl text-[9px] font-bold text-gray-500 uppercase hover:text-indigo-500 transition-all">+ Anexar funcionalidade</button>
                    </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === 'segments' && data && (
            <div className="grid grid-cols-1 gap-6">
               {(data?.segments || []).map(segment => (
                 <motion.div key={segment.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-white/5 border border-white/10 rounded-3xl p-8 group">
                    <div className="flex items-center justify-between mb-6">
                       <div>
                          <h3 className="text-2xl font-black tracking-tighter text-indigo-400">{segment.name}</h3>
                          <p className="text-gray-500 text-xs mt-1">{segment.description || 'Modelo comercial definido no Artemis Engine.'}</p>
                       </div>
                       <Squares2X2Icon className="h-8 w-8 text-white/5" />
                    </div>
                    <div className="flex flex-wrap gap-3">
                       {(segment.modules || []).map((m: any) => (
                         <div key={m.id} className="group/mod relative flex items-center px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[9px] font-black uppercase text-indigo-300">
                            {m.name}
                            <button 
                              onClick={() => handleDeassociation(m.id, segment.id, 'module')}
                              className="ml-2 text-indigo-500 hover:text-red-500 transition-colors opacity-0 group-hover/mod:opacity-100"
                            >
                               <XMarkIcon className="h-3 w-3" />
                            </button>
                         </div>
                       ))}
                       <button onClick={() => setIsAssociating({ type: 'module', targetId: segment.id })} className="px-5 py-2 border border-dashed border-white/20 rounded-xl text-[9px] font-black uppercase text-gray-500 hover:text-indigo-500 transition-all">+ Novo Módulo</button>
                    </div>
                 </motion.div>
               ))}
            </div>
          )}
        </main>
      </div>

      {/* MODAL: Editor de Protocolo Master */}
      <AnimatePresence>
        {editingSkill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingSkill(null)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl"
            >
              <div className="p-12 space-y-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter">DNA da Skill</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[9px] mt-1">Configuração Alpha: {editingSkill.name}</p>
                  </div>
                  <button onClick={() => setEditingSkill(null)} className="p-4 hover:bg-white/5 rounded-full"><XMarkIcon className="h-6 w-6 text-gray-500" /></button>
                </div>
                <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
                  {(editingSkill.skill_metadata?.requirements || []).map((req: any, idx: number) => (
                    <div key={idx} className="bg-white/5 border border-white/5 p-8 rounded-[2rem] grid grid-cols-12 gap-6 relative group/req">
                      <div className="col-span-5 space-y-1">
                        <label className="text-[9px] font-black uppercase text-indigo-400">Título</label>
                        <input className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-sm" defaultValue={req.label} onBlur={(e) => {
                          const newReqs = [...(editingSkill.skill_metadata?.requirements || [])]
                          newReqs[idx].label = e.target.value
                          setEditingSkill({...editingSkill, skill_metadata: {...editingSkill.skill_metadata, requirements: newReqs}})
                        }} />
                      </div>
                      <div className="col-span-4 space-y-1">
                        <label className="text-[9px] font-black uppercase text-indigo-400">Tabela Alvo</label>
                        <select className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-sm appearance-none" value={req.target} onChange={(e) => {
                          const newReqs = [...(editingSkill.skill_metadata?.requirements || [])]
                          newReqs[idx].target = e.target.value
                          setEditingSkill({...editingSkill, skill_metadata: {...editingSkill.skill_metadata, requirements: newReqs}})
                        }}>
                          <option value="">Selecionar...</option>
                          {availableTables.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3 space-y-1">
                        <label className="text-[9px] font-black uppercase text-indigo-400">Tipo</label>
                        <select className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 text-sm appearance-none" value={req.type} onChange={(e) => {
                          const newReqs = [...(editingSkill.skill_metadata?.requirements || [])]
                          newReqs[idx].type = e.target.value
                          setEditingSkill({...editingSkill, skill_metadata: {...editingSkill.skill_metadata, requirements: newReqs}})
                        }}>
                           <option value="text">Texto</option>
                           <option value="json">JSON</option>
                           <option value="number">Número</option>
                        </select>
                      </div>
                      <div className="col-span-12 space-y-1">
                        <label className="text-[9px] font-black uppercase text-amber-500 italic">Sugestão de Mapeamento Padrão (Auto-Fill)</label>
                        <input 
                          className="w-full bg-amber-500/5 border border-amber-500/20 rounded-2xl py-3 px-5 text-xs text-amber-200 outline-none" 
                          placeholder="Ex: metadata_column"
                          defaultValue={req.default_mapping} 
                          onBlur={(e) => {
                            const newReqs = [...(editingSkill.skill_metadata?.requirements || [])]
                            newReqs[idx].default_mapping = e.target.value
                            setEditingSkill({...editingSkill, skill_metadata: {...editingSkill.skill_metadata, requirements: newReqs}})
                          }} 
                        />
                      </div>
                      <button onClick={() => {
                        const newReqs = (editingSkill.skill_metadata?.requirements || []).filter((_:any, i:number) => i !== idx)
                        setEditingSkill({...editingSkill, skill_metadata: {...editingSkill.skill_metadata, requirements: newReqs}})
                      }} className="absolute -right-2 -top-2 bg-red-600 text-white p-1.5 rounded-full"><XMarkIcon className="h-3 w-3" /></button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newReqs = [...(editingSkill.skill_metadata?.requirements || []), { id: Date.now(), label: '', target: '', type: 'text' }]
                      setEditingSkill({...editingSkill, skill_metadata: {...editingSkill.skill_metadata, requirements: newReqs}})
                    }}
                    className="w-full py-6 border-2 border-dashed border-white/5 rounded-[2rem] text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-indigo-400">+ Adicionar Requisito</button>

                  <div className="pt-10 space-y-6">
                    <div className="flex items-center space-x-3">
                      <div className="h-px bg-indigo-500/20 flex-1"></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Engrenagem de Inteligência</span>
                      <div className="h-px bg-indigo-500/20 flex-1"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-1 col-span-2">
                          <label className="text-[9px] font-black uppercase text-indigo-400 ml-1">Temperature (Criatividade)</label>
                          <input 
                            type="range" min="0" max="1" step="0.1" 
                            defaultValue={editingSkill.skill_metadata?.temperature || 0.7}
                            className="w-full h-12 accent-indigo-500"
                            onChange={(e) => {
                              setEditingSkill({...editingSkill, skill_metadata: {...editingSkill.skill_metadata, temperature: parseFloat(e.target.value)}})
                            }}
                          />
                          <p className="text-[8px] text-gray-600 px-1">O modelo de IA é configurado por empresa na página de Tenants (Engenharia de IA).</p>
                       </div>
                    </div>

                    <div className="space-y-1">
                       <label className="text-[9px] font-black uppercase text-indigo-400 ml-1">Prompt de Sistema (Template Logic)</label>
                       <textarea 
                          rows={6}
                          placeholder="Ex: Você é um assistente de vendas imobiliárias. Use os dados disponíveis para gerar um brainstorming estratégico..."
                          defaultValue={editingSkill.skill_metadata?.prompt}
                          onBlur={(e) => {
                            setEditingSkill({...editingSkill, skill_metadata: {...editingSkill.skill_metadata, prompt: e.target.value}})
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-[2rem] py-6 px-8 text-sm focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder-gray-700 font-mono"
                       />
                       <p className="text-[8px] text-gray-600 font-medium px-4">Utilize {"{{id_do_campo}}"} para injetar os dados mapeados dinamicamente no prompt.</p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-4 pt-10 border-t border-white/5">
                  <button onClick={() => handleUpdateSkillProtocol(editingSkill.skill_metadata)} disabled={isSavingSkill} className="flex-1 py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-900/50">{isSavingSkill ? 'Gravando...' : 'Aplicar Engenharia'}</button>
                  <button onClick={() => setEditingSkill(null)} className="px-12 py-6 bg-white/5 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-widest border border-white/10">Descartar</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Associação */}
      <AnimatePresence>
        {isAssociating && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAssociating(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: -20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: -20 }} className="relative w-[600px] max-h-[80vh] overflow-hidden bg-[#111] border border-white/10 rounded-[40px] p-10 flex flex-col shadow-3xl">
              <h3 className="text-2xl font-black tracking-tighter mb-8 text-center">{isAssociating.type === 'feature' ? 'Anexar Funcionalidade' : 'Anexar Módulo'}</h3>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {isAssociating.type === 'feature' ? (
                  (data?.allFeatures || []).map(f => (
                    <button key={f.id} onClick={() => handleAssociation(f.id)} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all transition-all group">
                      <div className="text-left">
                        <p className="text-sm font-bold text-gray-300 group-hover:text-white">{f.name}</p>
                        <p className="text-[9px] font-mono text-gray-600 uppercase">{f.slug}</p>
                      </div>
                      <PlusIcon className="h-4 w-4 text-gray-700 group-hover:text-indigo-400" />
                    </button>
                  ))
                ) : (
                  (data?.modules || []).map(m => (
                    <button key={m.id} onClick={() => handleAssociation(m.id)} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all group">
                      <p className="text-sm font-bold text-gray-300">{m.name}</p>
                      <PlusIcon className="h-4 w-4 text-gray-700" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
