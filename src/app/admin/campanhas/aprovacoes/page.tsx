'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  PencilSquareIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

interface AgentActionRow {
  id: string
  campaignId: string
  campaignName: string
  type: string
  title: string
  description: string
  confidence: number
  status: string
  createdAt: string
  executedAt: string | null
  tenant_id: string | null
  approval_pin_exp: string | null
  scale_pct: number | null
  scale_pct_from_bm: boolean
  budget_proposed: number | null   // proposto pelo agente no tick (centavos)
  budget_before: number | null     // antes da execução (centavos)
  budget_after: number | null      // após a execução (centavos)
  tenant_name: string | null
  client_name: string | null
  segment_name: string | null
  current_budget: number | null   // centavos
}

const TYPE_LABEL: Record<string, string> = {
  SCALE:             'Escalar Investimento',
  REFRESH_CREATIVE:  'Trocar Criativo',
  PAUSE:             'Pausar',
  DOWNSCALE:         'Reduzir Budget',
  ADJUST_AUDIENCE:   'Ajustar Público',
  REALLOCATE_BUDGET: 'Realocar Budget',
}

const TYPE_COLOR: Record<string, string> = {
  SCALE:             'bg-emerald-100 text-emerald-800',
  REFRESH_CREATIVE:  'bg-purple-100 text-purple-800',
  PAUSE:             'bg-red-100 text-red-800',
  DOWNSCALE:         'bg-orange-100 text-orange-800',
  ADJUST_AUDIENCE:   'bg-blue-100 text-blue-800',
  REALLOCATE_BUDGET: 'bg-yellow-100 text-yellow-800',
}

const STATUS_FILTER_OPTIONS = [
  { value: 'PENDING_APPROVAL', label: 'Pendentes' },
  { value: 'EXECUTED',         label: 'Executadas' },
  { value: 'REJECTED',         label: 'Rejeitadas' },
  { value: 'EXPIRED',          label: 'Expiradas' },
]

// Fallback visual quando o agente não gravou scale_pct (ações antigas)
const DEFAULT_SCALE_PCT = 20

function centsToBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0,
  })
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function isExpiringSoon(exp: string | null) {
  if (!exp) return false
  return new Date(exp).getTime() - Date.now() < 3 * 60 * 60 * 1000
}

// Calcula impacto financeiro diário para um grupo de ações do mesmo cliente
function calcFinancial(group: AgentActionRow[], customBudgets: Record<string, number>) {
  const scales     = group.filter(a => a.type === 'SCALE')
  const pauses     = group.filter(a => a.type === 'PAUSE')
  const downscales = group.filter(a => a.type === 'DOWNSCALE')

  const scaleDelta = scales.reduce((sum, a) => {
    const current  = a.current_budget ?? 0
    const pct      = a.scale_pct ?? DEFAULT_SCALE_PCT
    const proposed = customBudgets[a.id] ?? Math.round(current * (1 + pct / 100))
    return sum + Math.max(0, proposed - current)
  }, 0)

  const pauseSavings     = pauses.reduce((sum, a) => sum + (a.current_budget ?? 0), 0)
  const downscaleSavings = downscales.reduce((sum, a) => sum + (a.current_budget ?? 0) * 0.3, 0)
  const totalSavings     = pauseSavings + Math.round(downscaleSavings)
  const net              = totalSavings - scaleDelta

  return { scaleDelta, pauseSavings, downscaleSavings: Math.round(downscaleSavings), totalSavings, net }
}

// Agrupa por segmento, depois por cliente
const OWN_SEGMENT = '__sem_segmento__'
const OWN_CLIENT  = '__own__'

function groupBySegmentAndClient(actions: AgentActionRow[]) {
  const segMap = new Map<string, Map<string, AgentActionRow[]>>()

  for (const a of actions) {
    const segKey = a.segment_name?.trim() || OWN_SEGMENT
    if (!segMap.has(segKey)) segMap.set(segKey, new Map())
    const clientMap = segMap.get(segKey)!
    const clKey = a.client_name?.trim() || OWN_CLIENT
    if (!clientMap.has(clKey)) clientMap.set(clKey, [])
    clientMap.get(clKey)!.push(a)
  }

  // Segmentos ordenados (sem segmento por último)
  const segKeys = Array.from(segMap.keys()).sort((a, b) => {
    if (a === OWN_SEGMENT) return 1
    if (b === OWN_SEGMENT) return -1
    return a.localeCompare(b, 'pt-BR')
  })

  return { segMap, segKeys }
}

// ── Componente principal ────────────────────────────────────────────────────────

export default function AprovacoesPage() {
  const [actions, setActions]           = useState<AgentActionRow[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [customBudgets, setCustomBudgets]   = useState<Record<string, number>>({})
  // Texto bruto digitado pelo usuário — evita leading zeros e conflitos do input type=number
  const [budgetTexts, setBudgetTexts]       = useState<Record<string, string>>({})

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin-auth-token') : null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/master/aprovacoes?status=${statusFilter}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setActions(data.actions)
      setTotal(data.total)
      setCustomBudgets({})
      setBudgetTexts({})
    } catch (err: any) {
      toast.error(`Erro ao carregar: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, token])

  useEffect(() => { load() }, [load])

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    setProcessingId(id)
    try {
      const body: Record<string, any> = { id, decision }
      if (decision === 'approve' && customBudgets[id] != null) {
        body.customBudget = customBudgets[id]
      }
      const res  = await fetch('/api/admin/master/aprovacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      toast.success(decision === 'approve' ? '✅ Ação aprovada e executada!' : '🚫 Ação rejeitada.')
      // Atualiza o state local em vez de re-fetch — evita race condition ao trocar de aba
      setActions(prev => prev.filter(a => a.id !== id))
      setTotal(prev => prev - 1)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const isPending    = statusFilter === 'PENDING_APPROVAL'
  const pendingCount = actions.filter(a => a.status === 'PENDING_APPROVAL').length

  const { segMap, segKeys } = groupBySegmentAndClient(actions)

  return (
    <div className="py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase italic text-gray-900 tracking-tight flex items-center gap-2">
            <BoltIcon className="h-7 w-7 text-amber-500" />
            Aprovações do Agente
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ações sugeridas pelo agente — aprovadas, rejeitadas ou ajustadas antes de confirmar.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Banner pendentes */}
      {isPending && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
          {pendingCount > 0 ? (
            <>
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-amber-800">
                {pendingCount} {pendingCount !== 1 ? 'ações' : 'ação'} aguardando sua decisão
              </span>
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-green-700">Nenhuma ação pendente</span>
            </>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <FunnelIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                statusFilter === opt.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">{total} registro{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm">Carregando...</div>
      ) : actions.length === 0 ? (
        <div className="py-20 text-center text-gray-400 text-sm">
          Nenhuma ação com status &quot;{STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter)?.label}&quot;.
        </div>
      ) : (
        <div className="space-y-6">
          {segKeys.map(segKey => {
            const clientMap  = segMap.get(segKey)!
            const segLabel   = segKey === OWN_SEGMENT ? 'Sem segmento' : segKey
            const segActions = Array.from(clientMap.values()).flat()
            const clientKeys = Array.from(clientMap.keys()).sort((a, b) => {
              if (a === OWN_CLIENT) return 1
              if (b === OWN_CLIENT) return -1
              return a.localeCompare(b, 'pt-BR')
            })

            return (
              <div key={segKey}>
                {/* Cabeçalho de segmento */}
                <div className="flex items-center gap-2 mb-3">
                  <TagIcon className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                  <h2 className="text-xs font-black text-indigo-700 uppercase tracking-widest">{segLabel}</h2>
                  <div className="flex-1 h-px bg-indigo-100" />
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {segActions.length} ação{segActions.length !== 1 ? 'ões' : ''}
                  </span>
                </div>

                {isPending ? (
                  // ── PENDENTES: cards por cliente dentro do segmento ─────────────
                  <div className="space-y-3 pl-2 border-l-2 border-indigo-100">
                    {clientKeys.map(clKey => {
                      const group  = clientMap.get(clKey)!
                      const label  = clKey === OWN_CLIENT ? 'Campanhas próprias' : clKey
                      const fin    = calcFinancial(group, customBudgets)
                      const hasFinancial = fin.scaleDelta > 0 || fin.totalSavings > 0

                      return (
                        <div key={clKey} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                          {/* Cabeçalho do cliente */}
                          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                            <span className="text-base">{clKey === OWN_CLIENT ? '🏢' : '👤'}</span>
                            <span className="font-bold text-gray-800">{label}</span>
                            <span className="ml-auto text-xs text-gray-400">
                              {group.length} ação{group.length !== 1 ? 'ões' : ''}
                            </span>
                          </div>

                          {/* Ações */}
                          <div className="divide-y divide-gray-100">
                            {group.map(action => {
                              const current      = action.current_budget ?? 0
                              const pct          = action.scale_pct ?? DEFAULT_SCALE_PCT
                              const defaultProposed = Math.round(current * (1 + pct / 100))
                              const proposed     = customBudgets[action.id] ?? defaultProposed
                              const isEdited     = customBudgets[action.id] != null && customBudgets[action.id] !== defaultProposed
                              const expiring     = isExpiringSoon(action.approval_pin_exp)
                              const isProc       = processingId === action.id

                              return (
                                <div key={action.id} className={`px-4 py-4 ${expiring ? 'bg-amber-50/40' : ''}`}>
                                  {/* Tipo + Campanha */}
                                  <div className="flex items-start gap-2 mb-2">
                                    <span className={`flex-shrink-0 mt-0.5 inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${TYPE_COLOR[action.type] ?? 'bg-gray-100 text-gray-700'}`}>
                                      {TYPE_LABEL[action.type] ?? action.type}
                                    </span>
                                    <span className="font-semibold text-gray-900 text-sm leading-snug">
                                      {action.campaignName}
                                    </span>
                                  </div>

                                  {/* Título e descrição */}
                                  <p className="text-sm font-medium text-gray-700 mb-0.5">{action.title}</p>
                                  <p className="text-xs text-gray-500 leading-relaxed mb-3">{action.description}</p>

                                  {/* Budget editável — apenas SCALE */}
                                  {action.type === 'SCALE' && current > 0 && (
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3">
                                      <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                                        <PencilSquareIcon className="h-3.5 w-3.5" />
                                        Orçamento diário
                                        {isEdited && <span className="ml-1 text-indigo-600">(editado)</span>}
                                      </p>
                                      <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-400 mb-1">Atual</p>
                                          <p className="font-bold text-gray-700">{centsToBRL(current)}</p>
                                        </div>
                                        <span className="text-gray-400 text-lg">→</span>
                                        <div className="flex-1">
                                          <p className="text-xs text-gray-400 mb-1">
                                            Proposto (+{pct}%{action.scale_pct_from_bm ? ' benchmark' : ''})
                                          </p>
                                          <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">R$</span>
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              value={budgetTexts[action.id] ?? String(proposed / 100)}
                                              onChange={e => {
                                                const raw = e.target.value.replace(',', '.')
                                                setBudgetTexts(prev => ({ ...prev, [action.id]: e.target.value }))
                                                const reais = parseFloat(raw)
                                                if (!isNaN(reais) && reais > 0) {
                                                  setCustomBudgets(prev => ({ ...prev, [action.id]: Math.round(reais * 100) }))
                                                }
                                              }}
                                              onFocus={e => {
                                                // Inicializa o texto com o valor atual ao focar
                                                if (budgetTexts[action.id] == null) {
                                                  setBudgetTexts(prev => ({ ...prev, [action.id]: String(proposed / 100) }))
                                                }
                                                e.target.select()
                                              }}
                                              className="w-full pl-7 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                      {isEdited && (
                                        <p className="text-xs text-indigo-600 mt-2">
                                          Variação real: {proposed >= current ? '+' : ''}{centsToBRL(proposed - current)}/dia
                                          ({(((proposed - current) / current) * 100).toFixed(0)}%)
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Expiração + Botões */}
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="text-xs text-gray-400">
                                      {expiring && (
                                        <span className="flex items-center gap-1 text-amber-600 font-semibold mb-0.5">
                                          <ClockIcon className="h-3.5 w-3.5" />
                                          Expira em breve
                                        </span>
                                      )}
                                      <span className="font-mono">{(action.confidence * 100).toFixed(0)}% confiança</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        disabled={!!isProc}
                                        onClick={() => decide(action.id, 'reject')}
                                        className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200 whitespace-nowrap"
                                      >
                                        <XCircleIcon className="h-4 w-4" />
                                        Rejeitar
                                      </button>
                                      <button
                                        disabled={!!isProc}
                                        onClick={() => decide(action.id, 'approve')}
                                        className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                                      >
                                        <CheckCircleIcon className="h-4 w-4" />
                                        {isProc ? 'Executando...' : 'Aprovar'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Resumo financeiro do cliente */}
                          {hasFinancial && (
                            <div className={`px-4 py-3 border-t ${fin.net >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                              <p className="text-xs font-bold text-gray-600 mb-2">💰 Impacto financeiro diário</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                {fin.pauseSavings > 0 && (
                                  <>
                                    <span className="text-gray-500">⏸️ Economia (pausas)</span>
                                    <span className="font-semibold text-emerald-700 text-right">{centsToBRL(fin.pauseSavings)}/dia</span>
                                  </>
                                )}
                                {fin.downscaleSavings > 0 && (
                                  <>
                                    <span className="text-gray-500">📉 Economia (redução)</span>
                                    <span className="font-semibold text-emerald-700 text-right">{centsToBRL(fin.downscaleSavings)}/dia</span>
                                  </>
                                )}
                                {fin.scaleDelta > 0 && (
                                  <>
                                    <span className="text-gray-500">📈 Incremento (scale)</span>
                                    <span className="font-semibold text-red-600 text-right">+{centsToBRL(fin.scaleDelta)}/dia</span>
                                  </>
                                )}
                              </div>
                              <div className={`mt-2 pt-2 border-t ${fin.net >= 0 ? 'border-emerald-200' : 'border-amber-200'} flex items-center justify-between`}>
                                {fin.net >= 0 ? (
                                  <>
                                    <span className="text-xs font-bold text-emerald-700">✅ Auto-financiado</span>
                                    <span className="text-xs font-bold text-emerald-700">+{centsToBRL(fin.net)}/dia de sobra</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs font-bold text-amber-700">⚠️ Aporte necessário</span>
                                    <span className="text-xs font-bold text-amber-700">+{centsToBRL(Math.abs(fin.net))}/dia</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  // ── HISTÓRICO: tabela por segmento ───────────────────────────────
                  <div className="pl-2 border-l-2 border-indigo-100">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-3">
                      <table className="w-full text-sm table-fixed">
                        <colgroup>
                          <col className="w-[14%]" />
                          <col className="w-[16%]" />
                          <col className="w-[24%]" />
                          <col className="w-[9%]" />
                          <col className="w-[5%]" />
                          <col className="w-[18%]" />
                          <col className="w-[7%]" />
                          <col className="w-[7%]" />
                        </colgroup>
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2.5 text-left text-xs font-black uppercase tracking-wide text-gray-500">Cliente</th>
                            <th className="px-3 py-2.5 text-left text-xs font-black uppercase tracking-wide text-gray-500">Campanha</th>
                            <th className="px-3 py-2.5 text-left text-xs font-black uppercase tracking-wide text-gray-500">Ação</th>
                            <th className="px-3 py-2.5 text-left text-xs font-black uppercase tracking-wide text-gray-500">Tipo</th>
                            <th className="px-3 py-2.5 text-left text-xs font-black uppercase tracking-wide text-gray-500">Confiança</th>
                            <th className="px-3 py-2.5 text-left text-xs font-black uppercase tracking-wide text-gray-500">Budget (antes → prop. / exec.)</th>
                            <th className="px-3 py-2.5 text-left text-xs font-black uppercase tracking-wide text-gray-500">Criado</th>
                            <th className="px-3 py-2.5 text-left text-xs font-black uppercase tracking-wide text-gray-500">Executado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {segActions.map(action => {
                            const hasBudgetChange = action.budget_before != null && action.budget_after != null
                            const userEdited = hasBudgetChange && action.budget_proposed != null
                              && action.budget_after !== action.budget_proposed
                            return (
                              <tr key={action.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-3 align-top text-xs text-gray-500 break-words">
                                  {action.client_name ?? action.tenant_name ?? '—'}
                                </td>
                                <td className="px-3 py-3 align-top">
                                  <span className="font-semibold text-gray-900 text-xs break-words leading-snug">{action.campaignName}</span>
                                </td>
                                <td className="px-3 py-3 align-top">
                                  <p className="font-medium text-xs text-gray-800 leading-snug break-words">{action.title}</p>
                                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed break-words">{action.description}</p>
                                </td>
                                <td className="px-3 py-3 align-top">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${TYPE_COLOR[action.type] ?? 'bg-gray-100 text-gray-700'}`}>
                                    {TYPE_LABEL[action.type] ?? action.type}
                                  </span>
                                </td>
                                <td className="px-3 py-3 align-top">
                                  <span className="font-mono font-bold text-gray-700 text-xs tabular-nums">
                                    {(action.confidence * 100).toFixed(0)}%
                                  </span>
                                </td>
                                <td className="px-3 py-3 align-top">
                                  {hasBudgetChange ? (
                                    <div className="text-xs space-y-0.5">
                                      <div className="text-gray-500">
                                        <span className="font-medium text-gray-700">{centsToBRL(action.budget_before!)}</span>
                                        <span className="mx-1 text-gray-400">→</span>
                                        {action.budget_proposed != null && (
                                          <span className={userEdited ? 'line-through text-gray-400' : 'font-semibold text-emerald-700'}>
                                            {centsToBRL(action.budget_proposed)}
                                          </span>
                                        )}
                                      </div>
                                      {userEdited && (
                                        <div className="flex items-center gap-1">
                                          <span className="font-bold text-indigo-700">{centsToBRL(action.budget_after!)}</span>
                                          <span className="text-indigo-500 text-[10px] bg-indigo-50 px-1 rounded">editado</span>
                                        </div>
                                      )}
                                      {!userEdited && action.budget_after != null && action.budget_proposed == null && (
                                        <div className="font-semibold text-emerald-700">{centsToBRL(action.budget_after)}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 align-top text-xs text-gray-500 whitespace-nowrap">
                                  {formatDate(action.createdAt)}
                                </td>
                                <td className="px-3 py-3 align-top text-xs text-gray-500 whitespace-nowrap">
                                  {formatDate(action.executedAt)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
