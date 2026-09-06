'use client'

/**
 * Canal de WhatsApp (Evolution API) usado pelos AGENTES/ALERTAS — pra onde
 * `notifyWhatsApp()` (`src/lib/marketing/services/agentNotificador.ts`) manda a mensagem
 * quando um agente do Decisor (Campanhas), um agente do CRM (`crm/agents/runner.ts`) ou um
 * alerta de SLA estourado (`mensageria/sla.ts`) dispara. Genuinamente compartilhado pelos 3
 * módulos — ao contrário da cascata de LLM (Peça 1, CRM/Mensageria só), aqui NENHUM módulo é
 * dono exclusivo: um tenant só-Campanhas, só-CRM ou só-Mensageria pode legitimamente precisar
 * configurar isto. Por isso este componente é reaproveitado nas 3 telas (Campanhas →
 * Configurações, CRM → Agentes de Aceleração, Mensageria → Configurações aba SLA), todos lendo/
 * gravando a MESMA linha em `public.tenants` via `/api/admin/campanhas/settings` — não é uma
 * cascata por cliente, é 1 valor único por tenant.
 *
 * Diferente da Anthropic API Key / Threshold de Confiança (mesma tela de origem em Campanhas):
 * essas duas ficaram de propósito só em Campanhas — Threshold só é lido por
 * `agentDecisor.ts`/`aiInsights.ts` (Campanhas), nenhum agente do CRM ou alerta de SLA usa;
 * Anthropic API Key é um fallback legado de 2ª ordem, fora de escopo desta rodada
 * (docs/CHECKPOINT.md).
 */

import { useState, useEffect } from 'react'
import { getSettings, updateSettings } from '@/lib/marketing-api'
import { ChatBubbleLeftRightIcon, CheckCircleIcon, XCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

interface Props {
  /** Tema leve — mesmo padrão { isDark, textPrimary, textMuted, inputBg, ... } de useTheme(), já usado por PromptOverrideCard/LlmCascadeSection. */
  t: any
}

export function AgentWhatsAppChannelSection({ t }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [instance, setInstance] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSettings()
      .then((s: any) => {
        setApiUrl(s.evolutionApiUrl || '')
        setApiKey(s.evolutionApiKey || '')
        setInstance(s.evolutionInstance || '')
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await updateSettings({
        evolutionApiUrl: apiUrl,
        evolutionApiKey: apiKey,
        evolutionInstance: instance,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = `w-full rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all ${t.isDark ? t.inputBg : 'bg-white text-gray-900 border border-gray-200'}`

  if (!loaded) {
    return (
      <div className={`${t.isDark ? 'bg-blue-600/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'} border p-6 rounded-3xl flex items-center justify-center h-32`}>
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className={`${t.isDark ? 'bg-blue-600/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'} border p-6 rounded-3xl space-y-4`}>
      <h3 className={`text-base font-black italic tracking-tighter uppercase flex items-center ${t.textPrimary}`}>
        <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-500 mr-2" />
        Canal de WhatsApp dos Agentes
      </h3>
      <p className={`text-xs font-medium -mt-2 ${t.textMuted}`}>
        Evolution API usada por Campanhas, CRM e Mensageria pra mandar alerta de agente/SLA pro
        WhatsApp do tenant — 1 valor único, não é por cliente. O número que recebe os alertas é
        curado pelo Master (Empresas → aba Comunicação e IA).
      </p>

      <div>
        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.textMuted}`}>Evolution API URL</label>
        <input type="text" value={apiUrl} onChange={e => setApiUrl(e.target.value)}
          placeholder="http://localhost:8080" className={inputCls} />
      </div>

      <div>
        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.textMuted}`}>Evolution API Key</label>
        <div className="relative">
          <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="Chave da API Evolution" className={`${inputCls} pr-12`} />
          <button type="button" onClick={() => setShowKey(!showKey)}
            className={`absolute right-4 top-1/2 -translate-y-1/2 ${t.isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`}>
            {showKey ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div>
        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.textMuted}`}>Evolution Instance</label>
        <input type="text" value={instance} onChange={e => setInstance(e.target.value)}
          placeholder="Nome da Instância" className={inputCls} />
      </div>

      <div className="flex items-center gap-3 flex-wrap pt-1">
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar Canal'}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-black text-emerald-500">
            <CheckCircleIcon className="h-4 w-4" /> Salvo
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1.5 text-xs font-black text-red-500">
            <XCircleIcon className="h-4 w-4" /> {error}
          </span>
        )}
      </div>
    </div>
  )
}
