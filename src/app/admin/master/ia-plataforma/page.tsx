'use client'

import { useState, useEffect } from 'react'
import {
  CpuChipIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'

interface LlmModelRow {
  id: string
  provider: string
  providerLabel: string
  modelId: string
  modelLabel: string
  isRecommended: boolean
  qualityScore: number
  isFree: boolean
}

interface Config {
  llmProvider: string
  llmModel: string
  llmApiKeySet: boolean
  llmApiKeyMasked: string
}

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

  // form state
  const [provider, setProvider] = useState('anthropic')
  const [model, setModel]       = useState('claude-sonnet-4-6')
  const [apiKey, setApiKey]     = useState('')

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
    }).finally(() => setLoading(false))
  }, [])

  const filteredModels = models.filter(m => m.provider === provider)

  async function handleSave() {
    setSaving(true)
    setSaveMsg('')
    setTestResult(null)
    try {
      const body: any = { llmProvider: provider, llmModel: model }
      if (apiKey) body.llmApiKey = apiKey
      const res = await fetch('/api/admin/master/ia-plataforma', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSaveMsg('Configuração salva com sucesso.')
      setApiKey('')
      // Refresh
      const cfgRes = await fetch('/api/admin/master/ia-plataforma')
      const cfgData = await cfgRes.json()
      setConfig(cfgData)
    } catch (err: any) {
      setSaveMsg(`Erro: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res  = await fetch('/api/admin/master/ia-plataforma/test', { method: 'POST' })
      const data = await res.json()
      setTestResult({
        success: data.success,
        message: data.success
          ? `Conexão OK — ${data.provider} / ${data.model} respondeu: "${data.response}"`
          : `Falha: ${data.error}`,
      })
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
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10">
          <CpuChipIcon className="h-40 w-40 text-white" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-indigo-500/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] flex items-center">
              <SparklesIcon className="h-3.5 w-3.5 mr-2 text-indigo-300" />
              Master · Configuração Global
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-2">IA da <span className="text-indigo-400">Plataforma</span></h1>
          <p className="text-indigo-100/70 text-sm font-medium leading-relaxed">
            Um único modelo de IA para todos os insights de campanhas da plataforma. Provider, modelo e chave centralizados aqui.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-8 space-y-6">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <CpuChipIcon className="h-4 w-4 text-indigo-500" />
          Configuração do Modelo Global
        </h2>

        {/* Provider */}
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Provider</label>
          <select
            value={provider}
            onChange={e => { setProvider(e.target.value); setModel('') }}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {Object.entries(providers).map(([key, p]) => (
              <option key={key} value={key}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Modelo</label>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            {filteredModels.map(m => (
              <option key={m.id} value={m.modelId}>
                {m.modelLabel}{m.isRecommended ? ' ★ Recomendado' : ''}{m.isFree ? ' (Gratuito)' : ''}
              </option>
            ))}
            {filteredModels.length === 0 && (
              <option value={model}>{model}</option>
            )}
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <KeyIcon className="h-3.5 w-3.5" />
            API Key
          </label>
          {config?.llmApiKeySet && !apiKey && (
            <p className="text-xs text-emerald-600 font-black mb-2 flex items-center gap-1.5">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Chave configurada: {config.llmApiKeyMasked}
            </p>
          )}
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={config?.llmApiKeySet ? 'Deixe em branco para manter a atual' : 'sk-ant-...'}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm font-medium text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-300"
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            A chave é armazenada de forma segura e nunca exibida na íntegra.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </button>
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            {testing ? 'Testando...' : 'Testar Conexão'}
          </button>
        </div>

        {saveMsg && (
          <p className={`text-xs font-bold ${saveMsg.startsWith('Erro') ? 'text-red-600' : 'text-emerald-600'}`}>
            {saveMsg}
          </p>
        )}

        {testResult && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm font-medium ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            {testResult.success
              ? <CheckCircleIcon className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              : <XCircleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
            {testResult.message}
          </div>
        )}
      </div>

      {/* Info card */}
      <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-6">
        <p className="text-xs font-black text-indigo-700 uppercase tracking-widest mb-2">Escopo desta configuração</p>
        <ul className="space-y-1.5 text-sm text-indigo-800/70 font-medium">
          <li>→ Briefings estratégicos de campanha (morning / closing / manual)</li>
          <li>→ Agente Decisor (enriquecimento de insights com IA)</li>
          <li>→ Análise de Desperdício de Verba</li>
          <li>→ Todos os templates de prompt configurados no sistema</li>
        </ul>
        <p className="text-[10px] text-indigo-500 mt-3">
          As configurações de IA por tenant (em Configurações → IA) continuam ativas para outros módulos.
        </p>
      </div>
    </div>
  )
}
