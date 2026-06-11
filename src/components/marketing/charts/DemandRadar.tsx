'use client';

/**
 * FASE 18.2 — DemandRadar (por segmento)
 * Um radar por segmento empilhado. Vértices = ângulos do segmento.
 * Endógeno (campanhas) × exógeno (Google Trends real). ZERO MOCK.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';

// ── Types ──────────────────────────────────────────────────────────────────

type Quadrant = 'oceano-azul' | 'saturado' | 'vigiar' | 'ponto-morto';

interface RadarAngle {
  angle:           string;
  label:           string;
  endogenous:      number;
  exogenous:       number | null;
  quadrant:        Quadrant | null;
  spend?:          number;
  exogenousSource: 'db' | 'unavailable';
}

interface SegmentRadar {
  segmentId:             string;
  segmentName:           string;
  colorTheme:            string | null;
  angles:                RadarAngle[];
  hasTrendsData:         boolean;
  exogenousAvailability: number;
  totalAngles:           number;
  summary: {
    oceanosAzuis: string[];
    saturados:    string[];
    vigiar:       string[];
    pontosMortos: string[];
    semDados:     string[];
  };
}

interface DemandRadarData {
  segments:    SegmentRadar[];
  generatedAt: string;
  periodDays:  number;
}

interface Props {
  isDark?:     boolean;
  clientId?:   string | null;
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
    dark:  { bg: 'rgba(16,185,129,0.08)', border: 'rgba(52,211,153,0.25)', text: '#34d399' },
    light: { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.25)', text: '#059669' },
  },
  saturado: {
    label: 'Saturado', icon: '⚔️',
    dark:  { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)', text: '#f87171' },
    light: { bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.25)', text: '#e11d48' },
  },
  vigiar: {
    label: 'Vigiar', icon: '👁️',
    dark:  { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)', text: '#fbbf24' },
    light: { bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.25)', text: '#d97706' },
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

  const q      = angle.quadrant ? QUADRANT_CONFIG[angle.quadrant] : null;
  const theme  = q ? (isDark ? q.dark : q.light) : null;
  const border = theme?.border ?? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');

  return (
    <div
      className="rounded-xl px-4 py-3 text-sm shadow-2xl"
      style={{
        background: isDark ? 'rgba(7,13,24,0.97)' : '#ffffff',
        border: `1px solid ${border}`,
        backdropFilter: 'blur(12px)', minWidth: 190,
      }}
    >
      <p className="font-semibold mb-2" style={{ color: theme?.text ?? (isDark ? '#e2e8f0' : '#1e293b') }}>
        {angle.label}
      </p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Suas campanhas</span>
          <span style={{ color: '#818cf8' }} className="font-mono font-semibold">{angle.endogenous}</span>
        </div>
        {angle.exogenous !== null ? (
          <div className="flex justify-between gap-4">
            <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Demanda (Trends)</span>
            <span style={{ color: '#22d3ee' }} className="font-mono font-semibold">{angle.exogenous}</span>
          </div>
        ) : (
          <div className="text-xs mt-1" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
            Demanda externa: sem dados ainda
          </div>
        )}
        {angle.spend != null && angle.spend > 0 && (
          <div className="flex justify-between gap-4 pt-1 border-t" style={{ borderColor: border }}>
            <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Investido</span>
            <span style={{ color: isDark ? '#e2e8f0' : '#1e293b' }} className="font-mono font-semibold">
              R$ {angle.spend.toFixed(2)}
            </span>
          </div>
        )}
      </div>
      {q && angle.quadrant && (
        <p className="mt-2 text-xs px-2 py-0.5 rounded-full inline-block"
          style={{ background: theme!.bg, color: theme!.text, border: `1px solid ${theme!.border}` }}>
          {q.icon} {q.label}
        </p>
      )}
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────

function RadarLegend({ isDark, hasExogenous }: { isDark: boolean; hasExogenous: boolean }) {
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  return (
    <div className={`flex flex-wrap items-center justify-center gap-5 text-xs ${textMuted} mt-1`}>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'rgba(129,140,248,0.35)', border: '1.5px solid #818cf8' }} />
        Suas campanhas (endógeno)
      </span>
      {hasExogenous && (
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-10 h-0.5 relative">
            <span className="absolute inset-0" style={{
              background: 'repeating-linear-gradient(90deg,#22d3ee 0,#22d3ee 5px,transparent 5px,transparent 7px)',
            }} />
          </span>
          Demanda Google Trends (exógeno)
        </span>
      )}
    </div>
  );
}

// ── Quadrant panel (de um segmento) ──────────────────────────────────────────

function QuadrantPanel({ seg, isDark }: { seg: SegmentRadar; isDark: boolean }) {
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const order: Quadrant[] = ['oceano-azul', 'saturado', 'vigiar', 'ponto-morto'];
  const byQuadrant = Object.fromEntries(
    order.map(q => [q, seg.angles.filter(a => a.quadrant === q)]),
  ) as Record<Quadrant, RadarAngle[]>;
  const hasAny = order.some(q => byQuadrant[q].length > 0);

  if (!hasAny) {
    return (
      <div className="rounded-xl p-4 flex flex-col items-center justify-center text-center h-full"
        style={{
          background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
          border: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
          minHeight: 160,
        }}>
        <span className="text-2xl mb-2">📡</span>
        <p className="text-sm font-medium" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
          Quadrantes após sincronização
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {order.map((q, idx) => {
        const angles = byQuadrant[q];
        if (angles.length === 0) return null;
        const cfg = QUADRANT_CONFIG[q];
        const theme = isDark ? cfg.dark : cfg.light;
        return (
          <motion.div key={q}
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.05 }}
            className="rounded-xl p-3" style={{ background: theme.bg, border: `1px solid ${theme.border}` }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{cfg.icon}</span>
              <span className="text-xs font-semibold tracking-wide" style={{ color: theme.text }}>{cfg.label}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {angles.map(a => (
                <span key={a.angle} className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)',
                    color: isDark ? '#e2e8f0' : '#1e293b', border: `1px solid ${theme.border}`,
                  }}>
                  {a.label}
                </span>
              ))}
            </div>
          </motion.div>
        );
      })}
      <div className="rounded-xl p-3 mt-1"
        style={{
          background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
        }}>
        <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Legenda</p>
        <div className="space-y-1.5 text-xs">
          {order.map(q => {
            const cfg = QUADRANT_CONFIG[q];
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

// ── Bloco de um segmento ─────────────────────────────────────────────────────

function SegmentRadarBlock({ seg, isDark }: { seg: SegmentRadar; isDark: boolean }) {
  const textPrimary = isDark ? '#e2e8f0' : '#1e293b';
  const textMuted   = isDark ? '#64748b' : '#94a3b8';
  const gridColor   = isDark ? 'rgba(255,255,255,0.07)' : '#cbd5e1';
  const axisColor   = isDark ? '#334155' : '#64748b';

  const chartData = seg.angles.map(a => ({
    ...a,
    exogenousPlot: a.exogenous !== null ? a.exogenous : undefined,
  }));

  const labelColorMap = new Map<string, string>(
    seg.angles.map(a => {
      if (!a.quadrant) return [a.label, axisColor];
      const cfg = QUADRANT_CONFIG[a.quadrant];
      return [a.label, isDark ? cfg.dark.text : cfg.light.text];
    }),
  );

  const hasExo = seg.hasTrendsData;
  const exoLabel = seg.exogenousAvailability === seg.totalAngles && seg.totalAngles > 0
    ? '📶 Trends ao vivo'
    : seg.exogenousAvailability > 0
      ? `📶 ${seg.exogenousAvailability}/${seg.totalAngles} ângulos`
      : '⏳ Aguardando cron';

  return (
    <div className="py-2">
      {/* Cabeçalho do segmento */}
      <div className="flex items-center justify-between gap-3 mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: seg.colorTheme ?? '#818cf8' }} />
          <h4 className="font-bold text-sm" style={{ color: textPrimary }}>{seg.segmentName}</h4>
          <span className="text-xs" style={{ color: textMuted }}>· {seg.totalAngles} ângulos</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{
            background: hasExo ? (isDark ? 'rgba(34,211,238,0.12)' : 'rgba(6,182,212,0.08)')
                              : (isDark ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.08)'),
            color: hasExo ? (isDark ? '#22d3ee' : '#0891b2') : (isDark ? '#fbbf24' : '#b45309'),
            border: `1px solid ${hasExo ? (isDark ? 'rgba(34,211,238,0.25)' : 'rgba(6,182,212,0.2)')
                                        : (isDark ? 'rgba(251,191,36,0.2)' : 'rgba(251,191,36,0.25)')}`,
          }}>
          {exoLabel}
        </span>
      </div>

      <div className="grid lg:grid-cols-[1fr_272px] gap-6">
        <div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={chartData} margin={{ top: 10, right: 16, bottom: 10, left: 16 }}>
              <PolarGrid stroke={gridColor} strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="label"
                tick={({ x, y, textAnchor, payload }: any) => {
                  const label = payload?.value ?? '';
                  const color = labelColorMap.get(label) ?? axisColor;
                  const hasQuadrant = color !== axisColor;
                  return (
                    <text x={x} y={y} textAnchor={textAnchor ?? 'middle'} fill={color}
                      fontSize={11} fontWeight={hasQuadrant ? 600 : 500} style={{ userSelect: 'none' }}>
                      {label}
                    </text>
                  );
                }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tickCount={4} stroke={gridColor} tick={false} axisLine={false} />
              <Radar name="Suas campanhas" dataKey="endogenous"
                stroke="#818cf8" strokeWidth={2} fill="rgba(129,140,248,0.22)"
                dot={{ r: 3, fill: '#818cf8', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#818cf8' }} />
              {hasExo && (
                <Radar name="Demanda (Trends)" dataKey="exogenousPlot"
                  stroke="#22d3ee" strokeWidth={2} strokeDasharray="5 2" fill="transparent"
                  dot={{ r: 3, fill: '#22d3ee', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#22d3ee' }} />
              )}
              <Tooltip content={<CustomTooltip isDark={isDark} />} cursor={false} />
            </RadarChart>
          </ResponsiveContainer>
          <RadarLegend isDark={isDark} hasExogenous={hasExo} />
        </div>
        <QuadrantPanel seg={seg} isDark={isDark} />
      </div>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export function DemandRadar({ isDark = true, clientId, periodDays = 30 }: Props) {
  const [data, setData]       = useState<DemandRadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ periodDays: String(periodDays) });
      if (clientId) params.set('clientId', String(clientId));
      const token = typeof window !== 'undefined' ? (localStorage.getItem('admin_auth_token') ?? '') : '';
      const res = await fetch(`/api/admin/campanhas/dashboard/demand-radar?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar radar');
    } finally {
      setLoading(false);
    }
  }, [clientId, periodDays]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const bg          = isDark ? 'rgba(13,20,33,0.92)' : '#ffffff';
  const border      = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const textPrimary = isDark ? '#e2e8f0' : '#1e293b';
  const textMuted   = isDark ? '#64748b' : '#94a3b8';

  // ── Loading ──
  if (loading) {
    return (
      <div className="rounded-2xl p-6 animate-pulse" style={{ background: bg, border: `1px solid ${border}` }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }} />
          <div className="h-5 w-48 rounded-md" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }} />
        </div>
        <div className="h-64 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }} />
      </div>
    );
  }

  // ── Error ──
  if (error || !data) {
    return (
      <div className="rounded-2xl p-6 flex items-center gap-3" style={{ background: bg, border: '1px solid rgba(248,113,113,0.2)' }}>
        <span className="text-xl">⚠️</span>
        <div>
          <p className="text-sm font-medium" style={{ color: '#f87171' }}>Erro ao carregar Radar de Demanda</p>
          <p className="text-xs mt-0.5" style={{ color: textMuted }}>{error}</p>
          <button onClick={fetchData} className="mt-2 text-xs underline" style={{ color: isDark ? '#818cf8' : '#6366f1' }}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const segments = data.segments ?? [];
  const generatedDate = new Date(data.generatedAt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: bg, border: `1px solid ${border}`,
        boxShadow: isDark ? '0 2px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)'
                          : '0 2px 12px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header da seção */}
      <div className="px-6 py-4 flex items-start justify-between gap-4" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{
              background: isDark ? 'linear-gradient(135deg, rgba(129,140,248,0.2), rgba(34,211,238,0.15))'
                                : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.1))',
              border: `1px solid ${isDark ? 'rgba(129,140,248,0.3)' : 'rgba(99,102,241,0.2)'}`,
            }}>
            📡
          </div>
          <div>
            <h3 className="font-semibold leading-tight" style={{ color: textPrimary, fontSize: 15 }}>
              Radar de Demanda
            </h3>
            <p className="text-xs mt-0.5" style={{ color: textMuted }}>
              Sinais de mercado × presença nas campanhas · por segmento · {data.periodDays}d
            </p>
          </div>
        </div>
        <button onClick={fetchData}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ background: 'transparent', border: `1px solid ${border}`, color: textMuted }}
          aria-label="Atualizar radar" title="Atualizar radar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
        </button>
      </div>

      {/* Corpo: um radar por segmento */}
      <div className="p-6">
        {segments.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: textMuted }}>
            Nenhum segmento com campanhas no escopo atual.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: border }}>
            {segments.map(seg => (
              <SegmentRadarBlock key={seg.segmentId} seg={seg} isDark={isDark} />
            ))}
          </div>
        )}

        <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${border}` }}>
          <p className="text-xs" style={{ color: textMuted }}>Atualizado {generatedDate}</p>
        </div>
      </div>
    </motion.div>
  );
}
