'use client';

/**
 * FASE 18.1 — DemandRadar
 * Radar de Demanda: fusão endógeno × exógeno por ângulo de comunicação.
 * ZERO MOCK — exógeno só aparece quando há dados reais no banco.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────

type Quadrant = 'oceano-azul' | 'saturado' | 'vigiar' | 'ponto-morto';
type ExoSource = 'trends' | 'db' | 'unavailable';

interface RadarAngle {
  angle:            string;
  label:            string;
  endogenous:       number;
  exogenous:        number | null;
  quadrant:         Quadrant | null;
  spend?:           number;
  cpl?:             number;
  exogenousSource:  ExoSource;
}

interface DemandRadarData {
  angles:                 RadarAngle[];
  generatedAt:            string;
  endogenousPeriodDays:   number;
  hasTrendsData:          boolean;
  exogenousAvailability:  number;      // 0-8
  summary: {
    oceanosAzuis: string[];
    saturados:    string[];
    vigiar:       string[];
    pontosMortos: string[];
    semDados:     string[];
  };
  fromCache?: boolean;
}

interface Props {
  isDark?:     boolean;
  tenantId?:   string;
  clientId?:   number;
  periodDays?: number;
}

// ── Quadrant config ────────────────────────────────────────────────────────

const QUADRANT_CONFIG: Record<Quadrant, {
  label: string; icon: string;
  dark:  { bg: string; border: string; text: string };
  light: { bg: string; border: string; text: string };
}> = {
  'oceano-azul': {
    label: 'Oceano Azul', icon: '🌊',
    dark:  { bg: 'rgba(16,185,129,0.08)',   border: 'rgba(52,211,153,0.25)',   text: '#34d399' },
    light: { bg: 'rgba(16,185,129,0.06)',   border: 'rgba(16,185,129,0.25)',   text: '#059669' },
  },
  saturado: {
    label: 'Saturado',    icon: '⚔️',
    dark:  { bg: 'rgba(248,113,113,0.08)',  border: 'rgba(248,113,113,0.25)',  text: '#f87171' },
    light: { bg: 'rgba(248,113,113,0.06)',  border: 'rgba(248,113,113,0.25)',  text: '#e11d48' },
  },
  vigiar: {
    label: 'Vigiar',      icon: '👁️',
    dark:  { bg: 'rgba(251,191,36,0.08)',   border: 'rgba(251,191,36,0.25)',   text: '#fbbf24' },
    light: { bg: 'rgba(251,191,36,0.06)',   border: 'rgba(251,191,36,0.25)',   text: '#d97706' },
  },
  'ponto-morto': {
    label: 'Ponto Morto', icon: '😴',
    dark:  { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', text: '#94a3b8' },
    light: { bg: 'rgba(100,116,139,0.06)', border: 'rgba(100,116,139,0.15)', text: '#64748b' },
  },
};

// ── Tooltip ────────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, isDark }: any) {
  if (!active || !payload?.length) return null;
  const angle = payload[0]?.payload as RadarAngle;
  if (!angle) return null;

  const q     = angle.quadrant ? QUADRANT_CONFIG[angle.quadrant] : null;
  const theme = q ? (isDark ? q.dark : q.light) : null;
  const border = theme?.border ?? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');

  return (
    <div
      className="rounded-xl px-4 py-3 text-sm shadow-2xl"
      style={{
        background: isDark ? 'rgba(7,13,24,0.97)' : '#ffffff',
        border: `1px solid ${border}`,
        backdropFilter: 'blur(12px)',
        minWidth: 190,
      }}
    >
      <p className="font-semibold mb-2" style={{ color: theme?.text ?? (isDark ? '#e2e8f0' : '#1e293b') }}>
        {angle.label}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Suas campanhas</span>
          <span style={{ color: '#818cf8' }} className="font-mono font-semibold">
            {angle.endogenous}
          </span>
        </div>
        {angle.exogenous !== null ? (
          <div className="flex justify-between gap-4">
            <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              Demanda
              <span className="ml-1 text-xs opacity-60">
                ({angle.exogenousSource === 'db' ? 'DB' : 'Trends'})
              </span>
            </span>
            <span style={{ color: '#22d3ee' }} className="font-mono font-semibold">
              {angle.exogenous}
            </span>
          </div>
        ) : (
          <div className="text-xs mt-1" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
            Demanda externa: sem dados ainda
          </div>
        )}
        {angle.cpl != null && angle.cpl > 0 && (
          <div
            className="flex justify-between gap-4 pt-1 border-t"
            style={{ borderColor: border }}
          >
            <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>CPL médio</span>
            <span style={{ color: isDark ? '#e2e8f0' : '#1e293b' }} className="font-mono font-semibold">
              R$ {angle.cpl.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      {q && angle.quadrant && (
        <p
          className="mt-2 text-xs px-2 py-0.5 rounded-full inline-block"
          style={{
            background: isDark ? `${theme!.bg}` : `${theme!.bg}`,
            color: theme!.text,
            border: `1px solid ${theme!.border}`,
          }}
        >
          {q.icon} {q.label}
        </p>
      )}
    </div>
  );
}

// ── Legend row ─────────────────────────────────────────────────────────────

function RadarLegend({ isDark, hasExogenous }: { isDark: boolean; hasExogenous: boolean }) {
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  return (
    <div className={`flex flex-wrap items-center justify-center gap-5 text-xs ${textMuted} mt-1`}>
      <span className="flex items-center gap-1.5">
        <span
          className="inline-block w-3 h-3 rounded-sm"
          style={{ background: 'rgba(129,140,248,0.35)', border: '1.5px solid #818cf8' }}
        />
        Suas campanhas (endógeno)
      </span>
      {hasExogenous && (
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-10 h-0.5 relative">
            <span
              className="absolute inset-0"
              style={{
                background:
                  'repeating-linear-gradient(90deg,#22d3ee 0,#22d3ee 5px,transparent 5px,transparent 7px)',
              }}
            />
          </span>
          Demanda Google Trends (exógeno)
        </span>
      )}
    </div>
  );
}

// ── No-exogenous banner ────────────────────────────────────────────────────

function NoExogenousBanner({ isDark }: { isDark: boolean }) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-start gap-3 text-sm"
      style={{
        background: isDark ? 'rgba(251,191,36,0.06)' : 'rgba(251,191,36,0.05)',
        border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.25)'}`,
      }}
    >
      <span className="text-base mt-px">⏳</span>
      <div>
        <p className="font-medium" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>
          Dados de mercado externo ainda não disponíveis
        </p>
        <p className="text-xs mt-0.5" style={{ color: isDark ? '#92400e' : '#d97706' }}>
          O cron diário (06h BRT) buscará dados reais do Google Trends e populará o radar completo.
          Por enquanto o gráfico exibe apenas sua força interna nas campanhas.
        </p>
      </div>
    </div>
  );
}

// ── Quadrant panel ─────────────────────────────────────────────────────────

function QuadrantPanel({ data, isDark }: { data: DemandRadarData; isDark: boolean }) {
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const orderedQuadrants: Quadrant[] = ['oceano-azul', 'saturado', 'vigiar', 'ponto-morto'];

  const anglesByQuadrant = Object.fromEntries(
    orderedQuadrants.map(q => [
      q,
      data.angles.filter(a => a.quadrant === q),
    ]),
  ) as Record<Quadrant, RadarAngle[]>;

  const hasAnyQuadrant = orderedQuadrants.some(q => anglesByQuadrant[q].length > 0);

  if (!hasAnyQuadrant) {
    return (
      <div
        className="rounded-xl p-4 flex flex-col items-center justify-center text-center h-full"
        style={{
          background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
          border: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
          minHeight: 180,
        }}
      >
        <span className="text-2xl mb-2">📡</span>
        <p className="text-sm font-medium" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
          Quadrantes disponíveis
          <br />
          após sincronização de dados
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orderedQuadrants.map((q, idx) => {
        const angles = anglesByQuadrant[q];
        if (angles.length === 0) return null;
        const cfg   = QUADRANT_CONFIG[q];
        const theme = isDark ? cfg.dark : cfg.light;
        return (
          <motion.div
            key={q}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.06 }}
            className="rounded-xl p-3"
            style={{ background: theme.bg, border: `1px solid ${theme.border}` }}
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
      <div
        className="rounded-xl p-3 mt-1"
        style={{
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
        }}
      >
        <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Legenda
        </p>
        <div className="space-y-1.5 text-xs">
          {orderedQuadrants.map(q => {
            const cfg   = QUADRANT_CONFIG[q];
            const theme = isDark ? cfg.dark : cfg.light;
            return (
              <div key={q} className="flex items-start gap-1.5">
                <span className="mt-px">{cfg.icon}</span>
                <span>
                  <span className="font-medium" style={{ color: theme.text }}>{cfg.label}</span>
                  <span className={`ml-1 ${textMuted}`}>
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
  const [data, setData]       = useState<DemandRadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ periodDays: String(periodDays) });
      if (tenantId) params.set('tenantId', tenantId);
      if (clientId) params.set('clientId', String(clientId));

      const token =
        typeof window !== 'undefined'
          ? (localStorage.getItem('admin_auth_token') ?? '')
          : '';

      const res = await fetch(
        `/api/admin/campanhas/dashboard/demand-radar?${params}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar radar');
    } finally {
      setLoading(false);
    }
  }, [tenantId, clientId, periodDays]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Theme tokens ───────────────────────────────────────────────────────
  const bg          = isDark ? 'rgba(13,20,33,0.92)' : '#ffffff';
  const border      = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textPrimary = isDark ? '#e2e8f0' : '#1e293b';
  const textMuted   = isDark ? '#64748b' : '#94a3b8';
  const gridColor   = isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const axisColor   = isDark ? '#334155' : '#94a3b8'; // slate-700 dark — bem muted

  // ── Chart data — exogenous só quando não nulo ──────────────────────────
  const chartData = data?.angles.map(a => ({
    ...a,
    // recharts precisa de undefined (não null) para não desenhar o ponto
    exogenousPlot: a.exogenous !== null ? a.exogenous : undefined,
  })) ?? [];

  const hasAnyExogenous = data ? data.hasTrendsData : false;
  const exoLabel = data?.exogenousAvailability === 8
    ? '📶 Trends ao vivo'
    : data && data.exogenousAvailability > 0
      ? `📶 ${data.exogenousAvailability}/8 ângulos`
      : null;

  // ── Loading skeleton ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="rounded-2xl p-6 animate-pulse"
        style={{ background: bg, border: `1px solid ${border}` }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }}
          />
          <div
            className="h-5 w-48 rounded-md"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }}
          />
        </div>
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          <div
            className="h-64 rounded-xl"
            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}
          />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-20 rounded-xl"
                style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}
              />
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
        style={{ background: bg, border: '1px solid rgba(248,113,113,0.2)' }}
      >
        <span className="text-xl">⚠️</span>
        <div>
          <p className="text-sm font-medium" style={{ color: '#f87171' }}>
            Erro ao carregar Radar de Demanda
          </p>
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
          {/* Exogenous availability badge */}
          {exoLabel ? (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: isDark ? 'rgba(34,211,238,0.12)' : 'rgba(6,182,212,0.08)',
                color:      isDark ? '#22d3ee' : '#0891b2',
                border:     `1px solid ${isDark ? 'rgba(34,211,238,0.25)' : 'rgba(6,182,212,0.2)'}`,
              }}
            >
              {exoLabel}
            </span>
          ) : (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                background: isDark ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.08)',
                color:      isDark ? '#fbbf24' : '#b45309',
                border:     `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.25)'}`,
              }}
            >
              ⏳ Aguardando cron
            </span>
          )}

          {/* Refresh */}
          <button
            onClick={fetchData}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'transparent', border: `1px solid ${border}`, color: textMuted }}
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
        {/* Banner quando sem exógeno */}
        {!hasAnyExogenous && (
          <div className="mb-5">
            <NoExogenousBanner isDark={isDark} />
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_272px] gap-6">
          {/* Radar Chart */}
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={chartData} margin={{ top: 10, right: 16, bottom: 10, left: 16 }}>
                <PolarGrid stroke={gridColor} strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="label"
                  tick={({ x, y, textAnchor, value }: any) => (
                    <text
                      x={x} y={y}
                      textAnchor={textAnchor}
                      fill={axisColor}
                      fontSize={11}
                      fontWeight={500}
                      style={{ userSelect: 'none' }}
                    >
                      {value}
                    </text>
                  )}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tickCount={4}
                  stroke={gridColor}
                  tick={({ x, y, value }: any) => (
                    <text x={x} y={y} fill={axisColor} fontSize={9} textAnchor="middle">
                      {value}
                    </text>
                  )}
                />

                {/* Endogenous — área violeta */}
                <Radar
                  name="Suas campanhas"
                  dataKey="endogenous"
                  stroke="#818cf8"
                  strokeWidth={2}
                  fill="rgba(129,140,248,0.22)"
                  dot={{ r: 3, fill: '#818cf8', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#818cf8' }}
                />

                {/* Exogenous — linha ciana tracejada (só renderiza se há dados) */}
                {hasAnyExogenous && (
                  <Radar
                    name="Demanda (Trends)"
                    dataKey="exogenousPlot"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    strokeDasharray="5 2"
                    fill="transparent"
                    dot={{ r: 3, fill: '#22d3ee', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#22d3ee' }}
                  />
                )}

                <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={false} />
              </RadarChart>
            </ResponsiveContainer>

            <RadarLegend isDark={isDark} hasExogenous={hasAnyExogenous} />
          </div>

          {/* Quadrant panel */}
          <QuadrantPanel data={data} isDark={isDark} />
        </div>

        {/* Footer */}
        <div
          className="mt-4 pt-3 flex items-center justify-between"
          style={{ borderTop: `1px solid ${border}` }}
        >
          <p className="text-xs" style={{ color: textMuted }}>
            Atualizado {generatedDate}
            {data.fromCache && <span className="ml-1 opacity-60">(cache)</span>}
          </p>
          {hasAnyExogenous && data.exogenousAvailability < 8 && (
            <p className="text-xs" style={{ color: textMuted }}>
              {8 - data.exogenousAvailability} ângulo(s) sem dados Trends ainda
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
