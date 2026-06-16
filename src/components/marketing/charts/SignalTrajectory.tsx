'use client';

/**
 * SignalTrajectory — FASE 8.5
 *
 * Sparkline de 7 pontos + seta direcional + texto de implicação.
 * Sinal leading (engagement_ranking, cpm, frequency, first_impression_ratio).
 */

import React from 'react';
import type { Trajectory } from '@/lib/marketing-api';

interface Props {
  trajectory: Trajectory;
  compact?:   boolean;   // modo compacto: sem implicação textual
}

const SIGNAL_LABELS: Record<Trajectory['signal'], string> = {
  engagement_ranking:    'Engajamento',
  cpm:                   'CPM',
  frequency:             'Frequência',
  first_impression_ratio:'Impressões Novas',
};

const SIGNAL_UNITS: Record<Trajectory['signal'], string> = {
  engagement_ranking:    '',      // normalizado 0-1
  cpm:                   'R$',
  frequency:             'x',
  first_impression_ratio:'%',
};

/**
 * Para cada sinal, indica se "subir" é favorável.
 * CPM e Frequência subindo são ruins (mais caro / fadiga);
 * Engajamento e Impressões Novas subindo são bons.
 */
const UP_IS_GOOD: Record<Trajectory['signal'], boolean> = {
  engagement_ranking:    true,
  cpm:                   false,
  frequency:             false,
  first_impression_ratio:true,
};

type Sentiment = 'good' | 'neutral' | 'bad';

/** Traduz (sinal, direção) em sentimento — favorável, neutro ou desfavorável. */
function signalSentiment(signal: Trajectory['signal'], dir: 'up' | 'down' | 'stable'): Sentiment {
  if (dir === 'stable') return 'neutral';
  const goingUpIsGood = UP_IS_GOOD[signal];
  const isGood = dir === 'up' ? goingUpIsGood : !goingUpIsGood;
  return isGood ? 'good' : 'bad';
}

const SENTIMENT_STYLE: Record<Sentiment, { text: string; hex: string }> = {
  good:    { text: 'text-blue-500',  hex: '#3b82f6' },   // azul — tendência favorável
  neutral: { text: 'text-amber-500', hex: '#f59e0b' },   // amarelo — estável / vigiar
  bad:     { text: 'text-red-500',   hex: '#ef4444' },   // vermelho — tendência desfavorável
};

function directionIcon(dir: 'up' | 'down' | 'stable'): string {
  return dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→';
}

/** Mini sparkline SVG — 60×18 px */
function Sparkline({ values, strokeColor }: { values: number[]; strokeColor: string }) {
  if (values.length < 2) return null;

  const W = 60, H = 18, PAD = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="shrink-0"
      aria-hidden
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last dot */}
      {(() => {
        const [x, y] = points.at(-1)!.split(',').map(Number);
        return <circle cx={x} cy={y} r="2" fill={strokeColor} />;
      })()}
    </svg>
  );
}

export function SignalTrajectory({ trajectory, compact }: Props) {
  const sentiment = signalSentiment(trajectory.signal, trajectory.direction);
  const style     = SENTIMENT_STYLE[sentiment];
  const icon      = directionIcon(trajectory.direction);
  const label     = SIGNAL_LABELS[trajectory.signal];
  const unit      = SIGNAL_UNITS[trajectory.signal];

  // Format last value
  const lastVal = trajectory.values.at(-1);
  const formattedLast = lastVal !== undefined
    ? trajectory.signal === 'first_impression_ratio'
      ? `${(lastVal * 100).toFixed(0)}%`
      : trajectory.signal === 'cpm'
      ? `R$${lastVal.toFixed(2)}`
      : trajectory.signal === 'frequency'
      ? `${lastVal.toFixed(1)}x`
      : lastVal.toFixed(2)
    : '—';

  return (
    <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-white border border-slate-100 hover:border-slate-200 transition-colors">
      {/* Sparkline */}
      <Sparkline values={trajectory.values} strokeColor={style.hex} />

      {/* Signal name + value */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-slate-700 truncate">{label}</span>
          <span className={`text-sm font-bold ${style.text}`}>{icon}</span>
        </div>
        {!compact && (
          <p className="text-xs text-slate-500 leading-tight line-clamp-1 mt-0.5">
            {trajectory.implication}
          </p>
        )}
      </div>

      {/* Last value */}
      <div className="text-right shrink-0">
        <span className={`text-xs font-mono font-semibold ${style.text}`}>
          {formattedLast}
        </span>
      </div>
    </div>
  );
}

export default SignalTrajectory;
