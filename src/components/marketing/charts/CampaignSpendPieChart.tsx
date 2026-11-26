import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { cn } from '@/lib/marketing-utils';

export interface CampaignSpendDatum {
  name: string;
  value: number;
  color: string;
  // Recharts (Pie.data) exige index signature de string — mesma folga que o `any[]` original
  // já dava implicitamente antes desta extração.
  [key: string]: any;
}

/**
 * Pizza de "Distribuição por Campanha" (gasto real agregado por campanha no período) — extraída
 * de AnalyticsView.tsx (aba "Análise de Dados") pra ser reaproveitada também na Visão Executiva
 * (card "Onde está o Dinheiro?"), sem duplicar os ~70 linhas de JSX num 2º lugar. Mesmo dado
 * (`campaignSpendData`, já computado uma vez em page.tsx a partir de `currentPeriod.insights`) —
 * nunca um 2º cálculo divergente.
 */
export function CampaignSpendPieChart({
  campaignSpendData,
  isDark,
  txMuted,
}: {
  campaignSpendData: CampaignSpendDatum[];
  isDark: boolean;
  txMuted: string;
}) {
  const tooltipCss = {
    contentStyle: {
      background: isDark ? '#0d1421' : '#ffffff',
      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
      borderRadius: '12px', fontSize: '12px', fontWeight: 500,
      color: isDark ? '#cbd5e1' : '#0f172a',
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 6px rgba(0,0,0,0.1)',
    },
  };

  if (campaignSpendData.length === 0) {
    return <p className={cn('text-sm text-center py-12', txMuted)}>Sem dados de campanhas</p>;
  }

  const total = campaignSpendData.reduce((s, c) => s + c.value, 0);

  return (
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
        {campaignSpendData.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className={cn('text-[10px] flex-1 leading-tight truncate', isDark ? 'text-slate-400' : 'text-slate-600')}>{d.name}</span>
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
      </div>
    </>
  );
}
