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
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TableCellsIcon, AdjustmentsHorizontalIcon, MagnifyingGlassIcon, XMarkIcon, ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
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

const CARD = 'bg-white rounded-2xl border border-gray-200 shadow-sm';

// Classificações (unit='score') são enum em texto (ABOVE_AVERAGE, LEARNING...), não número —
// não tem série pra plotar como linha/área/barra. Mesmo critério usado no endpoint de série.
function isChartable(unit: MetricUnit): boolean {
  return unit !== 'score';
}

const CHART_PALETTE = [
  '#c5a028', '#2563eb', '#059669', '#dc2626', '#7c3aed', '#0891b2',
  '#ea580c', '#4338ca', '#15803d', '#be185d', '#6b7280', '#a16207',
];

interface TimeseriesPoint {
  date: string;
  [campaignId: string]: string | number | null;
}

/** Modal de gráfico — série diária de 1 coluna (fixa ou curada), 1 linha/área/barra por
 * campanha atualmente visível na tabela (respeitando busca/filtro já aplicados). */
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

  const formatDate = (d: string) => {
    const [, m, dd] = d.split('-');
    return `${dd}/${m}`;
  };
  const formatAxisValue = (v: number) => formatValue(v, column.unit);

  const ChartComp = column.chartType === 'area' ? AreaChart : column.chartType === 'bar' ? BarChart : LineChart;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className={cn(CARD, 'w-full max-w-4xl max-h-[85vh] overflow-y-auto p-5')} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-sm font-black text-gray-900">{column.label}</h2>
            <p className="text-[11px] text-gray-400">
              Série diária · {capped.length} campanha{capped.length === 1 ? '' : 's'}
              {campaignIds.length > capped.length ? ` (de ${campaignIds.length} visíveis — limitado a 12 pra legibilidade)` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando série...</div>
        ) : error ? (
          <p className="py-10 text-center text-xs text-red-600 font-medium">⚠️ {error}</p>
        ) : !points || points.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">Nenhum dado no período selecionado.</div>
        ) : (
          <div className="h-80 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <ChartComp data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatAxisValue} tick={{ fontSize: 11 }} width={70} />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value: number, dataKey: string) => [formatValue(value, column.unit), names[dataKey] ?? dataKey]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(key: string) => names[key] ?? key} />
                {capped.map((c, i) => {
                  const color = CHART_PALETTE[i % CHART_PALETTE.length];
                  if (column.chartType === 'area') {
                    return <Area key={c.id} type="monotone" dataKey={c.id} name={c.id} stroke={color} fill={color} fillOpacity={0.15} connectNulls />;
                  }
                  if (column.chartType === 'bar') {
                    return <Bar key={c.id} dataKey={c.id} name={c.id} fill={color} />;
                  }
                  return <Line key={c.id} type="monotone" dataKey={c.id} name={c.id} stroke={color} strokeWidth={2} dot={false} connectNulls />;
                })}
              </ChartComp>
            </ResponsiveContainer>
          </div>
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1600px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gold-premium/10 flex items-center justify-center">
              <TableCellsIcon className="h-6 w-6 text-gold-premium" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Explorador de Métricas</h1>
              <p className="text-xs text-gray-400">
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
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">De</label>
            <DateInputPtBR value={startDate} onChange={setStartDate} className="px-3 py-2 rounded-xl border border-gray-200 text-sm w-36" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Até</label>
            <DateInputPtBR value={endDate} onChange={setEndDate} className="px-3 py-2 rounded-xl border border-gray-200 text-sm w-36" />
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Buscar campanha/cliente</label>
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-300 absolute left-3 top-[38px]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por nome..."
              className="pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm w-full"
            />
          </div>
          <button
            onClick={() => setShowPicker((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all',
              showPicker ? 'bg-gold-premium text-navy-dark' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
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
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Escolher colunas</p>
              <button onClick={() => setShowPicker(false)} className="text-gray-300 hover:text-gray-600">
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
                            active ? 'bg-navy-dark text-white border-navy-dark' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400',
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
          {error && <p className="p-4 text-xs text-red-600 font-medium">⚠️ {error}</p>}
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-400">Carregando...</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-10 text-center">
              <TableCellsIcon className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Nenhuma campanha encontrada neste período/escopo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="sticky left-0 bg-gray-50 px-4 py-2.5 text-left font-black text-gray-500 uppercase tracking-wide z-10">Campanha</th>
                    <th className="px-4 py-2.5 text-left font-black text-gray-500 uppercase tracking-wide">Cliente</th>
                    {selectedColumns.map((c) => (
                      <th key={c.key} className="px-4 py-2.5 text-right font-black text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 justify-end">
                          {c.label}
                          {isChartable(c.unit) && (
                            <button
                              onClick={() => setChartColumn(c)}
                              title={`Ver gráfico de ${c.label}`}
                              className="text-gray-300 hover:text-gold-premium transition-colors"
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
                    <tr key={row.campaignId} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="sticky left-0 bg-white px-4 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{row.campaignName}</td>
                      <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{row.clientName ?? '—'}</td>
                      {selectedColumns.map((c) => {
                        const value = c.source === 'fixed' ? row.fixed[c.key] : row.custom[c.key];
                        return (
                          <td key={c.key} className="px-4 py-2.5 text-right text-gray-700 font-mono whitespace-nowrap">
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

        <p className="text-[11px] text-gray-400 text-center">
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
