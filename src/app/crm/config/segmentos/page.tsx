'use client'

import React, { useState, useEffect } from 'react'
import {
  CircleStackIcon, PaintBrushIcon, Squares2X2Icon, PlusIcon, TrashIcon,
  CheckCircleIcon, ChevronUpIcon, ChevronDownIcon, DocumentPlusIcon
} from '@heroicons/react/24/outline'
import EnrichedLeadData from '@/components/crm/EnrichedLeadData'
import { useTheme } from '@/hooks/useTheme'

export default function SegmentConfigPage() {
  const t = useTheme()
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchConfig() }, [])

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/crm/config/segmentos')
      const data = await res.json()
      if (data.success) setConfig(data.config[0])
    } finally { setLoading(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/crm/config/segmentos', { method: 'POST', body: JSON.stringify(config) })
      alert('Configuração salva com sucesso!')
    } finally { setSaving(false) }
  }

  const updateConfig = (field: string, value: any) => setConfig((prev: any) => ({ ...prev, [field]: value }))

  const updateBadge = (idx: number, field: string, value: any) => {
    const nc = { ...config }; nc.layout_json.badges[idx][field] = value; setConfig(nc)
  }
  const addBadge = () => {
    const nc = { ...config }
    if (!nc.layout_json.badges) nc.layout_json.badges = []
    nc.layout_json.badges.push({ label: 'Nova Label', campo: '', icone: 'map-pin', prefixo: '', sufixo: '' })
    setConfig(nc)
  }
  const removeBadge = (idx: number) => {
    const nc = { ...config }; nc.layout_json.badges.splice(idx, 1); setConfig(nc)
  }
  const moveBadge = (idx: number, dir: 'up' | 'down') => {
    const nc = { ...config }; const arr = [...nc.layout_json.badges]
    const ti = dir === 'up' ? idx - 1 : idx + 1;
    [arr[idx], arr[ti]] = [arr[ti], arr[idx]]; nc.layout_json.badges = arr; setConfig(nc)
  }

  const addFormField = () => {
    const nc = { ...config }
    if (!nc.form_schema_json) nc.form_schema_json = []
    nc.form_schema_json.push({ name: '', label: 'Novo Campo', type: 'text', required: false })
    setConfig(nc)
  }
  const updateFormField = (idx: number, field: string, value: any) => {
    const nc = { ...config }; nc.form_schema_json[idx][field] = value; setConfig(nc)
  }
  const removeFormField = (idx: number) => {
    const nc = { ...config }; nc.form_schema_json.splice(idx, 1); setConfig(nc)
  }
  const moveFormField = (idx: number, dir: 'up' | 'down') => {
    const nc = { ...config }; const arr = [...nc.form_schema_json]
    const ti = dir === 'up' ? idx - 1 : idx + 1;
    [arr[idx], arr[ti]] = [arr[ti], arr[idx]]; nc.form_schema_json = arr; setConfig(nc)
  }

  const getMockSnapshot = () => {
    if (!config?.layout_json) return null
    return {
      title: 'Snapshot: Exemplo #1234',
      subtitle: config.target_table === 'imoveis' ? 'Apartamento em Boa Viagem' : 'Consulta: Clínica Geral',
      badges: config.layout_json.badges.map((b: any) => ({ label: b.label, icone: b.icone, valor: `${b.prefixo || ''}123${b.sufixo || ''}` }))
    }
  }

  const inputCls = `w-full rounded-xl text-xs py-3 ${t.inputBg} border-none focus:outline-none`

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center space-y-4">
        <CircleStackIcon className="h-12 w-12 text-blue-500 animate-bounce" />
        <div className="text-blue-500 font-bold tracking-widest animate-pulse">CARREGANDO CONSTRUTOR...</div>
      </div>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-3xl font-black italic tracking-tighter ${t.textPrimary}`}>Segment <span className="text-blue-500">Builder</span></h2>
          <p className={`text-sm font-medium ${t.textSecondary}`}>Configure a identidade visual do enriquecimento via Metadados.</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-500 text-white font-bold rounded-2xl transition-all shadow-xl active:scale-95">
          {saving ? '⚡ Salvando...' : 'Salvar Configuração'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Config Panel */}
        <div className="lg:col-span-2 space-y-8">
          {/* 1. Origem */}
          <div className={`${t.cardBg} rounded-3xl p-8 space-y-6`}>
            <div className={`flex items-center space-x-3 border-b pb-4 ${t.borderSub}`}>
              <CircleStackIcon className="h-6 w-6 text-blue-500" />
              <h3 className={`text-lg font-bold tracking-widest uppercase ${t.textPrimary}`}>1. Origem dos Dados</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${t.textMuted}`}>Entidade Principal</label>
                <select value={config?.target_table} onChange={e => updateConfig('target_table', e.target.value)}
                  className={`w-full rounded-2xl px-5 py-4 text-sm focus:outline-none ${t.inputBg}`}>
                  <option value="imoveis">🔑 Imóveis (Real Estate)</option>
                  <option value="pacientes">🏥 Pacientes (Saúde)</option>
                  <option value="alunos">🎓 Alunos (Educação)</option>
                </select>
              </div>
              <div className="space-y-1 opacity-60">
                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${t.textMuted}`}>FK de Vínculo</label>
                <input disabled value={config?.target_fk_column || 'imovel_id'}
                  className={`w-full rounded-2xl px-5 py-4 text-sm font-mono ${t.inputBg} opacity-60`} />
              </div>
            </div>
          </div>

          {/* 2. Layout Badges */}
          <div className={`${t.cardBg} rounded-3xl p-8 space-y-6`}>
            <div className={`flex items-center justify-between border-b pb-4 ${t.borderSub}`}>
              <div className="flex items-center space-x-3">
                <PaintBrushIcon className="h-6 w-6 text-emerald-500" />
                <h3 className={`text-lg font-bold tracking-widest uppercase ${t.textPrimary}`}>2. Layout dos Badges (Cards)</h3>
              </div>
              <button onClick={addBadge} className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all active:scale-90">
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {config?.layout_json?.badges?.map((badge: any, idx: number) => (
                <div key={idx} className={`grid grid-cols-1 md:grid-cols-6 gap-4 ${t.isDark ? 'bg-black/40' : 'bg-gray-50'} p-6 rounded-3xl border ${t.border} hover:border-emerald-500/30 transition-all`}>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black uppercase tracking-tighter ${t.textMuted}`}>Ícone</label>
                    <select value={badge.icone} onChange={e => updateBadge(idx, 'icone', e.target.value)}
                      className={inputCls}>
                      <option value="bed">🛏️ Cama</option>
                      <option value="bath">🚿 Banheiro</option>
                      <option value="dollar-sign">💵 Valor</option>
                      <option value="maximize">📐 Área</option>
                      <option value="car-front">🚗 Garagem</option>
                      <option value="map-pin">📍 Local</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black uppercase tracking-tighter ${t.textMuted}`}>Rótulo</label>
                    <input value={badge.label} onChange={e => updateBadge(idx, 'label', e.target.value)} className={inputCls} placeholder="Ex: Dorms" />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black uppercase tracking-tighter ${t.textMuted}`}>Campo BD</label>
                    <input value={badge.campo} onChange={e => updateBadge(idx, 'campo', e.target.value)} className={`${inputCls} text-emerald-500 font-mono`} placeholder="campo_tabela" />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black uppercase tracking-tighter ${t.textMuted}`}>Pref/Suf</label>
                    <div className="flex space-x-1">
                      <input value={badge.prefixo || ''} onChange={e => updateBadge(idx, 'prefixo', e.target.value)} className={`w-1/2 rounded-xl text-[10px] py-3 ${t.inputBg}`} placeholder="Prefix" />
                      <input value={badge.sufixo || ''} onChange={e => updateBadge(idx, 'sufixo', e.target.value)} className={`w-1/2 rounded-xl text-[10px] py-3 ${t.inputBg}`} placeholder="Suffix" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black uppercase tracking-tighter ${t.textMuted}`}>Largura</label>
                    <button onClick={() => updateBadge(idx, 'full_width', !badge.full_width)}
                      className={`w-full rounded-xl text-[10px] uppercase font-bold tracking-widest py-3 transition-all ${badge.full_width ? 'bg-blue-600 text-white' : `${t.cardInner} ${t.textMuted} hover:text-blue-500`}`}>
                      {badge.full_width ? '100% (Line)' : '50% (Half)'}
                    </button>
                  </div>
                  <div className="flex flex-col items-center justify-center space-y-2 pt-4">
                    <div className="flex space-x-1">
                      <button onClick={() => moveBadge(idx, 'up')} disabled={idx === 0} className={`p-1 ${t.textMuted} hover:text-blue-500 disabled:opacity-30 transition-colors ${t.hoverBg} rounded-lg`}><ChevronUpIcon className="h-4 w-4" /></button>
                      <button onClick={() => moveBadge(idx, 'down')} disabled={idx === config?.layout_json?.badges?.length - 1} className={`p-1 ${t.textMuted} hover:text-blue-500 disabled:opacity-30 transition-colors ${t.hoverBg} rounded-lg`}><ChevronDownIcon className="h-4 w-4" /></button>
                    </div>
                    <button onClick={() => removeBadge(idx)} className="text-red-500/50 hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg flex items-center text-xs">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {!config?.layout_json?.badges?.length && (
              <div className={`text-center py-12 border-2 border-dashed rounded-3xl ${t.isDark ? 'border-white/5' : 'border-gray-200'}`}>
                <PaintBrushIcon className={`h-10 w-10 mx-auto mb-3 ${t.textMuted}`} />
                <p className={`text-sm font-medium ${t.textMuted}`}>Nenhum badge. Clique em "+" para começar.</p>
              </div>
            )}
          </div>

          {/* 3. Form Schema */}
          <div className={`${t.cardBg} rounded-3xl p-8 space-y-6`}>
            <div className={`flex items-center justify-between border-b pb-4 ${t.borderSub}`}>
              <div className="flex items-center space-x-3">
                <DocumentPlusIcon className="h-6 w-6 text-purple-500" />
                <h3 className={`text-lg font-bold tracking-widest uppercase ${t.textPrimary}`}>3. Formulário (+ Novo Lead)</h3>
              </div>
              <button onClick={addFormField} className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl hover:bg-purple-500 hover:text-white transition-all active:scale-90">
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {config?.form_schema_json?.map((field: any, idx: number) => (
                <div key={idx} className={`grid grid-cols-1 md:grid-cols-5 gap-4 ${t.isDark ? 'bg-black/40' : 'bg-gray-50'} p-6 rounded-3xl border ${t.border} hover:border-purple-500/30 transition-all`}>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black uppercase tracking-tighter ${t.textMuted}`}>Tipo Input</label>
                    <select value={field.type} onChange={e => updateFormField(idx, 'type', e.target.value)} className={inputCls}>
                      <option value="text">A - Texto Curto</option>
                      <option value="number">123 - Número</option>
                      <option value="currency">R$ - Moeda</option>
                      <option value="select">▼ - Lista Suspensa</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black uppercase tracking-tighter ${t.textMuted}`}>Rótulo Visual</label>
                    <input value={field.label} onChange={e => updateFormField(idx, 'label', e.target.value)} className={inputCls} placeholder="Ex: Valor Máximo" />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black uppercase tracking-tighter ${t.textMuted}`}>Nome Variável (BD)</label>
                    <input value={field.name} onChange={e => updateFormField(idx, 'name', e.target.value)} className={`${inputCls} text-purple-500 font-mono`} placeholder="ex: valor_maximo" />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-black uppercase tracking-tighter ${t.textMuted}`}>Obrigatório?</label>
                    <button onClick={() => updateFormField(idx, 'required', !field.required)}
                      className={`w-full rounded-xl text-[10px] uppercase font-bold tracking-widest py-3 transition-all ${field.required ? 'bg-purple-600 text-white' : `${t.cardInner} ${t.textMuted} hover:text-purple-500`}`}>
                      {field.required ? 'Sim (Req)' : 'Não (Opc)'}
                    </button>
                  </div>
                  <div className="flex flex-col items-center justify-center space-y-2 pt-4">
                    <div className="flex space-x-1">
                      <button onClick={() => moveFormField(idx, 'up')} disabled={idx === 0} className={`p-1 ${t.textMuted} hover:text-blue-500 disabled:opacity-30 ${t.hoverBg} rounded-lg`}><ChevronUpIcon className="h-4 w-4" /></button>
                      <button onClick={() => moveFormField(idx, 'down')} disabled={idx === config?.form_schema_json?.length - 1} className={`p-1 ${t.textMuted} hover:text-blue-500 disabled:opacity-30 ${t.hoverBg} rounded-lg`}><ChevronDownIcon className="h-4 w-4" /></button>
                    </div>
                    <button onClick={() => removeFormField(idx)} className="text-red-500/50 hover:text-red-500 p-1.5 hover:bg-red-500/10 rounded-lg flex items-center text-xs">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {!config?.form_schema_json?.length && (
              <div className={`text-center py-12 border-2 border-dashed rounded-3xl ${t.isDark ? 'border-white/5' : 'border-gray-200'}`}>
                <DocumentPlusIcon className={`h-10 w-10 mx-auto mb-3 ${t.textMuted}`} />
                <p className={`text-sm font-medium ${t.textMuted}`}>Nenhum campo configurado para Captação Manual.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button onClick={handleSave} disabled={saving}
              className="px-10 py-5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-500 text-white font-black text-lg uppercase tracking-widest rounded-3xl transition-all shadow-2xl active:scale-95 flex items-center">
              {saving ? '⚡ PROCESSANDO...' : 'SALVAR TODAS AS ALTERAÇÕES'}
            </button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-6">
          <div className={`${t.isDark ? 'bg-black/40 border-blue-500/10' : 'bg-gray-50 border-blue-200'} border rounded-3xl p-8 sticky top-12`}>
            <div className={`flex items-center space-x-3 mb-8 border-b pb-4 ${t.borderSub}`}>
              <Squares2X2Icon className="h-6 w-6 text-blue-500" />
              <h3 className={`text-lg font-bold tracking-widest uppercase italic ${t.textPrimary}`}>Live Preview</h3>
            </div>
            <div className={`${t.isDark ? 'bg-[#0f1115]' : 'bg-white'} border ${t.border} p-6 rounded-3xl shadow-xl relative overflow-hidden group transition-all hover:scale-[1.02]`}>
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600" />
              <div className="flex justify-between items-start mb-6">
                <div className={`text-sm font-black tracking-tighter ${t.textPrimary}`}>Alexandre Severo</div>
                <div className="px-2 py-1 bg-blue-600/20 text-blue-500 text-[8px] font-black uppercase rounded-lg">Novo Lead</div>
              </div>
              <div className={`${t.cardInner} p-5 rounded-2xl transition-all group-hover:border-blue-500/20`}>
                <EnrichedLeadData cache={getMockSnapshot()} />
              </div>
              <div className={`mt-6 flex justify-between items-center opacity-60`}>
                <div className={`text-[9px] font-black italic tracking-widest uppercase ${t.textMuted}`}>Score Match: 94%</div>
                <div className="flex -space-x-2">
                  <div className={`w-5 h-5 rounded-full ${t.isDark ? 'bg-gray-800' : 'bg-gray-200'} border ${t.border}`} />
                  <div className="w-5 h-5 rounded-full bg-blue-600 border border-white/10 flex items-center justify-center text-[8px] font-bold text-white">AS</div>
                </div>
              </div>
            </div>
            <div className="mt-10 p-5 bg-blue-600/5 border border-blue-600/10 rounded-3xl">
              <div className="flex space-x-3">
                <CheckCircleIcon className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className={`text-[10px] leading-relaxed font-medium ${t.textSecondary}`}>
                  Exemplo de como o lead será visualizado no <span className="text-blue-500 font-bold">Kanban</span> e na <span className="text-blue-500 font-bold">Ficha técnica</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
