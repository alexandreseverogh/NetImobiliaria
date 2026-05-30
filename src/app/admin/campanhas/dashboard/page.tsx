"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  getDashboardFull, getDashboardPredictions, getLatestBriefing, generateBriefing, getBriefings, syncInsights,
  type DashboardFullData, type PredictionData, type StrategicBriefingData, type Campaign, type AiInsightData,
  getAiInsights,
} from '@/lib/marketing-api';
import { formatCurrency, formatNumber, formatPercent, cn, OBJECTIVES } from '@/lib/marketing-utils';
import { MultiMetricChart } from '@/components/marketing/charts/MultiMetricChart';
import { FunnelChart } from '@/components/marketing/charts/FunnelChart';
import { PredictionChart } from '@/components/marketing/charts/PredictionChart';
import { ArrowPathIcon, SparklesIcon, ClockIcon } from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import { CampaignLifecycleBadge } from '@/components/marketing/CampaignLifecycleBadge';
import type { LifecycleStatus } from '@/lib/marketing/services/campaignLifecycleTypes';
import { ExecuteGuard } from '@/components/admin/PermissionGuard';
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#111827',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  },
};

export function DashboardPage() {
  const [data, setData]             = useState<DashboardFullData | null>(null);
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [briefing, setBriefing]     = useState<StrategicBriefingData | null>(null);
  const [briefingHistory, setBriefingHistory] = useState<StrategicBriefingData[]>([]);
  const [aiInsights, setAiInsights] = useState<AiInsightData[]>([]);
  const [loading, setLoading]       = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [showBriefingHistory, setShowBriefingHistory] = useState(false);

  const [dateRange, setDateRange]         = useState('30');
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [objectiveFilter, setObjectiveFilter]   = useState('');
  const [statusFilter, setStatusFilter]         = useState('');
  const [adSetFilter, setAdSetFilter]           = useState('');

  // ClientSelector — ALTA PRIORIDADE (CLAUDE.md)
  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('dashboard');

  useEffect(() => { loadData(); }, [dateRange, startDate, endDate, selectedCampaign, objectiveFilter, statusFilter, adSetFilter, clientFilter]);

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
      if (selectedCampaign) params.campaignId = selectedCampaign;
      if (objectiveFilter) params.objectiveFilter = objectiveFilter;
      if (statusFilter) params.statusFilter = statusFilter;
      if (adSetFilter) params.adSetId = adSetFilter;
      // Filtro por cliente (ClientSelector)
      if (clientFilter && clientFilter !== 'all') params.clientId = clientFilter;

      const [dashData, predData] = await Promise.all([
        getDashboardFull(params).catch((e) => { console.error('[Dashboard] getDashboardFull:', e); return null; }),
        getDashboardPredictions({ campaignId: selectedCampaign || undefined }).catch(() => null),
      ]);
      if (dashData) setData(dashData);
      if (predData) setPredictions(predData);

      Promise.all([
        getLatestBriefing().catch(() => null),
        getBriefings({ limit: 5 }).catch(() => []),
        getAiInsights({ campaignId: selectedCampaign || undefined }).catch(() => []),
      ]).then(([latestBriefing, history, aiData]) => {
        setBriefing(latestBriefing);
        setBriefingHistory(history as StrategicBriefingData[]);
        setAiInsights(aiData as AiInsightData[]);
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
      return; // não atualiza local se a API falhou
    }
    // Atualiza localmente sem recarregar tudo
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
    try { await syncInsights(); await loadData(); }
    catch { alert('Erro ao sincronizar. Verifique as credenciais Meta.'); }
    finally { setSyncing(false); }
  }

  async function handleGenerateBriefing() {
    setGeneratingBriefing(true);
    try {
      const b = await generateBriefing('manual');
      setBriefing(b);
      setBriefingHistory(prev => [b, ...prev].slice(0, 5));
    } catch { alert('Erro ao gerar briefing'); }
    finally { setGeneratingBriefing(false); }
  }

  function handleQuickDate(days: string) {
    setStartDate(''); setEndDate(''); setDateRange(days);
  }

  const t          = data?.currentPeriod.totals;
  const d          = data?.deltas;
  const campaigns  = data?.campaigns || [];
  const adSets     = data?.adSets || [];
  const cpl        = t && data?.currentPeriod.leadCount
    ? data.currentPeriod.leadCount > 0 ? t.spend / data.currentPeriod.leadCount : 0 : 0;

  const chartData = data?.currentPeriod.insights
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(i => ({
      date: new Date(i.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      spend: i.spend, clicks: i.clicks, impressions: i.impressions,
      ctr: i.ctr, cpc: i.cpc, cpm: i.cpm, conversions: i.conversions,
    })) || [];

  const dailyLeadsMap = new Map((data?.dailyLeads || []).map(dl => [
    new Date(dl.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), dl.count,
  ]));
  const cplData = chartData.map(cd => ({
    date: cd.date, spend: cd.spend,
    leads: dailyLeadsMap.get(cd.date) || 0,
    cpl: (dailyLeadsMap.get(cd.date) || 0) > 0 ? cd.spend / (dailyLeadsMap.get(cd.date) || 1) : 0,
  }));

  const campaignSpendData = campaigns
    .filter(c => c.adSets.length > 0)
    .map((c, i) => ({
      name: c.name.slice(0, 20),
      value: c.adSets.reduce((s, as_) => s + as_.dailyBudget, 0) / 100,
      color: COLORS[i % COLORS.length],
    }));

  const periodLabel = startDate && endDate
    ? `${new Date(startDate).toLocaleDateString('pt-BR')} — ${new Date(endDate).toLocaleDateString('pt-BR')}`
    : `Últimos ${dateRange} dias`;

  const selectCls = "bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";
  const inputCls  = "bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Campanhas</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">{periodLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Seletor de cliente — ALTA PRIORIDADE */}
            <ClientSelector
              value={clientFilter}
              onChange={setClientFilter}
              clients={clients}
              loading={clientsLoading}
              storageKey="dashboard"
            />
            <ExecuteGuard resource="dashboard-campanhas">
              <button onClick={handleSync} disabled={syncing}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20">
                <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sync Meta'}
              </button>
            </ExecuteGuard>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-4 mb-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Campanha</label>
              <select value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)} className={`${selectCls} w-full`}>
                <option value="">Todas</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="min-w-[120px]">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Objetivo</label>
              <select value={objectiveFilter} onChange={e => setObjectiveFilter(e.target.value)} className={selectCls}>
                <option value="">Todos</option>
                {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="min-w-[100px]">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={selectCls}>
                <option value="">Todos</option>
                <option value="ACTIVE">Ativo</option>
                <option value="PAUSED">Pausado</option>
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Ad Set</label>
              <select value={adSetFilter} onChange={e => setAdSetFilter(e.target.value)} className={selectCls}>
                <option value="">Todos</option>
                {adSets.map(as_ => <option key={as_.id} value={as_.id}>{as_.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">De</label>
              <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setDateRange(''); }} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Até</label>
              <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setDateRange(''); }} className={inputCls} />
            </div>
            <div className="flex gap-1 bg-gray-50 rounded-xl p-1 border border-gray-200">
              {['7', '14', '30', '60'].map(v => (
                <button key={v} onClick={() => handleQuickDate(v)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-black transition-all', dateRange === v
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900')}>
                  {v}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-11 gap-3 mb-6">
          <KpiCard label="Gasto"      value={formatCurrency(t?.spend || 0)}                    delta={d?.spend}       color="text-red-600"    invertDelta />
          <KpiCard label="Impressões" value={formatNumber(t?.impressions || 0)}                 delta={d?.impressions} color="text-blue-600" />
          <KpiCard label="Alcance"    value={formatNumber(t?.reach || 0)}                       delta={d?.reach}       color="text-cyan-600" />
          <KpiCard label="Cliques"    value={formatNumber(t?.clicks || 0)}                      delta={d?.clicks}      color="text-emerald-600" />
          <KpiCard label="CTR"        value={formatPercent(t?.ctr || 0)}                        delta={d?.ctr}         color="text-amber-600" />
          <KpiCard label="CPC"        value={formatCurrency(t?.cpc || 0)}                       delta={d?.cpc}         color="text-orange-600" invertDelta />
          <KpiCard label="CPM"        value={formatCurrency(t?.cpm || 0)}                       delta={d?.cpm}         color="text-violet-600" invertDelta />
          <KpiCard label="Conversões" value={formatNumber(t?.conversions || 0)}                 delta={d?.conversions} color="text-pink-600" />
          <KpiCard label="Leads"      value={formatNumber(data?.currentPeriod.leadCount || 0)}  delta={d?.leads}       color="text-indigo-600" />
          <KpiCard label="CPL"        value={formatCurrency(cpl)}                               color="text-teal-600" />
          <KpiCard label="Budget/dia" value={formatCurrency(campaignSpendData.reduce((s, c) => s + c.value, 0))} color="text-gray-900" />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-80 animate-pulse" />)}
          </div>
        ) : !data || data.currentPeriod.insights.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-16 text-center">
            <p className="text-sm font-black text-gray-900 mb-1">Nenhum dado disponível</p>
            <p className="text-xs text-gray-400">Sincronize os dados do Meta ou aguarde as campanhas gerarem resultados.</p>
          </div>
        ) : (
          <>
            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-6">
                <MultiMetricChart data={chartData} title="Performance Multi-Métrica"
                  metrics={[
                    { key: 'spend',  label: 'Gasto (R$)', color: '#6366f1', type: 'area' },
                    { key: 'clicks', label: 'Cliques',    color: '#10b981', type: 'line', yAxisId: 'right' },
                    { key: 'ctr',    label: 'CTR %',      color: '#f59e0b', type: 'line', yAxisId: 'right' },
                    { key: 'cpc',    label: 'CPC (R$)',   color: '#ef4444', type: 'line', yAxisId: 'right' },
                  ]} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-6">
                <h3 className="text-sm font-black text-gray-900 mb-4">CPL Timeline</h3>
                <MultiMetricChart data={cplData} metrics={[
                  { key: 'spend', label: 'Gasto (R$)', color: '#6366f1', type: 'area' },
                  { key: 'leads', label: 'Leads',      color: '#10b981', type: 'bar', yAxisId: 'right' },
                  { key: 'cpl',   label: 'CPL (R$)',   color: '#f59e0b', type: 'line' },
                ]} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-6">
                <h3 className="text-sm font-black text-gray-900 mb-4">Funil de Conversão</h3>
                <FunnelChart data={data.funnelData} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-6">
                <h3 className="text-sm font-black text-gray-900 mb-4">Distribuição por Campanha</h3>
                {campaignSpendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={campaignSpendData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                        label={((props: any) => `${props.name} (${((props.percent as number) * 100).toFixed(0)}%)`) as any} labelLine={false}>
                        {campaignSpendData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip {...TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-12">Sem dados de campanhas</p>
                )}
              </motion.div>
            </div>

            {/* Predictions */}
            {predictions && !predictions.insufficientData && (
              <div className="mb-6">
                <div className="mb-4">
                  <h2 className="text-xl font-black text-gray-900">Projeções</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{predictions.historical.dates.length} dias de histórico</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[
                    { label: 'Gasto Diário (R$)', color: '#6366f1', hist: predictions.historical.spend,  pred: predictions.spend,  fmt: (v: number) => `R$${v.toFixed(0)}` },
                    { label: 'Leads Diários',     color: '#10b981', hist: predictions.historical.leads,  pred: predictions.leads,  fmt: (v: number) => v.toFixed(0) },
                    { label: 'CTR (%)',           color: '#f59e0b', hist: predictions.historical.ctr,    pred: predictions.ctr,    fmt: (v: number) => `${v.toFixed(2)}%` },
                    { label: 'CPC (R$)',          color: '#ef4444', hist: predictions.historical.cpc,    pred: predictions.cpc,    fmt: (v: number) => `R$${v.toFixed(2)}` },
                  ].map((p, i) => (
                    <motion.div key={p.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                      className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-6">
                      <PredictionChart label={p.label} color={p.color}
                        historical={predictions.historical.dates.map((d, j) => ({ date: d, value: p.hist[j] }))}
                        predictions={p.pred} formatter={p.fmt} />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Briefing */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-50 rounded-xl">
                    <SparklesIcon className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Briefing Estratégico AI</h2>
                    <p className="text-xs text-gray-400">Gerado por LLM com fallback rule-based</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowBriefingHistory(!showBriefingHistory)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {showBriefingHistory ? 'Ocultar' : 'Histórico'}
                  </button>
                  <ExecuteGuard resource="dashboard-campanhas">
                    <button onClick={handleGenerateBriefing} disabled={generatingBriefing}
                      className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-violet-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/20">
                      {generatingBriefing
                        ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Gerando...</>
                        : <><SparklesIcon className="h-3.5 w-3.5" /> Gerar Novo</>}
                    </button>
                  </ExecuteGuard>
                </div>
              </div>

              {briefing
                ? <BriefingCard briefing={briefing} />
                : (
                  <div className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-10 text-center">
                    <p className="text-sm font-black text-gray-900 mb-1">Nenhum briefing gerado ainda</p>
                    <p className="text-xs text-gray-400">Clique em "Gerar Novo" ou aguarde o envio automático (08h e 18h).</p>
                  </div>
                )}

              {showBriefingHistory && briefingHistory.length > 1 && (
                <div className="mt-4 space-y-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Histórico</p>
                  {briefingHistory.filter(b => b.id !== briefing?.id).map(b => (
                    <BriefingCard key={b.id} briefing={b} compact />
                  ))}
                </div>
              )}
            </div>

            {/* AI Insights */}
            {aiInsights.length > 0 && (
              <div className="mb-6">
                <div className="mb-4">
                  <h2 className="text-lg font-black text-gray-900">Insights da IA</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Análise automática de CTR, CPC, frequência e CPL — sem dependência de LLM</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiInsights.map((insight, i) => {
                    const styles: Record<string, { border: string; badge: string; dot: string }> = {
                      PAUSE:    { border: 'border-l-red-500',    badge: 'bg-red-50 text-red-600 border border-red-100',     dot: 'bg-red-500' },
                      SCALE:    { border: 'border-l-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100', dot: 'bg-emerald-500' },
                      OPTIMIZE: { border: 'border-l-amber-500',  badge: 'bg-amber-50 text-amber-700 border border-amber-100',  dot: 'bg-amber-500' },
                      ALERT:    { border: 'border-l-orange-500', badge: 'bg-orange-50 text-orange-700 border border-orange-100', dot: 'bg-orange-500' },
                    };
                    const s = styles[insight.type] || styles.ALERT;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                        className={cn('bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-4 border-l-4', s.border)}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${s.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{insight.type}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">
                            Confiança: {(insight.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-gray-900 mb-1">{insight.title}</h4>
                        <p className="text-xs text-gray-500">{insight.description}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Campaigns Table */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h3 className="text-sm font-black text-gray-900">Campanhas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome</th>
                      <th className="text-left px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="text-left px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ciclo de Vida</th>
                      <th className="text-left px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Objetivo</th>
                      <th className="text-right px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Budget/dia</th>
                      <th className="text-right px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Criado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {campaigns.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
                        <td className="px-6 py-4">
                          <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide',
                            c.status === 'ACTIVE'  && 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                            c.status === 'PAUSED'  && 'bg-amber-50 text-amber-700 border border-amber-100',
                          )}>
                            <span className={cn('w-1.5 h-1.5 rounded-full',
                              c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
                            )} />{c.status}
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
                        <td className="px-6 py-4 text-sm text-gray-600">{c.objective.replace('OUTCOME_', '')}</td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-700 text-right">
                          {c.adSets[0] ? formatCurrency(c.adSets[0].dailyBudget / 100) : '—'}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400 text-right">
                          {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
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
      </div>
    </div>
  );
}

function KpiCard({ label, value, color, delta, invertDelta }: {
  label: string; value: string; color: string; delta?: number; invertDelta?: boolean;
}) {
  let deltaColor = 'text-gray-400';
  let deltaIcon  = '';
  let deltaBg    = '';
  if (delta !== undefined && Math.abs(delta) > 0.5) {
    const isPositive = delta > 0;
    const isGood     = invertDelta ? !isPositive : isPositive;
    deltaColor = isGood ? 'text-emerald-700' : 'text-red-600';
    deltaBg    = isGood ? 'bg-emerald-50' : 'bg-red-50';
    deltaIcon  = isPositive ? '↑' : '↓';
  }
  return (
    <div className="
      group bg-white rounded-2xl border border-gray-100/80
      shadow-[0_2px_8px_rgba(0,0,0,0.05),0_0_1px_rgba(0,0,0,0.04)]
      hover:shadow-[0_6px_20px_rgba(0,0,0,0.09),0_0_1px_rgba(0,0,0,0.04)]
      hover:-translate-y-0.5 transition-all duration-200
      p-3.5 flex flex-col gap-1.5 min-w-0 overflow-hidden
    ">
      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none truncate">
        {label}
      </span>
      <span className={cn('text-sm font-black font-mono leading-tight truncate', color)}>
        {value}
      </span>
      {delta !== undefined && (
        <span className={cn(
          'self-start text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none',
          deltaColor, deltaBg || 'bg-gray-100 text-gray-400',
        )}>
          {deltaIcon} {Math.abs(delta).toFixed(1)}%
        </span>
      )}
    </div>
  );
}

function BriefingCard({ briefing, compact }: { briefing: StrategicBriefingData; compact?: boolean }) {
  const c         = briefing.content;
  const typeLabel = briefing.type === 'morning' ? 'Matinal' : briefing.type === 'closing' ? 'Fechamento' : 'Manual';
  const date      = new Date(briefing.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className={cn('bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] p-5', compact && 'opacity-75')}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-100 uppercase tracking-wide">{typeLabel}</span>
        <span className="text-xs text-gray-400">{date}</span>
      </div>

      {c.urgentAlerts?.length > 0 && (
        <div className="mb-3 space-y-1">
          {c.urgentAlerts.map((a, i) => (
            <p key={i} className="text-sm text-red-600 font-medium">⚠ {a}</p>
          ))}
        </div>
      )}

      {c.performanceSummary && (
        <p className={cn('text-sm text-gray-700 mb-3 leading-relaxed', compact && 'line-clamp-2')}>{c.performanceSummary}</p>
      )}

      {!compact && c.campaignAnalysis?.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Campanhas</p>
          <div className="space-y-1.5">
            {c.campaignAnalysis.map((ca, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span>{ca.status === 'critical' ? '🔴' : ca.status === 'warning' ? '🟡' : '🟢'}</span>
                <span className="font-black text-gray-900">{ca.campaignName}:</span>
                <span className="text-gray-500">{ca.recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!compact && c.budgetRecommendations?.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Budget</p>
          {c.budgetRecommendations.map((r, i) => <p key={i} className="text-sm text-gray-600">• {r}</p>)}
        </div>
      )}

      {!compact && c.actionItems?.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Ações</p>
          {c.actionItems.map((a, i) => <p key={i} className="text-sm text-gray-600">• {a}</p>)}
        </div>
      )}

      {!compact && c.tomorrowPlan && (
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Plano Amanhã</p>
          <p className="text-sm text-gray-600">{c.tomorrowPlan}</p>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
