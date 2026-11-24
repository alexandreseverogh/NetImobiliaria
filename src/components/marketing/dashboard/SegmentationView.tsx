'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';
import { formatCurrency, formatNumber, cn } from '@/lib/marketing-utils';

/**
 * Aba "Segmentação" do dashboard de campanhas.
 * Quebras de desempenho (idade×gênero, região e horário) coletadas pelo job diário.
 * Plano: docs/PLANO_SEGMENTACAO_E_WIZARD.md — Fase 3. Sem recomendações aqui (Fase 4).
 *
 * Regras de visualização (skill dataviz):
 *  - Marcas finas e arredondadas no fim do dado; grade discreta.
 *  - Identidade por texto, nunca só por cor: cada extremo traz um rótulo ("menor CPL").
 *  - Um eixo, uma métrica por gráfico. Tooltip ao passar o mouse em cada marca.
 *  - Dourado do sistema (acento) reservado ao que merece atenção: o melhor CPL e o pico de leads.
 */

import { HourLinesChart, HourHeatmapChart, type DailyHour } from './HourlyDailyCharts';
import { HourPeakRanking } from './HourPeakRanking';

interface Cell { age: string; gender: string; spend: number; leads: number; cpl: number | null; impressions: number; clicks: number }
interface Region { region: string; spend: number; leads: number; cpl: number | null; impressions: number }
interface Hour { hour: number; spend: number; leads: number; cpl: number | null; leadsPerDay?: number; spendPerDay?: number }
interface SegmentationData {
  hasData: boolean;
  ageGender: { ages: string[]; genders: string[]; cells: Cell[] };
  regions: Region[];
  hours: Hour[];
  days?: number;
  dailyHours?: DailyHour[];
}

const GENDER_LABEL: Record<string, string> = { male: 'Homens', female: 'Mulheres', unknown: 'Não informado' };
const TOP_OPTIONS = [5, 10, 15] as const;

interface Props {
  isDark: boolean;
  cardBase: string;
  tx: string;
  txMuted: string;
  startDate: string;
  endDate: string;
  segmentId?: string | null;
  clientId?: string | null;
}

export function SegmentationView({ isDark, cardBase, tx, txMuted, startDate, endDate, segmentId, clientId }: Props) {
  const [data, setData] = useState<SegmentationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topRegions, setTopRegions] = useState<number>(10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ startDate, endDate, topRegions: String(topRegions) });
    if (segmentId) qs.set('segmentId', segmentId);
    if (clientId) qs.set('clientId', clientId);
    adminFetch(`/api/admin/campanhas/dashboard/segmentation?${qs}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { if (d.error) setError(d.error); else setData(d); } })
      .catch(() => { if (!cancelled) setError('Não foi possível carregar a segmentação.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [startDate, endDate, segmentId, clientId, topRegions]);

  if (loading) {
    return <div className={cn('rounded-2xl border h-80 animate-pulse', isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-100')} />;
  }
  if (error) {
    return <div className={cn('rounded-2xl p-10 text-center text-sm', cardBase, tx)}>{error}</div>;
  }
  if (!data || !data.hasData) {
    return (
      <div className={cn('rounded-2xl p-16 text-center', cardBase)}>
        <p className={cn('text-sm font-black mb-1', tx)}>Ainda não há dados de segmentação</p>
        <p className={cn('text-xs', txMuted)}>
          As quebras por idade, gênero, região e horário são coletadas todo dia às 07:45, a partir da primeira entrega das campanhas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AgeGenderHeatmap data={data.ageGender} isDark={isDark} cardBase={cardBase} tx={tx} txMuted={txMuted} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RegionBars
          regions={data.regions}
          isDark={isDark} cardBase={cardBase} tx={tx} txMuted={txMuted}
          top={topRegions} onTop={setTopRegions}
        />
        <HourHeatmapChart dailyHours={data.dailyHours ?? []} isDark={isDark} cardBase={cardBase} tx={tx} txMuted={txMuted} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <HourLinesChart dailyHours={data.dailyHours ?? []} isDark={isDark} cardBase={cardBase} tx={tx} txMuted={txMuted} />
        <HourBars hours={data.hours} days={data.days ?? 1} isDark={isDark} cardBase={cardBase} tx={tx} txMuted={txMuted} />
      </div>
      <HourPeakRanking dailyHours={data.dailyHours ?? []} isDark={isDark} cardBase={cardBase} tx={tx} txMuted={txMuted} />
    </div>
  );
}

// ── Cabeçalho de seção: título, legenda curta e contexto ─────────────────────
function SectionHeader({ eyebrow, title, hint, txMuted, tx, right }: { eyebrow: string; title: string; hint: string; txMuted: string; tx: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <p className={cn('text-[10px] font-black uppercase tracking-[0.18em] mb-1', txMuted)}>{eyebrow}</p>
        <h3 className={cn('text-base font-black tracking-tight', tx)}>{title}</h3>
        <p className={cn('text-xs mt-1', txMuted)}>{hint}</p>
      </div>
      {right}
    </div>
  );
}

// ── Idade × gênero: mapa de calor por CPL, com extremos rotulados por texto ──
function AgeGenderHeatmap({ data, isDark, cardBase, tx, txMuted }: { data: SegmentationData['ageGender']; isDark: boolean; cardBase: string; tx: string; txMuted: string }) {
  const withCpl = data.cells.filter(c => c.cpl !== null) as Array<Cell & { cpl: number }>;
  const min = withCpl.length ? Math.min(...withCpl.map(c => c.cpl)) : 0;
  const max = withCpl.length ? Math.max(...withCpl.map(c => c.cpl)) : 0;
  const cellFor = (age: string, gender: string) => data.cells.find(c => c.age === age && c.gender === gender);

  // Três degraus de um mesmo verde→âmbar→vermelho, com rótulo textual (não só cor).
  const tone = (cpl: number | null) => {
    if (cpl === null) return { bg: isDark ? 'bg-white/[0.02]' : 'bg-slate-50', dot: '', label: '' };
    const t = max === min ? 0 : (cpl - min) / (max - min);
    if (t <= 0.001) return { bg: 'bg-emerald-500/15 ring-1 ring-emerald-500/40', dot: 'bg-emerald-400', label: 'menor CPL' };
    if (t < 0.5)    return { bg: 'bg-emerald-500/[0.07]', dot: 'bg-emerald-500/60', label: '' };
    if (t < 0.999)  return { bg: 'bg-amber-500/[0.08]', dot: 'bg-amber-400/70', label: '' };
    return { bg: 'bg-red-500/10 ring-1 ring-red-500/30', dot: 'bg-red-400', label: 'maior CPL' };
  };

  return (
    <section className={cn('rounded-2xl p-6', cardBase)}>
      <SectionHeader
        eyebrow="Público"
        title="Idade × gênero"
        hint="CPL de cada faixa etária e gênero no período. Passe o mouse para ver leads e investimento."
        txMuted={txMuted} tx={tx}
      />
      {data.ages.length === 0 ? (
        <p className={cn('text-xs', txMuted)}>Sem quebra por idade no período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate" style={{ borderSpacing: 8 }}>
            <thead>
              <tr>
                <th className={cn('text-left text-[10px] font-black uppercase tracking-widest pb-1', txMuted)}>Faixa</th>
                {data.genders.map(g => (
                  <th key={g} className={cn('text-left text-[10px] font-black uppercase tracking-widest pb-1 pl-2', txMuted)}>{GENDER_LABEL[g] ?? g}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.ages.map(age => (
                <tr key={age}>
                  <td className={cn('text-sm font-bold pr-2 whitespace-nowrap', tx)}>{age}</td>
                  {data.genders.map(g => {
                    const c = cellFor(age, g);
                    const t = tone(c?.cpl ?? null);
                    return (
                      <td key={g} className="p-0">
                        <div
                          className={cn('group relative rounded-xl px-4 py-3 min-w-[140px] transition-transform duration-200 hover:-translate-y-0.5', t.bg)}
                          title={c ? `${formatNumber(c.leads)} leads · ${formatCurrency(c.spend)} investidos · ${formatNumber(c.clicks)} cliques` : 'Sem dado nesta célula'}
                        >
                          <div className="flex items-center gap-2">
                            {t.dot && <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />}
                            <p className={cn('text-lg font-black tabular-nums tracking-tight', c?.cpl != null ? tx : txMuted)}>
                              {c?.cpl != null ? formatCurrency(c.cpl) : '—'}
                            </p>
                          </div>
                          <p className={cn('text-[11px] mt-0.5 tabular-nums', txMuted)}>
                            {c ? `${formatNumber(c.leads)} leads · ${formatCurrency(c.spend)}` : 'sem dado'}
                          </p>
                          {t.label && (
                            <span className={cn('absolute top-2 right-3 text-[9px] font-black uppercase tracking-widest',
                              t.label === 'menor CPL' ? 'text-emerald-400' : 'text-red-400')}>
                              {t.label}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── Região: barras horizontais finas, com CPL e seleção do Top N ─────────────
function RegionBars({
  regions, isDark, cardBase, tx, txMuted, top, onTop,
}: {
  regions: Region[]; isDark: boolean; cardBase: string; tx: string; txMuted: string;
  top: number; onTop: (n: number) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const maxSpend = Math.max(1, ...regions.map(r => r.spend));
  const best = useMemo(() => {
    const withCpl = regions.filter(r => r.cpl !== null) as Array<Region & { cpl: number }>;
    if (withCpl.length < 2) return null;
    return withCpl.reduce((a, b) => (b.cpl < a.cpl ? b : a)).region;
  }, [regions]);

  return (
    <section className={cn('rounded-2xl p-6', cardBase)}>
      <SectionHeader
        eyebrow="Onde divulgar"
        title="Regiões"
        hint="Investimento por região. O destaque dourado é a região de menor CPL entre as exibidas."
        txMuted={txMuted} tx={tx}
        right={
          <div className={cn('flex p-0.5 rounded-lg text-[10px] font-black', isDark ? 'bg-white/5' : 'bg-slate-100')}>
            {TOP_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => onTop(n)}
                className={cn('px-2.5 py-1 rounded-md transition-colors',
                  top === n ? 'bg-gold-premium text-navy-dark' : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'))}
              >
                Top {n}
              </button>
            ))}
          </div>
        }
      />
      {regions.length === 0 ? (
        <p className={cn('text-xs', txMuted)}>Sem quebra por região no período.</p>
      ) : (
        <ul className="space-y-2.5">
          {regions.map(r => {
            const isBest = r.region === best;
            const isHover = hovered === r.region;
            return (
              <li
                key={r.region}
                onMouseEnter={() => setHovered(r.region)}
                onMouseLeave={() => setHovered(null)}
                className={cn('group rounded-lg px-2 py-1.5 -mx-2 transition-colors', isHover && (isDark ? 'bg-white/[0.03]' : 'bg-slate-50'))}
              >
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <span className={cn('text-sm font-bold truncate', tx)}>
                    {r.region}
                    {isBest && <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-gold-premium">menor CPL</span>}
                  </span>
                  <span className={cn('text-[11px] tabular-nums whitespace-nowrap', txMuted)}>
                    {formatCurrency(r.spend)} <span className="opacity-60">·</span> CPL {r.cpl !== null ? formatCurrency(r.cpl) : '—'}
                  </span>
                </div>
                <div className={cn('h-1.5 rounded-full overflow-hidden', isDark ? 'bg-white/[0.06]' : 'bg-slate-100')}>
                  <div
                    className={cn('h-full rounded-full transition-[width] duration-500', isBest ? 'bg-gold-premium' : (isDark ? 'bg-slate-500' : 'bg-slate-400'))}
                    style={{ width: `${Math.max(2, (r.spend / maxSpend) * 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── Horário: 24 colunas finas, pico destacado, tooltip por hora ──────────────
function HourBars({ hours, days, isDark, cardBase, tx, txMuted }: { hours: Hour[]; days: number; isDark: boolean; cardBase: string; tx: string; txMuted: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const hasAny = hours.some(h => h.spend > 0);
  const perDay = (h: Hour) => h.leadsPerDay ?? (days > 0 ? h.leads / days : 0);
  const maxPerDay = Math.max(0.01, ...hours.map(perDay));
  const peak = useMemo(() => {
    const withLeads = hours.filter(h => h.leads > 0);
    if (withLeads.length === 0) return null;
    return withLeads.reduce((a, b) => (perDay(b) > perDay(a) ? b : a)).hour;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, days]);
  const hoverH = hover !== null ? hours[hover] : null;
  const fmt1 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const yTicks = [maxPerDay, maxPerDay / 2, 0];
  const dayLabel = days === 1 ? '1 dia' : `${days} dias`;

  return (
    <section className={cn('rounded-2xl p-6', cardBase)}>
      <SectionHeader
        eyebrow="Quando veicular"
        title="Horário"
        hint={`Média de leads por dia em cada hora, no horário do anunciante, sobre ${dayLabel} do período. O pico aparece destacado.`}
        txMuted={txMuted} tx={tx}
      />
      {!hasAny ? (
        <p className={cn('text-xs', txMuted)}>Sem quebra por horário no período.</p>
      ) : (
        <>
          <div className="flex gap-2">
            {/* Eixo Y: escala em leads/dia */}
            <div className="flex flex-col">
              <span className={cn('text-[9px] font-black uppercase tracking-widest mb-1', txMuted)}>leads/dia</span>
              <div className={cn('flex flex-col justify-between h-44 text-[10px] font-bold tabular-nums text-right pr-1', txMuted)}>
                {yTicks.map((t, i) => <span key={i}>{fmt1(t)}</span>)}
              </div>
            </div>

            <div className="relative flex-1 min-w-0">
              <div className="relative h-44 flex items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
                {/* Linhas de referência (0, 50%, 100% da escala) */}
                <div className={cn('pointer-events-none absolute inset-x-0 top-0 border-t', isDark ? 'border-white/[0.06]' : 'border-slate-200')} />
                <div className={cn('pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed', isDark ? 'border-white/[0.05]' : 'border-slate-100')} />
                <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 border-t', isDark ? 'border-white/[0.08]' : 'border-slate-300')} />
                {hours.map(h => {
                  const v = perDay(h);
                  const isPeak = h.hour === peak;
                  const isHover = hover === h.hour;
                  const height = v > 0 ? Math.max(4, (v / maxPerDay) * 100) : 2;
                  return (
                    <div
                      key={h.hour}
                      className="relative flex-1 h-full flex items-end cursor-default"
                      onMouseEnter={() => setHover(h.hour)}
                    >
                      <div
                        className={cn('w-full rounded-t-[3px] transition-[height,opacity] duration-300',
                          isPeak ? 'bg-gold-premium' : v > 0 ? (isDark ? 'bg-slate-500' : 'bg-slate-400') : (isDark ? 'bg-white/[0.06]' : 'bg-slate-100'),
                          hover !== null && !isHover && 'opacity-60')}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  );
                })}
                {hoverH && (
                  <div
                    className={cn('pointer-events-none absolute -top-2 z-10 -translate-x-1/2 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap',
                      isDark ? 'bg-[#0d1421] border border-white/10' : 'bg-white border border-slate-200')}
                    style={{ left: `${((hoverH.hour + 0.5) / 24) * 100}%` }}
                  >
                    <p className={cn('text-[10px] font-black uppercase tracking-widest', txMuted)}>{String(hoverH.hour).padStart(2, '0')}h</p>
                    <p className={cn('text-sm font-black tabular-nums', tx)}>{fmt1(perDay(hoverH))} leads/dia</p>
                    <p className={cn('text-[11px] tabular-nums', txMuted)}>
                      {formatNumber(hoverH.leads)} no período · CPL {hoverH.cpl !== null ? formatCurrency(hoverH.cpl) : '—'}
                    </p>
                    <p className={cn('text-[11px] tabular-nums', txMuted)}>Investido {formatCurrency(hoverH.spend)}</p>
                  </div>
                )}
              </div>
              <div className={cn('flex justify-between text-[10px] font-bold tabular-nums mt-2 px-px', txMuted)}>
                <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
              </div>
            </div>
          </div>
          <p className={cn('text-[10px] mt-3', txMuted)}>
            Altura = média de leads por dia naquela hora ({dayLabel} no período). Passe o mouse para ver o total do período e o CPL.
          </p>
        </>
      )}
    </section>
  );
}
