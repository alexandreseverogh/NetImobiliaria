import { useState } from 'react';
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface MetricConfig {
  key: string;
  label: string;
  color: string;
  type: 'area' | 'line' | 'bar';
  yAxisId?: 'left' | 'right';
  formatter?: (v: number) => string;
}

interface Props {
  data: Record<string, any>[];
  metrics: MetricConfig[];
  xKey?: string;
  height?: number;
  title?: string;
  isDark?: boolean;
  /** Override do rótulo do eixo X (padrão: 'Data') */
  xLabel?: string;
  /** Override do rótulo do eixo Y esquerdo (padrão: primeiro metric do eixo left) */
  yLeftLabel?: string;
  /** Override do rótulo do eixo Y direito (padrão: primeiro metric do eixo right) */
  yRightLabel?: string;
}

export function MultiMetricChart({ data, metrics, xKey = 'date', height = 280, title, isDark = true, xLabel, yLeftLabel, yRightLabel }: Props) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const toggleMetric = (key: string) =>
    setHiddenKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const hasRight      = metrics.some(m => m.yAxisId === 'right');
  const visibleMetrics = metrics.filter(m => !hiddenKeys.has(m.key));

  // Auto-derive axis labels
  const xl = xLabel       ?? 'Data';
  const yl = yLeftLabel   ?? (metrics.find(m => !m.yAxisId || m.yAxisId === 'left')?.label ?? '');
  const yr = yRightLabel  ?? (hasRight ? (metrics.find(m => m.yAxisId === 'right')?.label ?? '') : '');

  const gridColor  = isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9';
  const axisColor  = isDark ? '#475569' : '#94a3b8';
  const tooltipCss = {
    contentStyle: {
      background:   isDark ? '#0d1421' : '#ffffff',
      border:       isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
      borderRadius: '12px',
      fontSize:     '12px',
      fontWeight:   500,
      color:        isDark ? '#f1f5f9' : '#111827',
      boxShadow:    isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 6px -1px rgba(0,0,0,0.1)',
    },
  };

  return (
    <div>
      {title && (
        <h3 className={`text-sm font-black mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{title}</h3>
      )}
      {/* Legend toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {metrics.map(m => (
          <button
            key={m.key}
            onClick={() => toggleMetric(m.key)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full transition-all hover:opacity-90 active:scale-95"
            style={{ opacity: hiddenKeys.has(m.key) ? 0.28 : 1 }}
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
            <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{m.label}</span>
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={data}
          margin={{ top: 4, right: yr ? 64 : hasRight ? 40 : 8, left: yl ? 16 : 4, bottom: xl ? 22 : 4 }}
        >
          <defs>
            {metrics.filter(m => m.type === 'area').map(m => (
              <linearGradient key={m.key} id={`mmcgrad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={m.color} stopOpacity={isDark ? 0.32 : 0.18} />
                <stop offset="95%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey={xKey}
            stroke={axisColor} fontSize={11}
            tick={{ fill: axisColor }}
            axisLine={{ stroke: axisColor, strokeOpacity: 0.3 }}
            tickLine={false}
            label={xl ? { value: xl, position: 'insideBottom', offset: -8, fill: axisColor, fontSize: 10, fontWeight: 600 } : undefined}
          />
          <YAxis
            yAxisId="left"
            stroke={axisColor} fontSize={11}
            tick={{ fill: axisColor }}
            axisLine={false} tickLine={false}
            label={yl ? { value: yl, angle: -90, position: 'insideLeft', offset: 14, fill: axisColor, fontSize: 10, fontWeight: 600, style: { textAnchor: 'middle' } } : undefined}
          />
          {hasRight && (
            <YAxis
              yAxisId="right" orientation="right"
              stroke={axisColor} fontSize={11}
              tick={{ fill: axisColor }}
              axisLine={false} tickLine={false}
              label={yr ? { value: yr, angle: 90, position: 'insideRight', offset: 14, fill: axisColor, fontSize: 10, fontWeight: 600, style: { textAnchor: 'middle' } } : undefined}
            />
          )}
          <Tooltip {...tooltipCss} />
          {visibleMetrics.map(m => {
            const yId = m.yAxisId || 'left';
            if (m.type === 'area') return (
              <Area key={m.key} type="monotone" dataKey={m.key}
                stroke={m.color} strokeWidth={2.5}
                fill={`url(#mmcgrad-${m.key})`}
                yAxisId={yId} name={m.label} />
            );
            if (m.type === 'bar') return (
              <Bar key={m.key} dataKey={m.key} fill={m.color}
                fillOpacity={isDark ? 0.8 : 0.9}
                yAxisId={yId} radius={[4, 4, 0, 0]} name={m.label} barSize={20} />
            );
            return (
              <Line key={m.key} type="monotone" dataKey={m.key}
                stroke={m.color} strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: m.color, stroke: 'transparent' }}
                yAxisId={yId} name={m.label} />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
