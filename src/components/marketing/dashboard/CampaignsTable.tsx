import React from 'react';
import { cn, formatCurrency } from '@/lib/marketing-utils';
import { PeriodBadge } from '@/components/marketing/dashboard/PeriodBadge';
import { CampaignLifecycleBadge } from '@/components/marketing/CampaignLifecycleBadge';
import type { LifecycleStatus } from '@/lib/marketing/services/campaignLifecycleTypes';

interface CampaignsTableProps {
  campaigns: any[];
  isDark: boolean;
  cardBase: string;
  tx: string;
  txMuted: string;
  txFaint: string;
  divider: string;
  periodBadgeLabel: string;
  onLifecycleTransition: (campaignId: string, toStatus: LifecycleStatus) => Promise<void>;
}

export function CampaignsTable({
  campaigns,
  isDark,
  cardBase,
  tx,
  txMuted,
  txFaint,
  divider,
  periodBadgeLabel,
  onLifecycleTransition,
}: CampaignsTableProps) {
  return (
    <div className={`rounded-2xl overflow-hidden ${cardBase}`}>
      <div className={`px-6 py-4 border-b ${divider} flex items-center justify-between`}>
        <h3 className={`text-sm font-black ${tx}`}>Campanhas</h3>
        <PeriodBadge label={periodBadgeLabel} isDark={isDark} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={isDark ? 'bg-[rgba(255,255,255,0.025)]' : 'bg-slate-50'}>
              {['Nome', 'Status', 'Ciclo de Vida', 'Objetivo', 'Budget/dia', 'Criado em'].map((h, idx) => (
                <th key={h} className={cn(
                  `px-6 py-3 text-[10px] font-black uppercase tracking-widest ${txFaint}`,
                  idx >= 4 ? 'text-right' : 'text-left'
                )}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className={`divide-y ${divider}`}>
            {campaigns.map(c => (
              <tr key={c.id} className={cn('transition-colors',
                isDark ? 'hover:bg-[rgba(255,255,255,0.025)]' : 'hover:bg-slate-50')}>
                <td className={`px-6 py-4 text-sm font-medium ${tx}`}>{c.name}</td>
                <td className="px-6 py-4">
                  <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide',
                    c.status === 'ACTIVE' && (isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'),
                    c.status === 'PAUSED' && (isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'   : 'bg-amber-50 text-amber-700 border border-amber-100'),
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500')} />
                    {c.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <CampaignLifecycleBadge
                    campaignId={c.id}
                    status={(c.lifecycleStatus || 'DRAFT') as LifecycleStatus}
                    changedAt={c.lifecycleChangedAt ?? undefined}
                    onTransition={toStatus => onLifecycleTransition(c.id, toStatus)}
                  />
                </td>
                <td className={`px-6 py-4 text-sm ${txMuted}`}>{c.objective.replace('OUTCOME_', '')}</td>
                <td className={`px-6 py-4 text-sm font-mono text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {c.adSets?.[0] ? formatCurrency(c.adSets[0].dailyBudget / 100) : '—'}
                </td>
                <td className={`px-6 py-4 text-xs text-right ${txFaint}`}>
                  {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr>
                <td colSpan={6} className={`px-6 py-12 text-center text-sm ${txMuted}`}>
                  Nenhuma campanha criada ainda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
