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
}

const tooltipStyle = {
  background: '#1e1b4b',
  border: '1px solid rgba(124,58,237,0.3)',
  borderRadius: '12px',
};

export function PredictionChart({ historical, predictions, label, color, height = 260, formatter }: Props) {
  const todayStr = new Date().toISOString().split('T')[0];

  const combined = [
    ...historical.map(h => ({
      date: formatDateLabel(h.date),
      rawDate: h.date,
      actual: h.value,
      predicted: null as number | null,
      upper: null as number | null,
      lower: null as number | null,
    })),
    ...predictions.map(p => ({
      date: formatDateLabel(p.date),
      rawDate: p.date,
      actual: null as number | null,
      predicted: p.predicted,
      upper: p.upperBound,
      lower: p.lowerBound,
    })),
  ];

  const todayLabel = formatDateLabel(todayStr);

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: color }} /> Historico
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-0.5 inline-block border-t-2 border-dashed" style={{ borderColor: color }} /> Projecao
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={combined}>
          <defs>
            <linearGradient id={`pred-band-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#312e81" />
          <XAxis dataKey="date" stroke="#6b7280" fontSize={10} interval="preserveStartEnd" />
          <YAxis stroke="#6b7280" fontSize={11} tickFormatter={formatter} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatter ? formatter(v) : v?.toFixed(2)} />
          <ReferenceLine x={todayLabel} stroke="#6b7280" strokeDasharray="4 4" label={{ value: 'Hoje', fill: '#9ca3af', fontSize: 10 }} />
          <Area type="monotone" dataKey="upper" stroke="none" fill={`url(#pred-band-${label})`} name="Limite Superior" />
          <Area type="monotone" dataKey="lower" stroke="none" fill="transparent" name="Limite Inferior" />
          <Line type="monotone" dataKey="actual" stroke={color} strokeWidth={2} dot={false} name={`${label} (real)`} connectNulls={false} />
          <Line type="monotone" dataKey="predicted" stroke={color} strokeWidth={2} strokeDasharray="6 3" dot={false} name={`${label} (proj.)`} connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}


