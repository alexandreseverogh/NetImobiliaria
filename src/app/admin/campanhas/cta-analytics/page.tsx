'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'
import {
  ChartBarIcon, EyeIcon, InboxArrowDownIcon, UserPlusIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, ExclamationTriangleIcon,
  TrophyIcon, ClockIcon, ChatBubbleLeftRightIcon, FunnelIcon,
} from '@heroicons/react/24/outline'
import { adminFetch } from '@/lib/auth/adminFetch'

const CTA_LABELS: Record<string, string> = {
  WHATSAPP_MESSAGE: 'WhatsApp', LEARN_MORE: 'Saiba Mais', SHOP_NOW: 'Comprar Agora',
  SIGN_UP: 'Cadastre-se', CONTACT_US: 'Fale Conosco', BOOK_TRAVEL: 'Reserve', GET_OFFER: 'Ver Oferta',
}
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const PERIOD_OPTIONS = [{ label: '7d', value: 7 }, { label: '30d', value: 30 }, { label: '90d', value: 90 }]
const FUNNEL_COLORS = ['#818cf8', '#6366f1', '#4f46e5', '#1e40af']

function toDateStr(d: Date) { return d.toISOString().split('T')[0] }

export default function CtaAnalyticsPage() {
  const [activeDays, setActiveDays] = useState<number | null>(30)
  const [dateFrom, setDateFrom] = useState(() => toDateStr(new Date(Date.now() - 30 * 864e5)))
  const [dateTo, setDateTo]     = useState(() => toDateStr(new Date()))
  const [segmentId, setSegmentId] = useState('')
  const [destinationId, setDestinationId] = useState('')
  const [ctaType, setCtaType] = useState('')
  const [destinos, setDestinos] = useState<any[]>([])
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  function handleQuickPick(d: number) {
    setActiveDays(d)
    setDateTo(toDateStr(new Date()))
    setDateFrom(toDateStr(new Date(Date.now() - d * 864e5)))
  }

  function handleDateInput(field: 'from' | 'to', val: string) {
    setActiveDays(null)
    if (field === 'from') setDateFrom(val)
    else setDateTo(val)
  }

  useEffect(() => {
    adminFetch('/api/admin/campanhas/destinos')
      .then(r => r.json())
      .then(d => setDestinos(d.destinos || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!dateFrom || !dateTo) return
    setLoading(true)
    const qs = new URLSearchParams({ from: new Date(dateFrom).toISOString(), to: new Date(dateTo + 'T23:59:59').toISOString() })
    if (segmentId) qs.set('segmentId', segmentId)
    if (destinationId) qs.set('destinationId', destinationId)
    if (ctaType) qs.set('ctaType', ctaType)
    adminFetch(`/api/admin/campanhas/cta-analytics?${qs}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [dateFrom, dateTo, segmentId, destinationId, ctaType])

  const k = data?.kpis
  const segments: any[] = data?.segments || []
  const funnelMax = useMemo(() => Math.max(1, ...(data?.funnel || []).map((f: any) => f.value)), [data])

  return (
    <div className="min-h-screen bg-gray-50/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 shadow-md shadow-indigo-200">
              <FunnelIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Demanda &amp; Captura de CTA</h1>
              <p className="text-xs text-gray-400 mt-0.5">Visualizações, submissões e leads — por segmento e destino</p>
            </div>
          </div>

          {/* Period controls */}
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="inline-flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleQuickPick(opt.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeDays === opt.value
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 pl-0.5">De</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => handleDateInput('from', e.target.value)}
                  className="h-[34px] px-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-700 bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
              <span className="text-gray-300 mt-4">→</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 pl-0.5">Até</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => handleDateInput('to', e.target.value)}
                  className="h-[34px] px-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-700 bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white border border-indigo-100 rounded-2xl px-5 py-4" style={{ boxShadow: '0 4px 20px rgba(99,102,241,0.08), 0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex flex-wrap gap-4 items-end">
            <FilterField label="Segmento">
              <select
                value={segmentId}
                onChange={e => setSegmentId(e.target.value)}
                className="h-[38px] px-3 min-w-40 rounded-[10px] border border-gray-200 text-[13px] text-gray-700 bg-white outline-none cursor-pointer transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Todos os segmentos</option>
                <option value="own">Próprio (sem cliente)</option>
                {segments.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.clients_count})
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Destino">
              <select
                value={destinationId}
                onChange={e => setDestinationId(e.target.value)}
                className="h-[38px] px-3 min-w-40 rounded-[10px] border border-gray-200 text-[13px] text-gray-700 bg-white outline-none cursor-pointer transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Todos os destinos</option>
                {destinos.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FilterField>

            <FilterField label="Tipo de CTA">
              <select
                value={ctaType}
                onChange={e => setCtaType(e.target.value)}
                className="h-[38px] px-3 min-w-40 rounded-[10px] border border-gray-200 text-[13px] text-gray-700 bg-white outline-none cursor-pointer transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">Todos os CTAs</option>
                {Object.entries(CTA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </FilterField>

            {/* Active segment chip */}
            {segmentId && segmentId !== 'own' && (() => {
              const seg = segments.find((s: any) => s.id === segmentId)
              if (!seg) return null
              return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ background: seg.color_theme }}>
                  <span>{seg.name}</span>
                  <button onClick={() => setSegmentId('')} className="opacity-70 hover:opacity-100">×</button>
                </div>
              )
            })()}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            icon={<EyeIcon className="w-5 h-5" />}
            label="Visualizações"
            value={k?.views}
            delta={k?.deltaViews}
            loading={loading}
            color="indigo"
          />
          <KpiCard
            icon={<InboxArrowDownIcon className="w-5 h-5" />}
            label="Submissões"
            value={k?.submits}
            delta={k?.deltaSubmits}
            loading={loading}
            color="violet"
          />
          <KpiCard
            icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
            label="Taxa de Conversão"
            value={k ? `${k.conversion}%` : undefined}
            loading={loading}
            color="emerald"
            hint={k ? `${k.aproveitamento}% das submissões viram leads` : ''}
          />
          <KpiCard
            icon={<UserPlusIcon className="w-5 h-5" />}
            label="Leads no CRM"
            value={k?.leads}
            loading={loading}
            color="blue"
            hint={k ? `${k.aproveitamento}% de aproveitamento` : ''}
          />
        </div>

        {/* Funil + Tendência */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Funil de conversão">
            <div className="space-y-3">
              {(data?.funnel || [{},{},{},{}]).map((f: any, i: number) => {
                const prev = data?.funnel?.[i - 1]?.value
                const pct = prev && prev > 0 ? Math.round((f.value / prev) * 100) : null
                return (
                  <div key={f.stage ?? i} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white" style={{ background: FUNNEL_COLORS[i] }}>
                          {i + 1}
                        </span>
                        {loading
                          ? <div className="h-3.5 w-20 bg-gray-100 rounded animate-pulse" />
                          : <span className="text-sm text-gray-600">{f.stage}</span>}
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        {loading
                          ? <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
                          : <>
                              {pct !== null && (
                                <span className="text-xs text-gray-400 tabular-nums">↓ {pct}%</span>
                              )}
                              <span className="text-sm font-bold text-gray-900 tabular-nums">
                                {(f.value || 0).toLocaleString('pt-BR')}
                              </span>
                            </>}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      {!loading && (
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.round(((f.value || 0) / funnelMax) * 100)}%`, background: FUNNEL_COLORS[i] }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card title="Tendência diária">
            {loading
              ? <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
              : <div style={{ width: '100%', height: 208 }}>
                  <ResponsiveContainer>
                    <LineChart data={data?.trend || []} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf6" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={{ stroke: '#e5e7eb' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' }}
                        cursor={{ stroke: '#e5e7eb' }}
                      />
                      <Line type="monotone" dataKey="views" name="Visualizações" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                      <Line type="monotone" dataKey="submits" name="Submissões" stroke="#10b981" strokeWidth={2} strokeDasharray="5 3" dot={false} activeDot={{ r: 4, fill: '#10b981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>}
          </Card>
        </div>

        {/* Ranking + por CTA */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Ranking de destinos — conversão %">
            {loading
              ? <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
              : !data?.ranking?.length
                ? <Empty />
                : <div style={{ width: '100%', height: Math.max(140, (data.ranking.length) * 44 + 16) }}>
                    <ResponsiveContainer>
                      <BarChart layout="vertical" data={data.ranking} margin={{ left: 8, right: 28, top: 4 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={{ stroke: '#e5e7eb' }} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' }}
                          formatter={(v: any) => [`${v}%`, 'Conversão']}
                        />
                        <Bar dataKey="conv" name="Conversão %" radius={[0, 6, 6, 0]} maxBarSize={28}>
                          {data.ranking.map((_: any, i: number) => (
                            <Cell key={i} fill={`hsl(${245 - i * 15},70%,${55 + i * 5}%)`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>}
          </Card>

          <Card title="Submissões por tipo de CTA">
            {loading
              ? <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
              : !data?.porCta?.length
                ? <Empty />
                : <div style={{ width: '100%', height: 208 }}>
                    <ResponsiveContainer>
                      <BarChart
                        data={(data.porCta).map((c: any) => ({ ...c, label: CTA_LABELS[c.key] || c.key }))}
                        margin={{ top: 8, left: -20, right: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8eaf6" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={0} angle={-12} textAnchor="end" height={48} axisLine={{ stroke: '#e5e7eb' }} tickLine={{ stroke: '#e5e7eb' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)' }}
                        />
                        <Bar dataKey="submits" name="Submissões" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>}
          </Card>
        </div>

        {/* Heatmap submissões + Origem UTM */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Demanda por dia × hora — Submissões">
            <Heatmap data={data?.heatmap || []} loading={loading} color="indigo" />
          </Card>
          <Card title="Origem das submissões (UTM)">
            {loading
              ? <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-7 bg-gray-100 rounded animate-pulse" />)}</div>
              : !(data?.porOrigem || []).length
                ? <Empty />
                : <div className="space-y-2.5">
                    {(data.porOrigem).map((o: any) => {
                      const max = Math.max(1, ...data.porOrigem.map((x: any) => x.submits))
                      const pct = Math.round((o.submits / max) * 100)
                      return (
                        <div key={o.key} className="flex items-center gap-3">
                          <span className="w-28 text-xs text-gray-500 truncate shrink-0 font-medium">{o.key}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-10 text-right text-sm font-bold text-gray-800 tabular-nums">{o.submits}</span>
                        </div>
                      )
                    })}
                  </div>}
          </Card>
        </div>

        {/* Leads por hora — exibido por último, sem scroll interno */}
        <Card title="Leads gerados por faixa de hora">
          <LeadsPerHour data={data?.leadsHourly || []} loading={loading} />
        </Card>

        {/* Insights */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3">Insights automáticos</h2>
          {loading && <div className="h-12 bg-white border border-gray-100 rounded-2xl animate-pulse" />}
          {!loading && (data?.insights || []).length === 0 && (
            <p className="text-sm text-gray-400 bg-white border border-gray-100 rounded-2xl px-5 py-4">Sem insights suficientes no período selecionado.</p>
          )}
          <div className="space-y-2">
            {(data?.insights || []).map((ins: any, i: number) => <InsightCard key={i} ins={ins} />)}
          </div>
        </div>

      </div>

    </div>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">{label}</span>
      {children}
    </label>
  )
}

function KpiCard({ icon, label, value, delta, hint, loading, color }: {
  icon: React.ReactNode; label: string; value?: any; delta?: number | null; hint?: string; loading: boolean; color: string
}) {
  const scheme: Record<string, { ring: string; bg: string; text: string }> = {
    indigo:  { ring: 'ring-indigo-100',  bg: 'bg-indigo-50',  text: 'text-indigo-600' },
    violet:  { ring: 'ring-violet-100',  bg: 'bg-violet-50',  text: 'text-violet-600' },
    emerald: { ring: 'ring-emerald-100', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    blue:    { ring: 'ring-blue-100',    bg: 'bg-blue-50',    text: 'text-blue-600' },
  }
  const c = scheme[color] || scheme.indigo
  const up = typeof delta === 'number' && delta >= 0

  return (
    <div className="bg-white border border-indigo-100 rounded-2xl p-5 transition-shadow" style={{ boxShadow: '0 4px 20px rgba(99,102,241,0.08), 0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ring-1 ${c.ring} ${c.bg} ${c.text} mb-4`}>
        {icon}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-800 mb-1">{label}</p>
      {loading
        ? <div className="h-8 w-20 bg-gray-100 rounded-lg animate-pulse" />
        : <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">{value ?? '—'}</p>}
      <div className="mt-2 min-h-[16px]">
        {typeof delta === 'number' && !loading && (
          <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {up ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
            {Math.abs(delta)}% vs período anterior
          </div>
        )}
        {hint && typeof delta !== 'number' && !loading && (
          <p className="text-[11px] text-gray-400">{hint}</p>
        )}
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-indigo-100 rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 20px rgba(99,102,241,0.08), 0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-gray-600">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Empty() {
  return <p className="text-sm text-gray-400 text-center py-8">Sem dados no período.</p>
}

const HEATMAP_COLORS: Record<string, string> = {
  indigo:  '99,102,241',
  emerald: '16,185,129',
}

function Heatmap({ data, loading, color = 'indigo' }: { data: any[]; loading: boolean; color?: string }) {
  const rgb = HEATMAP_COLORS[color] ?? HEATMAP_COLORS.indigo
  const grid: Record<string, number> = {}
  let max = 1
  for (const d of data) { grid[`${d.dow}-${d.hour}`] = d.n; if (d.n > max) max = d.n }
  const labelHours = [0, 4, 8, 12, 16, 20]

  if (loading) return <div className="h-28 bg-gray-50 rounded-xl animate-pulse" />

  return (
    <div className="overflow-x-auto">
      <table className="border-separate" style={{ borderSpacing: 3 }}>
        <tbody>
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
            <tr key={dow}>
              <td className="text-[10px] text-gray-500 pr-2 align-middle w-7">{DOW[dow]}</td>
              {Array.from({ length: 24 }).map((_, h) => {
                const n = grid[`${dow}-${h}`] || 0
                const intensity = n === 0 ? 0 : 0.12 + (n / max) * 0.88
                return (
                  <td
                    key={h}
                    title={`${DOW[dow]} ${h}h: ${n}`}
                    style={{
                      width: 13, height: 16, borderRadius: 3,
                      background: n === 0 ? '#f3f4f6' : `rgba(${rgb},${intensity.toFixed(2)})`,
                    }}
                  />
                )
              })}
            </tr>
          ))}
          <tr>
            <td />
            {Array.from({ length: 24 }).map((_, h) => (
              <td key={h} className="text-[9px] text-gray-500 text-center pt-1 font-medium">
                {labelHours.includes(h) ? h : ''}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="flex items-center gap-1.5 mt-3">
        <span className="text-[10px] text-gray-500">Menor</span>
        {[0.12, 0.3, 0.5, 0.7, 0.9].map((a, i) => (
          <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ background: `rgba(${rgb},${a})` }} />
        ))}
        <span className="text-[10px] text-gray-500">Maior</span>
      </div>
    </div>
  )
}

function LeadsPerHour({ data, loading }: { data: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-5 bg-gray-100 rounded animate-pulse" style={{ width: `${85 - i * 10}%` }} />
        ))}
      </div>
    )
  }

  const max = Math.max(1, ...data.map(d => d.n))
  const total = data.reduce((s, d) => s + d.n, 0)

  if (total === 0) return <Empty />

  return (
    <div className="space-y-[3px]">
      {data.map(({ hr, label, n }) => {
        const pct = Math.round((n / max) * 100)
        return (
          <div key={hr} className="flex items-center gap-2 group">
            <span className="text-[10px] text-gray-500 font-medium w-[110px] shrink-0 tabular-nums group-hover:text-gray-700 transition-colors">
              {label}
            </span>
            <div className="flex-1 h-[14px] bg-gray-100 rounded overflow-hidden">
              {n > 0 && (
                <div
                  className="h-full rounded transition-all duration-500"
                  style={{ width: `${pct}%`, background: `rgba(16,185,129,${0.4 + (pct / 100) * 0.6})` }}
                />
              )}
            </div>
            <span className={`text-[11px] tabular-nums w-5 text-right font-semibold ${n > 0 ? 'text-emerald-700' : 'text-gray-300'}`}>
              {n > 0 ? n : ''}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function InsightCard({ ins }: { ins: any }) {
  const cfg: Record<string, { gradient: string; border: string; text: string; Icon: any }> = {
    success: { gradient: 'from-emerald-50 to-teal-50',  border: 'border-emerald-200', text: 'text-emerald-800', Icon: TrophyIcon },
    info:    { gradient: 'from-blue-50 to-indigo-50',   border: 'border-blue-200',    text: 'text-blue-800',    Icon: ChatBubbleLeftRightIcon },
    warning: { gradient: 'from-amber-50 to-orange-50',  border: 'border-amber-200',   text: 'text-amber-800',   Icon: ExclamationTriangleIcon },
    neutral: { gradient: 'from-gray-50 to-slate-50',    border: 'border-gray-200',    text: 'text-gray-700',    Icon: ClockIcon },
  }
  const c = cfg[ins.type] || cfg.neutral
  return (
    <div className={`flex items-start gap-3 bg-gradient-to-r ${c.gradient} border ${c.border} rounded-xl px-4 py-3`}>
      <c.Icon className={`w-4 h-4 ${c.text} shrink-0 mt-0.5`} />
      <span className={`text-sm ${c.text} leading-relaxed`}>{ins.text}</span>
    </div>
  )
}
