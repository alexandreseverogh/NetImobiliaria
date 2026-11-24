'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/marketing-utils';
import type { DailyHour } from './HourlyDailyCharts';

const GOLD = '#c5a028';
const hh = (h: number) => `${String(h).padStart(2, '0')}h`;
const fmt2 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Props {
  dailyHours: DailyHour[];
  isDark: boolean;
  cardBase: string;
  tx: string;
  txMuted: string;
}

/**
 * Quantos dias cada horário foi pico, dentro do período.
 * Empate no mesmo dia divide o ponto entre as horas empatadas (cada dia soma 1 no total).
 */
export function HourPeakRanking({ dailyHours, isDark, cardBase, tx, txMuted }: Props) {
  const { score, daysWithPeak, top } = useMemo(() => {
    const byDay = new Map<string, number[]>();
    for (const r of dailyHours) {
      if (!byDay.has(r.date)) byDay.set(r.date, Array(24).fill(0));
      byDay.get(r.date)![r.hour] += r.leads;
    }
    const score = Array(24).fill(0) as number[];
    let daysWithPeak = 0;
    for (const arr of byDay.values()) {
      const max = Math.max(...arr);
      if (max <= 0) continue;
      const tied = arr.map((v, h) => (v === max ? h : -1)).filter(h => h >= 0);
      daysWithPeak++;
      for (const h of tied) score[h] += 1 / tied.length;
    }
    // Destaque por VALOR: todo horário igual ou acima do 3º maior valor fica dourado.
    // Assim, dois horários com o mesmo total nunca ficam um dourado e outro não.
    const sortedDesc = score.filter(s => s > 0).sort((a, b) => b - a);
    const cutoff = sortedDesc.length >= 3 ? sortedDesc[2] : sortedDesc[sortedDesc.length - 1] ?? Infinity;
    const top = score
      .map((s, h) => ({ h, s }))
      .filter(x => x.s > 0 && x.s >= cutoff - 1e-9)
      .sort((a, b) => b.s - a.s)
      .map(x => x.h);
    return { score, daysWithPeak, top };
  }, [dailyHours]);

  const max = Math.max(0.01, ...score);
  const hasAny = daysWithPeak > 0;
  const H = 150;

  return (
    <section className={cn('rounded-2xl p-6', cardBase)}>
      <p className={cn('text-[10px] font-black uppercase tracking-[0.2em] mb-1', txMuted)}>Ranking de picos</p>
      <h3 className={cn('text-lg font-black tracking-tight', tx)}>Horários que mais geram pico de leads</h3>
      <p className={cn('text-xs mt-1 mb-5', txMuted)}>
        Quantos dias do período cada horário foi o pico. Empates no mesmo dia dividem o ponto entre as horas empatadas.
      </p>

      {!hasAny ? (
        <p className={cn('text-xs', txMuted)}>Sem dados de pico no período.</p>
      ) : (
        <>
          <div className="flex items-end gap-[3px]" style={{ height: H }}>
            {score.map((s, h) => {
              const isTop = top.includes(h);
              const height = s > 0 ? Math.max(4, (s / max) * H) : 2;
              return (
                <div key={h} className="flex-1 flex flex-col items-center justify-end h-full" title={`${hh(h)} · ${fmt2(s)} ${s === 1 ? 'dia' : 'dias'} de pico`}>
                  <span className={cn('text-[9px] font-bold tabular-nums mb-1', s > 0 ? tx : txMuted)}>
                    {s > 0 ? fmt2(s) : ''}
                  </span>
                  <div
                    className="w-full rounded-t-[3px]"
                    style={{
                      height,
                      backgroundColor: isTop ? GOLD : s > 0 ? (isDark ? '#64748b' : '#94a3b8') : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'),
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className={cn('flex gap-[3px] mt-1.5', txMuted)}>
            {score.map((_, h) => (
              <span key={h} className="flex-1 text-center text-[8px] font-bold tabular-nums">
                {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
              </span>
            ))}
          </div>
          <p className={cn('text-[10px] mt-4 tabular-nums', txMuted)}>
            Em {daysWithPeak} {daysWithPeak === 1 ? 'dia' : 'dias'} com leads no período. Dourado = horários com o maior total de picos (inclui empates com o 3º colocado):{' '}
            {top.length ? top.map(hh).join(', ') : '—'}.
          </p>
        </>
      )}
    </section>
  );
}
