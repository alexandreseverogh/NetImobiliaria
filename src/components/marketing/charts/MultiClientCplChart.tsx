'use client';
/**
 * MultiClientCplChart — CPL Timeline multi-cliente.
 * Uma linha de CPL por cliente + linha mediana (benchmark) tracejada.
 * Barras de lead volume por cliente (semi-transparentes, empilhadas por data).
 */
import { useState } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { ClientSegmentData } from '@/app/api/admin/campanhas/dashboard/segment/route';
import { formatCurrency } from '@/lib/marketing-utils';

const CLIENT_COLORS_DARK  = ['#818cf8','#34d399','#fbbf24','#f87171','#60a5fa','#e879f9','#2dd4bf','#fb923c'];
const CLIENT_COLORS_LIGHT = ['#6366f1','#059669','#d97706','#dc2626','#2563eb','#c026d3','#0d9488','#ea580c'];

interface Props {
  clients: ClientSegmentData[];
  tenantOwn: ClientSegmentData | null;
  cplMedian: number | null;
  isDark?: boolean;
  height?: number;
}

function buildCplData(allClients: { id: string; name: string; daily: ClientSegmentData['daily'] }[]) {
  const datesSet = new Set<string>();
  allClients.forEach(c => c.daily.forEach(d => datesSet.add(d.date)));
  const dates = Array.from(datesSet).sort();

  return dates.map(date => {
    const point: Record<string, any> = { date };
    allClients.forEach(c => {
      const day = c.daily.find(d => d.date === date);
      point[`${c.id}_cpl`]   = day?.cpl   ?? null;
      point[`${c.id}_leads`] = day?.leads  ?? 0;
    });
    return point;
  });
}

function CustomTooltip({ active, payload, label, allClients, isDark, cplMedian }: any) {
  if (!active || !payload?.length) return null;
  const bg     = isDark ? '#0d1421' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.09)' : '#e2e8f0';
  const clr    = isDark ? '#cbd5e1' : '#0f172a';
  const muted  = isDark ? '#64748b' : '#94a3b8';

  const cplEntries = allClients.map((c: any, i: number) => {
    const p = payload.find((px: any) => px.dataKey === `${c.id}_cpl`);
    return p ? { name: c.name, cpl: p.value, leads: payload.find((px: any) => px.dataKey === `${c.id}_leads`)?.value ?? 0, color: (isDark ? CLIENT_COLORS_DARK : CLIENT_COLORS_LIGHT)[i % 8] } : null;
  }).filter(Boolean);

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 14, padding: '10px 14px', color: clr, minWidth: 220, boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.55)' : '0 4px 16px rgba(0,0,0,0.1)' }}>
      <p style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: muted, marginBottom: 8 }}>
        {label}
      </p>
      {cplEntries.sort((a: any, b: any) => (a.cpl ?? Infinity) - (b.cpl ?? Infinity)).map((e: any, i: number) => (
        <div key={i} style={{ marginBottom: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: e.color, flexShrink: 0, display: 'inline-block' }} />
              {e.name}
            </span>
            <span style={{ fontWeight: 800, color: e.color, fontSize: 12 }}>
              {e.cpl != null ? formatCurrency(e.cpl) : '—'}
            </span>
          </div>
          {e.leads > 0 && (
            <div style={{ fontSize: 10, color: muted, marginLeft: 13 }}>
              {e.leads} lead{e.leads > 1 ? 's' : ''}
            </div>
          )}
        </div>
      ))}
      {cplMedian != null && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
          <span style={{ color: muted }}>Mediana do segmento</span>
          <span style={{ fontWeight: 800, color: isDark ? '#cbd5e1' : '#475569' }}>{formatCurrency(cplMedian)}</span>
        </div>
      )}
    </div>
  );
}

export function MultiClientCplChart({ clients, tenantOwn, cplMedian, isDark = true, height = 280 }: Props) {
  const COLORS    = isDark ? CLIENT_COLORS_DARK : CLIENT_COLORS_LIGHT;
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9';
  const axisColor = isDark ? '#64748b' : '#94a3b8';
  const benchClr  = isDark ? '#cbd5e1' : '#475569';

  const allClients = [
    ...(tenantOwn ? [{ id: tenantOwn.id, name: tenantOwn.name, daily: tenantOwn.daily }] : []),
    ...clients.map(c => ({ id: c.id, name: c.name, daily: c.daily })),
  ];

  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setHidden(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const data = buildCplData(allClients);

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginBottom: 12 }}>
        {allClients.map((c, i) => {
          const color = COLORS[i % COLORS.length];
          return (
            <button key={c.id} onClick={() => toggle(c.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, cursor: 'pointer', opacity: hidden.has(c.id) ? 0.3 : 1, color: axisColor, background: 'none', border: 'none', padding: 0, transition: 'opacity 0.2s' }}>
              <span style={{ width: 8, height: 2, backgroundColor: color, borderRadius: 2, display: 'inline-block' }} />
              {c.name}
            </button>
          );
        })}
        {cplMedian != null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: axisColor }}>
            <span style={{ width: 16, display: 'inline-block', borderTop: `1px dashed ${benchClr}` }} />
            Mediana
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
          <CartesianGrid stroke={gridColor} strokeWidth={1} vertical={false} />
          <XAxis dataKey="date" tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false}
            tickFormatter={d => { const [,m,day] = d.split('-'); return `${day}/${m}`; }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: axisColor, fontSize: 10 }} tickLine={false} axisLine={false}
            tickFormatter={v => `R$${v.toFixed(0)}`} width={52} />
          <Tooltip content={props => <CustomTooltip {...props} allClients={allClients} isDark={isDark} cplMedian={cplMedian} />} />

          {/* Barras de volume de leads por cliente — opacidade adaptada ao tema */}
          {allClients.map((c, i) => (
            <Bar key={`${c.id}_leads`} dataKey={`${c.id}_leads`} name={`${c.name} leads`}
              fill={COLORS[i % COLORS.length]}
              opacity={hidden.has(c.id) ? 0 : isDark ? 0.40 : 0.28}
              radius={[2, 2, 0, 0]} yAxisId={0} stackId="leads" />
          ))}

          {/* Linha de benchmark */}
          {cplMedian != null && (
            <ReferenceLine y={cplMedian} stroke={benchClr} strokeWidth={2} strokeDasharray="6 4"
              label={{ value: `Mediana R$${cplMedian.toFixed(2)}`, position: 'insideTopRight', fill: benchClr, fontSize: 10, fontWeight: 800 }} />
          )}

          {/* Linha de CPL por cliente */}
          {allClients.map((c, i) => (
            <Line key={`${c.id}_cpl`} type="monotone" dataKey={`${c.id}_cpl`} name={c.name}
              stroke={COLORS[i % COLORS.length]} strokeWidth={hidden.has(c.id) ? 0 : 2.5}
              dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
