'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts'
import {
  ChartBarIcon, EyeIcon, InboxArrowDownIcon, UserPlusIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, ExclamationTriangleIcon,
  TrophyIcon, ClockIcon, ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
import { adminFetch } from '@/lib/auth/adminFetch'

const CTA_LABELS: Record<string, string> = {
  WHATSAPP_MESSAGE: 'WhatsApp', LEARN_MORE: 'Saiba Mais', SHOP_NOW: 'Comprar Agora',
  SIGN_UP: 'Cadastre-se', CONTACT_US: 'Fale Conosco', BOOK_TRAVEL: 'Reserve', GET_OFFER: 'Ver Oferta',
}
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function CtaAnalyticsPage() {
  const [days, setDays] = useState(30)
  const [clientId, setClientId] = useState('all')
  const [destinationId, setDestinationId] = useState('')
  const [ctaType, setCtaType] = useState('')
  const [destinos, setDestinos] = useState<any[]>([])
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetch('/api/admin/campanhas/destinos').then(r => r.json()).then(d => setDestinos(d.destinos || [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const to = new Date()
    const from = new Date(Date.now() - days * 864e5)
    const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), clientId })
    if (destinationId) qs.set('destinationId', destinationId)
    if (ctaType) qs.set('ctaType', ctaType)
    adminFetch(`/api/admin/campanhas/cta-analytics?${qs}`)
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [days, clientId, destinationId, ctaType])

  const k = data?.kpis
  const funnelMax = useMemo(() => Math.max(1, ...(data?.funnel || []).map((f: any) => f.value)), [data])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <ChartBarIcon className="w-6 h-6 text-gray-700" />
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Demanda &amp; Captura de CTA</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">Visualizações, submissões e leads gerados — isolado por segmento.</p>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Sel value={clientId} onChange={setClientId} label="Segmento">
          <option value="all">Todos os segmentos</option>
          <option value="own">Próprio (own)</option>
        </Sel>
        <Sel value={destinationId} onChange={setDestinationId} label="Destino">
          <option value="">Todos os destinos</option>
          {destinos.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Sel>
        <Sel value={ctaType} onChange={setCtaType} label="CTA">
          <option value="">Todos os CTAs</option>
          {Object.entries(CTA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Sel>
        <Sel value={String(days)} onChange={(v) => setDays(Number(v))} label="Período">
          <option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option>
        </Sel>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi icon={<EyeIcon className="w-4 h-4" />} label="Visualizações" value={k?.views} delta={k?.deltaViews} loading={loading} />
        <Kpi icon={<InboxArrowDownIcon className="w-4 h-4" />} label="Submissões" value={k?.submits} delta={k?.deltaSubmits} loading={loading} />
        <Kpi icon={<ArrowTrendingUpIcon className="w-4 h-4" />} label="Conversão" value={k ? `${k.conversion}%` : undefined} loading={loading} />
        <Kpi icon={<UserPlusIcon className="w-4 h-4" />} label="Leads no CRM" value={k?.leads} hint={k ? `${k.aproveitamento}% das submissões` : ''} loading={loading} />
      </div>

      {/* Funil + Tendência */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Funil de conversão">
          <div className="space-y-2.5 pt-1">
            {(data?.funnel || []).map((f: any, i: number) => {
              const teal = ['#9FE1CB', '#5DCAA5', '#1D9E75', '#0F6E56'][i]
              const prev = data.funnel[i - 1]?.value
              return (
                <div key={f.stage} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-gray-500 shrink-0">{f.stage}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden">
                    <div className="h-full rounded-md" style={{ width: `${Math.round((f.value / funnelMax) * 100)}%`, background: teal }} />
                  </div>
                  <span className="w-28 text-right text-sm font-semibold tabular-nums">
                    {(f.value || 0).toLocaleString('pt-BR')}
                    {prev ? <span className="text-gray-400 font-normal"> · {Math.round((f.value / prev) * 100)}%</span> : null}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="Tendência diária">
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={data?.trend || []} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip />
                <Line type="monotone" dataKey="views" name="Visualizações" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="submits" name="Submissões" stroke="#059669" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Ranking + por CTA */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <Card title="Ranking de destinos (conversão %)">
          <div style={{ width: '100%', height: Math.max(140, (data?.ranking?.length || 1) * 38 + 20) }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={data?.ranking || []} margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#555' }} />
                <Tooltip />
                <Bar dataKey="conv" name="Conversão %" radius={[0, 4, 4, 0]}>
                  {(data?.ranking || []).map((_: any, i: number) => <Cell key={i} fill="#1D9E75" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Submissões por tipo de CTA">
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={(data?.porCta || []).map((c: any) => ({ ...c, label: CTA_LABELS[c.key] || c.key }))} margin={{ top: 8, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888' }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip />
                <Bar dataKey="submits" name="Submissões" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Heatmap + Origem */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card title="Demanda por dia × hora">
          <Heatmap data={data?.heatmap || []} />
        </Card>
        <Card title="Origem das submissões (UTM)">
          <div className="space-y-2 pt-1">
            {(data?.porOrigem || []).length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Sem dados no período.</p>}
            {(data?.porOrigem || []).map((o: any) => {
              const max = Math.max(1, ...data.porOrigem.map((x: any) => x.submits))
              return (
                <div key={o.key} className="flex items-center gap-3">
                  <span className="w-28 text-xs text-gray-600 truncate shrink-0">{o.key}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                    <div className="h-full rounded bg-indigo-500" style={{ width: `${Math.round((o.submits / max) * 100)}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold tabular-nums">{o.submits}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Insights */}
      <h2 className="text-sm font-semibold text-gray-700 mb-2">Insights automáticos</h2>
      <div className="space-y-2">
        {loading && <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />}
        {!loading && (data?.insights || []).length === 0 && <p className="text-sm text-gray-400">Sem insights suficientes no período.</p>}
        {(data?.insights || []).map((ins: any, i: number) => <Insight key={i} ins={ins} />)}
      </div>
    </div>
  )
}

function Sel({ value, onChange, label, children }: any) {
  return (
    <label className="inline-flex flex-col">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="h-10 px-3 rounded-lg border border-gray-300 text-sm text-gray-800 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
        {children}
      </select>
    </label>
  )
}

function Kpi({ icon, label, value, delta, hint, loading }: any) {
  const up = typeof delta === 'number' && delta >= 0
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1.5">{icon}{label}</div>
      {loading ? <div className="h-7 w-16 bg-gray-200 rounded animate-pulse" /> : (
        <div className="text-2xl font-bold text-gray-900 tabular-nums">{value ?? '—'}</div>
      )}
      {typeof delta === 'number' && (
        <div className={`flex items-center gap-1 text-xs mt-1 ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
          {up ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" /> : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />}
          {Math.abs(delta)}%
        </div>
      )}
      {hint && !delta && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  )
}

function Card({ title, children }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="text-xs text-gray-500 mb-2">{title}</div>
      {children}
    </div>
  )
}

function Heatmap({ data }: { data: any[] }) {
  const grid: Record<string, number> = {}
  let max = 1
  for (const d of data) { grid[`${d.dow}-${d.hour}`] = d.n; if (d.n > max) max = d.n }
  const hours = [0, 3, 6, 9, 12, 15, 18, 21]
  return (
    <div className="overflow-x-auto pt-1">
      <table className="border-separate" style={{ borderSpacing: 2 }}>
        <tbody>
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => (
            <tr key={dow}>
              <td className="text-[10px] text-gray-400 pr-1.5 align-middle">{DOW[dow]}</td>
              {Array.from({ length: 24 }).map((_, h) => {
                const n = grid[`${dow}-${h}`] || 0
                const a = n === 0 ? 0 : 0.15 + (n / max) * 0.85
                return <td key={h} title={`${DOW[dow]} ${h}h: ${n}`} style={{ width: 11, height: 14, borderRadius: 2, background: n === 0 ? '#f3f4f6' : `rgba(29,158,117,${a})` }} />
              })}
            </tr>
          ))}
          <tr>
            <td />
            {Array.from({ length: 24 }).map((_, h) => (
              <td key={h} className="text-[8px] text-gray-300 text-center">{hours.includes(h) ? h : ''}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function Insight({ ins }: { ins: any }) {
  const map: Record<string, { bg: string; fg: string; Icon: any }> = {
    success: { bg: 'bg-emerald-50', fg: 'text-emerald-700', Icon: TrophyIcon },
    info: { bg: 'bg-blue-50', fg: 'text-blue-700', Icon: ChatBubbleLeftRightIcon },
    warning: { bg: 'bg-amber-50', fg: 'text-amber-700', Icon: ExclamationTriangleIcon },
    neutral: { bg: 'bg-gray-50', fg: 'text-gray-700', Icon: ClockIcon },
  }
  const c = map[ins.type] || map.neutral
  return (
    <div className={`flex items-start gap-2.5 ${c.bg} rounded-lg px-3 py-2.5`}>
      <c.Icon className={`w-5 h-5 ${c.fg} shrink-0 mt-0.5`} />
      <span className={`text-sm ${c.fg}`}>{ins.text}</span>
    </div>
  )
}
