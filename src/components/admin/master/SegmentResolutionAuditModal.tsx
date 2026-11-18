'use client'

/**
 * Parâmetros da auditoria de resolução de conversas da Mensageria (por segmento).
 * Grava em system_benchmarks — a mesma cascata cliente → tenant → segmento usada pelos demais
 * parâmetros. O servidor (resolution-audit) lê estes três valores para classificar as conversas.
 */

import { useEffect, useState } from 'react'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'

interface Segment { id: string; name: string }

interface Props {
  segment: Segment
  onClose: () => void
}

const FIELDS: { key: string; label: string; help: string; step: string }[] = [
  {
    key: 'audit_fast_resolve_min',
    label: 'Resolução rápida suspeita (minutos)',
    help: 'Conversa resolvida em menos de N minutos depois de mensagem do cliente sem resposta nossa.',
    step: '1',
  },
  {
    key: 'audit_long_silence_hours',
    label: 'Resolução após longo silêncio (horas)',
    help: 'Conversa resolvida N horas ou mais depois de mensagem do cliente sem resposta nossa.',
    step: '1',
  },
  {
    key: 'audit_reopen_days',
    label: 'Reincidência suspeita (dias)',
    help: 'O mesmo contato abriu outra conversa em menos de N dias após a resolução.',
    step: '1',
  },
]

export default function SegmentResolutionAuditModal({ segment, onClose }: Props) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/master/segments/${segment.id}/benchmarks`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        const map: Record<string, string> = {}
        for (const b of d.benchmarks || []) {
          if (FIELDS.some((f) => f.key === b.metric_key)) map[b.metric_key] = String(Number(b.value))
        }
        setValues(map)
      })
      .catch(() => { if (!cancelled) setErro('Não foi possível carregar os parâmetros.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [segment.id])

  async function salvar() {
    setErro(null)
    const benchmarks = FIELDS.map((f) => ({
      metric_key: f.key,
      metric_label: f.label,
      unit: 'NUM',
      value: Number(values[f.key]),
    }))
    if (benchmarks.some((b) => !Number.isFinite(b.value) || b.value <= 0)) {
      setErro('Todos os valores precisam ser números maiores que zero.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/master/segments/${segment.id}/benchmarks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benchmarks }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setErro(d.error || 'Falha ao salvar.')
        return
      }
      setOk(true)
      setTimeout(() => setOk(false), 2000)
    } catch {
      setErro('Falha de rede ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-[#0a192f] shadow-2xl border border-gray-200 dark:border-white/10">
        <div className="flex items-start justify-between p-5 border-b border-gray-100 dark:border-white/8">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Auditoria de Resolução (Mensageria)</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Segmento: {segment.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
            Limites usados para sinalizar conversas resolvidas que podem ter sido encerradas sem atendimento.
            O sistema apenas sinaliza: quem confere é o administrador da empresa, na aba de auditoria do Painel do Gestor.
          </p>

          {loading ? (
            <div className="h-24 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />
          ) : (
            FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-700 dark:text-slate-200 mb-1">{f.label}</label>
                <input
                  type="number"
                  min={1}
                  step={f.step}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full h-9 px-3 rounded-lg bg-white dark:bg-[#020c1b] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white outline-none focus:border-[#2563eb]"
                />
                <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-1">{f.help}</p>
              </div>
            ))
          )}

          {erro && <p className="text-xs text-red-500">{erro}</p>}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-gray-100 dark:border-white/8">
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/5">
            Fechar
          </button>
          <button
            onClick={salvar}
            disabled={saving || loading}
            className="h-9 px-4 rounded-lg text-sm font-semibold bg-[#c5a028] text-[#020c1b] hover:bg-[#d4af37] disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {ok && <CheckIcon className="w-4 h-4" />}
            {saving ? 'Salvando…' : ok ? 'Salvo' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
