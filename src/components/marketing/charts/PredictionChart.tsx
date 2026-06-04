import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { PredictionPoint } from '@/lib/marketing-api';

interface Props {
  historical: { date: string; value: number }[];
  predictions: PredictionPoint[];
  label: string;
  color: string;
  height?: number;
  formatter?: (v: number) => string;
  isDark?: boolean;
  /** Multiplicador σ vindo da API — determina o label da banda dinamicamente */
  sigmaMult?: number;
}

/**
 * Converte multiplicador σ em percentual de confiança (distribuição normal).
 * Usa aproximação de Abramowitz & Stegun para erf(z/√2).
 * Exemplos: 1.0σ→68%, 1.5σ→87%, 1.96σ→95%, 2.0σ→95%
 */
function sigmaToConfidencePct(z: number): number {
  const x = Math.abs(z / Math.SQRT2);
  const p = 0.3275911;
  const [a1, a2, a3, a4, a5] = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const t = 1 / (1 + p * x);
  const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return Math.round(erf * 100);
}

export function PredictionChart({
  historical, predictions, label, color,
  height = 260, formatter, isDark = true, sigmaMult,
}: Props) {
  const todayStr = new Date().toISOString().split('T')[0];
  // Safe pattern id — strip special chars
  const sid = label.toLowerCase().replace(/[^a-z0-9]/g, '-');
  // Label da banda calculado dinamicamente a partir do σ retornado pela API
  const bandaLabel = sigmaMult != null
    ? `Banda ~${sigmaToConfidencePct(sigmaMult)}%`
    : 'Banda';

  const combined = [
    ...historical.map(h => ({
      date:      formatDateLabel(h.date),
      rawDate:   h.date,
      actual:    h.value,
      predicted: null as number | null,
      upper:     null as number | null,
      lower:     null as number | null,
    })),
    ...predictions.map(p => ({
      date:      formatDateLabel(p.date),
      rawDate:   p.date,
      actual:    null as number | null,
      predicted: p.predicted,
      upper:     p.upperBound,
      lower:     p.lowerBound,
    })),
  ];

  const todayLabel = formatDateLabel(todayStr);
  const gridColor  = isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9';
  const axisColor  = isDark ? '#475569' : '#94a3b8';
  // Mask color must match effective card background
  const maskColor  = isDark ? '#0d1421' : '#f8fafc';

  const tooltipCss = {
    contentStyle: {
      background:   isDark ? '#0d1421' : '#ffffff',
      border:       isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
      borderRadius: '12px',
      fontSize:     '12px',
      fontWeight:   500,
      color:        isDark ? '#cbd5e1' : '#111827',
      boxShadow:    isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 6px rgba(0,0,0,0.1)',
    },
  };

  return (
    <div>
      {/* ── Legend ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <span className={`text-sm font-black ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{label}</span>
        <div className="flex items-center gap-4 text-xs" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-[2px] inline-block rounded-full" style={{ backgroundColor: color }} />
            Real
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 inline-block" style={{ borderTop: `2px dashed ${color}`, opacity: 0.8 }} />
            Projeção
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 inline-block rounded-sm flex-shrink-0" style={{
              background: `repeating-linear-gradient(45deg, ${color}22, ${color}22 2px, ${color}44 2px, ${color}44 4px)`,
              border: `1px solid ${color}40`,
            }} />
            {bandaLabel}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={combined}>
          <defs>
            {/* ── Diagonal hatch for confidence band ── */}
            <pattern id={`hatch-${sid}`} patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
              <rect width="10" height="10" fill={color} fillOpacity={isDark ? 0.06 : 0.04} />
              <line x1="0" y1="0" x2="0" y2="10" stroke={color} strokeWidth="1.5" strokeOpacity={isDark ? 0.30 : 0.20} />
            </pattern>
            {/* ── Historical area gradient ── */}
            <linearGradient id={`hist-${sid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={isDark ? 0.38 : 0.20} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            stroke={axisColor} fontSize={10}
            tick={{ fill: axisColor }}
            axisLine={{ stroke: axisColor, strokeOpacity: 0.3 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke={axisColor} fontSize={11}
            tick={{ fill: axisColor }}
            axisLine={false} tickLine={false}
            tickFormatter={formatter}
          />
          <Tooltip
            {...tooltipCss}
            formatter={(v: any) => (formatter && v != null ? formatter(Number(v)) : v?.toFixed?.(2) ?? v)}
          />

          {/* Hoje reference line */}
          <ReferenceLine
            x={todayLabel}
            stroke={isDark ? 'rgba(255,255,255,0.18)' : '#cbd5e1'}
            strokeDasharray="4 4"
            label={{ value: 'Hoje', fill: isDark ? '#64748b' : '#94a3b8', fontSize: 10 }}
          />

          {/* ── Confidence band ──────────────────────────────────────
              Upper: fills from upper value DOWN to 0 with hatch pattern
              Lower: fills from lower value DOWN to 0 with solid bg color
              Net result: hatching appears ONLY between upper and lower
          ─────────────────────────────────────────────────────────── */}
          <Area
            type="monotone" dataKey="upper"
            stroke={color} strokeWidth={0.75} strokeOpacity={0.45} strokeDasharray="3 3"
            fill={`url(#hatch-${sid})`}
            connectNulls={false}
            name="Limite Superior"
          />
          <Area
            type="monotone" dataKey="lower"
            stroke={color} strokeWidth={0.75} strokeOpacity={0.45} strokeDasharray="3 3"
            fill={maskColor} fillOpacity={1}
            connectNulls={false}
            name="Limite Inferior"
          />

          {/* Historical actual — area with gradient */}
          <Area
            type="monotone" dataKey="actual"
            stroke={color} strokeWidth={2.5}
            fill={`url(#hist-${sid})`}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: 'transparent' }}
            connectNulls={false}
            name={`${label} (real)`}
          />

          {/* Projection line — dashed */}
          <Line
            type="monotone" dataKey="predicted"
            stroke={color} strokeWidth={2} strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: 'transparent' }}
            connectNulls={false}
            name={`${label} (proj.)`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
