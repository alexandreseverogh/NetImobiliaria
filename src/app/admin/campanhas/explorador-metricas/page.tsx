'use client';

/**
 * Explorador de Métricas — Catálogo de Métricas Dinâmico, Fase 3 (ver docs/CHECKPOINT.md).
 *
 * Tabela densa (campanhas × métricas) com seletor de colunas agrupado por categoria — mesmo
 * padrão UX do "Personalizar colunas" da própria Meta, confirmado ao vivo com o usuário na Fase
 * de taxonomia. Mostra TANTO as colunas fixas já existentes em `Insight` (impressões, cliques,
 * spend, CTR...) QUANTO as métricas que o Master curou pro segmento em `segment_metric_catalog`
 * — nunca uma 2ª reconstrução da Insights API inteira da Meta (pra isso, usar a ferramenta de
 * Relatórios deles mesmo — ver aviso na própria tela de curadoria do Master).
 *
 * Tema: "Painel de Missão" (ver DESIGN.md) — navy-light como superfície elevada, gold-premium
 * como único acento de decisão, sempre em modo escuro (o padrão primário do sistema; sem toggle
 * claro/escuro, ao contrário do Dashboard principal — menos variante pra manter consistente).
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TableCellsIcon, AdjustmentsHorizontalIcon, MagnifyingGlassIcon, XMarkIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { adminFetch } from '@/lib/auth/adminFetch';
import ClientSelector, { useClientSelector } from '@/components/crm/ClientSelector';
import DateInputPtBR from '@/components/ui/DateInputPtBR';
import { formatCurrencyCompact, formatNumber, formatPercent, cn } from '@/lib/marketing-utils';

// ─── Tipos ──────────────────────────────────────────────────────────────────

type MetricUnit = 'currency' | 'percent' | 'count' | 'ratio' | 'score';
type MetricChartType = 'line' | 'area' | 'bar';

interface CuratedMetric {
  metricKey: string;
  label: string;
  unit: MetricUnit;
  category: string;
  isKpiCard: boolean;
  chartType: MetricChartType;
}

interface ExplorerRow {
  campaignId: string;
  campaignName: string;
  clientId: string | null;
  clientName: string | null;
  fixed: Record<string, number | string | null>;
  custom: Record<string, number | null>;
  daysWithData: number;
}

interface ExplorerResponse {
  segment: { id: string; name: string };
  catalog: CuratedMetric[];
  rows: ExplorerRow[];
  error?: string;
}

/** Coluna unificada — fixa (sempre disponível) ou curada (vem da resposta da API). */
interface ColumnDef {
  key: string;
  source: 'fixed' | 'custom';
  label: string;
  unit: MetricUnit;
  category: string;
  chartType: MetricChartType;
}

// ─── Catálogo de colunas FIXAS (já existem em Insight, independente de curadoria) ─────────────
// Mesma taxonomia de categoria das sugestões do Master (SegmentMetricsModal.tsx) — "google" é
// categoria só desta tela (campos exclusivos do Google Ads, sem equivalente curável por segmento).
// `chartType` segue a mesma convenção já usada nas sugestões do Master (área = valor acumulado,
// linha = taxa/score contínuo, barra = contagem discreta por dia).
const FIXED_METRICS: ColumnDef[] = [
  { key: 'spend', source: 'fixed', label: 'Valor gasto', unit: 'currency', category: 'gasto', chartType: 'area' },
  { key: 'impressions', source: 'fixed', label: 'Impressões', unit: 'count', category: 'distribuicao', chartType: 'line' },
  { key: 'reach', source: 'fixed', label: 'Alcance', unit: 'count', category: 'distribuicao', chartType: 'line' },
  { key: 'cpm', source: 'fixed', label: 'CPM', unit: 'currency', category: 'distribuicao', chartType: 'line' },
  { key: 'clicks', source: 'fixed', label: 'Cliques', unit: 'count', category: 'cliques', chartType: 'bar' },
  { key: 'ctr', source: 'fixed', label: 'CTR', unit: 'percent', category: 'cliques', chartType: 'line' },
  { key: 'cpc', source: 'fixed', label: 'CPC', unit: 'currency', category: 'cliques', chartType: 'line' },
  { key: 'video_views_3s', source: 'fixed', label: 'Visualizações de vídeo (3s)', unit: 'count', category: 'video', chartType: 'bar' },
  { key: 'video_views_15s', source: 'fixed', label: 'Visualizações de vídeo (15s)', unit: 'count', category: 'video', chartType: 'bar' },
  { key: 'video_views_25_pct', source: 'fixed', label: 'Reproduções 25%', unit: 'count', category: 'video', chartType: 'bar' },
  { key: 'video_views_50_pct', source: 'fixed', label: 'Reproduções 50%', unit: 'count', category: 'video', chartType: 'bar' },
  { key: 'video_views_75_pct', source: 'fixed', label: 'Reproduções 75%', unit: 'count', category: 'video', chartType: 'bar' },
  { key: 'video_views_100_pct', source: 'fixed', label: 'Reproduções 100%', unit: 'count', category: 'video', chartType: 'bar' },
  { key: 'thruplay_views', source: 'fixed', label: 'ThruPlays', unit: 'count', category: 'video', chartType: 'bar' },
  { key: 'conversions', source: 'fixed', label: 'Conversões', unit: 'count', category: 'conversoes', chartType: 'bar' },
  { key: 'conversions_value', source: 'fixed', label: 'Valor de conversões', unit: 'currency', category: 'conversoes', chartType: 'area' },
  { key: 'quality_ranking', source: 'fixed', label: 'Classificação de qualidade', unit: 'score', category: 'diagnostico', chartType: 'line' },
  { key: 'engagement_rate_ranking', source: 'fixed', label: 'Classificação de engajamento', unit: 'score', category: 'diagnostico', chartType: 'line' },
  { key: 'conversion_rate_ranking', source: 'fixed', label: 'Classificação de conversão', unit: 'score', category: 'diagnostico', chartType: 'line' },
  { key: 'learning_status', source: 'fixed', label: 'Status de aprendizado', unit: 'score', category: 'diagnostico', chartType: 'line' },
  { key: 'search_impression_share', source: 'fixed', label: 'Parcela de impressão (Google)', unit: 'percent', category: 'google', chartType: 'line' },
  { key: 'search_budget_lost_is', source: 'fixed', label: 'IS perdida por orçamento (Google)', unit: 'percent', category: 'google', chartType: 'line' },
  { key: 'search_rank_lost_is', source: 'fixed', label: 'IS perdida por ranking (Google)', unit: 'percent', category: 'google', chartType: 'line' },
];

const DEFAULT_FIXED_KEYS = new Set(['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'conversions']);

const CATEGORY_LABELS: Record<string, string> = {
  gasto: 'Gasto', distribuicao: 'Distribuição', video: 'Vídeo', cliques: 'Cliques',
  trafego: 'Tráfego', engajamento: 'Engajamento', mensagens: 'Mensagens e Ligações',
  diagnostico: 'Diagnóstico', conversoes: 'Conversões', google: 'Google Ads (específico)',
};
const CATEGORY_ORDER = ['gasto', 'distribuicao', 'video', 'cliques', 'trafego', 'engajamento', 'mensagens', 'diagnostico', 'conversoes', 'google'];

const RANKING_LABEL: Record<string, string> = {
  ABOVE_AVERAGE: 'Acima da média', AVERAGE: 'Na média', BELOW_AVERAGE: 'Abaixo da média',
  BELOW_AVERAGE_10: 'Abaixo (bottom 10%)', BELOW_AVERAGE_20: 'Abaixo (bottom 20%)',
  BELOW_AVERAGE_35: 'Abaixo (bottom 35%)', UNKNOWN: 'Desconhecida',
  LEARNING: 'Aprendendo', LEARNING_LIMITED: 'Aprendizado limitado', ACTIVE: 'Ativo',
};

function formatValue(value: number | string | null, unit: MetricUnit): string {
  if (value === null || value === undefined || value === '') return '—';
  if (unit === 'score') return RANKING_LABEL[String(value)] ?? String(value);
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (unit === 'currency') return formatCurrencyCompact(n);
  if (unit === 'percent') return formatPercent(n);
  if (unit === 'ratio') return `${n.toFixed(2)}x`;
  return formatNumber(n);
}

// DESIGN.md — "Painel de Missão": navy-light (#112240) como superfície elevada, borda sutil
// branca translúcida (elevação tonal, nunca sombra estática — "Regra Flat-By-Default").
const CARD = 'bg-navy-light rounded-2xl border border-white/[0.06]';
const INPUT_DARK = { colorScheme: 'dark' as const, backgroundColor: '#1e2a3a', color: '#cbd5e1' };

// Classificações (unit='score') são enum em texto (ABOVE_AVERAGE, LEARNING...), não número —
// não tem série pra plotar como linha/área/barra. Mesmo critério usado no endpoint de série.
function isChartable(unit: MetricUnit): boolean {
  return unit !== 'score';
}

// Paleta categórica — âmbar da marca (gold-premium) como slot 1, depois alternando frio/quente
// pra manter cada vizinho distinguível à primeira vista; tons claros o bastante pro contraste
// sobre a superfície navy escura (mesmo critério do `predColors` já usado no Dashboard real:
// cores mais claras em dark mode que em light mode). Os 4 últimos são tons neutros de apoio (só
// entram com muitas campanhas simultâneas, onde a legenda já carrega a identidade).
const CHART_PALETTE = [
  '#d4af37', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#22d3ee',
  '#fb923c', '#818cf8', '#4ade80', '#f472b6', '#94a3b8', '#fbbf24',
];

const CHART_INK = { grid: 'rgba(255,255,255,0.06)', axis: 'rgba(255,255,255,0.12)', tick: '#64748b' };

interface TimeseriesPoint {
  date: string;
  [campaignId: string]: string | number | null;
}

function formatChartDate(d: string, withWeekday = false): string {
  const [y, m, dd] = d.split('-').map(Number);
  if (!y || !m || !dd) return d;
  if (!withWeekday) return `${String(dd).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  const wd = new Date(Date.UTC(y, m - 1, dd)).toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' });
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1, 3)}, ${String(dd).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

/** Tooltip do gráfico — valor em destaque (Strong), nome da série em segundo plano, cada linha
 * identificada por uma chave curta na cor da série (nunca uma caixa cheia) — o valor é o que o
 * leitor veio buscar, a legenda já deu a identidade. Mesmo card escuro (`#0d1421`) já usado no
 * tooltip do Dashboard principal — consistência entre os dois gráficos do módulo. */
function ChartTooltipCard({ active, label, payload, unit, names, colorByKey }: {
  active?: boolean;
  label?: string;
  payload?: { dataKey: string; value: number | null }[];
  unit: MetricUnit;
  names: Record<string, string>;
  colorByKey: Record<string, string>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const rows = payload.filter((p) => p.value !== null && p.value !== undefined);
  if (rows.length === 0) return null;
  return (
    <div className="bg-[#0d1421] rounded-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] px-3.5 py-2.5 min-w-[180px]">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label ? formatChartDate(label, true) : ''}</p>
      <div className="space-y-1">
        {rows
          .slice()
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
          .map((p) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-[2px] rounded-full shrink-0" style={{ backgroundColor: colorByKey[p.dataKey] }} />
                <span className="text-[11px] text-slate-400 truncate">{names[p.dataKey] ?? p.dataKey}</span>
              </span>
              <span className="text-[12px] font-bold text-slate-100 tabular-nums shrink-0">{formatValue(p.value, unit)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

/** Legenda — chave de linha (série line) ou retângulo (área/barra), nunca só a cor; some por
 * completo quando há 1 série só (o título do card já diz o que é). */
function ChartLegendRow({ items, chartType }: { items: { id: string; name: string; color: string }[]; chartType: MetricChartType }) {
  if (items.length <= 1) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pt-3 mt-1 border-t border-white/[0.06]">
      {items.map((it) => (
        <span key={it.id} className="flex items-center gap-1.5 text-[11px] text-slate-400">
          {chartType === 'line' ? (
            <span className="w-3 h-[2px] rounded-full shrink-0" style={{ backgroundColor: it.color }} />
          ) : (
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: it.color }} />
          )}
          <span className="truncate max-w-[220px]">{it.name}</span>
        </span>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-80 mt-3 flex items-end gap-2 px-2 pb-6 animate-pulse">
      {[52, 68, 44, 80, 60, 90, 70, 56, 84, 48, 72, 64].map((h, i) => (
        <div key={i} className="flex-1 bg-white/[0.04] rounded-t-lg" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

/** Modal de gráfico — série diária de 1 coluna (fixa ou curada), 1 linha/área/barra por
 * campanha atualmente visível na tabela (respeitando busca/filtro já aplicados). Segue a skill
 * `dataviz`: legenda sempre presente (some só com 1 série), tooltip com valor em destaque e
 * chave de linha (nunca caixa cheia), grid hairline sólida, crosshair real no hover, área com
 * wash em degradê (nunca bloco saturado), barras com cap/raio fixo. */
function MetricChartModal({
  column, campaignIds, startDate, endDate, onClose,
}: {
  column: ColumnDef;
  campaignIds: { id: string; name: string }[];
  startDate: string;
  endDate: string;
  onClose: () => void;
}) {
  const [points, setPoints] = useState<TimeseriesPoint[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mais de ~12 campanhas num mesmo gráfico vira ilegível — cobre o caso comum sem travar a
  // tela quando o escopo "Todos os Clientes" tiver dezenas de campanhas visíveis.
  const capped = useMemo(() => campaignIds.slice(0, 12), [campaignIds]);
  const colorByKey = useMemo(
    () => Object.fromEntries(capped.map((c, i) => [c.id, CHART_PALETTE[i % CHART_PALETTE.length]])),
    [capped],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      campaignIds: capped.map((c) => c.id).join(','),
      metricKey: column.key,
      source: column.source,
      startDate,
      endDate,
    });
    adminFetch(`/api/admin/campanhas/metrics-explorer/timeseries?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) throw new Error(json.error);
        const series: { date: string; campaignId: string; campaignName: string; value: number | null }[] = json.series ?? [];
        const byDate = new Map<string, TimeseriesPoint>();
        const nameMap: Record<string, string> = {};
        for (const s of series) {
          nameMap[s.campaignId] = s.campaignName;
          const entry = byDate.get(s.date) ?? { date: s.date };
          entry[s.campaignId] = s.value;
          byDate.set(s.date, entry);
        }
        setNames(nameMap);
        setPoints(Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)));
      })
      .catch((e: any) => !cancelled && setError(e.message ?? 'Erro ao carregar a série'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [column.key, column.source, startDate, endDate, capped]);

  const formatAxisValue = (v: number) => formatValue(v, column.unit);
  const legendItems = useMemo(
    () => capped.map((c) => ({ id: c.id, name: c.name, color: colorByKey[c.id] })),
    [capped, colorByKey],
  );

  const ChartComp = column.chartType === 'area' ? AreaChart : column.chartType === 'bar' ? BarChart : LineChart;
  const barSize = capped.length <= 1 ? 24 : capped.length <= 3 ? 16 : 10;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[88vh] overflow-y-auto bg-navy-light rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-premium/10 flex items-center justify-center shrink-0">
              <ChartBarIcon className="h-4.5 w-4.5 text-gold-premium" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-100">{column.label}</h2>
              <p className="text-[11px] text-slate-500">
                Série diária · {capped.length} campanha{capped.length === 1 ? '' : 's'}
                {campaignIds.length > capped.length ? ` de ${campaignIds.length} (limitado a 12 pra legibilidade)` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors shrink-0"
          >
            <XMarkIcon className="h-4.5 w-4.5" />
          </button>
        </div>

        {loading ? (
          <ChartSkeleton />
        ) : error ? (
          <div className="py-14 text-center">
            <ChartBarIcon className="h-7 w-7 text-red-400/30 mx-auto mb-2" />
            <p className="text-xs text-red-400 font-medium">⚠️ {error}</p>
          </div>
        ) : !points || points.length === 0 ? (
          <div className="py-14 text-center">
            <ChartBarIcon className="h-7 w-7 text-white/10 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">Nenhum dado no período selecionado.</p>
          </div>
        ) : (
          <>
            <div className="h-80 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ChartComp data={points} margin={{ top: 20, right: 12, left: 0, bottom: 0 }} barGap={2}>
                  {column.chartType === 'area' && (
                    <defs>
                      {capped.map((c) => (
                        <linearGradient key={c.id} id={`mcm-grad-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colorByKey[c.id]} stopOpacity={0.32} />
                          <stop offset="95%" stopColor={colorByKey[c.id]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                  )}
                  <CartesianGrid vertical={false} stroke={CHART_INK.grid} strokeWidth={1} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => formatChartDate(d)}
                    tick={{ fontSize: 11, fill: CHART_INK.tick }}
                    axisLine={{ stroke: CHART_INK.axis }}
                    tickLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={formatAxisValue}
                    tick={{ fontSize: 11, fill: CHART_INK.tick }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip
                    content={<ChartTooltipCard unit={column.unit} names={names} colorByKey={colorByKey} />}
                    cursor={column.chartType === 'bar'
                      ? { fill: 'rgba(255,255,255,0.04)' }
                      : { stroke: CHART_INK.axis, strokeWidth: 1 }}
                  />
                  {capped.map((c) => {
                    const color = colorByKey[c.id];
                    if (column.chartType === 'area') {
                      return (
                        <Area
                          key={c.id} type="monotone" dataKey={c.id} name={c.id}
                          stroke={color} strokeWidth={2} fill={`url(#mcm-grad-${c.id})`}
                          dot={false} activeDot={{ r: 4, fill: color, stroke: '#0d1421', strokeWidth: 2 }}
                          connectNulls
                        />
                      );
                    }
                    if (column.chartType === 'bar') {
                      return <Bar key={c.id} dataKey={c.id} name={c.id} fill={color} radius={[4, 4, 0, 0]} maxBarSize={barSize} />;
                    }
                    return (
                      <Line
                        key={c.id} type="monotone" dataKey={c.id} name={c.id}
                        stroke={color} strokeWidth={2} dot={false}
                        activeDot={{ r: 4, fill: color, stroke: '#0d1421', strokeWidth: 2 }}
                        connectNulls
                      />
                    );
                  })}
                </ChartComp>
              </ResponsiveContainer>
            </div>
            <ChartLegendRow items={legendItems} chartType={column.chartType} />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function MetricsExplorerPage() {
  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('explorador-metricas');

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  const [data, setData] = useState<ExplorerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string> | null>(null); // null = ainda não inicializado (usa default)
  const [chartColumn, setChartColumn] = useState<ColumnDef | null>(null);

  const load = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (clientFilter) params.set('clientId', clientFilter);
      const res = await adminFetch(`/api/admin/campanhas/metrics-explorer?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar o explorador');
      setData(json);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar métricas');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, clientFilter]);

  useEffect(() => { load(); }, [load]);

  // Colunas disponíveis: fixas (sempre) + curadas (vêm da resposta, dependem do segmento).
  // Nada no cadastro do Master (SegmentMetricsModal) impede curar um `metricKey` que já existe
  // como coluna fixa — aqui a fixa sempre vence (mesmo dado, já exibido; manter as duas duplica
  // a coluna e quebra a key do React).
  const allColumns: ColumnDef[] = useMemo(() => {
    const fixedKeys = new Set(FIXED_METRICS.map((f) => f.key));
    const custom: ColumnDef[] = (data?.catalog ?? [])
      .filter((m) => !fixedKeys.has(m.metricKey))
      .map((m) => ({
        key: m.metricKey, source: 'custom', label: m.label, unit: m.unit, category: m.category,
        chartType: m.chartType,
      }));
    return [...FIXED_METRICS, ...custom];
  }, [data?.catalog]);

  // Seleção default: colunas fixas "essenciais" + métricas curadas marcadas como Card KPI pelo
  // Master — só calculada uma vez (até o usuário mexer manualmente no seletor).
  const effectiveSelectedKeys = useMemo(() => {
    if (selectedKeys) return selectedKeys;
    const kpiCustomKeys = (data?.catalog ?? []).filter((m) => m.isKpiCard).map((m) => m.metricKey);
    return new Set([...DEFAULT_FIXED_KEYS, ...kpiCustomKeys]);
  }, [selectedKeys, data?.catalog]);

  const selectedColumns = useMemo(
    () => allColumns.filter((c) => effectiveSelectedKeys.has(c.key)),
    [allColumns, effectiveSelectedKeys],
  );

  const toggleColumn = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev ?? effectiveSelectedKeys);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.campaignName.toLowerCase().includes(q) || (r.clientName ?? '').toLowerCase().includes(q));
  }, [data?.rows, search]);

  const columnsByCategory = useMemo(() => {
    const map: Record<string, ColumnDef[]> = {};
    for (const c of allColumns) (map[c.category] ??= []).push(c);
    return map;
  }, [allColumns]);

  return (
    <div className="min-h-screen bg-navy p-6">
      <div className="max-w-[1600px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gold-premium/10 flex items-center justify-center">
              <TableCellsIcon className="h-6 w-6 text-gold-premium" />
            </div>
            <div>
              <p className="text-[10px] font-black text-gold-premium uppercase tracking-[0.3em] mb-1">Campanhas</p>
              <h1 className="text-xl font-black text-slate-100 tracking-tight">Explorador de Métricas</h1>
              <p className="text-xs text-slate-500">
                {data?.segment?.name ? `Segmento: ${data.segment.name} · ` : ''}
                Colunas fixas da plataforma + métricas curadas pelo Master pro seu segmento.
              </p>
            </div>
          </div>
          <ClientSelector
            value={clientFilter}
            onChange={setClientFilter}
            clients={clients}
            loading={clientsLoading}
            storageKey="explorador-metricas"
            variant="toggle"
            activeSegmentName={data?.segment?.name}
          />
        </div>

        {/* Filtros */}
        <div className={cn(CARD, 'p-4 flex items-end gap-4 flex-wrap')}>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">De</label>
            <DateInputPtBR
              value={startDate} onChange={setStartDate}
              className="px-3 py-2 rounded-xl border border-white/10 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-600"
              style={INPUT_DARK}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Até</label>
            <DateInputPtBR
              value={endDate} onChange={setEndDate}
              className="px-3 py-2 rounded-xl border border-white/10 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-600"
              style={INPUT_DARK}
            />
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Buscar campanha/cliente</label>
            <MagnifyingGlassIcon className="h-4 w-4 text-slate-500 absolute left-3 top-[38px]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por nome..."
              className="pl-9 pr-3 py-2 rounded-xl border border-white/10 text-sm w-full text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
              style={INPUT_DARK}
            />
          </div>
          <button
            onClick={() => setShowPicker((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all',
              showPicker ? 'bg-gold-premium text-navy-dark' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10',
            )}
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            Colunas ({selectedColumns.length})
          </button>
        </div>

        {/* Seletor de colunas, agrupado por categoria — mesmo padrão da tela do Master */}
        {showPicker && (
          <div className={cn(CARD, 'p-4 space-y-3')}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Escolher colunas</p>
              <button onClick={() => setShowPicker(false)} className="text-slate-500 hover:text-slate-200">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            {CATEGORY_ORDER.map((cat) => {
              const cols = columnsByCategory[cat];
              if (!cols || cols.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-[9px] font-bold text-gold-premium uppercase tracking-wide mb-1">{CATEGORY_LABELS[cat]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cols.map((c) => {
                      const active = effectiveSelectedKeys.has(c.key);
                      return (
                        <button
                          key={c.key}
                          onClick={() => toggleColumn(c.key)}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all',
                            active
                              ? 'bg-gold-premium text-navy-dark border-gold-premium'
                              : 'bg-white/[0.03] text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200',
                          )}
                        >
                          {active ? '✓ ' : ''}{c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabela */}
        <div className={cn(CARD, 'overflow-hidden')}>
          {error && <p className="p-4 text-xs text-red-400 font-medium">⚠️ {error}</p>}
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">Carregando...</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-10 text-center">
              <TableCellsIcon className="h-8 w-8 text-white/10 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-500">Nenhuma campanha encontrada neste período/escopo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                    <th className="sticky left-0 bg-navy-light px-4 py-2.5 text-left font-black text-slate-500 uppercase tracking-wide z-10">Campanha</th>
                    <th className="px-4 py-2.5 text-left font-black text-slate-500 uppercase tracking-wide">Cliente</th>
                    {selectedColumns.map((c) => (
                      <th key={c.key} className="px-4 py-2.5 text-right font-black text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 justify-end">
                          {c.label}
                          {isChartable(c.unit) && (
                            <button
                              onClick={() => setChartColumn(c)}
                              title={`Ver gráfico de ${c.label}`}
                              className="text-slate-600 hover:text-gold-premium transition-colors"
                            >
                              <ChartBarIcon className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.campaignId} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="sticky left-0 bg-navy-light px-4 py-2.5 font-semibold text-slate-100 whitespace-nowrap">{row.campaignName}</td>
                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{row.clientName ?? '—'}</td>
                      {selectedColumns.map((c) => {
                        const value = c.source === 'fixed' ? row.fixed[c.key] : row.custom[c.key];
                        return (
                          <td key={c.key} className="px-4 py-2.5 text-right text-slate-300 font-mono whitespace-nowrap">
                            {formatValue(value, c.unit)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-600 text-center">
          Pra métricas que ainda não foram curadas pro seu segmento, use a ferramenta de
          Relatórios de Anúncios da própria Meta — este explorador cobre o que já é curado pela
          plataforma, não substitui o relatório nativo deles.
        </p>
      </div>

      {chartColumn && (
        <MetricChartModal
          column={chartColumn}
          campaignIds={filteredRows.map((r) => ({ id: r.campaignId, name: r.campaignName }))}
          startDate={startDate}
          endDate={endDate}
          onClose={() => setChartColumn(null)}
        />
      )}
    </div>
  );
}
