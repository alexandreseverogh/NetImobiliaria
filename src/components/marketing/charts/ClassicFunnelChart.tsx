'use client';

import { motion } from 'framer-motion';
import type { FunnelData } from '@/lib/marketing-api';

interface Props {
  funnelData: FunnelData;
  leadCount: number;
  isDark: boolean;
}

const STAGES = [
  {
    label: 'Impressões', sub: 'Alcance total',
    icon: '👁️',
    light: { fill: '#6366f1', badge: 'bg-indigo-50 border-indigo-200 text-indigo-900', bar: 'bg-indigo-500' },
    dark:  { fill: '#818cf8', badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200', bar: 'bg-indigo-400' },
    conv: null,
  },
  {
    label: 'Cliques', sub: 'Visitantes',
    icon: '🖱️',
    light: { fill: '#7c3aed', badge: 'bg-violet-50 border-violet-200 text-violet-900', bar: 'bg-violet-500' },
    dark:  { fill: '#a78bfa', badge: 'bg-violet-500/10 border-violet-500/20 text-violet-200', bar: 'bg-violet-400' },
    conv: 'CTR',
  },
  {
    label: 'Leads', sub: 'Contatos captados',
    icon: '📞',
    light: { fill: '#ea580c', badge: 'bg-orange-50 border-orange-200 text-orange-900', bar: 'bg-orange-500' },
    dark:  { fill: '#fb923c', badge: 'bg-orange-500/10 border-orange-500/20 text-orange-200', bar: 'bg-orange-400' },
    conv: 'Lead Rate',
  },
  {
    label: 'Conversões', sub: 'Negócios fechados',
    icon: '🏠',
    light: { fill: '#059669', badge: 'bg-emerald-50 border-emerald-200 text-emerald-900', bar: 'bg-emerald-500' },
    dark:  { fill: '#34d399', badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200', bar: 'bg-emerald-400' },
    conv: 'Tx. Fechamento',
  },
];

function fmt(n: number): string {
  if (n <= 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('pt-BR');
}

function rateColor(r: number) {
  if (r <= 0)  return 'text-slate-400';
  if (r < 1)   return 'text-red-400';
  if (r < 5)   return 'text-amber-400';
  return 'text-emerald-400';
}

// SVG funnel coordinates — viewBox 0 0 220 240
// 4 trapezoids sharing edges, linear taper 220→20px
const H = 60; // segment height
const SEGS = [
  { y: 0,       xl: 0,   xr: 220 },
  { y: H,       xl: 25,  xr: 195 },
  { y: H * 2,   xl: 50,  xr: 170 },
  { y: H * 3,   xl: 80,  xr: 140 },
  { y: H * 4,   xl: 100, xr: 120 },
];

function poly(i: number) {
  const t = SEGS[i], b = SEGS[i + 1];
  return `${t.xl},${t.y} ${t.xr},${t.y} ${b.xr},${b.y} ${b.xl},${b.y}`;
}

const SVG_W = 220;
const SVG_H = H * 4;

export function ClassicFunnelChart({ funnelData, leadCount, isDark }: Props) {
  const values = [funnelData.impressions, funnelData.clicks, leadCount, funnelData.conversions];
  const top    = values[0] || 1;

  const rates = [
    0,
    values[0] > 0 ? (values[1] / values[0]) * 100 : 0,
    values[1] > 0 ? (values[2] / values[1]) * 100 : 0,
    values[2] > 0 ? (values[3] / values[2]) * 100 : 0,
  ];

  const cardCls = isDark
    ? 'bg-[rgba(13,20,33,0.92)] backdrop-blur-sm border border-[rgba(255,255,255,0.07)] shadow-[0_2px_16px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.03)]'
    : 'bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]';

  const tx      = isDark ? 'text-slate-100' : 'text-slate-900';
  const txFaint = isDark ? 'text-slate-600' : 'text-slate-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className={`mt-5 rounded-2xl p-6 ${cardCls}`}
    >
      <div className="flex items-baseline gap-2 mb-5">
        <h3 className={`text-sm font-black ${tx}`}>Funil Clássico de Conversão</h3>
        <span className={`text-[9px] font-black uppercase tracking-wide ${txFaint}`}>
          Impressões → Cliques → Leads → Conversões
        </span>
      </div>

      <div className="flex gap-8 items-start">

        {/* ── SVG funnel (visual puro) ── */}
        <div className="shrink-0">
          <svg
            width={SVG_W}
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            fill="none"
            style={{ filter: isDark ? 'drop-shadow(0 4px 24px rgba(0,0,0,0.6))' : 'drop-shadow(0 4px 16px rgba(0,0,0,0.15))' }}
          >
            {[0, 1, 2, 3].map(i => (
              <g key={i}>
                {/* Trapézio colorido */}
                <polygon
                  points={poly(i)}
                  fill={isDark ? STAGES[i].dark.fill : STAGES[i].light.fill}
                />
                {/* Brilho superior (highlight) */}
                <polygon
                  points={poly(i)}
                  fill="url(#shine)"
                  opacity={isDark ? 0.06 : 0.12}
                />
                {/* Linha divisória branca */}
                {i > 0 && (
                  <line
                    x1={SEGS[i].xl} y1={SEGS[i].y}
                    x2={SEGS[i].xr} y2={SEGS[i].y}
                    stroke="white" strokeWidth="2" strokeOpacity={isDark ? 0.2 : 0.4}
                  />
                )}
                {/* Ícone + label centrados */}
                <text
                  x={SVG_W / 2} y={SEGS[i].y + H / 2 - 5}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="12" fontWeight="800"
                  style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}
                  opacity="0.95"
                >
                  {STAGES[i].label}
                </text>
                <text
                  x={SVG_W / 2} y={SEGS[i].y + H / 2 + 12}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize="11" fontWeight="600"
                  style={{ fontFamily: 'ui-monospace,monospace' }}
                  opacity="0.75"
                >
                  {fmt(values[i])}
                </text>
              </g>
            ))}

            {/* Gradiente de brilho no topo */}
            <defs>
              <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="white" stopOpacity="1" />
                <stop offset="60%"  stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* ── Painel de métricas (alinhado verticalmente com o SVG) ── */}
        <div
          className="flex-1 min-w-0 flex flex-col justify-between"
          style={{ height: SVG_H }}
        >
          {STAGES.map((s, i) => {
            const val  = values[i];
            const pct  = (val / top) * 100;
            const rate = rates[i];
            const th   = isDark ? s.dark : s.light;

            return (
              <div key={i} className="flex flex-col justify-center flex-1">
                {/* Taxa de conversão entre estágios */}
                {i > 0 && s.conv && (
                  <div className={`flex items-center gap-1 text-[9px] font-bold ml-1 mb-0.5 ${rateColor(rate)}`}>
                    <svg width="7" height="9" viewBox="0 0 7 9" fill="none">
                      <path d="M3.5 0v8M1 5.5l2.5 3 2.5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {s.conv}: {rate.toFixed(2)}%
                  </div>
                )}

                {/* Card do estágio */}
                <div className={`rounded-xl border px-2.5 py-1.5 ${th.badge}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm shrink-0">{s.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black leading-tight truncate">{s.label}</p>
                        <p className="text-[8px] opacity-55 leading-tight truncate">{s.sub}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black tabular-nums">{fmt(val)}</p>
                      {i > 0 && (
                        <p className="text-[8px] opacity-50 tabular-nums">
                          {pct >= 0.001 ? pct.toFixed(pct < 1 ? 3 : 1) + '%' : '<0.001%'} do topo
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Barra proporcional */}
                  <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/8'}`}>
                    <div
                      className={`h-full rounded-full ${th.bar}`}
                      style={{ width: `${Math.max(pct, val > 0 ? 1.5 : 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </motion.div>
  );
}
