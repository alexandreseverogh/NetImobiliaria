'use client';

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
  const textFaint = isDark ? '#475569' : '#94a3b8';

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
        color:        isDark ? '#f1f5f9' : '#0f172a',
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

  // ── Custom layer: lead bubbles (halos) ────────────────────────────────────
  function LeadBubblesLayer({ series, xScale, yScale }: any) {
    const pts = (series[0]?.data ?? []) as any[];
    return (
      <g>
        {pts.map((p: any, i: number) => {
          const leads = p.data.leads ?? 0;
          if (!leads || p.data.y == null) return null;
          const r  = 6 + (leads / maxLeads) * 18;
          const cx = xScale(p.data.x);
          const cy = yScale(p.data.y);
          return (
            <circle key={i} cx={cx} cy={cy} r={r}
              fill={leadColor} opacity={0.14} />
          );
        })}
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
      <div className="h-[264px] flex items-center justify-center">
        <p className={`text-sm ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          CPL disponível após captura de leads
        </p>
      </div>
    );
  }

  // ── Mini stats bar ────────────────────────────────────────────────────────
  const statCls = (color: string) =>
    `text-[11px] font-black tabular-nums` ;

  return (
    <div>
      {/* ── Stat pills ── */}
      <div className="flex gap-4 mb-3 flex-wrap">
        {avgCpl != null && (
          <div className={`flex items-center gap-1.5 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cplColor }} />
            <span>Média</span>
            <span className={statCls(cplColor)} style={{ color: cplColor }}>R$ {avgCpl.toFixed(2)}</span>
          </div>
        )}
        {bestDay && (
          <div className={`flex items-center gap-1.5 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>🏆</span>
            <span>Melhor</span>
            <span className={statCls(bestColor)} style={{ color: bestColor }}>R$ {bestDay.cpl.toFixed(2)}</span>
          </div>
        )}
        {totalLeads > 0 && (
          <div className={`flex items-center gap-1.5 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: leadColor }} />
            <span>Leads</span>
            <span className={statCls(leadColor)} style={{ color: leadColor }}>{totalLeads}</span>
          </div>
        )}
      </div>

      {/* ── Chart ── */}
      <div className="h-[240px]">
        <ResponsiveLine
          data={lineData}
          theme={nivoTheme}
          margin={{ top: 24, right: 52, bottom: 42, left: 56 }}
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
            AvgCplLayer,
            LeadBubblesLayer,
            BestDayLayer,
            'lines',
            'slices',
            'points',
            'mesh',
          ]}
          animate
          motionConfig="gentle"
        />
      </div>
    </div>
  );
}
