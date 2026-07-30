"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  getDashboardFull, getDashboardPredictions, getLatestBriefing, generateBriefing, getBriefings, syncInsights,
  getFunnelData, getAnticipation, getHookRateBenchmarks, getCplTimeline,
  type DashboardFullData, type PredictionData, type StrategicBriefingData, type AiInsightData,
  type FunnelData7, type AnticipationResult, type TimeToEvent, type Trajectory,
  type HookRateBenchmarks, type CplTimelineData,
  getAiInsights,
} from '@/lib/marketing-api';
import type { HookSaturationResult } from '@/lib/marketing/services/hookSaturationService';
import type { SegmentDashboardResponse } from '@/app/api/admin/campanhas/dashboard/segment/route';
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, cn, OBJECTIVES, NETWORK_LABELS } from '@/lib/marketing-utils';
import { MultiMetricChart } from '@/components/marketing/charts/MultiMetricChart';
import { FunnelChart } from '@/components/marketing/charts/FunnelChart';
import { ClassicFunnelChart } from '@/components/marketing/charts/ClassicFunnelChart';
import { CplTimelineChart }  from '@/components/marketing/charts/CplTimelineChart';
import { StageFunnelWidget } from '@/components/marketing/StageFunnelWidget';
import { PredictionChart } from '@/components/marketing/charts/PredictionChart';
import { ArrowPathIcon, SparklesIcon, ClockIcon, SunIcon, MoonIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { DashboardHelpButton, HelpHint } from '@/components/marketing/DashboardHelpModal';
import { adminFetch } from '@/lib/auth/adminFetch';
import { CampaignLifecycleBadge } from '@/components/marketing/CampaignLifecycleBadge';
import type { LifecycleStatus } from '@/lib/marketing/services/campaignLifecycleTypes';
import { ExecuteGuard } from '@/components/admin/PermissionGuard';
import { angleLabel } from '@/lib/marketing/angles';
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector';
import SegmentSelector, { useSegmentSelector } from '@/components/marketing/SegmentSelector';
import { ClientRankingTable } from '@/components/marketing/ClientRankingTable';
import { SegmentNarrative } from '@/components/marketing/SegmentNarrative';
import { MultiClientMetricChart } from '@/components/marketing/charts/MultiClientMetricChart';
import { MultiClientCplChart } from '@/components/marketing/charts/MultiClientCplChart';
import { TrackingHealthWidget } from '@/components/marketing/TrackingHealthWidget';
import { TokenExpiryBanner } from '@/components/marketing/TokenExpiryBanner';
import { TimeToEventBar }      from '@/components/marketing/charts/TimeToEventBar';
import { SignalTrajectory }    from '@/components/marketing/charts/SignalTrajectory';
import { DemandRadar }         from '@/components/marketing/charts/DemandRadar';
import { CampaignMapWidget }   from '@/components/marketing/CampaignMapWidget';
import { KpiCard, HookRateKpiCard } from '@/components/marketing/dashboard/KpiCard';

// ─── Palettes ─────────────────────────────────────────────────────────────────
const PALETTE_DARK  = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#e879f9'];
const PALETTE_LIGHT = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];
import { CommandCenterView } from '@/components/marketing/dashboard/CommandCenterView';
import { AnalyticsView } from '@/components/marketing/dashboard/AnalyticsView';
import { DeepDiveView } from '@/components/marketing/dashboard/DeepDiveView';
import { GoogleAdsView } from '@/components/marketing/dashboard/GoogleAdsView';
import { CampaignsTable } from '@/components/marketing/dashboard/CampaignsTable';
import { PeriodBadge } from '@/components/marketing/dashboard/PeriodBadge';
import { FarolSection } from '@/components/marketing/dashboard/FarolSection';
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export function DashboardPage() {
  const [data, setData]                     = useState<DashboardFullData | null>(null);
  const [cplTimeline, setCplTimeline]       = useState<CplTimelineData | null>(null);
  const [funnelData7, setFunnelData7]       = useState<FunnelData7 | null>(null);
  const [predictions, setPredictions]       = useState<PredictionData | null>(null);
  const [briefings, setBriefings]           = useState<StrategicBriefingData[]>([]);
  const [briefingHistory, setBriefingHistory] = useState<StrategicBriefingData[]>([]);
  const [aiInsights, setAiInsights]         = useState<AiInsightData[]>([]);
  const [aiInsightsBySegment, setAiInsightsBySegment] = useState<{ segmentId: string | null; segmentName: string; insights: any[] }[]>([]);
  const [anticipationData, setAnticipationData] = useState<AnticipationResult[]>([]);
  const [hookSaturation, setHookSaturation]   = useState<HookSaturationResult | null>(null);
  const [hookRateBenchmarks, setHookRateBenchmarks] = useState<HookRateBenchmarks>({
    hook_rate_critical: 8,
    hook_rate_min: 12,
    hook_rate_good: 22,
  });
  const [loading, setLoading]               = useState(true);
  const [syncing, setSyncing]               = useState(false);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [showBriefingHistory, setShowBriefingHistory] = useState(false);
  const [isDark, setIsDark]                 = useState(true); // dark by default
  // PARTE D1 — "GOOGLE" deixou de ser uma aba paralela; rede agora é filtro (ver networkFilter
  // abaixo). As 3 camadas de profundidade voltam a ser o único eixo de navegação.
  const [activeLayer, setActiveLayer]       = useState<'COMMAND' | 'ANALYTICS' | 'DEEP_DIVE'>('COMMAND');

  const [dateRange, setDateRange]           = useState('1'); // 'Hoje' como padrão
  const [startDate, setStartDate]           = useState('');
  const [endDate, setEndDate]               = useState('');
  const endDateRef = React.useRef<HTMLInputElement>(null);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [objectiveFilter, setObjectiveFilter]   = useState('');
  const [statusFilter, setStatusFilter]         = useState('');
  const [adSetFilter, setAdSetFilter]           = useState('');
  // PARTE D1 — filtro de rede (Todas / Meta / Google / TikTok...), agnóstico de qual camada
  // está ativa; opções vêm de availableNetworks (só redes com dado real no escopo).
  const [networkFilter, setNetworkFilter]       = useState('');

  // Período calculado para passar ao hook de segmentos (filtra por atividade real)
  const segmentPeriodStart = startDate || new Date(Date.now() - parseInt(dateRange || '30') * 86400000).toISOString().split('T')[0];
  const segmentPeriodEnd   = endDate   || new Date().toISOString().split('T')[0];

  const {
    segments, loading: segmentsLoading,
    segmentFilter, activeSegment,
    toggleSegment, activateSegment, clearSegments,
  } = useSegmentSelector({ startDate: segmentPeriodStart, endDate: segmentPeriodEnd });

  // clientFilter é sempre relativo ao segmento ativo.
  // isOwnSegment define o default: 'own' só no segmento do tenant; senão 'segment'.
  const isOwnSegment = segments.find(s => s.id === activeSegment)?.isOwn ?? false;
  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('dashboard', activeSegment, isOwnSegment);

  // Dados do modo "Todos os Clientes"
  const [segmentDashData, setSegmentDashData]     = useState<SegmentDashboardResponse | null>(null);
  const [segmentDashLoading, setSegmentDashLoading] = useState(false);

  const isSegmentMode = clientFilter === 'segment';

  // Ao trocar cliente ou segmento:
  //  1. Limpa campanha/adset selecionados — IDs do contexto anterior são inválidos aqui
  //  2. Zera a lista de campanhas/adsets no data para o dropdown aparecer vazio imediatamente,
  //     sem exibir campanhas de outro cliente enquanto o reload carrega
  useEffect(() => {
    setSelectedCampaign('');
    setAdSetFilter('');
    setData(prev => prev ? { ...prev, campaigns: [], adSets: [] } : null);
    if (clientFilter !== 'segment') setSegmentDashData(null);
  }, [clientFilter, activeSegment]);

  // Persist theme preference
  useEffect(() => {
    const saved = localStorage.getItem('net-imob-theme');
    if (saved) setIsDark(saved !== 'light');
  }, []);

  const toggleTheme = () =>
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('net-imob-theme', next ? 'dark' : 'light');
      return next;
    });

  // Carregar dados do segmento (modo "Todos os Clientes")
  useEffect(() => {
    if (!activeSegment || clientFilter !== 'segment') return;
    setSegmentDashLoading(true);
    const params = new URLSearchParams({ segmentId: activeSegment });
    if (startDate && endDate) {
      params.set('startDate', startDate);
      params.set('endDate', endDate);
    } else {
      params.set('startDate', new Date(Date.now() - parseInt(dateRange) * 86400000).toISOString().split('T')[0]);
      params.set('endDate', new Date().toISOString().split('T')[0]);
    }
    adminFetch(`/api/admin/campanhas/dashboard/segment?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setSegmentDashData(d))
      .catch(() => {})
      .finally(() => setSegmentDashLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSegment, clientFilter, dateRange, startDate, endDate]);

  useEffect(() => {
    // Não carregar nada enquanto nenhum segmento estiver selecionado
    if (!activeSegment) return;
    // No modo segmento os dados são carregados pelo useEffect acima
    if (clientFilter === 'segment') return;
    loadData();
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateRange, startDate, endDate, selectedCampaign, objectiveFilter, statusFilter, adSetFilter, clientFilter, activeSegment, networkFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate && endDate) {
        params.startDate = startDate; params.endDate = endDate;
      } else {
        params.startDate = new Date(Date.now() - parseInt(dateRange) * 86400000).toISOString().split('T')[0];
        params.endDate   = new Date().toISOString().split('T')[0];
      }
      if (selectedCampaign)  params.campaignId      = selectedCampaign;
      if (objectiveFilter)   params.objectiveFilter = objectiveFilter;
      if (statusFilter)      params.statusFilter    = statusFilter;
      if (adSetFilter)       params.adSetId         = adSetFilter;
      if (clientFilter)      params.clientId        = clientFilter;
      // Segmento sempre presente — garante isolamento
      if (activeSegment)     params.segmentId       = activeSegment;
      // PARTE D1 — filtro de rede, agora propagado a TODOS os endpoints do dashboard (correção:
      // antes só /dashboard/full respeitava; Actionable Alerts e Funil por Estágio continuavam
      // trazendo dado de todas as redes mesmo com o filtro ativo — enganoso, não só incompleto).
      if (networkFilter)     params.network         = networkFilter;

      // Parâmetros compartilhados por todos os endpoints
      const sharedFilters: any = {
        startDate:   params.startDate,
        endDate:     params.endDate,
        segmentId:   activeSegment ?? undefined,
        ...(selectedCampaign && { campaignId:      selectedCampaign }),
        ...(objectiveFilter  && { objectiveFilter }),
        ...(statusFilter     && { statusFilter }),
        ...(adSetFilter      && { adSetId:         adSetFilter }),
        ...(clientFilter     && { clientId:        clientFilter }),
        ...(networkFilter    && { network:         networkFilter }),
      };

      const [dashData, predData, funData, hrbData, cplData] = await Promise.all([
        getDashboardFull(params).catch((e) => { console.error('[Dashboard] getDashboardFull:', e); return null; }),
        getDashboardPredictions(sharedFilters).catch(() => null),
        getFunnelData(sharedFilters).catch(() => null),
        getHookRateBenchmarks(
          clientFilter && clientFilter !== 'segment' ? clientFilter : null,
          activeSegment ?? null,
        ).catch(() => null),
        getCplTimeline(sharedFilters).catch((e) => { console.error('[Dashboard] getCplTimeline:', e); return null; }),
      ]);
      if (dashData) setData(dashData);
      if (predData) setPredictions(predData);
      if (funData)  setFunnelData7(funData);
      if (hrbData)  setHookRateBenchmarks(hrbData);
      if (cplData)  setCplTimeline(cplData);

      // Para briefing/histórico: filtrar pelo mesmo escopo de cliente ativo.
      // 'segment' é UI-only — sem clientId para buscar o briefing do segmento todo.
      const briefClientId = (clientFilter && clientFilter !== 'segment') ? clientFilter : undefined;
      const hookSatQs = new URLSearchParams();
      if (clientFilter && clientFilter !== 'segment') hookSatQs.set('clientId', clientFilter);
      Promise.all([
        getLatestBriefing({ segmentId: activeSegment ?? undefined, clientId: briefClientId }).catch(() => null),
        getBriefings({ limit: 5, segmentId: activeSegment ?? undefined, clientId: briefClientId }).catch(() => []),
        getAiInsights(sharedFilters).catch(() => ({ insights: [], calibrationActions: [] })),
        getAnticipation({
          ...(clientFilter && { clientId: clientFilter as string }),
          ...(activeSegment && { segmentId: activeSegment }),
          ...(networkFilter && { network: networkFilter }),
        }).catch(() => []),
        adminFetch(`/api/admin/campanhas/criativos/hook-saturation?${hookSatQs}`)
          .then(r => r.ok ? r.json() : null).catch(() => null),
      ]).then(([latestBriefing, history, aiData, anticipation, hookSat]) => {
        setBriefings(Array.isArray(latestBriefing) ? latestBriefing : (latestBriefing ? [latestBriefing as any] : []));
        setBriefingHistory(history as StrategicBriefingData[]);
        const aiResult = aiData as any;
        setAiInsights(Array.isArray(aiResult) ? aiResult : (aiResult?.insights ?? []));
        setAiInsightsBySegment(aiResult?.bySegment ?? []);
        setAnticipationData(anticipation as AnticipationResult[]);
        setHookSaturation(hookSat?.totalCreatives > 0 ? hookSat : null);
      });
    } catch (err) { console.error('[Dashboard] Erro ao carregar dados:', err); }
    finally { setLoading(false); }
  }

  async function handleLifecycleTransition(campaignId: string, toStatus: LifecycleStatus) {
    const res = await adminFetch(`/api/admin/campanhas/campaigns/${campaignId}/lifecycle`, {
      method: 'POST',
      body: JSON.stringify({ toStatus, reason: 'Alteração manual via dashboard' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Lifecycle] POST falhou', res.status, err);
      alert(`Erro ao alterar status: ${err.error ?? res.status}`);
      return;
    }
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        campaigns: prev.campaigns.map(c =>
          c.id === campaignId
            ? { ...c, lifecycleStatus: toStatus, lifecycleChangedAt: new Date().toISOString() }
            : c
        ),
      };
    });
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await syncInsights();
      await loadData();
      // Sincronização com erros parciais
      if (result?.errors?.length) {
        const firstErr = result.errors[0];
        alert(`Sincronizado com avisos:\n${result.synced} registros salvos\n\nErro: ${firstErr}`);
      }
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error ?? err?.message ?? 'Erro desconhecido';
      alert(`Erro ao sincronizar:\n${apiMsg}`);
    }
    finally { setSyncing(false); }
  }

  async function handleGenerateBriefing() {
    setGeneratingBriefing(true);
    try {
      const genClientId = (clientFilter && clientFilter !== 'segment') ? clientFilter : undefined;
      // Calcula as datas exatas do filtro atual para alinhar com os KPIs
      const genStart = startDate || new Date(Date.now() - parseInt(dateRange || '7') * 86400000).toISOString().split('T')[0];
      const genEnd   = endDate   || new Date().toISOString().split('T')[0];
      const bs = await generateBriefing('manual', genClientId, effectivePeriodDays, activeSegment ?? undefined, genStart, genEnd);
      const arr = Array.isArray(bs) ? bs : (bs ? [bs as any] : []);
      setBriefings(arr);
      setBriefingHistory(prev => [...arr, ...prev].slice(0, 5));
    } catch { alert('Erro ao gerar briefing'); }
    finally { setGeneratingBriefing(false); }
  }

  function handleQuickDate(days: string) { setStartDate(''); setEndDate(''); setDateRange(days); }

  // ─── Derived ────────────────────────────────────────────────────────────────
  const t         = data?.currentPeriod.totals;
  const d         = data?.deltas;
  const campaigns = data?.campaigns || [];
  const adSets    = data?.adSets || [];
  // PARTE D1 — Google "está no escopo" quando o usuário filtrou por ela explicitamente, ou
  // quando não há filtro de rede (Todas) e existe dado real de Google no período. Controla o
  // drill-down de Search Terms/IS dentro da Inteligência Profunda (não é mais aba paralela).
  const googleInScope = networkFilter === 'google' || (networkFilter === '' && !!data?.cplByNetwork?.google);
  // null (não 0) quando não há lead — CPL é indefinido sem lead, não "R$ 0,00" (que sugeriria
  // "lead grátis", o oposto do que aconteceu de verdade quando há gasto sem nenhum lead).
  const cpl: number | null = t && data?.currentPeriod.leadCount && data.currentPeriod.leadCount > 0
    ? t.spend / data.currentPeriod.leadCount : null;

  // ctr/cpc/cpm são colunas nullable em Insight — algumas linhas (ex.: sync antigo, dado
  // seedado) nunca tiveram esses campos preenchidos mesmo com spend/clicks/impressions reais.
  // Sem fallback, o gráfico de Eficiência ficava em branco (nenhuma linha, nenhum eixo) pra
  // qualquer período que caísse só nessas linhas — mesma fórmula já usada em calcTotals acima.
  const chartData = data?.currentPeriod.insights
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(i => ({
      date: utcDateLabel(i.date),
      spend: i.spend, clicks: i.clicks, impressions: i.impressions,
      ctr: i.ctr ?? (i.impressions > 0 ? (i.clicks / i.impressions) * 100 : 0),
      cpc: i.cpc ?? (i.clicks > 0 ? i.spend / i.clicks : 0),
      cpm: i.cpm ?? (i.impressions > 0 ? (i.spend / i.impressions) * 1000 : 0),
      conversions: i.conversions,
    })) || [];

  // CPL por dia vem de /dashboard/cpl (endpoint dedicado, cplTimelineService.ts) — antes era
  // derivado aqui zipando spend por linha de Insight (1 linha por CAMPANHA por dia) com leads
  // por dia; com mais de 1 campanha ativa no mesmo dia isso duplicava o total de leads do dia
  // uma vez por campanha. O endpoint já soma corretamente por dia antes de calcular o CPL.
  const cplData = (cplTimeline?.data || []).map(p => ({
    date: utcDateLabel(p.date), spend: p.spend, leads: p.leads, cpl: p.cpl,
  }));

  // FASE 5 — Hook Rate (video_views_3s / impressions × 100)
  const totalVideoViews3s = data?.currentPeriod.insights.reduce(
    (s, i) => s + (Number((i as any).videoViews3s) || 0), 0
  ) ?? 0;
  const totalImpressionsN = Number(t?.impressions) || 0;
  const hookRateRaw       = totalVideoViews3s > 0 && totalImpressionsN > 0
    ? (totalVideoViews3s / totalImpressionsN) * 100 : null;
  const hookRate          = hookRateRaw !== null && isFinite(hookRateRaw) ? hookRateRaw : null;
  const { hook_rate_critical: hrCritical, hook_rate_min: hrMin } = hookRateBenchmarks;
  const hookRateColor     = hookRate === null
    ? (isDark ? 'text-slate-600' : 'text-slate-400')
    : hookRate < hrCritical ? 'text-red-500' : hookRate < hrMin ? 'text-amber-500' : 'text-emerald-500';

  const COLORS = isDark ? PALETTE_DARK : PALETTE_LIGHT;
  // Agrega gasto real (insights) por campanha, em ordem decrescente
  const campaignSpendData = (() => {
    const insights = data?.currentPeriod.insights || [];
    const spendMap = new Map<string, number>();
    for (const ins of insights) {
      const id = (ins as any).campaignId as string;
      spendMap.set(id, (spendMap.get(id) || 0) + Number((ins as any).spend || 0));
    }
    const campaignMap = new Map(campaigns.map(c => [c.id, c.name]));
    return Array.from(spendMap.entries())
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([id, spend], i) => ({
        name: campaignMap.get(id) || id.slice(0, 8),
        value: spend,
        color: COLORS[i % COLORS.length],
      }));
  })();

  // Dias efetivos para APIs (usado também no briefing)
  const effectivePeriodDays = startDate && endDate
    ? Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
    : parseInt(dateRange) || 1;

  // Helper para exibir datas do filtro (strings YYYY-MM-DD) sem deslocamento de timezone
  const fmtFilterDate = (iso: string, full = false) => {
    const [y, m, d] = iso.split('-');
    return full ? `${d}/${m}/${y}` : `${d}/${m}`;
  };

  const periodBadgeLabel = startDate && endDate
    ? `${fmtFilterDate(startDate)} – ${fmtFilterDate(endDate)}`
    : dateRange === '1' ? 'Hoje'
    : `${dateRange}d`;

  const periodLabel = startDate && endDate
    ? `${fmtFilterDate(startDate, true)} — ${fmtFilterDate(endDate, true)}`
    : dateRange === '1' ? 'Hoje'
    : `Últimos ${dateRange} dias`;

  // ─── Theme tokens ─────────────────────────────────────────────────────────
  // DESIGN.md — "O Painel de Missão": navy-deep (#0a192f) como corpo, navy-surface (#112240)
  // como superfície elevada de card. "A Regra Flat-By-Default": sombra só em resposta a
  // estado (hover/modal), nunca decorativa em repouso — cardBase deixou de ter box-shadow
  // estático.
  const bg       = isDark ? 'bg-navy' : 'bg-slate-50';
  const cardBase = isDark
    ? 'bg-navy-light border border-[rgba(255,255,255,0.06)] transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
    : 'bg-white border border-slate-200/80 transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]';
  const tx       = isDark ? 'text-slate-300' : 'text-slate-900';
  const txMuted  = isDark ? 'text-slate-400' : 'text-slate-500';
  const txFaint  = isDark ? 'text-slate-500' : 'text-slate-400';
  const divider  = isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-100';

  // DESIGN.md — "Anel de foco (#2563eb) ... fixo, não substituível": o foco de acessibilidade
  // é sempre azul, independente do acento de decisão (âmbar) usado no resto da tela.
  const selectBase = isDark
    ? 'border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all'
    : 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all';
  const selectStyle = isDark
    ? { colorScheme: 'dark' as const, backgroundColor: '#1e2a3a', color: '#cbd5e1' }
    : undefined;

  const predColors = isDark
    ? ['#818cf8', '#34d399', '#fbbf24', '#f87171']
    : ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  const tooltipCss = {
    contentStyle: {
      background: isDark ? '#0d1421' : '#ffffff',
      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
      borderRadius: '12px', fontSize: '12px', fontWeight: 500,
      color: isDark ? '#cbd5e1' : '#0f172a',
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 6px rgba(0,0,0,0.1)',
    },
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`px-4 py-6 min-h-screen transition-colors duration-300 ${bg}`}>
      <div className="w-full">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2">Campanhas</p>
            <h1 className={`text-3xl font-black tracking-tight ${tx}`}>Dashboard</h1>
            <p className={`mt-1 text-sm font-medium ${txMuted}`}>{periodLabel}</p>
          </div>
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex flex-col gap-2">
              <SegmentSelector
                selected={segmentFilter}
                activeSegment={activeSegment}
                onToggle={toggleSegment}
                onActivate={activateSegment}
                onClear={clearSegments}
                segments={segments}
                loading={segmentsLoading}
                isDark={isDark}
              />
              {activeSegment && (
                <ClientSelector
                  value={clientFilter}
                  onChange={setClientFilter}
                  clients={clients}
                  loading={clientsLoading}
                  storageKey="dashboard"
                  variant="toggle"
                  activeSegmentName={segments.find(s => s.id === activeSegment)?.name}
                />
              )}
            </div>
            {/* Dark / Light toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200',
                isDark
                  ? 'bg-[rgba(255,255,255,0.05)] text-slate-400 hover:bg-[rgba(255,255,255,0.09)] border border-[rgba(255,255,255,0.07)] hover:text-slate-300'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm hover:text-slate-900'
              )}
            >
              {isDark ? <><SunIcon className="h-3.5 w-3.5" /> Claro</> : <><MoonIcon className="h-3.5 w-3.5" /> Escuro</>}
            </button>
            {/* Sync Meta + Ajuda empilhados */}
            <div className="flex flex-col gap-1.5">
              <ExecuteGuard resource="dashboard-campanhas">
                {/* DESIGN.md — button-primary: único botão em âmbar por contexto, no ponto de
                    decisão real da tela (disparar uma sincronização). Sem transform/glow no
                    hover — "o âmbar fala por si". */}
                <button onClick={handleSync} disabled={syncing}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gold disabled:opacity-50 transition-colors">
                  <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Sincronizando...' : 'Sync Meta'}
                </button>
              </ExecuteGuard>
              <DashboardHelpButton isDark={isDark} />
            </div>
          </div>
        </div>

        <TokenExpiryBanner isDark={isDark} />

        {/* ── Filters ───────────────────────────────────────────────────────── */}
        <div className={`rounded-2xl p-4 mb-6 ${cardBase}`}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Campanha</label>
              <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}
                style={selectStyle} className={`${selectBase} w-full`}>
                <option value="">Todas</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="min-w-[120px]">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Objetivo</label>
              <select value={objectiveFilter} onChange={e => setObjectiveFilter(e.target.value)}
                style={selectStyle} className={selectBase}>
                <option value="">Todos</option>
                {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="min-w-[100px]">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                style={selectStyle} className={selectBase}>
                <option value="">Todos</option>
                <option value="ACTIVE">Ativo</option>
                <option value="PAUSED">Pausado</option>
              </select>
            </div>
            {/* PARTE D1 — só aparece quando há ≥2 redes com dado real no escopo; senão é ruído */}
            {(data?.availableNetworks?.length ?? 0) > 1 && (
              <div className="min-w-[110px]">
                <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Rede</label>
                <select value={networkFilter} onChange={e => setNetworkFilter(e.target.value)}
                  style={selectStyle} className={selectBase}>
                  <option value="">Todas</option>
                  {data!.availableNetworks!.map(n => (
                    <option key={n} value={n}>{NETWORK_LABELS[n] ?? (n.charAt(0).toUpperCase() + n.slice(1))}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="min-w-[140px]">
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Ad Set</label>
              <select value={adSetFilter} onChange={e => setAdSetFilter(e.target.value)}
                style={selectStyle} className={selectBase}>
                <option value="">Todos</option>
                {adSets.map(as_ => <option key={as_.id} value={as_.id}>{as_.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>De</label>
              <DateInputPtBR
                value={startDate}
                onChange={iso => { setStartDate(iso); setDateRange(''); }}
                onComplete={() => endDateRef.current?.focus()}
                style={selectStyle} className={selectBase} />
            </div>
            <div>
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Até</label>
              <DateInputPtBR
                ref={endDateRef}
                value={endDate}
                onChange={iso => { setEndDate(iso); setDateRange(''); }}
                style={selectStyle} className={selectBase} />
            </div>
            <div>
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Período</label>
              <div className={cn('flex gap-1 rounded-xl p-1 border',
                isDark ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)]' : 'bg-slate-50 border-slate-200')}>
                {[
                  { value: '1',  label: 'Hoje' },
                  { value: '7',  label: '7d'   },
                  { value: '15', label: '15d'  },
                  { value: '30', label: '30d'  },
                ].map(({ value, label }) => (
                  <button key={value} onClick={() => handleQuickDate(value)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-black transition-colors', dateRange === value
                      ? 'bg-gold-premium text-navy-dark'
                      : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-900')}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Estado: nenhum segmento selecionado ───────────────────────────── */}
        {!activeSegment && (
          <div className={cn(
            'rounded-2xl p-16 text-center flex flex-col items-center gap-4',
            isDark
              ? 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]'
              : 'bg-white border border-slate-200 shadow-sm',
          )}>
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center text-2xl',
              isDark ? 'bg-indigo-500/10' : 'bg-indigo-50',
            )}>
              🏷️
            </div>
            <div>
              <p className={cn('text-base font-black mb-1', isDark ? 'text-slate-300' : 'text-slate-800')}>
                Selecione um segmento para visualizar os dados
              </p>
              <p className={cn('text-sm', isDark ? 'text-slate-500' : 'text-slate-400')}>
                Os dados são sempre isolados por segmento de negócio — métricas de segmentos
                distintos nunca são somadas ou comparadas entre si.
              </p>
            </div>
            {segments.length > 0 && (
              <p className={cn('text-xs mt-2', isDark ? 'text-slate-600' : 'text-slate-400')}>
                {segments.length} segmento{segments.length > 1 ? 's' : ''} disponível{segments.length > 1 ? 'eis' : ''} acima ↑
              </p>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            MODO "TODOS OS CLIENTES" — Inteligência de Segmento
        ══════════════════════════════════════════════════════════════════ */}
        {activeSegment && isSegmentMode && (
          <SegmentDashboard
            segmentData={segmentDashData}
            loading={segmentDashLoading}
            isDark={isDark}
            cardBase={cardBase}
            tx={tx}
            txMuted={txMuted}
            txFaint={txFaint}
            divider={divider}
            periodLabel={periodLabel}
            periodBadgeLabel={periodBadgeLabel}
            predColors={predColors}
            tooltipCss={tooltipCss}
            periodDays={effectivePeriodDays}
            startDate={segmentPeriodStart}
            endDate={segmentPeriodEnd}
          />
        )}

        {/* ── Conteúdo — só exibe quando há segmento ativo e NÃO é modo segmento ── */}
        {activeSegment && !isSegmentMode && <>
        
        {/* ── Layer Navigation (Tabs) ── */}
        <div className="flex p-1 mb-8 rounded-xl w-fit border transition-all" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
          <button
             onClick={() => setActiveLayer('COMMAND')}
             className={cn('px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors', activeLayer === 'COMMAND' ? 'bg-gold-premium text-navy-dark' : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'))}
          >
             Visão Executiva
          </button>
          <button
             onClick={() => setActiveLayer('ANALYTICS')}
             className={cn('px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors', activeLayer === 'ANALYTICS' ? 'bg-gold-premium text-navy-dark' : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'))}
          >
             Análise de Dados
          </button>
          <button
             onClick={() => setActiveLayer('DEEP_DIVE')}
             className={cn('px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors', activeLayer === 'DEEP_DIVE' ? 'bg-gold-premium text-navy-dark' : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'))}
          >
             Inteligência Profunda
          </button>
        </div>

        {activeLayer === 'COMMAND' && (
          <CommandCenterView
            isDark={isDark} loading={loading} data={data} aiInsights={aiInsights}
            hookSaturation={hookSaturation} cardBase={cardBase} tx={tx} txMuted={txMuted} txFaint={txFaint}
            cpl={cpl} hookRate={hookRate} hookRateBenchmarks={hookRateBenchmarks}
            chartData={chartData} funnelData={funnelData7} periodLabel={periodLabel}
            periodDays={effectivePeriodDays}
            activeSegment={activeSegment} clientFilter={clientFilter}
            segmentPeriodStart={segmentPeriodStart} segmentPeriodEnd={segmentPeriodEnd}
            network={networkFilter || null}
          />
        )}

        {activeLayer === 'ANALYTICS' && (
          <AnalyticsView 
            isDark={isDark}
            data={data}
            funnelData7={funnelData7}
            cardBase={cardBase}
            tx={tx}
            txMuted={txMuted}
            txFaint={txFaint}
            periodLabel={periodLabel}
            periodBadgeLabel={periodBadgeLabel}
            predColors={predColors}
            chartData={chartData}
            cplData={cplData}
            campaignSpendData={campaignSpendData}
            campaigns={campaigns}
            tooltipCss={tooltipCss}
            cpl={cpl}
            hookRate={hookRate}
            hookRateColor={hookRateColor}
            hookRateBenchmarks={hookRateBenchmarks}
            clientFilter={clientFilter}
            loading={loading}
          />
        )}

        {activeLayer === 'DEEP_DIVE' && (
          <>
        {/* ── Content ───────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={cn('rounded-2xl border h-80 animate-pulse',
                isDark ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)]' : 'bg-white border-slate-100')} />
            ))}
          </div>
        ) : !data || data.currentPeriod.insights.length === 0 ? (
          <div className={`rounded-2xl p-16 text-center ${cardBase}`}>
            <p className={`text-sm font-black mb-1 ${tx}`}>Nenhum dado disponível</p>
            <p className={`text-xs ${txMuted}`}>Sincronize os dados do Meta ou aguarde as campanhas gerarem resultados.</p>
          </div>
        ) : (
          <>
            {/* PARTE D1 — Search Terms/IS Lost do Google deixou de ser aba paralela; é
                drill-down tático dentro da Inteligência Profunda, só quando Google está no
                escopo (filtro de rede = Google, ou "Todas" com dado real de Google no período).
                Movido pro topo da aba (antes do Farol de Milha) — é informação acionável
                (ROAS, orçamento perdido) e ficava enterrada depois da seção de Projeções, que
                agora abre expandida por padrão. */}
            {googleInScope && (
              <GoogleAdsView isDark={isDark} cardBase={cardBase} tx={tx} txMuted={txMuted} />
            )}

            {/* ══════════════════════════════════════════════════════════════
                DEEP DIVE (Camada 3) — Farol, Briefings, Insights (FASE 8.5/18)
            ══════════════════════════════════════════════════════════════ */}
            <DeepDiveView
              isDark={isDark}
              anticipationData={anticipationData}
              predictions={predictions}
              campaigns={campaigns}
              cardBase={cardBase}
              tx={tx}
              txMuted={txMuted}
              txFaint={txFaint}
              periodLabel={periodBadgeLabel}
              periodBadgeLabel={periodBadgeLabel}
              predColors={isDark ? PALETTE_DARK : PALETTE_LIGHT}
              activeSegment={activeSegment}
              clientFilter={clientFilter as string}
              segmentPeriodStart={segmentPeriodStart}
              segmentPeriodEnd={segmentPeriodEnd}
              dateRange={dateRange}
              briefings={briefings}
              briefingHistory={briefingHistory}
              showBriefingHistory={showBriefingHistory}
              setShowBriefingHistory={setShowBriefingHistory}
              generatingBriefing={generatingBriefing}
              handleGenerateBriefing={handleGenerateBriefing}
              aiInsights={aiInsights}
              aiInsightsBySegment={aiInsightsBySegment}
              hookSaturation={hookSaturation}
            />

            {/* ── Campaigns Table ─────────────────────────────────────────── */}
            <CampaignsTable
              campaigns={campaigns}
              isDark={isDark}
              cardBase={cardBase}
              tx={tx}
              txMuted={txMuted}
              txFaint={txFaint}
              divider={divider}
              periodBadgeLabel={periodBadgeLabel}
              onLifecycleTransition={handleLifecycleTransition}
            />
          </>
        )}
        {/* Fecha activeLayer !== COMMAND */}
        </>
        )}
        {/* Fecha {activeSegment && <> ... </>} */}
        </>}
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
//  SEGMENT DASHBOARD — Modo "Todos os Clientes"
// ═════════════════════════════════════════════════════════════════════════════

interface SegmentDashboardProps {
  segmentData: SegmentDashboardResponse | null;
  loading: boolean;
  isDark: boolean;
  cardBase: string;
  tx: string;
  txMuted: string;
  txFaint: string;
  divider: string;
  periodLabel: string;
  periodBadgeLabel: string;
  predColors: string[];
  tooltipCss: any;
  periodDays: number;
  startDate: string;
  endDate: string;
}

function SegmentDashboard({
  segmentData, loading, isDark,
  cardBase, tx, txMuted, txFaint, divider,
  periodLabel, periodBadgeLabel, periodDays,
  startDate, endDate,
}: SegmentDashboardProps) {

  const bench     = segmentData?.benchmark;
  const seg       = segmentData?.segment;
  const clients   = segmentData?.clients ?? [];
  const tenantOwn = segmentData?.tenantOwn ?? null;
  // allCount = clientes externos apenas (para o badge do ClientSelector ser consistente)
  const clientCount = clients.length;
  const allCount    = clientCount + (tenantOwn ? 1 : 0);

  // ── Anticipation data para Farol de Milha ────────────────────────────────
  const [anticipation, setAnticipation]         = useState<AnticipationResult[]>([]);
  const [_anticipationLoading, setAnticLoading] = useState(false);

  // Funil por estágio — agregado do segmento (TOF/MOF/BOF). Mesmo segmento = comparável.
  const [segFunnel, setSegFunnel] = useState<FunnelData7 | null>(null);

  useEffect(() => {
    if (!segmentData?.segment?.id) return;
    setAnticLoading(true);
    adminFetch(`/api/admin/campanhas/dashboard/anticipation?segmentId=${segmentData.segment.id}`)
      .then(r => r.ok ? r.json() : [])
      .then((d: any) => setAnticipation(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setAnticLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentData?.segment?.id]);

  useEffect(() => {
    if (!segmentData?.segment?.id) return;
    const params = new URLSearchParams({ segmentId: segmentData.segment.id });
    if (startDate && endDate) { params.set('startDate', startDate); params.set('endDate', endDate); }
    adminFetch(`/api/admin/campanhas/dashboard/funnel?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => setSegFunnel(d))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentData?.segment?.id, startDate, endDate]);

  // ── Modal "Visualizar Clientes" ──────────────────────────────────────────
  const [showClientsModal, setShowClientsModal] = useState(false);

  // ── AI Insights agrupados por cliente — para o modo "Todos os Clientes" ──
  // Complementa o SegmentNarrative: insights = granular/automático; narrativa = holístico/LLM
  const [segInsights, setSegInsights]         = useState<{ insights: AiInsightData[]; bySegment: any[] } | null>(null);

  useEffect(() => {
    if (!segmentData?.segment?.id) return;
    adminFetch(`/api/admin/campanhas/insights/ai?segmentId=${segmentData.segment.id}`)
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => setSegInsights(d ?? null))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentData?.segment?.id]);

  // Skeleton de loading
  if (loading) {
    return (
      <div className="space-y-5">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={cn(
            'rounded-2xl h-48 animate-pulse',
            isDark ? 'bg-white/[0.03] border border-white/5' : 'bg-slate-100 border border-slate-200',
          )} />
        ))}
      </div>
    );
  }

  if (!segmentData) {
    return (
      <div className={cn('rounded-2xl p-16 text-center', cardBase)}>
        <p className={cn('text-sm font-black mb-1', tx)}>Sem dados para este segmento no período.</p>
        <p className={cn('text-xs', txMuted)}>Verifique se há clientes com campanhas ativas neste segmento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── BANNER: Contexto do segmento ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-2xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap',
          isDark
            ? 'bg-violet-500/8 border border-violet-500/20'
            : 'bg-violet-50 border border-violet-200/60',
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl', isDark ? 'bg-violet-500/15' : 'bg-violet-100')}>
            <span className="text-lg leading-none">🏢</span>
          </div>
          <div>
            <p className={cn('text-xs font-black uppercase tracking-widest', isDark ? 'text-violet-500' : 'text-violet-600')}>
              Inteligência de Segmento
            </p>
            <h2 className={cn('text-base font-black', tx)}>
              {seg?.name}
              {clientCount > 0 && ` · ${clientCount} cliente${clientCount !== 1 ? 's' : ''}`}
              {tenantOwn && clientCount === 0 && ' · Minha Empresa'}
              {tenantOwn && clientCount > 0 && ' + Minha Empresa'}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {clientCount > 0 && (
            <button
              onClick={() => setShowClientsModal(true)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                isDark
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25 hover:bg-violet-500/25 hover:text-violet-200'
                  : 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100',
              )}
            >
              <span className="text-sm leading-none">👥</span>
              Visualizar Clientes
            </button>
          )}
          <div className="text-right">
            <p className={cn('text-[9px] font-black uppercase tracking-widest', txFaint)}>Período</p>
            <p className={cn('text-xs font-bold', txMuted)}>{periodLabel}</p>
          </div>
          <PeriodBadge label={periodBadgeLabel} isDark={isDark} />
        </div>
      </motion.div>

      {/* ── MODAL: Visualizar Clientes ──────────────────────────────────────── */}
      <AnimatePresence>
        {showClientsModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClientsModal(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className={cn(
                'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                'w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden',
                isDark
                  ? 'bg-[#0d1421] border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.7)]'
                  : 'bg-white border border-slate-200 shadow-[0_32px_64px_rgba(0,0,0,0.15)]',
              )}
            >
              {/* Header do modal */}
              <div className={cn(
                'px-6 py-5 border-b flex items-center justify-between',
                isDark ? 'border-white/8' : 'border-slate-100',
              )}>
                <div>
                  <p className={cn('text-[9px] font-black uppercase tracking-[0.3em] mb-1', isDark ? 'text-violet-500' : 'text-violet-600')}>
                    {seg?.name}
                  </p>
                  <h3 className={cn('text-lg font-black', isDark ? 'text-slate-100' : 'text-slate-900')}>
                    Clientes do Segmento
                  </h3>
                  <p className={cn('text-xs mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>
                    {clientCount} cliente{clientCount !== 1 ? 's' : ''} associado{clientCount !== 1 ? 's' : ''} a este segmento
                  </p>
                </div>
                <button
                  onClick={() => setShowClientsModal(false)}
                  className={cn(
                    'p-2 rounded-xl transition-colors',
                    isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-white/8' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
                  )}
                  aria-label="Fechar"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Lista de clientes */}
              <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
                <div className="p-4 space-y-2">
                  {clients.map((c, i) => {
                    const initials = c.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
                    const avatarColors = [
                      ['#818cf8', '#1e1b4b'], ['#34d399', '#022c22'], ['#fbbf24', '#451a03'],
                      ['#f87171', '#450a0a'], ['#60a5fa', '#172554'], ['#e879f9', '#2e1065'],
                    ];
                    const [fg, bg] = avatarColors[i % avatarColors.length];

                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={cn(
                          'flex items-center gap-4 p-3.5 rounded-2xl transition-colors',
                          isDark ? 'hover:bg-white/[0.04] bg-white/[0.02]' : 'hover:bg-slate-50 bg-slate-50/50',
                        )}
                      >
                        {/* Logo ou Avatar */}
                        {c.logoUrl ? (
                          <img
                            src={c.logoUrl}
                            alt={c.name}
                            className="w-12 h-12 rounded-xl object-cover shrink-0"
                            style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}` }}
                          />
                        ) : (
                          <span style={{
                            width: 48, height: 48, borderRadius: 12,
                            backgroundColor: bg, color: fg,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16, fontWeight: 900, flexShrink: 0,
                          }}>
                            {initials}
                          </span>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-black truncate', isDark ? 'text-slate-100' : 'text-slate-900')}>
                            {c.name}
                          </p>
                          <p className={cn('text-[11px] mt-0.5', isDark ? 'text-slate-500' : 'text-slate-400')}>
                            {c.campaignCount} campanha{c.campaignCount !== 1 ? 's' : ''}
                            {c.activeCampaignCount > 0 && ` · ${c.activeCampaignCount} ativa${c.activeCampaignCount !== 1 ? 's' : ''}`}
                          </p>
                        </div>

                        {/* Status badge */}
                        <span className={cn(
                          'text-[10px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-wide shrink-0',
                          c.metrics.status === 'ok'
                            ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-100')
                            : c.metrics.status === 'warn'
                            ? (isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-100')
                            : c.metrics.status === 'critical'
                            ? (isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-700 border-red-100')
                            : (isDark ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' : 'bg-slate-50 text-slate-400 border-slate-200'),
                        )}>
                          {c.metrics.status === 'ok' ? 'Saudável' : c.metrics.status === 'warn' ? 'Atenção' : c.metrics.status === 'critical' ? 'Crítico' : 'Sem dados'}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Footer com botão Fechar */}
              <div className={cn(
                'px-6 py-4 border-t flex justify-end',
                isDark ? 'border-white/8 bg-white/[0.015]' : 'border-slate-100 bg-slate-50/50',
              )}>
                <button
                  onClick={() => setShowClientsModal(false)}
                  className={cn(
                    'px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all',
                    isDark
                      ? 'bg-violet-600 text-white hover:bg-violet-700 active:scale-95 shadow-lg shadow-violet-500/20'
                      : 'bg-violet-600 text-white hover:bg-violet-700 active:scale-95',
                  )}
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── BENCHMARK CARDS ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className={cn('text-[9px] font-black uppercase tracking-[0.3em]', isDark ? 'text-violet-600' : 'text-violet-500')}>
            Benchmark do Segmento · Medianas Reais do Período
          </p>
          <div className={cn('flex-1 h-px', isDark ? 'bg-white/5' : 'bg-slate-200')} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'CPL Mediano',  value: bench?.cplMedian != null  ? `R$ ${bench.cplMedian.toFixed(2)}`  : '—', color: isDark ? 'text-indigo-400' : 'text-indigo-600', hint: `Meta: R$ ${seg?.cplIdeal?.toFixed(2) ?? '—'}` },
            { label: 'CTR Mediano',  value: bench?.ctrMedian != null  ? `${bench.ctrMedian.toFixed(2)}%`    : '—', color: isDark ? 'text-emerald-400' : 'text-emerald-600', hint: `Mín: ${seg?.ctrMin?.toFixed(2) ?? '—'}%` },
            { label: 'CPM Mediano',  value: bench?.cpmMedian != null  ? `R$ ${bench.cpmMedian.toFixed(2)}`  : '—', color: isDark ? 'text-amber-400' : 'text-amber-600', hint: null },
            { label: `Total ${seg?.vocabulary?.lead_term ?? 'Leads'}`, value: String(bench?.leadsTotal ?? 0), color: isDark ? 'text-teal-400' : 'text-teal-600', hint: `R$ ${bench?.spendTotal.toFixed(0) ?? '0'} investido` },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className={cn(
                'rounded-2xl p-4 flex flex-col gap-1.5 border relative overflow-hidden',
                isDark
                  ? 'bg-[rgba(255,255,255,0.025)] border-white/6'
                  : 'bg-white border-slate-100 shadow-sm',
              )}
            >
              <span className={cn('text-[9px] font-black uppercase tracking-widest', txFaint)}>{kpi.label}</span>
              <span className={cn('text-xl font-black font-mono', kpi.color)}>{kpi.value}</span>
              {kpi.hint && <span className={cn('text-[10px]', txFaint)}>{kpi.hint}</span>}
              {/* Indicador visual de "benchmark" */}
              <span className={cn(
                'absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest',
                isDark ? 'bg-violet-500/10 text-violet-600' : 'bg-violet-50 text-violet-400',
              )}>
                benchmark
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── RETROVISOR — Charts multi-série ────────────────────────────────── */}
      <div className={cn('rounded-3xl p-6 border',
        isDark
          ? 'border-amber-500/13 bg-[rgba(13,11,8,0.55)] backdrop-blur-sm shadow-[0_0_60px_rgba(251,191,36,0.03)]'
          : 'border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-white shadow-[0_4px_24px_rgba(245,158,11,0.05)]',
      )}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <img src="/retrovisor.png" alt="Retrovisor" width={52} height={52} className="object-contain shrink-0 opacity-90" />
            <div>
              <p className={cn('text-[9px] font-black uppercase tracking-[0.35em] mb-0.5', isDark ? 'text-amber-700' : 'text-amber-500')}>Retrovisor</p>
              <h3 className={cn('text-base font-black', tx)}>Performance por Cliente</h3>
              <p className={cn('text-[11px]', txFaint)}>Comparativo — uma linha por cliente</p>
            </div>
          </div>
          <PeriodBadge label={periodBadgeLabel} isDark={isDark} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Performance Multi-Métrica */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className={cn('rounded-2xl p-5', cardBase)}>
            <p className={cn('text-xs font-black mb-4 uppercase tracking-widest', txFaint)}>Gasto Diário · R$</p>
            <MultiClientMetricChart
              clients={clients} tenantOwn={tenantOwn}
              benchmarkMedian={bench?.cplMedian ?? null}
              metric="spend" isDark={isDark}
            />
          </motion.div>

          {/* CPL Timeline multi-série */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={cn('rounded-2xl p-5', cardBase)}>
            <p className={cn('text-xs font-black mb-4 uppercase tracking-widest', txFaint)}>CPL · Comparativo por Cliente</p>
            <MultiClientCplChart
              clients={clients} tenantOwn={tenantOwn}
              cplMedian={bench?.cplMedian ?? null}
              isDark={isDark}
            />
          </motion.div>

          {/* CTR comparativo */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={cn('rounded-2xl p-5', cardBase)}>
            <p className={cn('text-xs font-black mb-4 uppercase tracking-widest', txFaint)}>CTR % · Comparativo</p>
            <MultiClientMetricChart
              clients={clients} tenantOwn={tenantOwn}
              benchmarkMedian={bench?.ctrMedian ?? null}
              metric="ctr" isDark={isDark}
            />
          </motion.div>

          {/* Leads comparativo */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={cn('rounded-2xl p-5', cardBase)}>
            <p className={cn('text-xs font-black mb-4 uppercase tracking-widest', txFaint)}>{seg?.vocabulary?.lead_term ?? 'Leads'} · Volume por Cliente</p>
            <MultiClientMetricChart
              clients={clients} tenantOwn={tenantOwn}
              benchmarkMedian={null}
              metric="leads" isDark={isDark}
            />
          </motion.div>
        </div>
      </div>

      {/* ── FUNIL POR ESTÁGIO — agregado do segmento (TOF/MOF/BOF) ──────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className={cn('text-[9px] font-black uppercase tracking-[0.3em]', isDark ? 'text-indigo-600' : 'text-indigo-500')}>
            Funil por Estágio · {seg?.name} agregado
          </p>
          <div className={cn('flex-1 h-px', isDark ? 'bg-white/5' : 'bg-slate-200')} />
          <PeriodBadge label={periodBadgeLabel} isDark={isDark} />
        </div>
        <div className={cn('rounded-2xl p-6', cardBase)}>
          {segFunnel ? (
            <StageFunnelWidget data={segFunnel} isDark={isDark} />
          ) : (
            <div className={cn('h-40 rounded-xl animate-pulse', isDark ? 'bg-white/[0.03]' : 'bg-slate-100')} />
          )}
        </div>
      </div>

      {/* ── RANKING DE POSICIONAMENTO ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <p className={cn('text-[9px] font-black uppercase tracking-[0.3em]', isDark ? 'text-indigo-600' : 'text-indigo-500')}>Ranking · Posicionamento vs Benchmark</p>
          </div>
          <div className={cn('flex-1 h-px', isDark ? 'bg-white/5' : 'bg-slate-200')} />
          <PeriodBadge label={periodBadgeLabel} isDark={isDark} />
        </div>
        <ClientRankingTable data={segmentData} isDark={isDark} />
      </div>

      {/* ── FAROL DE MILHA — preservado no modo segmento, mais rico ──────────── */}
      <FarolSection isDark={isDark} periodLabel={periodBadgeLabel}>
        {anticipation.length > 0 ? (
          <div className="space-y-6">
            {/* Contagem regressiva — agrupada por cliente */}
            {(() => {
              const allEvents = anticipation.flatMap(r =>
                r.events.map(e => ({ ...e, campaignId: r.campaignId }))
              );
              if (allEvents.length === 0) return null;

              // Mapear campaignId → nome do cliente (melhor que apenas ID)
              const campaignClientMap = new Map<string, string>();
              [...clients, ...(tenantOwn ? [tenantOwn] : [])].forEach(c => {
                // Não temos campaign names aqui — usar nome do cliente como contexto
                anticipation.forEach(a => { campaignClientMap.set(a.campaignId, c.name); });
              });

              return (
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-cyan-700' : 'text-sky-500'}`}>
                    Contagem Regressiva de Eventos · Todos os Clientes
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allEvents.map((e, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                        <TimeToEventBar
                          event={e as TimeToEvent}
                          campaignName={campaignClientMap.get(e.campaignId) ?? e.campaignId.slice(0, 8)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Trajetórias de sinais */}
            {(() => {
              const allTraj = anticipation.flatMap(r => r.trajectories);
              if (allTraj.length === 0) return null;
              return (
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-cyan-700' : 'text-sky-500'}`}>
                    Trajetória dos Sinais Leading · Segmento {seg?.name}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {allTraj.map((traj, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <SignalTrajectory trajectory={traj as Trajectory} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <p className={cn('text-sm', isDark ? 'text-slate-600' : 'text-slate-400')}>
            Nenhum sinal de antecipação detectado nas campanhas ativas do segmento.
          </p>
        )}

        {/* Radar de Demanda + Geolocalização — restrito ao segmento selecionado */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <DemandRadar
            isDark={isDark}
            clientId={undefined}
            segmentId={segmentData?.segment?.id}
            periodDays={periodDays}
          />
          <CampaignMapWidget
            isDark={isDark}
            clientId={segmentData?.segment?.id ? undefined : null}
            segmentId={segmentData?.segment?.id}
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </FarolSection>

      {/* ── TRACKING HEALTH — por cliente ──────────────────────────────────── */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl', isDark ? 'bg-rose-500/10' : 'bg-rose-50')}>
              <span className="text-base leading-none">🩺</span>
            </div>
            <div>
              <h3 className={cn('text-base font-black', tx)}>Saúde do Rastreamento</h3>
              <p className={cn('text-xs', txMuted)}>Score de rastreamento por cliente</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tenantOwn && (
            <div>
              <p className={cn('text-[10px] font-black uppercase tracking-widest mb-2', txFaint)}>Minha Empresa</p>
              <TrackingHealthWidget clientId={null} compact />
            </div>
          )}
          {clients.map(c => (
            <div key={c.id}>
              <p className={cn('text-[10px] font-black uppercase tracking-widest mb-2 truncate', txFaint)} title={c.name}>{c.name}</p>
              <TrackingHealthWidget clientId={c.id} compact />
            </div>
          ))}
        </div>
      </div>

      {/* ── AI INSIGHTS — regras automáticas agrupadas por cliente ───────────── */}
      {segInsights && segInsights.insights.length > 0 && (() => {
        // Agrupar insights por clientId/campaignId → mapear para nome do cliente
        const clientMap = new Map<string, string>();
        [...clients, ...(tenantOwn ? [tenantOwn] : [])].forEach(c => {
          clientMap.set(c.id, c.name);
        });

        // Agrupar insights por nome de cliente (aproximação via campaignId → clientMap)
        // Como não temos clientId por insight, usamos bySegment com fallback à lista flat
        const groups = segInsights.bySegment?.length > 0
          ? segInsights.bySegment.filter((g: any) => g.insights.length > 0)
          : [{ segmentId: null, segmentName: '', insights: segInsights.insights }];

        type IS = { border: string; badge: string; dot: string };
        const styles: Record<string, IS> = {
          PAUSE:    { border: 'border-l-red-500',    badge: isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20'       : 'bg-red-50 text-red-700 border border-red-100',       dot: 'bg-red-500'    },
          SCALE:    { border: 'border-l-emerald-500',badge: isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100', dot: 'bg-emerald-500' },
          OPTIMIZE: { border: 'border-l-amber-500',  badge: isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'   : 'bg-amber-50 text-amber-700 border border-amber-100',   dot: 'bg-amber-500'  },
          ALERT:    { border: 'border-l-orange-500', badge: isDark ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-orange-50 text-orange-700 border border-orange-100', dot: 'bg-orange-500' },
        };

        return (
          <div>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className={cn('text-lg font-black', tx)}>Insights da IA</h2>
                <p className={cn('text-xs mt-0.5', txMuted)}>
                  Alertas automáticos por campanha — {segInsights.insights.length} insight{segInsights.insights.length !== 1 ? 's' : ''} detectado{segInsights.insights.length !== 1 ? 's' : ''}
                </p>
              </div>
              <PeriodBadge label={periodBadgeLabel} isDark={isDark} />
            </div>
            <div className="space-y-6">
              {groups.map((g: any, gi: number) => (
                <div key={g.segmentId ?? gi}>
                  {g.segmentName && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      <h3 className={cn('text-sm font-black', tx)}>{g.segmentName}</h3>
                      <span className={cn('text-[10px]', txFaint)}>· {g.insights.length} insight{g.insights.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {g.insights.map((insight: AiInsightData, i: number) => {
                      const s = styles[insight.type] ?? styles.ALERT;
                      return (
                        <motion.div key={i}
                          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className={cn(`rounded-2xl p-4 border-l-4 ${cardBase} ${s.border}`)}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide', s.badge)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
                              {insight.type}
                            </span>
                            <span className={cn('text-[10px] font-bold', txFaint)}>
                              Confiança: {(insight.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <h4 className={cn('text-sm font-black mb-1', tx)}>{insight.title}</h4>
                          <p className={cn('text-xs', txMuted)}>{insight.description}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── NARRATIVA DE INTELIGÊNCIA LLM ──────────────────────────────────── */}
      <SegmentNarrative segmentData={segmentData} isDark={isDark} />

    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  SECTION WRAPPERS — Retrovisão & Farol de Milha
// ═════════════════════════════════════════════════════════════════════════════

/* ── Badge de período exibido no canto superior direito de cada seção ── */

function RetrovisorSection({ isDark, children, periodLabel }: { isDark: boolean; children: React.ReactNode; periodLabel?: string }) {
  return (
    <div className={cn(
      'rounded-3xl p-6 mb-8 border',
      isDark
        ? 'border-[rgba(251,191,36,0.13)] shadow-[0_0_60px_rgba(251,191,36,0.03),inset_0_1px_0_rgba(251,191,36,0.06)] bg-[rgba(13,11,8,0.55)] backdrop-blur-sm'
        : 'border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-white shadow-[0_4px_24px_rgba(245,158,11,0.05)]',
    )}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className={cn("p-2 rounded-xl", isDark ? "bg-amber-500/10 text-amber-500" : "bg-amber-100 text-amber-600")}>
            <ClockIcon className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-[9px] font-black uppercase tracking-[0.35em] mb-0.5 ${isDark ? 'text-amber-700' : 'text-amber-500'}`}>
              Retrovisor
            </p>
            <h2 className={`text-base font-black leading-tight ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
              Performance Histórica
            </h2>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              Dados reais do período selecionado
            </p>
          </div>
        </div>
        {periodLabel && <PeriodBadge label={periodLabel} isDark={isDark} />}
      </div>
      {children}
    </div>
  );
}




// ═════════════════════════════════════════════════════════════════════════════
//  DATE INPUT PT-BR  (máscara dd/mm/aaaa → ISO internamente)
// ═════════════════════════════════════════════════════════════════════════════

// Formata qualquer valor de data (ISO string ou Date) para "dd/mm" usando UTC,
// evitando o deslocamento de timezone (UTC-3 deslocaria meia-noite UTC para o dia anterior).
function utcDateLabel(dateVal: string | Date): string {
  const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  const day   = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

function ptBrToIso(v: string): string {
  const [d, m, y] = v.split('/');
  if (!d || !m || !y || y.length < 4) return '';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
function isoToPtBr(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

const DateInputPtBR = React.forwardRef<HTMLInputElement, {
  value: string;
  onChange: (iso: string) => void;
  onComplete?: () => void;
  style?: React.CSSProperties;
  className?: string;
}>(function DateInputPtBR({ value, onChange, onComplete, style, className }, ref) {
  const [display, setDisplay] = React.useState(isoToPtBr(value));
  const hiddenRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDisplay(isoToPtBr(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (raw.length > 4) raw = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
    else if (raw.length > 2) raw = raw.slice(0, 2) + '/' + raw.slice(2);
    setDisplay(raw);
    if (raw.length === 10) {
      const iso = ptBrToIso(raw);
      if (iso) {
        onChange(iso);
        onComplete?.();
      }
    } else if (raw === '') {
      onChange('');
    }
  }

  function handleCalendarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const iso = e.target.value; // YYYY-MM-DD
    if (iso) {
      onChange(iso);
      setDisplay(isoToPtBr(iso));
    }
  }

  return (
    <div className="relative flex items-center">
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        maxLength={10}
        placeholder="dd/mm/aaaa"
        value={display}
        onChange={handleChange}
        style={style}
        className={cn(className, 'pr-9')}
      />
      {/* Hidden native date picker — opened by clicking the calendar icon */}
      <input
        ref={hiddenRef}
        type="date"
        tabIndex={-1}
        value={value}
        onChange={handleCalendarPick}
        className="absolute inset-0 opacity-0 w-full cursor-pointer pointer-events-none"
        style={{ colorScheme: 'dark' }}
      />
      <button
        type="button"
        onClick={() => hiddenRef.current?.showPicker?.()}
        className="absolute right-2.5 text-slate-400 hover:text-indigo-400 transition-colors"
        tabIndex={-1}
        title="Selecionar data"
      >
        <CalendarDaysIcon className="h-4 w-4" />
      </button>
    </div>
  );
});



export default DashboardPage;
