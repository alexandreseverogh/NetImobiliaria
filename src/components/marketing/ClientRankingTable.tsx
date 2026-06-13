'use client';
/**
 * ClientRankingTable — Tabela de posicionamento dos clientes do segmento.
 * Mostra cada cliente vs benchmark real do período.
 * Design premium: status visual, delta colorido, sparkline de CPL, top ângulo.
 */
import { cn, formatCurrency } from '@/lib/marketing-utils';
import type {
  ClientSegmentData,
  SegmentDashboardResponse,
} from '@/app/api/admin/campanhas/dashboard/segment/route';

// ─── Mini Sparkline com valores e legenda de tendência ───────────────────────

function CplSparkline({
  daily,
  isDark,
  width = 72,
  height = 28,
}: {
  daily: ClientSegmentData['daily'];
  isDark: boolean;
  width?: number;
  height?: number;
}) {
  const pts = daily.filter(d => d.cpl != null && d.cpl > 0);
  if (pts.length < 2) {
    return (
      <span style={{ color: isDark ? '#475569' : '#94a3b8', fontSize: 10, fontStyle: 'italic' }}>
        sem dados
      </span>
    );
  }

  const vals     = pts.map(d => d.cpl as number);
  const first    = vals[0];
  const last     = vals[vals.length - 1];
  const min      = Math.min(...vals);
  const max      = Math.max(...vals);
  const rng      = max - min || 1;
  const pad      = 2;
  const iw       = width  - pad * 2;
  const ih       = height - pad * 2;

  const trend    = last - first;
  const trendPct = first > 0 ? ((trend / first) * 100) : 0;

  // CPL: queda = bom (verde), subida = ruim (vermelho)
  const isGood      = trend <= -0.5;
  const isNeutral   = Math.abs(trendPct) < 1;
  const lineColor   = isNeutral
    ? (isDark ? '#94a3b8' : '#64748b')
    : isGood
    ? '#34d399'
    : '#f87171';
  const trendIcon   = isNeutral ? '=' : isGood ? '↓' : '↑';
  const trendLabel  = isNeutral
    ? 'estável'
    : isGood
    ? `↓ R$ ${Math.abs(trend).toFixed(0)} — CPL melhorou`
    : `↑ R$ ${Math.abs(trend).toFixed(0)} — CPL piorou`;

  const points = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * iw;
    const y = pad + (1 - (v - min) / rng) * ih;
    return `${x},${y}`;
  }).join(' ');

  // Tooltip rico
  const tooltipText = [
    `Tendência de CPL — ${pts.length} dias com dados`,
    `Início: R$ ${first.toFixed(2)}`,
    `Fim: R$ ${last.toFixed(2)}`,
    `Variação: ${trendPct >= 0 ? '+' : ''}${trendPct.toFixed(1)}%`,
    trendLabel,
  ].join('\n');

  return (
    <div title={tooltipText} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'help' }}>
      {/* Valor inicial */}
      <span style={{ fontSize: 9, fontWeight: 700, color: isDark ? '#475569' : '#94a3b8', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        R${first.toFixed(0)}
      </span>

      {/* Sparkline */}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ flexShrink: 0 }}>
        {/* Área de fundo suave */}
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinejoin="round"
          opacity={0.6}
        />
        {/* Dot final */}
        <circle
          cx={Number(points.split(' ').pop()!.split(',')[0])}
          cy={Number(points.split(' ').pop()!.split(',')[1])}
          r={3}
          fill={lineColor}
          opacity={0.9}
        />
        {/* Dot inicial (menor) */}
        <circle
          cx={Number(points.split(' ')[0].split(',')[0])}
          cy={Number(points.split(' ')[0].split(',')[1])}
          r={2}
          fill={isDark ? '#64748b' : '#94a3b8'}
          opacity={0.5}
        />
      </svg>

      {/* Valor final + ícone de tendência */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: lineColor, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {trendIcon} R${last.toFixed(0)}
        </span>
        {!isNeutral && (
          <span style={{ fontSize: 8, color: lineColor, opacity: 0.7, whiteSpace: 'nowrap', fontWeight: 700 }}>
            {trendPct >= 0 ? '+' : ''}{trendPct.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isDark }: { status: ClientSegmentData['metrics']['status']; isDark: boolean }) {
  const map = {
    ok:       { label: 'Saudável',   dot: 'bg-emerald-500', text: isDark ? 'text-emerald-400' : 'text-emerald-700', bg: isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100' },
    warn:     { label: 'Atenção',    dot: 'bg-amber-500',   text: isDark ? 'text-amber-400'   : 'text-amber-700',   bg: isDark ? 'bg-amber-500/10 border-amber-500/20'   : 'bg-amber-50 border-amber-100'   },
    critical: { label: 'Crítico',    dot: 'bg-red-500',     text: isDark ? 'text-red-400'     : 'text-red-700',     bg: isDark ? 'bg-red-500/10 border-red-500/20'       : 'bg-red-50 border-red-100'       },
    nodata:   { label: 'Sem dados',  dot: 'bg-slate-500',   text: isDark ? 'text-slate-400'   : 'text-slate-500',   bg: isDark ? 'bg-slate-500/10 border-slate-500/20'   : 'bg-slate-100 border-slate-200'  },
  };
  const cfg = map[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider',
      cfg.text, cfg.bg,
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Delta Badge ──────────────────────────────────────────────────────────────

function DeltaBadge({ delta, invertColor, isDark }: { delta: number | null; invertColor?: boolean; isDark: boolean }) {
  if (delta == null) return <span className={isDark ? 'text-slate-600' : 'text-slate-400'} style={{ fontSize: 11 }}>—</span>;

  const isPositive = delta > 0;
  // Para CPL: positivo (mais caro) = ruim; para CTR: positivo (mais alto) = bom
  const isGood = invertColor ? !isPositive : isPositive;

  const color  = Math.abs(delta) < 1
    ? isDark ? 'text-slate-500' : 'text-slate-400'
    : isGood
    ? isDark ? 'text-emerald-400' : 'text-emerald-600'
    : isDark ? 'text-red-400'     : 'text-red-600';

  const bg = Math.abs(delta) < 1
    ? isDark ? 'bg-slate-500/10' : 'bg-slate-100'
    : isGood
    ? isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
    : isDark ? 'bg-red-500/10'     : 'bg-red-50';

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md', color, bg)}>
      {isPositive ? '▲' : '▼'}{Math.abs(delta).toFixed(1)}%
    </span>
  );
}

// ─── Rank Medal ───────────────────────────────────────────────────────────────

function RankMedal({ rank, isDark }: { rank: number; isDark: boolean }) {
  if (rank === 0) return (
    <span style={{ color: isDark ? '#475569' : '#94a3b8', fontSize: 11 }}>—</span>
  );

  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      {/* Número — informação primária */}
      <span style={{
        fontSize: 15,
        fontWeight: 900,
        color: rank === 1
          ? '#fbbf24'
          : rank === 2
          ? isDark ? '#94a3b8' : '#64748b'
          : rank === 3
          ? '#f97316'
          : isDark ? '#475569' : '#94a3b8',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }}>
        {rank}
      </span>
      {/* Medalha para top 3 — decoração secundária */}
      {medal && (
        <span style={{ fontSize: 11, lineHeight: 1, opacity: 0.85 }}>{medal}</span>
      )}
    </div>
  );
}

// ─── Initials Avatar ──────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  ['#818cf8', '#312e81'], ['#34d399', '#064e3b'], ['#fbbf24', '#78350f'],
  ['#f87171', '#7f1d1d'], ['#60a5fa', '#1e3a5f'], ['#e879f9', '#4a044e'],
];

function ClientAvatar({ name, index, size = 32 }: { name: string; index: number; size?: number }) {
  const [fg, bg] = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <span style={{
      width: size, height: size, borderRadius: size * 0.3,
      backgroundColor: bg, color: fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 900, flexShrink: 0,
    }}>
      {initials}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  data: SegmentDashboardResponse;
  isDark?: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClientRankingTable({ data, isDark = true }: Props) {
  // Dark mode — hierarquia clara de contraste para fundo muito escuro
  // Dado primário  : slate-100 (quase branco)   → client name, CPL value
  // Dado secundário: slate-200                  → CTR, Verba, leads
  // Muted (labels) : slate-400                  → sub-labels, hints
  // Faint (headers): slate-500                  → column headers, captions
  const tx       = isDark ? 'text-slate-100'  : 'text-slate-800';
  const txData   = isDark ? 'text-slate-200'  : 'text-slate-700';  // valores numéricos secundários
  const txMuted  = isDark ? 'text-slate-400'  : 'text-slate-500';  // sub-labels, hints
  const txFaint  = isDark ? 'text-slate-500'  : 'text-slate-400';  // column headers
  const divider  = isDark ? 'border-white/[0.06]' : 'border-slate-100';
  const rowHov   = isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50/80';
  const headBg   = isDark ? 'bg-white/[0.025]' : 'bg-slate-50';

  const allEntries: (ClientSegmentData & { isOwn: boolean; index: number })[] = [
    ...(data.tenantOwn ? [{ ...data.tenantOwn, isOwn: true, index: 0 }] : []),
    ...data.clients.map((c, i) => ({ ...c, isOwn: false, index: i + (data.tenantOwn ? 1 : 0) })),
  ].sort((a, b) => {
    if (a.metrics.rank === 0) return 1;
    if (b.metrics.rank === 0) return -1;
    return a.metrics.rank - b.metrics.rank;
  });

  const bench = data.benchmark;
  const vocab = data.segment.vocabulary ?? {};

  const COLORS_DARK  = ['#818cf8','#34d399','#fbbf24','#f87171','#60a5fa','#e879f9','#2dd4bf','#fb923c'];
  const COLORS_LIGHT = ['#6366f1','#059669','#d97706','#dc2626','#2563eb','#c026d3','#0d9488','#ea580c'];
  const COLORS       = isDark ? COLORS_DARK : COLORS_LIGHT;

  if (allEntries.length === 0) {
    return (
      <div className={cn('rounded-2xl p-10 text-center', isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-slate-50 border border-slate-200')}>
        <p className={cn('text-sm', txMuted)}>Nenhum cliente com dados no período.</p>
      </div>
    );
  }

  return (
    <div className={cn(
      'rounded-2xl overflow-hidden',
      isDark
        ? 'bg-[rgba(13,20,33,0.92)] border border-white/7 shadow-[0_2px_16px_rgba(0,0,0,0.5)]'
        : 'bg-white border border-slate-200 shadow-sm',
    )}>
      {/* ── Cabeçalho ── */}
      <div className={cn('overflow-x-auto')}>
        <table className="w-full text-sm">
          <thead>
            <tr className={cn(headBg, `border-b ${divider}`)}>
              <th className={cn('px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest', txFaint)}>Rank</th>
              <th className={cn('px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest', txFaint)}>Cliente</th>
              <th className={cn('px-5 py-3 text-right text-[9px] font-black uppercase tracking-widest', txFaint)}>CPL</th>
              <th className={cn('px-5 py-3 text-right text-[9px] font-black uppercase tracking-widest', txFaint)}>vs Benchmark</th>
              <th className={cn('px-5 py-3 text-right text-[9px] font-black uppercase tracking-widest', txFaint)}>CTR</th>
              <th className={cn('px-5 py-3 text-right text-[9px] font-black uppercase tracking-widest', txFaint)}>{vocab.lead_term ?? 'Leads'}</th>
              <th className={cn('px-5 py-3 text-right text-[9px] font-black uppercase tracking-widest', txFaint)}>Verba</th>
              <th className={cn('px-5 py-3 text-center text-[9px] font-black uppercase tracking-widest', txFaint)}>Tendência CPL</th>
              <th className={cn('px-5 py-3 text-center text-[9px] font-black uppercase tracking-widest', txFaint)}>Ângulo Top</th>
              <th className={cn('px-5 py-3 text-center text-[9px] font-black uppercase tracking-widest', txFaint)}>Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${divider}`}>
            {allEntries.map((c) => {
              const clientColor = COLORS[c.index % COLORS.length];
              return (
                <tr key={c.id} className={cn('transition-colors', rowHov)}>
                  {/* Rank */}
                  <td className="px-5 py-4">
                    <div className="flex justify-center">
                      <RankMedal rank={c.metrics.rank} isDark={isDark} />
                    </div>
                  </td>

                  {/* Cliente */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <ClientAvatar name={c.name} index={c.index} size={32} />
                      <div>
                        <p className={cn('text-sm font-black leading-tight', tx)}>{c.name}</p>
                        <p className={cn('text-[10px] mt-0.5', txMuted)}>
                          {c.metrics.status !== 'nodata' ? `${c.campaignCount} campanha${c.campaignCount !== 1 ? 's' : ''} · ${c.activeCampaignCount} ativa${c.activeCampaignCount !== 1 ? 's' : ''}` : 'Sem dados no período'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* CPL */}
                  <td className="px-5 py-4 text-right">
                    <span className={cn('text-sm font-black font-mono', tx)}>
                      {c.metrics.cpl != null ? formatCurrency(c.metrics.cpl) : '—'}
                    </span>
                    {bench.cplMedian != null && c.metrics.cpl != null && (
                      <p className={cn('text-[9px] mt-0.5', txMuted)}>
                        Benchmark R$ {bench.cplMedian.toFixed(2)}
                      </p>
                    )}
                  </td>

                  {/* Delta CPL vs Benchmark */}
                  <td className="px-5 py-4 text-right">
                    <DeltaBadge delta={c.metrics.deltaCplVsBenchmark} invertColor isDark={isDark} />
                  </td>

                  {/* CTR */}
                  <td className="px-5 py-4 text-right">
                    {/* CTR — dado secundário importante */}
                    <span className={cn('text-sm font-mono font-bold', txData)}>
                      {c.metrics.ctr > 0 ? `${c.metrics.ctr.toFixed(2)}%` : '—'}
                    </span>
                  </td>

                  {/* Leads — destaque em verde quando há valor */}
                  <td className="px-5 py-4 text-right">
                    <span className={cn(
                      'text-sm font-black font-mono',
                      c.metrics.leads > 0
                        ? (isDark ? 'text-emerald-300' : 'text-emerald-600')
                        : txMuted,
                    )}>
                      {c.metrics.leads}
                    </span>
                  </td>

                  {/* Verba — dado secundário */}
                  <td className="px-5 py-4 text-right">
                    <span className={cn('text-sm font-mono font-medium', txData)}>
                      {c.metrics.spend > 0 ? `R$ ${c.metrics.spend.toFixed(0)}` : '—'}
                    </span>
                  </td>

                  {/* Sparkline CPL */}
                  <td className="px-5 py-4">
                    <div className="flex justify-center">
                      <CplSparkline daily={c.daily} isDark={isDark} />
                    </div>
                  </td>

                  {/* Ângulo Top */}
                  <td className="px-5 py-4 text-center">
                    {c.topAngle ? (
                      <span className={cn(
                        'text-[10px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider',
                        isDark ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-violet-50 text-violet-700 border-violet-100',
                      )}>
                        {c.topAngle}
                      </span>
                    ) : (
                      <span className={cn('text-[10px]', txFaint)}>—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4 text-center">
                    <StatusBadge status={c.metrics.status} isDark={isDark} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Rodapé com benchmarks ── */}
      <div className={cn('px-5 py-3 border-t flex items-center gap-6 flex-wrap', divider, isDark ? 'bg-white/[0.015]' : 'bg-slate-50')}>
        <span className={cn('text-[9px] font-black uppercase tracking-widest', txFaint)}>Benchmark do período</span>
        {bench.cplMedian != null && (
          <span className={cn('text-[10px] font-bold', txMuted)}>
            CPL mediano: <span className={cn('font-black', txData)}>R$ {bench.cplMedian.toFixed(2)}</span>
          </span>
        )}
        {bench.ctrMedian != null && (
          <span className={cn('text-[10px] font-bold', txMuted)}>
            CTR mediano: <span className={cn('font-black', txData)}>{bench.ctrMedian.toFixed(2)}%</span>
          </span>
        )}
        {data.segment.cplIdeal != null && (
          <span className={cn('text-[10px] font-bold', txMuted)}>
            CPL ideal: <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>R$ {data.segment.cplIdeal.toFixed(2)}</span>
          </span>
        )}
        {data.segment.cplCritical != null && (
          <span className={cn('text-[10px] font-bold', txMuted)}>
            CPL crítico: <span className={isDark ? 'text-red-400' : 'text-red-600'}>R$ {data.segment.cplCritical.toFixed(2)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
