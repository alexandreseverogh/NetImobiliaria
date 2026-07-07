'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  InboxIcon, UserCircleIcon, UsersIcon, PaperAirplaneIcon,
  CheckCircleIcon, ClockIcon, PhoneIcon, LockClosedIcon, PlusIcon, XMarkIcon,
} from '@heroicons/react/24/outline'
import { adminFetch } from '@/lib/auth/adminFetch'
import { formatTelefone } from '@/lib/utils/formatters'
import DateInputPtBR from '@/components/ui/DateInputPtBR'

type Folder = 'all' | 'unassigned' | 'mine'

interface ConversationSummary {
  id: string
  status: string
  priority: string | null
  unreadCount: number
  lastMessageAt: string | null
  lastMessagePreview: string | null
  handledByBot: boolean
  channelType: string
  inboxName: string
  assignee: { id: string; name: string } | null
  contact: { id: string; name: string | null; phone: string | null; avatarUrl: string | null; leadUuid: string | null }
  createdAt: string
}

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  senderType: 'contact' | 'agent' | 'bot' | 'system'
  senderId: string | null
  content: string | null
  contentType: string
  deliveryStatus: string
  isPrivate: boolean
  createdAt: string
}

interface ConversationDetail {
  id: string
  status: string
  priority: string | null
  handledByBot: boolean
  firstResponseAt?: string | null
  contact: { id: string; name: string | null; phone: string | null; email: string | null; avatarUrl: string | null; leadUuid: string | null }
  inbox: { id: string; channelType: string; name: string }
  labels: { id: string; name: string; color: string }[]
  sla: { firstResponseDue: string | null; firstResponseBreached: boolean; resolutionDue: string | null; resolutionBreached: boolean } | null
}

interface Label { id: string; name: string; color: string }
interface CannedResponse { id: string; shortcut: string; content: string }

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function SlaBadge({ detail }: { detail: ConversationDetail }) {
  if (!detail.sla) return null
  const { firstResponseDue, firstResponseBreached, resolutionDue, resolutionBreached } = detail.sla

  // Ainda não respondeu ao contato — prioridade é o prazo de 1ª resposta
  if (!detail.firstResponseAt && firstResponseDue) {
    if (firstResponseBreached) {
      return <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-rose-500/12 text-rose-400 text-xs font-medium"><ClockIcon className="w-3.5 h-3.5" /> SLA estourado</span>
    }
    const due = new Date(firstResponseDue)
    return <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-white/5 text-slate-400 text-xs font-medium"><ClockIcon className="w-3.5 h-3.5" /> Responder até {due.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
  }

  // Já respondeu — se ainda aberta, o prazo relevante passa a ser resolução
  if (detail.status !== 'resolved' && resolutionDue) {
    if (resolutionBreached) {
      return <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-rose-500/12 text-rose-400 text-xs font-medium"><ClockIcon className="w-3.5 h-3.5" /> Resolução atrasada</span>
    }
    const due = new Date(resolutionDue)
    return <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-white/5 text-slate-400 text-xs font-medium"><ClockIcon className="w-3.5 h-3.5" /> Resolver até {due.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
  }

  return null
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

// Data absoluta — timeAgo() sozinho ("3d") não diferencia conversas do mesmo
// período em alto volume; usada em tooltips (title=) sobre os horários relativos.
function formatFullDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function isSameDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA); const b = new Date(isoB)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (isSameDay(iso, today.toISOString())) return 'Hoje'
  if (isSameDay(iso, yesterday.toISOString())) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function DateDivider({ iso }: { iso: string }) {
  return (
    <div className="flex justify-center my-1">
      <span className="text-[10px] font-medium text-slate-400 bg-white/5 border border-white/8 px-2.5 py-1 rounded-full capitalize">
        {formatDateLabel(iso)}
      </span>
    </div>
  )
}

// Validação reforçada — a global validateTelefone()/validateEmail() (src/lib/utils/formatters.ts)
// só checa quantidade de dígitos / presença de "@", o que deixa passar números com contagem certa
// mas DDD inexistente (ex: "12345678901") ou e-mails sem TLD real. Mantida local a este módulo para
// não alterar o comportamento das outras 30+ telas que usam a validação global mais permissiva.
const VALID_DDD = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
])

function isValidBrazilianPhone(digits: string): boolean {
  if (digits.length !== 10 && digits.length !== 11) return false
  const ddd = parseInt(digits.slice(0, 2), 10)
  if (!VALID_DDD.has(ddd)) return false
  if (digits.length === 11 && digits[2] !== '9') return false // celular sempre tem o 9º dígito
  if (digits.length === 10 && digits[2] === '9') return false // fixo nunca começa com 9 (celular truncado)
  return true
}

const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/
function isValidEmailStrict(email: string): boolean {
  return STRICT_EMAIL_REGEX.test(email)
}

export default function MensageriaPage() {
  const [folder, setFolder] = useState<Folder>('all')
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [dateFrom, setDateFrom] = useState('') // ISO yyyy-mm-dd — filtro de período (item 2)
  const [dateTo, setDateTo] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [composer, setComposer] = useState('')
  const [isPrivateNote, setIsPrivateNote] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Etiquetas + Respostas rápidas (M3)
  const [allLabels, setAllLabels] = useState<Label[]>([])
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([])
  const [showCannedSuggestions, setShowCannedSuggestions] = useState(false)

  // Nova conversa manual (input manual — canal 'manual', ver M2)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [creating, setCreating] = useState(false)

  // Combobox "Nome do Contato" → busca em public.clientes (cliente já cadastrado)
  // com fallback livre para pessoa que ainda não é cliente (ver docs/PLANO_MENSAGERIA.md)
  const [newClientId, setNewClientId] = useState<string | null>(null)
  const [clientSuggestions, setClientSuggestions] = useState<{ id: string; nome: string; telefone: string; email: string | null }[]>([])
  const [showClientSuggestions, setShowClientSuggestions] = useState(false)
  const [showNewClientConfirm, setShowNewClientConfirm] = useState(false)

  const assigneeParam = folder === 'mine' ? 'me' : folder === 'unassigned' ? 'unassigned' : undefined

  function buildConversationsQuery(cursor?: string) {
    const qs = new URLSearchParams()
    if (assigneeParam) qs.set('assigneeId', assigneeParam)
    if (dateFrom) qs.set('dateFrom', dateFrom)
    if (dateTo) qs.set('dateTo', dateTo)
    if (cursor) qs.set('cursor', cursor)
    return qs
  }

  async function loadConversations() {
    setLoadingList(true)
    try {
      const res = await adminFetch(`/api/admin/mensageria/conversations?${buildConversationsQuery()}`)
      const data = await res.json()
      setConversations(data.conversations || [])
      setNextCursor(data.nextCursor || null)
      setTotalCount(data.totalCount ?? (data.conversations || []).length)
    } finally {
      setLoadingList(false)
    }
  }

  // Paginação por cursor — carrega o próximo lote ao chegar perto do fim da lista
  // (ver item 1 da conversa de volumetria: LIMIT fixo não escala p/ centenas de atendentes).
  async function loadMoreConversations() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await adminFetch(`/api/admin/mensageria/conversations?${buildConversationsQuery(nextCursor)}`)
      const data = await res.json()
      setConversations((prev) => [...prev, ...(data.conversations || [])])
      setNextCursor(data.nextCursor || null)
    } finally {
      setLoadingMore(false)
    }
  }

  function handleListScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) loadMoreConversations()
  }

  async function loadDetail(id: string) {
    setLoadingThread(true)
    try {
      const res = await adminFetch(`/api/admin/mensageria/conversations/${id}`)
      const data = await res.json()
      setDetail(data.conversation)
      setMessages(data.messages || [])
      // zera contador local sem esperar novo fetch da lista
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)))
    } finally {
      setLoadingThread(false)
    }
  }

  useEffect(() => { loadConversations() }, [folder, dateFrom, dateTo])

  useEffect(() => {
    if (selectedId) loadDetail(selectedId)
    else { setDetail(null); setMessages([]) }
  }, [selectedId])

  useEffect(() => {
    adminFetch('/api/admin/mensageria/labels').then((r) => r.json()).then((d) => setAllLabels(d.labels || [])).catch(() => {})
    adminFetch('/api/admin/mensageria/canned-responses').then((r) => r.json()).then((d) => setCannedResponses(d.cannedResponses || [])).catch(() => {})
  }, [])

  async function addLabel(labelId: string) {
    if (!selectedId) return
    await adminFetch(`/api/admin/mensageria/conversations/${selectedId}/labels`, {
      method: 'POST', body: JSON.stringify({ labelId }),
    })
    await loadDetail(selectedId)
    setShowLabelPicker(false)
  }

  async function removeLabel(labelId: string) {
    if (!selectedId) return
    await adminFetch(`/api/admin/mensageria/conversations/${selectedId}/labels?labelId=${labelId}`, { method: 'DELETE' })
    await loadDetail(selectedId)
  }

  const cannedMatches = useMemo(() => {
    if (!composer.startsWith('/')) return []
    const query = composer.slice(1).toLowerCase()
    return cannedResponses.filter((c) => c.shortcut.slice(1).toLowerCase().startsWith(query)).slice(0, 5)
  }, [composer, cannedResponses])

  useEffect(() => {
    // Rola só o container interno de mensagens — scrollIntoView() escalaria para
    // ancestrais scrolláveis (inclusive a janela), causando "pulo" da página inteira.
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Tempo real — SSE (EventSource não aceita headers custom; a rota autentica via cookie)
  useEffect(() => {
    const es = new EventSource('/api/admin/mensageria/stream')
    es.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data)
        if (event.type === 'message.created') {
          loadConversations()
          if (event.conversationId === selectedId) {
            setMessages((prev) => (prev.some((m) => m.id === event.message.id) ? prev : [...prev, event.message]))
          }
        }
      } catch { /* ignora payload inválido */ }
    }
    es.onerror = () => { /* reconexão automática do EventSource */ }
    return () => es.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  async function sendMessage() {
    if (!selectedId || !composer.trim()) return
    setSending(true)
    const content = composer.trim()
    setComposer('')
    try {
      await adminFetch(`/api/admin/mensageria/conversations/${selectedId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content, isPrivate: isPrivateNote }),
      })
      await loadDetail(selectedId)
      setIsPrivateNote(false)
    } finally {
      setSending(false)
    }
  }

  // Busca em public.clientes com debounce enquanto o atendente digita o nome —
  // some assim que um cliente é selecionado (newClientId setado)
  useEffect(() => {
    if (newClientId || newName.trim().length < 2) { setClientSuggestions([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await adminFetch(`/api/admin/mensageria/clientes-search?q=${encodeURIComponent(newName.trim())}`)
        const data = await res.json()
        setClientSuggestions(data.clientes || [])
        setShowClientSuggestions(true)
      } catch { /* falha na busca — segue com texto livre, sem travar o form */ }
    }, 300)
    return () => clearTimeout(t)
  }, [newName, newClientId])

  function selectClient(c: { id: string; nome: string; telefone: string; email: string | null }) {
    setNewName(c.nome)
    // Dado de cliente pode vir sem máscara ou com DDI 55 (dado legado/seed) — normaliza antes de mascarar
    let digits = (c.telefone || '').replace(/\D/g, '')
    if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2)
    setNewPhone(digits ? formatTelefone(digits) : '')
    setNewEmail(c.email || '')
    setNewClientId(c.id)
    setShowClientSuggestions(false)
    setShowNewClientConfirm(false)
  }

  function resetNewModal() {
    setNewName(''); setNewPhone(''); setNewEmail(''); setNewMessage('')
    setNewClientId(null); setClientSuggestions([]); setShowClientSuggestions(false); setShowNewClientConfirm(false)
  }

  // Telefone é gravado sem máscara (mensageria.contacts.phone é normalizado — dígitos puros,
  // ver docs/PLANO_MENSAGERIA.md seção 4.1) para o dedupe de contato bater com o canal WhatsApp.
  const newPhoneDigits = newPhone.replace(/\D/g, '')
  const phoneFilled = newPhoneDigits.length > 0
  const phoneValid = !phoneFilled || isValidBrazilianPhone(newPhoneDigits)
  const emailTrimmed = newEmail.trim()
  const emailFilled = emailTrimmed.length > 0
  const emailValid = !emailFilled || isValidEmailStrict(emailTrimmed)
  const hasContactChannel = (phoneFilled && phoneValid) || (emailFilled && emailValid)
  const newContactFormValid = phoneValid && emailValid && hasContactChannel

  async function createManualConversation() {
    if (!newContactFormValid) return
    setCreating(true)
    try {
      const res = await adminFetch('/api/admin/mensageria/conversations', {
        method: 'POST',
        body: JSON.stringify({
          name: newName.trim() || null,
          phone: newPhoneDigits || null,
          email: emailTrimmed || null,
          initialMessage: newMessage.trim() || undefined,
          clientId: newClientId || undefined,
        }),
      })
      const data = await res.json()
      if (data.conversationId) {
        setShowNewModal(false)
        resetNewModal()
        await loadConversations()
        setSelectedId(data.conversationId)
      }
    } finally {
      setCreating(false)
    }
  }

  // Gate de "cliente novo": só cria direto se já houver cliente selecionado no
  // combobox; senão, primeiro clique revela a confirmação — segundo clique confirma.
  function handleCreateClick() {
    if (!newClientId && newName.trim() && !showNewClientConfirm) {
      setShowNewClientConfirm(true)
      return
    }
    createManualConversation()
  }

  async function patchConversation(patch: Record<string, any>) {
    if (!selectedId) return
    await adminFetch(`/api/admin/mensageria/conversations/${selectedId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    await loadDetail(selectedId)
    await loadConversations()
  }

  // "all" usa totalCount (contagem real do servidor) — conversations.length agora só
  // reflete quantas já foram carregadas na tela (paginado), ficaria enganoso como contador.
  const counts = useMemo(() => ({
    all: totalCount,
    unread: conversations.filter((c) => c.unreadCount > 0).length,
  }), [conversations, totalCount])

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-[#020c1b]">
      {/* Coluna 1 — Filtros/Pastas */}
      <div className="w-56 shrink-0 border-r border-white/5 bg-[#020c1b] py-4">
        <div className="px-4 mb-3 flex items-center justify-between gap-2">
          <h1 className="text-sm font-semibold text-white">Caixa de Entrada</h1>
          <button
            onClick={() => setShowNewModal(true)}
            title="Nova conversa manual"
            className="w-6 h-6 flex items-center justify-center rounded-md bg-[#c5a028]/12 text-[#d4af37] hover:bg-[#c5a028]/20 transition-colors shrink-0"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>
        <nav className="space-y-0.5 px-2">
          <FolderButton icon={<InboxIcon className="w-4 h-4" />} label="Todas" active={folder === 'all'} onClick={() => setFolder('all')} count={counts.all} />
          <FolderButton icon={<UserCircleIcon className="w-4 h-4" />} label="Minhas" active={folder === 'mine'} onClick={() => setFolder('mine')} />
          <FolderButton icon={<UsersIcon className="w-4 h-4" />} label="Não atribuídas" active={folder === 'unassigned'} onClick={() => setFolder('unassigned')} />
        </nav>

        {/* Filtro de período — item 2 (data absoluta)/3 (filtro) da conversa de volumetria */}
        <div className="px-4 mt-5 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Período</p>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-[10px] text-[#d4af37] hover:underline">
                Limpar
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            <div>
              <label className="block text-[9px] text-slate-500 mb-0.5">De</label>
              <DateInputPtBR
                value={dateFrom}
                onChange={setDateFrom}
                className="w-full h-8 px-2 rounded-lg bg-[#0a192f] border border-white/8 text-xs text-slate-300 outline-none focus:border-[#c5a028]"
              />
            </div>
            <div>
              <label className="block text-[9px] text-slate-500 mb-0.5">Até</label>
              <DateInputPtBR
                value={dateTo}
                onChange={setDateTo}
                className="w-full h-8 px-2 rounded-lg bg-[#0a192f] border border-white/8 text-xs text-slate-300 outline-none focus:border-[#c5a028]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Coluna 2 — Lista de conversas */}
      <div className="w-80 shrink-0 border-r border-white/5 bg-[#0a192f] overflow-y-auto" onScroll={handleListScroll}>
        {loadingList ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />)}
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-10 px-4">Nenhuma conversa nesta pasta{(dateFrom || dateTo) ? ' no período selecionado' : ''}.</p>
        ) : (
          <>
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-white/5 transition-colors ${
                  selectedId === c.id ? 'bg-[#112240]' : 'hover:bg-white/3'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#c5a028]/15 border border-[#c5a028]/20 flex items-center justify-center text-[11px] font-semibold text-[#d4af37] shrink-0">
                    {initials(c.contact.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white truncate">{c.contact.name || c.contact.phone || 'Sem nome'}</span>
                      <span className="text-[10px] text-slate-500 shrink-0" title={formatFullDate(c.lastMessageAt)}>{timeAgo(c.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{c.lastMessagePreview || '—'}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <ChannelChip channelType={c.channelType} />
                      {c.unreadCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#c5a028] text-[10px] font-bold text-[#020c1b]">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {loadingMore && (
              <div className="py-3 flex justify-center">
                <div className="w-4 h-4 border-2 border-[#c5a028]/30 border-t-[#c5a028] rounded-full animate-spin" />
              </div>
            )}
            {!loadingMore && !nextCursor && conversations.length > 0 && (
              <p className="text-[10px] text-slate-600 text-center py-3">{conversations.length} de {totalCount} conversas</p>
            )}
          </>
        )}
      </div>

      {/* Coluna 3 — Thread */}
      <div className="flex-1 flex flex-col bg-[#0a192f] min-w-0">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-slate-500">Selecione uma conversa para começar.</p>
          </div>
        ) : loadingThread || !detail ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#c5a028]/30 border-t-[#c5a028] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Header da thread */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#c5a028]/15 border border-[#c5a028]/20 flex items-center justify-center text-[11px] font-semibold text-[#d4af37]">
                  {initials(detail.contact.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{detail.contact.name || detail.contact.phone}</p>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <PhoneIcon className="w-3 h-3" /> {detail.contact.phone}
                    {detail.contact.leadUuid && (
                      <a href={`/crm/leads?leadId=${detail.contact.leadUuid}`} target="_blank" rel="noreferrer"
                         className="ml-2 text-[#d4af37] hover:underline">Ver no CRM →</a>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SlaBadge detail={detail} />
                <select
                  value={detail.priority || ''}
                  onChange={(e) => patchConversation({ priority: e.target.value || null })}
                  className="h-8 px-2 rounded-lg bg-[#112240] border border-white/8 text-xs text-slate-300 outline-none"
                >
                  <option value="">Sem prioridade</option>
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
                {detail.status !== 'resolved' ? (
                  <button
                    onClick={() => patchConversation({ status: 'resolved' })}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#c5a028]/12 text-[#d4af37] text-xs font-medium hover:bg-[#c5a028]/20 transition-colors"
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5" /> Resolver
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                    <CheckCircleIcon className="w-3.5 h-3.5" /> Resolvida
                  </span>
                )}
              </div>
            </div>

            {/* Etiquetas */}
            <div className="flex items-center gap-1.5 px-5 py-2 border-b border-white/5 flex-wrap relative">
              {detail.labels.map((l) => (
                <span key={l.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium" style={{ background: `${l.color}22`, color: l.color, border: `1px solid ${l.color}40` }}>
                  {l.name}
                  <button onClick={() => removeLabel(l.id)} className="opacity-60 hover:opacity-100">×</button>
                </span>
              ))}
              <button
                onClick={() => setShowLabelPicker((v) => !v)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-500 border border-white/8 hover:text-slate-300 transition-colors"
              >
                <PlusIcon className="w-3 h-3" /> Etiqueta
              </button>
              {showLabelPicker && (
                <div className="absolute top-full left-5 mt-1 z-20 w-48 rounded-lg bg-[#112240] border border-white/10 shadow-xl py-1">
                  {allLabels.filter((l) => !detail.labels.some((dl) => dl.id === l.id)).map((l) => (
                    <button key={l.id} onClick={() => addLabel(l.id)} className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: l.color }} /> {l.name}
                    </button>
                  ))}
                  {allLabels.length === 0 && <p className="px-3 py-1.5 text-xs text-slate-500">Nenhuma etiqueta cadastrada.</p>}
                </div>
              )}
            </div>

            {/* Mensagens */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.map((m, i) => (
                <div key={m.id}>
                  {(i === 0 || !isSameDay(messages[i - 1].createdAt, m.createdAt)) && <DateDivider iso={m.createdAt} />}
                  <MessageBubble message={m} />
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="border-t border-white/5 p-3 relative">
              {isPrivateNote && (
                <div className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-400/80">
                  <LockClosedIcon className="w-3 h-3" /> Nota interna — não será enviada ao contato
                </div>
              )}
              {cannedMatches.length > 0 && (
                <div className="absolute bottom-full left-3 mb-1 w-80 rounded-lg bg-[#112240] border border-white/10 shadow-xl py-1 z-20">
                  {cannedMatches.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setComposer(c.content)}
                      className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors"
                    >
                      <p className="text-xs font-semibold text-[#d4af37]">{c.shortcut}</p>
                      <p className="text-xs text-slate-400 truncate">{c.content}</p>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder={isPrivateNote ? 'Escreva uma nota interna...' : 'Escreva uma mensagem... (/ para respostas rápidas)'}
                  rows={2}
                  className={`flex-1 resize-none rounded-lg px-3 py-2 text-sm outline-none border transition-colors ${
                    isPrivateNote
                      ? 'bg-amber-500/5 border-amber-500/20 text-amber-100 focus:border-amber-500/40'
                      : 'bg-[#112240] border-white/8 text-slate-200 focus:border-[#c5a028]'
                  }`}
                />
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setIsPrivateNote((v) => !v)}
                    title="Alternar nota interna"
                    className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${
                      isPrivateNote ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-white/3 border-white/8 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <LockClosedIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={sendMessage}
                    disabled={sending || !composer.trim()}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#c5a028] text-[#020c1b] disabled:opacity-40 hover:bg-[#d4af37] transition-colors"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal — Nova conversa manual */}
      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { setShowNewModal(false); resetNewModal() }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl bg-[#0a192f] border border-white/10 shadow-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Nova conversa manual</h2>
              <button onClick={() => { setShowNewModal(false); resetNewModal() }} className="text-slate-500 hover:text-white transition-colors">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Registre um atendimento que não veio de um canal externo (ligação, presencial, etc).</p>
            <div className="space-y-3">
              <div className="relative">
                <input
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setNewClientId(null); setShowNewClientConfirm(false) }}
                  onFocus={() => { if (clientSuggestions.length > 0 && !newClientId) setShowClientSuggestions(true) }}
                  onBlur={() => setTimeout(() => setShowClientSuggestions(false), 150)}
                  placeholder="Nome do contato"
                  autoComplete="off"
                  className={`w-full h-9 px-3 rounded-lg bg-[#112240] border text-sm text-slate-200 outline-none transition-colors ${
                    newClientId ? 'border-emerald-500/40' : 'border-white/8 focus:border-[#c5a028]'
                  }`}
                />
                {newClientId && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                    <CheckCircleIcon className="w-3.5 h-3.5" /> Cliente
                  </span>
                )}
                {showClientSuggestions && clientSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full z-20 rounded-lg bg-[#112240] border border-white/10 shadow-xl py-1 max-h-48 overflow-y-auto">
                    {clientSuggestions.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectClient(c)}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center justify-between gap-2"
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-slate-200 truncate">{c.nome}</span>
                          <span className="block text-[10px] text-slate-500 truncate">{c.telefone}{c.email ? ` · ${c.email}` : ''}</span>
                        </span>
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-[#c5a028]/12 text-[#d4af37]">Cliente</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(formatTelefone(e.target.value))}
                  placeholder="Telefone — (99) 99999-9999"
                  inputMode="tel"
                  maxLength={15}
                  className={`w-full h-9 px-3 rounded-lg bg-[#112240] border text-sm text-slate-200 outline-none transition-colors ${
                    !phoneValid ? 'border-rose-500/50 focus:border-rose-500/50' : 'border-white/8 focus:border-[#c5a028]'
                  }`}
                />
                {!phoneValid && <p className="text-[11px] text-rose-400 mt-1">Telefone inválido — confira o DDD e o número.</p>}
              </div>
              <div>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="E-mail (opcional se houver telefone)"
                  type="text"
                  className={`w-full h-9 px-3 rounded-lg bg-[#112240] border text-sm text-slate-200 outline-none transition-colors ${
                    !emailValid ? 'border-rose-500/50 focus:border-rose-500/50' : 'border-white/8 focus:border-[#c5a028]'
                  }`}
                />
                {!emailValid && <p className="text-[11px] text-rose-400 mt-1">E-mail inválido.</p>}
              </div>
              {!hasContactChannel && phoneValid && emailValid && (
                <p className="text-[11px] text-slate-500">Informe ao menos um telefone ou e-mail válido.</p>
              )}
              <textarea
                value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Resumo do atendimento..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[#112240] border border-white/8 text-sm text-slate-200 outline-none focus:outline-2 focus:outline-[#c5a028] focus:border-[#c5a028] resize-none"
              />
            </div>

            {showNewClientConfirm && !newClientId ? (
              <div className="mt-4 rounded-lg bg-amber-500/8 border border-amber-500/25 p-3">
                <p className="text-xs text-amber-200/90 mb-2.5">
                  <strong>&quot;{newName.trim()}&quot;</strong> não corresponde a nenhum cliente cadastrado. Cliente novo, seguir mesmo assim?
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setShowNewClientConfirm(false)} className="h-8 px-3 rounded-lg text-xs text-slate-400 hover:text-white transition-colors">
                    Voltar
                  </button>
                  <button
                    onClick={createManualConversation}
                    disabled={creating || !newContactFormValid}
                    className="h-8 px-3 rounded-lg bg-amber-500/20 text-amber-200 text-xs font-medium disabled:opacity-40 hover:bg-amber-500/30 transition-colors"
                  >
                    {creating ? 'Criando...' : 'Sim, continuar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-2 mt-4">
                <button onClick={() => { setShowNewModal(false); resetNewModal() }} className="h-9 px-3 rounded-lg text-sm text-slate-400 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleCreateClick}
                  disabled={creating || !newContactFormValid}
                  className="h-9 px-4 rounded-lg bg-[#c5a028] text-[#020c1b] text-sm font-medium disabled:opacity-40 hover:bg-[#d4af37] transition-colors"
                >
                  {creating ? 'Criando...' : 'Criar conversa'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FolderButton({ icon, label, active, onClick, count }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
        active ? 'bg-[#c5a028]/12 text-[#d4af37] font-medium' : 'text-slate-400 hover:text-white hover:bg-white/3'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="text-[10px] text-slate-500 tabular-nums">{count}</span>
      )}
    </button>
  )
}

function ChannelChip({ channelType }: { channelType: string }) {
  const labels: Record<string, string> = { whatsapp: 'WhatsApp', webform: 'Formulário', manual: 'Manual', chatbot: 'Bot', webchat: 'Chat' }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-slate-400 border border-white/8">
      {labels[channelType] || channelType}
    </span>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'outbound'
  if (message.isPrivate) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[75%] rounded-lg border border-dashed border-amber-500/25 bg-amber-500/5 px-3 py-2">
          <p className="text-[11px] text-amber-400/70 mb-0.5 flex items-center gap-1"><LockClosedIcon className="w-3 h-3" /> Nota interna</p>
          <p className="text-sm text-amber-100/90">{message.content}</p>
        </div>
      </div>
    )
  }
  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-xl px-3.5 py-2 ${
        isOutbound ? 'bg-[#c5a028]/15 text-white' : 'bg-[#112240] text-slate-200'
      }`}>
        {message.senderType === 'bot' && (
          <p className="text-[10px] text-[#d4af37] font-semibold mb-0.5">🤖 Bot</p>
        )}
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-slate-500" title={formatFullDate(message.createdAt)}>{timeAgo(message.createdAt)}</span>
          {isOutbound && message.deliveryStatus === 'failed' && (
            <span className="text-[10px] text-rose-400">falhou</span>
          )}
        </div>
      </div>
    </div>
  )
}
