'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CpuChipIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  PhotoIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/marketing-utils'

/* ══════════════════════════════════════════════════
   TIPOS
══════════════════════════════════════════════════ */

interface LlmModelRow {
  id: string
  provider: string
  providerLabel: string
  modelId: string
  modelLabel: string
  isRecommended: boolean
  qualityScore: number
  isFree: boolean
  contextWindow: number | null
  isActive: boolean
  notes: string | null
  sortOrder: number
  baseUrl: string | null
}

interface Config {
  llmProvider: string
  llmModel: string
  llmApiKeySet: boolean
  llmApiKeyMasked: string
  imageProvider: string
  imageModel: string
  imageApiKeySet: boolean
  imageApiKeyMasked: string
}

const IMAGE_OPTIONS = [
  { provider: 'huggingface', model: 'black-forest-labs/FLUX.1-schnell', label: 'Flux Schnell (HuggingFace)', description: 'Gratuito · Conta HF gratuita · Rápido · Boa qualidade', isFree: true },
  { provider: 'replicate',   model: 'black-forest-labs/flux-1.1-pro',   label: 'Flux 1.1 Pro (Replicate)',  description: '~$0.004/imagem · Qualidade máxima · Suporta img2img', isFree: false },
  { provider: 'openai',      model: 'dall-e-3',                          label: 'DALL-E 3 (OpenAI)',          description: '~$0.04/imagem · Alta qualidade · Fácil integração', isFree: false },
  { provider: 'replicate',   model: 'stability-ai/stable-diffusion-xl-base-1.0', label: 'Stable Diffusion XL (Replicate)', description: '~$0.003/imagem · Open source · Boa qualidade', isFree: false },
]

const QUALITY_STARS = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

const PROVIDER_COLOR: Record<string, string> = {
  anthropic:  'bg-amber-50  text-amber-700  border-amber-200',
  openai:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  gemini:     'bg-blue-50   text-blue-700   border-blue-200',
  groq:       'bg-orange-50 text-orange-700 border-orange-200',
  deepseek:   'bg-cyan-50   text-cyan-700   border-cyan-200',
  openrouter: 'bg-purple-50 text-purple-700 border-purple-200',
  kimi:       'bg-rose-50   text-rose-700   border-rose-200',
  qwen:       'bg-teal-50   text-teal-700   border-teal-200',
}

/* ══════════════════════════════════════════════════
   MODAL CRUD DE MODELO
══════════════════════════════════════════════════ */

const EMPTY_MODEL: Omit<LlmModelRow, 'id'> = {
  provider: '', providerLabel: '', modelId: '', modelLabel: '',
  baseUrl: null, qualityScore: 3, isFree: false, contextWindow: null,
  isRecommended: false, isActive: true, notes: null, sortOrder: 0,
}

function ModelModal({
  model,
  onClose,
  onSaved,
}: {
  model: LlmModelRow | null     // null = criação
  onClose: () => void
  onSaved: () => void
}) {
  const isNew = model === null
  const [form, setForm] = useState<Omit<LlmModelRow, 'id'>>(
    model ? { ...model } : { ...EMPTY_MODEL }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k: keyof typeof form, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSave() {
    setSaving(true); setError('')
    try {
      const url    = isNew ? '/api/admin/master/ia-plataforma/models' : `/api/admin/master/ia-plataforma/models/${model!.id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSaved()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="px-6 py-4 bg-slate-900 text-white rounded-t-2xl flex items-center justify-between">
          <h2 className="text-lg font-black">{isNew ? 'Novo Modelo LLM' : 'Editar Modelo'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Provider (slug)</label>
              <input value={form.provider} onChange={e => set('provider', e.target.value.toLowerCase())}
                placeholder="anthropic, openai, gemini..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Provider (label)</label>
              <input value={form.providerLabel} onChange={e => set('providerLabel', e.target.value)}
                placeholder="Anthropic, OpenAI..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Model ID (API)</label>
              <input value={form.modelId} onChange={e => set('modelId', e.target.value)}
                placeholder="claude-sonnet-4-6"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Model Label (exibição)</label>
              <input value={form.modelLabel} onChange={e => set('modelLabel', e.target.value)}
                placeholder="Claude Sonnet 4.6"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Base URL (opcional — para providers custom/OpenRouter)</label>
            <input value={form.baseUrl ?? ''} onChange={e => set('baseUrl', e.target.value || null)}
              placeholder="https://openrouter.ai/api/v1"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Qualidade (1-5)</label>
              <select value={form.qualityScore} onChange={e => set('qualityScore', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{QUALITY_STARS(n)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Contexto (tokens)</label>
              <input type="number" value={form.contextWindow ?? ''} onChange={e => set('contextWindow', e.target.value ? Number(e.target.value) : null)}
                placeholder="200000"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ordem</label>
              <input type="number" value={form.sortOrder} onChange={e => set('sortOrder', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Notas (opcional)</label>
            <input value={form.notes ?? ''} onChange={e => set('notes', e.target.value || null)}
              placeholder="Observações sobre o modelo..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="h-4 w-4 rounded accent-indigo-600" />
              <span className="text-sm font-bold text-gray-700">Ativo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isFree} onChange={e => set('isFree', e.target.checked)} className="h-4 w-4 rounded accent-emerald-600" />
              <span className="text-sm font-bold text-gray-700">Gratuito</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isRecommended} onChange={e => set('isRecommended', e.target.checked)} className="h-4 w-4 rounded accent-amber-500" />
              <span className="text-sm font-bold text-gray-700">Recomendado ★</span>
            </label>
          </div>

          {error && <p className="text-xs text-red-600 font-semibold">❌ {error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-white">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 disabled:opacity-60 shadow-sm">
            {saving ? 'Salvando...' : isNew ? 'Criar Modelo' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   ABA — CATÁLOGO DE MODELOS
══════════════════════════════════════════════════ */

function CatalogTab() {
  const [models, setModels]   = useState<LlmModelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<LlmModelRow | null | undefined>(undefined) // undefined = fechado, null = novo

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/master/ia-plataforma/models', { credentials: 'include' })
      const data = await res.json()
      setModels(data.models ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleActive(m: LlmModelRow) {
    await fetch(`/api/admin/master/ia-plataforma/models/${m.id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !m.isActive }),
    })
    load()
  }

  async function handleDelete(m: LlmModelRow) {
    if (!confirm(`Excluir "${m.modelLabel}"? Esta ação não pode ser desfeita.`)) return
    await fetch(`/api/admin/master/ia-plataforma/models/${m.id}`, {
      method: 'DELETE', credentials: 'include',
    })
    load()
  }

  // Agrupar por provider
  const grouped = models.reduce<Record<string, LlmModelRow[]>>((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = []
    acc[m.provider].push(m)
    return acc
  }, {})

  const providerLabel = (provider: string) =>
    models.find(m => m.provider === provider)?.providerLabel || provider

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500 font-medium">
          {models.length} modelos · {models.filter(m => m.isActive).length} ativos · {Object.keys(grouped).length} providers
        </p>
        <button
          onClick={() => setEditing(null)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wide hover:bg-indigo-700 transition-all shadow-sm"
        >
          <PlusIcon className="h-4 w-4" /> Novo Modelo
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl bg-gray-200 animate-pulse" />)}</div>
      ) : (
        Object.entries(grouped).map(([provider, rows]) => (
          <div key={provider} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Provider header */}
            <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <span className={cn(
                'text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border',
                PROVIDER_COLOR[provider] ?? 'bg-gray-100 text-gray-600 border-gray-200',
              )}>
                {providerLabel(provider)}
              </span>
              <span className="text-[10px] text-gray-400">{rows.length} modelo{rows.length > 1 ? 's' : ''}</span>
            </div>

            {/* Models */}
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-gray-50">
                {rows.map(m => (
                  <tr key={m.id} className={cn(
                    'hover:bg-gray-50/60 transition-colors',
                    !m.isActive && 'opacity-50',
                  )}>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500 whitespace-nowrap w-56">
                      {m.modelId}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{m.modelLabel}</span>
                        {m.isRecommended && <StarIcon className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
                        {m.isFree && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Grátis</span>
                        )}
                        {m.notes && (
                          <span className="text-[10px] text-gray-400 italic">{m.notes}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center w-24 text-xs text-gray-400 whitespace-nowrap">
                      {m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}k ctx` : '—'}
                    </td>
                    <td className="px-3 py-3 text-center w-20">
                      <span className="text-amber-500 text-xs">{QUALITY_STARS(m.qualityScore)}</span>
                    </td>
                    <td className="px-3 py-3 text-right w-32 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => toggleActive(m)}
                          className={cn(
                            'p-1.5 rounded-lg border transition-colors text-xs',
                            m.isActive
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100',
                          )}
                          title={m.isActive ? 'Desativar' : 'Ativar'}
                        >
                          {m.isActive ? <CheckCircleIcon className="h-3.5 w-3.5" /> : <XCircleIcon className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => setEditing(m)}
                          className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                          <PencilSquareIcon className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(m)}
                          className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {editing !== undefined && (
        <ModelModal
          model={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); load() }}
        />
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════ */

export default function IaPlataformaPage() {
  const [config, setConfig]         = useState<Config | null>(null)
  const [models, setModels]         = useState<LlmModelRow[]>([])
  const [providers, setProviders]   = useState<Record<string, { label: string; models: LlmModelRow[] }>>({})
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [testing, setTesting]       = useState(false)
  const [showKey, setShowKey]       = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [saveMsg, setSaveMsg]       = useState('')

  const [provider, setProvider] = useState('anthropic')
  const [model, setModel]       = useState('claude-sonnet-4-6')
  const [apiKey, setApiKey]     = useState('')

  const [imgOption, setImgOption]   = useState(IMAGE_OPTIONS[0].model)
  const [imgApiKey, setImgApiKey]   = useState('')
  const [showImgKey, setShowImgKey] = useState(false)
  const [imgSaving, setImgSaving]   = useState(false)
  const [imgSaveMsg, setImgSaveMsg] = useState('')

  const [activeTab, setActiveTab] = useState<'config' | 'catalog'>('config')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/master/ia-plataforma').then(r => r.json()),
      fetch('/api/admin/campanhas/settings/llm/models').then(r => r.json()),
    ]).then(([cfg, mdls]) => {
      setConfig(cfg)
      setProviders(mdls.providers || {})
      setModels(mdls.flat || [])
      setProvider(cfg.llmProvider || 'anthropic')
      setModel(cfg.llmModel || 'claude-sonnet-4-6')
      if (cfg.imageModel) setImgOption(cfg.imageModel)
    }).finally(() => setLoading(false))
  }, [])

  const filteredModels = models.filter(m => m.provider === provider)

  async function handleSave() {
    setSaving(true); setSaveMsg(''); setTestResult(null)
    try {
      const body: any = { llmProvider: provider, llmModel: model }
      if (apiKey) body.llmApiKey = apiKey
      const res  = await fetch('/api/admin/master/ia-plataforma', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSaveMsg('Configuração salva com sucesso.')
      setApiKey('')
      const cfgRes = await fetch('/api/admin/master/ia-plataforma')
      setConfig(await cfgRes.json())
    } catch (err: any) {
      setSaveMsg(`Erro: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveImage() {
    setImgSaving(true); setImgSaveMsg('')
    try {
      const selected = IMAGE_OPTIONS.find(o => o.model === imgOption)!
      const body: any = { imageProvider: selected.provider, imageModel: imgOption }
      if (imgApiKey) body.imageApiKey = imgApiKey
      const res  = await fetch('/api/admin/master/ia-plataforma', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setImgSaveMsg('Configuração de imagem salva.')
      setImgApiKey('')
      const cfgRes = await fetch('/api/admin/master/ia-plataforma')
      setConfig(await cfgRes.json())
    } catch (err: any) {
      setImgSaveMsg(`Erro: ${err.message}`)
    } finally {
      setImgSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null)
    try {
      const res  = await fetch('/api/admin/master/ia-plataforma/test', { method: 'POST' })
      const data = await res.json()
      setTestResult({ success: data.success, message: data.success ? `Conexão OK — ${data.provider} / ${data.model} respondeu: "${data.response}"` : `Falha: ${data.error}` })
    } catch (err: any) {
      setTestResult({ success: false, message: err.message })
    } finally {
      setTesting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600" />
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 px-8 py-6 rounded-2xl text-white shadow-xl relative overflow-hidden flex items-center justify-between">
        <div className="absolute inset-0 flex items-center justify-end pr-8 opacity-[0.07] pointer-events-none">
          <CpuChipIcon className="h-32 w-32 text-white" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-indigo-500/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] flex items-center">
              <SparklesIcon className="h-3 w-3 mr-1.5 text-indigo-300" />
              Master · Configuração Global
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tighter">IA da <span className="text-indigo-400">Plataforma</span></h1>
          <p className="text-indigo-100/60 text-xs font-medium mt-1">
            Provider, modelo e chaves de IA centralizados — um único ponto de controle para toda a plataforma.
          </p>
        </div>
        <div className="relative z-10 hidden md:flex items-center gap-6 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-indigo-300/60 uppercase tracking-widest font-black">Modelo LLM ativo</p>
            <p className="text-sm font-black text-white mt-0.5">{config?.llmModel || '—'}</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-right">
            <p className="text-[10px] text-indigo-300/60 uppercase tracking-widest font-black">Imagem IA</p>
            <p className="text-sm font-black text-white mt-0.5">
              {config?.imageModel ? IMAGE_OPTIONS.find(o => o.model === config.imageModel)?.label.split(' (')[0] || config.imageModel : 'Não configurado'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-2xl px-6">
        {([
          { key: 'config',  label: 'Configuração IA',    icon: CpuChipIcon },
          { key: 'catalog', label: 'Catálogo de Modelos', icon: SparklesIcon },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-5 py-3.5 text-xs font-black uppercase tracking-widest border-b-2 -mb-px transition-all',
              activeTab === key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600',
            )}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* ── ABA CONFIGURAÇÃO ── */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* LEFT — LLM */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 space-y-5">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <CpuChipIcon className="h-4 w-4 text-indigo-500" />Modelo de Linguagem Global (LLM)
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Provider</label>
                <select value={provider} onChange={e => { const p = e.target.value; setProvider(p); const first = models.find(m => m.provider === p); setModel(first?.modelId || '') }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  {Object.entries(providers).map(([key, p]) => <option key={key} value={key}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Modelo</label>
                <select value={model} onChange={e => setModel(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  {filteredModels.map(m => <option key={m.id} value={m.modelId}>{m.modelLabel}{m.isRecommended ? ' ★' : ''}{m.isFree ? ' (Gratuito)' : ''}</option>)}
                  {filteredModels.length === 0 && <option value={model}>{model}</option>}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <KeyIcon className="h-3.5 w-3.5" />API Key
              </label>
              {config?.llmApiKeySet && !apiKey && (
                <p className="text-xs text-emerald-600 font-black mb-2 flex items-center gap-1.5">
                  <CheckCircleIcon className="h-3.5 w-3.5" />Chave configurada: {config.llmApiKeyMasked}
                </p>
              )}
              <div className="relative">
                <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
                  placeholder={config?.llmApiKeySet ? 'Deixe em branco para manter a atual' : 'sk-ant-...'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-11 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-300" />
                <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showKey ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">A chave é armazenada de forma segura e nunca exibida na íntegra.</p>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar Configuração'}
              </button>
              <button onClick={handleTest} disabled={testing}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50">
                {testing ? 'Testando...' : 'Testar Conexão'}
              </button>
            </div>

            {saveMsg && <p className={`text-xs font-bold ${saveMsg.startsWith('Erro') ? 'text-red-600' : 'text-emerald-600'}`}>{saveMsg}</p>}
            {testResult && (
              <div className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs font-medium ${testResult.success ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-700'}`}>
                {testResult.success ? <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> : <XCircleIcon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                {testResult.message}
              </div>
            )}

            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-4 mt-2">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1.5">Escopo deste modelo</p>
              <ul className="space-y-1 text-xs text-indigo-800/70 font-medium">
                <li>→ Briefings estratégicos (morning / closing / manual)</li>
                <li>→ Agente Decisor · Análise de Desperdício de Verba</li>
                <li>→ Análise de criativos na biblioteca</li>
                <li>→ Todos os templates de prompt do sistema</li>
              </ul>
            </div>
          </div>

          {/* RIGHT — Image */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl p-6 space-y-5">
            <div>
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <PhotoIcon className="h-4 w-4 text-violet-500" />Geração de Imagens com IA
              </h2>
              <p className="text-xs text-gray-400 mt-1">Gera hook images diversas para a biblioteca de criativos.</p>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Provider / Modelo</label>
              <div className="space-y-2">
                {IMAGE_OPTIONS.map(opt => (
                  <label key={opt.model} className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${imgOption === opt.model ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="imgModel" value={opt.model} checked={imgOption === opt.model} onChange={() => setImgOption(opt.model)} className="mt-0.5 accent-violet-600" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-800">{opt.label}</p>
                        {opt.isFree && <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Gratuito</span>}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <KeyIcon className="h-3.5 w-3.5" />API Key
              </label>
              {config?.imageApiKeySet && !imgApiKey && (
                <p className="text-xs text-emerald-600 font-black mb-2 flex items-center gap-1.5">
                  <CheckCircleIcon className="h-3.5 w-3.5" />Chave configurada: {config.imageApiKeyMasked}
                </p>
              )}
              <div className="relative">
                <input type={showImgKey ? 'text' : 'password'} value={imgApiKey} onChange={e => setImgApiKey(e.target.value)}
                  placeholder={config?.imageApiKeySet ? 'Deixe em branco para manter a atual' : 'sk-... / r8_...'}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-11 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-gray-300" />
                <button type="button" onClick={() => setShowImgKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showImgKey ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">HuggingFace: <code>hf_</code> · Replicate: <code>r8_</code> · OpenAI: <code>sk-</code></p>
            </div>

            <button onClick={handleSaveImage} disabled={imgSaving}
              className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-500/20 hover:bg-violet-500 transition-all disabled:opacity-50">
              {imgSaving ? 'Salvando...' : 'Salvar Configuração de Imagem'}
            </button>
            {imgSaveMsg && <p className={`text-xs font-bold ${imgSaveMsg.startsWith('Erro') ? 'text-red-600' : 'text-emerald-600'}`}>{imgSaveMsg}</p>}
          </div>
        </div>
      )}

      {/* ── ABA CATÁLOGO ── */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <CatalogTab />
        </div>
      )}
    </div>
  )
}
