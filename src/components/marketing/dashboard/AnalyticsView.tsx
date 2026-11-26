import React, { useState } from 'react';
import { ConsolidatedHeader } from '@/components/marketing/dashboard/ConsolidatedHeader';
import { campaignCplSeries } from '@/components/marketing/dashboard/consolidatedMetrics';
import { motion } from 'framer-motion';
import { MultiMetricChart } from '@/components/marketing/charts/MultiMetricChart';
import { CplTimelineChart } from '@/components/marketing/charts/CplTimelineChart';
import { ClassicFunnelChart } from '@/components/marketing/charts/ClassicFunnelChart';
import { StageFunnelWidget } from '@/components/marketing/StageFunnelWidget';
import { FunnelChart } from '@/components/marketing/charts/FunnelChart';
import { PeriodBadge } from './PeriodBadge';
import { KpiCard, HookRateKpiCard } from '@/components/marketing/dashboard/KpiCard';
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, cn } from '@/lib/marketing-utils';
import { CampaignSpendPieChart } from '@/components/marketing/charts/CampaignSpendPieChart';

import type { DashboardFullData, FunnelData7 } from '@/lib/marketing-api';

interface AnalyticsViewProps {
  isDark: boolean;
  data: DashboardFullData | null;
  funnelData7: FunnelData7 | null;
  cardBase: string;
  tx: string;
  txMuted: string;
  txFaint: string;
  periodLabel: string;
  periodBadgeLabel: string;
  predColors: string[];
  chartData: any[]; 
  cplData: any[];
  campaignSpendData: any[];
  campaigns: any[];
  tooltipCss: any;
  cpl: number | null;
  hookRate: number | null;
  hookRateColor: string;
  hookRateBenchmarks: any;
  clientFilter?: string;
  loading: boolean;
}

export function AnalyticsView({
  isDark,
  data,
  funnelData7,
  cardBase,
  tx,
  txMuted,
  txFaint,
  periodLabel,
  periodBadgeLabel,
  predColors,
  chartData,
  cplData,
  campaignSpendData,
  campaigns,
  tooltipCss,
  cpl,
  hookRate,
  hookRateColor,
  hookRateBenchmarks,
  clientFilter,
  loading,
}: AnalyticsViewProps) {
  const [cplExpanded, setCplExpanded] = useState(false);
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={cn('rounded-2xl border h-80',
            isDark ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)]' : 'bg-white border-slate-100')} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const t = data.currentPeriod.totals;
  const d = data.deltas;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      

      {/* ── Retrovisor (Performance Histórica) ── */}
      <div className={cn(
        'rounded-3xl p-6 border',
        isDark
          ? 'border-[rgba(251,191,36,0.13)] shadow-[0_0_60px_rgba(251,191,36,0.03),inset_0_1px_0_rgba(251,191,36,0.06)] bg-[rgba(13,11,8,0.55)] backdrop-blur-sm'
          : 'border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-white shadow-[0_4px_24px_rgba(245,158,11,0.05)]'
      )}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-3xl opacity-90">📊</div>
            <div>
              <p className={cn('text-[9px] font-black uppercase tracking-[0.35em] mb-0.5', isDark ? 'text-amber-700' : 'text-amber-500')}>
                Retrovisor
              </p>
              <h2 className={cn('text-base font-black leading-tight', isDark ? 'text-slate-300' : 'text-slate-800')}>
                Performance Histórica
              </h2>
              <p className={cn('text-[11px] mt-0.5', isDark ? 'text-slate-600' : 'text-slate-400')}>
                Dados reais do período selecionado
              </p>
            </div>
          </div>
          <PeriodBadge label={periodBadgeLabel} isDark={isDark} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Volume */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={cn('rounded-2xl p-6', cardBase)}>
            <MultiMetricChart isDark={isDark} data={chartData} title="Volume — Gasto × Cliques"
              yLeftLabel="Gasto (R$)" yRightLabel="Cliques"
              metrics={[
                { key: 'spend',  label: 'Gasto (R$)', color: predColors[0], type: 'area' },
                { key: 'clicks', label: 'Cliques',    color: predColors[1], type: 'line', yAxisId: 'right' },
              ]} />
          </motion.div>
          
          {/* Eficiência */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className={cn('rounded-2xl p-6', cardBase)}>
            <MultiMetricChart isDark={isDark} data={chartData} title="Eficiência — CTR % × CPC (R$)"
              yLeftLabel="CTR %" yRightLabel="CPC (R$)"
              metrics={[
                { key: 'ctr', label: 'CTR %',    color: predColors[2], type: 'area' },
                { key: 'cpc', label: 'CPC (R$)', color: predColors[3], type: 'line', yAxisId: 'right' },
              ]} />
          </motion.div>

          {/* CPL Timeline */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cn('rounded-2xl p-6', cardBase)}>
            <h3 className={cn('text-sm font-black mb-2', tx)}>CPL Timeline</h3>
            <ConsolidatedHeader count={campaigns.length} expanded={cplExpanded} onToggle={() => setCplExpanded(v => !v)} isDark={isDark} txMuted={txMuted} label="CPL consolidado" />
            {cplExpanded && campaigns.length > 1 ? (
              <div className="space-y-6">
                {campaigns.map((c: any) => (
                  <div key={c.id}>
                    <p className={cn('text-sm font-black mb-2 truncate', tx)}>{c.name}</p>
                    <CplTimelineChart
                      data={campaignCplSeries(data?.currentPeriod.insights || [], data?.dailyLeadsByCampaign?.[c.id] || [], c.id)
                        .filter(p => p.cpl !== null)
                        .map(p => ({ date: p.date, spend: p.spend, leads: p.leads, cpl: p.cpl as number }))}
                      isDark={isDark}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <CplTimelineChart data={cplData} isDark={isDark} />
            )}
          </motion.div>

          {/* Distribuição por Campanha */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={cn('rounded-2xl p-6', cardBase)}>
            <h3 className={cn('text-sm font-black mb-4', tx)}>Distribuição por Campanha</h3>
            <CampaignSpendPieChart campaignSpendData={campaignSpendData} isDark={isDark} txMuted={txMuted} />
          </motion.div>
        </div>

        {/* ── Funil Clássico + Funil por Estágio ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5 items-start">
          {data.funnelData && (
            <ClassicFunnelChart
              funnelData={data.funnelData}
              leadCount={data.currentPeriod.leadCount}
              isDark={isDark}
              periodLabel={periodBadgeLabel}
              className="mt-0"
            />
          )}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className={cn('rounded-2xl p-6', cardBase)}>
            <h3 className={cn('text-sm font-black mb-4', tx)}>Funil por Estágio</h3>
            {funnelData7 ? (
              <StageFunnelWidget
                data={funnelData7}
                isDark={isDark}
                clientId={(clientFilter && clientFilter !== 'own') ? clientFilter as any : undefined}
              />
            ) : (
              <FunnelChart data={data.funnelData} isDark={isDark} />
            )}
            {/* Campanhas em cada estágio (TOF/MOF/BOF) — o total fica no gráfico acima. */}
            <div className="mt-5 space-y-3">
              {(['TOF', 'MOF', 'BOF'] as const).map(stage => {
                const list = campaigns.filter((c: any) => (c.funnelStage ?? 'TOF') === stage);
                return (
                  <div key={stage}>
                    <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1', txMuted)}>
                      {stage} · {list.length} campanha{list.length === 1 ? '' : 's'}
                    </p>
                    {list.length === 0 ? (
                      <p className={cn('text-[11px]', txFaint)}>Nenhuma campanha neste estágio.</p>
                    ) : (
                      <ul className="space-y-1">
                        {list.map((c: any) => (
                          <li key={c.id} className={cn('text-[11px] truncate', tx)}>{c.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
