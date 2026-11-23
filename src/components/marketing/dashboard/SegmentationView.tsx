'use client';

import React, { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';
import { formatCurrency, formatNumber, cn } from '@/lib/marketing-utils';

/**
 * Aba "Segmentação" do dashboard de campanhas.
 * Mostra as quebras de desempenho (idade×gênero, região e horário) já coletadas pelo job diário.
 * Plano: docs/PLANO_SEGMENTACAO_E_WIZARD.md — Fase 3. Sem recomendações aqui (Fase 4).
 */

interface Cell { age: string; gender: string; spend: number; leads: number; cpl: number | null; impressions: number; clicks: number }
interface Region { region: string; spend: number; leads: number; cpl: number | null; impressions: number }
interface Hour { hour: number; spend: number; leads: number; cpl: number | null }
interface SegmentationData {
  hasData: boolean;
  ageGender: { ages: string[]; genders: string[]; cells: Cell[] };
  regions: Region[];
  hours: Hour[];
}

const GENDER_LABEL: Record<string, string> = { male: 'Homens', female: 'Mulheres', unknown: 'Não informado' };

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ startDate, endDate });
    if (segmentId) qs.set('segmentId', segmentId);
    if (clientId) qs.set('clientId', clientId);
    adminFetch(`/api/admin/campanhas/dashboard/segmentation?${qs}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { if (d.error) setError(d.error); else setData(d); } })
      .catch(() => { if (!cancelled) setError('Não foi possível carregar a segmentação.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [startDate, endDate, segmentId, clientId]);

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RegionBars regions={data.regions} isDark={isDark} cardBase={cardBase} tx={tx} txMuted={txMuted} />
        <HourBars hours={data.hours} isDark={isDark} cardBase={cardBase} tx={tx} txMuted={txMuted} />
      </div>
    </div>
  );
}

// ── Idade × gênero: CPL por célula (mais verde = CPL menor) ──────────────────
function AgeGenderHeatmap({ data, isDark, cardBase, tx, txMuted }: { data: SegmentationData['ageGender']; isDark: boolean; cardBase: string; tx: string; txMuted: string }) {
  const cpls = data.cells.map(c => c.cpl).filter((v): v is number => v !== null);
  const min = cpls.length ? Math.min(...cpls) : 0;
  const max = cpls.length ? Math.max(...cpls) : 0;
  const cellFor = (age: string, gender: string) => data.cells.find(c => c.age === age && c.gender === gender);

  const shade = (cpl: number | null) => {
    if (cpl === null) return isDark ? 'bg-white/[0.03]' : 'bg-slate-50';
    const t = max === min ? 0 : (cpl - min) / (max - min); // 0 = melhor, 1 = pior
    if (t < 0.34) return 'bg-emerald-500/20';
    if (t < 0.67) return 'bg-amber-500/20';
    return 'bg-red-500/20';
  };

  return (
    <div className={cn('rounded-2xl p-6', cardBase)}>
      <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1', txMuted)}>Idade × gênero</p>
      <p className={cn('text-xs mb-4', txMuted)}>CPL por faixa etária e gênero. Verde = CPL menor no período. Vazio = sem dado.</p>
      {data.ages.length === 0 ? (
        <p className={cn('text-xs', txMuted)}>Sem quebra por idade no período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className={cn('text-left py-2 pr-3 font-black', txMuted)}>Faixa</th>
                {data.genders.map(g => (
                  <th key={g} className={cn('text-center py-2 px-3 font-black', txMuted)}>{GENDER_LABEL[g] ?? g}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.ages.map(age => (
                <tr key={age}>
                  <td className={cn('py-2 pr-3 font-bold', tx)}>{age}</td>
                  {data.genders.map(g => {
                    const c = cellFor(age, g);
                    return (
                      <td key={g} className="py-1 px-1">
                        <div className={cn('rounded-lg px-3 py-2 text-center', shade(c?.cpl ?? null))}>
                          <p className={cn('font-black', tx)}>{c?.cpl !== null && c?.cpl !== undefined ? formatCurrency(c.cpl) : '—'}</p>
                          <p className={cn('text-[10px]', txMuted)}>
                            {c ? `${formatNumber(c.leads)} leads · ${formatCurrency(c.spend)}` : 'sem dado'}
                          </p>
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
    </div>
  );
}

// ── Região: barras horizontais por gasto, com CPL ─────────────────────────────
function RegionBars({ regions, isDark, cardBase, tx, txMuted }: { regions: Region[]; isDark: boolean; cardBase: string; tx: string; txMuted: string }) {
  const maxSpend = Math.max(1, ...regions.map(r => r.spend));
  return (
    <div className={cn('rounded-2xl p-6', cardBase)}>
      <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1', txMuted)}>Regiões de divulgação</p>
      <p className={cn('text-xs mb-4', txMuted)}>Top 15 por investimento, com CPL de cada região.</p>
      {regions.length === 0 ? (
        <p className={cn('text-xs', txMuted)}>Sem quebra por região no período.</p>
      ) : (
        <div className="space-y-3">
          {regions.map(r => (
            <div key={r.region}>
              <div className="flex justify-between text-xs mb-1">
                <span className={cn('font-bold truncate pr-2', tx)}>{r.region}</span>
                <span className={txMuted}>
                  {formatCurrency(r.spend)} · CPL {r.cpl !== null ? formatCurrency(r.cpl) : '—'}
                </span>
              </div>
              <div className={cn('h-2 rounded-full overflow-hidden', isDark ? 'bg-white/5' : 'bg-slate-100')}>
                <div className="h-full rounded-full bg-gold-premium" style={{ width: `${(r.spend / maxSpend) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Horário: 24 barras (leads por hora do dia) ────────────────────────────────
function HourBars({ hours, isDark, cardBase, tx, txMuted }: { hours: Hour[]; isDark: boolean; cardBase: string; tx: string; txMuted: string }) {
  const maxLeads = Math.max(1, ...hours.map(h => h.leads));
  const hasAny = hours.some(h => h.spend > 0);
  return (
    <div className={cn('rounded-2xl p-6', cardBase)}>
      <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1', txMuted)}>Horário de veiculação</p>
      <p className={cn('text-xs mb-4', txMuted)}>Leads por hora do dia (horário do anunciante).</p>
      {!hasAny ? (
        <p className={cn('text-xs', txMuted)}>Sem quebra por horário no período.</p>
      ) : (
        <>
          <div className="flex items-end gap-1 h-40">
            {hours.map(h => (
              <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full" title={`${h.hour}h · ${h.leads} leads · CPL ${h.cpl !== null ? formatCurrency(h.cpl) : '—'}`}>
                <div
                  className={cn('w-full rounded-t', h.leads > 0 ? 'bg-gold-premium' : (isDark ? 'bg-white/5' : 'bg-slate-100'))}
                  style={{ height: `${Math.max(3, (h.leads / maxLeads) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className={cn('flex justify-between text-[10px] mt-2', txMuted)}>
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
        </>
      )}
    </div>
  );
}
