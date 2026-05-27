import type { FunnelData } from '@/lib/marketing-api';
import { formatNumber } from '@/lib/marketing-utils';

interface Props {
  data: FunnelData;
}

const stages = [
  { key: 'impressions' as const, label: 'Impressoes', color: '#3b82f6' },
  { key: 'clicks' as const, label: 'Cliques', color: '#7c3aed' },
  { key: 'leads' as const, label: 'Leads', color: '#f59e0b' },
  { key: 'conversions' as const, label: 'Conversoes', color: '#10b981' },
];

export function FunnelChart({ data }: Props) {
  const maxVal = Math.max(data.impressions, 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const value = data[stage.key];
        const pct = (value / maxVal) * 100;
        const prevValue = i > 0 ? data[stages[i - 1].key] : 0;
        const convRate = i > 0 && prevValue > 0 ? ((value / prevValue) * 100).toFixed(1) : null;

        return (
          <div key={stage.key}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-300">{stage.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono font-medium">{formatNumber(value)}</span>
                {convRate && (
                  <span className="text-xs text-gray-500">{convRate}%</span>
                )}
              </div>
            </div>
            <div className="h-8 bg-surface-light/30 rounded-lg overflow-hidden">
              <div
                className="h-full rounded-lg transition-all duration-700"
                style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: stage.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}


