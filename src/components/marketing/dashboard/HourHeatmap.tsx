'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/marketing-utils';
import type { DailyHour } from './HourlyDailyCharts';

// Uma única codificação: intensidade de cor = quantidade de leads. Sem acento de pico.
const WEEK = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DAYPARTS = [
  { label: 'Madrugada', sub: '0–5h', from: 0, to: 5 },
  { label: 'Manhã', sub: '6–11h', from: 6, to: 11 },
  { label: 'Tarde', sub: '12–17h', from: 12, to: 17 },
  { label: 'Noite', sub: '18–23h', from: 18, to: 23 },
];
const LEVELS = 4;

const hh = (h: number) => `${String(h).padStart(2, '0')}h`;
const fmtDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const fmt1 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Dia da semana (0 = segunda … 6 = domingo) a partir de YYYY-MM-DD, sem depender do fuso. */
const weekIdx = (iso: string) => {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)));
  return (d.getUTCDay() + 6) % 7;
};

/** Faixa de intensidade 0 (sem lead) … LEVELS, em relação ao máximo. */
const levelOf = (v: number, max: number) => {
  if (v <= 0) return 0;
  return Math.min(LEVELS, Math.max(1, Math.ceil((v / max) * LEVELS)));
};

interface Props {
  dailyHours: DailyHour[];
  isDark: boolean;
  cardBase: string;
  tx: string;
  txMuted: string;
}

export function HourHeatmap({ dailyHours, isDark, cardBase, tx, txMuted }: Props) {
  const [view, setView] = useState<'semana' | 'dia'>('semana');

  // Matriz por dia: date -> 24 valores de leads
  const byDay = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const r of dailyHours) {
      if (!m.has(r.date)) m.set(r.date, Array(24).fill(0));
      m.get(r.date)![r.hour] += r.leads;
    }
    return m;
  }, [dailyHours]);

  // Visão semana típica: média de leads por ocorrência de cada (dia da semana, hora)
  const week = useMemo(() => {
    const sum = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
    const occ = Array(7).fill(0) as number[];
    for (const d of byDay.keys()) occ[weekIdx(d)]++;
    for (const [d, arr] of byDay) {
      const w = weekIdx(d);
      arr.forEach((v, h) => { sum[w][h] += v; });
    }
    const avg = sum.map((row, w) => row.map(v => (occ[w] ? v / occ[w] : 0)));
    const max = Math.max(0.0001, ...avg.flat());
    return { avg, occ, max };
  }, [byDay]);

  // Visão dia a dia (detalhe): mesma escala, um dia por linha
  const days = useMemo(() => Array.from(byDay.keys()).sort(), [byDay]);
  const dayMax = useMemo(() => Math.max(1, ...Array.from(byDay.values()).flat()), [byDay]);

  const hasAny = byDay.size > 0;

  const cellBg = (lvl: number) => {
    if (lvl === 0) return isDark ? 'rgba(255,255,255,0.035)' : 'rgba(15,23,42,0.035)';
    const alpha = [0, 0.3, 0.55, 0.8, 1][lvl];
    return isDark ? `rgba(203,213,225,${alpha})` : `rgba(30,41,59,${alpha})`;
  };

  const Daypart = () => (
    <div className="grid gap-[3px] mb-1.5 ml-14" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
      {DAYPARTS.map(p => (
        <div key={p.label} className={cn('col-span-6 border-t pt-1', isDark ? 'border-white/10' : 'border-slate-200')}>
          <p className={cn('text-[10px] font-black uppercase tracking-wider', tx)}>{p.label}</p>
          <p className={cn('text-[9px] font-bold tabular-nums', txMuted)}>{p.sub}</p>
        </div>
      ))}
    </div>
  );

  return (
    <section className={cn('rounded-2xl p-6', cardBase)}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className={cn('text-[10px] font-black uppercase tracking-[0.2em] mb-1', txMuted)}>Dia × hora</p>
          <h3 className={cn('text-lg font-black tracking-tight', tx)}>
            {view === 'semana' ? 'Semana típica' : 'Dia a dia'}
          </h3>
          <p className={cn('text-xs mt-1', txMuted)}>
            {view === 'semana'
              ? 'Média de leads por dia da semana e horário. Quanto mais escura a célula, mais leads.'
              : 'Cada linha é um dia do período. Mesma escala da visão semanal.'}
          </p>
        </div>
        <div className={cn('shrink-0 inline-flex rounded-lg p-0.5 border', isDark ? 'border-white/10' : 'border-slate-200')}>
          {(['semana', 'dia'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn('px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors',
                view === v
                  ? (isDark ? 'bg-white/10 text-white' : 'bg-slate-900 text-white')
                  : cn(txMuted, 'hover:opacity-80'))}
            >
              {v === 'semana' ? 'Semana' : 'Dia a dia'}
            </button>
          ))}
        </div>
      </div>

      {!hasAny ? (
        <p className={cn('text-xs', txMuted)}>Sem dados por hora e dia no período.</p>
      ) : view === 'semana' ? (
        <>
          <Daypart />
          <div className="space-y-[3px]">
            {WEEK.map((name, w) => (
              <div key={name} className="flex items-center gap-2">
                <span className={cn('w-12 shrink-0 text-[11px] font-bold text-right', txMuted)}>{name}</span>
                <div className="grid gap-[3px] flex-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                  {week.avg[w].map((v, h) => {
                    const lvl = levelOf(v, week.max);
                    return (
                      <div
                        key={h}
                        title={`${name} · ${hh(h)} · média ${fmt1(v)} ${plural(v, 'lead', 'leads')} (${week.occ[w]} ${plural(week.occ[w], 'dia', 'dias')})`}
                        className="h-7 rounded-[3px]"
                        style={{ backgroundColor: cellBg(lvl) }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="max-h-96 overflow-y-auto pr-1 space-y-[2px]">
          <Daypart />
          {days.map(d => {
            const arr = byDay.get(d)!;
            return (
              <div key={d} className="flex items-center gap-2">
                <span className={cn('w-12 shrink-0 text-[10px] font-bold tabular-nums text-right', txMuted)}>{fmtDay(d)}</span>
                <div className="grid gap-[3px] flex-1" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                  {arr.map((v, h) => (
                    <div
                      key={h}
                      title={`${fmtDay(d)} · ${hh(h)} · ${v} ${plural(v, 'lead', 'leads')}`}
                      className="h-3 rounded-[2px]"
                      style={{ backgroundColor: cellBg(levelOf(v, dayMax)) }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasAny && (
        <div className={cn('mt-5 flex flex-wrap items-center gap-3 text-[10px] font-bold', txMuted)}>
          <span>menos</span>
          {[1, 2, 3, 4].map(l => (
            <span key={l} className="w-4 h-3 rounded-[2px]" style={{ backgroundColor: cellBg(l) }} />
          ))}
          <span>mais leads</span>
          <span className="ml-auto opacity-70">vazio = nenhum lead</span>
        </div>
      )}
    </section>
  );
}
