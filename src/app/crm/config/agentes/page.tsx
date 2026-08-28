'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  BoltIcon, PlusIcon, TrashIcon, CheckCircleIcon, QuestionMarkCircleIcon,
  ExclamationCircleIcon, ClipboardDocumentCheckIcon, Cog6ToothIcon,
  XCircleIcon, ClockIcon, PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector'
import { PromptOverrideCard } from '@/components/crm/PromptOverrideCard'

// Nem todo agente do catálogo usa LLM (speed_to_lead/stage_stagnation são regra pura) — só os
// 2 abaixo têm prompt sobrescrevível em cascata (docs/CHECKPOINT.md, 2026-08-28).
const AGENT_PROMPT_TEMPLATE_KEY: Record<string, string> = {
  reactivation: 'crm_agent_reactivation_message',
  next_best_action: 'crm_agent_next_best_action',
}

interface ParamHint { key: string; label: string; default: string }
interface CatalogAgent { key: string; label: string; description: string; paramHints?: ParamHint[] }
interface AgentRow { agent_key: string; ativo: boolean | null; params: Record<string, any> }
interface SegmentInfo { id: string; name: string; slug: string }

const ORDINAL = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º']

type TenantChoice = 'inherit' | 'on' | 'off'
interface TenantState { choice: TenantChoice; params: Record<string, string> }

function toChoice(ativo: boolean | null | undefined): TenantChoice {
  if (ativo === true) return 'on'
  if (ativo === false) return 'off'
  return 'inherit'
}

export default function CrmAgentesConfigPage() {
  const t = useTheme()
  const [tab, setTab] = useState<'config' | 'approvals'>('config')
  const [pendingCount, setPendingCount] = useState(0)
  const [segment, setSegment] = useState<SegmentInfo | null>(null)
  const [catalog, setCatalog] = useState<CatalogAgent[]>([])
  const [segmentDefaults, setSegmentDefaults] = useState<Record<string, AgentRow>>({})
  const [tenantState, setTenantState] = useState<Record<string, TenantState>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [error, setError] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  // Sobrescrita dos prompts dos agentes em cascata — 'own' = override do próprio tenant;
  // uuid = override de um cliente específico (admin do tenant cadastra em nome dele).
  const { clients: promptClients, loading: promptClientsLoading, clientFilter: promptClientFilter, setClientFilter: setPromptClientFilter } =
    useClientSelector('crm-agentes-prompt-override')
  const promptOverrideClientId = promptClientFilter === 'own' || promptClientFilter === 'segment' ? null : promptClientFilter

  useEffect(() => { fetchData() }, [])

  const refreshPendingCount = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/agent/approvals?status=PENDING_APPROVAL')
      const data = await res.json()
      if (data.success) setPendingCount((data.actions || []).length)
    } catch { /* silencioso — badge é só informativo */ }
  }, [])

  useEffect(() => { refreshPendingCount() }, [refreshPendingCount])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/config/agentes')
      const data = await res.json()
      if (data.success) {
        setSegment(data.segment)
        const cat: CatalogAgent[] = data.catalog || []
        setCatalog(cat)

        const defByKey: Record<string, AgentRow> = {}
        for (const r of data.segmentDefaults || []) defByKey[r.agent_key] = r
        setSegmentDefaults(defByKey)

        const overrideByKey: Record<string, AgentRow> = {}
        for (const r of data.tenantOverrides || []) overrideByKey[r.agent_key] = r
        const stateByKey: Record<string, TenantState> = {}
        for (const c of cat) {
          const existing = overrideByKey[c.key]
          stateByKey[c.key] = {
            choice: toChoice(existing?.ativo),
            params: { ...(existing?.params ?? {}) },
          }
        }
        setTenantState(stateByKey)
      }
    } finally { setLoading(false) }
  }

  const setChoice = (key: string, choice: TenantChoice) =>
    setTenantState(prev => ({ ...prev, [key]: { ...prev[key], choice } }))

  const setParam = (key: string, paramKey: string, value: string) =>
    setTenantState(prev => ({ ...prev, [key]: { ...prev[key], params: { ...prev[key].params, [paramKey]: value } } }))

  const removeParam = (key: string, paramKey: string) =>
    setTenantState(prev => {
      const { [paramKey]: _omit, ...rest } = prev[key].params
      return { ...prev, [key]: { ...prev[key], params: rest } }
    })

  const addParam = (key: string) =>
    setTenantState(prev => ({ ...prev, [key]: { ...prev[key], params: { ...prev[key].params, '': '' } } }))

  const useHint = (key: string, hint: ParamHint) =>
    setTenantState(prev => ({ ...prev, [key]: { ...prev[key], params: { ...prev[key].params, [hint.key]: hint.default } } }))

  const renameParamKey = (key: string, oldKey: string, newKey: string) =>
    setTenantState(prev => {
      const params = { ...prev[key].params }
      const value = params[oldKey]
      delete params[oldKey]
      params[newKey] = value
      return { ...prev, [key]: { ...prev[key], params } }
    })

  async function handleSave() {
    setSaving(true); setError(''); setSaveOk(false)
    try {
      const agents = catalog.map(c => {
        const st = tenantState[c.key]
        return {
          agent_key: c.key,
          ativo: st.choice === 'inherit' ? null : st.choice === 'on',
          params: Object.fromEntries(Object.entries(st.params).filter(([k]) => k.trim() !== '')),
        }
      })
      const res = await fetch('/api/crm/config/agentes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar')
      setSaveOk(true)
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><BoltIcon className="h-12 w-12 text-orange-500 animate-pulse" /></div>

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className={`flex flex-wrap justify-between items-center gap-4 ${t.cardBg} p-8 rounded-3xl shadow-sm`}>
        <div>
          <h2 className={`text-3xl font-black italic tracking-tighter uppercase ${t.textPrimary}`}>
            Agentes <span className="text-orange-500">de Aceleração</span>
          </h2>
          <p className={`text-sm font-medium ${t.textSecondary}`}>
            {segment ? `Segmento: ${segment.name}` : 'Segmento não identificado para este tenant.'} — o padrão de cada
            agente é curado pela equipe da plataforma; aqui você ajusta só o que valer especificamente pra sua empresa.
          </p>
        </div>
        <button onClick={() => setShowHelp(v => !v)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            showHelp ? 'bg-orange-600 text-white' : 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'
          }`}>
          <QuestionMarkCircleIcon className="h-4 w-4" /> Ajuda
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setTab('config')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            tab === 'config' ? 'bg-orange-600 text-white' : `${t.isDark ? 'bg-white/5' : 'bg-gray-100'} ${t.textMuted}`
          }`}>
          <Cog6ToothIcon className="h-4 w-4" /> Configuração
        </button>
        <button onClick={() => setTab('approvals')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
            tab === 'approvals' ? 'bg-orange-600 text-white' : `${t.isDark ? 'bg-white/5' : 'bg-gray-100'} ${t.textMuted}`
          }`}>
          <ClipboardDocumentCheckIcon className="h-4 w-4" /> Aprovações Pendentes
          {pendingCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${tab === 'approvals' ? 'bg-white/20' : 'bg-orange-500 text-white'}`}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {tab === 'approvals' ? (
        <ApprovalsPanel t={t} onDecided={refreshPendingCount} />
      ) : (<>

      {showHelp && (
        <div className={`rounded-3xl border p-6 space-y-3 text-xs leading-relaxed ${t.isDark ? 'bg-orange-500/5 border-orange-500/20 text-gray-300' : 'bg-orange-50 border-orange-200 text-gray-700'}`}>
          <p>
            <span className="font-black">Herdar do segmento</span>: usa exatamente o que a equipe da plataforma
            configurou pra {segment?.name || 'este segmento'} — o valor "Padrão do segmento" mostrado abaixo em cada
            agente. <span className="font-black">Forçar ativado/desativado</span>: sobrepõe esse padrão só pra este
            tenant, sem afetar nenhuma outra empresa do mesmo segmento.
          </p>
          <p>
            Cada agente só reconhece parâmetros específicos (mostrados como sugestão clicável quando existirem).
            Qualquer outra chave digitada é salva, mas nunca tem efeito. Um parâmetro configurado aqui sobrepõe o
            mesmo parâmetro do padrão do segmento; os demais continuam vindo do padrão.
          </p>
        </div>
      )}

      {catalog.length === 0 ? (
        <div className={`text-center py-16 border-2 border-dashed rounded-3xl ${t.isDark ? 'border-white/5' : 'border-gray-200'}`}>
          <ExclamationCircleIcon className={`h-10 w-10 mx-auto mb-3 ${t.textMuted}`} />
          <p className={`font-medium ${t.textSecondary}`}>Nenhum agente disponível ainda para este segmento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Escopo dos overrides de prompt (docs/CHECKPOINT.md, 2026-08-28) — vale pra
              qualquer card abaixo que tenha "Sobrescrever para..." (reactivation/next_best_action). */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>Editando prompts para</p>
            <ClientSelector
              value={promptClientFilter}
              onChange={setPromptClientFilter}
              clients={promptClients}
              loading={promptClientsLoading}
              variant="toggle"
              allowSegment={false}
              storageKey="crm-agentes-prompt-override"
            />
          </div>
          {catalog.map((agent, i) => {
            const def = segmentDefaults[agent.key]
            const defAtivo = !!def?.ativo
            const defParams = def?.params ?? {}
            const st = tenantState[agent.key] ?? { choice: 'inherit' as TenantChoice, params: {} }
            const paramEntries = Object.entries(st.params)
            const pendingHints = (agent.paramHints ?? []).filter(h => !(h.key in st.params))

            return (
              <div key={agent.key} className={`${t.cardBg} p-6 rounded-3xl space-y-4`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{ORDINAL[i] ?? `${i + 1}º`} Agente</p>
                    <p className={`text-base font-black ${t.textPrimary}`}>{agent.label}</p>
                    <p className={`text-xs mt-1 ${t.textMuted}`}>{agent.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      defAtivo ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      Padrão do segmento: {defAtivo ? 'Ativo' : 'Desativado'}
                    </span>
                    {Object.keys(defParams).length > 0 && (
                      <span className={`text-[10px] font-mono ${t.textMuted}`}>
                        {Object.entries(defParams).map(([k, v]) => `${k}=${v}`).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {([['inherit', 'Herdar do segmento'], ['on', 'Forçar ativado'], ['off', 'Forçar desativado']] as [TenantChoice, string][]).map(([val, label]) => (
                    <button key={val} onClick={() => setChoice(agent.key, val)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                        st.choice === val
                          ? 'bg-orange-600 text-white'
                          : `${t.isDark ? 'bg-white/5' : 'bg-gray-100'} ${t.textMuted} hover:text-orange-500`
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 pt-1">
                  {paramEntries.map(([pKey, pVal], idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input value={pKey} onChange={e => renameParamKey(agent.key, pKey, e.target.value)}
                        placeholder="parâmetro"
                        className={`w-1/3 px-2 py-1.5 rounded-lg text-xs font-mono ${t.inputBg}`} />
                      <input value={String(pVal)} onChange={e => setParam(agent.key, pKey, e.target.value)}
                        placeholder="valor"
                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs ${t.inputBg}`} />
                      <button onClick={() => removeParam(agent.key, pKey)} className={`p-1 ${t.textMuted} hover:text-red-500`}>
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addParam(agent.key)}
                    className={`flex items-center gap-1 text-[11px] font-bold ${t.textMuted} hover:text-orange-500`}>
                    <PlusIcon className="h-3 w-3" /> Adicionar parâmetro próprio
                  </button>
                </div>

                {pendingHints.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {pendingHints.map(hint => (
                      <button key={hint.key} onClick={() => useHint(agent.key, hint)}
                        title={`Adiciona "${hint.key}" com o valor padrão (${hint.default})`}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-orange-200 bg-orange-500/10 text-[11px] font-semibold text-orange-500 hover:bg-orange-500/20 transition-colors">
                        <PlusIcon className="h-3 w-3" /> {hint.label} <span className="font-mono opacity-70">({hint.default})</span>
                      </button>
                    ))}
                  </div>
                )}

                {AGENT_PROMPT_TEMPLATE_KEY[agent.key] && (
                  <PromptOverrideCard
                    templateKey={AGENT_PROMPT_TEMPLATE_KEY[agent.key]}
                    clientId={promptOverrideClientId}
                    label={`Prompt — ${agent.label}`}
                    t={t}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {error && <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>}

      <div className="flex items-center justify-end gap-4">
        {saveOk && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <CheckCircleIcon className="h-4 w-4" /> Salvo!
          </span>
        )}
        <button onClick={handleSave} disabled={saving || catalog.length === 0}
          className="px-10 py-3 bg-orange-600 text-white text-xs font-black uppercase rounded-2xl hover:bg-orange-500 disabled:opacity-50 transition-all">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
      </>)}
    </div>
  )
}

// ─── Aba "Aprovações Pendentes" (F4) ───────────────────────────────────────────
// Fila de ações OFFENSIVE aguardando decisão — mesma decisão do fluxo de PIN via WhatsApp
// (src/app/api/crm/agent/approve|reject/[id]/route.ts), só que autenticada (sem PIN).

interface PendingApproval {
  id: string
  agentKey: string
  title: string
  description: string
  suggestedMessage: string | null
  confidence: number
  approvalPinExp: string | null
  createdAt: string
  leadNome: string | null
  leadTelefone: string | null
}

function formatExpiry(iso: string | null) {
  if (!iso) return null
  const diffMs = new Date(iso).getTime() - Date.now()
  if (diffMs <= 0) return 'expirado'
  const hours = Math.round(diffMs / 3_600_000)
  return hours < 1 ? '< 1h' : `${hours}h`
}

function ApprovalsPanel({ t, onDecided }: { t: any; onDecided: () => void }) {
  const [items, setItems] = useState<PendingApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/agent/approvals?status=PENDING_APPROVAL')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar')
      setItems(data.actions || [])
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    setProcessingId(id)
    setErr('')
    try {
      const res = await fetch('/api/crm/agent/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, decision, editedMessage: decision === 'approve' ? editing[id] : undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao decidir')
      setItems(prev => prev.filter(i => i.id !== id))
      onDecided()
    } catch (e: any) {
      setErr(e.message ?? 'Erro ao decidir')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[200px]"><ClockIcon className="h-8 w-8 text-orange-500 animate-pulse" /></div>

  return (
    <div className="space-y-4">
      {err && <p className="text-xs text-red-600 font-medium">⚠️ {err}</p>}
      {items.length === 0 ? (
        <div className={`text-center py-16 border-2 border-dashed rounded-3xl ${t.isDark ? 'border-white/5' : 'border-gray-200'}`}>
          <CheckCircleIcon className={`h-10 w-10 mx-auto mb-3 ${t.textMuted}`} />
          <p className={`font-medium ${t.textSecondary}`}>Nenhuma aprovação pendente no momento.</p>
        </div>
      ) : (
        items.map(item => {
          const isProc = processingId === item.id
          const draft = editing[item.id] ?? item.suggestedMessage ?? ''
          return (
            <div key={item.id} className={`${t.cardBg} p-6 rounded-3xl space-y-3`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={`text-base font-black ${t.textPrimary}`}>{item.leadNome || 'Lead'}</p>
                  <p className={`text-xs mt-0.5 ${t.textMuted}`}>{item.title}</p>
                </div>
                {item.approvalPinExp && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                    <ClockIcon className="h-3.5 w-3.5" /> Expira em {formatExpiry(item.approvalPinExp)}
                  </span>
                )}
              </div>
              <p className={`text-xs ${t.textSecondary}`}>{item.description}</p>
              {item.suggestedMessage != null && (
                <div>
                  <label className={`flex items-center gap-1 text-[11px] font-bold mb-1 ${t.textMuted}`}>
                    <PencilSquareIcon className="h-3.5 w-3.5" /> Mensagem (revise antes de aprovar)
                  </label>
                  <textarea
                    value={draft}
                    onChange={e => setEditing(prev => ({ ...prev, [item.id]: e.target.value }))}
                    rows={3}
                    className={`w-full px-3 py-2 rounded-xl text-xs ${t.inputBg}`}
                  />
                </div>
              )}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-mono text-gray-400">{(item.confidence * 100).toFixed(0)}% confiança</span>
                <div className="flex gap-2">
                  <button disabled={isProc} onClick={() => decide(item.id, 'reject')}
                    className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200">
                    <XCircleIcon className="h-4 w-4" /> Rejeitar
                  </button>
                  <button disabled={isProc} onClick={() => decide(item.id, 'approve')}
                    className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                    <CheckCircleIcon className="h-4 w-4" /> {isProc ? 'Processando...' : 'Aprovar e Enviar'}
                  </button>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
