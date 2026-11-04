'use client';

/**
 * Catálogo de Métricas Curadas em cascata — Segmento → Tenant → Cliente (ver
 * docs/CHECKPOINT.md, plano "typed-percolating-riddle"). Diferente da cascata de LLM
 * (components/crm/LlmCascadeSection.tsx), que nunca vale pra Campanhas (Campanhas usa
 * getLlmClientForCampaigns, sempre global) — esta é genuinamente de Campanhas: o próprio
 * Explorador de Métricas (/admin/campanhas/explorador-metricas) e a captura de dado (Fase 2,
 * agentMonitor.syncCampaignInsights) consomem a resolução efetiva desta cascata.
 *
 * Cliente de SEGMENTO DISTINTO do tenant pula o override genérico do tenant — o default
 * vertical-específico do PRÓPRIO segmento do cliente é mais relevante pra calibração de
 * campanha (decisão confirmada com o usuário) — ver `resolvedLevel: 'client_segment'`.
 *
 * Estrutura: shell (toggle de escopo + badge de proveniência + bloco de referência) no mesmo
 * espírito de LlmCascadeSection; editor de lista (chips de sugestão + linhas editáveis) é uma
 * cópia adaptada do editor de SegmentMetricsModal.tsx (Master) — duplicado de propósito, não
 * extraído pra um genérico compartilhado, mesmo padrão já aceito no código-base pra LLM
 * (SegmentLlmDefaultModal vs LlmCascadeSection são 2 implementações separadas).
 */

import { useState, useEffect, useRef } from 'react';
import {
  ChartBarIcon, CheckCircleIcon, PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline';
import {
  getMetricsCascade, saveMetricsCascade, deleteMetricsCascade,
  type CascadeMetric, type MetricCascadeLevel, type MetricCascadeResponse,
} from '@/lib/marketing-api';
import { cn } from '@/lib/marketing-utils';
import ClientSelector, { useClientSelector } from '@/components/crm/ClientSelector';
// Reaproveita a MESMA lista de sugestões comuns já curada pelo Master (zero duplicação de
// dado — 45 entradas, ver CLAUDE.md "zero hardcoded"); é só dado estático exportado, sem
// nenhum acoplamento de lógica com a tela do Master.
import { COMMON_SUGGESTIONS, CATEGORY_OPTIONS } from '@/components/admin/master/SegmentMetricsModal';

type MetricUnit = CascadeMetric['unit'];
type MetricDirection = CascadeMetric['betterDirection'];
type MetricChartType = CascadeMetric['chartType'];

const UNIT_OPTIONS: { value: MetricUnit; label: string }[] = [
  { value: 'currency', label: 'R$ (moeda)' },
  { value: 'percent', label: '% (percentual)' },
  { value: 'count', label: '# (contagem)' },
  { value: 'ratio', label: 'razão (ex.: freq.)' },
  { value: 'score', label: 'nota/ranking' },
];
const DIRECTION_OPTIONS: { value: MetricDirection; label: string }[] = [
  { value: 'higher_is_better', label: 'subir é bom' },
  { value: 'lower_is_better', label: 'subir é ruim' },
  { value: 'neutral', label: 'neutro' },
];
const CHART_OPTIONS: { value: MetricChartType; label: string }[] = [
  { value: 'line', label: 'linha' },
  { value: 'area', label: 'área' },
  { value: 'bar', label: 'barra' },
];
const CATEGORY_LABELS: Record<string, string> = {
  gasto: 'Gasto', distribuicao: 'Distribuição', video: 'Vídeo', cliques: 'Cliques',
  trafego: 'Tráfego', engajamento: 'Engajamento', mensagens: 'Mensagens e Ligações',
  diagnostico: 'Diagnóstico', conversoes: 'Conversões', google: 'Google Ads (específico)',
};
const ARRAY_FIELDS = new Set(['actions', 'action_values', 'cost_per_action_type']);

function emptyMetric(): CascadeMetric {
  return {
    metricKey: '', metaField: '', label: '', unit: 'count', betterDirection: 'higher_is_better',
    chartType: 'line', category: 'gasto', benchmarkKey: null, actionType: null, isKpiCard: false,
  };
}

function provenanceText(level: MetricCascadeLevel, editingLevel: 'tenant' | 'client', segmentName: string | null): string {
  if (level === 'client') return 'Sobrescrito para este cliente';
  if (level === 'tenant' && editingLevel === 'client') return 'Herdado do Tenant (sua empresa)';
  if (level === 'tenant') return 'Sobrescrito para este tenant (sua empresa)';
  if (level === 'client_segment') {
    return `Herdado do segmento próprio deste cliente${segmentName ? ` (${segmentName})` : ''} — diferente do segmento do tenant, por isso o override do tenant (se existir) não se aplica aqui`;
  }
  return `Herdado do Segmento${segmentName ? ` ${segmentName}` : ''}`;
}

/** Lista só-leitura, usada no bloco de referência (nunca editável). */
function ReadOnlyMetricsList({ metrics }: { metrics: CascadeMetric[] }) {
  if (metrics.length === 0) {
    return <p className="text-xs text-gray-400 italic">Nenhuma métrica curada neste nível.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {metrics.map((m) => (
        <span key={m.metricKey} className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-gray-200 text-gray-600">
          {m.label}
        </span>
      ))}
    </div>
  );
}

const categoryOrder = CATEGORY_OPTIONS.map((o) => o.value as string);

export function MetricsCascadeSection() {
  const commonSuggestions: CascadeMetric[] = COMMON_SUGGESTIONS;
  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('metrics-cascade');
  const scopeClientId = clientFilter === 'own' || clientFilter === 'segment' ? null : clientFilter;

  const [data, setData] = useState<MetricCascadeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReference, setShowReference] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CascadeMetric[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function loadForScope(clientId: string | null) {
    setLoading(true);
    setError('');
    try {
      const d = await getMetricsCascade(clientId);
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadForScope(scopeClientId); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const skippedFirstRun = useRef(false);
  useEffect(() => {
    if (!skippedFirstRun.current) { skippedFirstRun.current = true; return; }
    setEditing(false);
    loadForScope(scopeClientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeClientId]);

  function startEditing() {
    // Pré-preenche com o que está EFETIVO agora (herdado ou já sobrescrito) — ponto de
    // partida editável, não em branco (decisão confirmada com o usuário).
    setDraft((data?.resolvedMetrics ?? []).map((m) => ({ ...m })));
    setEditing(true);
    setSaved(false);
    setError('');
  }

  const updateDraft = (i: number, patch: Partial<CascadeMetric>) =>
    setDraft((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const removeDraft = (i: number) => setDraft((prev) => prev.filter((_, idx) => idx !== i));
  const addDraft = (seed?: CascadeMetric) =>
    setDraft((prev) => (seed && prev.some((m) => m.metricKey === seed.metricKey))
      ? prev
      : [...prev, seed ? { ...seed } : emptyMetric()]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const clean = draft.filter((m) => m.metaField.trim() && m.label.trim());
      await saveMetricsCascade({ clientId: scopeClientId, metrics: clean });
      setSaved(true);
      setEditing(false);
      await loadForScope(scopeClientId);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || 'Erro ao salvar métricas');
    } finally {
      setSaving(false);
    }
  }

  async function handleRestore() {
    const target = scopeClientId ? 'este cliente' : 'este tenant';
    if (!confirm(`Restaurar a herança da cascata pra ${target}, apagando as métricas próprias configuradas aqui?`)) return;
    setSaving(true);
    try {
      await deleteMetricsCascade(scopeClientId);
      await loadForScope(scopeClientId);
    } catch {
      setError('Erro ao restaurar herança');
    } finally {
      setSaving(false);
    }
  }

  const hasOverride = data?.overrideMetrics !== null && data?.overrideMetrics !== undefined;
  const referenceLabel = scopeClientId ? 'o segmento de referência deste cliente' : 'o segmento do tenant';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <ChartBarIcon className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-900">Métricas Curadas (Explorador)</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Cascata Segmento → Tenant → Cliente. Sem configurar nada aqui, o Explorador de
              Métricas usa o padrão curado pelo Master pro seu segmento.
            </p>
          </div>
        </div>
        <ClientSelector
          value={clientFilter}
          onChange={setClientFilter}
          clients={clients}
          loading={clientsLoading}
          variant="toggle"
          allowSegment={false}
          storageKey="metrics-cascade"
        />
      </div>

      <div className="p-6 space-y-4">
        {loading ? (
          <div className="h-16 rounded-xl bg-gray-100 animate-pulse" />
        ) : !data ? (
          <p className="text-xs text-red-500 font-medium">⚠️ Não foi possível carregar a configuração.</p>
        ) : (
          <>
            <div className={cn(
              'rounded-2xl p-3 text-xs font-semibold flex items-center gap-2',
              hasOverride ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-amber-50 border border-amber-200 text-amber-700',
            )}>
              {hasOverride ? <CheckCircleIcon className="h-4 w-4 shrink-0" /> : <ChartBarIcon className="h-4 w-4 shrink-0" />}
              {provenanceText(data.resolvedLevel, data.editingLevel, data.segment?.name ?? null)}
            </div>

            <button
              onClick={() => setShowReference((v) => !v)}
              className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-gray-500 hover:text-gray-800"
            >
              {showReference ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
              Ver o que {referenceLabel} configurou
            </button>
            {showReference && (
              <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <ReadOnlyMetricsList metrics={data.segmentReferenceMetrics} />
              </div>
            )}

            {error && <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>}

            {!editing ? (
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <button
                  onClick={startEditing}
                  className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Sobrescrever
                </button>
                {hasOverride && (
                  <button
                    onClick={handleRestore}
                    disabled={saving}
                    className="px-5 py-2.5 bg-transparent border border-amber-400/40 text-amber-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    Restaurar herança
                  </button>
                )}
                {saved && (
                  <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
                    <CheckCircleIcon className="h-4 w-4" /> Salvo
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Sugestões comuns — clique pra adicionar
                  </p>
                  {categoryOrder.map((cat) => {
                    const items = commonSuggestions.filter((s) => s.category === cat);
                    if (items.length === 0) return null;
                    return (
                      <div key={cat}>
                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wide mb-1">
                          {CATEGORY_LABELS[cat] ?? cat}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map((s) => {
                            const added = draft.some((m) => m.metricKey === s.metricKey);
                            return (
                              <button
                                key={s.metricKey}
                                onClick={() => addDraft(s)}
                                disabled={added}
                                className={cn(
                                  'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all',
                                  added
                                    ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                    : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50',
                                )}
                              >
                                {added ? '✓ ' : '+ '}{s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {draft.length} métrica(s) nesta configuração
                </p>

                {draft.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <ChartBarIcon className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-500">Nenhuma métrica nesta configuração</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {draft.map((m, i) => (
                      <div key={i} className="rounded-xl border border-gray-200 p-3 bg-gray-50/50 space-y-1.5">
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <input
                            value={m.label}
                            onChange={(e) => updateDraft(i, { label: e.target.value })}
                            placeholder="Rótulo (ex: CTR)"
                            className="col-span-3 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                          <input
                            value={m.metaField}
                            onChange={(e) => updateDraft(i, { metaField: e.target.value })}
                            placeholder="campo Meta (ex: ctr)"
                            className="col-span-3 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                          <select
                            value={m.category}
                            onChange={(e) => updateDraft(i, { category: e.target.value })}
                            className="col-span-2 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          >
                            {categoryOrder.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
                          </select>
                          <select
                            value={m.unit}
                            onChange={(e) => updateDraft(i, { unit: e.target.value as MetricUnit })}
                            className="col-span-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          >
                            {UNIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <select
                            value={m.betterDirection}
                            onChange={(e) => updateDraft(i, { betterDirection: e.target.value as MetricDirection })}
                            className="col-span-2 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          >
                            {DIRECTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <label className="col-span-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-gray-500" title="Aparece como card no topo do dashboard">
                            <input
                              type="checkbox"
                              checked={m.isKpiCard}
                              onChange={(e) => updateDraft(i, { isKpiCard: e.target.checked })}
                              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                            />
                            KPI
                          </label>
                          <button onClick={() => removeDraft(i)} className="text-gray-300 hover:text-red-500 p-1 justify-self-end">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                          <select
                            value={m.chartType}
                            onChange={(e) => updateDraft(i, { chartType: e.target.value as MetricChartType })}
                            className="col-span-2 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          >
                            {CHART_OPTIONS.map((o) => <option key={o.value} value={o.value}>Gráfico: {o.label}</option>)}
                          </select>
                          <input
                            value={m.benchmarkKey ?? ''}
                            onChange={(e) => updateDraft(i, { benchmarkKey: e.target.value || null })}
                            placeholder="benchmark (opcional)"
                            className={cn(
                              'px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400',
                              ARRAY_FIELDS.has(m.metaField) ? 'col-span-3' : 'col-span-6',
                            )}
                          />
                          {ARRAY_FIELDS.has(m.metaField) && (
                            <input
                              value={m.actionType ?? ''}
                              onChange={(e) => updateDraft(i, { actionType: e.target.value || null })}
                              placeholder="action_type (obrigatório, ex: lead)"
                              className="col-span-3 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50/50 text-xs font-mono text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          )}
                        </div>
                        {ARRAY_FIELDS.has(m.metaField) && !m.actionType && (
                          <p className="text-[10px] text-amber-600 font-semibold pl-1">
                            ⚠️ Sem action_type, esta métrica nunca captura dado real.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => addDraft()}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                >
                  <PlusIcon className="h-3.5 w-3.5" /> Adicionar métrica manualmente
                </button>

                <div className="flex items-center gap-3 flex-wrap pt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setError(''); }}
                    className="px-5 py-2.5 border border-gray-200 text-gray-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
