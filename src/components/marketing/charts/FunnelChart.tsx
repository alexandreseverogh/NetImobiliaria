import type { FunnelData } from '@/lib/marketing-api';
import { formatNumber } from '@/lib/marketing-utils';

interface Props {
  data: FunnelData;
  isDark?: boolean;
}

const STAGES = [
  { key: 'impressions' as const, label: 'Impressões', colorD: '#60a5fa', colorL: '#3b82f6' },
  { key: 'clicks'      as const, label: 'Cliques',    colorD: '#818cf8', colorL: '#6366f1' },
  { key: 'leads'       as const, label: 'Leads',      colorD: '#fbbf24', colorL: '#f59e0b' },
  { key: 'conversions' as const, label: 'Conversões', colorD: '#34d399', colorL: '#10b981' },
];

export function FunnelChart({ data, isDark = true }: Props) {
  const maxVal = Math.max(data.impressions, 1);

  return (
    <div className="space-y-4">
      {STAGES.map((stage, i) => {
        const value = data[stage.key];
        const pct   = (value / maxVal) * 100;
        const prev  = i > 0 ? data[STAGES[i - 1].key] : 0;
        const conv  = i > 0 && prev > 0 ? ((value / prev) * 100).toFixed(1) : null;
        const c     = isDark ? stage.colorD : stage.colorL;

        return (
          <div key={stage.key}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {stage.label}
              </span>
              <div className="flex items-center gap-2.5">
                <span className={`font-mono font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {formatNumber(value)}
                </span>
                {conv && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-black ${isDark ? 'bg-[rgba(255,255,255,0.06)] text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                    {conv}%
                  </span>
                )}
              </div>
            </div>
            <div className={`h-7 rounded-lg overflow-hidden ${isDark ? 'bg-[rgba(255,255,255,0.04)]' : 'bg-slate-100'}`}>
              <div
                className="h-full rounded-lg transition-all duration-700"
                style={{
                  width: `${Math.max(pct, 2)}%`,
                  background: isDark
                    ? `linear-gradient(90deg, ${c}99, ${c}dd)`
                    : `linear-gradient(90deg, ${c}88, ${c})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
