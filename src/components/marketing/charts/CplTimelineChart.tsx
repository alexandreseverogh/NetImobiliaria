'use client';

import { useState, useEffect } from 'react';
import { ResponsiveLine } from '@nivo/line';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CplPoint {
  date: string;
  spend: number;
  leads: number;
  cpl: number;
}

interface Props {
  data: CplPoint[];
  isDark: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 5 }}>
      <span style={{ opacity: 0.5, fontSize: 11 }}>{label}</span>
      <span style={{ fontWeight: 700, color, fontSize: 12 }}>{value}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CplTimelineChart({ data, isDark }: Props) {
  // ── Derived stats ────────────────────────────────────────────────────────
  // ── SSR guard: Nivo usa ResizeObserver (browser-only) ───────────────────
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const withLeads = data.filter(d => d.leads > 0 && d.cpl > 0);
  const bestDay   = withLeads.length > 0
    ? withLeads.reduce((b, d) => d.cpl < b.cpl ? d : b, withLeads[0])
    : null;
  const avgCpl  = withLeads.length > 0
    ? withLeads.reduce((s, d) => s + d.cpl, 0) / withLeads.length
    : null;
  const totalLeads = data.reduce((s, d) => s + d.leads, 0);
  const maxLeads   = Math.max(...data.map(d => d.leads), 1);

  // ── Colours ──────────────────────────────────────────────────────────────
  const cplColor  = isDark ? '#818cf8' : '#6366f1';  // indigo
  const leadColor = isDark ? '#34d399' : '#059669';  // emerald
  const bestColor = isDark ? '#fbbf24' : '#d97706';  // amber
  const avgColor  = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.09)';
  const textFaint = isDark ? '#94a3b8' : '#64748b';

  // ── Nivo data ─────────────────────────────────────────────────────────────
  const lineData = [{
    id: 'cpl',
    data: data.map(d => ({
      x:     d.date,
      y:     d.cpl > 0 ? d.cpl : null,
      leads: d.leads,
      spend: d.spend,
    })),
  }];

  // ── Nivo theme ─────────────────────────────────────────────────────────────
  const nivoTheme = {
    background: 'transparent',
    axis: {
      domain: { line: { stroke: 'transparent' } },
      ticks: {
        line: { stroke: 'transparent' },
        text: { fill: textFaint, fontSize: 11, fontFamily: 'system-ui,-apple-system,sans-serif' },
      },
    },
    grid: {
      line: { stroke: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9', strokeWidth: 1 },
    },
    crosshair: {
      line: {
        stroke:          isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.15)',
        strokeWidth:     1,
        strokeDasharray: '4 4',
      },
    },
  };

  // ── Custom slice tooltip ──────────────────────────────────────────────────
  function SliceTooltip({ slice }: any) {
    const pt     = slice.points[0];
    const cpl    = pt.data.y as number;
    const leads  = (pt.data as any).leads  as number ?? 0;
    const spend  = (pt.data as any).spend  as number ?? 0;
    const isBest = bestDay && pt.data.x === bestDay.date;
    return (
      <div style={{
        background:   isDark ? '#0d1421' : '#ffffff',
        border:       `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0'}`,
        borderRadius: 14,
        padding:      '10px 14px',
        color:        isDark ? '#cbd5e1' : '#0f172a',
        boxShadow:    isDark ? '0 8px 32px rgba(0,0,0,0.55)' : '0 4px 16px rgba(0,0,0,0.1)',
        minWidth:     168,
      }}>
        <p style={{ fontWeight: 700, marginBottom: 10, color: textFaint, fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {pt.data.x}
        </p>
        <Row label="CPL"   value={`R$ ${cpl.toFixed(2)}`}       color={cplColor}                           />
        <Row label="Leads" value={String(leads)}                  color={leadColor}                          />
        <Row label="Gasto" value={`R$ ${spend.toFixed(2)}`}      color={isDark ? '#94a3b8' : '#64748b'}    />
        {avgCpl && (
          <Row label="vs Média" value={`${cpl < avgCpl ? '▼' : '▲'} R$ ${Math.abs(cpl - avgCpl).toFixed(2)}`}
            color={cpl < avgCpl ? leadColor : isDark ? '#f87171' : '#dc2626'} />
        )}
        {isBest && (
          <div style={{
            marginTop: 10, padding: '4px 10px', borderRadius: 8,
            background: isDark ? 'rgba(251,191,36,0.12)' : '#fffbeb',
            color: bestColor, fontSize: 10, fontWeight: 800, textAlign: 'center', letterSpacing: '0.06em',
          }}>
            🏆 MELHOR DIA DO PERÍODO
          </div>
        )}
      </div>
    );
  }

  // ── Custom layer: lead bars (eixo Y direito, escala própria) ────────────────
  function LeadBarsLayer({ series, xScale, innerHeight }: any) {
    const pts        = (series[0]?.data ?? []) as any[];
    const pointCount = pts.length;
    if (pointCount === 0) return null;

    // Largura de cada barra: ocupa ~55% do espaço entre pontos
    const totalWidth = xScale.range ? xScale.range()[1] - xScale.range()[0] : 0;
    const barWidth   = pointCount > 1 ? Math.max(4, (totalWidth / pointCount) * 0.55) : 20;

    return (
      <g>
        {pts.map((p: any, i: number) => {
          const leads = p.data.leads ?? 0;
          if (!leads) return null;

          const barH  = Math.max(2, (leads / maxLeads) * innerHeight * 0.42); // max 42% da altura
          const cx    = xScale(p.data.x);
          const barX  = cx - barWidth / 2;
          const barY  = innerHeight - barH;

          return (
            <g key={i}>
              {/* Barra preenchida */}
              <rect
                x={barX} y={barY}
                width={barWidth} height={barH}
                fill={leadColor}
                opacity={0.22}
                rx={2}
              />
              {/* Contorno sutil */}
              <rect
                x={barX} y={barY}
                width={barWidth} height={barH}
                fill="none"
                stroke={leadColor}
                strokeWidth={1}
                opacity={0.45}
                rx={2}
              />
              {/* Label de leads no topo da barra (só se cabe) */}
              {barH > 16 && (
                <text
                  x={cx} y={barY - 4}
                  textAnchor="middle"
                  fill={leadColor}
                  fontSize={9}
                  fontWeight={800}
                  opacity={0.85}
                >
                  {leads}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  }

  // ── Custom layer: eixo Y direito para leads ───────────────────────────────
  function LeadAxisRightLayer({ innerHeight, innerWidth }: any) {
    if (maxLeads <= 1) return null;
    // Ticks: 0, metade, máximo
    const ticks = [0, Math.round(maxLeads / 2), maxLeads];
    return (
      <g>
        {ticks.map((val, i) => {
          const y = innerHeight - (val / maxLeads) * innerHeight * 0.42;
          return (
            <g key={i}>
              <line
                x1={innerWidth + 4} y1={y}
                x2={innerWidth + 8} y2={y}
                stroke={leadColor} strokeWidth={1} opacity={0.4}
              />
              <text
                x={innerWidth + 12} y={y + 4}
                fill={leadColor}
                fontSize={9}
                fontWeight={600}
                opacity={0.7}
              >
                {val}
              </text>
            </g>
          );
        })}
        {/* Label do eixo */}
        <text
          x={innerWidth + 28} y={innerHeight * 0.78}
          fill={leadColor}
          fontSize={8}
          fontWeight={800}
          opacity={0.5}
          textAnchor="middle"
          transform={`rotate(90, ${innerWidth + 28}, ${innerHeight * 0.78})`}
          style={{ letterSpacing: '0.08em', textTransform: 'uppercase' } as React.CSSProperties}
        >
          leads
        </text>
      </g>
    );
  }

  // ── Custom layer: average CPL dashed line ─────────────────────────────────
  function AvgCplLayer({ yScale, innerWidth }: any) {
    if (!avgCpl) return null;
    const y = yScale(avgCpl);
    return (
      <g>
        <line x1={0} y1={y} x2={innerWidth} y2={y}
          stroke={avgColor} strokeWidth={1} strokeDasharray="5 4" />
        <text x={innerWidth + 5} y={y + 4}
          fill={textFaint} fontSize={9} fontWeight={700}>
          Média
        </text>
      </g>
    );
  }

  // ── Custom layer: best day annotation ────────────────────────────────────
  function BestDayLayer({ series, xScale, yScale }: any) {
    if (!bestDay) return null;
    const pts = (series[0]?.data ?? []) as any[];
    const pt  = pts.find((p: any) => p.data.x === bestDay.date);
    if (!pt || pt.data.y == null) return null;
    const cx = xScale(pt.data.x);
    const cy = yScale(pt.data.y);
    return (
      <g>
        {/* Outer glow ring */}
        <circle cx={cx} cy={cy} r={16}
          fill={isDark ? 'rgba(251,191,36,0.08)' : 'rgba(217,119,6,0.06)'}
          stroke={bestColor} strokeWidth={1.5} strokeDasharray="3 2.5" />
        {/* Label above */}
        <text x={cx} y={cy - 24} textAnchor="middle"
          fill={bestColor} fontSize={8.5} fontWeight={900} letterSpacing="0.07em">
          BEST
        </text>
      </g>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (data.every(d => d.cpl === 0)) {
    return (
      <div style={{ height: 264, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: isDark ? '#475569' : '#94a3b8' }}>
          CPL disponível após captura de leads
        </p>
      </div>
    );
  }

  // ── Loading skeleton (SSR pass) ───────────────────────────────────────────
  if (!mounted) {
    return (
      <div style={{ height: 284 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          {[80, 96, 60].map((w, i) => (
            <div key={i} style={{ height: 16, width: w, borderRadius: 8,
              background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }} />
          ))}
        </div>
        <div style={{ height: 240, borderRadius: 12,
          background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
          animation: 'pulse 2s infinite' }} />
      </div>
    );
  }

  // ── Mini stats bar ────────────────────────────────────────────────────────
  const pill: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 10, color: isDark ? '#64748b' : '#94a3b8',
  };

  return (
    <div>
      {/* ── Stat pills ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        {avgCpl != null && (
          <div style={pill}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cplColor, flexShrink: 0 }} />
            <span>Média</span>
            <span style={{ fontWeight: 900, color: cplColor, fontVariantNumeric: 'tabular-nums' }}>R$ {avgCpl.toFixed(2)}</span>
          </div>
        )}
        {bestDay && (
          <div style={pill}>
            <span>🏆</span>
            <span>Melhor</span>
            <span style={{ fontWeight: 900, color: bestColor, fontVariantNumeric: 'tabular-nums' }}>R$ {bestDay.cpl.toFixed(2)}</span>
          </div>
        )}
        {totalLeads > 0 && (
          <div style={pill}>
            {/* Ícone de barra para representar a série de leads no gráfico */}
            <span style={{
              width: 8, height: 10, borderRadius: 2,
              backgroundColor: leadColor, opacity: 0.7, flexShrink: 0,
              display: 'inline-block',
            }} />
            <span>Leads</span>
            <span style={{ fontWeight: 900, color: leadColor, fontVariantNumeric: 'tabular-nums' }}>{totalLeads}</span>
          </div>
        )}
      </div>

      {/* ── Chart ── */}
      <div style={{ height: 240, position: 'relative' }}>
        <ResponsiveLine
          data={lineData}
          theme={nivoTheme}
          margin={{ top: 24, right: 72, bottom: 42, left: 56 }}
          xScale={{ type: 'point' }}
          yScale={{ type: 'linear', min: 0, max: 'auto' }}
          curve="monotoneX"
          enableArea
          areaOpacity={isDark ? 0.14 : 0.09}
          enableSlices="x"
          enableCrosshair
          crosshairType="x"
          sliceTooltip={SliceTooltip}
          colors={[cplColor]}
          lineWidth={2.5}
          enablePoints
          pointSize={5}
          pointColor={cplColor}
          pointBorderWidth={0}
          enableGridX={false}
          enableGridY
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize:     0,
            tickPadding:  12,
            tickRotation: data.length > 10 ? -35 : 0,
          }}
          axisLeft={{
            tickSize:    0,
            tickPadding: 12,
            tickValues:  5,
            format:      (v: number) => `R$${v.toFixed(0)}`,
          }}
          defs={[{
            id:   'cpl-gradient',
            type: 'linearGradient',
            colors: [
              { offset: 0,   color: cplColor, opacity: isDark ? 0.5 : 0.35 },
              { offset: 100, color: cplColor, opacity: 0 },
            ],
            x1: 0, y1: 0, x2: 0, y2: 1,
          }]}
          fill={[{ match: { id: 'cpl' }, id: 'cpl-gradient' }]}
          layers={[
            'grid',
            'markers',
            'axes',
            'areas',
            LeadBarsLayer,
            AvgCplLayer,
            BestDayLayer,
            'lines',
            'slices',
            'points',
            'mesh',
            LeadAxisRightLayer,
          ]}
          animate
          motionConfig="gentle"
        />
      </div>
    </div>
  );
}
