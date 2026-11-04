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
  TableCellsIcon, AdjustmentsHorizontalIcon, MagnifyingGlassIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import ClientSelector, { useClientSelector } from '@/components/crm/ClientSelector';
import DateInputPtBR from '@/components/ui/DateInputPtBR';
import { formatCurrencyCompact, formatNumber, formatPercent, cn } from '@/lib/marketing-utils';

// ─── Tipos ──────────────────────────────────────────────────────────────────

type MetricUnit = 'currency' | 'percent' | 'count' | 'ratio' | 'score';

interface CuratedMetric {
  metricKey: string;
  label: string;
  unit: MetricUnit;
  category: string;
  isKpiCard: boolean;
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
}

// ─── Catálogo de colunas FIXAS (já existem em Insight, independente de curadoria) ─────────────
// Mesma taxonomia de categoria das sugestões do Master (SegmentMetricsModal.tsx) — "google" é
// categoria só desta tela (campos exclusivos do Google Ads, sem equivalente curável por segmento).
const FIXED_METRICS: ColumnDef[] = [
  { key: 'spend', source: 'fixed', label: 'Valor gasto', unit: 'currency', category: 'gasto' },
  { key: 'impressions', source: 'fixed', label: 'Impressões', unit: 'count', category: 'distribuicao' },
  { key: 'reach', source: 'fixed', label: 'Alcance', unit: 'count', category: 'distribuicao' },
  { key: 'cpm', source: 'fixed', label: 'CPM', unit: 'currency', category: 'distribuicao' },
  { key: 'clicks', source: 'fixed', label: 'Cliques', unit: 'count', category: 'cliques' },
  { key: 'ctr', source: 'fixed', label: 'CTR', unit: 'percent', category: 'cliques' },
  { key: 'cpc', source: 'fixed', label: 'CPC', unit: 'currency', category: 'cliques' },
  { key: 'video_views_3s', source: 'fixed', label: 'Visualizações de vídeo (3s)', unit: 'count', category: 'video' },
  { key: 'video_views_15s', source: 'fixed', label: 'Visualizações de vídeo (15s)', unit: 'count', category: 'video' },
  { key: 'video_views_25_pct', source: 'fixed', label: 'Reproduções 25%', unit: 'count', category: 'video' },
  { key: 'video_views_50_pct', source: 'fixed', label: 'Reproduções 50%', unit: 'count', category: 'video' },
  { key: 'video_views_75_pct', source: 'fixed', label: 'Reproduções 75%', unit: 'count', category: 'video' },
  { key: 'video_views_100_pct', source: 'fixed', label: 'Reproduções 100%', unit: 'count', category: 'video' },
  { key: 'thruplay_views', source: 'fixed', label: 'ThruPlays', unit: 'count', category: 'video' },
  { key: 'conversions', source: 'fixed', label: 'Conversões', unit: 'count', category: 'conversoes' },
  { key: 'conversions_value', source: 'fixed', label: 'Valor de conversões', unit: 'currency', category: 'conversoes' },
  { key: 'quality_ranking', source: 'fixed', label: 'Classificação de qualidade', unit: 'score', category: 'diagnostico' },
  { key: 'engagement_rate_ranking', source: 'fixed', label: 'Classificação de engajamento', unit: 'score', category: 'diagnostico' },
  { key: 'conversion_rate_ranking', source: 'fixed', label: 'Classificação de conversão', unit: 'score', category: 'diagnostico' },
  { key: 'learning_status', source: 'fixed', label: 'Status de aprendizado', unit: 'score', category: 'diagnostico' },
  { key: 'search_impression_share', source: 'fixed', label: 'Parcela de impressão (Google)', unit: 'percent', category: 'google' },
  { key: 'search_budget_lost_is', source: 'fixed', label: 'IS perdida por orçamento (Google)', unit: 'percent', category: 'google' },
  { key: 'search_rank_lost_is', source: 'fixed', label: 'IS perdida por ranking (Google)', unit: 'percent', category: 'google' },
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
  const allColumns: ColumnDef[] = useMemo(() => {
    const custom: ColumnDef[] = (data?.catalog ?? []).map((m) => ({
      key: m.metricKey, source: 'custom', label: m.label, unit: m.unit, category: m.category,
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
                        {c.label}
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
    </div>
  );
}
