'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChartBarIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { adminFetch } from '@/lib/auth/adminFetch'
import DateInputPtBR from '@/components/ui/DateInputPtBR'
import ConversationThread from '@/components/mensageria/ConversationThread'

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', webform: 'Formulário', manual: 'Manual', chatbot: 'Chatbot', webchat: 'Chat do site',
}
const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  open: { label: 'Aberta', className: 'bg-amber-500/12 text-amber-400' },
  pending: { label: 'Pendente', className: 'bg-amber-500/12 text-amber-400' },
  snoozed: { label: 'Adiada', className: 'bg-slate-500/15 text-slate-400' },
  resolved: { label: 'Resolvida', className: 'bg-emerald-500/12 text-emerald-400' },
}
const PRIORITY_LABELS: Record<string, { label: string; dot: string }> = {
  low: { label: 'Baixa', dot: 'bg-slate-500' },
  medium: { label: 'Média', dot: 'bg-blue-400' },
  high: { label: 'Alta', dot: 'bg-amber-400' },
  urgent: { label: 'Urgente', dot: 'bg-rose-500' },
}

interface Row {
  id: string
  status: string
  priority: string | null
  lastMessageAt: string | null
  channelType: string
  teamId: string | null
  teamName: string | null
  firstResponseDurationSec: number | null
  assignee: { id: string; name: string } | null
  contact: { id: string; name: string | null; phone: string | null }
}
interface Team { id: string; name: string }
interface TenantUser { id: string; nome: string }

function formatDuration(sec: number | null): string {
  if (sec == null) return '—'
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.round(sec / 60)}min`
  return `${(sec / 3600).toFixed(1)}h`
}

function formatFullDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

const PAGE_SIZE = 20

export default function PainelDoGestorPage() {
  const [scopeLevel, setScopeLevel] = useState<'full' | 'team' | 'own' | null>(null)

  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<TenantUser[]>([])

  const [teamId, setTeamId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [channelType, setChannelType] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [sortBy, setSortBy] = useState<'lastMessageAt' | 'firstResponseDurationSec'>('lastMessageAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const [rows, setRows] = useState<Row[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [kpis, setKpis] = useState<{ emAberto: number; slaEstourado: number; tempoMedioSegundos: number | null } | null>(null)
  const [loading, setLoading] = useState(true)

  const [drawerId, setDrawerId] = useState<string | null>(null)

  useEffect(() => {
    adminFetch('/api/admin/mensageria/my-scope').then((r) => r.json()).then((d) => setScopeLevel(d.level ?? null)).catch(() => setScopeLevel(null))
    adminFetch('/api/admin/mensageria/teams').then((r) => r.json()).then((d) => setTeams(d.teams || [])).catch(() => {})
    adminFetch('/api/admin/mensageria/users').then((r) => r.json()).then((d) => setUsers(d.users || [])).catch(() => {})
  }, [])

  // Guarda de sequência — quando um filtro muda, o efeito de reset de página dispara
  // uma 2ª busca (com page=1) logo após a 1ª (com a página antiga). Se a resposta da
  // busca antiga chegar depois da nova (rede fora de ordem), ela sobrescreveria o
  // resultado correto com um errado. requestSeqRef ignora qualquer resposta que não
  // seja da última requisição disparada.
  const requestSeqRef = useRef(0)

  async function load() {
    const seq = ++requestSeqRef.current
    setLoading(true)
    const qs = new URLSearchParams()
    qs.set('page', String(page))
    qs.set('pageSize', String(PAGE_SIZE))
    qs.set('sortBy', sortBy)
    qs.set('sortDir', sortDir)
    qs.set('includeKpis', '1')
    if (teamId) qs.set('teamId', teamId)
    if (assigneeId) qs.set('assigneeId', assigneeId)
    if (channelType) qs.set('channelType', channelType)
    if (status) qs.set('status', status)
    if (priority) qs.set('priority', priority)
    if (dateFrom) qs.set('dateFrom', dateFrom)
    if (dateTo) qs.set('dateTo', dateTo)
    try {
      const res = await adminFetch(`/api/admin/mensageria/conversations?${qs}`)
      const data = await res.json()
      if (seq !== requestSeqRef.current) return // resposta desatualizada — ignora
      setRows(data.conversations || [])
      setTotalCount(data.totalCount ?? 0)
      setTotalPages(data.totalPages ?? 1)
      setKpis(data.kpis ?? null)
    } finally {
      if (seq === requestSeqRef.current) setLoading(false)
    }
  }

  useEffect(() => { load() }, [teamId, assigneeId, channelType, status, priority, dateFrom, dateTo, sortBy, sortDir, page])
  useEffect(() => { setPage(1) }, [teamId, assigneeId, channelType, status, priority, dateFrom, dateTo])

  function toggleSort(col: 'lastMessageAt' | 'firstResponseDurationSec') {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortBy(col); setSortDir('desc') }
  }

  const channelOptions = useMemo(() => Object.entries(CHANNEL_LABELS), [])

  if (scopeLevel === 'own') {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#020c1b] flex items-center justify-center px-6">
        <p className="text-sm text-slate-500">Esta área é restrita a administradores e líderes de time.</p>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#020c1b] px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <ChartBarIcon className="w-5 h-5 text-[#d4af37]" />
          <h1 className="text-lg font-semibold text-white">Painel do Gestor</h1>
        </div>
        <p className="text-sm text-slate-400 mb-6">
          Fila operacional ao vivo{scopeLevel === 'team' ? ' — escopo do(s) time(s) que você lidera' : ''}.
        </p>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Conversas no período" value={String(totalCount)} />
          <KpiCard label="Em aberto" value={kpis ? String(kpis.emAberto) : '—'} />
          <KpiCard label="SLA estourado" value={kpis ? String(kpis.slaEstourado) : '—'} tone={kpis && kpis.slaEstourado > 0 ? 'danger' : undefined} />
          <KpiCard label="1ª resposta média" value={kpis ? formatDuration(kpis.tempoMedioSegundos) : '—'} />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-2 mb-4">
          <FilterSelect label="Time" value={teamId} onChange={setTeamId}>
            <option value="">Todos</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Atendente" value={assigneeId} onChange={setAssigneeId}>
            <option value="">Todos</option>
            <option value="unassigned">Não atribuídas</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </FilterSelect>
          <FilterSelect label="Canal" value={channelType} onChange={setChannelType}>
            <option value="">Todos</option>
            {channelOptions.map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}
          </FilterSelect>
          <FilterSelect label="Status" value={status} onChange={setStatus}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([slug, s]) => <option key={slug} value={slug}>{s.label}</option>)}
          </FilterSelect>
          <FilterSelect label="Prioridade" value={priority} onChange={setPriority}>
            <option value="">Todas</option>
            {Object.entries(PRIORITY_LABELS).map(([slug, p]) => <option key={slug} value={slug}>{p.label}</option>)}
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
          {(teamId || assigneeId || channelType || status || priority || dateFrom || dateTo) && (
            <button
              onClick={() => { setTeamId(''); setAssigneeId(''); setChannelType(''); setStatus(''); setPriority(''); setDateFrom(''); setDateTo('') }}
              className="h-8 px-2 text-xs text-slate-500 hover:text-slate-300"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Tabela */}
        <div className="rounded-xl bg-[#0a192f] border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-[11px] text-slate-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 font-medium">Atendente</th>
                <th className="px-4 py-2.5 font-medium">Contato</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">SLA</th>
                <SortableTh label="1ª resposta" col="firstResponseDurationSec" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                <SortableTh label="Última msg" col="lastMessageAt" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={6} className="px-4 py-3"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">Nenhuma conversa encontrada com esses filtros.</td></tr>
              ) : (
                rows.map((r) => {
                  const st = STATUS_LABELS[r.status] || { label: r.status, className: 'bg-white/5 text-slate-400' }
                  const pr = r.priority ? PRIORITY_LABELS[r.priority] : null
                  return (
                    <tr key={r.id} onClick={() => setDrawerId(r.id)} className="border-b border-white/5 hover:bg-white/3 cursor-pointer transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="text-xs font-medium text-slate-200">{r.assignee?.name || <span className="text-slate-500">Não atribuída</span>}</div>
                        {r.teamName && <div className="text-[10px] text-slate-500">{r.teamName}</div>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#c5a028]/15 border border-[#c5a028]/20 flex items-center justify-center text-[9px] font-semibold text-[#d4af37] shrink-0">
                            {initials(r.contact.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-slate-200 truncate max-w-[160px]">{r.contact.name || r.contact.phone || 'Sem nome'}</div>
                            <div className="text-[10px] text-slate-500">{CHANNEL_LABELS[r.channelType] || r.channelType}</div>
                          </div>
                          {pr && <span className={`w-1.5 h-1.5 rounded-full ${pr.dot} shrink-0`} title={pr.label} />}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${st.className}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">—</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400">{formatDuration(r.firstResponseDurationSec)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400" title={formatFullDate(r.lastMessageAt)}>{timeAgo(r.lastMessageAt)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {/* Paginação numerada */}
          {!loading && rows.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
              <p className="text-[11px] text-slate-500">
                Página {page} de {totalPages} · {totalCount} conversas
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/3 border border-white/8 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/3 border border-white/8 text-slate-400 disabled:opacity-30 hover:text-white transition-colors">
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawer — reaproveita o componente de thread da Caixa de Entrada */}
      {drawerId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerId(null)} />
          <div className="relative w-full max-w-xl h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 bg-[#020c1b] border-b border-white/5">
              <span className="text-xs text-slate-500">Atendimento</span>
              <button onClick={() => setDrawerId(null)} className="text-slate-500 hover:text-white transition-colors">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ConversationThread conversationId={drawerId} onUpdated={load} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, tone }: { label: string; value: string; tone?: 'danger' }) {
  return (
    <div className="rounded-xl bg-[#0a192f] border border-white/8 p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${tone === 'danger' ? 'text-rose-400' : 'text-white'}`}>{value}</p>
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

function SortableTh({ label, col, sortBy, sortDir, onSort }: {
  label: string; col: 'lastMessageAt' | 'firstResponseDurationSec'
  sortBy: string; sortDir: 'asc' | 'desc'; onSort: (col: 'lastMessageAt' | 'firstResponseDurationSec') => void
}) {
  const active = sortBy === col
  return (
    <th className="px-4 py-2.5 font-medium">
      <button onClick={() => onSort(col)} className={`inline-flex items-center gap-0.5 hover:text-slate-300 transition-colors ${active ? 'text-[#d4af37]' : ''}`}>
        {label}
        {active && (sortDir === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />)}
      </button>
    </th>
  )
}
