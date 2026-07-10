'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'
import {
  EyeIcon, InboxArrowDownIcon, UserPlusIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, ExclamationTriangleIcon,
  TrophyIcon, ClockIcon, ChatBubbleLeftRightIcon, FunnelIcon, CalendarIcon,
} from '@heroicons/react/24/outline'
import { adminFetch } from '@/lib/auth/adminFetch'
import DateInputPtBR from '@/components/ui/DateInputPtBR'
import DayHourHeatmap from '@/components/marketing/charts/DayHourHeatmap'
import HourlyVolumeBar from '@/components/marketing/charts/HourlyVolumeBar'

const CTA_LABELS: Record<string, string> = {
  WHATSAPP_MESSAGE: 'WhatsApp', LEARN_MORE: 'Saiba Mais', SHOP_NOW: 'Comprar Agora',
  SIGN_UP: 'Cadastre-se', CONTACT_US: 'Fale Conosco', BOOK_TRAVEL: 'Reserve', GET_OFFER: 'Ver Oferta',
}
const PERIOD_OPTIONS = [{ label: '7d', value: 7 }, { label: '30d', value: 30 }, { label: '90d', value: 90 }]

// Amber funnel: brightness encodes drop-off naturally, no hue information
const FUNNEL_AMBERS = [
  'rgba(197,160,40,0.95)',
  'rgba(197,160,40,0.70)',
  'rgba(197,160,40,0.48)',
  'rgba(197,160,40,0.30)',
]

const CHART_AMBER = '#d4af37'
const CHART_MUTED = '#475569'
const GRID_STROKE = 'rgba(255,255,255,0.05)'
const AXIS_TICK = '#475569'
const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#0d1f3c',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#cbd5e1',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
}

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
    const fromDate = new Date(dateFrom + 'T00:00:00')
    const toDate   = new Date(dateTo   + 'T23:59:59')
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return
    setLoading(true)
    const qs = new URLSearchParams({ from: fromDate.toISOString(), to: toDate.toISOString() })
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
    <div className="min-h-screen bg-[#0a192f]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#112240] border border-white/8">
              <FunnelIcon className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white tracking-tight">Demanda &amp; Captura de CTA</h1>
              <p className="text-sm text-slate-400 mt-0.5">Visualizações, submissões e leads — por segmento e destino</p>
            </div>
          </div>

          {/* Period controls — items-end alinha pills e date fields pela base */}
          <div className="flex items-end gap-3 flex-wrap justify-end">
            {/* Wrapper com espaçador invisível para igualar altura dos labels De/Até */}
            <div className="flex flex-col gap-1">
              <span className="text-xs select-none invisible">_</span>
              <div className="inline-flex items-center bg-[#020c1b] border border-white/8 rounded-lg p-1 gap-0.5">
                {PERIOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleQuickPick(opt.value)}
                    className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeDays === opt.value
                        ? 'bg-[#c5a028] text-[#020c1b] shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <DatePickerField label="De"  value={dateFrom} onChange={iso => handleDateInput('from', iso)} />
              <span className="text-slate-600 pb-2 select-none">→</span>
              <DatePickerField label="Até" value={dateTo}   onChange={iso => handleDateInput('to', iso)} />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-[#112240] border border-white/5 rounded-xl px-5 py-4">
          <div className="flex flex-wrap gap-4 items-end">
            <FilterField label="Segmento">
              <select
                value={segmentId}
                onChange={e => setSegmentId(e.target.value)}
                className="h-9 px-3 min-w-40 rounded-lg border border-white/8 text-[13px] text-slate-200 bg-[#0a192f] outline-none cursor-pointer transition focus:border-[#c5a028]"
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
                className="h-9 px-3 min-w-40 rounded-lg border border-white/8 text-[13px] text-slate-200 bg-[#0a192f] outline-none cursor-pointer transition focus:border-[#c5a028]"
              >
                <option value="">Todos os destinos</option>
                {destinos.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FilterField>

            <FilterField label="Tipo de CTA">
              <select
                value={ctaType}
                onChange={e => setCtaType(e.target.value)}
                className="h-9 px-3 min-w-40 rounded-lg border border-white/8 text-[13px] text-slate-200 bg-[#0a192f] outline-none cursor-pointer transition focus:border-[#c5a028]"
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
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/90 border border-white/10" style={{ background: seg.color_theme + '30' }}>
                  <span style={{ color: seg.color_theme }}>{seg.name}</span>
                  <button onClick={() => setSegmentId('')} className="opacity-60 hover:opacity-100 transition-opacity text-white">×</button>
                </div>
              )
            })()}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={<EyeIcon className="w-5 h-5" />}            label="Visualizações"     value={k?.views}                 delta={k?.deltaViews}   loading={loading} />
          <KpiCard icon={<InboxArrowDownIcon className="w-5 h-5" />} label="Submissões"        value={k?.submits}               delta={k?.deltaSubmits} loading={loading} />
          <KpiCard icon={<ArrowTrendingUpIcon className="w-5 h-5" />} label="Taxa de Conversão" value={k ? `${k.conversion}%` : undefined} loading={loading} hint={k ? `${k.aproveitamento}% das submissões viram leads` : ''} />
          <KpiCard icon={<UserPlusIcon className="w-5 h-5" />}       label="Leads no CRM"      value={k?.leads}                 loading={loading} hint={k ? `${k.aproveitamento}% de aproveitamento` : ''} />
        </div>

        {/* Funil + Tendência */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Funil de conversão">
            <div className="space-y-3">
              {(data?.funnel || [{},{},{},{}]).map((f: any, i: number) => {
                const prev = data?.funnel?.[i - 1]?.value
                const pct = prev && prev > 0 ? Math.round((f.value / prev) * 100) : null
                return (
                  <div key={f.stage ?? i}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-[#020c1b]"
                          style={{ background: FUNNEL_AMBERS[i] }}
                        >
                          {i + 1}
                        </span>
                        {loading
                          ? <div className="h-3.5 w-20 bg-white/5 rounded animate-pulse" />
                          : <span className="text-sm text-slate-300">{f.stage}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        {loading
                          ? <div className="h-4 w-12 bg-white/5 rounded animate-pulse" />
                          : <>
                              {pct !== null && (
                                <span className="text-xs text-slate-500 tabular-nums">↓ {pct}%</span>
                              )}
                              <span className="text-sm font-semibold text-white tabular-nums">
                                {(f.value || 0).toLocaleString('pt-BR')}
                              </span>
                            </>}
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      {!loading && (
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.round(((f.value || 0) / funnelMax) * 100)}%`, background: FUNNEL_AMBERS[i] }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>

          <Panel title="Tendência diária">
            {loading
              ? <div className="h-52 bg-white/3 rounded-lg animate-pulse" />
              : !(data?.trend || []).length
                ? <Empty />
                : <>
                    {/* Legenda */}
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-0.5 rounded" style={{ background: CHART_AMBER }} />
                        <span className="text-[11px] text-slate-400">Visualizações</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke={CHART_MUTED} strokeWidth="2" strokeDasharray="5 3" /></svg>
                        <span className="text-[11px] text-slate-400">Submissões</span>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: 200 }}>
                      <ResponsiveContainer>
                        <LineChart data={data.trend} margin={{ top: 4, right: 16, bottom: 0, left: -12 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(d) => d.slice(5).replace('-', '/')}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={TOOLTIP_STYLE}
                            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                            labelFormatter={(d) => String(d).slice(5).replace('-', '/')}
                          />
                          <Line type="monotone" dataKey="views"   name="Visualizações" stroke={CHART_AMBER} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: CHART_AMBER, strokeWidth: 0 }} />
                          <Line type="monotone" dataKey="submits" name="Submissões"    stroke={CHART_MUTED} strokeWidth={2}   strokeDasharray="5 3" dot={false} activeDot={{ r: 5, fill: CHART_MUTED, strokeWidth: 0 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </>}
          </Panel>
        </div>

        {/* Ranking + por CTA */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Ranking de destinos — conversão %">
            {loading
              ? <div className="h-40 bg-white/3 rounded-lg animate-pulse" />
              : !data?.ranking?.length
                ? <Empty />
                : <div style={{ width: '100%', height: Math.max(140, (data.ranking.length) * 44 + 16) }}>
                    <ResponsiveContainer>
                      <BarChart layout="vertical" data={data.ranking} margin={{ left: 8, right: 28, top: 4 }}>
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: 'rgba(255,255,255,0.15)' }} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: 'rgba(255,255,255,0.15)' }} tickLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`, 'Conversão']} />
                        <Bar dataKey="conv" name="Conversão %" radius={[0, 4, 4, 0]} maxBarSize={24} fill={CHART_AMBER}>
                          {data.ranking.map((_: any, i: number) => (
                            <Cell key={i} fill={`rgba(197,160,40,${1 - i * 0.12})`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>}
          </Panel>

          <Panel title="Submissões por tipo de CTA">
            {loading
              ? <div className="h-40 bg-white/3 rounded-lg animate-pulse" />
              : !data?.porCta?.length
                ? <Empty />
                : <div style={{ width: '100%', height: 208 }}>
                    <ResponsiveContainer>
                      <BarChart
                        data={(data.porCta).map((c: any) => ({ ...c, label: CTA_LABELS[c.key] || c.key }))}
                        margin={{ top: 8, left: -20, right: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-12} textAnchor="end" height={48} axisLine={{ stroke: 'rgba(255,255,255,0.15)' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: 'rgba(255,255,255,0.15)' }} tickLine={false} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Bar dataKey="submits" name="Submissões" fill={CHART_AMBER} radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>}
          </Panel>
        </div>

        {/* Heatmap submissões + Origem UTM */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Demanda por dia × hora — Submissões">
            <DayHourHeatmap data={data?.heatmap || []} loading={loading} />
          </Panel>
          <Panel title="Origem das submissões (UTM)">
            {loading
              ? <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-7 bg-white/5 rounded animate-pulse" />)}</div>
              : !(data?.porOrigem || []).length
                ? <Empty />
                : (() => {
                    const total = data.porOrigem.reduce((s: number, x: any) => s + x.submits, 0)
                    const max = Math.max(1, ...data.porOrigem.map((x: any) => x.submits))
                    return (
                      <div className="space-y-2.5">
                        {(data.porOrigem).map((o: any) => {
                          const barPct = Math.round((o.submits / max) * 100)
                          const sharePct = total > 0 ? Math.round((o.submits / total) * 100) : 0
                          return (
                            <div key={o.key} className="flex items-center gap-3">
                              <span className="w-28 text-xs text-slate-400 truncate shrink-0 font-medium">{o.key}</span>
                              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct}%`, background: `rgba(197,160,40,${0.4 + (barPct / 100) * 0.55})` }} />
                              </div>
                              <span className="w-8 text-right text-sm font-semibold text-white tabular-nums">{o.submits}</span>
                              <span className="w-9 text-right text-[11px] text-slate-500 tabular-nums">{sharePct}%</span>
                            </div>
                          )
                        })}
                        {/* Total */}
                        <div className="flex items-center gap-3 pt-2 mt-1 border-t border-white/8">
                          <span className="w-28 text-xs text-slate-400 shrink-0 font-semibold">Total</span>
                          <div className="flex-1" />
                          <span className="w-8 text-right text-sm font-bold text-white tabular-nums">{total}</span>
                          <span className="w-9 text-right text-[11px] font-semibold text-slate-400 tabular-nums">100%</span>
                        </div>
                      </div>
                    )
                  })()}
          </Panel>
        </div>

        {/* Leads por hora */}
        <Panel title="Leads gerados por faixa de hora">
          <HourlyVolumeBar data={data?.leadsHourly || []} loading={loading} />
        </Panel>

        {/* Insights */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Insights automáticos</h2>
          {loading && <div className="h-12 bg-[#112240] border border-white/5 rounded-xl animate-pulse" />}
          {!loading && (data?.insights || []).length === 0 && (
            <p className="text-sm text-slate-500 bg-[#112240] border border-white/5 rounded-xl px-5 py-4">
              Sem insights suficientes no período selecionado.
            </p>
          )}
          <div className="space-y-2">
            {(data?.insights || []).map((ins: any, i: number) => <InsightCard key={i} ins={ins} />)}
          </div>
        </div>

      </div>
    </div>
  )
}

function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (iso: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-500 font-medium pl-0.5">{label}</span>
      <div className="relative flex items-center">
        {/* Campo de texto com máscara dd/mm/aaaa */}
        <DateInputPtBR
          value={value}
          onChange={onChange}
          className="h-[34px] pl-2.5 pr-8 w-[118px] rounded-lg bg-[#112240] border border-white/8 text-[13px] text-slate-200 outline-none focus:border-[#c5a028] transition-colors"
        />
        {/* Ícone decorativo — pointer-events-none para não bloquear o input de data abaixo */}
        <CalendarIcon className="absolute right-2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        {/* Input nativo transparente sobrepõe a área do ícone — clicar abre o calendário do SO */}
        <input
          type="date"
          value={value}
          onChange={e => e.target.value && onChange(e.target.value)}
          className="absolute right-0 w-9 h-full opacity-0 cursor-pointer"
          tabIndex={-1}
          aria-label={`Calendário ${label}`}
        />
      </div>
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function KpiCard({ icon, label, value, delta, hint, loading }: {
  icon: React.ReactNode; label: string; value?: any; delta?: number | null; hint?: string; loading: boolean
}) {
  const up = typeof delta === 'number' && delta >= 0

  return (
    <div className="bg-[#112240] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#c5a028]/10 border border-[#c5a028]/20 mb-4 text-[#d4af37]">
        {icon}
      </div>
      <p className="text-xs text-slate-400 font-medium mb-1.5">{label}</p>
      {loading
        ? <div className="h-8 w-20 bg-white/5 rounded-lg animate-pulse" />
        : <p className="text-3xl font-bold text-white tabular-nums leading-none">{value ?? '—'}</p>}
      <div className="mt-2.5 min-h-[18px]">
        {typeof delta === 'number' && !loading && (
          <div className={`inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${up ? 'bg-[#c5a028]/12 text-[#d4af37]' : 'bg-rose-500/10 text-rose-400'}`}>
            {up ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
            {Math.abs(delta)}% vs período anterior
          </div>
        )}
        {hint && typeof delta !== 'number' && !loading && (
          <p className="text-[11px] text-slate-500">{hint}</p>
        )}
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#112240] border border-white/5 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/5">
        <h3 className="text-[13px] font-semibold text-slate-300">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Empty() {
  return <p className="text-sm text-slate-500 text-center py-8">Sem dados no período.</p>
}

function InsightCard({ ins }: { ins: any }) {
  const cfg: Record<string, { bg: string; border: string; text: string; muted: string; Icon: any }> = {
    success: { bg: 'bg-[#c5a028]/8',   border: 'border-[#c5a028]/20', text: 'text-[#d4af37]', muted: 'text-slate-300', Icon: TrophyIcon },
    info:    { bg: 'bg-white/3',        border: 'border-white/8',      text: 'text-slate-400', muted: 'text-slate-300', Icon: ChatBubbleLeftRightIcon },
    warning: { bg: 'bg-rose-500/8',     border: 'border-rose-500/20',  text: 'text-rose-400',  muted: 'text-slate-300', Icon: ExclamationTriangleIcon },
    neutral: { bg: 'bg-white/3',        border: 'border-white/6',      text: 'text-slate-500', muted: 'text-slate-400', Icon: ClockIcon },
  }
  const c = cfg[ins.type] || cfg.neutral
  return (
    <div className={`flex items-start gap-3 ${c.bg} border ${c.border} rounded-xl px-4 py-3`}>
      <c.Icon className={`w-4 h-4 ${c.text} shrink-0 mt-0.5`} />
      <span className={`text-sm ${c.muted} leading-relaxed`}>{ins.text}</span>
    </div>
  )
}
