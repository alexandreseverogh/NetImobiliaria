'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  PaperAirplaneIcon, CheckCircleIcon, ClockIcon, PhoneIcon, LockClosedIcon, PlusIcon, MegaphoneIcon,
} from '@heroicons/react/24/outline'
import { adminFetch } from '@/lib/auth/adminFetch'

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  senderType: 'contact' | 'agent' | 'bot' | 'system'
  senderId: string | null
  content: string | null
  contentType: string
  attachments?: { url: string }[] | null
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
  contact: {
    id: string; name: string | null; phone: string | null; email: string | null; avatarUrl: string | null; leadUuid: string | null
    attribution: { campaignId: string | null; campaignName: string | null; utmSource: string | null; utmMedium: string | null; utmCampaign: string | null } | null
  }
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

function attributionLabel(attr: ConversationDetail['contact']['attribution']): string | null {
  if (!attr) return null
  if (attr.campaignName) return attr.campaignName
  if (attr.utmSource === 'whatsapp' && attr.utmMedium === 'organico') return 'WhatsApp orgânico'
  if (attr.utmCampaign) return attr.utmCampaign
  return attr.utmSource
}

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

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
}

function SlaBadge({ detail }: { detail: ConversationDetail }) {
  if (!detail.sla) return null
  const { firstResponseDue, firstResponseBreached, resolutionDue, resolutionBreached } = detail.sla
  if (!detail.firstResponseAt && firstResponseDue) {
    if (firstResponseBreached) {
      return <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-rose-500/12 text-rose-400 text-xs font-medium"><ClockIcon className="w-3.5 h-3.5" /> SLA estourado</span>
    }
    const due = new Date(firstResponseDue)
    return <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-white/5 text-slate-400 text-xs font-medium"><ClockIcon className="w-3.5 h-3.5" /> Responder até {due.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
  }
  if (detail.status !== 'resolved' && resolutionDue) {
    if (resolutionBreached) {
      return <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-rose-500/12 text-rose-400 text-xs font-medium"><ClockIcon className="w-3.5 h-3.5" /> Resolução atrasada</span>
    }
    const due = new Date(resolutionDue)
    return <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-white/5 text-slate-400 text-xs font-medium"><ClockIcon className="w-3.5 h-3.5" /> Resolver até {due.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
  }
  return null
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
  // Cartão premium (agrupamento por item): cabeçalho + info + galeria das fotos daquele item.
  if (message.contentType === 'card') {
    const [header, ...rest] = (message.content || '').split('\n\n')
    const body = rest.join('\n\n')
    const imgs = (message.attachments || []).map((a) => a?.url).filter(Boolean) as string[]
    return (
      <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[85%] rounded-2xl overflow-hidden border border-[#c5a028]/25 bg-[#0f1b30] shadow-lg">
          {message.senderType === 'bot' && <div className="px-3.5 pt-2 text-[10px] text-[#d4af37] font-semibold">🤖 Bot</div>}
          <div className="px-3.5 pt-1.5 pb-2">
            <p className="text-sm font-bold text-[#e9c766] leading-snug">{header}</p>
            {body && <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed mt-1">{body}</p>}
          </div>
          {imgs.length > 0 && (
            <div className={`grid gap-0.5 ${imgs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {imgs.map((u, i) => (
                <img key={i} src={u} loading="lazy" className="w-full h-40 object-cover" alt="Foto do item" />
              ))}
            </div>
          )}
          <div className="flex items-center justify-end gap-1 px-3.5 py-1.5">
            <span className="text-[10px] text-slate-500" title={formatFullDate(message.createdAt)}>{timeAgo(message.createdAt)}</span>
            {isOutbound && message.deliveryStatus === 'failed' && <span className="text-[10px] text-rose-400">falhou</span>}
          </div>
        </div>
      </div>
    )
  }
  const imageUrl = message.contentType === 'image' ? message.attachments?.[0]?.url : null
  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[70%] rounded-xl px-3.5 py-2 ${isOutbound ? 'bg-[#c5a028]/15 text-white' : 'bg-[#112240] text-slate-200'}`}>
        {message.senderType === 'bot' && <p className="text-[10px] text-[#d4af37] font-semibold mb-0.5">🤖 Bot</p>}
        {imageUrl ? (
          <img src={imageUrl} loading="lazy" className="rounded-lg max-w-full max-h-64 object-cover" alt="Foto do imóvel" />
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        )}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-slate-500" title={formatFullDate(message.createdAt)}>{timeAgo(message.createdAt)}</span>
          {isOutbound && message.deliveryStatus === 'failed' && <span className="text-[10px] text-rose-400">falhou</span>}
        </div>
      </div>
    </div>
  )
}

function DateDivider({ iso }: { iso: string }) {
  return (
    <div className="flex justify-center my-1">
      <span className="text-[10px] font-medium text-slate-400 bg-white/5 border border-white/8 px-2.5 py-1 rounded-full capitalize">{formatDateLabel(iso)}</span>
    </div>
  )
}

/**
 * Thread de conversa reaproveitável — mesma UX de src/app/mensageria/page.tsx (coluna 3),
 * extraída como componente próprio para uso no drawer do Painel do Gestor (seção 17.2).
 * `onUpdated` é chamado após ações que mudam status/atribuição — o chamador (tabela do
 * gestor) usa isso pra recarregar a lista sem o drawer precisar saber da tabela.
 */
export default function ConversationThread({ conversationId, onUpdated }: { conversationId: string; onUpdated?: () => void }) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [composer, setComposer] = useState('')
  const [isPrivateNote, setIsPrivateNote] = useState(false)
  const [sending, setSending] = useState(false)
  const [allLabels, setAllLabels] = useState<Label[]>([])
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([])
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  async function loadDetail() {
    setLoading(true)
    try {
      const res = await adminFetch(`/api/admin/mensageria/conversations/${conversationId}`)
      const data = await res.json()
      setDetail(data.conversation)
      setMessages(data.messages || [])
    } finally {
      setLoading(false)
    }
  }

  // Abrir a conversa zera unread_count no servidor (GET .../[id]) — repassa pro
  // chamador atualizar a lista (badge) sem o thread precisar conhecer o estado da lista.
  useEffect(() => {
    loadDetail().then(() => onUpdated?.())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  useEffect(() => {
    adminFetch('/api/admin/mensageria/labels').then((r) => r.json()).then((d) => setAllLabels(d.labels || [])).catch(() => {})
    adminFetch('/api/admin/mensageria/canned-responses').then((r) => r.json()).then((d) => setCannedResponses(d.cannedResponses || [])).catch(() => {})
  }, [])

  const cannedMatches = useMemo(() => {
    if (!composer.startsWith('/')) return []
    const query = composer.slice(1).toLowerCase()
    return cannedResponses.filter((c) => c.shortcut.slice(1).toLowerCase().startsWith(query)).slice(0, 5)
  }, [composer, cannedResponses])

  useEffect(() => {
    const el = messagesContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Tempo real — a mesma conversa pode estar sendo vista por outro atendente simultaneamente
  useEffect(() => {
    const es = new EventSource('/api/admin/mensageria/stream')
    es.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data)
        if (event.type === 'message.created' && event.conversationId === conversationId) {
          setMessages((prev) => (prev.some((m) => m.id === event.message.id) ? prev : [...prev, event.message]))
        }
      } catch { /* ignora payload inválido */ }
    }
    es.onerror = () => {}
    return () => es.close()
  }, [conversationId])

  async function sendMessage() {
    if (!composer.trim()) return
    setSending(true)
    const content = composer.trim()
    setComposer('')
    try {
      await adminFetch(`/api/admin/mensageria/conversations/${conversationId}/messages`, {
        method: 'POST', body: JSON.stringify({ content, isPrivate: isPrivateNote }),
      })
      await loadDetail()
      setIsPrivateNote(false)
    } finally {
      setSending(false)
    }
  }

  async function patchConversation(patch: Record<string, any>) {
    await adminFetch(`/api/admin/mensageria/conversations/${conversationId}`, { method: 'PATCH', body: JSON.stringify(patch) })
    await loadDetail()
    onUpdated?.()
  }

  async function addLabel(labelId: string) {
    await adminFetch(`/api/admin/mensageria/conversations/${conversationId}/labels`, { method: 'POST', body: JSON.stringify({ labelId }) })
    await loadDetail()
    setShowLabelPicker(false)
  }

  async function removeLabel(labelId: string) {
    await adminFetch(`/api/admin/mensageria/conversations/${conversationId}/labels?labelId=${labelId}`, { method: 'DELETE' })
    await loadDetail()
  }

  if (loading || !detail) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#c5a028]/30 border-t-[#c5a028] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#0a192f]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#c5a028]/15 border border-[#c5a028]/20 flex items-center justify-center text-[11px] font-semibold text-[#d4af37]">
            {initials(detail.contact.name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{detail.contact.name || detail.contact.phone}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
              <PhoneIcon className="w-3 h-3" /> {detail.contact.phone}
              {attributionLabel(detail.contact.attribution) && (
                <span
                  className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#c5a028]/10 border border-[#c5a028]/20 text-[#d4af37] text-[11px] font-medium"
                  title={detail.contact.attribution?.campaignId ? 'Origem: clique numa campanha' : 'Origem: contato orgânico via WhatsApp'}
                >
                  <MegaphoneIcon className="w-3 h-3" /> {attributionLabel(detail.contact.attribution)}
                </span>
              )}
              {detail.contact.leadUuid && (
                <a href={`/crm/leads?leadId=${detail.contact.leadUuid}`} target="_blank" rel="noreferrer" className="ml-2 text-[#d4af37] hover:underline">Ver no CRM →</a>
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
            <button onClick={() => patchConversation({ status: 'resolved' })} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#c5a028]/12 text-[#d4af37] text-xs font-medium hover:bg-[#c5a028]/20 transition-colors">
              <CheckCircleIcon className="w-3.5 h-3.5" /> Resolver
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">
              <CheckCircleIcon className="w-3.5 h-3.5" /> Resolvida
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-5 py-2 border-b border-white/5 flex-wrap relative">
        {detail.labels.map((l) => (
          <span key={l.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium" style={{ background: `${l.color}22`, color: l.color, border: `1px solid ${l.color}40` }}>
            {l.name}
            <button onClick={() => removeLabel(l.id)} className="opacity-60 hover:opacity-100">×</button>
          </span>
        ))}
        <button onClick={() => setShowLabelPicker((v) => !v)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-500 border border-white/8 hover:text-slate-300 transition-colors">
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

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={m.id}>
            {(i === 0 || !isSameDay(messages[i - 1].createdAt, m.createdAt)) && <DateDivider iso={m.createdAt} />}
            <MessageBubble message={m} />
          </div>
        ))}
      </div>

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
              isPrivateNote ? 'bg-amber-500/5 border-amber-500/20 text-amber-100 focus:border-amber-500/40' : 'bg-[#112240] border-white/8 text-slate-200 focus:border-[#c5a028]'
            }`}
          />
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setIsPrivateNote((v) => !v)}
              title="Alternar nota interna"
              className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${isPrivateNote ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-white/3 border-white/8 text-slate-400 hover:text-slate-200'}`}
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
    </div>
  )
}
