'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/marketing-utils';

export interface DailyHour { date: string; hour: number; leads: number }

interface Props {
  dailyHours: DailyHour[];
  isDark: boolean;
  cardBase: string;
  tx: string;
  txMuted: string;
}

// Acento do sistema (gold-premium) — usado só para o pico de cada dia.
const GOLD = '#c5a028';

const fmtDay = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};
const hh = (h: number) => `${String(h).padStart(2, '0')}h`;
const fmt1 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/**
 * Agrega por dia e identifica o(s) pico(s) de cada dia.
 * Empates no maior valor do dia são todos marcados (não escolhemos um arbitrariamente).
 */
function useDailyModel(dailyHours: DailyHour[]) {
  return useMemo(() => {
    const byDay = new Map<string, number[]>();
    for (const r of dailyHours) {
      if (!byDay.has(r.date)) byDay.set(r.date, Array(24).fill(0));
      byDay.get(r.date)![r.hour] += r.leads;
    }
    const days = Array.from(byDay.keys()).sort();
    const peaks = new Map<string, number[]>();
    const totals = new Map<string, number>();
    for (const d of days) {
      const arr = byDay.get(d)!;
      const max = Math.max(...arr);
      totals.set(d, arr.reduce((s, v) => s + v, 0));
      if (max > 0) peaks.set(d, arr.map((v, h) => (v === max ? h : -1)).filter(h => h >= 0));
    }
    const avg = Array.from({ length: 24 }, (_, h) =>
      days.length ? days.reduce((s, d) => s + byDay.get(d)![h], 0) / days.length : 0,
    );
    const globalMax = Math.max(1, ...days.flatMap(d => byDay.get(d)!), ...avg);
    return { days, byDay, peaks, totals, avg, globalMax };
  }, [dailyHours]);
}

// ── A) Um dia por vez + média do período (evita o emaranhado de N linhas) ──
export function HourLinesChart({ dailyHours, isDark, cardBase, tx, txMuted }: Props) {
  const { days, byDay, peaks, totals, avg, globalMax } = useDailyModel(dailyHours);

  // Dia padrão: o de maior volume de leads no período.
  const defaultDay = useMemo(() => {
    let best: string | null = null;
    for (const d of days) if (best === null || (totals.get(d) ?? 0) > (totals.get(best) ?? 0)) best = d;
    return best;
  }, [days, totals]);
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked && days.includes(picked) ? picked : defaultDay;

  const W = 520, H = 220, PL = 34, PR = 8, PT = 10, PB = 24;
  const iw = W - PL - PR, ih = H - PT - PB;
  const X = (h: number) => PL + (h / 23) * iw;
  const Y = (v: number) => PT + ih - (v / globalMax) * ih;
  const pathOf = (vals: number[]) =>
    vals.map((v, h) => `${h === 0 ? 'M' : 'L'}${X(h).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');

  const hasAny = days.length > 0 && selected !== null;
  const selVals = hasAny ? byDay.get(selected!)! : [];
  const selPeaks = hasAny ? peaks.get(selected!) ?? [] : [];
  const yTicks = [globalMax, globalMax / 2, 0];

  return (
    <section className={cn('rounded-2xl p-6', cardBase)}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className={cn('text-[10px] font-black uppercase tracking-[0.2em] mb-1', txMuted)}>Dia a dia</p>
          <h3 className={cn('text-lg font-black tracking-tight', tx)}>Leads por hora em um dia</h3>
          <p className={cn('text-xs mt-1', txMuted)}>
            Linha do dia escolhido, comparada à média do período (tracejada). Pontos dourados = pico do dia.
          </p>
        </div>
        {hasAny && (
          <select
            value={selected ?? ''}
            onChange={e => setPicked(e.target.value)}
            style={{ colorScheme: isDark ? 'dark' : 'light' }}
            className={cn('shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold tabular-nums bg-transparent',
              isDark ? 'border-white/10 text-slate-200' : 'border-slate-200 text-slate-700')}
          >
            {days.map(d => (
              <option key={d} value={d}>{fmtDay(d)} · {totals.get(d)} {totals.get(d) === 1 ? 'lead' : 'leads'}</option>
            ))}
          </select>
        )}
      </div>

      {!hasAny ? (
        <p className={cn('text-xs', txMuted)}>Sem dados por hora e dia no período.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className={cn('w-full h-auto', txMuted)} role="img" aria-label="Leads por hora no dia escolhido">
            {yTicks.map((t, i) => (
              <g key={i}>
                <line x1={PL} x2={W - PR} y1={Y(t)} y2={Y(t)} stroke="currentColor" strokeOpacity={0.12} />
                <text x={PL - 6} y={Y(t) + 3} textAnchor="end" fontSize="10" fontWeight="700" fill="currentColor">
                  {fmt1(t)}
                </text>
              </g>
            ))}
            <text x={8} y={PT + ih / 2} transform={`rotate(-90 8 ${PT + ih / 2})`} textAnchor="middle" fontSize="9" fontWeight="800" fill="currentColor" letterSpacing="1">
              LEADS
            </text>

            {/* Média do período (tracejada) */}
            <path d={pathOf(avg)} fill="none" stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="4 4" />

            {/* Dia escolhido */}
            <path d={pathOf(selVals)} fill="none" stroke={isDark ? '#e2e8f0' : '#1e293b'} strokeWidth={2} />
            {selVals.map((v, h) => (
              <circle key={h} cx={X(h)} cy={Y(v)} r={1.8} fill={isDark ? '#e2e8f0' : '#1e293b'} />
            ))}

            {/* Picos do dia escolhido */}
            {selPeaks.map(h => (
              <circle key={`p${h}`} cx={X(h)} cy={Y(selVals[h])} r={4.5} fill={GOLD}>
                <title>{`${fmtDay(selected!)} · ${hh(h)} · ${selVals[h]} leads (pico do dia)`}</title>
              </circle>
            ))}

            {[0, 6, 12, 18, 23].map(h => (
              <text key={h} x={X(h)} y={H - 6} textAnchor={h === 0 ? 'start' : h === 23 ? 'end' : 'middle'} fontSize="10" fontWeight="700" fill="currentColor">
                {hh(h)}
              </text>
            ))}
          </svg>
          <div className={cn('mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] font-bold', txMuted)}>
            <span className="inline-flex items-center gap-1.5">
              <svg width="22" height="8" aria-hidden="true"><line x1="0" y1="4" x2="22" y2="4" stroke={isDark ? '#e2e8f0' : '#1e293b'} strokeWidth="2" /></svg>
              Dia {fmtDay(selected!)} (linha contínua)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg width="22" height="8" aria-hidden="true"><line x1="0" y1="4" x2="22" y2="4" stroke="currentColor" strokeOpacity={0.5} strokeWidth="1.5" strokeDasharray="4 4" /></svg>
              Média de todos os dias do período (tracejada)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GOLD }} />
              Pico do dia escolhido ({selPeaks.map(hh).join(', ') || '—'})
            </span>
          </div>
        </>
      )}
    </section>
  );
}

// ── B) Mapa de calor dia × hora: célula = leads; pico de cada dia em dourado ──
export function HourHeatmapChart({ dailyHours, isDark, cardBase, tx, txMuted }: Props) {
  const { days, byDay, peaks, globalMax } = useDailyModel(dailyHours);
  const hasAny = days.length > 0;

  // Escala sequencial de um único tom (sem arco-íris).
  const cellBg = (v: number) => {
    if (v <= 0) return isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)';
    const a = 0.25 + 0.7 * (v / globalMax);
    return isDark ? `rgba(203,213,225,${a.toFixed(3)})` : `rgba(51,65,85,${a.toFixed(3)})`;
  };

  return (
    <section className={cn('rounded-2xl p-6', cardBase)}>
      <p className={cn('text-[10px] font-black uppercase tracking-[0.2em] mb-1', txMuted)}>Dia × hora</p>
      <h3 className={cn('text-lg font-black tracking-tight', tx)}>Mapa de calor de leads</h3>
      <p className={cn('text-xs mt-1 mb-4', txMuted)}>
        Cada linha é um dia e cada coluna uma hora. Quanto mais escura a célula, mais leads. Dourado = pico do dia.
      </p>
      {!hasAny ? (
        <p className={cn('text-xs', txMuted)}>Sem dados por hora e dia no período.</p>
      ) : (
        <>
          <div className="grid gap-[2px] mb-1 ml-12" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className={cn('text-[8px] font-bold tabular-nums text-center', txMuted)}>
                {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
              </span>
            ))}
          </div>
          <div className="max-h-96 overflow-y-auto pr-1">
            {days.map(d => {
              const arr = byDay.get(d)!;
              const peakSet = new Set(peaks.get(d) ?? []);
              return (
                <div key={d} className="flex items-center gap-2 mb-[2px]">
                  <span className={cn('w-10 shrink-0 text-[10px] font-bold tabular-nums text-right', txMuted)}>{fmtDay(d)}</span>
                  <div className="grid gap-[2px] flex-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                    {arr.map((v, h) => {
                      const isPeak = peakSet.has(h);
                      return (
                        <div
                          key={h}
                          title={`${fmtDay(d)} · ${hh(h)} · ${v} ${v === 1 ? 'lead' : 'leads'}${isPeak ? ' (pico do dia)' : ''}`}
                          className="h-3 rounded-[2px]"
                          style={{ backgroundColor: isPeak ? GOLD : cellBg(v) }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className={cn('flex items-center gap-4 mt-3 text-[10px] font-bold', txMuted)}>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: GOLD }} />pico do dia</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: cellBg(1) }} />
              {globalMax > 1 ? 'mais leads →' : 'leads'}
              <span className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: cellBg(globalMax) }} />
            </span>
          </div>
        </>
      )}
    </section>
  );
}
