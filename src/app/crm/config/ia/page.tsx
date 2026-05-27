'use client'

import React, { useState, useEffect } from 'react'
import {
  AdjustmentsHorizontalIcon, BeakerIcon, PlusIcon, TrashIcon,
  ExclamationCircleIcon, TagIcon, CpuChipIcon, GlobeAltIcon,
  AcademicCapIcon, PlusCircleIcon, WalletIcon,
  ChatBubbleBottomCenterIcon, SparklesIcon
} from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'

const iconMap: any = { GlobeAltIcon, AcademicCapIcon, PlusCircleIcon, WalletIcon }

export default function AIConfigPage() {
  const t = useTheme()
  const [segments, setSegments] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null)
  const [isEditingRule, setIsEditingRule] = useState(false)
  const [isAddingSegment, setIsAddingSegment] = useState(false)
  const [newSegment, setNewSegment] = useState({ nome: '', icone: 'GlobeAltIcon', prompt_ia: '' })
  const [currentRule, setCurrentRule] = useState<any>({ segmento_id: '', palavras_chave: '', tag_resultante: '', resumo_modelo: '', score_base: 5, ativa: true })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/config/ia')
      const data = await res.json()
      if (data.success) {
        setSegments(data.segments); setRules(data.rules)
        if (data.segments.length > 0 && !selectedSegmentId) setSelectedSegmentId(data.segments[0].id)
      }
    } finally { setLoading(false) }
  }

  const handleSaveSegment = async () => {
    if (!newSegment.nome) return alert('O nome do segmento é obrigatório.')
    const res = await fetch('/api/crm/config/ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'saveSegment', data: newSegment }) })
    if ((await res.json()).success) { setNewSegment({ nome: '', icone: 'GlobeAltIcon', prompt_ia: '' }); setIsAddingSegment(false); fetchData() }
  }

  const handleUpdatePrompt = async () => {
    const segment = segments.find(s => s.id === selectedSegmentId)
    if (!segment) return
    const res = await fetch('/api/crm/config/ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'saveSegment', data: segment }) })
    if ((await res.json()).success) { alert('Prompt Mestre atualizado!'); fetchData() }
  }

  const handleSaveRule = async () => {
    const res = await fetch('/api/crm/config/ia', { method: 'POST', body: JSON.stringify({ action: 'saveRule', data: currentRule }) })
    if ((await res.json()).success) { alert('Regra salva!'); setIsEditingRule(false); fetchData() }
  }

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Deseja excluir esta regra de IA?')) return
    const res = await fetch('/api/crm/config/ia', { method: 'POST', body: JSON.stringify({ action: 'deleteRule', data: { id } }) })
    if ((await res.json()).success) fetchData()
  }

  const filteredRules = selectedSegmentId ? rules.filter(r => r.segmento_id === selectedSegmentId) : []

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><BeakerIcon className="h-12 w-12 text-blue-500 animate-pulse" /></div>

  return (
    <>
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className={`flex justify-between items-center ${t.cardBg} p-8 rounded-3xl shadow-sm`}>
        <div>
          <h2 className={`text-3xl font-black italic tracking-tighter uppercase ${t.textPrimary}`}>
            Inteligência <span className="text-blue-500">por Segmento</span>
          </h2>
          <p className={`text-sm font-medium ${t.textSecondary}`}>Configure as tags de "Sonho" e regras de prontidão (IPVE) para cada setor.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-end mr-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Motor Híbrido Ativo</span>
            <span className={`text-[9px] ${t.textMuted}`}>Fallback: Parametrização Local</span>
          </div>
          <CpuChipIcon className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Segmentos */}
        <div className="space-y-4">
          <div className={`${t.cardBg} rounded-3xl p-6`}>
            <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${t.textMuted}`}>Setores de Atuação</h3>
            <div className="space-y-2">
              {segments.map(s => (
                <button key={s.id} onClick={() => setSelectedSegmentId(s.id)}
                  className={`w-full flex items-center px-4 py-4 rounded-2xl transition-all border ${
                    selectedSegmentId === s.id
                      ? 'bg-blue-600 border-blue-500 text-white shadow-xl'
                      : `${t.isDark ? 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'}`
                  }`}>
                  {(() => { const Icon = iconMap[s.icone] || GlobeAltIcon; return <Icon className="h-5 w-5 mr-3" /> })()}
                  <span className="text-sm font-bold uppercase tracking-widest">{s.nome}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setIsAddingSegment(true)}
              className={`w-full mt-8 py-3 border border-dashed rounded-2xl text-[10px] font-black uppercase transition-all active:scale-95 ${t.isDark ? 'border-white/10 text-gray-500 hover:border-blue-500 hover:text-blue-500' : 'border-gray-300 text-gray-400 hover:border-blue-500 hover:text-blue-500'}`}>
              + Adicionar Novo Segmento
            </button>
          </div>
        </div>

        {/* Regras */}
        <div className="lg:col-span-3 space-y-8">
          {selectedSegmentId && (
            <div className={`${t.isDark ? 'bg-blue-600/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'} border p-8 rounded-3xl relative overflow-hidden group`}>
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <SparklesIcon className="h-24 w-24 text-blue-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-xl font-black italic tracking-tighter uppercase flex items-center ${t.textPrimary}`}>
                    <ChatBubbleBottomCenterIcon className="h-6 w-6 text-blue-500 mr-2" />
                    Prompt Mestre <span className="text-blue-500 ml-2">Identidade da IA</span>
                  </h3>
                  <button onClick={handleUpdatePrompt} className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-blue-500 transition-all">
                    Salvar Estratégia
                  </button>
                </div>
                <p className={`text-xs font-medium uppercase tracking-widest mb-4 ${t.textMuted}`}>
                  Defina como a IA deve se comportar para leads de {segments.find(s => s.id === selectedSegmentId)?.nome}.
                </p>
                <textarea
                  value={segments.find(s => s.id === selectedSegmentId)?.prompt_ia || ''}
                  onChange={e => setSegments(segments.map(s => s.id === selectedSegmentId ? { ...s, prompt_ia: e.target.value } : s))}
                  placeholder="Ex: Você é um consultor especialista em..."
                  className={`w-full rounded-2xl px-6 py-5 text-sm h-40 focus:border-blue-500/50 transition-all outline-none font-medium leading-relaxed ${t.inputBg}`} />
                <div className="mt-4 flex items-center space-x-2 text-[9px] text-blue-500 font-black uppercase tracking-widest bg-blue-500/5 p-3 rounded-lg border border-blue-500/10">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span>DICA: O sistema injetará automaticamente as regras táticas abaixo neste prompt.</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h3 className={`text-xl font-bold flex items-center ${t.textPrimary}`}>
              <TagIcon className="h-6 w-6 text-blue-500 mr-2" />Regras de Extração e Qualificação
            </h3>
            <button onClick={() => { setCurrentRule({ segmento_id: selectedSegmentId, palavras_chave: '', tag_resultante: '', resumo_modelo: '', score_base: 5, ativa: true }); setIsEditingRule(true) }}
              className="flex items-center px-6 py-3 bg-blue-600 text-white text-xs font-black uppercase rounded-2xl hover:bg-blue-500 transition-all">
              <PlusIcon className="h-4 w-4 mr-2" />Nova Regra IA
            </button>
          </div>

          {isEditingRule && (
            <div className={`${t.isDark ? 'bg-blue-600/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'} border p-8 rounded-3xl animate-in fade-in duration-300`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[['Tag de Inteligência', 'tag_resultante', 'text', currentRule.tag_resultante, 'Qual o "Sonho/Desejo" detectado?'],
                  ['Score IPVE Base (0-100)', 'score_base', 'number', currentRule.score_base, ''],
                  ['Palavras-Chave de Gatilho', 'palavras_chave', 'text', currentRule.palavras_chave, 'separar por vírgula']].map(([label, key, type, val, ph], i) => (
                  <div key={String(key)} className={`space-y-1 ${i === 2 ? 'md:col-span-2' : ''}`}>
                    <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${t.textMuted}`}>{String(label)}</label>
                    <input type={String(type)} value={String(val ?? '')} placeholder={String(ph)}
                      onChange={e => setCurrentRule({ ...currentRule, [String(key)]: type === 'number' ? parseInt(e.target.value) : e.target.value })}
                      className={`w-full rounded-xl px-4 py-3 text-sm ${t.inputBg}`} />
                  </div>
                ))}
                <div className="md:col-span-2 space-y-1">
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${t.textMuted}`}>Modelo de Resumo para o Consultor</label>
                  <textarea value={currentRule.resumo_modelo} onChange={e => setCurrentRule({ ...currentRule, resumo_modelo: e.target.value })}
                    className={`w-full rounded-xl px-4 py-3 text-sm h-24 ${t.inputBg}`} placeholder="Descrição que o consultor verá no CRM..." />
                </div>
              </div>
              <div className="mt-8 flex justify-end space-x-4">
                <button onClick={() => setIsEditingRule(false)} className={`px-6 py-3 text-xs font-bold uppercase ${t.textMuted} hover:text-blue-500 transition-colors`}>Cancelar</button>
                <button onClick={handleSaveRule} className="px-10 py-3 bg-blue-600 text-white text-xs font-black uppercase rounded-xl hover:bg-blue-500">Salvar Regra</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {filteredRules.length > 0 ? filteredRules.map(rule => (
              <div key={rule.id} className={`group ${t.cardBg} p-6 rounded-3xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden`}>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="bg-blue-600/20 text-blue-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border border-blue-500/20">{rule.tag_resultante}</span>
                    <div className={`h-1 w-1 rounded-full ${t.isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
                    <span className="text-emerald-500 font-mono text-[10px] font-black italic">Score Base: {rule.score_base}0%</span>
                  </div>
                  <p className={`text-sm font-medium ${t.textPrimary}`}>{rule.resumo_modelo}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {rule.palavras_chave.split(',').map((p: string, i: number) => (
                      <span key={i} className={`text-[9px] ${t.cardInner} px-2 py-1 rounded-md lowercase ${t.textMuted}`}>{p.trim()}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => { setCurrentRule(rule); setIsEditingRule(true) }}
                    className={`p-3 ${t.cardBg} hover:text-blue-500 rounded-xl transition-all ${t.textMuted}`}>
                    <AdjustmentsHorizontalIcon className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDeleteRule(rule.id)}
                    className={`p-3 ${t.cardBg} hover:text-red-500 rounded-xl transition-all ${t.textMuted}`}>
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )) : (
              <div className={`text-center py-20 border-2 border-dashed rounded-3xl ${t.isDark ? 'border-white/5' : 'border-gray-200'}`}>
                <ExclamationCircleIcon className={`h-12 w-12 mx-auto mb-4 ${t.textMuted}`} />
                <p className={`font-medium mb-4 ${t.textSecondary}`}>
                  {segments.length === 0 ? 'Comece criando o primeiro segmento na barra lateral.' : 'Nenhuma regra para este segmento.'}
                </p>
                {segments.length === 0 && (
                  <button onClick={() => setIsAddingSegment(true)}
                    className="px-6 py-2 bg-blue-600/20 text-blue-500 border border-blue-500/20 rounded-xl text-xs font-black uppercase hover:bg-blue-600 hover:text-white transition-all">
                    Criar Primeiro Segmento
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

    {isAddingSegment && (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <div className={`${t.modalBg} w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200`}>
          <h3 className={`text-xl font-black italic tracking-tighter uppercase mb-6 ${t.textPrimary}`}>Novo Segmento</h3>
          <div className="space-y-4">
            {[['Nome do Setor', 'nome', 'text', newSegment.nome, 'Nome do segmento...']].map(([label, key, type, val, ph]) => (
              <div key={String(key)} className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${t.textMuted}`}>{String(label)}</label>
                <input autoFocus type="text" value={String(val)} placeholder={String(ph)}
                  onChange={e => setNewSegment({ ...newSegment, [String(key)]: e.target.value })}
                  className={`w-full rounded-xl px-4 py-3 text-sm ${t.inputBg}`} />
              </div>
            ))}
            <div className="space-y-1">
              <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${t.textMuted}`}>Ícone HeroIcon</label>
              <select value={newSegment.icone} onChange={e => setNewSegment({ ...newSegment, icone: e.target.value })}
                className={`w-full rounded-xl px-4 py-3 text-sm appearance-none ${t.inputBg}`}>
                <option value="GlobeAltIcon">🌐 Global</option>
                <option value="AcademicCapIcon">🎓 Educação</option>
                <option value="PlusCircleIcon">🏥 Saúde</option>
                <option value="WalletIcon">💰 Finanças</option>
              </select>
            </div>
          </div>
          <div className="mt-8 flex justify-end space-x-3">
            <button onClick={() => setIsAddingSegment(false)} className={`px-6 py-3 text-xs font-bold uppercase transition-colors ${t.textMuted} hover:text-blue-500`}>Cancelar</button>
            <button onClick={handleSaveSegment} className="px-8 py-3 bg-blue-600 text-white text-xs font-black uppercase rounded-xl hover:bg-blue-500 transition-all">Criar Setor</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
