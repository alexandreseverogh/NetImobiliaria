"use client";
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/marketing-utils';
import { PlusIcon, FlagIcon, ArrowRightIcon, CalendarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { CreateGuard } from '@/components/admin/PermissionGuard';
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector';

type InitiativeStatus = 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

interface Initiative {
  id: string;
  name: string;
  description: string | null;
  goalDescription: string | null;
  totalBudgetPlanned: string | null;
  startDate: string | null;
  endDate: string | null;
  status: InitiativeStatus;
  primaryKpi: string | null;
  primaryKpiTarget: string | null;
  createdAt: string;
  _count: { campaigns: number };
}

const STATUS_LABELS: Record<InitiativeStatus, string> = {
  PLANNED:   'Planejada',
  ACTIVE:    'Ativa',
  PAUSED:    'Pausada',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const STATUS_STYLES: Record<InitiativeStatus, string> = {
  PLANNED:   'bg-blue-50 text-blue-700 border border-blue-100',
  ACTIVE:    'bg-emerald-50 text-emerald-700 border border-emerald-100',
  PAUSED:    'bg-amber-50 text-amber-700 border border-amber-100',
  COMPLETED: 'bg-violet-50 text-violet-700 border border-violet-100',
  CANCELLED: 'bg-red-50 text-red-600 border border-red-100',
};

const STATUS_DOT: Record<InitiativeStatus, string> = {
  PLANNED:   'bg-blue-500',
  ACTIVE:    'bg-emerald-500',
  PAUSED:    'bg-amber-500',
  COMPLETED: 'bg-violet-500',
  CANCELLED: 'bg-red-500',
};

export default function IniciativasPage() {
  const [items, setItems]         = useState<Initiative[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState('');
  const [page, setPage]           = useState(1);
  const limit = 20;

  // Seletor Minha Empresa / Para um Cliente — padrão 'own'
  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('iniciativas');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter)           params.set('status',   statusFilter);
      if (clientFilter !== 'all') params.set('clientId', clientFilter);
      const res  = await fetch(`/api/admin/campanhas/iniciativas?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, statusFilter, clientFilter]);

  useEffect(() => { load(); }, [load]);

  function fmt(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  const selectCls = "bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all";

  return (
    <div className="px-4 py-6 bg-gray-50 min-h-screen">
      <div className="w-full">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Campanhas</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Iniciativas de Marketing</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">Agrupe campanhas sob um objetivo e orçamento comuns</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ClientSelector
              value={clientFilter}
              onChange={v => { setClientFilter(v); setPage(1); }}
              clients={clients}
              loading={clientsLoading}
              storageKey="iniciativas"
              variant="toggle"
            />
            <CreateGuard resource="iniciativas-campanhas">
              <Link href="/admin/campanhas/iniciativas/nova"
                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20">
                <PlusIcon className="h-4 w-4" /> Nova Iniciativa
              </Link>
            </CreateGuard>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</label>
            <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1); }} className={selectCls}>
              <option value="">Todos</option>
              {(Object.keys(STATUS_LABELS) as InitiativeStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <span className="text-xs font-bold text-gray-400">
            {total} iniciativa{total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-24 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FlagIcon className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-black text-gray-900 mb-1">Nenhuma iniciativa encontrada</p>
            <p className="text-xs text-gray-400 mb-6">Crie sua primeira iniciativa para agrupar campanhas estrategicamente</p>
            <CreateGuard resource="iniciativas-campanhas">
              <Link href="/admin/campanhas/iniciativas/nova"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">
                <PlusIcon className="h-3.5 w-3.5" /> Criar primeira iniciativa
              </Link>
            </CreateGuard>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <Link key={item.id} href={`/admin/campanhas/iniciativas/${item.id}`}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Status + KPI */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${STATUS_STYLES[item.status as InitiativeStatus]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[item.status as InitiativeStatus]}`} />
                          {STATUS_LABELS[item.status as InitiativeStatus]}
                        </span>
                        {item.primaryKpi && (
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                            KPI: {item.primaryKpi}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-black text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {item.name}
                      </h3>
                      {item.goalDescription && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.goalDescription}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-6 text-right shrink-0">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1 justify-end">
                          <CurrencyDollarIcon className="h-3 w-3" /> Budget
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {item.totalBudgetPlanned ? formatCurrency(Number(item.totalBudgetPlanned)) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1 justify-end">
                          <CalendarIcon className="h-3 w-3" /> Período
                        </p>
                        <p className="text-sm font-medium text-gray-600">
                          {fmt(item.startDate)} – {fmt(item.endDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Campanhas</p>
                        <p className="text-sm font-bold text-gray-900">{item._count.campaigns}</p>
                      </div>
                      <ArrowRightIcon className="h-4 w-4 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex justify-center items-center gap-3 mt-6">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 disabled:opacity-40 transition-all">
              ← Anterior
            </button>
            <span className="text-xs font-black text-gray-400">
              {page} / {Math.ceil(total / limit)}
            </span>
            <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-600 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 disabled:opacity-40 transition-all">
              Próxima →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
