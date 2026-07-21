'use client';

import { useEffect, useState } from 'react';
import { cn, formatCurrency } from '@/lib/marketing-utils';

interface CampaignRevenueRow {
  campaignId: string;
  campaignName: string;
  clientId: string | null;
  spend: number;
  leadsIdentified: number;
  dealsWon: number;
  revenue: number;
  cpaReal: number | null;
  roasReal: number | null;
}

interface RevenueAttributionResponse {
  available: boolean;
  reason?: string;
  message?: string;
  campaigns?: CampaignRevenueRow[];
  totals?: {
    spend: number;
    leadsIdentified: number;
    dealsWon: number;
    revenue: number;
    cpaReal: number | null;
    roasReal: number | null;
  };
  periodDays?: number;
}

interface Props {
  isDark: boolean;
  clientId?: string | null;
  periodDays: number;
  cardBase: string;
  tx: string;
  txMuted: string;
  txFaint: string;
}

/**
 * Visão 4 — Funil de Receita (docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §5/§6, F6).
 * CPA real (custo por negócio fechado) e ROAS real (receita/investimento), atribuídos de volta
 * à campanha — só disponível quando o tenant tem Campanhas + CRM (a API resolve isso sozinha e
 * devolve `available:false` com o motivo quando não tem CRM; nunca finge um dado que não existe).
 */
export function RevenueAttributionWidget({ isDark, clientId, periodDays, cardBase, tx, txMuted, txFaint }: Props) {
  const [data, setData] = useState<RevenueAttributionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (clientId) params.set('clientId', clientId);
    params.set('period', String(periodDays));

    setLoading(true);
    setError(null);
    fetch(`/api/admin/campanhas/dashboard/revenue-attribution?${params}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok || d.error) {
          setError(d.error ?? `HTTP ${r.status}`);
        } else {
          setData(d);
        }
      })
      .catch(e => setError(e.message ?? 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [clientId, periodDays]);

  const borderCls = isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-200';

  if (loading) {
    return (
      <div className={cn('p-6 rounded-3xl border animate-pulse', cardBase, borderCls)} style={{ minHeight: 220 }}>
        <div className={cn('h-4 w-48 rounded mb-4', isDark ? 'bg-white/10' : 'bg-slate-200')} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={cn('h-16 rounded-xl', isDark ? 'bg-white/5' : 'bg-slate-100')} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-6 rounded-3xl border', cardBase, borderCls)}>
        <h3 className={cn('text-base font-black mb-1', tx)}>Funil de Receita · Visão 4</h3>
        <p className="text-xs text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  // Degradação graciosa — sem CRM contratado, não existe como saber o que virou negócio fechado.
  if (!data.available) {
    return (
      <div className={cn('p-6 rounded-3xl border flex items-start gap-4', cardBase, borderCls)}>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg', isDark ? 'bg-white/5' : 'bg-slate-100')}>
          🔒
        </div>
        <div>
          <h3 className={cn('text-base font-black mb-1', tx)}>Funil de Receita · Visão 4</h3>
          <p className={cn('text-xs', txMuted)}>
            {data.message ?? 'Indisponível — módulo de CRM não contratado.'}
          </p>
        </div>
      </div>
    );
  }

  const totals = data.totals!;
  const campaigns = (data.campaigns ?? []).filter(c => c.spend > 0);
  const top = [...campaigns].sort((a, b) => (b.roasReal ?? -1) - (a.roasReal ?? -1)).slice(0, 5);

  return (
    <div className={cn('p-6 rounded-3xl border flex flex-col', cardBase, borderCls)}>
      <div className="mb-4">
        <h3 className={cn('text-base font-black', tx)}>Funil de Receita · Visão 4</h3>
        <p className={cn('text-xs', txMuted)}>
          CPA e ROAS reais — atribuídos ao negócio fechado, não ao clique. Cohort de leads gerados
          nos últimos {totals ? data.periodDays : periodDays} dias (o negócio pode ter fechado depois).
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className={cn('p-3 rounded-2xl', isDark ? 'bg-white/5' : 'bg-slate-50')}>
          <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1', txFaint)}>Receita Real</p>
          <p className={cn('text-lg font-black', totals.revenue > 0 ? 'text-emerald-500' : tx)}>
            {formatCurrency(totals.revenue)}
          </p>
        </div>
        <div className={cn('p-3 rounded-2xl', isDark ? 'bg-white/5' : 'bg-slate-50')}>
          <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1', txFaint)}>CPA Real</p>
          <p className={cn('text-lg font-black', tx)}>
            {totals.cpaReal != null ? formatCurrency(totals.cpaReal) : '—'}
          </p>
        </div>
        <div className={cn('p-3 rounded-2xl', isDark ? 'bg-white/5' : 'bg-slate-50')}>
          <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1', txFaint)}>ROAS Real</p>
          <p className={cn('text-lg font-black', (totals.roasReal ?? 0) >= 1 ? 'text-emerald-500' : tx)}>
            {totals.roasReal != null ? `${totals.roasReal.toFixed(2)}x` : '—'}
          </p>
        </div>
        <div className={cn('p-3 rounded-2xl', isDark ? 'bg-white/5' : 'bg-slate-50')}>
          <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1', txFaint)}>Negócios Fechados</p>
          <p className={cn('text-lg font-black', tx)}>{totals.dealsWon}</p>
        </div>
      </div>

      {/* Top campanhas por ROAS */}
      {top.length > 0 ? (
        <div className="space-y-2">
          {top.map(c => (
            <div key={c.campaignId} className={cn('flex items-center justify-between p-3 rounded-2xl border', isDark ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100')}>
              <div className="min-w-0">
                <p className={cn('text-sm font-bold truncate', tx)}>{c.campaignName}</p>
                <p className={cn('text-[10px] uppercase tracking-wider', txMuted)}>
                  {c.dealsWon} negócio{c.dealsWon !== 1 ? 's' : ''} · {formatCurrency(c.spend)} investidos
                </p>
              </div>
              <div className="text-right shrink-0 pl-3">
                <p className={cn('text-sm font-black', (c.roasReal ?? 0) >= 1 ? 'text-emerald-500' : (c.dealsWon > 0 ? 'text-amber-500' : txMuted))}>
                  {c.roasReal != null ? `${c.roasReal.toFixed(2)}x ROAS` : 'sem negócio ainda'}
                </p>
                {c.cpaReal != null && (
                  <p className={cn('text-[10px] mt-0.5', txMuted)}>CPA {formatCurrency(c.cpaReal)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center text-xs opacity-50">
          Nenhuma campanha com investimento no período.
        </div>
      )}
    </div>
  );
}
