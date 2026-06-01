'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartIcon, ExclamationTriangleIcon, CheckCircleIcon,
  ArrowPathIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline';
import type {
  TrackingHealthData, TrackingHealthResult,
  TrackingCheckResult, HealthCheckStatus,
} from '@/lib/marketing-api';
import { getTrackingHealth, runTrackingHealth } from '@/lib/marketing-api';

/* ── helpers ──────────────────────────────────────────────── */

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // green-500
  if (score >= 60) return '#f59e0b'; // amber-500
  return '#ef4444';                   // red-500
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Saudável';
  if (score >= 60) return 'Atenção';
  return 'Crítico';
}

const STATUS_ICON: Record<HealthCheckStatus, React.ReactNode> = {
  ok:       <CheckCircleIcon className="h-4 w-4 text-emerald-500 shrink-0" />,
  warn:     <ExclamationTriangleIcon className="h-4 w-4 text-amber-500 shrink-0" />,
  critical: <ExclamationTriangleIcon className="h-4 w-4 text-red-500 shrink-0" />,
  skip:     <span className="w-4 h-4 rounded-full bg-gray-200 inline-block shrink-0" />,
};

const STATUS_TEXT: Record<HealthCheckStatus, string> = {
  ok:       'text-emerald-700',
  warn:     'text-amber-700',
  critical: 'text-red-700',
  skip:     'text-gray-400',
};

/* ── sub-components ───────────────────────────────────────── */

function ScoreGauge({ score }: { score: number }) {
  const color = scoreColor(score);
  // SVG arc gauge (semi-circle)
  const r = 36;
  const cx = 48, cy = 48;
  const circumference = Math.PI * r; // half circle
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg width="96" height="56" viewBox="0 0 96 60">
      {/* background arc */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round"
      />
      {/* value arc */}
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle"
        fill={color} fontSize="18" fontWeight="900">{score}</text>
      <text x={cx} y={cy + 10} textAnchor="middle"
        fill="#94a3b8" fontSize="9" fontWeight="600">/ 100</text>
    </svg>
  );
}

function CheckRow({ check }: { check: TrackingCheckResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
      >
        {STATUS_ICON[check.status]}
        <span className={`text-xs font-semibold flex-1 ${STATUS_TEXT[check.status]}`}>
          {check.label}
        </span>
        {check.value != null && (
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {check.value}
          </span>
        )}
        <ChevronDownIcon
          className={`h-3.5 w-3.5 text-gray-300 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-3 text-xs text-gray-500">{check.detail}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── main widget ──────────────────────────────────────────── */

interface Props {
  clientId?: string | null;
  /** Se true, mostra apenas o card compacto (para encaixar no dashboard grid) */
  compact?: boolean;
}

export function TrackingHealthWidget({ clientId, compact = false }: Props) {
  const [data, setData]       = useState<TrackingHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await getTrackingHealth(clientId);
      setData(d);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await runTrackingHealth(clientId);
      // Refresh history
      await load();
      setExpanded(true);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao executar check');
    } finally {
      setRunning(false);
    }
  };

  const latest = data?.latest ?? null;
  const score  = latest?.overallScore ?? null;
  const issues = latest?.issues ?? [];
  const checks = latest?.checks ?? [];

  /* ── loading ── */
  if (loading) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${compact ? 'p-4' : 'p-5'} flex items-center gap-3`}>
        <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-100 rounded-full w-32 animate-pulse" />
          <div className="h-2 bg-gray-100 rounded-full w-20 animate-pulse" />
        </div>
      </div>
    );
  }

  /* ── no data yet ── */
  if (!latest && !error) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${compact ? 'p-4' : 'p-5'}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
              <HeartIcon className="h-4 w-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-600 uppercase tracking-widest">Tracking Health</p>
              <p className="text-[10px] text-gray-400">Nenhuma verificação executada</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-60"
        >
          {running
            ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Verificando...</>
            : <><HeartIcon className="h-3.5 w-3.5" /> Executar 1ª verificação</>}
        </button>
      </div>
    );
  }

  /* ── compact header score bar ── */
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warnCount     = issues.filter(i => i.severity === 'warn').length;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
      score !== null ? scoreBg(score) : 'border-gray-100'
    }`}>
      {/* ── Header ── */}
      <div className={`${compact ? 'px-4 py-3.5' : 'px-5 py-4'}`}>
        <div className="flex items-center gap-3">
          {/* Gauge */}
          {score !== null && <ScoreGauge score={score} />}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <HeartIcon className={`h-4 w-4 shrink-0 ${score !== null ? '' : 'text-gray-400'}`}
                style={{ color: score !== null ? scoreColor(score) : undefined }} />
              <p className="text-xs font-black text-gray-700 uppercase tracking-widest">Tracking Health</p>
            </div>
            {score !== null && (
              <p className="text-sm font-bold" style={{ color: scoreColor(score) }}>
                {scoreLabel(score)}
              </p>
            )}
            {/* issue chips */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {criticalCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                  <ExclamationTriangleIcon className="h-3 w-3" />
                  {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}
                </span>
              )}
              {warnCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  <ExclamationTriangleIcon className="h-3 w-3" />
                  {warnCount} alerta{warnCount !== 1 ? 's' : ''}
                </span>
              )}
              {criticalCount === 0 && warnCount === 0 && score !== null && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  <CheckCircleIcon className="h-3 w-3" /> Tudo OK
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button
              onClick={handleRun}
              disabled={running}
              title="Executar novo check"
              className="p-2 rounded-xl hover:bg-white/60 transition-all disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 text-gray-500 ${running ? 'animate-spin' : ''}`} />
            </button>
            {checks.length > 0 && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="p-2 rounded-xl hover:bg-white/60 transition-all"
              >
                <ChevronDownIcon
                  className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </div>
        </div>

        {/* last updated */}
        {latest?.createdAt && (
          <p className="text-[10px] text-gray-400 mt-2 ml-1">
            Última verificação: {new Date(latest.createdAt).toLocaleString('pt-BR')}
          </p>
        )}
      </div>

      {/* ── Expandable checks list ── */}
      <AnimatePresence>
        {expanded && checks.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-100 bg-white"
          >
            <div className="divide-y divide-gray-100">
              {checks.map(c => <CheckRow key={c.id} check={c} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ── */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
