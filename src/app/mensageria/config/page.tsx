'use client'

import { useEffect, useState } from 'react'
import {
  InboxStackIcon, UsersIcon, TagIcon, ChatBubbleBottomCenterTextIcon,
  ClockIcon, PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon, StarIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { adminFetch } from '@/lib/auth/adminFetch'

type Tab = 'inboxes' | 'teams' | 'labels' | 'canned' | 'sla'

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'inboxes', label: 'Inboxes', icon: InboxStackIcon },
  { id: 'teams', label: 'Times', icon: UsersIcon },
  { id: 'labels', label: 'Etiquetas', icon: TagIcon },
  { id: 'canned', label: 'Respostas Rápidas', icon: ChatBubbleBottomCenterTextIcon },
  { id: 'sla', label: 'SLA', icon: ClockIcon },
]

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', webform: 'Formulário', manual: 'Manual', chatbot: 'Chatbot', webchat: 'Chat do site',
}

interface Inbox {
  id: string; name: string; channelType: string; provider: string; isActive: boolean; createdAt: string
  teamId: string | null; teamName: string | null
}
interface TenantUser { id: string; nome: string }
interface TeamMember { userId: string; name: string; role: string }
interface Team { id: string; name: string; autoAssign: boolean; members: TeamMember[] }
interface Label { id: string; name: string; color: string }
interface CannedResponse { id: string; shortcut: string; content: string }
interface SlaPolicy {
  id: string; name: string; scope: Record<string, any>
  first_response_target_min: number | null; resolution_target_min: number | null; is_active: boolean
}

export default function MensageriaConfigPage() {
  const [tab, setTab] = useState<Tab>('inboxes')

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#020c1b] px-6 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-lg font-semibold text-white mb-1">Configurações — Mensageria</h1>
        <p className="text-sm text-slate-400 mb-6">Canais, times, etiquetas, respostas rápidas e políticas de SLA.</p>

        <div className="flex items-center gap-1 border-b border-white/5 mb-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                tab === t.id ? 'border-[#c5a028] text-[#d4af37]' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'inboxes' && <InboxesTab />}
        {tab === 'teams' && <TeamsTab />}
        {tab === 'labels' && <LabelsTab />}
        {tab === 'canned' && <CannedTab />}
        {tab === 'sla' && <SlaTab />}
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-[#0a192f] border border-white/8 p-4">{children}</div>
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-slate-500 text-center py-8">{text}</p>
}

function TextInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-9 px-3 rounded-lg bg-[#112240] border border-white/8 text-sm text-slate-200 outline-none focus:border-[#c5a028] transition-colors"
    />
  )
}

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#c5a028] text-[#020c1b] text-sm font-medium disabled:opacity-40 hover:bg-[#d4af37] transition-colors"
    >
      {children}
    </button>
  )
}

// ============================================================================
// Inboxes (somente leitura)
// ============================================================================

function InboxesTab() {
  const [inboxes, setInboxes] = useState<Inbox[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [ibRes, teamsRes] = await Promise.all([
        adminFetch('/api/admin/mensageria/inboxes'),
        adminFetch('/api/admin/mensageria/teams'),
      ])
      setInboxes((await ibRes.json()).inboxes || [])
      setTeams((await teamsRes.json()).teams || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function setInboxTeam(inboxId: string, teamId: string) {
    setSavingId(inboxId)
    try {
      await adminFetch(`/api/admin/mensageria/inboxes/${inboxId}`, {
        method: 'PATCH', body: JSON.stringify({ teamId: teamId || null }),
      })
      await load()
    } finally {
      setSavingId(null)
    }
  }

  if (loading) return <Card><p className="text-sm text-slate-500">Carregando...</p></Card>

  return (
    <Card>
      <p className="text-xs text-slate-500 mb-3">
        Canais de entrada são criados automaticamente na primeira mensagem de cada tipo (WhatsApp, Formulário, Manual).
        Vincule um <strong className="text-slate-400">time responsável</strong> para que conversas novas nesse canal sejam
        auto-atribuídas ao membro com menos conversas em aberto (só funciona se o time tiver &quot;Auto-atribuição ativa&quot;).
      </p>
      {inboxes.length === 0 ? (
        <EmptyState text="Nenhuma inbox criada ainda. Envie/receba uma mensagem para que o canal apareça aqui." />
      ) : (
        <div className="space-y-2">
          {inboxes.map((ib) => (
            <div key={ib.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[#112240] border border-white/8">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{ib.name}</p>
                <p className="text-xs text-slate-500">{CHANNEL_LABELS[ib.channelType] || ib.channelType} · provider: {ib.provider}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {ib.isActive ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircleIcon className="w-3.5 h-3.5" /> Ativa</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500"><XCircleIcon className="w-3.5 h-3.5" /> Inativa</span>
                )}
                <select
                  value={ib.teamId || ''}
                  disabled={savingId === ib.id || teams.length === 0}
                  onChange={(e) => setInboxTeam(ib.id, e.target.value)}
                  className="h-8 px-2 rounded-lg bg-[#0a192f] border border-white/8 text-xs text-slate-300 outline-none disabled:opacity-40"
                >
                  <option value="">Sem time (atribuição manual)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.autoAssign ? '' : ' (auto-atribuição off)'}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
      {teams.length === 0 && (
        <p className="text-xs text-amber-400/70 mt-3">Nenhum time cadastrado ainda — crie um na aba &quot;Times&quot; para poder vincular.</p>
      )}
    </Card>
  )
}

// ============================================================================
// Times
// ============================================================================

function TeamsTab() {
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [addingMemberTeam, setAddingMemberTeam] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState<'agent' | 'lead'>('agent')

  async function load() {
    setLoading(true)
    try {
      const [teamsRes, usersRes] = await Promise.all([
        adminFetch('/api/admin/mensageria/teams'),
        adminFetch('/api/admin/mensageria/users'),
      ])
      setTeams((await teamsRes.json()).teams || [])
      setUsers((await usersRes.json()).users || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function createTeam() {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await adminFetch('/api/admin/mensageria/teams', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) })
      setNewName('')
      await load()
    } finally {
      setCreating(false)
    }
  }

  async function deleteTeam(id: string) {
    await adminFetch(`/api/admin/mensageria/teams?id=${id}`, { method: 'DELETE' })
    await load()
  }

  async function addMember(teamId: string) {
    if (!selectedUser) return
    await adminFetch(`/api/admin/mensageria/teams/${teamId}/members`, {
      method: 'POST', body: JSON.stringify({ userId: selectedUser, role: selectedRole }),
    })
    setSelectedUser(''); setSelectedRole('agent')
    setAddingMemberTeam(null)
    await load()
  }

  async function removeMember(teamId: string, userId: string) {
    await adminFetch(`/api/admin/mensageria/teams/${teamId}/members?userId=${userId}`, { method: 'DELETE' })
    await load()
  }

  // Promove/rebaixa um membro já existente — mesma rota (upsert por ON CONFLICT DO UPDATE role).
  // 'lead' é o que faz resolveMensageriaScope() considerar essa pessoa líder do time
  // (PLANO_MENSAGERIA.md seção 16/17 — sem isso ninguém nunca alcança o nível 'team').
  async function toggleMemberRole(teamId: string, userId: string, currentRole: string) {
    const nextRole = currentRole === 'lead' ? 'agent' : 'lead'
    await adminFetch(`/api/admin/mensageria/teams/${teamId}/members`, {
      method: 'POST', body: JSON.stringify({ userId, role: nextRole }),
    })
    await load()
  }

  if (loading) return <Card><p className="text-sm text-slate-500">Carregando...</p></Card>

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs text-slate-500 mb-3">Times permitem agrupar atendentes e (futuramente) roteamento por auto-atribuição.</p>
        <div className="flex items-center gap-2">
          <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do time (ex: Vendas — Zona Sul)" className="flex-1" />
          <PrimaryButton onClick={createTeam} disabled={creating || !newName.trim()}><PlusIcon className="w-4 h-4" /> Criar time</PrimaryButton>
        </div>
      </Card>

      {teams.length === 0 ? (
        <Card><EmptyState text="Nenhum time criado ainda." /></Card>
      ) : (
        teams.map((team) => (
          <Card key={team.id}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-white">{team.name}</p>
                <p className="text-xs text-slate-500">{team.autoAssign ? 'Auto-atribuição ativa' : 'Atribuição manual'}</p>
              </div>
              <button onClick={() => deleteTeam(team.id)} className="text-slate-500 hover:text-rose-400 transition-colors">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 mb-3">
              {team.members.length === 0 ? (
                <p className="text-xs text-slate-500">Nenhum membro ainda.</p>
              ) : (
                team.members.map((m) => (
                  <div key={m.userId} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#112240] border border-white/8">
                    <span className="text-xs text-slate-300 flex items-center gap-1.5">
                      {m.name}
                      {m.role === 'lead' && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[#d4af37]" title="Líder do time">
                          <StarIconSolid className="w-3 h-3" /> Líder
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleMemberRole(team.id, m.userId, m.role)}
                        title={m.role === 'lead' ? 'Rebaixar para agente' : 'Promover a líder'}
                        className={`transition-colors ${m.role === 'lead' ? 'text-[#d4af37] hover:text-slate-400' : 'text-slate-500 hover:text-[#d4af37]'}`}
                      >
                        <StarIcon className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeMember(team.id, m.userId)} className="text-slate-500 hover:text-rose-400 transition-colors">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {addingMemberTeam === team.id ? (
              <div className="flex items-center gap-2">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="flex-1 h-8 px-2 rounded-lg bg-[#112240] border border-white/8 text-xs text-slate-300 outline-none"
                >
                  <option value="">Selecione um usuário...</option>
                  {users.filter((u) => !team.members.some((m) => m.userId === u.id)).map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'agent' | 'lead')}
                  className="h-8 px-2 rounded-lg bg-[#112240] border border-white/8 text-xs text-slate-300 outline-none"
                >
                  <option value="agent">Agente</option>
                  <option value="lead">Líder</option>
                </select>
                <button onClick={() => addMember(team.id)} disabled={!selectedUser} className="h-8 px-2.5 rounded-lg bg-[#c5a028]/15 text-[#d4af37] text-xs font-medium disabled:opacity-40 shrink-0">
                  Adicionar
                </button>
                <button onClick={() => { setAddingMemberTeam(null); setSelectedRole('agent') }} className="text-xs text-slate-500 hover:text-slate-300 shrink-0">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setAddingMemberTeam(team.id)} className="inline-flex items-center gap-1 text-xs text-[#d4af37] hover:underline">
                <PlusIcon className="w-3 h-3" /> Adicionar membro
              </button>
            )}
          </Card>
        ))
      )}
    </div>
  )
}

// ============================================================================
// Etiquetas
// ============================================================================

const LABEL_COLORS = ['#c5a028', '#22c55e', '#ef4444', '#3b82f6', '#a855f7', '#f97316', '#06b6d4']

function LabelsTab() {
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [color, setColor] = useState(LABEL_COLORS[0])
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await adminFetch('/api/admin/mensageria/labels')
      setLabels((await res.json()).labels || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!name.trim()) return
    setCreating(true)
    try {
      await adminFetch('/api/admin/mensageria/labels', { method: 'POST', body: JSON.stringify({ name: name.trim(), color }) })
      setName('')
      await load()
    } finally {
      setCreating(false)
    }
  }

  async function remove(id: string) {
    await adminFetch(`/api/admin/mensageria/labels?id=${id}`, { method: 'DELETE' })
    await load()
  }

  if (loading) return <Card><p className="text-sm text-slate-500">Carregando...</p></Card>

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs text-slate-500 mb-3">Etiquetas classificam conversas por assunto/estágio/intenção — usadas como filtro e no analytics.</p>
        <div className="flex items-center gap-2 mb-3">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da etiqueta (ex: Interesse compra)" className="flex-1" />
          <PrimaryButton onClick={create} disabled={creating || !name.trim()}><PlusIcon className="w-4 h-4" /> Criar</PrimaryButton>
        </div>
        <div className="flex items-center gap-1.5">
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-white/40' : ''}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Card>

      <Card>
        {labels.length === 0 ? (
          <EmptyState text="Nenhuma etiqueta cadastrada." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {labels.map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-medium"
                style={{ background: `${l.color}18`, color: l.color, border: `1px solid ${l.color}40` }}>
                {l.name}
                <button onClick={() => remove(l.id)} className="opacity-60 hover:opacity-100">
                  <TrashIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ============================================================================
// Respostas Rápidas
// ============================================================================

function CannedTab() {
  const [items, setItems] = useState<CannedResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [shortcut, setShortcut] = useState('')
  const [content, setContent] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await adminFetch('/api/admin/mensageria/canned-responses')
      setItems((await res.json()).cannedResponses || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!shortcut.trim() || !content.trim()) return
    setCreating(true)
    try {
      await adminFetch('/api/admin/mensageria/canned-responses', { method: 'POST', body: JSON.stringify({ shortcut: shortcut.trim(), content: content.trim() }) })
      setShortcut(''); setContent('')
      await load()
    } finally {
      setCreating(false)
    }
  }

  async function remove(id: string) {
    await adminFetch(`/api/admin/mensageria/canned-responses?id=${id}`, { method: 'DELETE' })
    await load()
  }

  if (loading) return <Card><p className="text-sm text-slate-500">Carregando...</p></Card>

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs text-slate-500 mb-3">O atendente digita <code className="text-[#d4af37]">/atalho</code> no composer da conversa para expandir o texto.</p>
        <div className="space-y-2">
          <TextInput value={shortcut} onChange={(e) => setShortcut(e.target.value)} placeholder="/atalho (ex: /venda)" />
          <textarea
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Texto completo da resposta..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-[#112240] border border-white/8 text-sm text-slate-200 outline-none focus:border-[#c5a028] resize-none transition-colors"
          />
          <div className="flex justify-end">
            <PrimaryButton onClick={create} disabled={creating || !shortcut.trim() || !content.trim()}><PlusIcon className="w-4 h-4" /> Criar</PrimaryButton>
          </div>
        </div>
      </Card>

      <Card>
        {items.length === 0 ? (
          <EmptyState text="Nenhuma resposta rápida cadastrada." />
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[#112240] border border-white/8">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#d4af37]">{c.shortcut}</p>
                  <p className="text-sm text-slate-300 mt-0.5">{c.content}</p>
                </div>
                <button onClick={() => remove(c.id)} className="text-slate-500 hover:text-rose-400 transition-colors shrink-0">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

// ============================================================================
// SLA
// ============================================================================

type ScopeMode = 'global' | 'inbox' | 'team'

function SlaTab() {
  const [policies, setPolicies] = useState<SlaPolicy[]>([])
  const [inboxes, setInboxes] = useState<Inbox[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [firstResponseMin, setFirstResponseMin] = useState('')
  const [resolutionMin, setResolutionMin] = useState('')
  const [scopeMode, setScopeMode] = useState<ScopeMode>('global')
  const [scopeTarget, setScopeTarget] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [policiesRes, inboxesRes, teamsRes] = await Promise.all([
        adminFetch('/api/admin/mensageria/sla-policies'),
        adminFetch('/api/admin/mensageria/inboxes'),
        adminFetch('/api/admin/mensageria/teams'),
      ])
      setPolicies((await policiesRes.json()).policies || [])
      setInboxes((await inboxesRes.json()).inboxes || [])
      setTeams((await teamsRes.json()).teams || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function scopeLabel(scope: Record<string, any> | null | undefined): string {
    if (!scope || Object.keys(scope).length === 0) return 'Global (todas as conversas do tenant)'
    if (scope.inbox_id) {
      const ib = inboxes.find((i) => i.id === scope.inbox_id)
      return `Inbox: ${ib ? (CHANNEL_LABELS[ib.channelType] || ib.name) : scope.inbox_id}`
    }
    if (scope.team_id) {
      const tm = teams.find((t) => t.id === scope.team_id)
      return `Time: ${tm ? tm.name : scope.team_id}`
    }
    return 'Escopo customizado'
  }

  async function create() {
    if (!name.trim()) return
    if (scopeMode !== 'global' && !scopeTarget) return
    setCreating(true)
    try {
      const scope = scopeMode === 'inbox' ? { inbox_id: scopeTarget }
        : scopeMode === 'team' ? { team_id: scopeTarget }
        : {}
      await adminFetch('/api/admin/mensageria/sla-policies', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          scope,
          firstResponseTargetMin: firstResponseMin ? parseInt(firstResponseMin, 10) : null,
          resolutionTargetMin: resolutionMin ? parseInt(resolutionMin, 10) : null,
        }),
      })
      setName(''); setFirstResponseMin(''); setResolutionMin(''); setScopeMode('global'); setScopeTarget('')
      await load()
    } finally {
      setCreating(false)
    }
  }

  async function remove(id: string) {
    await adminFetch(`/api/admin/mensageria/sla-policies?id=${id}`, { method: 'DELETE' })
    await load()
  }

  if (loading) return <Card><p className="text-sm text-slate-500">Carregando...</p></Card>

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-xs text-slate-500 mb-3">
          Metas de tempo de resposta/resolução. Estouro dispara alerta (WhatsApp/Slack) e badge vermelho na conversa.
          Quando mais de uma política se aplica a uma conversa nova, vale a mais específica: <strong className="text-slate-400">Inbox &gt; Time &gt; Global</strong>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da política" />
          <TextInput type="number" value={firstResponseMin} onChange={(e) => setFirstResponseMin(e.target.value)} placeholder="1ª resposta (min)" />
          <TextInput type="number" value={resolutionMin} onChange={(e) => setResolutionMin(e.target.value)} placeholder="Resolução (min)" />
        </div>

        <p className="text-xs text-slate-500 mb-1.5">Aplicar a:</p>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex rounded-lg border border-white/8 overflow-hidden">
            {(['global', 'inbox', 'team'] as ScopeMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setScopeMode(m); setScopeTarget('') }}
                className={`px-3 h-8 text-xs font-medium transition-colors ${
                  scopeMode === m ? 'bg-[#c5a028]/15 text-[#d4af37]' : 'bg-[#112240] text-slate-400 hover:text-slate-200'
                }`}
              >
                {m === 'global' ? 'Global' : m === 'inbox' ? 'Por Inbox' : 'Por Time'}
              </button>
            ))}
          </div>
          {scopeMode === 'inbox' && (
            <select
              value={scopeTarget} onChange={(e) => setScopeTarget(e.target.value)}
              className="h-8 px-2 rounded-lg bg-[#112240] border border-white/8 text-xs text-slate-300 outline-none"
            >
              <option value="">Selecione a inbox...</option>
              {inboxes.map((ib) => <option key={ib.id} value={ib.id}>{CHANNEL_LABELS[ib.channelType] || ib.name}</option>)}
            </select>
          )}
          {scopeMode === 'team' && (
            <select
              value={scopeTarget} onChange={(e) => setScopeTarget(e.target.value)}
              className="h-8 px-2 rounded-lg bg-[#112240] border border-white/8 text-xs text-slate-300 outline-none"
            >
              <option value="">Selecione o time...</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>

        <div className="flex justify-end">
          <PrimaryButton onClick={create} disabled={creating || !name.trim() || (scopeMode !== 'global' && !scopeTarget)}>
            <PlusIcon className="w-4 h-4" /> Criar política
          </PrimaryButton>
        </div>
      </Card>

      <Card>
        {policies.length === 0 ? (
          <EmptyState text="Nenhuma política de SLA cadastrada." />
        ) : (
          <div className="space-y-2">
            {policies.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#112240] border border-white/8">
                <div>
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <p className="text-xs text-[#d4af37] mt-0.5">{scopeLabel(p.scope)}</p>
                  <p className="text-xs text-slate-500">
                    {p.first_response_target_min ? `1ª resposta: ${p.first_response_target_min}min` : 'sem meta de 1ª resposta'}
                    {' · '}
                    {p.resolution_target_min ? `Resolução: ${p.resolution_target_min}min` : 'sem meta de resolução'}
                  </p>
                </div>
                <button onClick={() => remove(p.id)} className="text-slate-500 hover:text-rose-400 transition-colors">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
