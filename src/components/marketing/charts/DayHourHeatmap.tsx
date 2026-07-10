'use client'

/**
 * Heatmap dia×hora — extraído de src/app/admin/campanhas/cta-analytics/page.tsx (função
 * `Heatmap` local) para ser reaproveitado por outros módulos (ver PLANO_MENSAGERIA.md
 * seção 9 — "reaproveita o componente já feito no CTA Analytics").
 *
 * data: array esparso — células sem entrada são tratadas como n=0.
 */
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export interface DayHourHeatmapPoint { dow: number; hour: number; n: number }

export default function DayHourHeatmap({ data, loading }: { data: DayHourHeatmapPoint[]; loading: boolean }) {
  const grid: Record<string, number> = {}
  let max = 1
  for (const d of data) { grid[`${d.dow}-${d.hour}`] = d.n; if (d.n > max) max = d.n }
  const labelHours = [0, 4, 8, 12, 16, 20]

  if (loading) return <div className="h-28 bg-white/3 rounded-lg animate-pulse" />

  return (
    <div className="overflow-x-auto">
      <table className="border-separate" style={{ borderSpacing: 3 }}>
        <tbody>
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
            <tr key={dow}>
              <td className="text-[10px] text-slate-500 pr-2 align-middle w-7">{DOW[dow]}</td>
              {Array.from({ length: 24 }).map((_, h) => {
                const n = grid[`${dow}-${h}`] || 0
                const intensity = n === 0 ? 0 : 0.12 + (n / max) * 0.88
                return (
                  <td
                    key={h}
                    title={`${DOW[dow]} ${h}h: ${n}`}
                    style={{
                      width: 13, height: 16, borderRadius: 3,
                      background: n === 0 ? 'rgba(255,255,255,0.04)' : `rgba(197,160,40,${intensity.toFixed(2)})`,
                    }}
                  />
                )
              })}
            </tr>
          ))}
          <tr>
            <td />
            {Array.from({ length: 24 }).map((_, h) => (
              <td key={h} className="text-[9px] text-slate-500 text-center pt-1 font-medium">
                {labelHours.includes(h) ? h : ''}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-slate-500">Menor</span>
        {[0.12, 0.3, 0.5, 0.7, 0.9].map((a, i) => (
          <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ background: `rgba(197,160,40,${a})` }} />
        ))}
        <span className="text-[10px] text-slate-500">Maior</span>
      </div>
    </div>
  )
}
