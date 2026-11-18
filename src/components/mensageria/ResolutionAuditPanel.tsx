'use client'

/**
 * Auditoria de conversas RESOLVIDAS (administrador verifica se o atendente "fingiu" resolver).
 * Só leitura: lista as resolvidas no período com os sinais calculados pelo servidor e abre a
 * conversa completa (ordem cronológica) ao clicar, para o administrador conferir o conteúdo.
 * Os limiares dos sinais vêm do segmento (Regimento do Segmento → Auditoria de Resolução).
 */

import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/auth/adminFetch'

interface AuditItem {
  id: string
  contactName: string | null
  contactPhone: string | null
  channelType: string
  assigneeName: string | null
  resolverName: string | null
  createdAt: string
  resolvedAt: string
  inboundTotal: number
  outboundTotal: number
  minutosDesdeCliente: number | null
  thresholds: { fastResolveMin: number; reopenDays: number; longSilenceHours: number }
  flags: { semResposta: boolean; resolucaoRapida: boolean; longoSilencio: boolean; reincidencia: boolean }
  score: number
}

interface Props {
  dateFrom: string
  dateTo: string
  onOpen: (conversationId: string) => void
}

const FLAG_LABELS: { key: keyof AuditItem['flags']; label: string; help: string }[] = [
  { key: 'semResposta', label: 'Sem resposta', help: 'Nenhuma mensagem nossa, pública, na conversa inteira.' },
  { key: 'resolucaoRapida', label: 'Resolvida rápido', help: 'Resolvida logo após mensagem do cliente sem resposta nossa.' },
  { key: 'longoSilencio', label: 'Após longo silêncio', help: 'Resolvida muito depois da mensagem do cliente, sem resposta nossa.' },
  { key: 'reincidencia', label: 'Cliente voltou', help: 'O mesmo contato abriu outra conversa logo após a resolução.' },
]

function formatFullDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const data = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  return `${data} ${hora}`
}

export default function ResolutionAuditPanel({ dateFrom, dateTo, onOpen }: Props) {
  const [items, setItems] = useState<AuditItem[]>([])
  const [suspeitas, setSuspeitas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [soSuspeitas, setSoSuspeitas] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErro(null)
    const qs = new URLSearchParams()
    if (dateFrom) qs.set('dateFrom', dateFrom)
    if (dateTo) qs.set('dateTo', dateTo)
    adminFetch(`/api/admin/mensageria/resolution-audit?${qs}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok || !data) {
          setErro(data?.error || 'Não foi possível carregar a auditoria.')
          return
        }
        setItems(data.items || [])
        setSuspeitas(data.suspeitas ?? 0)
      })
      .catch(() => { if (!cancelled) setErro('Falha de rede ao carregar a auditoria.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [dateFrom, dateTo])

  const visiveis = soSuspeitas ? items.filter((i) => i.score > 0) : items

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-xs text-slate-400">
          {loading ? 'Carregando…' : `${items.length} conversa(s) resolvida(s) no período · ${suspeitas} com algum sinal`}
        </p>
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={soSuspeitas}
            onChange={(e) => setSoSuspeitas(e.target.checked)}
            className="accent-[#c5a028]"
          />
          Mostrar só com sinais
        </label>
      </div>

      {erro && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{erro}</div>
      )}

      <div className="rounded-xl bg-[#0a192f] border border-white/8 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />)}
          </div>
        ) : visiveis.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-10">
            {items.length === 0 ? 'Nenhuma conversa resolvida neste período.' : 'Nenhuma conversa com sinais neste período.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-[11px] text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 font-medium">Resolvida em</th>
                <th className="px-4 py-2.5 font-medium">Contato</th>
                <th className="px-4 py-2.5 font-medium">Resolvida por</th>
                <th className="px-4 py-2.5 font-medium">Msgs (cliente / nós)</th>
                <th className="px-4 py-2.5 font-medium">Sinais</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((it) => (
                <tr
                  key={it.id}
                  onClick={() => onOpen(it.id)}
                  className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5 text-xs text-slate-300 whitespace-nowrap">{formatFullDate(it.resolvedAt)}</td>
                  <td className="px-4 py-2.5 text-white">
                    {it.contactName || it.contactPhone || 'Sem nome'}
                    <span className="block text-[10px] text-slate-500">{it.channelType}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-300">{it.resolverName || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-400 tabular-nums">{it.inboundTotal} / {it.outboundTotal}</td>
                  <td className="px-4 py-2.5">
                    {it.score === 0 ? (
                      <span className="text-[11px] text-emerald-400">Sem sinais</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {FLAG_LABELS.filter((f) => it.flags[f.key]).map((f) => (
                          <span
                            key={f.key}
                            title={f.help}
                            className="text-[10px] px-1.5 py-0.5 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300"
                          >
                            {f.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <details className="mt-3 text-[11px] text-slate-500">
        <summary className="cursor-pointer hover:text-slate-300">Como ler os sinais</summary>
        <ul className="mt-2 space-y-1 pl-4 list-disc">
          {FLAG_LABELS.map((f) => <li key={f.key}><span className="text-slate-300">{f.label}:</span> {f.help}</li>)}
        </ul>
        <p className="mt-2">Os limites (minutos, dias e horas) vêm do segmento de cada conversa. Clique numa linha para conferir a conversa completa.</p>
      </details>
    </div>
  )
}
