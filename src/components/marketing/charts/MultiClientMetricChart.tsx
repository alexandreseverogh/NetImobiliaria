'use client';
/**
 * MultiClientMetricChart — Gráfico multi-série para modo "Todos os Clientes".
 * Uma linha por cliente + linha de benchmark (mediana) tracejada.
 * Usa Recharts (consistente com MultiMetricChart existente).
 */
import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import type { ClientSegmentData } from '@/app/api/admin/campanhas/dashboard/segment/route';

// ─── Paleta de cores por cliente ─────────────────────────────────────────────

const CLIENT_COLORS_DARK = [
  '#818cf8', // indigo
  '#34d399', // emerald
  '#fbbf24', // amber
  '#f87171', // red
  '#60a5fa', // blue
  '#e879f9', // fuchsia
  '#2dd4bf', // teal
  '#fb923c', // orange
];

const CLIENT_COLORS_LIGHT = [
  '#6366f1',
  '#059669',
  '#d97706',
  '#dc2626',
  '#2563eb',
  '#c026d3',
  '#0d9488',
  '#ea580c',
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type MetricKey = 'spend' | 'ctr' | 'cpl' | 'leads';

interface Props {
  clients: ClientSegmentData[];
  tenantOwn: ClientSegmentData | null;
  benchmarkMedian: number | null;
  metric: MetricKey;
  isDark?: boolean;
  height?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const METRIC_CONFIG: Record<MetricKey, { label: string; format: (v: number) => string; unit: string }> = {
  spend:  { label: 'Gasto (R$)',   format: v => `R$ ${v.toFixed(2)}`,    unit: 'R$'   },
  ctr:    { label: 'CTR (%)',      format: v => `${v.toFixed(2)}%`,       unit: '%'    },
  cpl:    { label: 'CPL (R$)',     format: v => `R$ ${v.toFixed(2)}`,    unit: 'R$'   },
  leads:  { label: 'Leads',        format: v => String(Math.round(v)),    unit: ''     },
};

function buildChartData(
  allClients: { id: string; name: string; daily: ClientSegmentData['daily'] }[],
): Record<string, any>[] {
  // Collect all unique dates
  const datesSet = new Set<string>();
  allClients.forEach(c => c.daily.forEach(d => datesSet.add(d.date)));
  const dates = Array.from(datesSet).sort();

  return dates.map(date => {
    const point: Record<string, any> = { date };
    allClients.forEach(c => {
      const day = c.daily.find(d => d.date === date);
      point[c.id] = day ?? null;
    });
    return point;
  });
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active, payload, label, allClients, metric, isDark, benchmarkMedian,
}: any) {
  if (!active || !payload?.length) return null;
  const cfg    = METRIC_CONFIG[metric as MetricKey];
  const bg     = isDark ? '#0d1421' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0';
  const clr    = isDark ? '#cbd5e1' : '#0f172a';
  const muted  = isDark ? '#64748b' : '#94a3b8';

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 14,
      padding: '10px 14px', color: clr, minWidth: 200,
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.55)' : '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      <p style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: muted, marginBottom: 8 }}>
        {label}
      </p>
      {payload
        .filter((p: any) => p.value != null)
        .sort((a: any, b: any) => {
          const va = typeof a.value === 'number' ? a.value : (a.value as any)?.[metric] ?? 0;
          const vb = typeof b.value === 'number' ? b.value : (b.value as any)?.[metric] ?? 0;
          return va - vb;
        })
        .map((p: any, i: number) => {
          const rawVal = typeof p.value === 'number' ? p.value : (p.value as any)?.[metric];
          if (rawVal == null) return null;
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color, flexShrink: 0, display: 'inline-block' }} />
                {p.name}
              </span>
              <span style={{ fontWeight: 800, fontSize: 12, color: p.color }}>
                {cfg.format(rawVal)}
              </span>
            </div>
          );
        })}
      {benchmarkMedian != null && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
          <span style={{ color: muted }}>Benchmark (mediana)</span>
          <span style={{ fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.35)' : '#94a3b8' }}>
            {cfg.format(benchmarkMedian)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MultiClientMetricChart({
  clients,
  tenantOwn,
  benchmarkMedian,
  metric,
  isDark = true,
  height = 280,
}: Props) {
  const COLORS     = isDark ? CLIENT_COLORS_DARK : CLIENT_COLORS_LIGHT;
  const gridColor  = isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9';
  const axisColor  = isDark ? '#64748b' : '#94a3b8';
  const cfg        = METRIC_CONFIG[metric];

  const allClients = [
    ...(tenantOwn ? [{ id: tenantOwn.id, name: tenantOwn.name, daily: tenantOwn.daily }] : []),
    ...clients.map(c => ({ id: c.id, name: c.name, daily: c.daily })),
  ];

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const toggleClient = (id: string) => setHiddenIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const chartData = buildChartData(allClients);

  // Benchmark reference line — tom neutro forte e nítido em ambos os modos
  const benchColor = isDark ? '#cbd5e1' : '#475569';

  return (
    <div>
      {/* ── Legend (clickable) ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginBottom: 12 }}>
        {allClients.map((c, i) => {
          const color   = COLORS[i % COLORS.length];
          const hidden  = hiddenIds.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => toggleClient(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 10, fontWeight: 700, cursor: 'pointer',
                opacity: hidden ? 0.35 : 1,
                color: isDark ? '#94a3b8' : '#64748b',
                background: 'none', border: 'none', padding: 0,
                transition: 'opacity 0.2s',
              }}
            >
              <span style={{ width: 8, height: 2, backgroundColor: color, borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
              {c.name}
            </button>
          );
        })}
        {benchmarkMedian != null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: axisColor }}>
            <span style={{
              width: 16, height: 1, backgroundColor: benchColor,
              display: 'inline-block', borderTop: '1px dashed',
              borderColor: benchColor,
            }} />
            Benchmark
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
          <CartesianGrid stroke={gridColor} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: axisColor, fontSize: 10, fontWeight: 500 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={d => {
              const [, m, day] = d.split('-');
              return `${day}/${m}`;
            }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: axisColor, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => cfg.format(v)}
            width={54}
          />
          <Tooltip
            content={props => (
              <CustomTooltip
                {...props}
                allClients={allClients}
                metric={metric}
                isDark={isDark}
                benchmarkMedian={benchmarkMedian}
              />
            )}
          />

          {/* Linha de benchmark (mediana) */}
          {benchmarkMedian != null && (
            <ReferenceLine
              y={benchmarkMedian}
              stroke={benchColor}
              strokeWidth={2}
              strokeDasharray="6 4"
              label={{
                value: `Benchmark ${cfg.format(benchmarkMedian)}`,
                position: 'insideTopRight',
                fill: benchColor,
                fontSize: 10,
                fontWeight: 800,
              }}
            />
          )}

          {/* Uma linha por cliente */}
          {allClients.map((c, i) => (
            <Line
              key={c.id}
              type="monotone"
              dataKey={obj => {
                const day = obj[c.id];
                if (!day) return null;
                return day[metric] ?? null;
              }}
              name={c.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={hiddenIds.has(c.id) ? 0 : 2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
