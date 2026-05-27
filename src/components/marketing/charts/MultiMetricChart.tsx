import { useState } from 'react';
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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
}

const tooltipStyle = {
  background: '#1e1b4b',
  border: '1px solid rgba(124,58,237,0.3)',
  borderRadius: '12px',
};

export function MultiMetricChart({ data, metrics, xKey = 'date', height = 280, title }: Props) {
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const toggleMetric = (key: string) => {
    setHiddenKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const hasRight = metrics.some(m => m.yAxisId === 'right');
  const visibleMetrics = metrics.filter(m => !hiddenKeys.has(m.key));

  return (
    <div>
      {title && <h3 className="text-sm font-medium text-gray-300 mb-4">{title}</h3>}
      <div className="flex flex-wrap gap-2 mb-3">
        {metrics.map(m => (
          <button
            key={m.key}
            onClick={() => toggleMetric(m.key)}
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-opacity"
            style={{ opacity: hiddenKeys.has(m.key) ? 0.35 : 1 }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
            <span className="text-gray-300">{m.label}</span>
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data}>
          <defs>
            {metrics.filter(m => m.type === 'area').map(m => (
              <linearGradient key={m.key} id={`grad-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={m.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={m.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#312e81" />
          <XAxis dataKey={xKey} stroke="#6b7280" fontSize={11} />
          <YAxis yAxisId="left" stroke="#6b7280" fontSize={11} />
          {hasRight && <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={11} />}
          <Tooltip contentStyle={tooltipStyle} />
          {visibleMetrics.map(m => {
            const yId = m.yAxisId || 'left';
            if (m.type === 'area') {
              return (
                <Area key={m.key} type="monotone" dataKey={m.key} stroke={m.color}
                  fill={`url(#grad-${m.key})`} yAxisId={yId} name={m.label} />
              );
            }
            if (m.type === 'bar') {
              return (
                <Bar key={m.key} dataKey={m.key} fill={m.color} yAxisId={yId}
                  radius={[4, 4, 0, 0]} name={m.label} barSize={20} />
              );
            }
            return (
              <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color}
                strokeWidth={2} dot={false} yAxisId={yId} name={m.label} />
            );
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}


