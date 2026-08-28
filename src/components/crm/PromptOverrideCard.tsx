'use client'

/**
 * Card de prompt com override em cascata (docs/CHECKPOINT.md, 2026-08-28) — mostra o texto
 * REALMENTE em uso agora (Cliente → Tenant → Segmento → Global) e deixa sobrescrever pro
 * nível que esta instância está editando (tenant, quando clientId=null; ou um cliente
 * específico, quando clientId vem preenchido — sempre cadastrado pelo admin do TENANT em
 * nome do cliente, já que cliente nunca loga na aplicação). Reaproveitado em 4 lugares reais:
 * /crm/config/ia (crm_lead_qualification), /mensageria/config aba Bot (mensageria_bot_persona),
 * /crm/config/agentes (crm_agent_reactivation_message, crm_agent_next_best_action).
 */

import { useState, useEffect, useCallback } from 'react'
import { ChatBubbleBottomCenterIcon, CheckBadgeIcon, ArrowUturnLeftIcon, PencilSquareIcon, DocumentMagnifyingGlassIcon, BackspaceIcon } from '@heroicons/react/24/outline'

interface Props {
  templateKey: string
  clientId: string | null
  label: string
  /** Tema leve — reaproveita o padrão { isDark, cardBg, textPrimary, textMuted, inputBg, borderSub } já usado nas telas do CRM/Mensageria. */
  t: any
}

const LEVEL_LABEL: Record<string, string> = {
  client: 'Sobrescrito para este cliente',
  tenant: 'Sobrescrito para este tenant',
  segment: 'Herdado do padrão do segmento',
  global: 'Herdado do padrão global',
}

// Legenda dinâmica abaixo do título — complementa o badge (que já diz o nível) com uma frase
// legível dizendo de quem é o texto exibido agora. Feito dinâmico (não um título estático tipo
// "Prompt Mestre do Segmento") de propósito: o mesmo card mostra 4 níveis diferentes ao longo
// do tempo (o usuário pode sobrescrever/restaurar a qualquer momento) — um texto fixo ficaria
// errado assim que o nível mudasse.
const LEVEL_CAPTION: Record<string, string> = {
  client: 'Prompt personalizado deste cliente.',
  tenant: 'Prompt personalizado deste tenant.',
  segment: 'Prompt padrão do segmento, curado pelo Master.',
  global: 'Este segmento ainda não tem prompt próprio — usando o padrão global do Master.',
}

export function PromptOverrideCard({ templateKey, clientId, label, t }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [resolvedContent, setResolvedContent] = useState<string | null>(null)
  const [resolvedLevel, setResolvedLevel] = useState<string>('global')
  const [overrideContent, setOverrideContent] = useState<string | null>(null)
  const [masterReferenceContent, setMasterReferenceContent] = useState<string | null>(null)
  const [masterReferenceLevel, setMasterReferenceLevel] = useState<string>('global')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const editingLevelLabel = clientId ? 'este cliente' : 'este tenant'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({ templateKey })
      if (clientId) qs.set('clientId', clientId)
      const token = localStorage.getItem('admin-auth-token')
      const res = await fetch(`/api/crm/prompt-overrides?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar')
      setResolvedContent(data.resolvedContent)
      setResolvedLevel(data.resolvedLevel)
      setOverrideContent(data.overrideContent)
      setMasterReferenceContent(data.masterReferenceContent ?? null)
      setMasterReferenceLevel(data.masterReferenceLevel ?? 'global')
      setEditing(false)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [templateKey, clientId])

  useEffect(() => { load() }, [load])

  const startEditing = () => {
    setDraft(overrideContent ?? resolvedContent ?? '')
    setEditing(true)
  }

  const handleSave = async () => {
    if (!draft.trim()) return
    setSaving(true)
    setError('')
    try {
      const token = localStorage.getItem('admin-auth-token')
      const res = await fetch('/api/crm/prompt-overrides', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ templateKey, clientId, content: draft }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar')
      await load()
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async () => {
    if (!confirm(`Restaurar o padrão herdado, apagando a sobrescrita de ${editingLevelLabel}?`)) return
    setSaving(true)
    setError('')
    try {
      const qs = new URLSearchParams({ templateKey })
      if (clientId) qs.set('clientId', clientId)
      const token = localStorage.getItem('admin-auth-token')
      const res = await fetch(`/api/crm/prompt-overrides?${qs.toString()}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao restaurar')
      await load()
    } catch (e: any) {
      setError(e.message ?? 'Erro ao restaurar')
    } finally {
      setSaving(false)
    }
  }

  // Controla o botão "Restaurar padrão" — só existe algo pra apagar NESTE nível específico
  // (o que esta instância do card tem permissão de mexer: tenant quando clientId=null, o
  // próprio cliente quando presente).
  const isOverriddenAtThisLevel = clientId ? resolvedLevel === 'client' : resolvedLevel === 'tenant'
  // Controla a COR do badge/legenda — bug real encontrado ao vivo: usar isOverriddenAtThisLevel
  // aqui fazia um cliente SEM override próprio, mas herdando de um TENANT que TEM override,
  // mostrar o texto certo ("Sobrescrito para este tenant") só que em vermelho — contradição
  // visual (o texto diz que há uma customização real, a cor dizia "ainda no padrão do
  // Master"). isCustomized é sobre o NÍVEL RESOLVIDO em si (há negócio real customizando,
  // client OU tenant), não sobre se ESTA instância específica é a dona do override.
  const isCustomized = resolvedLevel === 'client' || resolvedLevel === 'tenant'
  // Só vale mostrar como bloco separado quando difere do que já está na tela (sem override
  // nenhum ganhando, masterReferenceContent === resolvedContent — mostrar seria redundante).
  const showMasterReference = !!masterReferenceContent && masterReferenceContent !== resolvedContent
  const masterReferenceLabel = masterReferenceLevel === 'segment' ? 'do segmento' : 'global'

  const masterReferenceBlock = showMasterReference ? (
    <details className={`mt-3 rounded-2xl border ${t.isDark ? 'border-white/10' : 'border-gray-200'}`}>
      <summary className={`flex items-center gap-1.5 cursor-pointer select-none px-4 py-2.5 text-[11px] font-black uppercase tracking-wide transition-colors ${t.textMuted} hover:text-blue-500`}>
        <DocumentMagnifyingGlassIcon className="h-4 w-4" />
        Ver prompt do Master ({masterReferenceLabel}) — referência
      </summary>
      <pre className={`whitespace-pre-wrap text-xs leading-relaxed px-4 pb-4 font-medium max-h-72 overflow-y-auto ${t.textMuted}`}>
        {masterReferenceContent}
      </pre>
    </details>
  ) : null

  return (
    <div className={`${t.isDark ? 'bg-blue-600/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'} border p-6 rounded-3xl`}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className={`text-base font-black italic tracking-tighter uppercase flex items-center ${t.textPrimary}`}>
          <ChatBubbleBottomCenterIcon className="h-5 w-5 text-blue-500 mr-2" />
          {label}
        </h3>
        <span className={`font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
          isCustomized
            ? 'text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            : 'text-[11px] bg-red-500/10 text-red-500 border border-red-500/30'
        }`}>
          {LEVEL_LABEL[resolvedLevel] || resolvedLevel}
        </span>
      </div>
      {!loading && (
        <p className={`text-xs font-medium mb-3 ${isCustomized ? t.textMuted : 'text-red-500'}`}>
          {LEVEL_CAPTION[resolvedLevel] || ''}
        </p>
      )}

      {error && <p className="text-xs text-red-500 font-medium mb-2">⚠️ {error}</p>}

      {loading ? (
        <div className="h-24 rounded-2xl bg-gray-200/40 animate-pulse" />
      ) : editing ? (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={10}
            className={`w-full rounded-2xl px-4 py-3 text-xs leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${t.isDark ? t.inputBg : 'bg-white text-slate-700 border border-slate-200'}`}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-all"
            >
              <CheckBadgeIcon className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Sobrescrita'}
            </button>
            <button
              type="button"
              onClick={() => setDraft('')}
              disabled={!draft}
              title="Apaga o texto herdado que veio pré-preenchido, pra começar do zero"
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-40 transition-all ${t.isDark ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <BackspaceIcon className="h-4 w-4" />
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={`px-4 py-2 rounded-xl text-xs font-bold ${t.isDark ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Cancelar
            </button>
          </div>
          {masterReferenceBlock}
        </div>
      ) : (
        <>
          <pre className={`whitespace-pre-wrap text-xs leading-relaxed rounded-2xl px-6 py-5 font-medium max-h-72 overflow-y-auto ${t.inputBg} ${t.textSecondary}`}>
            {resolvedContent || '(nenhum prompt configurado ainda)'}
          </pre>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={startEditing}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${t.isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'}`}
            >
              <PencilSquareIcon className="h-4 w-4" />
              Sobrescrever para {editingLevelLabel}
            </button>
            {isOverriddenAtThisLevel && (
              <button
                type="button"
                onClick={handleRestore}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide text-amber-500 hover:text-amber-400 disabled:opacity-50 transition-all"
              >
                <ArrowUturnLeftIcon className="h-4 w-4" />
                Restaurar padrão
              </button>
            )}
          </div>
          {masterReferenceBlock}
        </>
      )}
    </div>
  )
}
