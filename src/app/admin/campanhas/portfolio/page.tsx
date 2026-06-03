'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BriefcaseIcon, ArrowPathIcon, SparklesIcon,
  ChevronUpIcon, ChevronDownIcon, FunnelIcon,
  ArrowTrendingDownIcon, ExclamationTriangleIcon, CheckCircleIcon,
  ArrowRightIcon, UsersIcon, BanknotesIcon, CursorArrowRaysIcon,
} from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import { formatCurrency, formatNumber } from '@/lib/marketing-utils';
import type { PortfolioResponse, PortfolioClient } from '@/app/api/admin/campanhas/portfolio/route';

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
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
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

/* ── main ─────────────────────────────────────────────────────────── */

export default function PortfolioPage() {
  const [data,    setData]    = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [period,     setPeriod]     = useState('30');
  const [segFilter,  setSegFilter]  = useState('');
  const [sortField,  setSortField]  = useState<SortField>('spend');
  const [sortDir,    setSortDir]    = useState<SortDir>('desc');

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
        {data && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard
              icon={<UsersIcon className="h-6 w-6 text-indigo-600" />}
              label="Clientes ativos"
              value={String(data.totalClients)}
              sub={`no período de ${period} dias`}
              color="bg-indigo-50"
            />
            <SummaryCard
              icon={<BanknotesIcon className="h-6 w-6 text-emerald-600" />}
              label="Investimento total"
              value={formatCurrency(data.totalSpend)}
              sub="soma do portfólio"
              color="bg-emerald-50"
            />
            <SummaryCard
              icon={<CursorArrowRaysIcon className="h-6 w-6 text-sky-600" />}
              label="Total de leads"
              value={formatNumber(data.totalLeads)}
              sub="captados no período"
              color="bg-sky-50"
            />
            <SummaryCard
              icon={<ArrowTrendingDownIcon className="h-6 w-6 text-violet-600" />}
              label="CPL médio"
              value={data.avgCpl !== null ? formatCurrency(data.avgCpl) : '—'}
              sub="custo por lead médio"
              color="bg-violet-50"
            />
          </div>
        )}

        {/* ── tabela ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* status bar */}
          {data && (
            <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 flex-wrap">
              {(['ok', 'warn', 'critical', 'nodata'] as const).map(s => {
                const count = data.clients.filter(c => c.status === s).length;
                if (count === 0) return null;
                const labels = { ok: '🟢 Saudável', warn: '🟡 Atenção', critical: '🔴 Crítico', nodata: '⚪ Sem dados' };
                return <span key={s}><b>{count}</b> {labels[s]}</span>;
              })}
              <span className="ml-auto">⚠ Status usa benchmark de cada segmento — não compare CPL entre segmentos</span>
            </div>
          )}

          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="p-16 text-center">
              <BriefcaseIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Nenhum cliente com campanhas no período</p>
              <p className="text-gray-400 text-sm mt-1">Lance campanhas para clientes para visualizar o portfolio</p>
            </div>
          ) : (
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
                <AnimatePresence>
                  {sorted.map((client, i) => (
                    <motion.tr
                      key={client.clientId ?? 'own'}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                    >
                      {/* cliente */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-lg shrink-0">
                            {segIcon(client.segment?.slug)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{client.clientName}</p>
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

                      {/* link */}
                      <td className="px-4 py-4 text-right">
                        <a
                          href={`/admin/campanhas/dashboard${client.clientId ? `?clientId=${client.clientId}` : ''}`}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 justify-end"
                        >
                          Ver campanha
                          <ArrowRightIcon className="h-3 w-3" />
                        </a>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        {/* ── rodapé ─────────────────────────────────────────────────── */}
        {data && (
          <p className="text-center text-xs text-gray-400 mt-6">
            Portfolio atualizado agora · {period} dias · {data.totalClients} cliente{data.totalClients !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
