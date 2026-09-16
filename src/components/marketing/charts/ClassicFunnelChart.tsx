'use client';

import { motion } from 'framer-motion';
import type { FunnelData } from '@/lib/marketing-api';

interface Props {
  funnelData: FunnelData;
  leadCount: number;
  isDark: boolean;
  periodLabel?: string;
  className?: string;
}

const STAGES = [
  {
    label: 'Impressões', sub: 'Alcance total', icon: '👁️',
    light: { fill: '#6366f1', badge: 'bg-indigo-50 border-indigo-200 text-indigo-900', bar: 'bg-indigo-400', num: 'text-indigo-700' },
    dark:  { fill: '#818cf8', badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200', bar: 'bg-indigo-400', num: 'text-indigo-300' },
    conv: null,
  },
  {
    label: 'Cliques', sub: 'Visitantes', icon: '🖱️',
    light: { fill: '#7c3aed', badge: 'bg-violet-50 border-violet-200 text-violet-900', bar: 'bg-violet-400', num: 'text-violet-700' },
    dark:  { fill: '#a78bfa', badge: 'bg-violet-500/10 border-violet-500/20 text-violet-200', bar: 'bg-violet-400', num: 'text-violet-300' },
    conv: 'CTR',
  },
  {
    label: 'Leads', sub: 'Contatos captados', icon: '📞',
    light: { fill: '#ea580c', badge: 'bg-orange-50 border-orange-200 text-orange-900', bar: 'bg-orange-400', num: 'text-orange-700' },
    dark:  { fill: '#fb923c', badge: 'bg-orange-500/10 border-orange-500/20 text-orange-200', bar: 'bg-orange-400', num: 'text-orange-300' },
    conv: 'Lead Rate',
  },
  {
    label: 'Conversões', sub: 'Negócios fechados', icon: '🏠',
    light: { fill: '#059669', badge: 'bg-emerald-50 border-emerald-200 text-emerald-900', bar: 'bg-emerald-400', num: 'text-emerald-700' },
    dark:  { fill: '#34d399', badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200', bar: 'bg-emerald-400', num: 'text-emerald-300' },
    conv: 'Tx. Fechamento',
  },
];

function fmt(n?: number | null): string {
  if (n === undefined || n === null || isNaN(n) || n <= 0) return '—';
  if (n >= 1_000_000)  return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)      return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('pt-BR');
}

function rateColor(r: number, isDark: boolean) {
  if (r <= 0) return isDark ? 'text-slate-500'   : 'text-slate-400';
  if (r < 1)  return isDark ? 'text-red-400'     : 'text-red-500';
  if (r < 5)  return isDark ? 'text-amber-400'   : 'text-amber-500';
  return isDark ? 'text-emerald-400' : 'text-emerald-600';
}

/* ──────────────────────────────────────────────────────────────
   SVG FUNNEL — viewBox 0 0 300 320
   Taper gentle: 300px → 84px (bottom), cada segmento = 80px
────────────────────────────────────────────────────────────── */
const H    = 80;   // altura por segmento
const W    = 300;  // largura total

// Vértices calculados para um funil com taper suave
const SEGS = [
  { y: 0,       xl: 0,   xr: W      },   // 300 wide
  { y: H,       xl: 28,  xr: W - 28 },   // 244 wide
  { y: H * 2,   xl: 63,  xr: W - 63 },   // 174 wide
  { y: H * 3,   xl: 99,  xr: W - 99 },   // 102 wide
  { y: H * 4,   xl: 108, xr: W - 108},   //  84 wide (bottom edge)
];
const SVG_H = H * 4;

function poly(i: number) {
  const t = SEGS[i], b = SEGS[i + 1];
  return `${t.xl},${t.y} ${t.xr},${t.y} ${b.xr},${b.y} ${b.xl},${b.y}`;
}

// Largura média de cada segmento (para tamanho de fonte adaptativo)
function segMidW(i: number): number {
  return ((SEGS[i].xr - SEGS[i].xl) + (SEGS[i + 1].xr - SEGS[i + 1].xl)) / 2;
}

export function ClassicFunnelChart({ funnelData, leadCount, isDark, periodLabel, className }: Props) {
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

  const tx      = isDark ? 'text-slate-300' : 'text-slate-900';
  const txFaint = isDark ? 'text-slate-500' : 'text-slate-400';
  const divider = isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-100';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className={`${className ?? 'mt-5'} rounded-2xl p-6 ${cardCls}`}
    >
      {/* ── Cabeçalho ── */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-baseline gap-3">
          <h3 className={`text-sm font-black ${tx}`}>Funil do Ciclo de Conversão em Vendas</h3>
          <span className={`text-[9px] font-semibold uppercase tracking-wider ${txFaint}`}>
            Impressões → Cliques → Leads → Conversões
          </span>
        </div>
        {periodLabel && (
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shrink-0 ${
            isDark
              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
              : 'bg-indigo-50 text-indigo-500 border border-indigo-100'
          }`}>
            {periodLabel}
          </span>
        )}
      </div>
      {/* "Conversões" vem de Insight.conversions — número bruto que a conta de anúncios (Meta OU
          Google) reporta pra qualquer ação de conversão configurada lá, não necessariamente o
          mesmo "Lead" (WhatsApp/formulário) do restante da plataforma. Confirmado ao vivo:
          2 campanhas Meta com 0 leads reais mostravam 427 "conversões" nesta mesma etapa —
          mesma ambiguidade já sinalizada só pro Google em GoogleAdsView.tsx, generalizada aqui
          pra ambas as redes. */}
      <p className={`text-[10px] font-semibold leading-relaxed mb-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
        ⚠️ "Conversões" reflete a ação de conversão configurada na conta de anúncios (Meta ou
        Google) — pode não ser o mesmo "Lead" identificado no resto da plataforma.
      </p>

      {/* ── Layout: SVG (≈45%) + Métricas (≈55%) ── */}
      <div className="flex gap-8 items-stretch min-h-0">

        {/* ── Funil SVG ── */}
        <div className="shrink-0 flex items-center justify-center" style={{ width: 300 }}>
          <svg
            width={W}
            height={SVG_H}
            viewBox={`0 0 ${W} ${SVG_H}`}
            fill="none"
            style={{
              filter: isDark
                ? 'drop-shadow(0 6px 32px rgba(0,0,0,0.7))'
                : 'drop-shadow(0 6px 20px rgba(0,0,0,0.18))',
            }}
          >
            <defs>
              <linearGradient id="funnel-shine" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="white" stopOpacity="0.18" />
                <stop offset="55%" stopColor="white" stopOpacity="0" />
              </linearGradient>
              {/* Sombra forte para legibilidade do texto em qualquer fundo */}
              <filter id="txt-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="2.5"
                  floodColor="#000000" floodOpacity="0.70" />
              </filter>
            </defs>

            {[0, 1, 2, 3].map(i => {
              const mw    = segMidW(i);
              const fLbl  = mw >= 160 ? 14 : mw >= 110 ? 13 : mw >= 75 ? 12 : 11;
              const fVal  = mw >= 160 ? 12 : mw >= 110 ? 11 : mw >= 75 ? 10 : 9;
              const yMid  = SEGS[i].y + H / 2;

              return (
                <g key={i}>
                  {/* Trapézio colorido */}
                  <polygon
                    points={poly(i)}
                    fill={isDark ? STAGES[i].dark.fill : STAGES[i].light.fill}
                  />
                  {/* Camada de brilho */}
                  <polygon points={poly(i)} fill="url(#funnel-shine)" />
                  {/* Divisória branca entre segmentos */}
                  {i > 0 && (
                    <line
                      x1={SEGS[i].xl} y1={SEGS[i].y}
                      x2={SEGS[i].xr} y2={SEGS[i].y}
                      stroke="white" strokeWidth="2.5"
                      strokeOpacity={isDark ? 0.18 : 0.35}
                    />
                  )}
                  {/* Label (nome do estágio) */}
                  <text
                    x={W / 2} y={yMid - 7}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize={fLbl} fontWeight="800"
                    filter="url(#txt-glow)"
                    style={{ fontFamily: 'system-ui,-apple-system,sans-serif', letterSpacing: '0.01em' }}
                  >
                    {STAGES[i].label}
                  </text>
                  {/* Valor numérico */}
                  <text
                    x={W / 2} y={yMid + 13}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize={fVal} fontWeight="700"
                    filter="url(#txt-glow)"
                    style={{ fontFamily: 'ui-monospace,monospace' }}
                    opacity="0.90"
                  >
                    {fmt(values[i])}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* ── Painel de estágios (alinhado com o SVG) ── */}
        <div
          className="flex-1 min-w-0 flex flex-col gap-0"
          style={{ height: SVG_H }}
        >
          {STAGES.map((s, i) => {
            const val  = values[i];
            const pct  = top > 0 ? (val / top) * 100 : 0;
            const rate = rates[i];
            const th   = isDark ? s.dark : s.light;

            return (
              <div
                key={i}
                className="flex flex-col justify-center flex-1 min-h-0"
                style={{ height: H }}
              >
                {/* Seta de taxa de conversão entre estágios */}
                {i > 0 && s.conv && (
                  <div className={`flex items-center gap-1 text-[10px] font-bold pl-1 mb-1 ${rateColor(rate, isDark)}`}>
                    <svg width="7" height="9" viewBox="0 0 7 9" fill="none">
                      <path d="M3.5 0v8M1 5.5l2.5 3 2.5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {s.conv}: {rate.toFixed(2)}%
                  </div>
                )}

                {/* Card do estágio */}
                <div className={`rounded-xl border px-3 py-2 flex-1 flex flex-col justify-center ${th.badge}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">{s.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black leading-tight">{s.label}</p>
                        <p className={`text-[9px] leading-tight ${isDark ? 'opacity-50' : 'opacity-60'}`}>{s.sub}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-black tabular-nums ${th.num}`}>{fmt(val)}</p>
                      {i > 0 && (
                        <p className={`text-[9px] tabular-nums ${isDark ? 'opacity-50' : 'opacity-60'}`}>
                          {pct >= 0.001 ? pct.toFixed(pct < 1 ? 3 : 1) + '%' : '<0.001%'} do topo
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Barra proporcional ao volume */}
                  <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/8'}`}>
                    <div
                      className={`h-full rounded-full ${th.bar}`}
                      style={{ width: `${Math.max(pct, val > 0 ? 2 : 0)}%`, transition: 'width 0.6s ease' }}
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
