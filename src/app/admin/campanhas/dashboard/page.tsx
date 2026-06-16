"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  getDashboardFull, getDashboardPredictions, getLatestBriefing, generateBriefing, getBriefings, syncInsights,
  getFunnelData, getAnticipation, getHookRateBenchmarks,
  type DashboardFullData, type PredictionData, type StrategicBriefingData, type AiInsightData,
  type FunnelData7, type AnticipationResult, type TimeToEvent, type Trajectory,
  type HookRateBenchmarks,
  getAiInsights,
} from '@/lib/marketing-api';
import type { HookSaturationResult } from '@/lib/marketing/services/hookSaturationService';
import type { SegmentDashboardResponse } from '@/app/api/admin/campanhas/dashboard/segment/route';
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercent, cn, OBJECTIVES } from '@/lib/marketing-utils';
import { MultiMetricChart } from '@/components/marketing/charts/MultiMetricChart';
import { FunnelChart } from '@/components/marketing/charts/FunnelChart';
import { ClassicFunnelChart } from '@/components/marketing/charts/ClassicFunnelChart';
import { CplTimelineChart }  from '@/components/marketing/charts/CplTimelineChart';
import { StageFunnelWidget } from '@/components/marketing/StageFunnelWidget';
import { PredictionChart } from '@/components/marketing/charts/PredictionChart';
import { ArrowPathIcon, SparklesIcon, ClockIcon, SunIcon, MoonIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { DashboardHelpButton } from '@/components/marketing/DashboardHelpModal';
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
import { TimeToEventBar }      from '@/components/marketing/charts/TimeToEventBar';
import { SignalTrajectory }    from '@/components/marketing/charts/SignalTrajectory';
import { DemandRadar }         from '@/components/marketing/charts/DemandRadar';
import { CampaignMapWidget }   from '@/components/marketing/CampaignMapWidget';

// ─── Palettes ─────────────────────────────────────────────────────────────────
const PALETTE_DARK  = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#e879f9'];
const PALETTE_LIGHT = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export function DashboardPage() {
  const [data, setData]                     = useState<DashboardFullData | null>(null);
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

  const [dateRange, setDateRange]           = useState('1'); // 'Hoje' como padrão
  const [startDate, setStartDate]           = useState('');
  const [endDate, setEndDate]               = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [objectiveFilter, setObjectiveFilter]   = useState('');
  const [statusFilter, setStatusFilter]         = useState('');
  const [adSetFilter, setAdSetFilter]           = useState('');

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
    [dateRange, startDate, endDate, selectedCampaign, objectiveFilter, statusFilter, adSetFilter, clientFilter, activeSegment]);

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
      };

      const [dashData, predData, funData, hrbData] = await Promise.all([
        getDashboardFull(params).catch((e) => { console.error('[Dashboard] getDashboardFull:', e); return null; }),
        getDashboardPredictions(sharedFilters).catch(() => null),
        getFunnelData(sharedFilters).catch(() => null),
        getHookRateBenchmarks(
          clientFilter && clientFilter !== 'segment' ? clientFilter : null,
          activeSegment ?? null,
        ).catch(() => null),
      ]);
      if (dashData) setData(dashData);
      if (predData) setPredictions(predData);
      if (funData)  setFunnelData7(funData);
      if (hrbData)  setHookRateBenchmarks(hrbData);

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
  const cpl       = t && data?.currentPeriod.leadCount && data.currentPeriod.leadCount > 0
    ? t.spend / data.currentPeriod.leadCount : 0;

  const chartData = data?.currentPeriod.insights
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(i => ({
      date: utcDateLabel(i.date),
      spend: i.spend, clicks: i.clicks, impressions: i.impressions,
      ctr: i.ctr, cpc: i.cpc, cpm: i.cpm, conversions: i.conversions,
    })) || [];

  const dailyLeadsMap = new Map((data?.dailyLeads || []).map(dl => [
    utcDateLabel(dl.date), dl.count,
  ]));
  const cplData = chartData.map(cd => ({
    date: cd.date, spend: cd.spend,
    leads: dailyLeadsMap.get(cd.date) || 0,
    cpl: (dailyLeadsMap.get(cd.date) || 0) > 0 ? cd.spend / (dailyLeadsMap.get(cd.date) || 1) : 0,
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
  const bg       = isDark ? 'bg-[#080c14]' : 'bg-slate-50';
  const cardBase = isDark
    ? 'bg-[rgba(13,20,33,0.92)] backdrop-blur-sm border border-[rgba(255,255,255,0.07)] shadow-[0_2px_16px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.03)]'
    : 'bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]';
  const tx       = isDark ? 'text-slate-300' : 'text-slate-900';
  const txMuted  = isDark ? 'text-slate-400' : 'text-slate-500';
  const txFaint  = isDark ? 'text-slate-500' : 'text-slate-400';
  const divider  = isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-100';

  const selectBase = isDark
    ? 'border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all'
    : 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all';
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
                <button onClick={handleSync} disabled={syncing}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25">
                  <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Sincronizando...' : 'Sync Meta'}
                </button>
              </ExecuteGuard>
              <DashboardHelpButton isDark={isDark} />
            </div>
          </div>
        </div>

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
                style={selectStyle} className={selectBase} />
            </div>
            <div>
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Até</label>
              <DateInputPtBR
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
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-black transition-all', dateRange === value
                      ? 'bg-indigo-600 text-white shadow-sm'
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
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 ${hookRate !== null ? 'xl:[grid-template-columns:repeat(13,minmax(0,1fr))] xl:gap-1.5' : 'xl:grid-cols-12 xl:gap-2'}`}>
          <KpiCard isDark={isDark} label="Campanhas Ativas" value={String(campaigns.filter(c => c.status === 'ACTIVE').length)} color={isDark ? 'text-emerald-400' : 'text-emerald-600'} tooltip={`${campaigns.length} campanha${campaigns.length !== 1 ? 's' : ''} no total`} />
          <KpiCard isDark={isDark} label="Gasto"      value={formatCurrencyCompact(t?.spend || 0)}             fullValue={formatCurrency(t?.spend || 0)}                    delta={d?.spend}       color={isDark ? 'text-red-400'     : 'text-red-600'}     invertDelta />
          <KpiCard isDark={isDark} label="Impressões" value={formatNumber(t?.impressions || 0)}                 delta={d?.impressions} color={isDark ? 'text-blue-400'    : 'text-blue-600'} />
          <KpiCard isDark={isDark} label="Alcance"    value={formatNumber(t?.reach || 0)}                       delta={d?.reach}       color={isDark ? 'text-cyan-400'    : 'text-cyan-600'} />
          <KpiCard isDark={isDark} label="Cliques"    value={formatNumber(t?.clicks || 0)}                      delta={d?.clicks}      color={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
          <KpiCard isDark={isDark} label="CTR"        value={formatPercent(t?.ctr || 0)}                        delta={d?.ctr}         color={isDark ? 'text-amber-400'   : 'text-amber-600'} />
          <KpiCard isDark={isDark} label="CPC"        value={formatCurrencyCompact(t?.cpc || 0)}                fullValue={formatCurrency(t?.cpc || 0)}                      delta={d?.cpc}         color={isDark ? 'text-orange-400'  : 'text-orange-600'} invertDelta />
          <KpiCard isDark={isDark} label="CPM"        value={formatCurrencyCompact(t?.cpm || 0)}                fullValue={formatCurrency(t?.cpm || 0)}                      delta={d?.cpm}         color={isDark ? 'text-violet-400'  : 'text-violet-600'} invertDelta />
          <KpiCard isDark={isDark} label="Conversões" value={formatNumber(t?.conversions || 0)}                 delta={d?.conversions} color={isDark ? 'text-pink-400'    : 'text-pink-600'} />
          <KpiCard isDark={isDark} label="Leads"      value={formatNumber(data?.currentPeriod.leadCount || 0)}  delta={d?.leads}       color={isDark ? 'text-indigo-400'  : 'text-indigo-600'} />
          <KpiCard isDark={isDark} label="CPL"        value={formatCurrencyCompact(cpl)}                        fullValue={formatCurrency(cpl)}                              color={isDark ? 'text-teal-400'    : 'text-teal-600'} />
          <KpiCard isDark={isDark} label="Budget/dia" value={formatCurrencyCompact(campaignSpendData.reduce((s, c) => s + c.value, 0))} fullValue={formatCurrency(campaignSpendData.reduce((s, c) => s + c.value, 0))} color={isDark ? 'text-slate-300' : 'text-slate-800'} />
          {hookRate !== null && (
            <HookRateKpiCard isDark={isDark} value={hookRate} color={hookRateColor} benchmarks={hookRateBenchmarks} />
          )}
        </div>

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
            {/* ══════════════════════════════════════════════════════════════
                RETROVISÃO — Performance Histórica
            ══════════════════════════════════════════════════════════════ */}
            <RetrovisorSection isDark={isDark} periodLabel={periodBadgeLabel}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Volume: spend (R$) vs cliques — mesma ordem de grandeza */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl p-6 ${cardBase}`}>
                  <MultiMetricChart isDark={isDark} data={chartData} title="Volume — Gasto × Cliques"
                    yLeftLabel="Gasto (R$)" yRightLabel="Cliques"
                    metrics={[
                      { key: 'spend',  label: 'Gasto (R$)', color: predColors[0], type: 'area' },
                      { key: 'clicks', label: 'Cliques',    color: predColors[1], type: 'line', yAxisId: 'right' },
                    ]} />
                </motion.div>
                {/* Eficiência: CTR % vs CPC — ambos são valores pequenos, escalas compatíveis */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className={`rounded-2xl p-6 ${cardBase}`}>
                  <MultiMetricChart isDark={isDark} data={chartData} title="Eficiência — CTR % × CPC (R$)"
                    yLeftLabel="CTR %" yRightLabel="CPC (R$)"
                    metrics={[
                      { key: 'ctr', label: 'CTR %',    color: predColors[2], type: 'area' },
                      { key: 'cpc', label: 'CPC (R$)', color: predColors[3], type: 'line', yAxisId: 'right' },
                    ]} />
                </motion.div>

                {/* CPL Timeline + Distribuição por Campanha — lado a lado */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className={`rounded-2xl p-6 ${cardBase}`}>
                  <h3 className={`text-sm font-black mb-2 ${tx}`}>CPL Timeline</h3>
                  <CplTimelineChart data={cplData} isDark={isDark} />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className={`rounded-2xl p-6 ${cardBase}`}>
                  <h3 className={`text-sm font-black mb-4 ${tx}`}>Distribuição por Campanha</h3>
                  {campaignSpendData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={campaignSpendData} dataKey="value" nameKey="name"
                            cx="50%" cy="50%" outerRadius={90} innerRadius={38}
                            paddingAngle={3}
                            labelLine={false}
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }: any) => {
                              if (percent < 0.05) return null;
                              const RADIAN = Math.PI / 180;
                              const r = innerRadius + (outerRadius - innerRadius) * 0.55;
                              const x = cx + r * Math.cos(-midAngle * RADIAN);
                              const y = cy + r * Math.sin(-midAngle * RADIAN);
                              const formatted = value >= 1000
                                ? `R$${(value / 1000).toFixed(1)}k`
                                : `R$${value.toFixed(0)}`;
                              return (
                                <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central"
                                  style={{ fontSize: 11, fontWeight: 700, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                                  {formatted}
                                </text>
                              );
                            }}>
                            {campaignSpendData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip {...tooltipCss} formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-1.5 mt-3 px-1">
                        {(() => {
                          const total = campaignSpendData.reduce((s, c) => s + c.value, 0);
                          return (
                            <>
                              {campaignSpendData.map((d, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                  <span className={`text-[10px] flex-1 leading-tight ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{d.name}</span>
                                  <span className={`text-[10px] font-semibold shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%
                                  </span>
                                  <span className={`text-[10px] font-bold shrink-0 min-w-[64px] text-right ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                    R$ {d.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))}
                              {campaignSpendData.length > 1 && (
                                <div className={`flex items-center gap-2 mt-1 pt-2 border-t ${isDark ? 'border-white/8' : 'border-slate-100'}`}>
                                  <span className="w-2.5 h-2.5 shrink-0" />
                                  <span className={`text-[10px] flex-1 font-black uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total</span>
                                  <span className={`text-[10px] font-black shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>100%</span>
                                  <span className={`text-[10px] font-black shrink-0 min-w-[64px] text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </>
                  ) : (
                    <p className={`text-sm text-center py-12 ${txMuted}`}>Sem dados de campanhas</p>
                  )}
                </motion.div>
              </div>

              {/* ── Funil Clássico + Funil por Estágio — lado a lado ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5 items-start">
                {data.funnelData && (
                  <ClassicFunnelChart
                    funnelData={data.funnelData}
                    leadCount={data.currentPeriod.leadCount}
                    isDark={isDark}
                    periodLabel={periodBadgeLabel}
                    className="mt-0"
                  />
                )}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                  className={`rounded-2xl p-6 ${cardBase}`}>
                  <h3 className={`text-sm font-black mb-4 ${tx}`}>Funil por Estágio</h3>
                  {funnelData7 ? (
                    <StageFunnelWidget
                      data={funnelData7}
                      isDark={isDark}
                      clientId={(clientFilter && clientFilter !== 'own') ? clientFilter as any : undefined}
                    />
                  ) : (
                    <FunnelChart data={data.funnelData} isDark={isDark} />
                  )}
                </motion.div>
              </div>
            </RetrovisorSection>

            {/* ══════════════════════════════════════════════════════════════
                FAROL DE MILHA — Sinais Leading & Antecipação (FASE 8.5)
            ══════════════════════════════════════════════════════════════ */}
            <FarolSection isDark={isDark} periodLabel={periodBadgeLabel}>
              {anticipationData.length > 0 ? (
                <div className="space-y-6">
                  {/* ── TimeToEvent bars ──────────────────────────────────── */}
                  {(() => {
                    const allEvents = anticipationData.flatMap(r =>
                      r.events.map(e => ({ ...e, campaignId: r.campaignId }))
                    );
                    if (allEvents.length === 0) return null;
                    return (
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-cyan-700' : 'text-sky-500'}`}>
                          Contagem Regressiva de Eventos
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {allEvents.map((e, i) => {
                            const campName = campaigns.find(c => c.id === e.campaignId)?.name;
                            return (
                              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                                <TimeToEventBar event={e as TimeToEvent} campaignName={campName} />
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ── Signal trajectories ───────────────────────────────── */}
                  {(() => {
                    const allTraj = anticipationData.flatMap(r => r.trajectories);
                    if (allTraj.length === 0) return null;
                    return (
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-cyan-700' : 'text-sky-500'}`}>
                          Trajetória dos Sinais Leading
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
              ) : null}

              {/* ── Projeções legadas (regressão linear) ─────────────────── */}
              {predictions && !predictions.insufficientData && (
                <details className="mt-6 group">
                  <summary className={cn(
                    'flex items-center gap-2 cursor-pointer select-none text-[10px] font-black uppercase tracking-widest',
                    isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'
                  )}>
                    <span className="transition-transform group-open:rotate-90">▶</span>
                    Projeções por regressão linear (legado)
                  </summary>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
                    {([
                      { label: 'Gasto Diário (R$)', color: predColors[0], hist: predictions.historical.spend, pred: predictions.spend,  fmt: (v: number) => `R$${v.toFixed(0)}` },
                      { label: 'Leads Diários',     color: predColors[1], hist: predictions.historical.leads, pred: predictions.leads,  fmt: (v: number) => v.toFixed(0) },
                      { label: 'CTR (%)',           color: predColors[2], hist: predictions.historical.ctr,   pred: predictions.ctr,    fmt: (v: number) => `${v.toFixed(2)}%` },
                      { label: 'CPC (R$)',          color: predColors[3], hist: predictions.historical.cpc,   pred: predictions.cpc,    fmt: (v: number) => `R$${v.toFixed(2)}` },
                    ] as const).map((p, i) => (
                      <motion.div key={p.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className={`rounded-2xl p-6 ${cardBase}`}>
                        <PredictionChart isDark={isDark} label={p.label} color={p.color}
                          historical={predictions.historical.dates.map((dt, j) => ({ date: dt, value: (p.hist as number[])[j] }))}
                          predictions={p.pred as any} formatter={p.fmt as any}
                          sigmaMult={predictions.sigmaMult} />
                      </motion.div>
                    ))}
                  </div>
                </details>
              )}

              {/* ── Radar de Demanda + Geolocalização ─────────────────── */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                <DemandRadar
                  isDark={isDark}
                  clientId={(clientFilter && clientFilter !== 'own') ? clientFilter as string : undefined}
                  segmentId={activeSegment ?? undefined}
                  periodDays={parseInt(dateRange) || 30}
                />
                <CampaignMapWidget
                  isDark={isDark}
                  clientId={clientFilter ?? null}
                  segmentId={activeSegment ?? null}
                  startDate={segmentPeriodStart}
                  endDate={segmentPeriodEnd}
                />
              </div>
            </FarolSection>

            {/* ══════════════════════════════════════════════════════════════
                TRACKING HEALTH — Saúde do Tracking (FASE 8)
            ══════════════════════════════════════════════════════════════ */}
            <div className="mb-8">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${isDark ? 'bg-rose-500/10' : 'bg-rose-50'}`}>
                    <span className="text-base leading-none">🩺</span>
                  </div>
                  <div>
                    <h2 className={`text-lg font-black ${tx}`}>Tracking Health</h2>
                    <p className={`text-xs ${txMuted}`}>Score 0-100 — monitoramento automático do tracking e pixel</p>
                  </div>
                </div>
                <PeriodBadge label={periodBadgeLabel} isDark={isDark} />
              </div>
              {/* Tracking isolado pelo clientFilter + segmento ativo */}
              <TrackingHealthWidget
                clientId={(clientFilter && clientFilter !== 'own' && clientFilter !== 'segment') ? clientFilter as string : null}
                segmentId={activeSegment ?? null}
              />
            </div>

            {/* ── Briefing Estratégico AI ──────────────────────────────────── */}
            <div className="mb-8">
              <div className="mb-5">
                {/* Linha única: ícone + título + botões */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                      <SparklesIcon className={`h-5 w-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                    </div>
                    <div>
                      <h2 className={`text-lg font-black ${tx}`}>Resumo Estratégico provido pela Inteligência Artificial</h2>
                      <p className={`text-xs ${txMuted}`}>Documento autônomo — período registrado na geração</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowBriefingHistory(!showBriefingHistory)}
                      className={cn(
                        'flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all',
                        isDark
                          ? 'bg-[rgba(255,255,255,0.05)] text-slate-400 hover:bg-[rgba(255,255,255,0.09)] border border-[rgba(255,255,255,0.06)]'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}>
                      <ClockIcon className="h-3.5 w-3.5" />
                      {showBriefingHistory ? 'Ocultar' : 'Histórico'}
                    </button>
                    <ExecuteGuard resource="dashboard-campanhas">
                      <button onClick={handleGenerateBriefing} disabled={generatingBriefing}
                        className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-violet-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/20">
                        {generatingBriefing
                          ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Gerando...</>
                          : <><SparklesIcon className="h-3.5 w-3.5" /> Gerar · {periodBadgeLabel}</>}
                      </button>
                    </ExecuteGuard>
                  </div>
                </div>
              </div>

              {briefings.length > 0
                ? (
                  <div className="space-y-5">
                    {briefings.map(b => (
                      <div key={b.id}>
                        {b.segmentName && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                            <h3 className={`text-sm font-black ${tx}`}>{b.segmentName}</h3>
                          </div>
                        )}
                        <BriefingCard briefing={b} isDark={isDark} />
                      </div>
                    ))}
                  </div>
                )
                : (
                  <div className={`rounded-2xl p-10 text-center ${cardBase}`}>
                    <p className={`text-sm font-black mb-1 ${tx}`}>Nenhum briefing gerado ainda</p>
                    <p className={`text-xs ${txMuted}`}>Clique em "Gerar Novo" ou aguarde o envio automático (08h e 18h).</p>
                  </div>
                )}
              {showBriefingHistory && briefingHistory.length > briefings.length && (
                <div className="mt-4 space-y-3">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${txFaint}`}>Histórico</p>
                  {briefingHistory.filter(b => !briefings.some(cur => cur.id === b.id)).map(b => (
                    <BriefingCard key={b.id} briefing={b} isDark={isDark} compact />
                  ))}
                </div>
              )}
            </div>

            {/* ── Ângulos Cobertura (FASE 14) ──────────────────────────────── */}
            <WinningAngleChip
              isDark={isDark}
              period={parseInt(dateRange) || 30}
              clientId={(clientFilter && clientFilter !== 'own') ? clientFilter : undefined}
            />

            {/* ── AI Insights (por segmento — FASE 18.2) ──────────────────── */}
            {aiInsights.length > 0 && (() => {
              type IS = { border: string; badge: string; dot: string; glow: string };
              const ds: Record<string, IS> = {
                PAUSE:            { border: 'border-l-red-500',    badge: 'bg-red-500/10 text-red-400 border border-red-500/20',        dot: 'bg-red-500',    glow: 'shadow-[0_0_24px_rgba(239,68,68,0.07)]'    },
                SCALE:            { border: 'border-l-emerald-500',badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',dot:'bg-emerald-500',glow:'shadow-[0_0_24px_rgba(16,185,129,0.07)]' },
                OPTIMIZE:         { border: 'border-l-amber-500',  badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',   dot: 'bg-amber-500',  glow: 'shadow-[0_0_24px_rgba(245,158,11,0.07)]'  },
                ALERT:            { border: 'border-l-orange-500', badge: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', dot: 'bg-orange-500', glow: 'shadow-[0_0_24px_rgba(249,115,22,0.07)]'  },
                CREATIVE_FATIGUE: { border: 'border-l-violet-500', badge: 'bg-violet-500/10 text-violet-400 border border-violet-500/20', dot: 'bg-violet-500', glow: 'shadow-[0_0_24px_rgba(139,92,246,0.07)]'  },
              };
              const ls: Record<string, IS> = {
                PAUSE:            { border: 'border-l-red-500',    badge: 'bg-red-50 text-red-600 border border-red-100',             dot: 'bg-red-500',    glow: '' },
                SCALE:            { border: 'border-l-emerald-500',badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100', dot: 'bg-emerald-500',glow: '' },
                OPTIMIZE:         { border: 'border-l-amber-500',  badge: 'bg-amber-50 text-amber-700 border border-amber-100',       dot: 'bg-amber-500',  glow: '' },
                ALERT:            { border: 'border-l-orange-500', badge: 'bg-orange-50 text-orange-700 border border-orange-100',    dot: 'bg-orange-500', glow: '' },
                CREATIVE_FATIGUE: { border: 'border-l-violet-500', badge: 'bg-violet-50 text-violet-700 border border-violet-100',    dot: 'bg-violet-500', glow: '' },
              };
              const styles = isDark ? ds : ls;
              // Se o serviço não trouxe bySegment, cai num grupo único.
              const groups = aiInsightsBySegment.length > 0
                ? aiInsightsBySegment.filter(g => g.insights.length > 0)
                : [{ segmentId: null, segmentName: '', insights: aiInsights }];

              const renderCard = (insight: any, i: number) => {
                const s = styles[insight.type] || styles.ALERT;
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className={cn(`rounded-2xl p-4 border-l-4 ${cardBase} ${s.border} ${s.glow}`)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${s.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{insight.type}
                      </span>
                      <span className={`text-[10px] font-bold ${txFaint}`}>
                        Confiança: {(insight.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <h4 className={`text-sm font-black mb-1 ${tx}`}>{insight.title}</h4>
                    <p className={`text-xs ${txMuted}`}>{insight.description}</p>
                  </motion.div>
                );
              };

              return (
                <div className="mb-8">
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                      <h2 className={`text-lg font-black ${tx}`}>Insights da IA</h2>
                      <p className={`text-xs mt-0.5 ${txMuted}`}>Análise automática por segmento — benchmark próprio de cada segmento</p>
                    </div>
                    <PeriodBadge label={periodBadgeLabel} isDark={isDark} />
                  </div>
                  <div className="space-y-6">
                    {/* Card CREATIVE_FATIGUE — nível de portfólio */}
                    {hookSaturation?.saturationAlert && (() => {
                      const hk = hookSaturation;
                      const s = styles.CREATIVE_FATIGUE;
                      return (
                        <motion.div
                          initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                          className={cn(`rounded-2xl p-4 border-l-4 ${cardBase} ${s.border} ${s.glow}`)}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${s.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />CREATIVE_FATIGUE
                            </span>
                            <a href="/admin/campanhas/criativos/padroes"
                              className={`text-[10px] font-bold text-violet-500 hover:underline`}>
                              Ver análise →
                            </a>
                          </div>
                          <h4 className={`text-sm font-black mb-1 ${tx}`}>Saturação de Hook Criativo</h4>
                          <p className={`text-xs ${txMuted}`}>
                            {hk.dominantShare}% dos criativos ativos usam o hook "{hk.hookStats[0]?.label}" — risco de fadiga de público.
                            {hk.suggestion && ` ${hk.suggestion}.`}
                            {' '}Diversidade criativa: {hk.diversityIndex}/100.
                          </p>
                        </motion.div>
                      );
                    })()}
                    {groups.map((g, gi) => (
                      <div key={g.segmentId ?? gi}>
                        {g.segmentName && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                            <h3 className={`text-sm font-black ${tx}`}>{g.segmentName}</h3>
                            <span className={`text-[10px] ${txFaint}`}>· {g.insights.length} insight(s)</span>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {g.insights.map(renderCard)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Campaigns Table ─────────────────────────────────────────── */}
            <div className={`rounded-2xl overflow-hidden ${cardBase}`}>
              <div className={`px-6 py-4 border-b ${divider} flex items-center justify-between`}>
                <h3 className={`text-sm font-black ${tx}`}>Campanhas</h3>
                <PeriodBadge label={periodBadgeLabel} isDark={isDark} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={isDark ? 'bg-[rgba(255,255,255,0.025)]' : 'bg-slate-50'}>
                      {['Nome', 'Status', 'Ciclo de Vida', 'Objetivo', 'Budget/dia', 'Criado em'].map((h, idx) => (
                        <th key={h} className={cn(
                          `px-6 py-3 text-[10px] font-black uppercase tracking-widest ${txFaint}`,
                          idx >= 4 ? 'text-right' : 'text-left'
                        )}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${divider}`}>
                    {campaigns.map(c => (
                      <tr key={c.id} className={cn('transition-colors',
                        isDark ? 'hover:bg-[rgba(255,255,255,0.025)]' : 'hover:bg-slate-50')}>
                        <td className={`px-6 py-4 text-sm font-medium ${tx}`}>{c.name}</td>
                        <td className="px-6 py-4">
                          <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide',
                            c.status === 'ACTIVE' && (isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'),
                            c.status === 'PAUSED' && (isDark ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'   : 'bg-amber-50 text-amber-700 border border-amber-100'),
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500')} />
                            {c.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <CampaignLifecycleBadge
                            campaignId={c.id}
                            status={(c.lifecycleStatus || 'DRAFT') as LifecycleStatus}
                            changedAt={c.lifecycleChangedAt ?? undefined}
                            onTransition={toStatus => handleLifecycleTransition(c.id, toStatus)}
                          />
                        </td>
                        <td className={`px-6 py-4 text-sm ${txMuted}`}>{c.objective.replace('OUTCOME_', '')}</td>
                        <td className={`px-6 py-4 text-sm font-mono text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {c.adSets[0] ? formatCurrency(c.adSets[0].dailyBudget / 100) : '—'}
                        </td>
                        <td className={`px-6 py-4 text-xs text-right ${txFaint}`}>
                          {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && (
                      <tr>
                        <td colSpan={6} className={`px-6 py-12 text-center text-sm ${txMuted}`}>
                          Nenhuma campanha criada ainda
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
              <h3 className={cn('text-base font-black', tx)}>Tracking Health</h3>
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
function PeriodBadge({ label, isDark }: { label: string; isDark: boolean }) {
  return (
    <span className={cn(
      'text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shrink-0',
      isDark
        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
        : 'bg-indigo-50 text-indigo-500 border border-indigo-100',
    )}>
      {label}
    </span>
  );
}

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
          <RetrovisorIcon isDark={isDark} />
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

function FarolSection({ isDark, children, periodLabel }: { isDark: boolean; children: React.ReactNode; periodLabel?: string }) {
  return (
    <div className={cn(
      'rounded-3xl p-6 mb-8 border',
      isDark
        ? 'border-[rgba(34,211,238,0.13)] shadow-[0_0_60px_rgba(34,211,238,0.03),inset_0_1px_0_rgba(34,211,238,0.06)] bg-[rgba(7,13,20,0.55)] backdrop-blur-sm'
        : 'border-sky-200/50 bg-gradient-to-br from-sky-50/50 to-white shadow-[0_4px_24px_rgba(14,165,233,0.05)]',
    )}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <FarolIcon isDark={isDark} />
          <div>
            <p className={`text-[9px] font-black uppercase tracking-[0.35em] mb-0.5 ${isDark ? 'text-cyan-700' : 'text-sky-500'}`}>
              Farol de Milha
            </p>
            <h2 className={`text-base font-black leading-tight ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
              Sinais Leading & Antecipação
            </h2>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              Quando / para onde — motor de sinais Meta (FASE 8.5)
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
//  SVG ICONS
// ═════════════════════════════════════════════════════════════════════════════

function RetrovisorIcon({ isDark }: { isDark: boolean }) {
  return (
    <img
      src="/retrovisor.png"
      alt="Retrovisor"
      width={56}
      height={56}
      className={`object-contain shrink-0 ${isDark ? 'opacity-90' : 'opacity-85'}`}
      style={{ filter: isDark ? 'none' : 'brightness(0.95)' }}
    />
  );
}

function FarolIcon({ isDark }: { isDark: boolean }) {
  return (
    <img
      src="/farol-de-milha.png"
      alt="Farol de Milha"
      width={56}
      height={56}
      className={`object-contain shrink-0 ${isDark ? 'opacity-90' : 'opacity-85'}`}
      style={{ filter: isDark ? 'none' : 'brightness(0.95)' }}
    />
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

function DateInputPtBR({
  value, onChange, style, className,
}: {
  value: string;
  onChange: (iso: string) => void;
  style?: React.CSSProperties;
  className?: string;
}) {
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
      if (iso) onChange(iso);
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
}

// ═════════════════════════════════════════════════════════════════════════════
//  WINNING ANGLE CHIP (FASE 14)
// ═════════════════════════════════════════════════════════════════════════════

interface AngleStat {
  angle: string;
  label: string;
  campaigns: number;
  spend: number;
  cpl: number | null;
}

interface AngleChipResult {
  topAngle:   AngleStat | null;
  worstAngle: AngleStat | null;
  angleStats: AngleStat[];
}

// Cores por ângulo (pill de cobertura)
const ANGLE_COLORS: Record<string, string> = {
  investment: 'bg-indigo-500/15 text-indigo-400',
  lifestyle:  'bg-emerald-500/15 text-emerald-400',
  family:     'bg-pink-500/15 text-pink-400',
  price:      'bg-amber-500/15 text-amber-400',
  urgency:    'bg-red-500/15 text-red-400',
  social:     'bg-cyan-500/15 text-cyan-400',
  luxury:     'bg-violet-500/15 text-violet-400',
  other:      'bg-slate-500/15 text-slate-400',
};
const ANGLE_COLORS_LIGHT: Record<string, string> = {
  investment: 'bg-indigo-50 text-indigo-600',
  lifestyle:  'bg-emerald-50 text-emerald-600',
  family:     'bg-pink-50 text-pink-600',
  price:      'bg-amber-50 text-amber-600',
  urgency:    'bg-red-50 text-red-600',
  social:     'bg-cyan-50 text-cyan-600',
  luxury:     'bg-violet-50 text-violet-600',
  other:      'bg-slate-50 text-slate-500',
};

function WinningAngleChip({ isDark, period, clientId }: {
  isDark: boolean;
  period: number;
  clientId?: string;
}) {
  const [data, setData]       = useState<AngleChipResult | null>(null);
  const [chipLoading, setChipLoading] = useState(true);

  useEffect(() => {
    setChipLoading(true);
    const params = new URLSearchParams({ period: String(period) });
    if (clientId && clientId !== 'all') params.set('clientId', clientId);
    adminFetch(`/api/admin/campanhas/portfolio/angle-insights?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d ? {
        topAngle:   d.topAngle   ?? null,
        worstAngle: d.worstAngle ?? null,
        angleStats: (d.angleStats ?? []) as AngleStat[],
      } : null))
      .catch(() => setData(null))
      .finally(() => setChipLoading(false));
  }, [period, clientId]);

  const classified = (data?.angleStats ?? []).filter(a => a.angle !== 'unknown' && a.campaigns > 0);

  // Oculta só quando sem nenhum dado (nem ângulos classificados nem CPL)
  if (!chipLoading && !data?.topAngle && classified.length === 0) return null;

  const bar = isDark
    ? 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)]'
    : 'bg-white border border-slate-100 shadow-sm';
  const txLabel  = isDark ? 'text-slate-500' : 'text-slate-400';
  const txMain   = isDark ? 'text-slate-300' : 'text-slate-700';
  const txFaint  = isDark ? 'text-slate-500' : 'text-slate-400';

  if (chipLoading) {
    return (
      <div className={`rounded-2xl px-5 py-3 mb-6 flex items-center gap-4 ${bar} animate-pulse`}>
        <div className={`h-3 w-28 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
        <div className={`h-3 w-20 rounded ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`} />
      </div>
    );
  }

  const hasCpl = !!data?.topAngle;
  // Modo cobertura: top 4 ângulos por nº de campanhas (quando sem CPL)
  const coverageAngles = classified
    .sort((a, b) => b.campaigns - a.campaigns)
    .slice(0, 4);

  return (
    <div className={`rounded-2xl px-5 py-3 mb-6 flex items-center gap-5 flex-wrap ${bar}`}>
      <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${txLabel}`}>
        {hasCpl ? `Ângulo · ${period}d` : `Ângulos · cobertura`}
      </span>

      {/* ── Modo CPL: vencedor / pior ── */}
      {hasCpl && (
        <>
          <span className="flex items-center gap-2">
            <span className="text-base leading-none">🏆</span>
            <span className={`text-xs font-black ${txMain}`}>
              {angleLabel(data!.topAngle!.angle)}
            </span>
            {data!.topAngle!.cpl != null && (
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {formatCurrency(data!.topAngle!.cpl)} CPL
              </span>
            )}
          </span>

          {data?.worstAngle && (
            <>
              <span className={`text-[10px] ${txFaint}`}>vs</span>
              <span className="flex items-center gap-2">
                <span className={`text-xs font-medium ${txFaint}`}>
                  ↓ {angleLabel(data.worstAngle.angle)}
                </span>
                {data.worstAngle.cpl != null && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                    isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'
                  }`}>
                    {formatCurrency(data.worstAngle.cpl)} CPL
                  </span>
                )}
              </span>
            </>
          )}
        </>
      )}

      {/* ── Modo cobertura: pills por ângulo ── */}
      {!hasCpl && coverageAngles.map(a => {
        const colorClass = isDark
          ? (ANGLE_COLORS[a.angle] ?? ANGLE_COLORS.other)
          : (ANGLE_COLORS_LIGHT[a.angle] ?? ANGLE_COLORS_LIGHT.other);
        return (
          <span
            key={a.angle}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${colorClass}`}
          >
            {a.label}
            <span className="opacity-60 font-normal">{a.campaigns}×</span>
          </span>
        );
      })}

      {/* Dica quando não há CPL ainda */}
      {!hasCpl && (
        <span className={`text-[10px] italic ${txFaint}`}>
          CPL disponível após sincronização de métricas
        </span>
      )}

      {/* Link para análise completa */}
      <a
        href="/admin/campanhas/portfolio/cross-insights"
        className={`ml-auto text-[10px] font-black uppercase tracking-widest transition-colors shrink-0 ${
          isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
        }`}
      >
        Ver análise →
      </a>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  KPI CARD
// ═════════════════════════════════════════════════════════════════════════════

function KpiCard({ isDark, label, value, fullValue, color, delta, invertDelta, tooltip }: {
  isDark: boolean; label: string; value: string; fullValue?: string; color: string;
  delta?: number; invertDelta?: boolean; tooltip?: string;
}) {
  let deltaColor = isDark ? 'text-slate-600' : 'text-gray-400';
  let deltaIcon  = '';
  let deltaBg    = '';
  let deltaTitle = '';

  if (delta !== undefined && Math.abs(delta) > 0.5) {
    const isPositive = delta > 0;
    const isGood     = invertDelta ? !isPositive : isPositive;

    // Cores: verde = bom, vermelho = ruim
    deltaColor = isGood
      ? (isDark ? 'text-emerald-400' : 'text-emerald-700')
      : (isDark ? 'text-red-400'     : 'text-red-600');
    deltaBg = isGood
      ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')
      : (isDark ? 'bg-red-500/10'     : 'bg-red-50');

    // Seta: sempre ↑ quando bom, ↓ quando ruim — direção semântica, não matemática
    // (ex: CPC caiu 58% → performance melhorou → seta verde ↑)
    deltaIcon = isGood ? '↑' : '↓';

    // Tooltip: mostra o que realmente aconteceu + interpretação
    const realDir  = isPositive ? 'subiu'  : 'caiu';
    const goodText = isGood ? 'performance melhorou ✓' : 'requer atenção ⚠';
    deltaTitle = `${label} ${realDir} ${Math.abs(delta).toFixed(1)}% vs período anterior — ${goodText}`;
  }

  // Tooltip do card: usa o tooltip explícito ou o tooltip do delta
  const cardTitle = tooltip || (fullValue ? `${label}: ${fullValue}` : undefined);

  return (
    <div
      title={cardTitle}
      className={cn(
        'group rounded-2xl border p-3.5 flex flex-col gap-1.5 min-w-0 overflow-hidden transition-all duration-200 cursor-default',
        isDark
          ? 'bg-[rgba(255,255,255,0.025)] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(99,102,241,0.4)] hover:shadow-[0_0_24px_rgba(99,102,241,0.12)] hover:-translate-y-0.5'
          : 'bg-white border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] hover:-translate-y-0.5',
      )}
    >
      {/* Label */}
      <span className={`text-[9px] font-black uppercase tracking-widest leading-none truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </span>

      {/* Valor — versão compacta para caber no card */}
      <span
        className={cn('text-sm font-black font-mono leading-tight', color)}
        style={{ wordBreak: 'keep-all', overflowWrap: 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
        title={fullValue ?? value}
      >
        {value}
      </span>

      {/* Delta — seta semântica: ↑ verde = melhorou, ↓ vermelho = piorou */}
      {delta !== undefined && deltaIcon && (
        <span
          title={deltaTitle}
          className={cn(
            'self-start text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none whitespace-nowrap cursor-help',
            deltaColor, deltaBg,
          )}
        >
          {deltaIcon} {Math.abs(delta).toFixed(1)}%
        </span>
      )}
      {/* Variação insignificante */}
      {delta !== undefined && Math.abs(delta) <= 0.5 && (
        <span className={cn('text-[8px] font-bold', isDark ? 'text-slate-700' : 'text-slate-300')}>
          = estável
        </span>
      )}
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
//  HOOK RATE KPI CARD — com tabela de referência de benchmarks no canto
// ═════════════════════════════════════════════════════════════════════════════

function HookRateKpiCard({ isDark, value, color, benchmarks: bm }: {
  isDark: boolean; value: number; color: string;
  benchmarks: { hook_rate_critical: number; hook_rate_min: number; hook_rate_good: number };
}) {
  const [showRef, setShowRef] = React.useState(false);
  const { hook_rate_critical: crit, hook_rate_min: min, hook_rate_good: good } = bm;

  // Tabela de referência construída dinamicamente a partir dos benchmarks do banco
  const benchmarks = [
    { range: `≥ ${good}%`,           label: 'Excelente', cls: 'text-emerald-400' },
    { range: `${min}–${good - 1}%`,  label: 'Bom',       cls: 'text-emerald-500' },
    { range: `${crit}–${min - 1}%`,  label: 'Atenção',   cls: 'text-amber-400' },
    { range: `< ${crit}%`,           label: 'Crítico',   cls: 'text-red-400' },
  ];

  return (
    <div className={cn(
      'group relative rounded-2xl border p-3.5 flex flex-col gap-1.5 min-w-0 overflow-visible transition-all duration-200',
      isDark
        ? 'bg-[rgba(255,255,255,0.025)] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(99,102,241,0.4)] hover:shadow-[0_0_24px_rgba(99,102,241,0.12)] hover:-translate-y-0.5'
        : 'bg-white border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] hover:-translate-y-0.5',
    )}>
      {/* Label + ícone de referência */}
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[9px] font-black uppercase tracking-widest leading-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Hook Rate
        </span>
        <button
          type="button"
          onClick={() => setShowRef(v => !v)}
          title="Ver referência de benchmarks"
          className={cn(
            'flex-shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black leading-none transition-colors',
            showRef
              ? 'bg-indigo-500 text-white'
              : isDark ? 'bg-slate-700 text-slate-400 hover:bg-indigo-500/30 hover:text-indigo-300' : 'bg-slate-100 text-slate-400 hover:bg-indigo-100 hover:text-indigo-600',
          )}
        >
          i
        </button>
      </div>

      {/* Valor */}
      <span
        className={cn('text-sm font-black font-mono leading-tight', color)}
        style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}
        title={`Hook Rate: ${value.toFixed(2)}% — views 3s / impressões × 100`}
      >
        {value.toFixed(1)}%
      </span>

      {/* Tabela de referência — aparece ao clicar no ⓘ, anchorada no canto direito do card */}
      {showRef && (
        <div className={cn(
          'absolute top-full right-0 mt-1.5 z-50 rounded-xl border shadow-xl p-3 min-w-[160px]',
          isDark
            ? 'bg-[#0d1421] border-[rgba(255,255,255,0.1)]'
            : 'bg-white border-slate-200',
        )}>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Referência Hook Rate
          </p>
          <p className={`text-[9px] mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            views 3s ÷ impressões × 100
          </p>
          <table className="w-full text-[10px]">
            <thead>
              <tr className={isDark ? 'text-slate-600' : 'text-slate-400'}>
                <th className="text-left font-black pb-1">Faixa</th>
                <th className="text-right font-black pb-1">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {benchmarks.map(b => (
                <tr key={b.range}>
                  <td className={`py-1 font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{b.range}</td>
                  <td className={`py-1 text-right font-black ${b.cls}`}>{b.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  BRIEFING CARD
// ═════════════════════════════════════════════════════════════════════════════

function BriefingCard({ briefing, isDark, compact }: {
  briefing: StrategicBriefingData; isDark: boolean; compact?: boolean;
}) {
  const c         = briefing.content;
  const typeLabel = briefing.type === 'morning' ? 'Matinal' : briefing.type === 'closing' ? 'Fechamento' : 'Manual';
  const date      = new Date(briefing.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const periodLabel = briefing.periodDays != null
    ? (briefing.periodDays === 1 ? 'Hoje' : `${briefing.periodDays}d`)
    : null;

  const cardCls = isDark
    ? 'bg-[rgba(13,20,33,0.92)] backdrop-blur-sm border border-[rgba(255,255,255,0.07)] shadow-[0_2px_16px_rgba(0,0,0,0.5)]'
    : 'bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)]';
  const tx      = isDark ? 'text-slate-300' : 'text-slate-900';
  const txMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const txFaint = isDark ? 'text-slate-500' : 'text-slate-400';
  const badge   = isDark
    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
    : 'bg-violet-50 text-violet-700 border border-violet-100';
  const periodBadge = isDark
    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
    : 'bg-indigo-50 text-indigo-500 border border-indigo-100';

  return (
    <div className={cn(`rounded-2xl p-5 ${cardCls}`, compact && 'opacity-70')}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${badge}`}>{typeLabel}</span>
          <span className={`text-xs ${txFaint}`}>{date}</span>
        </div>
        {periodLabel && (
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shrink-0 ${periodBadge}`}>
            {periodLabel}
          </span>
        )}
      </div>
      {c.urgentAlerts?.length > 0 && (
        <div className="mb-3 space-y-1">
          {c.urgentAlerts.map((a, idx) => (
            <p key={idx} className={`text-sm font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>⚠ {a}</p>
          ))}
        </div>
      )}
      {c.performanceSummary && (
        <p className={cn(`text-sm leading-relaxed mb-3 ${txMuted}`, compact && 'line-clamp-2')}>{c.performanceSummary}</p>
      )}
      {!compact && c.campaignAnalysis?.length > 0 && (
        <div className="mb-3">
          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${txFaint}`}>Campanhas</p>
          <div className="space-y-1.5">
            {c.campaignAnalysis.map((ca, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <span>{ca.status === 'critical' ? '🔴' : ca.status === 'warning' ? '🟡' : '🟢'}</span>
                <span className={`font-black ${tx}`}>{ca.campaignName}:</span>
                <span className={txMuted}>{ca.recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!compact && c.budgetRecommendations?.length > 0 && (
        <div className="mb-3">
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Budget</p>
          {c.budgetRecommendations.map((r, idx) => <p key={idx} className={`text-sm ${txMuted}`}>• {r}</p>)}
        </div>
      )}
      {!compact && c.actionItems?.length > 0 && (
        <div className="mb-3">
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Ações</p>
          {c.actionItems.map((a, idx) => <p key={idx} className={`text-sm ${txMuted}`}>• {a}</p>)}
        </div>
      )}
      {!compact && c.tomorrowPlan && (
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Plano Amanhã</p>
          <p className={`text-sm ${txMuted}`}>{c.tomorrowPlan}</p>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
