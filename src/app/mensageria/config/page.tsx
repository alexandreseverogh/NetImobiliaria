'use client'

import { useEffect, useRef, useState } from 'react'
import {
  InboxStackIcon, UsersIcon, TagIcon, ChatBubbleBottomCenterTextIcon,
  ClockIcon, PlusIcon, TrashIcon, CheckCircleIcon, XCircleIcon, StarIcon, CpuChipIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { adminFetch } from '@/lib/auth/adminFetch'

type Tab = 'inboxes' | 'teams' | 'labels' | 'canned' | 'sla' | 'bot'

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'inboxes', label: 'Inboxes', icon: InboxStackIcon },
  { id: 'teams', label: 'Times', icon: UsersIcon },
  { id: 'labels', label: 'Etiquetas', icon: TagIcon },
  { id: 'canned', label: 'Respostas Rápidas', icon: ChatBubbleBottomCenterTextIcon },
  { id: 'sla', label: 'SLA', icon: ClockIcon },
  { id: 'bot', label: 'Bot', icon: CpuChipIcon },
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
        {tab === 'bot' && <BotTab />}
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

function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-9 px-3 rounded-lg bg-[#112240] border border-white/8 text-sm text-slate-200 outline-none focus:border-[#c5a028] transition-colors ${className || ''}`}
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

const CREATABLE_CHANNELS = ['whatsapp', 'webform', 'manual'] as const

function InboxesTab() {
  const [inboxes, setInboxes] = useState<Inbox[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newChannelType, setNewChannelType] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

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

  const existingChannels = new Set(inboxes.map((ib) => ib.channelType))
  const availableChannels = CREATABLE_CHANNELS.filter((c) => !existingChannels.has(c))

  async function createInbox() {
    if (!newName.trim() || !newChannelType) return
    setCreating(true)
    setCreateError('')
    try {
      const res = await adminFetch('/api/admin/mensageria/inboxes', {
        method: 'POST', body: JSON.stringify({ name: newName.trim(), channelType: newChannelType }),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(data.error || 'Falha ao criar inbox.'); return }
      setNewName(''); setNewChannelType('')
      await load()
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <Card><p className="text-sm text-slate-500">Carregando...</p></Card>

  return (
    <Card>
      <p className="text-xs text-slate-500 mb-3">
        Canais de entrada são criados automaticamente na primeira mensagem de cada tipo (WhatsApp, Formulário, Manual),
        ou você pode criar um antecipadamente aqui — útil, por exemplo, pra já poder testar o bot antes da primeira
        interação real chegar. Vincule um <strong className="text-slate-400">time responsável</strong> para que
        conversas novas nesse canal sejam auto-atribuídas ao membro com menos conversas em aberto (só funciona se
        o time tiver &quot;Auto-atribuição ativa&quot;).
      </p>

      {availableChannels.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 mb-4 pb-4 border-b border-white/5">
          <TextInput
            value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da inbox (ex: Formulários do Site)"
            className="flex-1"
          />
          <select
            value={newChannelType} onChange={(e) => setNewChannelType(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[#112240] border border-white/8 text-sm text-slate-300 outline-none"
          >
            <option value="">Canal...</option>
            {availableChannels.map((c) => <option key={c} value={c}>{CHANNEL_LABELS[c] || c}</option>)}
          </select>
          <PrimaryButton onClick={createInbox} disabled={creating || !newName.trim() || !newChannelType}>
            <PlusIcon className="w-4 h-4" /> {creating ? 'Criando...' : 'Criar inbox'}
          </PrimaryButton>
        </div>
      )}
      {createError && <p className="text-xs text-rose-400 mb-3">{createError}</p>}

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

// ============================================================================
// Bot (M4.1 + M4.2) — operacional (ativo + handoff) e teste rápido.
// A PERSONA por segmento é editada em /admin/master/prompts, não aqui.
// ============================================================================

interface BotFlow {
  id: string; name: string; isActive: boolean
  handoffKeywords: string[]; maxTurns: number | null
}
interface TestMessage { id: string; direction: 'inbound' | 'outbound'; senderType: string; content: string | null; createdAt: string }

function BotTab() {
  const [flow, setFlow] = useState<BotFlow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [isActive, setIsActive] = useState(false)
  const [keywordsText, setKeywordsText] = useState('atendente, humano, falar com alguem')
  const [maxTurns, setMaxTurns] = useState('6')

  const [inboxes, setInboxes] = useState<Inbox[]>([])
  const [testInboxId, setTestInboxId] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [testing, setTesting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [testMessages, setTestMessages] = useState<TestMessage[]>([])
  const [handledByBot, setHandledByBot] = useState<boolean | null>(null)
  const [botSessionActive, setBotSessionActive] = useState<boolean | null>(null)
  const [testError, setTestError] = useState('')
  const testScrollRef = useRef<HTMLDivElement>(null)

  async function load() {
    setLoading(true)
    try {
      const [flowRes, ibRes] = await Promise.all([
        adminFetch('/api/admin/mensageria/bot-flows'),
        adminFetch('/api/admin/mensageria/inboxes'),
      ])
      const flowJson = await flowRes.json()
      const flowData: BotFlow | null = flowJson.flow
      setFlow(flowData)
      setIsActive(flowData?.isActive ?? false)
      setKeywordsText(flowData?.handoffKeywords?.length ? flowData.handoffKeywords.join(', ') : keywordsText)
      // Sem flow próprio ainda → sugere o padrão do segmento (editável pelo Master), não um valor fixo.
      setMaxTurns(flowData?.maxTurns != null ? String(flowData.maxTurns) : String(flowJson.suggestedMaxTurns ?? 6))

      const nonManual = ((await ibRes.json()).inboxes || []).filter((i: Inbox) => i.channelType !== 'manual')
      setInboxes(nonManual)
      if (nonManual[0]) setTestInboxId(nonManual[0].id)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Carrega o estado da conversa de teste dessa inbox (persiste entre trocas de aba/reload).
  async function loadTestConversation(inboxId: string) {
    if (!inboxId) return
    const res = await adminFetch(`/api/admin/mensageria/bot/test?inboxId=${inboxId}`)
    const data = await res.json()
    setTestMessages(data.messages || [])
    setHandledByBot(data.handledByBot)
    setBotSessionActive(data.botSessionActive)
  }

  useEffect(() => { if (testInboxId) loadTestConversation(testInboxId) }, [testInboxId])

  useEffect(() => {
    const el = testScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [testMessages])

  async function save() {
    setSaving(true)
    try {
      const handoffKeywords = keywordsText.split(',').map((k) => k.trim()).filter(Boolean)
      const res = await adminFetch('/api/admin/mensageria/bot-flows', {
        method: 'PUT',
        body: JSON.stringify({
          isActive,
          handoffKeywords, maxTurns: maxTurns ? parseInt(maxTurns, 10) : null,
        }),
      })
      setFlow((await res.json()).flow)
    } finally {
      setSaving(false)
    }
  }

  async function runTest() {
    if (!testInboxId || !testMessage.trim()) return
    const sent = testMessage.trim()
    setTesting(true)
    setTestError('')
    setTestMessage('')
    try {
      const res = await adminFetch('/api/admin/mensageria/bot/test', {
        method: 'POST',
        body: JSON.stringify({ inboxId: testInboxId, message: sent }),
      })
      const data = await res.json()
      if (!res.ok) { setTestError(data.error || 'Falha ao testar o bot.'); setTestMessage(sent); return }
      setTestMessages(data.messages || [])
      setHandledByBot(data.handledByBot)
      setBotSessionActive(data.botSessionActive)
    } catch {
      setTestError('Falha ao testar o bot.')
      setTestMessage(sent)
    } finally {
      setTesting(false)
    }
  }

  async function resetTest() {
    if (!testInboxId) return
    setResetting(true)
    try {
      await adminFetch(`/api/admin/mensageria/bot/test?inboxId=${testInboxId}`, { method: 'DELETE' })
      setTestMessages([])
      setHandledByBot(null)
      setBotSessionActive(null)
      setTestError('')
    } finally {
      setResetting(false)
    }
  }

  if (loading) return <Card><p className="text-sm text-slate-500">Carregando...</p></Card>

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-white">Bot de atendimento</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Responde automaticamente em conversas ainda não atribuídas a um atendente (não atua no canal Manual).
              Cada resposta aparece na Caixa de Entrada normalmente, com o selo 🤖 Bot.
            </p>
          </div>
          <button
            onClick={() => setIsActive((v) => !v)}
            className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
              isActive ? 'bg-emerald-500/12 text-emerald-400' : 'bg-white/5 text-slate-400'
            }`}
          >
            {isActive ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <XCircleIcon className="w-3.5 h-3.5" />}
            {isActive ? 'Ativo' : 'Inativo'}
          </button>
        </div>

        <div className="rounded-lg bg-[#112240] border border-white/8 px-3.5 py-2.5 mb-3">
          <p className="text-xs text-slate-400">
            <span className="text-[#d4af37] font-medium">Persona &amp; conhecimento:</span> a personalidade e as
            instruções do bot são definidas por <strong>segmento de negócio</strong> pelo Master, na página{' '}
            <span className="font-mono text-slate-300">Editor de Prompts</span> (template{' '}
            <span className="font-mono text-slate-300">mensageria_bot_persona</span>). Cada segmento tem seu próprio
            prompt; sem um específico, vale o global de fallback.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Palavras-chave de transferência (separadas por vírgula)</p>
            <TextInput value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} className="w-full" />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Transferir após N interações do bot</p>
            <TextInput type="number" value={maxTurns} onChange={(e) => setMaxTurns(e.target.value)} className="w-full" />
          </div>
        </div>

        <div className="flex justify-end">
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? 'Salvando...' : flow ? 'Salvar alterações' : 'Ativar bot'}
          </PrimaryButton>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between mb-1">
          <p className="text-sm font-medium text-white">Testar conversa com o bot</p>
          <button
            onClick={resetTest}
            disabled={resetting || !testInboxId || testMessages.length === 0}
            className="shrink-0 text-xs text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
          >
            {resetting ? 'Reiniciando...' : 'Reiniciar conversa'}
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Conversa real de teste (thread própria por inbox) — dá pra ir e voltar várias mensagens pra
          testar memória, handoff e ferramentas de dados, exatamente como um contato de verdade veria.
        </p>

        <select
          value={testInboxId} onChange={(e) => setTestInboxId(e.target.value)}
          className="h-9 px-3 mb-3 rounded-lg bg-[#112240] border border-white/8 text-sm text-slate-300 outline-none"
        >
          {inboxes.length === 0 && <option value="">Nenhuma inbox elegível</option>}
          {inboxes.map((ib) => <option key={ib.id} value={ib.id}>{CHANNEL_LABELS[ib.channelType] || ib.name}</option>)}
        </select>

        {botSessionActive === false && (
          <div className="mb-3 rounded-lg bg-amber-500/8 border border-amber-500/20 px-3 py-2">
            <p className="text-xs text-amber-400">
              ⚠ Handoff já ocorreu nesta conversa — o bot fica em silêncio até você reiniciar (ou, numa
              conversa real, até um atendente assumir).
              {handledByBot === false && ' O contato agora está na fila de "não atribuídas".'}
            </p>
          </div>
        )}

        <div
          ref={testScrollRef}
          className="h-72 overflow-y-auto rounded-lg bg-[#020c1b] border border-white/8 px-3.5 py-3 mb-3 space-y-2.5"
        >
          {testMessages.length === 0 ? (
            <p className="text-xs text-slate-600 text-center mt-8">Envie uma mensagem abaixo para começar.</p>
          ) : (
            testMessages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl px-3.5 py-2 ${
                  m.direction === 'outbound' ? 'bg-[#c5a028]/15 text-white' : 'bg-[#112240] text-slate-200'
                }`}>
                  {m.senderType === 'bot' && <p className="text-[10px] text-[#d4af37] font-semibold mb-0.5">🤖 Bot</p>}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {testError && <p className="text-xs text-rose-400 mb-2">{testError}</p>}

        <div className="flex gap-2">
          <TextInput
            value={testMessage} onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Ex.: tem apartamento de 2 quartos em Boa Viagem?"
            className="flex-1"
            disabled={testing || !testInboxId}
            onKeyDown={(e) => { if (e.key === 'Enter') runTest() }}
          />
          <PrimaryButton onClick={runTest} disabled={testing || !testInboxId || !testMessage.trim()}>
            {testing ? 'Enviando...' : 'Enviar'}
          </PrimaryButton>
        </div>
      </Card>
    </div>
  )
}
