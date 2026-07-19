import React from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon, HeartIcon, BoltIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, cn } from '@/lib/marketing-utils';
import { KpiCard, HookRateKpiCard } from '@/components/marketing/dashboard/KpiCard';
import { MultiMetricChart } from '@/components/marketing/charts/MultiMetricChart';
import { ClassicFunnelChart } from '@/components/marketing/charts/ClassicFunnelChart';
import { CampaignMapWidget } from '@/components/marketing/CampaignMapWidget';
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
  cpl: number;
  hookRate: number | null;
  hookRateBenchmarks: any;
  chartData: any[];
  funnelData: any;
  periodLabel: string;
  activeSegment?: string | null;
  clientFilter?: string | null;
  segmentPeriodStart?: string;
  segmentPeriodEnd?: string;
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
  activeSegment,
  clientFilter,
  segmentPeriodStart,
  segmentPeriodEnd,
}: CommandCenterViewProps) {
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

  // Calculando o Health Score (Mockado simples por enquanto, baseado no Hook Rate e CPL delta)
  let healthScore = 85;
  let healthTone = 'good'; // 'good', 'warning', 'critical'
  if (hookRate && hookRate < hookRateBenchmarks.hook_rate_min) healthScore -= 15;
  if (d?.leads && d.leads < 0) healthScore -= 10;
  if (healthScore < 70) healthTone = 'warning';
  if (healthScore < 50) healthTone = 'critical';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Top Level KPIs (Macro) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <KpiCard isDark={isDark} label="Campanhas Ativas" value={String(activeCampaigns)} color={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
        <KpiCard isDark={isDark} label="Gasto Total" value={formatCurrencyCompact(t.spend)} fullValue={formatCurrency(t.spend)} delta={d?.spend} color={isDark ? 'text-slate-100' : 'text-slate-900'} invertDelta 
          breakdown={
            t.spendByNetwork && Object.keys(t.spendByNetwork).length > 1
              ? Object.entries(t.spendByNetwork).map(([net, val]) => ({ label: net === 'meta' ? 'Meta Ads' : 'Google Ads', value: formatCurrencyCompact(val) }))
              : undefined
          }
        />
        <KpiCard isDark={isDark} label="Leads" value={formatNumber(data.currentPeriod.leadCount || 0)} delta={d?.leads} color={isDark ? 'text-indigo-400' : 'text-indigo-600'} 
          breakdown={
            data.leadsByNetwork && Object.keys(data.leadsByNetwork).length > 1
              ? Object.entries(data.leadsByNetwork).map(([net, val]) => ({ label: net === 'meta' ? 'Meta Ads' : 'Google Ads', value: formatNumber(val) }))
              : undefined
          }
        />
        <KpiCard isDark={isDark} label="CPL Médio" value={formatCurrencyCompact(cpl)} fullValue={formatCurrency(cpl)} color={isDark ? 'text-teal-400' : 'text-teal-600'}
          breakdown={
            data.cplByNetwork && Object.keys(data.cplByNetwork).length > 1
              ? Object.entries(data.cplByNetwork).map(([net, v]) => ({
                  label: net === 'meta' ? 'Meta Ads' : 'Google Ads',
                  value: v.cpl !== null ? formatCurrencyCompact(v.cpl) : '—',
                }))
              : undefined
          }
        />
        {hookRate !== null ? (
          <HookRateKpiCard isDark={isDark} value={hookRate} color={isDark ? 'text-amber-400' : 'text-amber-600'} benchmarks={hookRateBenchmarks} />
        ) : (
          <KpiCard isDark={isDark} label="CTR" value={formatPercent(t.ctr || 0)} delta={d?.ctr} color={isDark ? 'text-amber-400' : 'text-amber-600'} />
        )}
      </div>

      {/* ── LINHA 2: Tendência Geral + Health Score ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Graph */}
        <div className={cn('lg:col-span-2 p-6 rounded-3xl border flex flex-col', cardBase, isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-200')}>
          <div className="flex items-center justify-between mb-4">
             <div>
               <h3 className={cn('text-base font-black', tx)}>Evolução (Gasto vs Leads)</h3>
               <p className={cn('text-xs', txMuted)}>{periodLabel}</p>
             </div>
          </div>
          <div className="flex-1 min-h-[250px]">
            <MultiMetricChart 
              data={chartData} 
              xKey="date"
              height={250}
              metrics={[
                { key: 'spend', label: 'Gasto', color: isDark ? '#6366f1' : '#4f46e5', type: 'area', yAxisId: 'left', formatter: (v: number) => formatCurrency(v) },
                { key: 'conversions', label: 'Leads', color: isDark ? '#34d399' : '#10b981', type: 'line', yAxisId: 'right' }
              ]} 
              isDark={isDark} 
            />
          </div>
        </div>

        {/* Unified Health Score */}
        <div className={cn('p-6 rounded-3xl border flex flex-col items-center justify-center text-center', cardBase, 
          healthTone === 'good' ? (isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/50') :
          healthTone === 'warning' ? (isDark ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50/50') :
          (isDark ? 'border-red-500/20 bg-red-500/5' : 'border-red-200 bg-red-50/50')
        )}>
          <div className="flex items-center gap-2 mb-2">
            <HeartIcon className={cn('w-5 h-5', 
              healthTone === 'good' ? 'text-emerald-500' :
              healthTone === 'warning' ? 'text-amber-500' : 'text-red-500'
            )} />
            <h3 className={cn('text-sm font-black uppercase tracking-widest', tx)}>Health Score</h3>
          </div>
          <div className="relative flex items-center justify-center mt-4 mb-2">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle cx="64" cy="64" r="56" fill="transparent" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} strokeWidth="12" />
              <circle cx="64" cy="64" r="56" fill="transparent" 
                stroke={healthTone === 'good' ? '#10b981' : healthTone === 'warning' ? '#f59e0b' : '#ef4444'} 
                strokeWidth="12" 
                strokeDasharray={351.8} 
                strokeDashoffset={351.8 - (351.8 * healthScore) / 100} 
                strokeLinecap="round" 
                className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-3xl font-black', tx)}>{healthScore}</span>
            </div>
          </div>
          <p className={cn('text-xs mt-2', txMuted)}>
            {healthTone === 'good' ? 'Ecossistema saudável e performando bem.' : 
             healthTone === 'warning' ? 'Algumas métricas requerem sua atenção.' : 
             'Problemas críticos detectados no ecossistema.'}
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
             {funnelData ? (
               <ClassicFunnelChart funnelData={funnelData} leadCount={data.currentPeriod.leadCount || 0} isDark={isDark} />
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
              <h3 className={cn('text-base font-black', tx)}>Actionable Alerts</h3>
              <p className={cn('text-xs', txMuted)}>Decisões estratégicas recomendadas pela IA</p>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            {aiInsights.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <CheckCircleIcon className="w-10 h-10 text-emerald-500 mb-2 opacity-50" />
                <p className={cn('text-sm font-medium', tx)}>Tudo tranquilo por enquanto.</p>
                <p className={cn('text-xs mt-1', txMuted)}>A IA não detectou gargalos urgentes nas últimas horas.</p>
              </div>
            ) : (
              aiInsights.slice(0, 3).map((insight, idx) => (
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
                  <div>
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
              .sort((a, b) => ((b as any).spend || 0) - ((a as any).spend || 0))
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
                    <p className={cn('text-sm font-black text-amber-500')}>{formatCurrency(c.spend || 0)}</p>
                    <p className={cn('text-[10px] mt-0.5', txMuted)}>{c.leads || 0} leads</p>
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

    </div>
  );
}
