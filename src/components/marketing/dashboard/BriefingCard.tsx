import React from 'react';
import { cn } from '@/lib/marketing-utils';
import type { StrategicBriefingData } from '@/lib/marketing-api';

export function BriefingCard({ briefing, isDark, compact }: {
  briefing: StrategicBriefingData; isDark: boolean; compact?: boolean;
}) {
  const c         = briefing.content;
  const typeLabel = briefing.type === 'morning' ? 'Matinal' : briefing.type === 'closing' ? 'Fechamento' : 'Manual';
  const date      = new Date(briefing.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const periodLabel = briefing.periodDays != null
    ? (briefing.periodDays === 1 ? 'Hoje' : `${briefing.periodDays}d`)
    : null;

  const cardCls = isDark
    ? 'bg-[rgba(13,20,33,0.92)] backdrop-blur-sm border border-[rgba(255,255,255,0.07)] shadow-[0_2px_16px_rgba(0,0,0,0.5)]'
    : 'bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)]';
  const tx      = isDark ? 'text-slate-300' : 'text-slate-900';
  const txMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const txFaint = isDark ? 'text-slate-500' : 'text-slate-400';
  const badge   = isDark
    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
    : 'bg-violet-50 text-violet-700 border border-violet-100';
  const periodBadge = isDark
    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
    : 'bg-indigo-50 text-indigo-500 border border-indigo-100';

  return (
    <div className={cn(`rounded-2xl p-5 ${cardCls}`, compact && 'opacity-70')}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${badge}`}>{typeLabel}</span>
          <span className={`text-xs ${txFaint}`}>{date}</span>
        </div>
        {periodLabel && (
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shrink-0 ${periodBadge}`}>
            {periodLabel}
          </span>
        )}
      </div>
      {c.urgentAlerts?.length > 0 && (
        <div className="mb-3 space-y-1">
          {c.urgentAlerts.map((a, idx) => (
            <p key={idx} className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>⚠ {a}</p>
          ))}
        </div>
      )}
      {c.performanceSummary && (
        <p className={cn(`text-sm leading-relaxed mb-3 ${txMuted}`, compact && 'line-clamp-2')}>{c.performanceSummary}</p>
      )}
      {!compact && c.campaignAnalysis?.length > 0 && (
        <div className="mb-3">
          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${txFaint}`}>Campanhas</p>
          <div className="space-y-1.5">
            {c.campaignAnalysis.map((ca, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <span>{ca.status === 'critical' ? '🔴' : ca.status === 'warning' ? '🟡' : '🟢'}</span>
                <span className={`font-black ${tx}`}>{ca.campaignName}:</span>
                <span className={txMuted}>{ca.recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!compact && c.budgetRecommendations?.length > 0 && (
        <div className="mb-3">
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Budget</p>
          {c.budgetRecommendations.map((r, idx) => <p key={idx} className={`text-sm ${txMuted}`}>• {r}</p>)}
        </div>
      )}
      {!compact && c.actionItems?.length > 0 && (
        <div className="mb-3">
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Ações</p>
          {c.actionItems.map((a, idx) => <p key={idx} className={`text-sm ${txMuted}`}>• {a}</p>)}
        </div>
      )}
      {!compact && c.tomorrowPlan && (
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Plano Amanhã</p>
          <p className={`text-sm ${txMuted}`}>{c.tomorrowPlan}</p>
        </div>
      )}
    </div>
  );
}
