import React, { useState } from 'react';
import { aggregateMetrics, campaignDailySeries } from '@/components/marketing/dashboard/consolidatedMetrics';
import { motion } from 'framer-motion';
import { SparklesIcon, HeartIcon, BoltIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, cn, networkLabel } from '@/lib/marketing-utils';
import { KpiCard, HookRateKpiCard } from '@/components/marketing/dashboard/KpiCard';
import { MultiMetricChart } from '@/components/marketing/charts/MultiMetricChart';
import { ClassicFunnelChart } from '@/components/marketing/charts/ClassicFunnelChart';
import { CampaignMapWidget } from '@/components/marketing/CampaignMapWidget';
import { RevenueAttributionWidget } from '@/components/marketing/dashboard/RevenueAttributionWidget';
import { ReallocationOpportunityWidget } from '@/components/marketing/dashboard/ReallocationOpportunityWidget';
import { ConsolidatedHeader } from '@/components/marketing/dashboard/ConsolidatedHeader';
import type { DashboardFullData, AiInsightData } from '@/lib/marketing-api';
import type { HookSaturationResult } from '@/lib/marketing/services/hookSaturationService';

interface CommandCenterViewProps {
  isDark: boolean;
  loading: boolean;
  data: DashboardFullData | null;
  aiInsights: AiInsightData[];
  hookSaturation: HookSaturationResult | null;
  cardBase: string;
  tx: string;
  txMuted: string;
  txFaint: string;
  cpl: number | null;
  hookRate: number | null;
  hookRateBenchmarks: any;
  chartData: any[];
  funnelData: any;
  periodLabel: string;
  periodDays: number;
  activeSegment?: string | null;
  clientFilter?: string | null;
  segmentPeriodStart?: string;
  segmentPeriodEnd?: string;
  network?: string | null;
}

// Peso de severidade por tipo de insight (mesma taxonomia de aiInsights.ts) — SCALE é sinal
// positivo (campanha saudável, pronta pra escalar), nunca penaliza.
const HEALTH_SEVERITY_WEIGHT: Record<string, number> = {
  PAUSE: 40,
  DOWNSCALE: 35,
  ALERT: 20,
  OPTIMIZE: 12,
  SCALE: 0,
};

/**
 * Índice de Saúde — derivado dos MESMOS Insights da IA já exibidos no card "Alertas
 * Acionáveis" (aiInsights.ts: getLeadEvents + benchmark real por segmento/rede, já cobre
 * "gasto sem nenhum lead" de forma absoluta, não só tendência). Antes este índice recalculava
 * sozinho uma tendência de CPL/lead em cima de Insight.conversions — campo que, pra campanhas
 * Meta, não reflete lead nenhum (o lead real vem de CtaSubmission/cta_engagement) — por isso
 * o score ficava preso perto de 100 mesmo com uma campanha sinalizada PAUSE (gasto sem
 * resultado) no card ao lado. Usado pelo consolidado e por campanha — a mesma regra nos dois
 * casos, pra um número nunca contradizer o outro (nem o card de Insights da IA).
 *
 * @param chartRows mesma série diária (spend/conversions) só pra decidir SE há dado real no
 *   escopo/período (hasScopeData) — não entra mais na nota em si.
 * @param insights Insights da IA já escopados pro mesmo filtro (consolidado: a lista inteira;
 *   por campanha: filtrada por campaignId).
 * @param totalCampaignsInScope total de campanhas no mesmo escopo (consolidado: todas as do
 *   filtro ativo; por campanha: 1) — a penalidade é a MÉDIA por campanha, não a soma bruta,
 *   pra 1-2 campanhas problemáticas num portfólio grande não derrubarem o índice inteiro.
 */
export function computeHealth(
  chartRows: any[],
  insights: AiInsightData[],
  totalCampaignsInScope: number,
): { healthScore: number; healthTone: 'good' | 'warning' | 'critical' | 'no_data'; healthReasons: string[]; hasScopeData: boolean } {
  const hasScopeData = (chartRows || []).some((x: any) => x.spend > 0 || x.conversions > 0);

  if (!hasScopeData) {
    return { healthScore: 0, healthTone: 'no_data', healthReasons: [], hasScopeData: false };
  }

  // Pior insight POR CAMPANHA (um OPTIMIZE e um PAUSE na mesma campanha são o mesmo problema
  // visto por dois ângulos — conta só o mais grave, nunca soma os dois).
  const worstByCampaign = new Map<string, { score: number; insight: AiInsightData }>();
  for (const insight of insights || []) {
    const weight = HEALTH_SEVERITY_WEIGHT[insight.type] ?? 0;
    const score = weight * insight.confidence;
    const current = worstByCampaign.get(insight.campaignId);
    if (!current || score > current.score) {
      worstByCampaign.set(insight.campaignId, { score, insight });
    }
  }

  const totalPenalty = Array.from(worstByCampaign.values()).reduce((sum, w) => sum + w.score, 0);
  const avgPenalty = totalPenalty / Math.max(1, totalCampaignsInScope);
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - avgPenalty)));

  let healthTone: 'good' | 'warning' | 'critical' | 'no_data' = 'good';
  if (healthScore < 70) healthTone = 'warning';
  if (healthScore < 45) healthTone = 'critical';

  const healthReasons = Array.from(worstByCampaign.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(w => w.insight.description);

  return { healthScore, healthTone, healthReasons, hasScopeData: true };
}

export function CommandCenterView({
  isDark,
  loading,
  data,
  aiInsights,
  hookSaturation,
  cardBase,
  tx,
  txMuted,
  txFaint,
  cpl,
  hookRate,
  hookRateBenchmarks,
  chartData,
  funnelData,
  periodLabel,
  periodDays,
  activeSegment,
  clientFilter,
  segmentPeriodStart,
  segmentPeriodEnd,
  network,
}: CommandCenterViewProps) {
  // Alterna entre métricas consolidadas (padrão) e os mesmos cards por campanha.
  // Precisa ficar ANTES do retorno antecipado de loading (regra dos hooks).
  const [expandedCampaigns, setExpandedCampaigns] = useState(false);
  // Expansão por campanha, por seção (cada uma abre sozinha).
  const [funnelExpanded, setFunnelExpanded] = useState(false);
  const [evolutionExpanded, setEvolutionExpanded] = useState(false);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={cn('rounded-2xl h-32', isDark ? 'bg-white/[0.03]' : 'bg-slate-100')} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const t = data.currentPeriod.totals;
  const d = data.deltas;
  const activeCampaigns = (data.campaigns || []).filter(c => c.status === 'ACTIVE').length;

  // CORREÇÃO — "Onde está o Dinheiro?" lia c.spend/c.leads direto do objeto Campaign, campos que
  // nunca existiram nesse model (spend/leads vivem em Insight/Lead, agregados à parte) — sempre
  // renderizava R$ 0,00 / 0 leads pra qualquer campanha, em qualquer filtro. Gasto real agregado
  // a partir de currentPeriod.insights (mesma fonte do gráfico "Evolução"); leads reais de
  // leadsByCampaign (Lead table, mesmo padrão já usado por leadsByNetwork).
  const spendByCampaign = (data.currentPeriod.insights || []).reduce((acc: Record<string, number>, ins: any) => {
    acc[ins.campaignId] = (acc[ins.campaignId] || 0) + (ins.spend || 0);
    return acc;
  }, {});
  const leadsByCampaign = data.leadsByCampaign || {};

  // Série diária de UMA campanha (mesma base do gráfico consolidado, filtrada pela campanha).
  const dailySeriesFor = (campaignId: string) =>
    campaignDailySeries(data.currentPeriod.insights || [], campaignId);

  // Health Score — Hook Rate (vídeo) + tendência REAL de CPL, calculada em cima da MESMA série
  // que o gráfico "Evolução das Campanhas" já mostra (chartData: spend + conversions por
  // dia) — antes usava a contagem de Lead da tabela separada, uma fonte DIFERENTE da que o
  // gráfico plota, o que já é uma inconsistência à parte.
  //
  // Dois sinais complementares, porque cada um pega um tipo de problema diferente:
  //   1. Tendência de METADE do período (mesmo padrão de calculateTrend() em aiInsights.ts) —
  //      pega uma piora sustentada ao longo do mês inteiro.
  //   2. Janela CURTA recente vs. a janela imediatamente anterior — pega uma virada abrupta
  //      nos últimos dias que uma média de metade do período dilui (poucos dias ruins não
  //      movem muito uma média de 15 dias).
  // Antes, a única regra era "d.leads < 0 ? -10 : nada" — um delta médio do período inteiro
  // que escondia justamente a virada nos últimos dias, que é o problema mais urgente.
  // Índice de Saúde — mesma regra para o consolidado e para cada campanha (ver computeHealth).
  const { healthScore, healthTone, healthReasons, hasScopeData } = computeHealth(chartData, aiInsights, (data.campaigns || []).length);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Top Level KPIs (Macro) ── */}
      {/* Cabeçalho de consolidação: só aparece com mais de uma campanha no escopo. */}
      {(() => {
        const campaignsList = data.campaigns || [];
        if (campaignsList.length <= 1) return null;
        return (
          <div className="flex items-center gap-4 -mb-2">
            <p className={cn('text-[11px] font-black uppercase tracking-widest', txMuted)}>
              {expandedCampaigns
                ? `Métricas por campanha (${campaignsList.length})`
                : `Métricas consolidadas de ${campaignsList.length} campanhas`}
            </p>
            <button
              type="button"
              onClick={() => setExpandedCampaigns(v => !v)}
              className={cn('text-[11px] font-black uppercase tracking-widest underline-offset-4 hover:underline', isDark ? 'text-gold-premium' : 'text-amber-700')}
            >
              {expandedCampaigns ? 'Recolher' : 'Expandir por campanha'}
            </button>
          </div>
        );
      })()}

      {expandedCampaigns && (data.campaigns || []).length > 1 ? (
        <div className="space-y-6">
          {(data.campaigns || []).map((c: any) => {
            const m = aggregateMetrics(data.currentPeriod.insights || [], data.leadsByCampaign || {}, new Set([c.id]), data.videoHookByCampaign);
            const h = computeHealth(dailySeriesFor(c.id), aiInsights.filter(i => i.campaignId === c.id), 1);
            return (
              <div key={c.id} className={cn('p-4 rounded-2xl border', cardBase, isDark ? 'border-white/10' : 'border-slate-200')}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className={cn('text-sm font-black truncate', tx)}>{c.name}</p>
                  <span className={cn('text-[11px] font-black uppercase tracking-wider shrink-0',
                    h.healthTone === 'good' ? 'text-emerald-500' : h.healthTone === 'warning' ? 'text-amber-500' : h.healthTone === 'critical' ? 'text-red-500' : txMuted)}>
                    {h.healthTone === 'no_data' ? 'Saúde: sem dados' : `Saúde ${h.healthScore}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 2xl:[grid-template-columns:repeat(15,minmax(0,1fr))] gap-2 2xl:gap-1.5">
                  {(() => {
                    const sig = data.metaSignalsByCampaign?.[c.id] ?? { linkClicks: 0, conversationsStarted: 0 };
                    const sigCpl = sig.conversationsStarted > 0 ? m.spend / sig.conversationsStarted : null;
                    return (
                      <>
                        <KpiCard isDark={isDark} label="Gasto" value={formatCurrencyCompact(m.spend)} fullValue={formatCurrency(m.spend)} color={isDark ? 'text-slate-100' : 'text-slate-900'} />
                        <KpiCard isDark={isDark} label="Leads" value={formatNumber(m.leads)} color={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                        <KpiCard isDark={isDark} label="CPL" value={m.cpl !== null ? formatCurrencyCompact(m.cpl) : '—'} fullValue={m.cpl !== null ? formatCurrency(m.cpl) : '—'} color={isDark ? 'text-teal-400' : 'text-teal-600'} />
                        <KpiCard isDark={isDark} label="Custo/conversa" value={sigCpl !== null ? formatCurrencyCompact(sigCpl) : '—'} fullValue={sigCpl !== null ? formatCurrency(sigCpl) : '—'} color={isDark ? 'text-teal-400' : 'text-teal-600'} tooltip="Custo por conversa WhatsApp: gasto ÷ conversas iniciadas (sinal reportado pela Meta). Não é o custo por lead do CRM." />
                        <KpiCard isDark={isDark} label="Impressões" value={formatNumber(m.impressions)} color={isDark ? 'text-blue-400' : 'text-blue-600'} />
                        <KpiCard isDark={isDark} label="Alcance" value={formatNumber(m.reach)} color={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
                        <KpiCard isDark={isDark} label="Cliques" value={formatNumber(m.clicks)} color={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                        <KpiCard isDark={isDark} label="CPC" value={formatCurrencyCompact(m.cpc)} fullValue={formatCurrency(m.cpc)} color={isDark ? 'text-orange-400' : 'text-orange-600'} />
                        <KpiCard isDark={isDark} label="CPM" value={formatCurrencyCompact(m.cpm)} fullValue={formatCurrency(m.cpm)} color={isDark ? 'text-violet-400' : 'text-violet-600'} />
                        <KpiCard isDark={isDark} label="Conversões" value={formatNumber(m.conversions)} color={isDark ? 'text-pink-400' : 'text-pink-600'} />
                        <KpiCard isDark={isDark} label="Cliques no link (Meta)" value={formatNumber(sig.linkClicks)} color={isDark ? 'text-emerald-400' : 'text-emerald-600'} tooltip="Cliques no link reportados pela Meta" />
                        <KpiCard isDark={isDark} label="Conversas iniciadas (Meta)" value={formatNumber(sig.conversationsStarted)} color={isDark ? 'text-sky-400' : 'text-sky-600'} tooltip="Conversas iniciadas no WhatsApp reportadas pela Meta" />
                        <KpiCard isDark={isDark} label="CTR" value={formatPercent(m.ctr)} color={isDark ? 'text-amber-400' : 'text-amber-600'} />
                        {m.hookRate !== null && (
                          <KpiCard isDark={isDark} label="Hook Rate" value={formatPercent(m.hookRate)} color={isDark ? 'text-amber-400' : 'text-amber-600'} />
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      <div className="grid grid-cols-2 md:grid-cols-4 2xl:[grid-template-columns:repeat(15,minmax(0,1fr))] gap-2 2xl:gap-1.5">
        <KpiCard isDark={isDark} label="Campanhas Ativas" value={String(activeCampaigns)} color={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
        <KpiCard isDark={isDark} label="Gasto Total" value={formatCurrencyCompact(t.spend)} fullValue={formatCurrency(t.spend)} delta={d?.spend} color={isDark ? 'text-slate-100' : 'text-slate-900'} invertDelta 
          breakdown={
            t.spendByNetwork && Object.keys(t.spendByNetwork).length > 1
              ? Object.entries(t.spendByNetwork).map(([net, val]) => ({ label: networkLabel(net), value: formatCurrencyCompact(val) }))
              : undefined
          }
        />
        <KpiCard isDark={isDark} label="Leads" value={formatNumber(data.currentPeriod.leadCount || 0)} delta={d?.leads} color={isDark ? 'text-indigo-400' : 'text-indigo-600'} 
          breakdown={
            data.leadsByNetwork && Object.keys(data.leadsByNetwork).length > 1
              ? Object.entries(data.leadsByNetwork).map(([net, val]) => ({ label: networkLabel(net), value: formatNumber(val) }))
              : undefined
          }
        />
        <KpiCard isDark={isDark} label="CPL Médio" value={cpl !== null ? formatCurrencyCompact(cpl) : '—'} fullValue={cpl !== null ? formatCurrency(cpl) : '—'} color={isDark ? 'text-teal-400' : 'text-teal-600'}
          breakdown={
            data.cplByNetwork && Object.keys(data.cplByNetwork).length > 1
              ? Object.entries(data.cplByNetwork).map(([net, v]) => ({
                  label: networkLabel(net),
                  value: v.cpl !== null ? formatCurrencyCompact(v.cpl) : '—',
                }))
              : undefined
          }
        />
        <KpiCard isDark={isDark} label="Custo/conversa" value={data.metaSignals?.cpl != null ? formatCurrencyCompact(data.metaSignals.cpl) : '—'} fullValue={data.metaSignals?.cpl != null ? formatCurrency(data.metaSignals.cpl) : '—'} color={isDark ? 'text-teal-400' : 'text-teal-600'} tooltip="Custo por conversa WhatsApp: gasto Meta ÷ conversas iniciadas no WhatsApp (sinal reportado pela própria Meta). Não é o custo por lead do CRM." />
        <KpiCard isDark={isDark} label="Impressões" value={formatNumber(t.impressions || 0)} delta={d?.impressions} color={isDark ? 'text-blue-400' : 'text-blue-600'} />
        <KpiCard isDark={isDark} label="Alcance" value={formatNumber(t.reach || 0)} delta={d?.reach} color={isDark ? 'text-cyan-400' : 'text-cyan-600'} />
        <KpiCard isDark={isDark} label="Cliques" value={formatNumber(t.clicks || 0)} delta={d?.clicks} color={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
        <KpiCard isDark={isDark} label="CPC" value={formatCurrencyCompact(t.cpc || 0)} fullValue={formatCurrency(t.cpc || 0)} delta={d?.cpc} color={isDark ? 'text-orange-400' : 'text-orange-600'} invertDelta />
        <KpiCard isDark={isDark} label="CPM" value={formatCurrencyCompact(t.cpm || 0)} fullValue={formatCurrency(t.cpm || 0)} delta={d?.cpm} color={isDark ? 'text-violet-400' : 'text-violet-600'} invertDelta />
        <KpiCard isDark={isDark} label="Conversões" value={formatNumber(t.conversions || 0)} delta={d?.conversions} color={isDark ? 'text-pink-400' : 'text-pink-600'} />
        <KpiCard isDark={isDark} label="Cliques no link (Meta)" value={formatNumber(data.metaSignals?.linkClicks || 0)} color={isDark ? 'text-emerald-400' : 'text-emerald-600'} tooltip="Cliques no link reportados pela Meta" />
        <KpiCard isDark={isDark} label="Conversas iniciadas (Meta)" value={formatNumber(data.metaSignals?.conversationsStarted || 0)} color={isDark ? 'text-sky-400' : 'text-sky-600'} tooltip="Conversas iniciadas no WhatsApp reportadas pela Meta (7 dias)" />
        <KpiCard isDark={isDark} label="CTR" value={formatPercent(t.ctr || 0)} delta={d?.ctr} color={isDark ? 'text-amber-400' : 'text-amber-600'} />
        {hookRate !== null && (
          <HookRateKpiCard isDark={isDark} value={hookRate} color={isDark ? 'text-amber-400' : 'text-amber-600'} benchmarks={hookRateBenchmarks} />
        )}
      </div>
      )}

      {/* ── LINHA 2: Tendência Geral + Health Score ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Graph */}
        <div className={cn('lg:col-span-2 p-6 rounded-3xl border flex flex-col', cardBase, isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-200')}>
          <div className="flex items-center justify-between mb-4">
             <div>
               <h3 className={cn('text-base font-black', tx)}>Evolução das Campanhas</h3>
               <p className={cn('text-xs', txMuted)}>{periodLabel}</p>
             </div>
          </div>
          <ConsolidatedHeader count={(data.campaigns || []).length} expanded={evolutionExpanded} onToggle={() => setEvolutionExpanded(v => !v)} isDark={isDark} txMuted={txMuted} label="Evolução consolidada" />
          {evolutionExpanded && (data.campaigns || []).length > 1 ? (
            <div className="space-y-6">
              {(data.campaigns || []).map((c: any) => (
                <div key={c.id}>
                  <p className={cn('text-sm font-black mb-2 truncate', tx)}>{c.name}</p>
                  <div className="h-[220px]">
                    <MultiMetricChart
                      data={dailySeriesFor(c.id)}
                      xKey="date"
                      height={220}
                      yLeftLabel="Gasto em R$"
                      yRightLabel="Leads"
                      metrics={[
                        { key: 'spend', label: 'Gasto', color: isDark ? '#6366f1' : '#4f46e5', type: 'area', yAxisId: 'left', formatter: (v: number) => formatCurrency(v) },
                        { key: 'conversions', label: 'Leads', color: isDark ? '#34d399' : '#10b981', type: 'line', yAxisId: 'right' },
                      ]}
                      isDark={isDark}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="flex-1 min-h-[250px]">
            <MultiMetricChart
              data={chartData}
              xKey="date"
              height={250}
              yLeftLabel="Gasto em R$"
              yRightLabel="Quantidade"
              metrics={[
                { key: 'spend', label: 'Gasto', color: isDark ? '#6366f1' : '#4f46e5', type: 'area', yAxisId: 'left', formatter: (v: number) => formatCurrency(v) },
                { key: 'conversions', label: 'Leads', color: isDark ? '#34d399' : '#10b981', type: 'line', yAxisId: 'right' },
                { key: 'metaLinkClicks', label: 'Cliques WhatsApp (Meta)', color: isDark ? '#22d3ee' : '#0891b2', type: 'line', yAxisId: 'right' },
                { key: 'metaConversationsStarted', label: 'Conversas iniciadas (Meta)', color: isDark ? '#f472b6' : '#db2777', type: 'line', yAxisId: 'right' }
              ]} 
              isDark={isDark} 
            />
          </div>
          )}
        </div>

        {/* Índice de Saúde */}
        <div className={cn('p-6 rounded-3xl border flex flex-col items-center justify-center text-center', cardBase,
          healthTone === 'good' ? (isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/50') :
          healthTone === 'warning' ? (isDark ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50/50') :
          healthTone === 'no_data' ? (isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-slate-50/50') :
          (isDark ? 'border-red-500/20 bg-red-500/5' : 'border-red-200 bg-red-50/50')
        )}>
          <div className="flex items-center gap-2 mb-2">
            <HeartIcon className={cn('w-5 h-5',
              healthTone === 'good' ? 'text-emerald-500' :
              healthTone === 'warning' ? 'text-amber-500' :
              healthTone === 'no_data' ? (isDark ? 'text-slate-500' : 'text-slate-400') : 'text-red-500'
            )} />
            <h3 className={cn('text-sm font-black uppercase tracking-widest', tx)}>Índice de Saúde</h3>
          </div>
          <div className="relative flex items-center justify-center mt-4 mb-2">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="56" fill="transparent" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} strokeWidth="12" />
              {healthTone !== 'no_data' && (
                <circle cx="64" cy="64" r="56" fill="transparent"
                  stroke={healthTone === 'good' ? '#10b981' : healthTone === 'warning' ? '#f59e0b' : '#ef4444'}
                  strokeWidth="12"
                  strokeDasharray={351.8}
                  strokeDashoffset={351.8 - (351.8 * healthScore) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out" />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-3xl font-black', healthTone === 'no_data' ? txFaint : tx)}>
                {healthTone === 'no_data' ? '—' : healthScore}
              </span>
            </div>
          </div>
          <p className={cn('text-xs mt-2 text-center px-2', txMuted)}>
            {healthTone === 'no_data'
              ? 'Sem dados suficientes no período ou filtro selecionado para avaliar a saúde.'
              : healthTone === 'good'
              ? 'Ecossistema saudável e performando bem.'
              : healthReasons.length > 0
              ? healthReasons.join(' · ')
              : healthTone === 'warning'
              ? 'Algumas métricas requerem sua atenção.'
              : 'Problemas críticos detectados no ecossistema.'}
          </p>
        </div>
      </div>

      {/* ── LINHA 3: Funil + Actionable Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Funil Executivo */}
        <div className={cn('p-6 rounded-3xl border flex flex-col', cardBase, isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-200')}>
           <div className="flex items-center justify-between mb-4">
             <div>
               <h3 className={cn('text-base font-black', tx)}>Funil de Conversão</h3>
               <p className={cn('text-xs', txMuted)}>Identificação rápida de gargalos</p>
             </div>
           </div>
           <div className="flex-1 mt-4">
             <ConsolidatedHeader count={(data.campaigns || []).length} expanded={funnelExpanded} onToggle={() => setFunnelExpanded(v => !v)} isDark={isDark} txMuted={txMuted} label="Funil consolidado" />
             {funnelExpanded && (data.campaigns || []).length > 1 ? (
               <div className="space-y-6">
                 {(data.campaigns || []).map((c: any) => {
                   const m = aggregateMetrics(data.currentPeriod.insights || [], data.leadsByCampaign || {}, new Set([c.id]), data.videoHookByCampaign);
                   return (
                     <div key={c.id}>
                       <p className={cn('text-sm font-black mb-2 truncate', tx)}>{c.name}</p>
                       <ClassicFunnelChart
                         funnelData={{
                           impressions: m.impressions, clicks: m.clicks, leads: m.leads, conversions: m.conversions,
                           dealsWon: data.dealsByCampaignId?.[c.id] ?? 0,
                           crmAvailable: data.crmAvailable ?? false,
                         }}
                         leadCount={m.leads}
                         isDark={isDark}
                       />
                     </div>
                   );
                 })}
               </div>
             ) : funnelData?.totals ? (
               <ClassicFunnelChart funnelData={funnelData.totals} leadCount={data.currentPeriod.leadCount || 0} isDark={isDark} />
             ) : (
               <div className="flex items-center justify-center h-full opacity-50 text-xs">Sem dados de funil no período.</div>
             )}
           </div>
        </div>

        {/* AI Actionable Alerts */}
        <div className={cn('p-6 rounded-3xl border flex flex-col', cardBase, isDark ? 'border-indigo-500/20' : 'border-slate-200')}>
          <div className="flex items-center gap-3 mb-6">
            <div className={cn('p-2 rounded-xl', isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600')}>
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className={cn('text-base font-black', tx)}>Alertas Acionáveis</h3>
              <p className={cn('text-xs', txMuted)}>Decisões estratégicas recomendadas pela IA</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {aiInsights.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                {hasScopeData ? (
                  <>
                    <CheckCircleIcon className="w-10 h-10 text-emerald-500 mb-2 opacity-50" />
                    <p className={cn('text-sm font-medium', tx)}>Tudo tranquilo por enquanto.</p>
                    <p className={cn('text-xs mt-1', txMuted)}>A IA não detectou gargalos urgentes nas últimas horas.</p>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className={cn('w-10 h-10 mb-2 opacity-40', txFaint)} />
                    <p className={cn('text-sm font-medium', tx)}>Sem dados no período ou filtro selecionado.</p>
                    <p className={cn('text-xs mt-1', txMuted)}>Ajuste o período ou a rede pra ver alertas reais.</p>
                  </>
                )}
              </div>
            ) : (
              aiInsights.map((insight, idx) => (
                <div key={idx} className={cn('p-4 rounded-2xl flex gap-4 items-start', 
                  isDark ? 'bg-white/5 border border-white/5' : 'bg-slate-50 border border-slate-100'
                )}>
                  <div className={cn('p-2 rounded-full shrink-0', 
                    insight.type === 'PAUSE' || insight.type === 'ALERT' ? 'bg-red-500/10 text-red-500' : 
                    insight.type === 'OPTIMIZE' ? 'bg-amber-500/10 text-amber-500' : 
                    'bg-indigo-500/10 text-indigo-500'
                  )}>
                    {insight.type === 'PAUSE' || insight.type === 'ALERT' ? <ExclamationTriangleIcon className="w-5 h-5" /> : <BoltIcon className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    {insight.campaignName && (
                      <p className={cn('text-[10px] font-black uppercase tracking-wider mb-0.5 truncate', txMuted)}>{insight.campaignName}</p>
                    )}
                    <h4 className={cn('text-sm font-bold mb-1', tx)}>{insight.title}</h4>
                    <p className={cn('text-xs leading-relaxed', txMuted)}>{insight.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── LINHA 4: Wow Factor (Top Campanhas + Mapa) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Top Campanhas por Investimento (Esquerda) */}
        <div 
          className={cn('p-6 rounded-3xl border flex flex-col', cardBase, isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-200')}
          style={{ minHeight: 600 }}
        >
          <div className="mb-4">
            <h3 className={cn('text-base font-black', tx)}>Onde está o Dinheiro?</h3>
            <p className={cn('text-xs', txMuted)}>Top 5 campanhas por investimento no período</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {[...(data.campaigns || [])]
              .sort((a, b) => (spendByCampaign[b.id] || 0) - (spendByCampaign[a.id] || 0))
              .slice(0, 5)
              .map((c: any, idx: number) => (
                <div key={c.id} className={cn('flex items-center justify-between p-3 rounded-2xl border', isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100')}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold', 
                      idx === 0 ? 'bg-amber-500/20 text-amber-500' :
                      idx === 1 ? 'bg-slate-400/20 text-slate-400' :
                      idx === 2 ? 'bg-amber-700/20 text-amber-700' :
                      'bg-slate-500/10 text-slate-500'
                    )}>
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-bold truncate', tx)}>{c.name}</p>
                      <p className={cn('text-[10px] uppercase tracking-wider', txMuted)}>{c.status}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn('text-sm font-black text-amber-500')}>{formatCurrency(spendByCampaign[c.id] || 0)}</p>
                    <p className={cn('text-[10px] mt-0.5', txMuted)}>{leadsByCampaign[c.id] || 0} leads</p>
                  </div>
                </div>
            ))}
            {(!data.campaigns || data.campaigns.length === 0) && (
              <div className="h-full flex items-center justify-center text-xs opacity-50">Nenhuma campanha no período.</div>
            )}
          </div>
        </div>

        {/* Mapa Neural (Direita) */}
        <div style={{ minHeight: 600 }} className="flex-1 flex">
          <CampaignMapWidget 
            isDark={isDark} 
            className="flex-1 h-full"
            clientId={clientFilter ?? null}
            segmentId={activeSegment ?? null}
            startDate={segmentPeriodStart}
            endDate={segmentPeriodEnd}
          />
        </div>

      </div>

      {/* ── LINHA 5: Visão 4 — Funil de Receita (CPA/ROAS real, exige CRM) ── */}
      <RevenueAttributionWidget
        isDark={isDark}
        clientId={clientFilter ?? null}
        periodDays={periodDays}
        network={network ?? null}
        cardBase={cardBase}
        tx={tx}
        txMuted={txMuted}
        txFaint={txFaint}
      />

      {/* ── LINHA 6: Oportunidade de Realocação cross-rede (T4, docs/PLANO_TIKTOK.md §8.6) ── */}
      <ReallocationOpportunityWidget
        isDark={isDark}
        clientId={clientFilter ?? null}
        cardBase={cardBase}
        tx={tx}
        txMuted={txMuted}
        txFaint={txFaint}
      />

    </div>
  );
}
