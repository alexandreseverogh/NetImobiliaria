'use client';

import { useEffect, useState } from 'react';
import { cn, formatCurrency, networkLabel } from '@/lib/marketing-utils';

interface BudgetReallocationRow {
  id: string;
  sourceCampaignName: string;
  sourceNetwork: string;
  sourceCplBefore: number;
  targetCampaignName: string;
  targetNetwork: string;
  targetCplBefore: number;
  amountCents: number;
  gapPct: number;
  projectedLeadGain: number;
  confidence: number;
}

interface Props {
  isDark: boolean;
  clientId?: string | null;
  cardBase: string;
  tx: string;
  txMuted: string;
  txFaint: string;
}

/**
 * docs/PLANO_TIKTOK.md §8.6 — card "Oportunidade de Realocação" da Visão Executiva. Só aparece
 * quando há ≥1 proposta viva (PROPOSED) — e, por construção do motor (E4), uma proposta só
 * existe entre 2 redes diferentes com dado real, então "≥2 redes com dado" já vem de graça.
 * Nunca renderiza vazio/skeleton permanente — sem oportunidade, o card simplesmente não existe.
 */
export function ReallocationOpportunityWidget({ isDark, clientId, cardBase, tx, txMuted, txFaint }: Props) {
  const [live, setLive] = useState<BudgetReallocationRow[] | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (clientId) params.set('clientId', clientId);
    fetch(`/api/admin/campanhas/realocacoes?${params}`)
      .then(async r => (r.ok ? r.json() : null))
      .then(d => setLive(d?.live ?? []))
      .catch(() => setLive([]));
  }, [clientId]);

  if (!live || live.length === 0) return null;

  const borderCls = isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-200';
  const top = live[0];
  const rest = live.slice(1, 3);

  return (
    <div className={cn('p-6 rounded-3xl border', cardBase, borderCls)}>
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className={cn('text-base font-black', tx)}>💰 Oportunidade de Realocação</h3>
          <p className={cn('text-xs', txMuted)}>
            Mover verba entre redes com CPL bem diferente — motor de realocação cross-rede
          </p>
        </div>
        <a
          href="/admin/campanhas/aprovacoes"
          className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors shrink-0"
        >
          Ver na fila de aprovação →
        </a>
      </div>

      <div className={cn('p-4 rounded-2xl border mb-3', isDark ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100')}>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className={cn('font-bold', tx)}>{top.sourceCampaignName}</span>
          <span className={cn('text-[10px] font-black uppercase px-1.5 py-0.5 rounded', isDark ? 'bg-white/10' : 'bg-slate-200')}>{networkLabel(top.sourceNetwork)}</span>
          <span className={txFaint}>→</span>
          <span className={cn('font-bold', tx)}>{top.targetCampaignName}</span>
          <span className={cn('text-[10px] font-black uppercase px-1.5 py-0.5 rounded', isDark ? 'bg-white/10' : 'bg-slate-200')}>{networkLabel(top.targetNetwork)}</span>
        </div>
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <p className={cn('text-lg font-black', tx)}>{formatCurrency(top.amountCents / 100)}<span className={cn('text-xs font-bold', txMuted)}>/dia</span></p>
          <p className="text-xs font-bold text-emerald-500">+{top.projectedLeadGain.toFixed(2)} lead/dia projetado</p>
          <p className={cn('text-xs', txMuted)}>CPL {formatCurrency(top.sourceCplBefore)} → {formatCurrency(top.targetCplBefore)} ({top.gapPct.toFixed(0)}% de vantagem)</p>
        </div>
      </div>

      {rest.length > 0 && (
        <p className={cn('text-[11px]', txFaint)}>
          + {rest.length} outra{rest.length !== 1 ? 's' : ''} oportunidade{rest.length !== 1 ? 's' : ''} aguardando aprovação
        </p>
      )}
    </div>
  );
}
