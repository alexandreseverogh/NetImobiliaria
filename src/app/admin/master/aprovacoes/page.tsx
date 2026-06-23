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
  tenant_name: string | null
}

const TYPE_LABEL: Record<string, string> = {
  SCALE:             'Escalar Budget',
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

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function isExpiringSoon(exp: string | null) {
  if (!exp) return false
  return new Date(exp).getTime() - Date.now() < 3 * 60 * 60 * 1000 // < 3h
}

export default function AprovacoesPage() {
  const [actions, setActions] = useState<AgentActionRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin-auth-token') : null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/master/aprovacoes?status=${statusFilter}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)
      setActions(data.actions)
      setTotal(data.total)
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
      const res = await fetch('/api/admin/master/aprovacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, decision }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? res.statusText)

      toast.success(decision === 'approve' ? '✅ Ação aprovada e executada!' : '🚫 Ação rejeitada.')
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const pendingCount = actions.filter(a => a.status === 'PENDING_APPROVAL').length

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase italic text-gray-900 tracking-tight flex items-center gap-2">
            <BoltIcon className="h-7 w-7 text-amber-500" />
            Aprovações do Agente
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ações ofensivas sugeridas pelo agente autônomo que requerem aprovação humana.
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

      {/* Stats strip */}
      {statusFilter === 'PENDING_APPROVAL' && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${pendingCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
          {pendingCount > 0 ? (
            <>
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-amber-800">
                {pendingCount} ação{pendingCount !== 1 ? 'ões' : ''} aguardando sua decisão
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

      {/* Filters */}
      <div className="flex items-center gap-2">
        <FunnelIcon className="h-4 w-4 text-gray-400" />
        <div className="flex gap-1">
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

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm">Carregando...</div>
      ) : actions.length === 0 ? (
        <div className="py-20 text-center text-gray-400 text-sm">
          Nenhuma ação com status "{STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter)?.label}".
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-500">Campanha</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-500">Ação</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-500">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-500 w-16">Conf.</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-500">Empresa</th>
                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-500">Criado</th>
                {statusFilter === 'PENDING_APPROVAL' && (
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-500">Expira</th>
                )}
                {statusFilter === 'PENDING_APPROVAL' && (
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-gray-500">Decisão</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {actions.map(action => {
                const expiring = isExpiringSoon(action.approval_pin_exp)
                const isProcessing = processingId === action.id
                return (
                  <tr key={action.id} className={`hover:bg-gray-50 transition-colors ${expiring ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 truncate max-w-[180px]">{action.campaignName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{action.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 max-w-[240px]">{action.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${TYPE_COLOR[action.type] ?? 'bg-gray-100 text-gray-700'}`}>
                        {TYPE_LABEL[action.type] ?? action.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-gray-700">
                        {(action.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-[120px]">
                      {action.tenant_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(action.createdAt)}
                    </td>
                    {statusFilter === 'PENDING_APPROVAL' && (
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {action.approval_pin_exp ? (
                          <span className={`flex items-center gap-1 ${expiring ? 'text-amber-600 font-semibold' : 'text-gray-500'}`}>
                            <ClockIcon className="h-3.5 w-3.5" />
                            {formatDate(action.approval_pin_exp)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    )}
                    {statusFilter === 'PENDING_APPROVAL' && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={isProcessing}
                            onClick={() => decide(action.id, 'approve')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                          >
                            <CheckCircleIcon className="h-3.5 w-3.5" />
                            Aprovar
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => decide(action.id, 'reject')}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200"
                          >
                            <XCircleIcon className="h-3.5 w-3.5" />
                            Rejeitar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
