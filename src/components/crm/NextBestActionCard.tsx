'use client'

import React, { useEffect, useState } from 'react'
import { SparklesIcon, ArrowPathIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/hooks/useTheme'
import { adminFetch } from '@/lib/auth/adminFetch'

interface Suggestion {
  title: string
  description: string
  createdAt: string
}

interface Props {
  leadUuid: string
  /** Chamado com o texto da sugestão quando o atendente clica "Registrar como Atividade" —
   *  fecha o loop com a feature de Atividades já existente (docs/PLANO_AGENTES_ACELERACAO_CRM.md
   *  §5: "botão 'Registrar como Atividade'"). */
  onUseAsActivity: (text: string) => void
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

/**
 * F3 — Próxima Ação Sugerida (next_best_action), docs/PLANO_AGENTES_ACELERACAO_CRM.md §3/§5.
 * Card puramente informativo — nunca bloqueante, nunca envia nada sozinho. Não renderiza
 * nada quando o agente não está ativo pro tenant/segmento (mesma disciplina de nunca expor
 * um toggle/capacidade "de mentira" já usada desde F0).
 */
export default function NextBestActionCard({ leadUuid, onUseAsActivity }: Props) {
  const t = useTheme()
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!leadUuid) return
    setLoading(true)
    setError(null)
    adminFetch(`/api/crm/leads/${leadUuid}/next-best-action`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEnabled(!!data.enabled)
          setSuggestion(data.suggestion ?? null)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [leadUuid])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    try {
      const res = await adminFetch(`/api/crm/leads/${leadUuid}/next-best-action`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Não foi possível gerar a sugestão agora.')
        return
      }
      setEnabled(!!data.enabled)
      setSuggestion(data.suggestion ?? null)
    } catch (e: any) {
      setError(e.message || 'Não foi possível gerar a sugestão agora.')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading || !enabled) return null

  return (
    <div className={`p-5 ${t.cardBg} rounded-3xl border border-amber-500/20 relative`}>
      <div className="absolute -top-3 left-6 flex items-center space-x-2 bg-amber-600 text-[9px] font-bold text-white px-3 py-0.5 rounded-full uppercase shadow-lg shadow-amber-500/20">
        <SparklesIcon className="h-3 w-3" /><span>Sugestão da IA</span>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {suggestion ? (
            <>
              <p className={`text-xs leading-relaxed ${t.textSecondary}`}>{suggestion.description}</p>
              <p className={`text-[10px] mt-2 ${t.textMuted} opacity-70`}>Gerado {timeAgo(suggestion.createdAt)}</p>
            </>
          ) : (
            <p className={`text-xs italic ${t.textMuted}`}>Nenhuma sugestão gerada ainda para este lead.</p>
          )}
          {error && <p className="text-[11px] font-bold text-red-500 mt-2">{error}</p>}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Atualizar sugestão"
          className={`flex-shrink-0 p-2 rounded-xl ${t.isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} disabled:opacity-50 text-amber-500 transition-all`}
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {suggestion && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => onUseAsActivity(suggestion.description)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 hover:text-amber-500 transition-colors"
          >
            <ClipboardDocumentCheckIcon className="h-3.5 w-3.5" />
            Registrar como Atividade
          </button>
        </div>
      )}
    </div>
  )
}
