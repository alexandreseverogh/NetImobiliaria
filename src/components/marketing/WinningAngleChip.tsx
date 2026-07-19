import React, { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';
import { angleLabel } from '@/lib/marketing/angles';
import { formatCurrency } from '@/lib/marketing-utils';

interface AngleStat {
  angle: string;
  label: string;
  campaigns: number;
  spend: number;
  cpl: number | null;
}

interface AngleChipResult {
  topAngle:   AngleStat | null;
  worstAngle: AngleStat | null;
  angleStats: AngleStat[];
}

const ANGLE_COLORS: Record<string, string> = {
  investment: 'bg-indigo-500/15 text-indigo-400',
  lifestyle:  'bg-emerald-500/15 text-emerald-400',
  family:     'bg-pink-500/15 text-pink-400',
  price:      'bg-amber-500/15 text-amber-400',
  urgency:    'bg-red-500/15 text-red-400',
  social:     'bg-cyan-500/15 text-cyan-400',
  luxury:     'bg-violet-500/15 text-violet-400',
  other:      'bg-slate-500/15 text-slate-400',
};
const ANGLE_COLORS_LIGHT: Record<string, string> = {
  investment: 'bg-indigo-50 text-indigo-600',
  lifestyle:  'bg-emerald-50 text-emerald-600',
  family:     'bg-pink-50 text-pink-600',
  price:      'bg-amber-50 text-amber-600',
  urgency:    'bg-red-50 text-red-600',
  social:     'bg-cyan-50 text-cyan-600',
  luxury:     'bg-violet-50 text-violet-600',
  other:      'bg-slate-50 text-slate-500',
};

export function WinningAngleChip({ isDark, period, clientId }: {
  isDark: boolean;
  period: number;
  clientId?: string;
}) {
  const [data, setData]       = useState<AngleChipResult | null>(null);
  const [chipLoading, setChipLoading] = useState(true);

  useEffect(() => {
    setChipLoading(true);
    const params = new URLSearchParams({ period: String(period) });
    if (clientId && clientId !== 'all') params.set('clientId', clientId);
    adminFetch(`/api/admin/campanhas/portfolio/angle-insights?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d ? {
        topAngle:   d.topAngle   ?? null,
        worstAngle: d.worstAngle ?? null,
        angleStats: (d.angleStats ?? []) as AngleStat[],
      } : null))
      .catch(() => setData(null))
      .finally(() => setChipLoading(false));
  }, [period, clientId]);

  const classified = (data?.angleStats ?? []).filter(a => a.angle !== 'unknown' && a.campaigns > 0);

  if (!chipLoading && !data?.topAngle && classified.length === 0) return null;

  const bar = isDark
    ? 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)]'
    : 'bg-white border border-slate-100 shadow-sm';
  const txLabel  = isDark ? 'text-slate-500' : 'text-slate-400';
  const txMain   = isDark ? 'text-slate-300' : 'text-slate-700';
  const txFaint  = isDark ? 'text-slate-500' : 'text-slate-400';

  if (chipLoading) {
    return (
      <div className={`rounded-2xl px-5 py-3 mb-6 flex items-center gap-4 ${bar} animate-pulse`}>
        <div className={`h-3 w-28 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
        <div className={`h-3 w-20 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
      </div>
    );
  }

  const hasCpl = !!data?.topAngle;
  const coverageAngles = classified
    .sort((a, b) => b.campaigns - a.campaigns)
    .slice(0, 4);

  return (
    <div className={`rounded-2xl px-5 py-3 mb-6 flex items-center gap-5 flex-wrap ${bar}`}>
      <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${txLabel}`}>
        {hasCpl ? `Ângulo · ${period}d` : `Ângulos · cobertura`}
      </span>

      {hasCpl && (
        <>
          <span className="flex items-center gap-2">
            <span className="text-base leading-none">🏆</span>
            <span className={`text-xs font-black ${txMain}`}>
              {angleLabel(data!.topAngle!.angle)}
            </span>
            {data!.topAngle!.cpl != null && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {formatCurrency(data!.topAngle!.cpl)} CPL
              </span>
            )}
          </span>

          {data?.worstAngle && (
            <>
              <span className={`text-[10px] ${txFaint}`}>vs</span>
              <span className="flex items-center gap-2">
                <span className={`text-xs font-medium ${txFaint}`}>
                  ↓ {angleLabel(data.worstAngle.angle)}
                </span>
                {data.worstAngle.cpl != null && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                    isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'
                  }`}>
                    {formatCurrency(data.worstAngle.cpl)} CPL
                  </span>
                )}
              </span>
            </>
          )}
        </>
      )}

      {!hasCpl && coverageAngles.map(a => {
        const colorClass = isDark
          ? (ANGLE_COLORS[a.angle] ?? ANGLE_COLORS.other)
          : (ANGLE_COLORS_LIGHT[a.angle] ?? ANGLE_COLORS_LIGHT.other);
        return (
          <span
            key={a.angle}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${colorClass}`}
          >
            {a.label}
            <span className="opacity-60 font-normal">{a.campaigns}×</span>
          </span>
        );
      })}

      {!hasCpl && (
        <span className={`text-[10px] italic ${txFaint}`}>
          CPL disponível após sincronização de métricas
        </span>
      )}

      <a
        href="/admin/campanhas/portfolio/cross-insights"
        className={`ml-auto text-[10px] font-black uppercase tracking-widest transition-colors shrink-0 ${
          isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
        }`}
      >
        Ver análise →
      </a>
    </div>
  );
}
