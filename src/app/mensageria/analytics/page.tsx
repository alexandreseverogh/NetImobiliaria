'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { ChartBarIcon } from '@heroicons/react/24/outline'
import { adminFetch } from '@/lib/auth/adminFetch'
import DateInputPtBR from '@/components/ui/DateInputPtBR'
import DayHourHeatmap from '@/components/marketing/charts/DayHourHeatmap'
import HourlyVolumeBar from '@/components/marketing/charts/HourlyVolumeBar'

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', webform: 'Formulário', manual: 'Manual', chatbot: 'Chatbot', webchat: 'Chat do site',
}
const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: '#22c55e', webform: '#3b82f6', manual: '#c5a028', chatbot: '#a855f7', webchat: '#06b6d4',
}

interface Kpis {
  novas: number; resolvidas: number; abertas: number; deltaNovasPct: number | null
  backlogNaoAtribuido: number; slaEstourado: number
  medianaPrimeiraRespostaSeg: number | null; medianaResolucaoSeg: number | null
  taxaResolucaoBotPct: number
}
interface Team { id: string; name: string }
interface TenantUser { id: string; nome: string }

function formatDuration(sec: number | null): string {
  if (sec == null) return '—'
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.round(sec / 60)}min`
  return `${(sec / 3600).toFixed(1)}h`
}

export default function MensageriaAnalyticsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<TenantUser[]>([])
  const [teamId, setTeamId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [channelType, setChannelType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    adminFetch('/api/admin/mensageria/teams').then((r) => r.json()).then((d) => setTeams(d.teams || [])).catch(() => {})
    adminFetch('/api/admin/mensageria/users').then((r) => r.json()).then((d) => setUsers(d.users || [])).catch(() => {})
  }, [])

  // Data inicial depois da final é fácil de acontecer digitando (ex: só trocou o "De" e
  // esqueceu de ajustar o "Até") — sem essa checagem, a API responde 200 com tudo
  // zerado/vazio (intervalo logicamente sem nenhum dia), o que parece "nada é exibido"
  // sem nenhuma explicação na tela.
  const invertedRange = !!(dateFrom && dateTo && dateFrom > dateTo)

  // Guarda de sequência — mesma proteção aplicada no Painel do Gestor (seção 17): se a
  // resposta de uma busca antiga chegar depois da nova, ela não deve sobrescrever o resultado
  // correto com um desatualizado.
  const requestSeqRef = useRef(0)

  useEffect(() => {
    if (invertedRange) { setLoading(false); return }
    const seq = ++requestSeqRef.current
    setLoading(true)
    const qs = new URLSearchParams()
    if (teamId) qs.set('teamId', teamId)
    if (assigneeId) qs.set('assigneeId', assigneeId)
    if (channelType) qs.set('channelType', channelType)
    if (dateFrom) qs.set('dateFrom', dateFrom)
    if (dateTo) qs.set('dateTo', dateTo)
    adminFetch(`/api/admin/mensageria/analytics?${qs}`)
      .then((r) => r.json())
      .then((d) => { if (seq === requestSeqRef.current) setData(d) })
      .finally(() => { if (seq === requestSeqRef.current) setLoading(false) })
  }, [teamId, assigneeId, channelType, dateFrom, dateTo, invertedRange])

  const kpis: Kpis | null = data?.kpis ?? null

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#020c1b] px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <ChartBarIcon className="w-5 h-5 text-[#d4af37]" />
          <h1 className="text-lg font-semibold text-white">Analytics de Mensagens</h1>
        </div>
        <p className="text-sm text-slate-400 mb-6">
          Tendências e histórico do período — complementar ao Painel do Gestor (fila ao vivo).
        </p>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-2 mb-5">
          <FilterSelect label="Time" value={teamId} onChange={setTeamId}>
            <option value="">Todos</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Atendente" value={assigneeId} onChange={setAssigneeId}>
            <option value="">Todos</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </FilterSelect>
          <FilterSelect label="Canal" value={channelType} onChange={setChannelType}>
            <option value="">Todos</option>
            {Object.entries(CHANNEL_LABELS).map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}
          </FilterSelect>
          <div className="flex items-end gap-1.5">
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">De</label>
              <DateInputPtBR value={dateFrom} onChange={setDateFrom} className="h-8 px-2 rounded-lg bg-[#0a192f] border border-white/8 text-xs text-slate-300 outline-none focus:border-[#c5a028]" />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 mb-1">Até</label>
              <DateInputPtBR value={dateTo} onChange={setDateTo} className="h-8 px-2 rounded-lg bg-[#0a192f] border border-white/8 text-xs text-slate-300 outline-none focus:border-[#c5a028]" />
            </div>
          </div>
          {(teamId || assigneeId || channelType || dateFrom || dateTo) && (
            <button
              onClick={() => { setTeamId(''); setAssigneeId(''); setChannelType(''); setDateFrom(''); setDateTo('') }}
              className="h-8 px-2 text-xs text-slate-500 hover:text-slate-300"
            >
              Limpar filtros
            </button>
          )}
          {data?.period && !invertedRange && (
            <span className="text-[11px] text-slate-500 ml-auto">
              Período: {data.period.dateFrom.split('-').reverse().join('/')} a {data.period.dateTo.split('-').reverse().join('/')}
            </span>
          )}
        </div>

        {invertedRange && (
          <div className="mb-5 rounded-lg bg-amber-500/8 border border-amber-500/25 px-4 py-3">
            <p className="text-xs text-amber-200/90">
              A <strong>Data inicial</strong> está depois da <strong>Data final</strong> — não há nenhum dia nesse
              intervalo, por isso tudo abaixo aparece zerado. Ajuste as datas pra ver os dados.
            </p>
          </div>
        )}

        {/* KPIs do período — respeitam De/Até selecionados acima */}
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Do período selecionado</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <KpiCard label="Novas conversas" value={kpis ? String(kpis.novas) : '—'} delta={kpis?.deltaNovasPct ?? null} />
          <KpiCard label="Resolvidas" value={kpis ? String(kpis.resolvidas) : '—'} />
          <KpiCard label="1ª resposta (mediana)" value={kpis ? formatDuration(kpis.medianaPrimeiraRespostaSeg) : '—'} />
          <KpiCard label="Resolução (mediana)" value={kpis ? formatDuration(kpis.medianaResolucaoSeg) : '—'} />
          <KpiCard label="Resolvidas pelo bot" value={kpis ? `${kpis.taxaResolucaoBotPct}%` : '—'} />
        </div>

        {/* KPIs "agora" — fotografia do estado atual, sempre ignoram o filtro de período */}
        <div className="flex items-center gap-1.5 mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Agora</p>
          <span className="text-[10px] text-slate-600">— independente do período acima, é o estado da fila neste momento</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Em aberto" value={kpis ? String(kpis.abertas) : '—'} />
          <KpiCard label="Backlog não atribuído" value={kpis ? String(kpis.backlogNaoAtribuido) : '—'} tone={kpis && kpis.backlogNaoAtribuido > 0 ? 'warn' : undefined} />
          <KpiCard label="SLA estourado" value={kpis ? String(kpis.slaEstourado) : '—'} tone={kpis && kpis.slaEstourado > 0 ? 'danger' : undefined} />
        </div>

        {/* Volume diário + Distribuição por canal */}
        <div className="grid lg:grid-cols-2 gap-4 mb-5">
          <Panel title="Volume diário — novas × resolvidas">
            {loading ? <ChartSkeleton /> : (data?.tendenciaDiaria?.length ?? 0) === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.tendenciaDiaria} barGap={2} barCategoryGap="30%">
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(d: string) => d.slice(5).split('-').reverse().join('/')} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ background: '#112240', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#e2e8f0' }}
                    labelFormatter={(d: string) => d.split('-').reverse().join('/')}
                  />
                  <Bar dataKey="novas" name="Novas" fill="#c5a028" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="resolvidas" name="Resolvidas (mesmo dia)" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Distribuição por canal">
            {loading ? <ChartSkeleton /> : (data?.porCanal?.length ?? 0) === 0 ? <Empty /> : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={data.porCanal} dataKey="count" nameKey="channelType" innerRadius={40} outerRadius={65} paddingAngle={2}>
                      {data.porCanal.map((c: any, i: number) => <Cell key={i} fill={CHANNEL_COLORS[c.channelType] || '#64748b'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#112240', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {data.porCanal.map((c: any) => (
                    <span key={c.channelType} className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="w-2 h-2 rounded-full" style={{ background: CHANNEL_COLORS[c.channelType] || '#64748b' }} />
                      {CHANNEL_LABELS[c.channelType] || c.channelType} — {c.pct}%
                    </span>
                  ))}
                </div>
              </>
            )}
          </Panel>
        </div>

        {/* Heatmap + Funil */}
        <div className="grid lg:grid-cols-2 gap-4 mb-5">
          <Panel title="Demanda por dia × hora" subtitle="Toda conversa criada, de qualquer canal — grade por dia da semana">
            <DayHourHeatmap data={data?.heatmap || []} loading={loading} />
          </Panel>
          <Panel title="Funil bot → humano → resolvido">
            {loading ? <ChartSkeleton /> : (
              <div className="space-y-2">
                <FunnelBar label="Total de conversas" value={data?.funil?.total ?? 0} max={data?.funil?.total ?? 1} color="#c5a028" />
                <FunnelBar label="Atendidas por humano" value={data?.funil?.humano ?? 0} max={data?.funil?.total ?? 1} color="#3b82f6" />
                <FunnelBar label="Resolvidas" value={data?.funil?.resolvidas ?? 0} max={data?.funil?.total ?? 1} color="#22c55e" />
                <p className="text-[10px] text-slate-500 pt-1">Deflection por bot ainda não disponível — chatbot chega na fase M4.</p>
              </div>
            )}
          </Panel>
        </div>

        {/* Mensagens por faixa horária — pico do dia, para dimensionar bot/atendentes humanos */}
        <div className="mb-5">
          <Panel title="Demanda por faixa horária" subtitle="Mensagem recebida do contato (WhatsApp/formulário/chatbot) + 1º contato de atendimento manual — soma o período inteiro por hora do dia">
            <HourlyVolumeBar data={data?.mensagensPorHora || []} loading={loading} />
          </Panel>
        </div>

        {/* Ranking + Leaderboard */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Ranking de atendentes">
            {loading ? <ChartSkeleton /> : (data?.rankingAtendentes?.length ?? 0) === 0 ? <Empty /> : (
              <RankTable rows={data.rankingAtendentes.map((r: any) => ({ name: r.name, volume: r.volume, tempo: formatDuration(r.tempoMedioSeg) }))} />
            )}
          </Panel>
          <Panel title="Leaderboard de times">
            {loading ? <ChartSkeleton /> : (data?.leaderboardTimes?.length ?? 0) === 0 ? <Empty /> : (
              <RankTable rows={data.leaderboardTimes.map((r: any) => ({ name: r.name, volume: r.volume, tempo: formatDuration(r.tempoMedioSeg) }))} />
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}

function Panel({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-[#0a192f] border border-white/8 p-4 ${className}`}>
      <p className="text-xs font-medium text-slate-300">{title}</p>
      {subtitle && <p className="text-[10px] text-slate-500 mb-3">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </div>
  )
}

function KpiCard({ label, value, delta, tone }: { label: string; value: string; delta?: number | null; tone?: 'danger' | 'warn' }) {
  return (
    <div className="rounded-xl bg-[#0a192f] border border-white/8 p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className={`text-2xl font-semibold ${tone === 'danger' ? 'text-rose-400' : tone === 'warn' ? 'text-amber-400' : 'text-white'}`}>{value}</p>
        {delta != null && (
          <span className={`text-[11px] font-medium ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {delta >= 0 ? '+' : ''}{delta}% vs período anterior
          </span>
        )}
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-slate-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 px-2 rounded-lg bg-[#0a192f] border border-white/8 text-xs text-slate-300 outline-none focus:border-[#c5a028]"
      >
        {children}
      </select>
    </div>
  )
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
        <span>{label}</span>
        <span className="text-slate-300 font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function RankTable({ rows }: { rows: { name: string; volume: number; tempo: string }[] }) {
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#112240]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] text-slate-500 w-4 shrink-0">{i + 1}º</span>
            <span className="text-xs text-slate-200 truncate">{r.name}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-slate-400">{r.volume} conversas</span>
            <span className="text-[11px] text-slate-500">{r.tempo}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return <div className="h-40 bg-white/3 rounded-lg animate-pulse" />
}

function Empty() {
  return <p className="text-sm text-slate-500 text-center py-8">Sem dados no período.</p>
}
