'use client';

/**
 * Catálogo de Métricas Dinâmico — Fase 1 (ver docs/CHECKPOINT.md "Tarefa em andamento",
 * 2026-11-02). Master cura, por segmento, quais campos da Meta Insights API viram
 * card/gráfico/variável pro LLM — substitui aos poucos o conjunto fixo hardcoded.
 *
 * Sem "Sugerir com IA" de propósito: o catálogo de métricas da Meta é finito e bem
 * documentado (não um nicho de negócio pra inferir) — chips de sugestão comuns servem melhor
 * aqui do que uma chamada LLM.
 */

import { useState, useEffect } from 'react';
import {
  XMarkIcon, ChartBarIcon, CheckCircleIcon, PlusIcon, TrashIcon, QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

type MetricUnit = 'currency' | 'percent' | 'count' | 'ratio' | 'score';
type MetricDirection = 'higher_is_better' | 'lower_is_better' | 'neutral';
type MetricChartType = 'area' | 'line' | 'bar';
/** Taxonomia real da Meta (Gerenciador de Anúncios → "Personalizar colunas"), levantada ao vivo
 * em 2026-11-03 — substitui os 5 buckets inventados da Fase 1. 'video' mescla "Reconhecimento >
 * Mídia" com "Rastreamento > Mídia" (a Meta separa por aba de UI, não por significado);
 * 'mensagens' mescla "Engajamento > Mensagens/Ligações" com "Rastreamento > Mensagens e ligações
 * > Bloqueios". A 3ª aba real da Meta ("Configurações de anúncios") não entra aqui — é atributo/
 * config (nome/orçamento/segmentação), não métrica numérica graficável. */
type MetricCategory =
  | 'gasto' | 'distribuicao' | 'video' | 'cliques' | 'trafego'
  | 'engajamento' | 'mensagens' | 'diagnostico' | 'conversoes';

export interface Metric {
  metricKey: string;
  metaField: string;
  label: string;
  unit: MetricUnit;
  betterDirection: MetricDirection;
  chartType: MetricChartType;
  category: MetricCategory;
  benchmarkKey: string | null;
  /** Só relevante quando metaField é 'actions'/'action_values'/'cost_per_action_type'. */
  actionType: string | null;
  isKpiCard: boolean;
}

/** Campos que exigem actionType pra resolver uma métrica específica (arrays genéricos). */
const ARRAY_FIELDS = new Set(['actions', 'action_values', 'cost_per_action_type']);

interface Segment { id: string; name: string; slug: string }
interface Props { segment: Segment; onClose: () => void }

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
/** Ordem e rótulos batendo com as 2 abas reais de métrica da Meta ("Principais métricas" +
 * "Rastreamento" — a 3ª, "Configurações de anúncios", não é métrica) e os grupos dentro delas,
 * confirmados ao vivo em 2026-11-03. */
export const CATEGORY_OPTIONS: { value: MetricCategory; label: string }[] = [
  { value: 'gasto', label: 'Gasto' },
  { value: 'distribuicao', label: 'Distribuição' },
  { value: 'video', label: 'Vídeo' },
  { value: 'cliques', label: 'Cliques' },
  { value: 'trafego', label: 'Tráfego' },
  { value: 'engajamento', label: 'Engajamento' },
  { value: 'mensagens', label: 'Mensagens e Ligações' },
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'conversoes', label: 'Conversões' },
];

/**
 * Sugestões comuns — campos reais da Meta Insights API, levantados ao vivo em 2026-11-03 direto
 * da ferramenta "Personalizar colunas" do Gerenciador de Anúncios + confirmados contra a
 * referência oficial auto-gerada da API (developers.facebook.com/.../ad-campaign-group/insights)
 * e a página de Ad Action Stats (action_type literais). Não é o catálogo completo (~150
 * métricas reais) — cobre os campos que conseguimos confirmar com certeza (nome de campo E, pros
 * campos de array, o action_type exato); nenhum item aqui foi chutado. O resto (chamadas
 * bloqueadas, métricas específicas do Instagram, alguns detalhes de mensageria) fica de fora de
 * propósito — melhor não oferecer do que oferecer uma métrica que nunca captura dado real.
 */
export const COMMON_SUGGESTIONS: Metric[] = [
  // ── Gasto ──────────────────────────────────────────────────────────────
  { metricKey: 'spend', metaField: 'spend', label: 'Valor gasto', unit: 'currency', betterDirection: 'neutral', chartType: 'area', category: 'gasto', benchmarkKey: null, actionType: null, isKpiCard: true },

  // ── Distribuição ───────────────────────────────────────────────────────
  { metricKey: 'impressions', metaField: 'impressions', label: 'Impressões', unit: 'count', betterDirection: 'neutral', chartType: 'line', category: 'distribuicao', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'reach', metaField: 'reach', label: 'Alcance', unit: 'count', betterDirection: 'higher_is_better', chartType: 'line', category: 'distribuicao', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'frequency', metaField: 'frequency', label: 'Frequência', unit: 'ratio', betterDirection: 'lower_is_better', chartType: 'line', category: 'distribuicao', benchmarkKey: 'frequency_max', actionType: null, isKpiCard: false },
  { metricKey: 'cpm', metaField: 'cpm', label: 'CPM', unit: 'currency', betterDirection: 'lower_is_better', chartType: 'line', category: 'distribuicao', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'cpp', metaField: 'cpp', label: 'Custo por 1.000 Contas Meta alcançadas', unit: 'currency', betterDirection: 'lower_is_better', chartType: 'line', category: 'distribuicao', benchmarkKey: null, actionType: null, isKpiCard: false },

  // ── Vídeo ──────────────────────────────────────────────────────────────
  { metricKey: 'video_p25', metaField: 'video_p25_watched_actions', label: 'Reproduções 25% do vídeo', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'video', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'video_p50', metaField: 'video_p50_watched_actions', label: 'Reproduções 50% do vídeo', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'video', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'video_p75', metaField: 'video_p75_watched_actions', label: 'Reproduções 75% do vídeo', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'video', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'video_p95', metaField: 'video_p95_watched_actions', label: 'Reproduções 95% do vídeo', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'video', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'video_p100', metaField: 'video_p100_watched_actions', label: 'Reproduções 100% do vídeo', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'video', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'video_thruplay', metaField: 'video_thruplay_watched_actions', label: 'ThruPlays de 15 segundos', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'video', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'cost_per_thruplay', metaField: 'cost_per_thruplay', label: 'Custo por ThruPlay de 15 segundos', unit: 'currency', betterDirection: 'lower_is_better', chartType: 'line', category: 'video', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'video_plays', metaField: 'video_play_actions', label: 'Reproduções de vídeo', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'video', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'video_avg_watch_time', metaField: 'video_avg_time_watched_actions', label: 'Tempo médio de reprodução do vídeo', unit: 'count', betterDirection: 'higher_is_better', chartType: 'line', category: 'video', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'video_2sec_continuous', metaField: 'video_continuous_2_sec_watched_actions', label: 'Reproduções contínuas por no mín. 2 segundos', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'video', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'cost_per_2sec_continuous', metaField: 'cost_per_2_sec_continuous_video_view', label: 'Custo por reprodução contínua por no mín. 2 segundos', unit: 'currency', betterDirection: 'lower_is_better', chartType: 'line', category: 'video', benchmarkKey: null, actionType: null, isKpiCard: false },

  // ── Cliques ────────────────────────────────────────────────────────────
  { metricKey: 'ctr', metaField: 'ctr', label: 'CTR (todos)', unit: 'percent', betterDirection: 'higher_is_better', chartType: 'line', category: 'cliques', benchmarkKey: 'ctr_min', actionType: null, isKpiCard: true },
  { metricKey: 'cpc', metaField: 'cpc', label: 'CPC (todos)', unit: 'currency', betterDirection: 'lower_is_better', chartType: 'line', category: 'cliques', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'inline_link_clicks', metaField: 'inline_link_clicks', label: 'Cliques no link', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'cliques', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'inline_link_click_ctr', metaField: 'inline_link_click_ctr', label: 'CTR (taxa de cliques no link)', unit: 'percent', betterDirection: 'higher_is_better', chartType: 'line', category: 'cliques', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'cost_per_inline_link_click', metaField: 'cost_per_inline_link_click', label: 'CPC (custo por clique no link)', unit: 'currency', betterDirection: 'lower_is_better', chartType: 'line', category: 'cliques', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'outbound_clicks', metaField: 'outbound_clicks', label: 'Cliques de saída', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'cliques', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'outbound_clicks_ctr', metaField: 'outbound_clicks_ctr', label: 'CTR de saída (taxa de cliques)', unit: 'percent', betterDirection: 'higher_is_better', chartType: 'line', category: 'cliques', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'cost_per_outbound_click', metaField: 'cost_per_outbound_click', label: 'Custo por clique de saída', unit: 'currency', betterDirection: 'lower_is_better', chartType: 'line', category: 'cliques', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'cost_per_unique_click', metaField: 'cost_per_unique_click', label: 'Custo por clique único (todos)', unit: 'currency', betterDirection: 'lower_is_better', chartType: 'line', category: 'cliques', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'cost_per_unique_inline_link_click', metaField: 'cost_per_unique_inline_link_click', label: 'Custo por clique único em link inline', unit: 'currency', betterDirection: 'lower_is_better', chartType: 'line', category: 'cliques', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'cost_per_unique_outbound_click', metaField: 'cost_per_unique_outbound_click', label: 'Custo por clique único de saída', unit: 'currency', betterDirection: 'lower_is_better', chartType: 'line', category: 'cliques', benchmarkKey: null, actionType: null, isKpiCard: false },

  // ── Tráfego ────────────────────────────────────────────────────────────
  { metricKey: 'landing_page_views', metaField: 'landing_page_views', label: 'Visualizações da página de destino', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'trafego', benchmarkKey: null, actionType: null, isKpiCard: false },

  // ── Engajamento ────────────────────────────────────────────────────────
  // post_engagement/page_engagement/comment/post_reaction/like são action_type literais
  // confirmados na doc oficial de Breakdowns da Meta — mesmo campo 'actions' já usado por leads.
  { metricKey: 'post_engagement', metaField: 'actions', label: 'Engajamentos com o post', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'engajamento', benchmarkKey: null, actionType: 'post_engagement', isKpiCard: false },
  { metricKey: 'page_engagement', metaField: 'actions', label: 'Engajamento com a Página', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'engajamento', benchmarkKey: null, actionType: 'page_engagement', isKpiCard: false },
  { metricKey: 'post_comments', metaField: 'actions', label: 'Comentários no post', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'engajamento', benchmarkKey: null, actionType: 'comment', isKpiCard: false },
  { metricKey: 'post_reactions', metaField: 'actions', label: 'Reações ao post', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'engajamento', benchmarkKey: null, actionType: 'post_reaction', isKpiCard: false },
  { metricKey: 'page_likes', metaField: 'actions', label: 'Curtidas do Facebook', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'engajamento', benchmarkKey: null, actionType: 'like', isKpiCard: false },

  // ── Diagnóstico ────────────────────────────────────────────────────────
  { metricKey: 'quality_ranking', metaField: 'quality_ranking', label: 'Classificação de qualidade', unit: 'score', betterDirection: 'higher_is_better', chartType: 'line', category: 'diagnostico', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'engagement_rate_ranking', metaField: 'engagement_rate_ranking', label: 'Classificação de engajamento', unit: 'score', betterDirection: 'higher_is_better', chartType: 'line', category: 'diagnostico', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'conversion_rate_ranking', metaField: 'conversion_rate_ranking', label: 'Classificação de conversão', unit: 'score', betterDirection: 'higher_is_better', chartType: 'line', category: 'diagnostico', benchmarkKey: null, actionType: null, isKpiCard: false },

  // ── Conversões ─────────────────────────────────────────────────────────
  // action_type literais confirmados na doc oficial de Ad Action Stats da Meta
  // (developers.facebook.com/.../marketing-api/reference/ads-action-stats). Preferida sempre a
  // variante 'omni_*'/'_total' (agregada entre canais — site+app+presencial), mesmo critério já
  // usado em produção pra 'lead' (leads/cost_per_lead abaixo, convenção pré-existente).
  { metricKey: 'leads', metaField: 'actions', label: 'Leads (conversões)', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'lead', isKpiCard: true },
  { metricKey: 'cost_per_lead', metaField: 'cost_per_action_type', label: 'Custo por lead', unit: 'currency', betterDirection: 'lower_is_better', chartType: 'line', category: 'conversoes', benchmarkKey: 'cpl_ideal', actionType: 'lead', isKpiCard: true },
  { metricKey: 'purchases', metaField: 'actions', label: 'Compras', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'omni_purchase', isKpiCard: true },
  { metricKey: 'cost_per_purchase', metaField: 'cost_per_action_type', label: 'Custo por compra', unit: 'currency', betterDirection: 'lower_is_better', chartType: 'line', category: 'conversoes', benchmarkKey: null, actionType: 'omni_purchase', isKpiCard: false },
  { metricKey: 'purchase_value', metaField: 'action_values', label: 'Valor de compras', unit: 'currency', betterDirection: 'higher_is_better', chartType: 'area', category: 'conversoes', benchmarkKey: null, actionType: 'omni_purchase', isKpiCard: false },
  { metricKey: 'purchase_roas', metaField: 'purchase_roas', label: 'ROAS de compras', unit: 'ratio', betterDirection: 'higher_is_better', chartType: 'line', category: 'conversoes', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'website_purchase_roas', metaField: 'website_purchase_roas', label: 'ROAS de compras no site', unit: 'ratio', betterDirection: 'higher_is_better', chartType: 'line', category: 'conversoes', benchmarkKey: null, actionType: null, isKpiCard: false },
  { metricKey: 'add_to_cart', metaField: 'actions', label: 'Adições ao carrinho', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'omni_add_to_cart', isKpiCard: false },
  { metricKey: 'initiate_checkout', metaField: 'actions', label: 'Finalizações de compra iniciadas', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'omni_initiated_checkout', isKpiCard: false },
  { metricKey: 'complete_registration', metaField: 'actions', label: 'Registros concluídos', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'omni_complete_registration', isKpiCard: false },
  { metricKey: 'app_install', metaField: 'actions', label: 'Instalações do app', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'omni_app_install', isKpiCard: false },
  { metricKey: 'subscribe', metaField: 'actions', label: 'Assinaturas', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'subscribe_total', isKpiCard: false },
  { metricKey: 'start_trial', metaField: 'actions', label: 'Períodos de avaliação iniciados', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'start_trial_total', isKpiCard: false },
  { metricKey: 'search', metaField: 'actions', label: 'Pesquisas', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'omni_search', isKpiCard: false },
  { metricKey: 'view_content', metaField: 'actions', label: 'Visualizações de conteúdo', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'omni_view_content', isKpiCard: false },
  { metricKey: 'donate', metaField: 'actions', label: 'Doações', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'donate_total', isKpiCard: false },
  { metricKey: 'contact', metaField: 'actions', label: 'Contatos', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'contact_total', isKpiCard: false },
  { metricKey: 'schedule', metaField: 'actions', label: 'Horários marcados', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'schedule_total', isKpiCard: false },
  { metricKey: 'submit_application', metaField: 'actions', label: 'Inscrições enviadas', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'submit_application_total', isKpiCard: false },
  { metricKey: 'find_location', metaField: 'actions', label: 'Pesquisas de localização', unit: 'count', betterDirection: 'higher_is_better', chartType: 'bar', category: 'conversoes', benchmarkKey: null, actionType: 'find_location_total', isKpiCard: false },
];

function emptyMetric(): Metric {
  return {
    metricKey: '', metaField: '', label: '', unit: 'count', betterDirection: 'higher_is_better',
    chartType: 'line', category: 'gasto', benchmarkKey: null, actionType: null, isKpiCard: false,
  };
}

function MetricsHelpPanel() {
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-4 text-sm text-gray-700">
      <div>
        <p className="font-black text-gray-900 mb-1">Para que serve esta tela</p>
        <p className="text-xs text-gray-600">
          O Gerenciador de Anúncios da Meta tem ~150 métricas reais, agrupadas em 2 abas
          (Principais métricas / Rastreamento — a 3ª, Configurações de anúncios, é atributo, não
          métrica) — nosso dashboard hoje só captura um conjunto fixo. Aqui o Master decide, por
          segmento, quais dessas métricas viram card/gráfico no dashboard e variável de contexto
          pro LLM (Briefing Estratégico, Agente Autônomo) — sem precisar de código novo.
        </p>
      </div>
      <div>
        <p className="font-black text-gray-900 mb-1">Campos, em ordem de importância</p>
        <ul className="text-xs text-gray-600 space-y-1">
          <li><span className="font-semibold">Campo Meta</span> — o nome real pedido na API (ex.: <span className="font-mono bg-white rounded px-1">ctr</span>, <span className="font-mono bg-white rounded px-1">video_p75_watched_actions</span>). Precisa bater com a documentação da Meta.</li>
          <li><span className="font-semibold">Rótulo</span> — nome em PT-BR exibido no card/gráfico.</li>
          <li><span className="font-semibold">Unidade</span> — decide a formatação (R$, %, inteiro...).</li>
          <li><span className="font-semibold">Direção</span> — "subir é bom" (ex.: CTR) vs. "subir é ruim" (ex.: CPC) — decide se o card fica verde ou vermelho.</li>
          <li><span className="font-semibold">Benchmark</span> (opcional) — casa com uma chave já cadastrada em Parâmetros do Agente (ex.: <span className="font-mono bg-white rounded px-1">cpl_ideal</span>), pra comparar contra o limiar real do segmento.</li>
          <li><span className="font-semibold">action_type</span> — só aparece pra 3 campos especiais da Meta (<span className="font-mono bg-white rounded px-1">actions</span>/<span className="font-mono bg-white rounded px-1">action_values</span>/<span className="font-mono bg-white rounded px-1">cost_per_action_type</span>), que voltam como lista de eventos, não um número só — é o tipo de evento específico que você quer extrair dessa lista (ex.: "lead" pra achar os leads dentro de "actions"). Sem preencher, a métrica fica salva mas nunca captura nada.</li>
          <li><span className="font-semibold">Card KPI</span> — só métricas marcadas aqui aparecem como card no topo do dashboard; as demais ficam disponíveis no Explorador de Métricas (fase futura).</li>
        </ul>
      </div>
      <div>
        <p className="font-black text-gray-900 mb-1">Onde não procurar "todas as ~150"</p>
        <p className="text-xs text-gray-600">
          Pra análise bruta e ilimitada de qualquer métrica da Meta, use a própria ferramenta
          de Relatórios de Anúncios da Meta — ela já faz isso melhor do que vale a pena
          reconstruirmos. Aqui curamos só o que vale a pena promover dentro da nossa
          plataforma (cruzado com CRM, multi-rede e insights de IA).
        </p>
      </div>
    </div>
  );
}

export function SegmentMetricsModal({ segment, onClose }: Props) {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/master/segments/${segment.id}/metrics`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setMetrics(Array.isArray(d.metrics) ? d.metrics : []))
      .catch(() => setMetrics([]))
      .finally(() => setLoading(false));
  }, [segment.id]);

  const updateMetric = (i: number, patch: Partial<Metric>) =>
    setMetrics((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const removeMetric = (i: number) => setMetrics((prev) => prev.filter((_, idx) => idx !== i));
  const addMetric = (seed?: Metric) =>
    setMetrics((prev) => (seed && prev.some((m) => m.metricKey === seed.metricKey))
      ? prev
      : [...prev, seed ? { ...seed } : emptyMetric()]);

  async function handleSave() {
    setSaving(true); setError(''); setSaveOk(false);
    try {
      const clean = metrics.filter((m) => m.metaField.trim() && m.label.trim());
      const res = await fetch(`/api/admin/master/segments/${segment.id}/metrics`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setSaveOk(true);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">
              Segmento · {segment.name}
            </p>
            <h2 className="text-lg font-black text-gray-900">Catálogo de Métricas</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Quais campos da Meta Insights API viram card/gráfico/contexto de LLM neste segmento.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={() => setShowHelp((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all',
                showHelp ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100',
              )}
              title="Como preencher esta tela"
            >
              <QuestionMarkCircleIcon className="h-4 w-4" />
              Ajuda
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {showHelp && <MetricsHelpPanel />}

          <div className="space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Sugestões comuns — clique pra adicionar · agrupadas como no Gerenciador de Anúncios da Meta
            </p>
            {CATEGORY_OPTIONS.map((cat) => {
              const items = COMMON_SUGGESTIONS.filter((s) => s.category === cat.value);
              if (items.length === 0) return null;
              return (
                <div key={cat.value}>
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wide mb-1">
                    {cat.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((s) => {
                      const added = metrics.some((m) => m.metricKey === s.metricKey);
                      return (
                        <button
                          key={s.metricKey}
                          onClick={() => addMetric(s)}
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

          <div className="flex items-center justify-between pt-1">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {metrics.length} métrica(s) curada(s)
            </p>
          </div>

          {error && <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : metrics.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <ChartBarIcon className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Nenhuma métrica configurada</p>
              <p className="text-xs text-gray-400 mt-1">Clique numa sugestão acima ou adicione manualmente.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {metrics.map((m, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-3 bg-gray-50/50 space-y-1.5">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <input
                    value={m.label}
                    onChange={(e) => updateMetric(i, { label: e.target.value })}
                    placeholder="Rótulo (ex: CTR)"
                    className="col-span-3 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <input
                    value={m.metaField}
                    onChange={(e) => updateMetric(i, { metaField: e.target.value })}
                    placeholder="campo Meta (ex: ctr)"
                    className="col-span-3 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <select
                    value={m.category}
                    onChange={(e) => updateMetric(i, { category: e.target.value as MetricCategory })}
                    className="col-span-2 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {CATEGORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select
                    value={m.unit}
                    onChange={(e) => updateMetric(i, { unit: e.target.value as MetricUnit })}
                    className="col-span-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {UNIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select
                    value={m.betterDirection}
                    onChange={(e) => updateMetric(i, { betterDirection: e.target.value as MetricDirection })}
                    className="col-span-2 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {DIRECTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <label className="col-span-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-gray-500" title="Aparece como card no topo do dashboard">
                    <input
                      type="checkbox"
                      checked={m.isKpiCard}
                      onChange={(e) => updateMetric(i, { isKpiCard: e.target.checked })}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                    />
                    KPI
                  </label>
                  <button onClick={() => removeMetric(i)} className="text-gray-300 hover:text-red-500 p-1 justify-self-end">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                  <select
                    value={m.chartType}
                    onChange={(e) => updateMetric(i, { chartType: e.target.value as MetricChartType })}
                    className="col-span-2 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {CHART_OPTIONS.map((o) => <option key={o.value} value={o.value}>Gráfico: {o.label}</option>)}
                  </select>
                  <input
                    value={m.benchmarkKey ?? ''}
                    onChange={(e) => updateMetric(i, { benchmarkKey: e.target.value || null })}
                    placeholder="benchmark (opcional, ex: cpl_ideal)"
                    className={cn(
                      'px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400',
                      ARRAY_FIELDS.has(m.metaField) ? 'col-span-3' : 'col-span-6',
                    )}
                  />
                  {ARRAY_FIELDS.has(m.metaField) && (
                    <input
                      value={m.actionType ?? ''}
                      onChange={(e) => updateMetric(i, { actionType: e.target.value || null })}
                      placeholder="action_type (obrigatório p/ este campo, ex: lead)"
                      className="col-span-3 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50/50 text-xs font-mono text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  )}
                </div>
                  {ARRAY_FIELDS.has(m.metaField) && !m.actionType && (
                    <p className="text-[10px] text-amber-600 font-semibold pl-1">
                      ⚠️ Sem action_type, esta métrica nunca captura dado real — fica salva mas "morta".
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => addMetric()}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Adicionar métrica manualmente
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 shrink-0">
          {saveOk && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <CheckCircleIcon className="h-4 w-4" /> Salvo!
            </span>
          )}
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-white transition-all">
            Fechar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'px-5 py-2 rounded-xl text-sm font-black text-white transition-all',
              saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm',
            )}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
