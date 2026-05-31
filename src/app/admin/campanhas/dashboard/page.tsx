"use client";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  getDashboardFull, getDashboardPredictions, getLatestBriefing, generateBriefing, getBriefings, syncInsights,
  type DashboardFullData, type PredictionData, type StrategicBriefingData, type AiInsightData,
  getAiInsights,
} from '@/lib/marketing-api';
import { formatCurrency, formatNumber, formatPercent, cn, OBJECTIVES } from '@/lib/marketing-utils';
import { MultiMetricChart } from '@/components/marketing/charts/MultiMetricChart';
import { FunnelChart } from '@/components/marketing/charts/FunnelChart';
import { PredictionChart } from '@/components/marketing/charts/PredictionChart';
import { ArrowPathIcon, SparklesIcon, ClockIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import { CampaignLifecycleBadge } from '@/components/marketing/CampaignLifecycleBadge';
import type { LifecycleStatus } from '@/lib/marketing/services/campaignLifecycleTypes';
import { ExecuteGuard } from '@/components/admin/PermissionGuard';
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector';

// ─── Palettes ─────────────────────────────────────────────────────────────────
const PALETTE_DARK  = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#e879f9'];
const PALETTE_LIGHT = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export function DashboardPage() {
  const [data, setData]                     = useState<DashboardFullData | null>(null);
  const [predictions, setPredictions]       = useState<PredictionData | null>(null);
  const [briefing, setBriefing]             = useState<StrategicBriefingData | null>(null);
  const [briefingHistory, setBriefingHistory] = useState<StrategicBriefingData[]>([]);
  const [aiInsights, setAiInsights]         = useState<AiInsightData[]>([]);
  const [loading, setLoading]               = useState(true);
  const [syncing, setSyncing]               = useState(false);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [showBriefingHistory, setShowBriefingHistory] = useState(false);
  const [isDark, setIsDark]                 = useState(true); // dark by default

  const [dateRange, setDateRange]           = useState('30');
  const [startDate, setStartDate]           = useState('');
  const [endDate, setEndDate]               = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [objectiveFilter, setObjectiveFilter]   = useState('');
  const [statusFilter, setStatusFilter]         = useState('');
  const [adSetFilter, setAdSetFilter]           = useState('');

  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('dashboard');

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

  useEffect(() => { loadData(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateRange, startDate, endDate, selectedCampaign, objectiveFilter, statusFilter, adSetFilter, clientFilter]);

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
      if (selectedCampaign)                    params.campaignId      = selectedCampaign;
      if (objectiveFilter)                     params.objectiveFilter = objectiveFilter;
      if (statusFilter)                        params.statusFilter    = statusFilter;
      if (adSetFilter)                         params.adSetId         = adSetFilter;
      if (clientFilter && clientFilter !== 'all') params.clientId     = clientFilter;

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

  // FASE 5 — Hook Rate (video_views_3s / impressions × 100)
  const totalVideoViews3s = data?.currentPeriod.insights.reduce(
    (s, i) => s + (Number((i as any).videoViews3s) || 0), 0
  ) ?? 0;
  const totalImpressionsN = Number(t?.impressions) || 0;
  const hookRateRaw       = totalVideoViews3s > 0 && totalImpressionsN > 0
    ? (totalVideoViews3s / totalImpressionsN) * 100 : null;
  const hookRate          = hookRateRaw !== null && isFinite(hookRateRaw) ? hookRateRaw : null;
  const hookRateColor     = hookRate === null
    ? (isDark ? 'text-slate-600' : 'text-slate-400')
    : hookRate < 8 ? 'text-red-500' : hookRate < 12 ? 'text-amber-500' : 'text-emerald-500';

  const COLORS = isDark ? PALETTE_DARK : PALETTE_LIGHT;
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

  // ─── Theme tokens ─────────────────────────────────────────────────────────
  const bg       = isDark ? 'bg-[#080c14]' : 'bg-slate-50';
  const cardBase = isDark
    ? 'bg-[rgba(13,20,33,0.92)] backdrop-blur-sm border border-[rgba(255,255,255,0.07)] shadow-[0_2px_16px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.03)]'
    : 'bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]';
  const tx       = isDark ? 'text-slate-100' : 'text-slate-900';
  const txMuted  = isDark ? 'text-slate-500' : 'text-slate-500';
  const txFaint  = isDark ? 'text-slate-600' : 'text-slate-400';
  const divider  = isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-100';

  const selectBase = isDark
    ? 'border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all'
    : 'bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all';
  const selectStyle = isDark
    ? { colorScheme: 'dark' as const, backgroundColor: 'rgba(255,255,255,0.04)' }
    : undefined;

  const predColors = isDark
    ? ['#818cf8', '#34d399', '#fbbf24', '#f87171']
    : ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

  const tooltipCss = {
    contentStyle: {
      background: isDark ? '#0d1421' : '#ffffff',
      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
      borderRadius: '12px', fontSize: '12px', fontWeight: 500,
      color: isDark ? '#f1f5f9' : '#0f172a',
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 6px rgba(0,0,0,0.1)',
    },
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={`p-8 min-h-screen transition-colors duration-300 ${bg}`}>
      <div className="max-w-7xl mx-auto">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-2">Campanhas</p>
            <h1 className={`text-3xl font-black tracking-tight ${tx}`}>Dashboard</h1>
            <p className={`mt-1 text-sm font-medium ${txMuted}`}>{periodLabel}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ClientSelector
              value={clientFilter}
              onChange={setClientFilter}
              clients={clients}
              loading={clientsLoading}
              storageKey="dashboard"
            />
            {/* Dark / Light toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200',
                isDark
                  ? 'bg-[rgba(255,255,255,0.05)] text-slate-400 hover:bg-[rgba(255,255,255,0.09)] border border-[rgba(255,255,255,0.07)] hover:text-slate-200'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-sm hover:text-slate-900'
              )}
            >
              {isDark ? <><SunIcon className="h-3.5 w-3.5" /> Claro</> : <><MoonIcon className="h-3.5 w-3.5" /> Escuro</>}
            </button>
            <ExecuteGuard resource="dashboard-campanhas">
              <button onClick={handleSync} disabled={syncing}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25">
                <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sync Meta'}
              </button>
            </ExecuteGuard>
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
              <input type="date" value={startDate}
                onChange={e => { setStartDate(e.target.value); setDateRange(''); }}
                style={selectStyle} className={selectBase} />
            </div>
            <div>
              <label className={`block text-[10px] font-black uppercase tracking-widest mb-1.5 ${txFaint}`}>Até</label>
              <input type="date" value={endDate}
                onChange={e => { setEndDate(e.target.value); setDateRange(''); }}
                style={selectStyle} className={selectBase} />
            </div>
            <div className={cn('flex gap-1 rounded-xl p-1 border',
              isDark ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.05)]' : 'bg-slate-50 border-slate-200')}>
              {['7', '14', '30', '60'].map(v => (
                <button key={v} onClick={() => handleQuickDate(v)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-black transition-all', dateRange === v
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : isDark ? 'text-slate-500 hover:text-slate-200' : 'text-slate-500 hover:text-slate-900')}>
                  {v}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── KPI Grid ──────────────────────────────────────────────────────── */}
        <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 ${hookRate !== null ? 'xl:grid-cols-12' : 'xl:grid-cols-11'}`}>
          <KpiCard isDark={isDark} label="Gasto"      value={formatCurrency(t?.spend || 0)}                    delta={d?.spend}       color={isDark ? 'text-red-400'     : 'text-red-600'}     invertDelta />
          <KpiCard isDark={isDark} label="Impressões" value={formatNumber(t?.impressions || 0)}                 delta={d?.impressions} color={isDark ? 'text-blue-400'    : 'text-blue-600'} />
          <KpiCard isDark={isDark} label="Alcance"    value={formatNumber(t?.reach || 0)}                       delta={d?.reach}       color={isDark ? 'text-cyan-400'    : 'text-cyan-600'} />
          <KpiCard isDark={isDark} label="Cliques"    value={formatNumber(t?.clicks || 0)}                      delta={d?.clicks}      color={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
          <KpiCard isDark={isDark} label="CTR"        value={formatPercent(t?.ctr || 0)}                        delta={d?.ctr}         color={isDark ? 'text-amber-400'   : 'text-amber-600'} />
          <KpiCard isDark={isDark} label="CPC"        value={formatCurrency(t?.cpc || 0)}                       delta={d?.cpc}         color={isDark ? 'text-orange-400'  : 'text-orange-600'} invertDelta />
          <KpiCard isDark={isDark} label="CPM"        value={formatCurrency(t?.cpm || 0)}                       delta={d?.cpm}         color={isDark ? 'text-violet-400'  : 'text-violet-600'} invertDelta />
          <KpiCard isDark={isDark} label="Conversões" value={formatNumber(t?.conversions || 0)}                 delta={d?.conversions} color={isDark ? 'text-pink-400'    : 'text-pink-600'} />
          <KpiCard isDark={isDark} label="Leads"      value={formatNumber(data?.currentPeriod.leadCount || 0)}  delta={d?.leads}       color={isDark ? 'text-indigo-400'  : 'text-indigo-600'} />
          <KpiCard isDark={isDark} label="CPL"        value={formatCurrency(cpl)}                               color={isDark ? 'text-teal-400'    : 'text-teal-600'} />
          <KpiCard isDark={isDark} label="Budget/dia" value={formatCurrency(campaignSpendData.reduce((s, c) => s + c.value, 0))} color={isDark ? 'text-slate-300' : 'text-slate-800'} />
          {hookRate !== null && (
            <KpiCard isDark={isDark} label="Hook Rate" value={`${hookRate.toFixed(1)}%`}
              color={hookRateColor} tooltip="Vídeos: views 3s / impressões × 100" />
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
            <RetrovisorSection isDark={isDark}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl p-6 ${cardBase}`}>
                  <MultiMetricChart isDark={isDark} data={chartData} title="Performance Multi-Métrica"
                    metrics={[
                      { key: 'spend',  label: 'Gasto (R$)', color: predColors[0], type: 'area' },
                      { key: 'clicks', label: 'Cliques',    color: predColors[1], type: 'line', yAxisId: 'right' },
                      { key: 'ctr',    label: 'CTR %',      color: predColors[2], type: 'line', yAxisId: 'right' },
                      { key: 'cpc',    label: 'CPC (R$)',   color: predColors[3], type: 'line', yAxisId: 'right' },
                    ]} />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className={`rounded-2xl p-6 ${cardBase}`}>
                  <h3 className={`text-sm font-black mb-4 ${tx}`}>CPL Timeline</h3>
                  <MultiMetricChart isDark={isDark} data={cplData} metrics={[
                    { key: 'spend', label: 'Gasto (R$)', color: predColors[0], type: 'area' },
                    { key: 'leads', label: 'Leads',      color: predColors[1], type: 'bar', yAxisId: 'right' },
                    { key: 'cpl',   label: 'CPL (R$)',   color: predColors[2], type: 'line' },
                  ]} />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className={`rounded-2xl p-6 ${cardBase}`}>
                  <h3 className={`text-sm font-black mb-4 ${tx}`}>Funil de Conversão</h3>
                  <FunnelChart data={data.funnelData} isDark={isDark} />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className={`rounded-2xl p-6 ${cardBase}`}>
                  <h3 className={`text-sm font-black mb-4 ${tx}`}>Distribuição por Campanha</h3>
                  {campaignSpendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie data={campaignSpendData} dataKey="value" nameKey="name"
                          cx="50%" cy="50%" outerRadius={100} innerRadius={42}
                          paddingAngle={3}
                          label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                          labelLine={false}>
                          {campaignSpendData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip {...tooltipCss} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className={`text-sm text-center py-12 ${txMuted}`}>Sem dados de campanhas</p>
                  )}
                </motion.div>
              </div>
            </RetrovisorSection>

            {/* ══════════════════════════════════════════════════════════════
                FAROL DE MILHA — Projeções & Tendências
            ══════════════════════════════════════════════════════════════ */}
            {predictions && !predictions.insufficientData && (
              <FarolSection isDark={isDark}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {([
                    { label: 'Gasto Diário (R$)', color: predColors[0], hist: predictions.historical.spend,  pred: predictions.spend,  fmt: (v: number) => `R$${v.toFixed(0)}` },
                    { label: 'Leads Diários',     color: predColors[1], hist: predictions.historical.leads,  pred: predictions.leads,  fmt: (v: number) => v.toFixed(0) },
                    { label: 'CTR (%)',           color: predColors[2], hist: predictions.historical.ctr,    pred: predictions.ctr,    fmt: (v: number) => `${v.toFixed(2)}%` },
                    { label: 'CPC (R$)',          color: predColors[3], hist: predictions.historical.cpc,    pred: predictions.cpc,    fmt: (v: number) => `R$${v.toFixed(2)}` },
                  ] as const).map((p, i) => (
                    <motion.div key={p.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                      className={`rounded-2xl p-6 ${cardBase}`}>
                      <PredictionChart isDark={isDark} label={p.label} color={p.color}
                        historical={predictions.historical.dates.map((dt, j) => ({ date: dt, value: (p.hist as number[])[j] }))}
                        predictions={p.pred as any} formatter={p.fmt as any} />
                    </motion.div>
                  ))}
                </div>
              </FarolSection>
            )}

            {/* ── Briefing Estratégico AI ──────────────────────────────────── */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${isDark ? 'bg-violet-500/10' : 'bg-violet-50'}`}>
                    <SparklesIcon className={`h-5 w-5 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-black ${tx}`}>Briefing Estratégico AI</h2>
                    <p className={`text-xs ${txMuted}`}>Gerado por LLM com fallback rule-based</p>
                  </div>
                </div>
                <div className="flex gap-2">
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
                        : <><SparklesIcon className="h-3.5 w-3.5" /> Gerar Novo</>}
                    </button>
                  </ExecuteGuard>
                </div>
              </div>
              {briefing
                ? <BriefingCard briefing={briefing} isDark={isDark} />
                : (
                  <div className={`rounded-2xl p-10 text-center ${cardBase}`}>
                    <p className={`text-sm font-black mb-1 ${tx}`}>Nenhum briefing gerado ainda</p>
                    <p className={`text-xs ${txMuted}`}>Clique em "Gerar Novo" ou aguarde o envio automático (08h e 18h).</p>
                  </div>
                )}
              {showBriefingHistory && briefingHistory.length > 1 && (
                <div className="mt-4 space-y-3">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${txFaint}`}>Histórico</p>
                  {briefingHistory.filter(b => b.id !== briefing?.id).map(b => (
                    <BriefingCard key={b.id} briefing={b} isDark={isDark} compact />
                  ))}
                </div>
              )}
            </div>

            {/* ── AI Insights ─────────────────────────────────────────────── */}
            {aiInsights.length > 0 && (
              <div className="mb-8">
                <div className="mb-5">
                  <h2 className={`text-lg font-black ${tx}`}>Insights da IA</h2>
                  <p className={`text-xs mt-0.5 ${txMuted}`}>Análise automática de CTR, CPC, frequência e CPL — sem dependência de LLM</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiInsights.map((insight, i) => {
                    type IS = { border: string; badge: string; dot: string; glow: string };
                    const ds: Record<string, IS> = {
                      PAUSE:    { border: 'border-l-red-500',    badge: 'bg-red-500/10 text-red-400 border border-red-500/20',        dot: 'bg-red-500',    glow: 'shadow-[0_0_24px_rgba(239,68,68,0.07)]'    },
                      SCALE:    { border: 'border-l-emerald-500',badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',dot:'bg-emerald-500',glow:'shadow-[0_0_24px_rgba(16,185,129,0.07)]' },
                      OPTIMIZE: { border: 'border-l-amber-500',  badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',   dot: 'bg-amber-500',  glow: 'shadow-[0_0_24px_rgba(245,158,11,0.07)]'  },
                      ALERT:    { border: 'border-l-orange-500', badge: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', dot: 'bg-orange-500', glow: 'shadow-[0_0_24px_rgba(249,115,22,0.07)]'  },
                    };
                    const ls: Record<string, IS> = {
                      PAUSE:    { border: 'border-l-red-500',    badge: 'bg-red-50 text-red-600 border border-red-100',             dot: 'bg-red-500',    glow: '' },
                      SCALE:    { border: 'border-l-emerald-500',badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100', dot: 'bg-emerald-500',glow: '' },
                      OPTIMIZE: { border: 'border-l-amber-500',  badge: 'bg-amber-50 text-amber-700 border border-amber-100',       dot: 'bg-amber-500',  glow: '' },
                      ALERT:    { border: 'border-l-orange-500', badge: 'bg-orange-50 text-orange-700 border border-orange-100',    dot: 'bg-orange-500', glow: '' },
                    };
                    const styles = isDark ? ds : ls;
                    const s = styles[insight.type] || styles.ALERT;
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
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
                  })}
                </div>
              </div>
            )}

            {/* ── Campaigns Table ─────────────────────────────────────────── */}
            <div className={`rounded-2xl overflow-hidden ${cardBase}`}>
              <div className={`px-6 py-4 border-b ${divider}`}>
                <h3 className={`text-sm font-black ${tx}`}>Campanhas</h3>
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
      </div>
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
//  SECTION WRAPPERS — Retrovisão & Farol de Milha
// ═════════════════════════════════════════════════════════════════════════════

function RetrovisorSection({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(
      'rounded-3xl p-6 mb-8 border',
      isDark
        ? 'border-[rgba(251,191,36,0.13)] shadow-[0_0_60px_rgba(251,191,36,0.03),inset_0_1px_0_rgba(251,191,36,0.06)] bg-[rgba(13,11,8,0.55)] backdrop-blur-sm'
        : 'border-amber-200/50 bg-gradient-to-br from-amber-50/50 to-white shadow-[0_4px_24px_rgba(245,158,11,0.05)]',
    )}>
      <div className="flex items-center gap-4 mb-6">
        <RetrovisorIcon isDark={isDark} />
        <div>
          <p className={`text-[9px] font-black uppercase tracking-[0.35em] mb-0.5 ${isDark ? 'text-amber-700' : 'text-amber-500'}`}>
            Retrovisor
          </p>
          <h2 className={`text-base font-black leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Performance Histórica
          </h2>
          <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            Dados reais do período selecionado
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

function FarolSection({ isDark, children }: { isDark: boolean; children: React.ReactNode }) {
  return (
    <div className={cn(
      'rounded-3xl p-6 mb-8 border',
      isDark
        ? 'border-[rgba(34,211,238,0.13)] shadow-[0_0_60px_rgba(34,211,238,0.03),inset_0_1px_0_rgba(34,211,238,0.06)] bg-[rgba(7,13,20,0.55)] backdrop-blur-sm'
        : 'border-sky-200/50 bg-gradient-to-br from-sky-50/50 to-white shadow-[0_4px_24px_rgba(14,165,233,0.05)]',
    )}>
      <div className="flex items-center gap-4 mb-6">
        <FarolIcon isDark={isDark} />
        <div>
          <p className={`text-[9px] font-black uppercase tracking-[0.35em] mb-0.5 ${isDark ? 'text-cyan-700' : 'text-sky-500'}`}>
            Farol de Milha
          </p>
          <h2 className={`text-base font-black leading-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            Projeções & Tendências
          </h2>
          <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            Regressão linear — banda de confiança hachureada
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
//  SVG ICONS
// ═════════════════════════════════════════════════════════════════════════════

function RetrovisorIcon({ isDark }: { isDark: boolean }) {
  const s  = isDark ? '#22d3ee' : '#0891b2';                            // cyan stroke
  const f  = isDark ? 'rgba(34,211,238,0.10)' : 'rgba(8,145,178,0.07)'; // mirror fill
  const g  = isDark ? 'rgba(34,211,238,0.15)' : 'rgba(8,145,178,0.08)'; // halo
  const rf = isDark ? 'rgba(34,211,238,0.09)' : 'rgba(8,145,178,0.07)'; // road fill
  return (
    <svg width="56" height="52" viewBox="0 0 56 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Clip road elements to inside the glass area */}
        <clipPath id="retrovisor-glass">
          <rect x="6" y="21" width="44" height="16" rx="4.5" />
        </clipPath>
      </defs>

      {/* Halo behind mirror body */}
      <rect x="0" y="14" width="56" height="28" rx="9" fill={g} />

      {/* ── Mirror frame — wide modern rectangular shape ── */}
      <rect x="2" y="17" width="52" height="24" rx="7" stroke={s} strokeWidth="2.2" fill={f} />

      {/* Inner glass bezel */}
      <rect x="5.5" y="20.5" width="45" height="17" rx="5" stroke={s} strokeWidth="0.8" strokeOpacity="0.3" fill="none" />

      {/* ─── Sinuous road receding into the distance ─── */}
      {/* Road surface fill (between left and right S-curve edges) */}
      <path
        d="M 21 37 C 16 32, 27 28, 24 24 C 22 21.5, 26 21, 28 21
           C 30 21, 34 21.5, 32 24 C 29 28, 40 32, 35 37 Z"
        fill={rf}
        clipPath="url(#retrovisor-glass)"
      />
      {/* Left road edge — S-curve to vanishing point */}
      <path
        d="M 21 37 C 16 32, 27 28, 24 24 C 22 21.5, 26 21, 28 21"
        stroke={s} strokeWidth="0.9" strokeOpacity="0.50" fill="none"
        clipPath="url(#retrovisor-glass)"
      />
      {/* Right road edge — mirrored S-curve */}
      <path
        d="M 35 37 C 40 32, 29 28, 32 24 C 34 21.5, 30 21, 28 21"
        stroke={s} strokeWidth="0.9" strokeOpacity="0.50" fill="none"
        clipPath="url(#retrovisor-glass)"
      />
      {/* Center dashes — sinuous, follow road centerline */}
      <path
        d="M 28 22 C 28 23.5, 27 25.5, 26.5 27.5 C 26 29.5, 27.5 32, 28 35"
        stroke={s} strokeWidth="0.7" strokeOpacity="0.32"
        strokeDasharray="1.8 2.4" fill="none"
        clipPath="url(#retrovisor-glass)"
      />

      {/* Convex-glass reflection shimmer */}
      <path d="M 10 26 Q 28 22.5 46 26" stroke={s} strokeWidth="1" strokeOpacity="0.18" fill="none" />
      {/* Glare patch — upper-left corner */}
      <rect x="8" y="22" width="10" height="5" rx="2" fill={s} fillOpacity="0.13" transform="skewX(-8)" clipPath="url(#retrovisor-glass)" />

      {/* ── Mounting arm ── */}
      <line x1="28" y1="17" x2="28" y2="8" stroke={s} strokeWidth="2.5" strokeLinecap="round" />
      {/* Ball joint housing */}
      <circle cx="28" cy="6" r="4.5" stroke={s} strokeWidth="1.5" fill={f} />
      {/* Ball joint core */}
      <circle cx="28" cy="6" r="2" fill={s} fillOpacity="0.70" />
    </svg>
  );
}

function FarolIcon({ isDark }: { isDark: boolean }) {
  const s = isDark ? '#22d3ee' : '#0891b2';
  const f = isDark ? 'rgba(34,211,238,0.10)' : 'rgba(8,145,178,0.07)';
  const b = isDark ? 'rgba(34,211,238,0.05)' : 'rgba(8,145,178,0.04)';
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="26" r="12" fill={f} />
      <circle cx="14" cy="26" r="8"  stroke={s} strokeWidth="1.5" fill="none" strokeOpacity="0.45" />
      <circle cx="14" cy="26" r="5"  stroke={s} strokeWidth="1.5" fill={f} />
      <circle cx="14" cy="26" r="2.5" fill={s} fillOpacity="0.8" />
      <path d="M20 22 L50 10 L50 42 L20 30 Z" fill={b} />
      <path d="M20 22 L50 10" stroke={s} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.72" />
      <path d="M20 26 L50 26" stroke={s} strokeWidth="2"   strokeLinecap="round" />
      <path d="M20 30 L50 42" stroke={s} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.72" />
      <path d="M10 26 Q14 22 18 26" stroke={s} strokeWidth="1" strokeOpacity="0.35" fill="none" />
    </svg>
  );
}


// ═════════════════════════════════════════════════════════════════════════════
//  KPI CARD
// ═════════════════════════════════════════════════════════════════════════════

function KpiCard({ isDark, label, value, color, delta, invertDelta, tooltip }: {
  isDark: boolean; label: string; value: string; color: string;
  delta?: number; invertDelta?: boolean; tooltip?: string;
}) {
  let deltaColor = isDark ? 'text-slate-600' : 'text-gray-400';
  let deltaIcon  = '';
  let deltaBg    = '';
  if (delta !== undefined && Math.abs(delta) > 0.5) {
    const isPositive = delta > 0;
    const isGood     = invertDelta ? !isPositive : isPositive;
    deltaColor = isGood ? (isDark ? 'text-emerald-400' : 'text-emerald-700') : (isDark ? 'text-red-400' : 'text-red-600');
    deltaBg    = isGood ? (isDark ? 'bg-emerald-500/10' : 'bg-emerald-50') : (isDark ? 'bg-red-500/10' : 'bg-red-50');
    deltaIcon  = isPositive ? '↑' : '↓';
  }
  return (
    <div title={tooltip} className={cn(
      'group rounded-2xl border p-3.5 flex flex-col gap-1.5 min-w-0 overflow-hidden transition-all duration-200 cursor-default',
      isDark
        ? 'bg-[rgba(255,255,255,0.025)] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgba(99,102,241,0.4)] hover:shadow-[0_0_24px_rgba(99,102,241,0.12)] hover:-translate-y-0.5'
        : 'bg-white border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.09)] hover:-translate-y-0.5'
    )}>
      <span className={`text-[9px] font-black uppercase tracking-widest leading-none truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </span>
      <span className={cn('text-sm font-black font-mono leading-tight truncate', color)}>
        {value}
      </span>
      {delta !== undefined && (
        <span className={cn(
          'self-start text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none',
          deltaColor,
          deltaBg || (isDark ? 'bg-[rgba(255,255,255,0.06)] text-slate-500' : 'bg-slate-100 text-slate-400'),
        )}>
          {deltaIcon}{deltaIcon ? ' ' : ''}{Math.abs(delta).toFixed(1)}%
        </span>
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

  const cardCls = isDark
    ? 'bg-[rgba(13,20,33,0.92)] backdrop-blur-sm border border-[rgba(255,255,255,0.07)] shadow-[0_2px_16px_rgba(0,0,0,0.5)]'
    : 'bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)]';
  const tx      = isDark ? 'text-slate-100' : 'text-slate-900';
  const txMuted = isDark ? 'text-slate-500' : 'text-slate-500';
  const txFaint = isDark ? 'text-slate-600' : 'text-slate-400';
  const badge   = isDark
    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
    : 'bg-violet-50 text-violet-700 border border-violet-100';

  return (
    <div className={cn(`rounded-2xl p-5 ${cardCls}`, compact && 'opacity-70')}>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${badge}`}>{typeLabel}</span>
        <span className={`text-xs ${txFaint}`}>{date}</span>
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
