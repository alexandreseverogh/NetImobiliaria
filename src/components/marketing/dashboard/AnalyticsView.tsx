import React, { useState } from 'react';
import { ConsolidatedHeader } from '@/components/marketing/dashboard/ConsolidatedHeader';
import { campaignCplSeries, aggregateDailySeries, aggregateMetrics } from '@/components/marketing/dashboard/consolidatedMetrics';
import { motion } from 'framer-motion';
import { MultiMetricChart } from '@/components/marketing/charts/MultiMetricChart';
import { CplTimelineChart } from '@/components/marketing/charts/CplTimelineChart';
import { StageFunnelWidget, StageCard } from '@/components/marketing/StageFunnelWidget';
import { FunnelChart } from '@/components/marketing/charts/FunnelChart';
import { PeriodBadge } from './PeriodBadge';
import { KpiCard, HookRateKpiCard } from '@/components/marketing/dashboard/KpiCard';
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, cn, utcDateLabel } from '@/lib/marketing-utils';

import type { DashboardFullData, FunnelData7, FunnelStage } from '@/lib/marketing-api';

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
  campaigns,
  tooltipCss,
  cpl,
  hookRate,
  hookRateColor,
  hookRateBenchmarks,
  clientFilter,
  loading,
}: AnalyticsViewProps) {
  const [cplExpanded, setCplExpanded]             = useState(false);
  const [volumeExpanded, setVolumeExpanded]       = useState(false);
  const [efficiencyExpanded, setEfficiencyExpanded] = useState(false);
  const [linkClicksExpanded, setLinkClicksExpanded] = useState(false);
  const [stageExpanded, setStageExpanded]         = useState(false);

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

  // Mesma disciplina do CPL Timeline: série diária agregada por data (nunca 1 ponto por
  // linha de Insight — Insight é 1 linha por campanha por dia) — consolidada quando
  // `campaignId` é omitido, de 1 campanha só quando informado.
  const toChartSeries = (campaignId?: string) =>
    aggregateDailySeries(data.currentPeriod.insights || [], campaignId).map(r => ({
      date: utcDateLabel(r.date),
      spend: r.spend, clicks: r.clicks, impressions: r.impressions, conversions: r.conversions,
      ctr: r.ctr, cpc: r.cpc,
      metaLinkClicks: r.metaLinkClicks, metaConversationsStarted: r.metaConversationsStarted,
    }));

  // Ícone/rótulo reais de cada estágio (vem do mesmo /dashboard/funnel que já alimenta o
  // StageFunnelWidget consolidado) — nunca um mapa hardcoded aqui, que poderia divergir do
  // que o Master curou pro segmento.
  const stageMetaByCode = new Map(
    (funnelData7?.stages ?? []).map(s => [s.code, { label: s.label, icon: s.icon }]),
  );

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
            <h3 className={cn('text-sm font-black mb-2', tx)}>Volume — Gasto × Cliques</h3>
            <ConsolidatedHeader count={campaigns.length} expanded={volumeExpanded} onToggle={() => setVolumeExpanded(v => !v)} isDark={isDark} txMuted={txMuted} label="Volume consolidado" />
            {volumeExpanded && campaigns.length > 1 ? (
              <div className="space-y-6">
                {campaigns.map((c: any) => (
                  <div key={c.id}>
                    <p className={cn('text-sm font-black mb-2 truncate', tx)}>{c.name}</p>
                    <MultiMetricChart isDark={isDark} data={toChartSeries(c.id)}
                      yLeftLabel="Gasto (R$)" yRightLabel="Cliques"
                      metrics={[
                        { key: 'spend',  label: 'Gasto (R$)', color: predColors[0], type: 'area' },
                        { key: 'clicks', label: 'Cliques',    color: predColors[1], type: 'line', yAxisId: 'right' },
                      ]} />
                  </div>
                ))}
              </div>
            ) : (
              <MultiMetricChart isDark={isDark} data={chartData}
                yLeftLabel="Gasto (R$)" yRightLabel="Cliques"
                metrics={[
                  { key: 'spend',  label: 'Gasto (R$)', color: predColors[0], type: 'area' },
                  { key: 'clicks', label: 'Cliques',    color: predColors[1], type: 'line', yAxisId: 'right' },
                ]} />
            )}
          </motion.div>

          {/* Eficiência */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className={cn('rounded-2xl p-6', cardBase)}>
            <h3 className={cn('text-sm font-black mb-2', tx)}>Eficiência — CTR % × CPC (R$)</h3>
            <ConsolidatedHeader count={campaigns.length} expanded={efficiencyExpanded} onToggle={() => setEfficiencyExpanded(v => !v)} isDark={isDark} txMuted={txMuted} label="Eficiência consolidada" />
            {efficiencyExpanded && campaigns.length > 1 ? (
              <div className="space-y-6">
                {campaigns.map((c: any) => (
                  <div key={c.id}>
                    <p className={cn('text-sm font-black mb-2 truncate', tx)}>{c.name}</p>
                    <MultiMetricChart isDark={isDark} data={toChartSeries(c.id)}
                      yLeftLabel="CTR %" yRightLabel="CPC (R$)"
                      metrics={[
                        { key: 'ctr', label: 'CTR %',    color: predColors[2], type: 'area' },
                        { key: 'cpc', label: 'CPC (R$)', color: predColors[3], type: 'line', yAxisId: 'right' },
                      ]} />
                  </div>
                ))}
              </div>
            ) : (
              <MultiMetricChart isDark={isDark} data={chartData}
                yLeftLabel="CTR %" yRightLabel="CPC (R$)"
                metrics={[
                  { key: 'ctr', label: 'CTR %',    color: predColors[2], type: 'area' },
                  { key: 'cpc', label: 'CPC (R$)', color: predColors[3], type: 'line', yAxisId: 'right' },
                ]} />
            )}
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

          {/* Cliques no Link (Meta) × Conversas Iniciadas (Meta) — substitui "Distribuição por
              Campanha" (já exibida em Visão Executiva, FASE do pedido do usuário); os 2 sinais
              de engajamento reais do Meta, já persistidos em Insight desde a FASE anterior. */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={cn('rounded-2xl p-6', cardBase)}>
            <h3 className={cn('text-sm font-black mb-2', tx)}>Cliques no Link (Meta) × Conversas Iniciadas (Meta)</h3>
            <ConsolidatedHeader count={campaigns.length} expanded={linkClicksExpanded} onToggle={() => setLinkClicksExpanded(v => !v)} isDark={isDark} txMuted={txMuted} label="Engajamento consolidado" />
            {linkClicksExpanded && campaigns.length > 1 ? (
              <div className="space-y-6">
                {campaigns.map((c: any) => (
                  <div key={c.id}>
                    <p className={cn('text-sm font-black mb-2 truncate', tx)}>{c.name}</p>
                    <MultiMetricChart isDark={isDark} data={toChartSeries(c.id)}
                      yLeftLabel="Quantidade"
                      metrics={[
                        { key: 'metaLinkClicks',           label: 'Cliques no Link (Meta)',        color: isDark ? '#22d3ee' : '#0891b2', type: 'area' },
                        { key: 'metaConversationsStarted',  label: 'Conversas Iniciadas (Meta)',    color: isDark ? '#f472b6' : '#db2777', type: 'line' },
                      ]} />
                  </div>
                ))}
              </div>
            ) : (
              <MultiMetricChart isDark={isDark} data={chartData}
                yLeftLabel="Quantidade"
                metrics={[
                  { key: 'metaLinkClicks',          label: 'Cliques no Link (Meta)',       color: isDark ? '#22d3ee' : '#0891b2', type: 'area' },
                  { key: 'metaConversationsStarted', label: 'Conversas Iniciadas (Meta)',   color: isDark ? '#f472b6' : '#db2777', type: 'line' },
                ]} />
            )}
          </motion.div>
        </div>

        {/* ── Funil por Estágio ── (Funil do Ciclo de Conversão em Vendas suprimido aqui —
            já exibido em Visão Executiva, com seu próprio expand/collapse; sem ele, "Funil por
            Estágio" passa a ocupar a largura inteira, sem deixar buraco de layout.) */}
        <div className="mt-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className={cn('rounded-2xl p-6', cardBase)}>
            <h3 className={cn('text-sm font-black mb-2', tx)}>Funil por Estágio</h3>
            <ConsolidatedHeader count={campaigns.length} expanded={stageExpanded} onToggle={() => setStageExpanded(v => !v)} isDark={isDark} txMuted={txMuted} label="Funil consolidado" />
            {stageExpanded && campaigns.length > 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {campaigns.map((c: any) => {
                  const stageCode = c.funnelStage ?? 'TOF';
                  const meta = stageMetaByCode.get(stageCode) ?? { label: stageCode, icon: '📊' };
                  const m = aggregateMetrics(data.currentPeriod.insights || [], data.leadsByCampaign ?? {}, new Set([c.id]));
                  const stage: FunnelStage = {
                    code: stageCode,
                    label: meta.label,
                    icon: meta.icon,
                    campaigns_count: 1,
                    spend: m.spend,
                    impressions: m.impressions,
                    clicks: m.clicks,
                    leads: m.leads,
                    conversions: m.conversions,
                  };
                  return (
                    <div key={c.id} className="min-w-0">
                      <p className={cn('text-[11px] font-black mb-1.5 truncate', tx)}>{c.name}</p>
                      <StageCard stage={stage} isBottleneck={false} isDark={isDark} />
                    </div>
                  );
                })}
              </div>
            ) : funnelData7 ? (
              <StageFunnelWidget
                data={funnelData7}
                isDark={isDark}
                clientId={(clientFilter && clientFilter !== 'own') ? clientFilter as any : undefined}
              />
            ) : (
              <FunnelChart data={data.funnelData} isDark={isDark} />
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
