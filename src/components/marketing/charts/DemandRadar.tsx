'use client';

/**
 * FASE 18.1 — DemandRadar
 * Radar de Demanda: fusão endógeno × exógeno por ângulo de comunicação
 * Design: "Signal Intelligence" — premium, dark/light theme aware
 */

import { useEffect, useState, useCallback } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────

type Quadrant = 'oceano-azul' | 'saturado' | 'vigiar' | 'ponto-morto';

interface RadarAngle {
  angle: string;
  label: string;
  endogenous: number;
  exogenous: number;
  quadrant: Quadrant;
  spend?: number;
  cpl?: number;
  exogenousSource: 'trends' | 'mock';
}

interface DemandRadarData {
  angles: RadarAngle[];
  generatedAt: string;
  endogenousPeriodDays: number;
  hasTrendsData: boolean;
  summary: {
    oceanosAzuis: string[];
    saturados: string[];
    vigiar: string[];
    pontosMortos: string[];
  };
  fromCache?: boolean;
}

interface Props {
  isDark?: boolean;
  tenantId?: string;
  clientId?: number;
  periodDays?: number;
}

// ── Quadrant config ────────────────────────────────────────────────────────

const QUADRANT_CONFIG: Record<Quadrant, {
  label: string; icon: string;
  dark: { bg: string; border: string; text: string; badge: string };
  light: { bg: string; border: string; text: string; badge: string };
}> = {
  'oceano-azul': {
    label: 'Oceano Azul',
    icon: '🌊',
    dark: {
      bg: 'rgba(16,185,129,0.08)',
      border: 'rgba(52,211,153,0.25)',
      text: '#34d399',
      badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    },
    light: {
      bg: 'rgba(16,185,129,0.06)',
      border: 'rgba(16,185,129,0.25)',
      text: '#059669',
      badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    },
  },
  'saturado': {
    label: 'Saturado',
    icon: '⚔️',
    dark: {
      bg: 'rgba(248,113,113,0.08)',
      border: 'rgba(248,113,113,0.25)',
      text: '#f87171',
      badge: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
    },
    light: {
      bg: 'rgba(248,113,113,0.06)',
      border: 'rgba(248,113,113,0.25)',
      text: '#e11d48',
      badge: 'bg-rose-100 text-rose-700 border border-rose-200',
    },
  },
  'vigiar': {
    label: 'Vigiar',
    icon: '👁️',
    dark: {
      bg: 'rgba(251,191,36,0.08)',
      border: 'rgba(251,191,36,0.25)',
      text: '#fbbf24',
      badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    },
    light: {
      bg: 'rgba(251,191,36,0.06)',
      border: 'rgba(251,191,36,0.25)',
      text: '#d97706',
      badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    },
  },
  'ponto-morto': {
    label: 'Ponto Morto',
    icon: '😴',
    dark: {
      bg: 'rgba(100,116,139,0.08)',
      border: 'rgba(100,116,139,0.25)',
      text: '#94a3b8',
      badge: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
    },
    light: {
      bg: 'rgba(100,116,139,0.06)',
      border: 'rgba(100,116,139,0.25)',
      text: '#64748b',
      badge: 'bg-slate-100 text-slate-600 border border-slate-200',
    },
  },
};

// ── Custom Tooltip ─────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, isDark }: any) {
  if (!active || !payload?.length) return null;

  const angle = payload[0]?.payload as RadarAngle & { fullLabel?: string };
  if (!angle) return null;

  const q = QUADRANT_CONFIG[angle.quadrant];
  const theme = isDark ? q.dark : q.light;

  return (
    <div
      className="rounded-xl px-4 py-3 text-sm shadow-2xl"
      style={{
        background: isDark ? 'rgba(7,13,24,0.97)' : '#ffffff',
        border: `1px solid ${theme.border}`,
        backdropFilter: 'blur(12px)',
        minWidth: 180,
      }}
    >
      <p className="font-semibold mb-2" style={{ color: theme.text }}>
        {q.icon} {angle.label}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Suas campanhas</span>
          <span style={{ color: '#818cf8' }} className="font-mono font-semibold">
            {angle.endogenous}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            Demanda{angle.exogenousSource === 'mock' ? '*' : ''}
          </span>
          <span style={{ color: '#22d3ee' }} className="font-mono font-semibold">
            {angle.exogenous}
          </span>
        </div>
        {angle.cpl !== undefined && angle.cpl > 0 && (
          <div className="flex justify-between gap-4 pt-1 border-t" style={{ borderColor: theme.border }}>
            <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>CPL médio</span>
            <span style={{ color: isDark ? '#e2e8f0' : '#1e293b' }} className="font-mono font-semibold">
              R$ {angle.cpl.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      <p
        className={`mt-2 text-xs px-2 py-0.5 rounded-full inline-block ${isDark ? q.dark.badge : q.light.badge}`}
      >
        {q.icon} {q.label}
      </p>
      {angle.exogenousSource === 'mock' && (
        <p className="mt-1 text-xs" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
          * estimativa (sem dados Trends)
        </p>
      )}
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────

function RadarLegend({ isDark }: { isDark: boolean }) {
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  return (
    <div className={`flex flex-wrap items-center justify-center gap-5 text-xs ${textMuted} mt-1`}>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(129,140,248,0.35)', border: '1.5px solid #818cf8' }} />
        Suas campanhas (endógeno)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-10 h-0.5 relative">
          <span className="absolute inset-0" style={{
            background: 'repeating-linear-gradient(90deg,#22d3ee 0,#22d3ee 5px,transparent 5px,transparent 7px)',
          }} />
        </span>
        Demanda Google Trends (exógeno)
      </span>
    </div>
  );
}

// ── Quadrant Panel ─────────────────────────────────────────────────────────

function QuadrantPanel({ data, isDark }: { data: DemandRadarData; isDark: boolean }) {
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const anglesByQuadrant: Record<Quadrant, RadarAngle[]> = {
    'oceano-azul': data.angles.filter(a => a.quadrant === 'oceano-azul'),
    'saturado':    data.angles.filter(a => a.quadrant === 'saturado'),
    'vigiar':      data.angles.filter(a => a.quadrant === 'vigiar'),
    'ponto-morto': data.angles.filter(a => a.quadrant === 'ponto-morto'),
  };

  const orderedQuadrants: Quadrant[] = ['oceano-azul', 'saturado', 'vigiar', 'ponto-morto'];

  return (
    <div className="space-y-3">
      {orderedQuadrants.map(q => {
        const angles = anglesByQuadrant[q];
        const cfg = QUADRANT_CONFIG[q];
        const theme = isDark ? cfg.dark : cfg.light;
        if (angles.length === 0) return null;

        return (
          <motion.div
            key={q}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: orderedQuadrants.indexOf(q) * 0.06 }}
            className="rounded-xl p-3"
            style={{
              background: theme.bg,
              border: `1px solid ${theme.border}`,
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{cfg.icon}</span>
              <span className="text-xs font-semibold tracking-wide" style={{ color: theme.text }}>
                {cfg.label}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {angles.map(a => (
                <span
                  key={a.angle}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)',
                    color: isDark ? '#e2e8f0' : '#1e293b',
                    border: `1px solid ${theme.border}`,
                  }}
                >
                  {a.label}
                </span>
              ))}
            </div>
          </motion.div>
        );
      })}

      {/* Legenda de quadrantes */}
      <div className="rounded-xl p-3 mt-1"
        style={{
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Legenda</p>
        <div className="space-y-1.5 text-xs">
          {orderedQuadrants.map(q => {
            const cfg = QUADRANT_CONFIG[q];
            const theme = isDark ? cfg.dark : cfg.light;
            return (
              <div key={q} className="flex items-start gap-1.5">
                <span className="mt-px">{cfg.icon}</span>
                <span>
                  <span className="font-medium" style={{ color: theme.text }}>{cfg.label}</span>
                  <span className={` ml-1 ${textMuted}`}>
                    {q === 'oceano-azul' && '— demanda alta, presença baixa'}
                    {q === 'saturado'    && '— demanda alta, presença alta'}
                    {q === 'vigiar'      && '— demanda baixa, presença alta'}
                    {q === 'ponto-morto' && '— demanda baixa, presença baixa'}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function DemandRadar({ isDark = true, tenantId, clientId, periodDays = 30 }: Props) {
  const [data, setData] = useState<DemandRadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ periodDays: String(periodDays) });
      if (tenantId)  params.set('tenantId', tenantId);
      if (clientId)  params.set('clientId', String(clientId));

      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('admin_auth_token') ?? '')
        : '';

      const res = await fetch(`/api/admin/campanhas/dashboard/demand-radar?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar radar');
    } finally {
      setLoading(false);
    }
  }, [tenantId, clientId, periodDays]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Prepare chart data ─────────────────────────────────────────────────
  const chartData = data?.angles.map(a => ({
    ...a,
    fullLabel: a.label,
  })) ?? [];

  // ── Theme tokens ───────────────────────────────────────────────────────
  const bg          = isDark ? 'rgba(13,20,33,0.92)' : '#ffffff';
  const border      = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textPrimary = isDark ? '#e2e8f0' : '#1e293b';
  const textMuted   = isDark ? '#64748b' : '#94a3b8';
  const gridColor   = isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const axisColor   = isDark ? '#475569' : '#94a3b8';

  // ── Loading skeleton ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="rounded-2xl p-6 animate-pulse"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }} />
          <div className="h-5 w-48 rounded-md" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }} />
        </div>
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          <div className="h-64 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }} />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div
        className="rounded-2xl p-6 flex items-center gap-3"
        style={{ background: bg, border: `1px solid rgba(248,113,113,0.2)` }}
      >
        <span className="text-xl">⚠️</span>
        <div>
          <p className="text-sm font-medium" style={{ color: '#f87171' }}>Erro ao carregar Radar de Demanda</p>
          <p className="text-xs mt-0.5" style={{ color: textMuted }}>{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 text-xs underline"
            style={{ color: isDark ? '#818cf8' : '#6366f1' }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────
  const generatedDate = new Date(data.generatedAt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: isDark
          ? '0 2px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)'
          : '0 2px 12px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-start justify-between gap-4"
        style={{ borderBottom: `1px solid ${border}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(129,140,248,0.2), rgba(34,211,238,0.15))'
                : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.1))',
              border: `1px solid ${isDark ? 'rgba(129,140,248,0.3)' : 'rgba(99,102,241,0.2)'}`,
            }}
          >
            📡
          </div>
          <div>
            <h3 className="font-semibold leading-tight" style={{ color: textPrimary, fontSize: 15 }}>
              Radar de Demanda
            </h3>
            <p className="text-xs mt-0.5" style={{ color: textMuted }}>
              Sinais de mercado × presença nas campanhas • {data.endogenousPeriodDays}d
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Trends badge */}
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: data.hasTrendsData
                ? (isDark ? 'rgba(34,211,238,0.12)' : 'rgba(6,182,212,0.08)')
                : (isDark ? 'rgba(100,116,139,0.15)' : 'rgba(100,116,139,0.08)'),
              color: data.hasTrendsData
                ? (isDark ? '#22d3ee' : '#0891b2')
                : (isDark ? '#64748b' : '#94a3b8'),
              border: `1px solid ${data.hasTrendsData
                ? (isDark ? 'rgba(34,211,238,0.25)' : 'rgba(6,182,212,0.2)')
                : (isDark ? 'rgba(100,116,139,0.2)' : 'rgba(100,116,139,0.15)')}`,
            }}
          >
            {data.hasTrendsData ? '📶 Trends ao vivo' : '📊 Estimativa'}
          </span>

          {/* Refresh button */}
          <button
            onClick={fetchData}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: 'transparent',
              border: `1px solid ${border}`,
              color: textMuted,
            }}
            aria-label="Atualizar radar"
            title="Atualizar radar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M8 16H3v5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="grid lg:grid-cols-[1fr_272px] gap-6">
          {/* Radar Chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={chartData} margin={{ top: 10, right: 16, bottom: 10, left: 16 }}>
                <PolarGrid
                  stroke={gridColor}
                  strokeDasharray="3 3"
                />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{
                    fontSize: 11,
                    fill: axisColor,
                    fontWeight: 500,
                  }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: axisColor }}
                  tickCount={4}
                  stroke={gridColor}
                />
                {/* Exogenous — dashed cyan stroke, no fill */}
                <Radar
                  name="Demanda (Trends)"
                  dataKey="exogenous"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  strokeDasharray="5 2"
                  fill="transparent"
                  dot={{ r: 3, fill: '#22d3ee', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#22d3ee' }}
                />
                {/* Endogenous — filled indigo area */}
                <Radar
                  name="Suas campanhas"
                  dataKey="endogenous"
                  stroke="#818cf8"
                  strokeWidth={2}
                  fill="rgba(129,140,248,0.22)"
                  dot={{ r: 3, fill: '#818cf8', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#818cf8' }}
                />
                <Tooltip
                  content={<CustomTooltip isDark={isDark} />}
                  cursor={false}
                />
              </RadarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <RadarLegend isDark={isDark} />
          </div>

          {/* Quadrant panel */}
          <QuadrantPanel data={data} isDark={isDark} />
        </div>

        {/* Footer: generation time + cache info */}
        <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: `1px solid ${border}` }}>
          <p className="text-xs" style={{ color: textMuted }}>
            Atualizado {generatedDate}
            {data.fromCache && <span className="ml-1 opacity-60">(cache)</span>}
          </p>
          {!data.hasTrendsData && (
            <p className="text-xs" style={{ color: textMuted }}>
              * Google Trends indisponível — usando estimativas internas
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
