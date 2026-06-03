'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BriefcaseIcon, ArrowPathIcon, SparklesIcon,
  ChevronUpIcon, ChevronDownIcon, FunnelIcon,
  ArrowTrendingDownIcon, ExclamationTriangleIcon, CheckCircleIcon,
  ArrowRightIcon, UsersIcon, BanknotesIcon, CursorArrowRaysIcon,
  ChartBarIcon, XMarkIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import { formatCurrency, formatNumber } from '@/lib/marketing-utils';
import type { PortfolioResponse, PortfolioClient, PortfolioClientCampaign } from '@/app/api/admin/campanhas/portfolio/route';
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector';
import ClientAvatar from '@/components/admin/ClientAvatar';

/* ── helpers ──────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: PortfolioClient['status'] }) {
  const cfg = {
    ok:       { label: 'Saudável',  bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    warn:     { label: 'Atenção',   bg: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500' },
    critical: { label: 'Crítico',   bg: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500' },
    nodata:   { label: 'Sem dados', bg: 'bg-gray-100 text-gray-500 border-gray-200',          dot: 'bg-gray-400' },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function HealthDot({ health }: { health: PortfolioClientCampaign['health'] }) {
  const color = {
    ok:       'bg-emerald-500',
    warn:     'bg-amber-400',
    critical: 'bg-red-500',
    nodata:   'bg-gray-300',
  }[health];
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function CplBar({ cpl, cplIdeal, cplCritical }: {
  cpl: number | null; cplIdeal: number | null; cplCritical: number | null;
}) {
  if (cpl === null || cplCritical === null) return <span className="text-gray-400 text-xs">—</span>;
  const max    = cplCritical * 1.3;
  const pct    = Math.min((cpl / max) * 100, 100);
  const color  = cpl >= cplCritical ? 'bg-red-500'
               : cplIdeal && cpl > cplIdeal ? 'bg-amber-400'
               : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <span className="text-xs font-semibold text-gray-700 w-16 text-right">{formatCurrency(cpl)}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const SEGMENT_ICONS: Record<string, string> = {
  imobiliaria: '🏠', imobiliario: '🏠', real_estate: '🏠',
  saude: '🏥', health: '🏥',
  carros: '🚗', automotivo: '🚗', cars: '🚗',
  educacao: '🎓', education: '🎓',
  ecommerce: '🛒',
  geral: '📊', general: '📊',
};

function segIcon(slug?: string | null): string {
  if (!slug) return '📊';
  return SEGMENT_ICONS[slug.toLowerCase()] ?? '📊';
}

type SortField = 'clientName' | 'spend' | 'leads' | 'cpl' | 'status';
type SortDir   = 'asc' | 'desc';

/* ── summary card ─────────────────────────────────────────────────── */

function SummaryCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string | React.ReactNode; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
      </div>
    </motion.div>
  );
}

/* ── campaign analytics modal ─────────────────────────────────────── */

interface ModalState {
  campaign: PortfolioClientCampaign;
  clientName: string;
  benchmarks: PortfolioClient['benchmarks'];
}

function CampaignAnalyticsModal({ state, onClose }: { state: ModalState; onClose: () => void }) {
  const { campaign, clientName, benchmarks } = state;
  const m = campaign.metrics;

  const metricCards = [
    { label: 'Investimento',  value: formatCurrency(m.spend),                              icon: '💰', color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Leads',         value: String(m.leads),                                       icon: '📩', color: 'bg-sky-50 text-sky-700' },
    { label: 'CPL',           value: m.cpl !== null ? formatCurrency(m.cpl) : '—',          icon: '🎯', color: 'bg-violet-50 text-violet-700' },
    { label: 'Impressões',    value: formatNumber(m.impressions),                           icon: '👁️', color: 'bg-amber-50 text-amber-700' },
    { label: 'Cliques',       value: formatNumber(m.clicks),                               icon: '🖱️', color: 'bg-emerald-50 text-emerald-700' },
    { label: 'CTR',           value: m.ctr !== null ? `${m.ctr.toFixed(2)}%` : '—',        icon: '📈', color: 'bg-rose-50 text-rose-700' },
  ];

  const statusColor = {
    ok:       'text-emerald-600',
    warn:     'text-amber-600',
    critical: 'text-red-600',
    nodata:   'text-gray-400',
  }[campaign.health];

  const statusLabel = {
    ok: 'Saudável', warn: 'Atenção', critical: 'Crítico', nodata: 'Sem dados',
  }[campaign.health];

  const campaignStatusColor: Record<string, string> = {
    ACTIVE:  'bg-emerald-100 text-emerald-700',
    PAUSED:  'bg-amber-100 text-amber-700',
    DELETED: 'bg-red-100 text-red-700',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-gray-900 leading-tight">{campaign.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${campaignStatusColor[campaign.externalStatus] ?? 'bg-gray-100 text-gray-500'}`}>
                {campaign.externalStatus}
              </span>
            </div>
            <p className="text-xs text-gray-500">Cliente: {clientName}</p>
            {benchmarks.cplIdeal !== null && m.cpl !== null && (
              <p className={`text-xs mt-0.5 font-semibold ${statusColor}`}>
                {statusLabel} · Meta CPL: {formatCurrency(benchmarks.cplIdeal)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* metrics grid */}
        <div className="grid grid-cols-3 gap-3 p-5">
          {metricCards.map(card => (
            <div key={card.label} className={`rounded-xl p-3.5 ${card.color}`}>
              <p className="text-lg mb-1">{card.icon}</p>
              <p className="text-xs font-medium opacity-70 mb-0.5">{card.label}</p>
              <p className="text-base font-bold">{card.value}</p>
            </div>
          ))}
        </div>

        {/* CPL bar if benchmarks exist */}
        {benchmarks.cplIdeal !== null && m.cpl !== null && (
          <div className="px-5 pb-4">
            <p className="text-xs text-gray-500 mb-1.5 font-medium">CPL vs benchmark do segmento</p>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-800 w-20 text-right">{formatCurrency(m.cpl)}</span>
              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                {(() => {
                  const max = (benchmarks.cplCritical ?? benchmarks.cplIdeal! * 2) * 1.2;
                  const pct = Math.min((m.cpl / max) * 100, 100);
                  const barColor = benchmarks.cplCritical && m.cpl >= benchmarks.cplCritical ? 'bg-red-500'
                                 : m.cpl > benchmarks.cplIdeal! ? 'bg-amber-400'
                                 : 'bg-emerald-500';
                  return <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />;
                })()}
              </div>
              <span className="text-xs text-gray-400 w-20">Meta: {formatCurrency(benchmarks.cplIdeal)}</span>
            </div>
          </div>
        )}

        {/* footer */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-[11px] text-gray-400">ID: {campaign.id.slice(0, 8)}…</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ── main ─────────────────────────────────────────────────────────── */

export default function PortfolioPage() {
  const [data,    setData]    = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [period,     setPeriod]     = useState('30');
  const [segFilter,  setSegFilter]  = useState('');
  const [sortField,  setSortField]  = useState<SortField>('spend');
  const [sortDir,    setSortDir]    = useState<SortDir>('desc');

  // client selector — padrão 'all' para portfolio (visão consolidada)
  const { clients: selectorClients, loading: clientsLoading, clientFilter, setClientFilter } =
    useClientSelector('portfolio');
  useEffect(() => { setClientFilter('all'); }, []);  // override do padrão 'own' do hook

  // expandable rows state
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  // analytics modal
  const [analyticsModal, setAnalyticsModal] = useState<ModalState | null>(null);

  const toggleExpand = (key: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period });
      if (segFilter) params.set('segmentId', segFilter);
      const res  = await adminFetch(`/api/admin/campanhas/portfolio?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar portfolio');
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period, segFilter]);

  useEffect(() => { load(); }, [load]);

  /* ── sort ──────────────────────────────────────────────────────── */

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const sorted = [...(data?.clients ?? [])].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    if (sortField === 'clientName') return mul * a.clientName.localeCompare(b.clientName);
    if (sortField === 'spend') return mul * (a.metrics.spend - b.metrics.spend);
    if (sortField === 'leads') return mul * (a.metrics.leads - b.metrics.leads);
    if (sortField === 'cpl')   return mul * ((a.metrics.cpl ?? 9999) - (b.metrics.cpl ?? 9999));
    if (sortField === 'status') {
      const ORDER = { critical: 0, warn: 1, ok: 2, nodata: 3 };
      return mul * (ORDER[a.status] - ORDER[b.status]);
    }
    return 0;
  });

  /* ── filtro de cliente ─────────────────────────────────────────── */

  const filtered = sorted.filter(c => {
    if (clientFilter === 'all') return true;
    if (clientFilter === 'own') return c.clientId === null;
    return c.clientId === clientFilter;
  });

  /* ── segmentos únicos para filtro ──────────────────────────────── */

  const segments = [...new Map(
    data?.clients.filter(c => c.segment).map(c => [c.segment!.id, c.segment!]) ?? []
  ).values()];

  /* ── helpers de header de coluna ──────────────────────────────── */

  function ColHeader({ field, label }: { field: SortField; label: string }) {
    const active = sortField === field;
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700"
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {active ? (
            sortDir === 'desc' ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronUpIcon className="h-3 w-3" />
          ) : (
            <span className="h-3 w-3 opacity-0">↕</span>
          )}
        </span>
      </th>
    );
  }

  /* ── render ────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* analytics modal */}
      <AnimatePresence>
        {analyticsModal && (
          <CampaignAnalyticsModal state={analyticsModal} onClose={() => setAnalyticsModal(null)} />
        )}
      </AnimatePresence>

      {/* ── header ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <BriefcaseIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
              <p className="text-sm text-gray-500">Visão consolidada de todos os clientes</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Filtro segmento */}
            {segments.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2">
                <FunnelIcon className="h-4 w-4 text-gray-400" />
                <select
                  value={segFilter}
                  onChange={e => setSegFilter(e.target.value)}
                  className="text-sm text-gray-700 outline-none bg-transparent"
                >
                  <option value="">Todos os segmentos</option>
                  {segments.map(s => (
                    <option key={s.id} value={s.id}>{segIcon(s.slug)} {s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Seletor de cliente */}
            <ClientSelector
              value={clientFilter}
              onChange={setClientFilter}
              clients={selectorClients}
              loading={clientsLoading}
              storageKey="portfolio"
            />

            {/* Período */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-2">
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="text-sm text-gray-700 outline-none bg-transparent"
              >
                <option value="7">7 dias</option>
                <option value="14">14 dias</option>
                <option value="30">30 dias</option>
                <option value="60">60 dias</option>
                <option value="90">90 dias</option>
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
              Atualizar
            </button>

            {/* Cross-insights */}
            <a
              href="/admin/campanhas/portfolio/cross-insights"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 rounded-xl text-sm text-white hover:bg-indigo-700 transition"
            >
              <SparklesIcon className="h-4 w-4" />
              Insights Cruzados
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* ── erro ───────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            {error}
            <button onClick={load} className="ml-auto underline font-medium">Tentar novamente</button>
          </div>
        )}

        {/* ── summary cards ──────────────────────────────────────────── */}
        {data && (() => {
          const ownRow      = filtered.find(c => c.clientId === null);
          const clientRows  = filtered.filter(c => c.clientId !== null);
          const clientSpend = clientRows.reduce((s, c) => s + c.metrics.spend, 0);
          const clientLeads = clientRows.reduce((s, c) => s + c.metrics.leads, 0);
          const clientCpl   = clientLeads > 0 ? clientSpend / clientLeads : null;
          return (
            <div className="space-y-3 mb-8">
              {/* Minha Empresa */}
              {ownRow && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 mb-2 px-1">
                    🏢 Minha Empresa
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <SummaryCard
                      icon={<BanknotesIcon className="h-5 w-5 text-indigo-600" />}
                      label="Investimento próprio"
                      value={formatCurrency(ownRow.metrics.spend)}
                      sub={`${ownRow.metrics.campaigns} campanha${ownRow.metrics.campaigns !== 1 ? 's' : ''}`}
                      color="bg-indigo-50"
                    />
                    <SummaryCard
                      icon={<CursorArrowRaysIcon className="h-5 w-5 text-indigo-600" />}
                      label="Leads próprios"
                      value={formatNumber(ownRow.metrics.leads)}
                      sub={`CTR ${ownRow.metrics.ctr?.toFixed(2) ?? '—'}%`}
                      color="bg-indigo-50"
                    />
                    <SummaryCard
                      icon={<ArrowTrendingDownIcon className="h-5 w-5 text-indigo-600" />}
                      label="CPL próprio"
                      value={ownRow.metrics.cpl !== null ? formatCurrency(ownRow.metrics.cpl) : '—'}
                      sub={<StatusBadge status={ownRow.status} />}
                      color="bg-indigo-50"
                    />
                  </div>
                </div>
              )}
              {/* Clientes */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2 px-1">
                  👥 Clientes ({clientRows.length})
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <SummaryCard
                    icon={<UsersIcon className="h-6 w-6 text-slate-600" />}
                    label="Clientes ativos"
                    value={String(clientRows.length)}
                    sub={`no período de ${period} dias`}
                    color="bg-slate-50"
                  />
                  <SummaryCard
                    icon={<BanknotesIcon className="h-6 w-6 text-emerald-600" />}
                    label="Investimento clientes"
                    value={formatCurrency(clientSpend)}
                    sub="soma dos clientes"
                    color="bg-emerald-50"
                  />
                  <SummaryCard
                    icon={<CursorArrowRaysIcon className="h-6 w-6 text-sky-600" />}
                    label="Leads de clientes"
                    value={formatNumber(clientLeads)}
                    sub="captados no período"
                    color="bg-sky-50"
                  />
                  <SummaryCard
                    icon={<ArrowTrendingDownIcon className="h-6 w-6 text-violet-600" />}
                    label="CPL médio clientes"
                    value={clientCpl !== null ? formatCurrency(clientCpl) : '—'}
                    sub="custo por lead médio"
                    color="bg-violet-50"
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── tabela ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* status bar */}
          {data && (
            <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 flex-wrap">
              {(['ok', 'warn', 'critical', 'nodata'] as const).map(s => {
                const count = filtered.filter(c => c.status === s).length;
                if (count === 0) return null;
                const labels = { ok: '🟢 Saudável', warn: '🟡 Atenção', critical: '🔴 Crítico', nodata: '⚪ Sem dados' };
                return <span key={s}><b>{count}</b> {labels[s]}</span>;
              })}
              <span className="ml-auto">⚠ CPL compara dentro do mesmo segmento — clique ▶ para ver campanhas</span>
            </div>
          )}

          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <BriefcaseIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Nenhum resultado para este filtro</p>
              <p className="text-gray-400 text-sm mt-1">Tente selecionar outro cliente ou período</p>
            </div>
          ) : (() => {
            const ownRows    = filtered.filter(c => c.clientId === null);
            const clientRows = filtered.filter(c => c.clientId !== null);

            const renderCampaignSubRows = (client: typeof filtered[0]) => {
              const key = client.clientId ?? '__own__';
              if (!expandedClients.has(key)) return null;
              if (client.campaigns.length === 0) {
                return (
                  <tr key={`${key}-empty`} className="bg-slate-50/60">
                    <td colSpan={7} className="px-8 py-3 text-xs text-gray-400 italic">
                      Nenhuma campanha encontrada no período
                    </td>
                  </tr>
                );
              }
              return client.campaigns.map((camp, ci) => (
                <motion.tr
                  key={`${key}-camp-${camp.id}`}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ delay: ci * 0.04 }}
                  className="bg-slate-50/70 border-b border-slate-100 hover:bg-slate-100/70 transition-colors"
                >
                  {/* campaign name — indented under Cliente column */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 pl-8">
                      <HealthDot health={camp.health} />
                      <span className="text-xs font-medium text-gray-700 truncate max-w-[160px]" title={camp.name}>
                        {camp.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        camp.externalStatus === 'ACTIVE'  ? 'bg-emerald-100 text-emerald-700' :
                        camp.externalStatus === 'PAUSED'  ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {camp.externalStatus}
                      </span>
                    </div>
                  </td>

                  {/* segmento — empty (inherited from parent) */}
                  <td className="px-4 py-2.5" />

                  {/* investimento */}
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-semibold text-gray-700">{formatCurrency(camp.metrics.spend)}</span>
                  </td>

                  {/* leads */}
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-semibold text-gray-700">{camp.metrics.leads}</span>
                    {camp.metrics.ctr !== null && (
                      <span className="text-[10px] text-gray-400 ml-1">CTR {camp.metrics.ctr.toFixed(2)}%</span>
                    )}
                  </td>

                  {/* CPL */}
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-semibold text-gray-700">
                      {camp.metrics.cpl !== null ? formatCurrency(camp.metrics.cpl) : '—'}
                    </span>
                  </td>

                  {/* status / health dot */}
                  <td className="px-4 py-2.5" />

                  {/* analytics button */}
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => setAnalyticsModal({ campaign: camp, clientName: client.clientName, benchmarks: client.benchmarks })}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                      title="Ver analytics desta campanha"
                    >
                      <ChartBarIcon className="h-3.5 w-3.5" />
                      Analisar
                    </button>
                  </td>
                </motion.tr>
              ));
            };

            const renderRow = (client: typeof filtered[0], i: number, isOwn: boolean) => {
              const key       = client.clientId ?? '__own__';
              const isExpanded = expandedClients.has(key);
              const hasCamps  = client.campaigns.length > 0;

              return (
                <React.Fragment key={key}>
                  <motion.tr
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${isOwn ? 'bg-indigo-50/30' : ''}`}
                  >
                    {/* cliente + expand toggle */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {/* expand toggle */}
                        <button
                          onClick={() => hasCamps && toggleExpand(key)}
                          className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors shrink-0 ${
                            hasCamps
                              ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer'
                              : 'text-gray-200 cursor-default'
                          }`}
                          title={hasCamps ? (isExpanded ? 'Recolher campanhas' : 'Expandir campanhas') : 'Sem campanhas'}
                        >
                          {isExpanded
                            ? <ChevronDownIcon className="h-4 w-4" />
                            : <ChevronRightIcon className="h-4 w-4" />
                          }
                        </button>
                        <ClientAvatar
                          name={client.clientName}
                          logoUrl={client.logoUrl}
                          isTenant={isOwn}
                          segmentSlug={client.segment?.slug}
                          size="md"
                        />
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {client.clientName}
                            {isOwn && <span className="ml-1.5 text-[10px] text-indigo-500 font-bold uppercase tracking-wide">próprio</span>}
                          </p>
                          {client.metrics.campaigns > 0 && (
                            <p className="text-xs text-gray-400">{client.metrics.campaigns} campanha{client.metrics.campaigns !== 1 ? 's' : ''}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* segmento */}
                    <td className="px-4 py-4">
                      {client.segment ? (
                        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                          {client.segment.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* investimento */}
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{formatCurrency(client.metrics.spend)}</p>
                        {client.metrics.impressions > 0 && (
                          <p className="text-xs text-gray-400">{formatNumber(client.metrics.impressions)} impr.</p>
                        )}
                      </div>
                    </td>

                    {/* leads */}
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900 text-sm">{formatNumber(client.metrics.leads)}</p>
                      {client.metrics.ctr !== null && (
                        <p className="text-xs text-gray-400">CTR {client.metrics.ctr.toFixed(2)}%</p>
                      )}
                    </td>

                    {/* CPL vs Meta */}
                    <td className="px-4 py-4">
                      <CplBar
                        cpl={client.metrics.cpl}
                        cplIdeal={client.benchmarks.cplIdeal}
                        cplCritical={client.benchmarks.cplCritical}
                      />
                      {client.benchmarks.cplIdeal !== null && (
                        <p className="text-[10px] text-gray-400 mt-0.5">Meta: {formatCurrency(client.benchmarks.cplIdeal)}</p>
                      )}
                    </td>

                    {/* status */}
                    <td className="px-4 py-4">
                      <StatusBadge status={client.status} />
                    </td>

                    {/* ações (sem link externo — contexto de período distinto) */}
                    <td className="px-4 py-4" />
                  </motion.tr>

                  {/* sub-rows (AnimatePresence for exit animation) */}
                  <AnimatePresence>
                    {isExpanded && renderCampaignSubRows(client)}
                  </AnimatePresence>
                </React.Fragment>
              );
            };

            return (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <ColHeader field="clientName" label="Cliente" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Segmento</th>
                    <ColHeader field="spend"  label="Investimento" />
                    <ColHeader field="leads"  label="Leads" />
                    <ColHeader field="cpl"    label="CPL vs Meta" />
                    <ColHeader field="status" label="Status" />
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {/* Minha Empresa */}
                  {ownRows.map((c, i) => renderRow(c, i, true))}

                  {/* Separador */}
                  {ownRows.length > 0 && clientRows.length > 0 && (
                    <tr key="__divider__">
                      <td colSpan={7} className="px-4 py-2 bg-gray-50 border-y border-gray-200">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          👥 Clientes ({clientRows.length})
                        </span>
                      </td>
                    </tr>
                  )}

                  {/* Clientes */}
                  {clientRows.map((c, i) => renderRow(c, i + ownRows.length, false))}
                </tbody>
              </table>
            );
          })()}
        </div>

        {/* ── rodapé ─────────────────────────────────────────────────── */}
        {data && (
          <p className="text-center text-xs text-gray-400 mt-6">
            Portfolio atualizado agora · {period} dias · {filtered.filter(c => c.clientId !== null).length} cliente{filtered.filter(c => c.clientId !== null).length !== 1 ? 's' : ''}{clientFilter !== 'all' ? ' (filtrado)' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
