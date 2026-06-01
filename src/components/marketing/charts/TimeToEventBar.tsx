'use client';

/**
 * TimeToEventBar — FASE 8.5
 *
 * Exibe uma barra de contagem regressiva para um TimeToEvent.
 * Cores: verde (>14d) → amarelo (7-14d) → laranja (3-7d) → vermelho (<3d / já ativo).
 */

import React from 'react';
import type { TimeToEvent } from '@/lib/marketing-api';

interface Props {
  event:       TimeToEvent;
  campaignName?: string;
}

const EVENT_LABELS: Record<TimeToEvent['event'], string> = {
  FATIGUE:             '⚡ Fadiga',
  EXIT_LEARNING:       '🎓 Saída do Learning',
  AUDIENCE_EXHAUSTION: '👥 Esgotamento de Audiência',
};

const EVENT_ICONS: Record<TimeToEvent['event'], string> = {
  FATIGUE:             '⚡',
  EXIT_LEARNING:       '🎓',
  AUDIENCE_EXHAUSTION: '👥',
};

function urgencyColor(daysUntil: number | null): {
  bar: string; text: string; bg: string; border: string;
} {
  if (daysUntil === null)  return { bar: 'bg-gray-400',   text: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200' };
  if (daysUntil === 0)     return { bar: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200' };
  if (daysUntil <= 3)      return { bar: 'bg-red-400',    text: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100' };
  if (daysUntil <= 7)      return { bar: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' };
  if (daysUntil <= 14)     return { bar: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' };
  return                          { bar: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' };
}

/** Barra de progresso: quanto % do "tempo seguro" já foi consumido (0-100). */
function barPct(daysUntil: number | null, maxDays = 21): number {
  if (daysUntil === null) return 0;
  if (daysUntil === 0)    return 100;
  return Math.max(0, Math.min(100, Math.round(((maxDays - daysUntil) / maxDays) * 100)));
}

function confidenceDots(confidence: number): React.ReactNode {
  const filled = Math.round(confidence * 5);
  return (
    <span className="flex gap-0.5 items-center" title={`Confiança: ${(confidence * 100).toFixed(0)}%`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            i < filled ? 'bg-slate-500' : 'bg-slate-200'
          }`}
        />
      ))}
    </span>
  );
}

export function TimeToEventBar({ event, campaignName }: Props) {
  const colors = urgencyColor(event.daysUntil);
  const pct    = barPct(event.daysUntil);

  const countdownText =
    event.daysUntil === null   ? 'Sem estimativa'
    : event.daysUntil === 0   ? 'ATIVO AGORA'
    : event.daysUntil === 1   ? '1 dia'
    : `${event.daysUntil} dias`;

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-3 space-y-2`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
            {EVENT_LABELS[event.event]}
          </p>
          {campaignName && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{campaignName}</p>
          )}
        </div>
        <div className={`text-sm font-bold ${colors.text} whitespace-nowrap`}>
          {countdownText}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Detail + confidence */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-600 flex-1 leading-tight line-clamp-2">
          {event.detail}
        </p>
        {confidenceDots(event.confidence)}
      </div>
    </div>
  );
}

export default TimeToEventBar;
