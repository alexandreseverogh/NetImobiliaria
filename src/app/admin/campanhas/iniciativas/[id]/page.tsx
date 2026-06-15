"use client";
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency, formatNumber } from '@/lib/marketing-utils';
import {
  ArrowLeftIcon, SparklesIcon, ArrowPathIcon, TrashIcon,
  ChevronRightIcon, CheckCircleIcon, PauseCircleIcon, PlayCircleIcon,
} from '@heroicons/react/24/outline';
import { UpdateGuard, DeleteGuard } from '@/components/admin/PermissionGuard';

type Status = 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  metaCampaignId: string | null;
  createdAt: string;
}

interface Metrics {
  totalImpressions: number;
  totalClicks:      number;
  totalSpend:       number;
  totalConversions: number;
  totalReach:       number;
  avgCtr:           number;
  avgCpc:           number;
  avgCpm:           number;
  totalLeads:       number;
}

interface Initiative {
  id: string;
  name: string;
  description: string | null;
  goalDescription: string | null;
  totalBudgetPlanned: string | null;
  startDate: string | null;
  endDate:   string | null;
  status:    Status;
  primaryKpi:       string | null;
  primaryKpiTarget: string | null;
  campaigns: Campaign[];
  metrics:   Metrics;
}

const STATUS_LABELS: Record<Status, string> = {
  PLANNED:   'Planejada',
  ACTIVE:    'Ativa',
  PAUSED:    'Pausada',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const STATUS_STYLES: Record<Status, string> = {
  PLANNED:   'bg-blue-50 text-blue-700 border border-blue-100',
  ACTIVE:    'bg-emerald-50 text-emerald-700 border border-emerald-100',
  PAUSED:    'bg-amber-50 text-amber-700 border border-amber-100',
  COMPLETED: 'bg-violet-50 text-violet-700 border border-violet-100',
  CANCELLED: 'bg-red-50 text-red-600 border border-red-100',
};

const STATUS_DOT: Record<Status, string> = {
  PLANNED:   'bg-blue-500',
  ACTIVE:    'bg-emerald-500',
  PAUSED:    'bg-amber-500',
  COMPLETED: 'bg-violet-500',
  CANCELLED: 'bg-red-500',
};

const STATUS_NEXT: Partial<Record<Status, Status>> = {
  PLANNED: 'ACTIVE',
  ACTIVE:  'PAUSED',
  PAUSED:  'ACTIVE',
};

export default function IniciativaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [data, setData]               = useState<Initiative | null>(null);
  const [loading, setLoading]         = useState(true);
  const [briefing, setBriefing]       = useState('');
  const [genBriefing, setGenBriefing] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleting, setDeleting]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/campanhas/iniciativas/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(newStatus: Status) {
    if (!data) return;
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/admin/campanhas/iniciativas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) setData(prev => prev ? { ...prev, status: newStatus } : prev);
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Excluir esta iniciativa? As campanhas serão desvinculadas mas não excluídas.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/campanhas/iniciativas/${id}`, { method: 'DELETE' });
      if (res.ok) router.push('/admin/campanhas/iniciativas');
    } finally {
      setDeleting(false);
    }
  }

  async function handleGenerateBriefing() {
    setGenBriefing(true);
    setBriefing('');
    try {
      const res  = await fetch(`/api/admin/campanhas/iniciativas/${id}/briefing`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBriefing(json.content);
    } catch (err: any) {
      setBriefing(`Erro: ${err.message}`);
    } finally {
      setGenBriefing(false);
    }
  }

  function fmt(d: string | null) {
    return d ? new Date(d).toLocaleDateString('pt-BR') : '—';
  }

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto flex items-center justify-center py-32">
          <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-red-100 shadow-sm p-16 text-center">
          <p className="text-sm font-black text-red-600">Iniciativa não encontrada.</p>
          <Link href="/admin/campanhas/iniciativas"
            className="inline-flex items-center gap-2 mt-4 text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors">
            <ArrowLeftIcon className="h-3.5 w-3.5" /> Voltar para iniciativas
          </Link>
        </div>
      </div>
    );
  }

  const m         = data.metrics;
  const budget    = data.totalBudgetPlanned ? Number(data.totalBudgetPlanned) : null;
  const budgetPct = budget && m.totalSpend ? Math.min(100, (m.totalSpend / budget) * 100) : 0;
  const cpl       = m.totalLeads > 0 ? m.totalSpend / m.totalLeads : null;
  const nextStatus = STATUS_NEXT[data.status];

  // ── Pacing — valor exclusivo da iniciativa: ritmo de gasto vs orçamento planejado ──
  const DAY    = 86400000;
  const startMs = data.startDate ? new Date(data.startDate).getTime() : null;
  const endMs   = data.endDate   ? new Date(data.endDate).getTime()   : null;
  let pacing: {
    daysTotal: number; daysElapsed: number; daysRemaining: number; timePct: number;
    spendRate: number; projectedSpend: number; runwayDays: number | null; overBudget: boolean;
  } | null = null;
  if (budget !== null && startMs && endMs && endMs > startMs) {
    const daysTotal     = Math.max(1, Math.round((endMs - startMs) / DAY));
    const daysElapsed   = Math.max(0, Math.min(daysTotal, Math.round((Date.now() - startMs) / DAY)));
    const daysRemaining = Math.max(0, daysTotal - daysElapsed);
    const timePct       = Math.min(100, (daysElapsed / daysTotal) * 100);
    const spendRate     = daysElapsed > 0 ? m.totalSpend / daysElapsed : 0;
    const projectedSpend = spendRate * daysTotal;
    const runwayDays    = spendRate > 0 ? Math.max(0, (budget - m.totalSpend) / spendRate) : null;
    pacing = { daysTotal, daysElapsed, daysRemaining, timePct, spendRate, projectedSpend, runwayDays, overBudget: projectedSpend > budget };
  }

  // KPI pacing — apenas para KPIs de volume (mapeáveis às métricas consolidadas)
  const KPI_VALUE_MAP: Record<string, number> = {
    Leads:       m.totalLeads,
    Conversões:  m.totalConversions,
    Impressões:  m.totalImpressions,
    Cliques:     m.totalClicks,
  };
  const kpiTarget   = data.primaryKpiTarget ? Number(data.primaryKpiTarget) : null;
  const kpiCurrent  = data.primaryKpi ? KPI_VALUE_MAP[data.primaryKpi] : undefined;
  const kpiProgress = (kpiTarget && kpiTarget > 0 && kpiCurrent !== undefined)
    ? Math.min(100, (kpiCurrent / kpiTarget) * 100)
    : null;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
          <Link href="/admin/campanhas/iniciativas"
            className="hover:text-indigo-600 transition-colors font-bold">
            Iniciativas
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <span className="text-gray-600 truncate max-w-xs">{data.name}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${STATUS_STYLES[data.status]}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[data.status]}`} />
                  {STATUS_LABELS[data.status]}
                </span>
                {data.primaryKpi && (
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                    KPI: {data.primaryKpi}{data.primaryKpiTarget && ` → meta ${data.primaryKpiTarget}`}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">{data.name}</h1>
              {data.goalDescription && (
                <p className="text-sm text-gray-500 mt-1.5 font-medium">{data.goalDescription}</p>
              )}
              {(data.startDate || data.endDate) && (
                <p className="text-xs text-gray-400 mt-1">
                  {fmt(data.startDate)} – {fmt(data.endDate)}
                </p>
              )}
              {data.description && (
                <p className="text-sm text-gray-500 mt-2 leading-relaxed border-t border-gray-50 pt-3">{data.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <UpdateGuard resource="iniciativas-campanhas">
                {nextStatus && (
                  <button onClick={() => handleStatusChange(nextStatus)} disabled={statusSaving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 active:scale-95 disabled:opacity-40 transition-all">
                    {statusSaving
                      ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                      : nextStatus === 'ACTIVE'
                        ? <PlayCircleIcon className="h-3.5 w-3.5" />
                        : <PauseCircleIcon className="h-3.5 w-3.5" />}
                    {STATUS_LABELS[nextStatus]}
                  </button>
                )}
              </UpdateGuard>
              <UpdateGuard resource="iniciativas-campanhas">
                {data.status !== 'COMPLETED' && data.status !== 'CANCELLED' && (
                  <button onClick={() => handleStatusChange('COMPLETED')} disabled={statusSaving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 active:scale-95 disabled:opacity-40 transition-all shadow-lg shadow-emerald-500/20">
                    <CheckCircleIcon className="h-3.5 w-3.5" /> Concluir
                  </button>
                )}
              </UpdateGuard>
              <DeleteGuard resource="iniciativas-campanhas">
                <button onClick={handleDelete} disabled={deleting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-red-100 active:scale-95 disabled:opacity-40 transition-all border border-red-100">
                  <TrashIcon className="h-3.5 w-3.5" />
                  {deleting ? '...' : 'Excluir'}
                </button>
              </DeleteGuard>
            </div>
          </div>

          {/* Budget progress bar */}
          {budget !== null && (
            <div className="mt-5 pt-5 border-t border-gray-50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Budget utilizado</span>
                <span className="text-xs font-black text-gray-700">
                  {formatCurrency(m.totalSpend)}
                  <span className="text-gray-400 font-medium"> / {formatCurrency(budget)}</span>
                  <span className={`ml-2 font-black ${budgetPct > 90 ? 'text-red-600' : budgetPct > 70 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    ({budgetPct.toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Ritmo (pacing) — projeção de orçamento e meta de KPI */}
        {(pacing || kpiProgress !== null) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Pacing de orçamento */}
            {pacing && (
              <div className={`bg-white rounded-2xl border shadow-sm p-5 ${pacing.overBudget ? 'border-red-100' : 'border-emerald-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ritmo de Orçamento</p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wide ${
                    pacing.overBudget ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                    {pacing.overBudget ? '⚠️ acima do ritmo' : '✓ no ritmo'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  No ritmo atual de <strong className="text-gray-900">{formatCurrency(pacing.spendRate)}/dia</strong>,
                  a projeção de gasto ao fim é <strong className={pacing.overBudget ? 'text-red-600' : 'text-emerald-700'}>
                    {formatCurrency(pacing.projectedSpend)}
                  </strong> vs. orçamento de <strong className="text-gray-900">{formatCurrency(budget!)}</strong>.
                </p>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Decorrido</p>
                    <p className="text-sm font-black text-gray-900">{pacing.daysElapsed}/{pacing.daysTotal}d</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Restante</p>
                    <p className="text-sm font-black text-gray-900">{pacing.daysRemaining}d</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Verba dura</p>
                    <p className={`text-sm font-black ${
                      pacing.runwayDays !== null && pacing.runwayDays < pacing.daysRemaining ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {pacing.runwayDays === null ? '—' : `${Math.round(pacing.runwayDays)}d`}
                    </p>
                  </div>
                </div>
                {pacing.runwayDays !== null && pacing.runwayDays < pacing.daysRemaining && (
                  <p className="text-[11px] text-red-600 font-medium mt-2">
                    A verba acaba ~{Math.round(pacing.daysRemaining - pacing.runwayDays)} dia(s) antes do fim do período.
                  </p>
                )}
              </div>
            )}

            {/* Pacing de KPI */}
            {kpiProgress !== null && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meta de {data.primaryKpi}</p>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wide bg-indigo-50 text-indigo-600 border border-indigo-100">
                    {kpiProgress.toFixed(0)}% da meta
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  <strong className="text-gray-900">{formatNumber(kpiCurrent!)}</strong> de
                  <strong className="text-gray-900"> {formatNumber(kpiTarget!)}</strong> {data.primaryKpi?.toLowerCase()}
                  {pacing && (
                    <span className="text-gray-400">
                      {' '}· tempo decorrido {pacing.timePct.toFixed(0)}%
                    </span>
                  )}
                </p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-3 relative">
                  <div
                    className={`h-full rounded-full transition-all ${kpiProgress >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${kpiProgress}%` }}
                  />
                  {/* Marcador de tempo decorrido — referência de ritmo esperado */}
                  {pacing && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400" style={{ left: `${pacing.timePct}%` }} title="Tempo decorrido" />
                  )}
                </div>
                {pacing && kpiProgress < pacing.timePct && (
                  <p className="text-[11px] text-amber-600 font-medium mt-2">
                    Abaixo do ritmo: meta {pacing.timePct.toFixed(0)}% esperada, atingido {kpiProgress.toFixed(0)}%.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Leads',       value: formatNumber(m.totalLeads),                    color: 'text-indigo-600' },
            { label: 'CPL',         value: cpl ? formatCurrency(cpl) : '—',               color: 'text-teal-600' },
            { label: 'Gasto Total', value: formatCurrency(m.totalSpend),                  color: 'text-red-600' },
            { label: 'CTR Médio',   value: m.avgCtr ? `${m.avgCtr.toFixed(2)}%` : '—',   color: 'text-amber-600' },
            { label: 'Cliques',     value: formatNumber(m.totalClicks),                   color: 'text-emerald-600' },
            { label: 'Impressões',  value: formatNumber(m.totalImpressions),              color: 'text-blue-600' },
            { label: 'Alcance',     value: formatNumber(m.totalReach),                    color: 'text-cyan-600' },
            { label: 'CPC Médio',   value: m.avgCpc ? formatCurrency(m.avgCpc) : '—',    color: 'text-orange-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
              <p className={`text-lg font-black font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Campaigns */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-black text-gray-900">
              Campanhas vinculadas
              <span className="ml-2 text-gray-400 font-medium">({data.campaigns.length})</span>
            </h2>
            <Link href="/admin/campanhas/dashboard"
              className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
              Ver campanhas <ChevronRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.campaigns.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Nenhuma campanha vinculada ainda.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.campaigns.map(c => (
                <div key={c.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.objective.replace('OUTCOME_', '')}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide ${
                    c.status === 'ACTIVE'  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    c.status === 'PAUSED'  ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      c.status === 'ACTIVE' ? 'bg-emerald-500' :
                      c.status === 'PAUSED' ? 'bg-amber-500' : 'bg-gray-400'
                    }`} />
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Briefing */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-violet-50 rounded-xl">
                <SparklesIcon className="h-4 w-4 text-violet-600" />
              </div>
              <h2 className="text-sm font-black text-gray-900">Briefing Consolidado com IA</h2>
            </div>
            <button onClick={handleGenerateBriefing} disabled={genBriefing}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-violet-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/20">
              {genBriefing
                ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Gerando...</>
                : <><SparklesIcon className="h-3.5 w-3.5" /> Gerar com IA</>}
            </button>
          </div>
          {briefing ? (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-medium font-sans">{briefing}</pre>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Clique em "Gerar com IA" para obter uma análise consolidada desta iniciativa.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
