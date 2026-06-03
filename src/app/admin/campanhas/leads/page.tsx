"use client";
import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { getLeads, getLeadStats, getCampaigns, type LeadData, type Campaign } from '@/lib/marketing-api';
import {
  UsersIcon, PhoneIcon, ChartBarIcon, MegaphoneIcon,
  ChevronLeftIcon, ChevronRightIcon,
  ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector';
import DateInputPtBR from '@/components/ui/DateInputPtBR';

/* ── constantes ────────────────────────────────────────────────── */

const PAGE_SIZE = 20;

const BAR_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#ef4444', '#84cc16',
];

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

/** Classe base dos cards — borda visível + sombra leve */
const CARD = 'bg-white rounded-2xl border border-gray-200 shadow-sm';

/* ── componente ────────────────────────────────────────────────── */

export function LeadsPage() {
  const [leads, setLeads]         = useState<LeadData[]>([]);
  const [stats, setStats]         = useState<any>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [page, setPage]           = useState(1);

  const [filters, setFilters] = useState({
    campaignId: '',
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    endDate:   new Date().toISOString().split('T')[0],
  });

  const { clients, loading: clientsLoading, clientFilter, setClientFilter } =
    useClientSelector('leads');

  /* ── carga completa (filtros ou cliente mudaram) ── */
  useEffect(() => {
    setPage(1);
    loadFullData();
  }, [filters, clientFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function apiBase() {
    const f: any = { ...filters };
    if (clientFilter && clientFilter !== 'all') f.clientId = clientFilter;
    return f;
  }

  async function loadFullData() {
    setLoading(true);
    try {
      const base = apiBase();
      const [leadsResult, statsResult, campaignsResult] = await Promise.allSettled([
        getLeads({ ...base, page: 1, limit: PAGE_SIZE }),
        getLeadStats(base),
        getCampaigns(clientFilter !== 'all' ? clientFilter : undefined),
      ]);
      if (leadsResult.status === 'fulfilled') {
        setLeads(leadsResult.value.leads || []);
        setTotal(leadsResult.value.total || 0);
      }
      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value);
      } else {
        console.error('getLeadStats failed:', (statsResult as any).reason);
      }
      if (campaignsResult.status === 'fulfilled') setCampaigns(campaignsResult.value);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  /* ── troca de página (apenas recarrega leads) ── */
  async function goToPage(newPage: number) {
    setPage(newPage);
    setTableLoading(true);
    try {
      const result = await getLeads({ ...apiBase(), page: newPage, limit: PAGE_SIZE });
      setLeads(result?.leads || []);
      setTotal(result?.total || 0);
    } catch { /* silent */ }
    finally { setTableLoading(false); }
  }

  /* ── derivações ── */
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const dailyData = (stats.leadsByDay || []).map((d: any) => ({
    date:  new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    leads: d.count,
  })).reverse();

  const campaignLeads = (stats.leadsByCampaign || []).map((d: any) => ({
    name:  (d.campaignName || d.campaignId?.slice(0, 8) || 'Sem campanha').slice(0, 18),
    leads: d.count ?? d._count?.id ?? 0,
  }));

  const leadsHoje = dailyData.length > 0 ? (dailyData[dailyData.length - 1]?.leads || 0) : 0;
  const mediaDia  = dailyData.length > 0 ? (total / Math.max(dailyData.length, 1)).toFixed(1) : '0';
  const ativas    = campaigns.filter(c => c.status === 'ACTIVE').length;

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(page * PAGE_SIZE, total);

  const selectCls = 'bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all';
  const inputCls  = 'bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all';

  /* ── render ── */
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Campanhas</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Leads WhatsApp</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">Rastreamento de cliques para o WhatsApp</p>
          </div>
          <ClientSelector
            value={clientFilter}
            onChange={setClientFilter}
            clients={clients}
            loading={clientsLoading}
            storageKey="leads"
            variant="toggle"
          />
        </div>

        {/* Filtros */}
        <div className={`${CARD} p-5 mb-6`}>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Campanha</label>
              <select
                value={filters.campaignId}
                onChange={e => setFilters(f => ({ ...f, campaignId: e.target.value }))}
                className={selectCls}
              >
                <option value="">Todas</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">De</label>
              <DateInputPtBR value={filters.startDate} onChange={iso => setFilters(f => ({ ...f, startDate: iso }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Até</label>
              <DateInputPtBR value={filters.endDate} onChange={iso => setFilters(f => ({ ...f, endDate: iso }))} className={inputCls} />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: UsersIcon,     label: 'Total Leads',      value: stats.totalLeads || 0, color: 'text-indigo-600',  bg: 'bg-indigo-50' },
            { icon: PhoneIcon,     label: 'Leads Hoje',       value: leadsHoje,             color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: ChartBarIcon,  label: 'Média/Dia',        value: mediaDia,              color: 'text-violet-600',  bg: 'bg-violet-50' },
            { icon: MegaphoneIcon, label: 'Campanhas Ativas', value: ativas,                color: 'text-amber-600',   bg: 'bg-amber-50' },
          ].map(k => (
            <div key={k.label} className={`${CARD} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{k.label}</p>
                <div className={`p-2 rounded-xl ${k.bg}`}>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
              </div>
              <p className={`text-3xl font-black ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className={`${CARD} h-72 animate-pulse`} />
            ))}
          </div>
        ) : (
          <>
            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* Leads por Dia */}
              <div className={`${CARD} p-6`}>
                <h3 className="text-sm font-black text-gray-900 mb-5">Leads por Dia</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyData} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                      allowDecimals={false}
                      tickCount={5}
                    />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="leads"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                      name="Leads"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Leads por Campanha */}
              <div className={`${CARD} p-6`}>
                <h3 className="text-sm font-black text-gray-900 mb-5">Leads por Campanha</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={campaignLeads} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis
                      dataKey="name"
                      stroke="#6b7280"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                      allowDecimals={false}
                    />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="leads" radius={[6, 6, 0, 0]} name="Leads">
                      {campaignLeads.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabela de leads */}
            <div className={`${CARD} overflow-hidden`}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900">Últimos Leads</h3>
                <span className="text-xs font-bold text-gray-400">{total} total</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data/Hora</th>
                      <th className="text-left px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Campanha</th>
                      <th className="text-left px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Criativo</th>
                      <th className="text-left px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Origem</th>
                      <th className="text-left px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y divide-gray-100 ${tableLoading ? 'opacity-50' : ''} transition-opacity`}>
                    {leads.map(lead => {
                      const campaign = campaigns.find(c => c.id === lead.campaignId);
                      return (
                        <tr key={lead.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-6 py-4 text-xs font-mono text-gray-500">
                            {new Date(lead.clickedAt).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{campaign?.name || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{lead.utmContent || '—'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{lead.utmSource || '—'}</td>
                          <td className="px-6 py-4 text-xs font-mono font-bold text-emerald-600">{lead.phoneClicked}</td>
                        </tr>
                      );
                    })}
                    {leads.length === 0 && !tableLoading && (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-400">
                          Nenhum lead registrado ainda. Os leads aparecem quando internautas clicarem nos anúncios.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {total > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
                  <span className="text-xs text-gray-500 font-medium tabular-nums">
                    {rangeStart}–{rangeEnd} de {total} leads
                  </span>

                  <div className="flex items-center gap-1">
                    {/* Primeira página */}
                    <button
                      onClick={() => goToPage(1)}
                      disabled={page === 1 || tableLoading}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Primeira página"
                    >
                      <ChevronDoubleLeftIcon className="h-4 w-4" />
                    </button>

                    {/* Anterior */}
                    <button
                      onClick={() => goToPage(page - 1)}
                      disabled={page === 1 || tableLoading}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Página anterior"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>

                    {/* Números de página */}
                    {buildPageNumbers(page, totalPages).map((item, idx) =>
                      item === '…' ? (
                        <span key={`e${idx}`} className="px-1 text-xs text-gray-400 select-none">…</span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => goToPage(item as number)}
                          disabled={tableLoading}
                          className={`min-w-[30px] h-8 rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed
                            ${item === page
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                    {/* Próxima */}
                    <button
                      onClick={() => goToPage(page + 1)}
                      disabled={page === totalPages || tableLoading}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Próxima página"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>

                    {/* Última página */}
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={page === totalPages || tableLoading}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      aria-label="Última página"
                    >
                      <ChevronDoubleRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── helper de paginação ───────────────────────────────────────── */

function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

export default LeadsPage;
