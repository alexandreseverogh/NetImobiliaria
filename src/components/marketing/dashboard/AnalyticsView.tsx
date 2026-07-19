import React from 'react';
import { motion } from 'framer-motion';
import { MultiMetricChart } from '@/components/marketing/charts/MultiMetricChart';
import { CplTimelineChart } from '@/components/marketing/charts/CplTimelineChart';
import { ClassicFunnelChart } from '@/components/marketing/charts/ClassicFunnelChart';
import { StageFunnelWidget } from '@/components/marketing/StageFunnelWidget';
import { FunnelChart } from '@/components/marketing/charts/FunnelChart';
import { PeriodBadge } from './PeriodBadge';
import { KpiCard, HookRateKpiCard } from '@/components/marketing/dashboard/KpiCard';
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, cn } from '@/lib/marketing-utils';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

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
  cpl: number;
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
      
      {/* ── KPI Grid ── */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 ${hookRate !== null ? 'xl:[grid-template-columns:repeat(13,minmax(0,1fr))] xl:gap-1.5' : 'xl:grid-cols-12 xl:gap-2'}`}>
        <KpiCard isDark={isDark} label="Campanhas Ativas" value={String(campaigns.filter(c => c.status === 'ACTIVE').length)} color={isDark ? 'text-emerald-400' : 'text-emerald-600'} tooltip={`${campaigns.length} campanha${campaigns.length !== 1 ? 's' : ''} no total`} />
        <KpiCard isDark={isDark} label="Gasto"      value={formatCurrencyCompact(t?.spend || 0)}             fullValue={formatCurrency(t?.spend || 0)}                    delta={d?.spend}       color={isDark ? 'text-red-400'     : 'text-red-600'}     invertDelta />
        <KpiCard isDark={isDark} label="Impressões" value={formatNumber(t?.impressions || 0)}                 delta={d?.impressions} color={isDark ? 'text-blue-400'    : 'text-blue-600'} />
        <KpiCard isDark={isDark} label="Alcance"    value={formatNumber(t?.reach || 0)}                       delta={d?.reach}       color={isDark ? 'text-cyan-400'    : 'text-cyan-600'} />
        <KpiCard isDark={isDark} label="Cliques"    value={formatNumber(t?.clicks || 0)}                      delta={d?.clicks}      color={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
        <KpiCard isDark={isDark} label="CTR"        value={formatPercent(t?.ctr || 0)}                        delta={d?.ctr}         color={isDark ? 'text-amber-400'   : 'text-amber-600'} />
        <KpiCard isDark={isDark} label="CPC"        value={formatCurrencyCompact(t?.cpc || 0)}                fullValue={formatCurrency(t?.cpc || 0)}                      delta={d?.cpc}         color={isDark ? 'text-orange-400'  : 'text-orange-600'} invertDelta />
        <KpiCard isDark={isDark} label="CPM"        value={formatCurrencyCompact(t?.cpm || 0)}                fullValue={formatCurrency(t?.cpm || 0)}                      delta={d?.cpm}         color={isDark ? 'text-violet-400'  : 'text-violet-600'} invertDelta />
        <KpiCard isDark={isDark} label="Conversões" value={formatNumber(t?.conversions || 0)}                 delta={d?.conversions} color={isDark ? 'text-pink-400'    : 'text-pink-600'} />
        <KpiCard isDark={isDark} label="Leads"      value={formatNumber(data?.currentPeriod.leadCount || 0)}  delta={d?.leads}       color={isDark ? 'text-indigo-400'  : 'text-indigo-600'} />
        <KpiCard isDark={isDark} label="CPL"        value={formatCurrencyCompact(cpl)}                        fullValue={formatCurrency(cpl)}                              color={isDark ? 'text-teal-400'    : 'text-teal-600'} />
        <KpiCard isDark={isDark} label="Budget/dia" value={formatCurrencyCompact(campaignSpendData.reduce((s, c) => s + c.value, 0))} fullValue={formatCurrency(campaignSpendData.reduce((s, c) => s + c.value, 0))} color={isDark ? 'text-slate-300' : 'text-slate-800'} />
        {hookRate !== null && (
          <HookRateKpiCard isDark={isDark} value={hookRate} color={hookRateColor} benchmarks={hookRateBenchmarks} />
        )}
      </div>

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
            <CplTimelineChart data={cplData} isDark={isDark} />
          </motion.div>

          {/* Distribuição por Campanha */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={cn('rounded-2xl p-6', cardBase)}>
            <h3 className={cn('text-sm font-black mb-4', tx)}>Distribuição por Campanha</h3>
            {campaignSpendData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={campaignSpendData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={90} innerRadius={38}
                      paddingAngle={3}
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }: any) => {
                        if (percent < 0.05) return null;
                        const RADIAN = Math.PI / 180;
                        const r = innerRadius + (outerRadius - innerRadius) * 0.55;
                        const x = cx + r * Math.cos(-midAngle * RADIAN);
                        const y = cy + r * Math.sin(-midAngle * RADIAN);
                        const formatted = value >= 1000
                          ? `R$${(value / 1000).toFixed(1)}k`
                          : `R$${value.toFixed(0)}`;
                        return (
                          <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
                            style={{ fontSize: 11, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                            {formatted}
                          </text>
                        );
                      }}>
                      {campaignSpendData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip {...tooltipCss} formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 mt-3 px-1">
                  {(() => {
                    const total = campaignSpendData.reduce((s, c) => s + c.value, 0);
                    return (
                      <>
                        {campaignSpendData.map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <span className={cn('text-[10px] flex-1 leading-tight', isDark ? 'text-slate-400' : 'text-slate-600')}>{d.name}</span>
                            <span className={cn('text-[10px] font-semibold shrink-0', isDark ? 'text-slate-400' : 'text-slate-500')}>
                              {total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%
                            </span>
                            <span className={cn('text-[10px] font-bold shrink-0 min-w-[64px] text-right', isDark ? 'text-slate-200' : 'text-slate-800')}>
                              R$ {d.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                        {campaignSpendData.length > 1 && (
                          <div className={cn('flex items-center gap-2 mt-1 pt-2 border-t', isDark ? 'border-white/8' : 'border-slate-100')}>
                            <span className="w-2.5 h-2.5 shrink-0" />
                            <span className={cn('text-[10px] flex-1 font-black uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-500')}>Total</span>
                            <span className={cn('text-[10px] font-black shrink-0', isDark ? 'text-slate-300' : 'text-slate-700')}>100%</span>
                            <span className={cn('text-[10px] font-black shrink-0 min-w-[64px] text-right', isDark ? 'text-white' : 'text-slate-900')}>
                              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            ) : (
              <p className={cn('text-sm text-center py-12', txMuted)}>Sem dados de campanhas</p>
            )}
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
          </motion.div>
        </div>
      </div>
    </div>
  );
}
