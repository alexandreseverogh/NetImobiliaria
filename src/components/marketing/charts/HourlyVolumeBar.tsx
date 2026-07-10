'use client'

/**
 * Distribuição por faixa horária — extraído de src/app/admin/campanhas/cta-analytics/page.tsx
 * (função `LeadsPerHour` local) para ser reaproveitado por outros módulos. Soma o volume de
 * TODOS os dias do período selecionado por hora-do-dia (0-23), não é um grid dia×hora como o
 * DayHourHeatmap — aqui o eixo é só a hora, útil pra ver o pico do dia típico.
 */
export interface HourlyVolumePoint { hr: number; label: string; n: number }

function Empty() {
  return <p className="text-sm text-slate-500 text-center py-8">Sem dados no período.</p>
}

export default function HourlyVolumeBar({ data, loading }: { data: HourlyVolumePoint[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-5 bg-white/5 rounded animate-pulse" style={{ width: `${85 - i * 10}%` }} />
        ))}
      </div>
    )
  }

  const max = Math.max(1, ...data.map((d) => d.n))
  const total = data.reduce((s, d) => s + d.n, 0)
  if (total === 0) return <Empty />

  return (
    <div className="space-y-[3px]">
      {data.map(({ hr, label, n }) => {
        const barPct = Math.round((n / max) * 100)
        const sharePct = total > 0 ? Math.round((n / total) * 100) : 0
        return (
          <div key={hr} className="flex items-center gap-2 group">
            <span className="text-[10px] text-slate-500 font-medium w-[110px] shrink-0 tabular-nums group-hover:text-slate-300 transition-colors">
              {label}
            </span>
            <div className="flex-1 h-[14px] bg-white/4 rounded overflow-hidden">
              {n > 0 && (
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{ width: `${barPct}%`, background: `rgba(197,160,40,${0.4 + (barPct / 100) * 0.55})` }}
                />
              )}
            </div>
            <span className={`text-[11px] tabular-nums w-5 text-right font-semibold ${n > 0 ? 'text-[#d4af37]' : 'text-slate-600'}`}>
              {n > 0 ? n : ''}
            </span>
            <span className="text-[10px] tabular-nums w-7 text-right text-slate-500">
              {n > 0 ? `${sharePct}%` : ''}
            </span>
          </div>
        )
      })}
      <div className="flex items-center gap-2 pt-2 mt-1 border-t border-white/8">
        <span className="text-[10px] text-slate-400 font-semibold w-[110px] shrink-0">Total</span>
        <div className="flex-1" />
        <span className="text-[11px] tabular-nums w-5 text-right font-bold text-white">{total}</span>
        <span className="text-[10px] tabular-nums w-7 text-right font-semibold text-slate-400">100%</span>
      </div>
    </div>
  )
}
