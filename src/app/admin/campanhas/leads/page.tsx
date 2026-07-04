'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import {
  UsersIcon, ChartBarIcon, ArrowTrendingUpIcon,
  ChevronLeftIcon, ChevronRightIcon,
  ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { adminFetch } from '@/lib/auth/adminFetch'
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector'
import DateInputPtBR from '@/components/ui/DateInputPtBR'

const PAGE_SIZE = 20

const BAR_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899']

const ORIGEM_LABEL: Record<string, string> = {
  cta_app_form:      'Formulário',
  cta:               'Formulário CTA',
  cta_whatsapp:      'WhatsApp CTA',
  cta_api:           'Webhook Externo',
  whatsapp_organico: 'WhatsApp Orgânico',
  meta_lead_ads:     'Meta Lead Ads',
  api_webhook:       'API / Webhook',
  direto:            'Direto',
}

const ORIGEM_COLOR: Record<string, string> = {
  cta_app_form:      'bg-blue-100 text-blue-700',
  cta:               'bg-blue-100 text-blue-700',
  cta_whatsapp:      'bg-emerald-100 text-emerald-700',
  cta_api:           'bg-violet-100 text-violet-700',
  whatsapp_organico: 'bg-green-100 text-green-700',
  meta_lead_ads:     'bg-indigo-100 text-indigo-700',
  api_webhook:       'bg-violet-100 text-violet-700',
  direto:            'bg-gray-100 text-gray-600',
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px',
    fontSize: '12px', fontWeight: 500, color: '#111827',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  },
}

const CARD = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

export default function LeadsCapturadosPage() {
  const [leads, setLeads]       = useState<any[]>([])
  const [stats, setStats]       = useState<any>({})
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [page, setPage]         = useState(1)
  const [origemFilter, setOrigemFilter] = useState('all')
  const [dateError, setDateError] = useState('')

  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    endDate:   new Date().toISOString().split('T')[0],
  })

  const { clients, loading: clientsLoading, clientFilter, setClientFilter } =
    useClientSelector('leads')

  const buildQs = useCallback((extra: Record<string, any> = {}) => {
    const p: Record<string, string> = {
      startDate: filters.startDate,
      endDate:   filters.endDate,
      ...extra,
    }
    if (clientFilter && clientFilter !== 'all' && clientFilter !== 'segment') p.clientId = clientFilter
    if (origemFilter !== 'all') p.origem = origemFilter
    return new URLSearchParams(p).toString()
  }, [filters, clientFilter, origemFilter])

  const EMPTY_STATS = { totalLeads: 0, leadsHoje: 0, mediaDia: '0.0', leadsByDay: [], leadsByOrigem: [] }

  const loadAll = useCallback(async () => {
    // Validação: data início não pode ser posterior à data fim
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      setDateError('A data "De" não pode ser posterior à data "Até".')
      setLeads([])
      setTotal(0)
      setStats(EMPTY_STATS)
      setLoading(false)
      return
    }
    setDateError('')
    setLoading(true)
    try {
      const [leadsRes, statsRes] = await Promise.all([
        adminFetch(`/api/admin/campanhas/leads?${buildQs({ page: '1', limit: String(PAGE_SIZE) })}`).then(async r => {
          const data = await r.json()
          if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
          return data
        }),
        adminFetch(`/api/admin/campanhas/leads/stats?${buildQs()}`).then(async r => {
          const data = await r.json()
          if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`)
          return data
        }),
      ])
      setLeads(leadsRes.leads ?? [])
      setTotal(leadsRes.total ?? 0)
      setStats(statsRes)
      setPage(1)
    } catch (err: any) {
      console.error('[leads page] loadAll erro:', err)
      setLeads([])
      setTotal(0)
      setStats(EMPTY_STATS)
    } finally {
      setLoading(false)
    }
  }, [buildQs, filters.startDate, filters.endDate])

  useEffect(() => { loadAll() }, [loadAll])

  const goToPage = async (p: number) => {
    setPage(p)
    setTableLoading(true)
    try {
      const res = await adminFetch(`/api/admin/campanhas/leads?${buildQs({ page: String(p), limit: String(PAGE_SIZE) })}`).then(r => r.json())
      setLeads(res.leads ?? [])
      setTotal(res.total ?? 0)
    } finally {
      setTableLoading(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const rangeEnd   = Math.min(page * PAGE_SIZE, total)

  const dailyData = [...(stats.leadsByDay ?? [])].reverse().map((d: any) => ({
    date:  new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    leads: d.count,
  }))

  const origemData = (stats.leadsByOrigem ?? []).map((o: any) => ({
    name:  (ORIGEM_LABEL[o.origem] ?? o.origem).slice(0, 20),
    leads: o.count,
    key:   o.origem,
  }))

  const topOrigem = stats.leadsByOrigem?.[0]
  const topOrigemLabel = topOrigem ? (ORIGEM_LABEL[topOrigem.origem] ?? topOrigem.origem) : '—'

  const selectCls = 'bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const inputCls  = 'bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="px-4 py-6 bg-gray-50 min-h-screen">
      <div className="w-full">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Campanhas</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Leads Capturados</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">
              Formulários, WhatsApp, Meta Lead Ads e API — leads com ação real confirmada.
            </p>
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
            <div className="flex-1 min-w-[140px]">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                <FunnelIcon className="w-3 h-3 inline mr-1" />Origem
              </label>
              <select value={origemFilter} onChange={e => setOrigemFilter(e.target.value)} className={selectCls}>
                <option value="all">Todas as origens</option>
                {Object.entries(ORIGEM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
          {dateError && (
            <p className="mt-3 text-xs font-medium text-red-600 flex items-center gap-1">
              <span>⚠</span> {dateError}
            </p>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: UsersIcon,          label: 'Total Leads',    value: stats.totalLeads ?? 0,   color: 'text-indigo-600',  bg: 'bg-indigo-50' },
            { icon: ArrowTrendingUpIcon, label: 'Leads Hoje',    value: stats.leadsHoje ?? 0,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { icon: ChartBarIcon,        label: 'Média/Dia',     value: stats.mediaDia ?? '0',   color: 'text-violet-600',  bg: 'bg-violet-50' },
            { icon: FunnelIcon,          label: 'Maior Origem',  value: topOrigemLabel,          color: 'text-amber-600',   bg: 'bg-amber-50' },
          ].map(k => (
            <div key={k.label} className={`${CARD} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{k.label}</p>
                <div className={`p-2 rounded-xl ${k.bg}`}>
                  <k.icon className={`h-4 w-4 ${k.color}`} />
                </div>
              </div>
              {loading
                ? <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                : <p className={`text-3xl font-black ${k.color} truncate`}>{k.value}</p>
              }
            </div>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[0, 1].map(i => <div key={i} className={`${CARD} h-72 animate-pulse`} />)}
          </div>
        ) : (
          <>
            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className={`${CARD} p-6`}>
                <h3 className="text-sm font-black text-gray-900 mb-5">Leads por Dia</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailyData} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} interval="preserveStartEnd" />
                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }} name="Leads" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className={`${CARD} p-6`}>
                <h3 className="text-sm font-black text-gray-900 mb-5">Leads por Origem</h3>
                {origemData.length === 0 ? (
                  <p className="text-sm text-gray-400 py-16 text-center">Sem dados no período.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={origemData} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} angle={-10} textAnchor="end" height={40} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                      <Tooltip {...TOOLTIP_STYLE} />
                      <Bar dataKey="leads" radius={[6, 6, 0, 0]} name="Leads">
                        {origemData.map((_: any, i: number) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Tabela */}
            <div className={`${CARD} overflow-hidden`}>
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900">Últimos Leads</h3>
                <span className="text-xs font-bold text-gray-400">{total} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {['Data/Hora', 'Nome', 'Contato', 'Origem', 'Campanha UTM'].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y divide-gray-100 transition-opacity ${tableLoading ? 'opacity-50' : ''}`}>
                    {leads.map((lead: any) => (
                      <tr key={lead.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-gray-500 whitespace-nowrap">
                          {new Date(lead.created_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">{lead.nome || '—'}</td>
                        <td className="px-6 py-4 text-gray-600 text-xs">
                          <div>{lead.email || ''}</div>
                          <div className="font-mono text-emerald-700">{lead.telefone || ''}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ORIGEM_COLOR[lead.origem] ?? 'bg-gray-100 text-gray-600'}`}>
                            {ORIGEM_LABEL[lead.origem] ?? lead.origem ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500">{lead.utm_campaign || '—'}</td>
                      </tr>
                    ))}
                    {leads.length === 0 && !tableLoading && (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-400">
                          Nenhum lead no período selecionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {total > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50/50">
                  <span className="text-xs text-gray-500 font-medium tabular-nums">
                    {rangeStart}–{rangeEnd} de {total} leads
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '«', action: () => goToPage(1), disabled: page === 1, Icon: ChevronDoubleLeftIcon },
                      { label: '‹', action: () => goToPage(page - 1), disabled: page === 1, Icon: ChevronLeftIcon },
                    ].map(({ action, disabled, Icon, label }) => (
                      <button key={label} onClick={action} disabled={disabled || tableLoading}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                    {buildPageNumbers(page, totalPages).map((item, idx) =>
                      item === '…'
                        ? <span key={`e${idx}`} className="px-1 text-xs text-gray-400">…</span>
                        : (
                          <button key={item} onClick={() => goToPage(item as number)} disabled={tableLoading}
                            className={`min-w-[30px] h-8 rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed ${item === page ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}`}>
                            {item}
                          </button>
                        )
                    )}
                    {[
                      { label: '›', action: () => goToPage(page + 1), disabled: page === totalPages, Icon: ChevronRightIcon },
                      { label: '»', action: () => goToPage(totalPages), disabled: page === totalPages, Icon: ChevronDoubleRightIcon },
                    ].map(({ action, disabled, Icon, label }) => (
                      <button key={label} onClick={action} disabled={disabled || tableLoading}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}
