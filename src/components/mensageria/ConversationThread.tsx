'use client'

import ImageLightbox from '@/components/common/ImageLightbox'
import { MAX_ATTACHMENT_BYTES, attachmentTooLargeMessage } from '@/lib/mensageria/attachmentLimits'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  PaperAirplaneIcon, CheckCircleIcon, ClockIcon, PhoneIcon, LockClosedIcon, PlusIcon, MegaphoneIcon, FaceSmileIcon,
  PaperClipIcon, MicrophoneIcon,
} from '@heroicons/react/24/outline'
import EmojiPicker from 'emoji-picker-react'
import { adminFetch } from '@/lib/auth/adminFetch'
import { LinkifiedText } from './LinkifiedText'

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
  clientId: string | null
  clientName: string | null
  assignee: { id: string; name: string | null } | null
  team: { id: string; name: string | null } | null
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

function attributionLabel(attr: ConversationDetail['contact']['attribution']): string | null {
  if (!attr) return null
  if (attr.campaignName) return attr.campaignName
  if (attr.utmSource === 'whatsapp' && attr.utmMedium === 'organico') return 'WhatsApp orgânico'
  if (attr.utmCampaign) return attr.utmCampaign
  return attr.utmSource
}

// Exibe data absoluta com horário completo (hh:mm:ss), no fuso de Brasília.
function formatFullDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const data = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `${data} ${hora}`
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

/** Vídeo recebido/enviado: exibe na bolha e abre num painel da própria tela (com botão de fechar). */
function VideoAttachment({ url }: { url: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <div className="space-y-1 w-fit">
      <video controls playsInline preload="auto" src={url} className="rounded-lg h-auto w-auto max-w-full max-h-[560px] bg-black" />
      <button type="button" onClick={() => setOpen(true)} className="text-xs underline text-[#d4af37]">▶ Abrir vídeo em nova aba</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Fechar (Esc)"
              className="absolute -top-3 -right-3 z-10 h-9 w-9 rounded-full bg-[#c5a028] text-[#020c1b] font-bold shadow-lg hover:bg-[#d4af37]"
            >✕</button>
            <video controls autoPlay playsInline src={url} className="rounded-lg max-h-[85vh] max-w-[90vw] bg-black" />
          </div>
        </div>
      )}
    </div>
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
            <span className="text-[10px] text-slate-500">{formatFullDate(message.createdAt)}</span>
            {isOutbound && message.deliveryStatus === 'failed' && <span className="text-[10px] text-rose-400">falhou</span>}
          </div>
        </div>
      </div>
    )
  }
  const att = message.attachments?.[0] as { url?: string; mimetype?: string; name?: string } | undefined
  const imageUrl = message.contentType === 'image' ? att?.url : null
  const mediaUrl = att?.url || null
  const isVideo = !!att?.mimetype?.startsWith('video/')
  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
      <div className={`w-fit max-w-[70%] rounded-xl px-3.5 py-2 ${isOutbound ? 'bg-[#c5a028]/15 text-white' : 'bg-[#112240] text-slate-200'}`}>
        {message.senderType === 'bot' && <p className="text-[10px] text-[#d4af37] font-semibold mb-0.5">🤖 Bot</p>}
        {imageUrl ? (
          <ImageLightbox src={imageUrl} alt={message.content || 'Imagem'} className="rounded-lg max-w-full max-h-64 object-cover" />
        ) : message.contentType === 'audio' && mediaUrl ? (
          <audio controls preload="none" src={mediaUrl} className="max-w-full" />
        ) : message.contentType === 'file' && mediaUrl && isVideo ? (
          <VideoAttachment url={mediaUrl} />
        ) : message.contentType === 'file' && mediaUrl ? (
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="text-sm underline text-[#d4af37]">
            📎 {att?.name || 'Abrir documento'}
          </a>
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed"><LinkifiedText text={message.content ?? ''} /></p>
        )}
        {mediaUrl && message.content && (
          <p className="text-sm whitespace-pre-line break-words leading-relaxed mt-1">{message.content}</p>
        )}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-slate-500">{formatFullDate(message.createdAt)}</span>
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
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [recording, setRecording] = useState(false)
  const [recError, setRecError] = useState<string | null>(null)
  const [attachError, setAttachError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const emojiAreaRef = useRef<HTMLDivElement | null>(null)

  // Fecha o seletor ao clicar fora da área dele (botão + painel).
  useEffect(() => {
    if (!showEmojiPicker) return
    function onDown(e: MouseEvent) {
      if (emojiAreaRef.current && !emojiAreaRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [showEmojiPicker])

  // Insere o emoji na posição atual do cursor (ou no fim, se o campo não tiver foco).
  function insertEmoji(emoji: string) {
    const el = composerRef.current
    const start = el?.selectionStart ?? composer.length
    const end = el?.selectionEnd ?? composer.length
    setComposer(composer.slice(0, start) + emoji + composer.slice(end))
    setShowEmojiPicker(false)
    requestAnimationFrame(() => {
      el?.focus()
      const pos = start + emoji.length
      el?.setSelectionRange(pos, pos)
    })
  }
  const [isPrivateNote, setIsPrivateNote] = useState(false)

  // Crescimento automático do composer: a altura acompanha o texto até o teto de 40% da tela.
  useEffect(() => {
    const el = composerRef.current
    const wrap = composerWrapRef.current
    if (!el || !wrap) return
    // Teto: a altura do container inteiro da conversa. O campo começa no topo e cresce até
    // o topo do container; além disso, a própria área rola (overflow no textarea).
    const root = rootRef.current
    const rootH = root ? root.clientHeight : window.innerHeight * 0.6
    const maxH = Math.max(120, rootH - 140)
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, maxH) + 'px'
    el.style.maxHeight = maxH + 'px'
  }, [composer, detail?.id])
  const [sending, setSending] = useState(false)
  const [allLabels, setAllLabels] = useState<Label[]>([])
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([])
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const composerWrapRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  async function loadDetail(silent = false) {
    if (!silent) setLoading(true)
    try {
      const res = await adminFetch(`/api/admin/mensageria/conversations/${conversationId}`)
      if (!res.ok) return
      const data = await res.json()
      setDetail(data.conversation)
      setMessages(data.messages || [])
    } catch {
      // Falha de rede: mantém o histórico já exibido.
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Ponteiro para a recarga silenciosa, usado pelo SSE (que é montado uma vez por conversa
  // e não deve capturar uma versão antiga de loadDetail).
  const reloadThreadRef = useRef<(() => void) | null>(null)
  reloadThreadRef.current = () => { loadDetail(true) }

  // Abrir a conversa zera unread_count no servidor (GET .../[id]) — repassa pro
  // chamador atualizar a lista (badge) sem o thread precisar conhecer o estado da lista.
  useEffect(() => {
    loadDetail().then(() => onUpdated?.())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  // Escopados pelo cliente DESTA conversa (tenant-wide + os dele) — recarrega quando o detalhe
  // da conversa chega (clientId só é conhecido depois de loadDetail resolver). Sem isso, um
  // atendente veria/sugeriria etiqueta ou resposta rápida de um cliente diferente do da conversa.
  useEffect(() => {
    if (!detail) return
    const qs = detail.clientId ? `?clientId=${detail.clientId}` : ''
    adminFetch(`/api/admin/mensageria/labels${qs}`).then((r) => r.json()).then((d) => setAllLabels(d.labels || [])).catch(() => {})
    adminFetch(`/api/admin/mensageria/canned-responses${qs}`).then((r) => r.json()).then((d) => setCannedResponses(d.cannedResponses || [])).catch(() => {})
  }, [detail?.clientId])

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
  // Ao receber uma mensagem da conversa aberta, recarrega o histórico completo em vez de
  // acrescentar o evento à mão. Motivo: duas mensagens chegando juntas faziam a segunda ser
  // descartada (estado `prev` desatualizado), e um evento perdido na reconexão do SSE nunca
  // aparecia. Recarregar a partir da API corrige os dois casos e não depende da ordem dos eventos.
  useEffect(() => {
    let cancelled = false
    const es = new EventSource('/api/admin/mensageria/stream')
    es.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data)
        if (event.type === 'message.created' && event.conversationId === conversationId) {
          reloadThreadRef.current?.()
        }
      } catch { /* ignora payload inválido */ }
    }
    es.onerror = () => {}
    return () => { cancelled = true; es.close() }
  }, [conversationId])

  async function sendMessage() {
    if (!composer.trim() && !pendingFile) return
    setSending(true)
    const content = composer.trim()
    const file = pendingFile
    setComposer('')
    setPendingFile(null)
    try {
      if (file) {
        // Com anexo: multipart (texto opcional vira legenda, áudio segue como nota de voz).
        const fd = new FormData()
        fd.append('content', content)
        fd.append('isPrivate', String(isPrivateNote))
        fd.append('file', file)
        const res = await adminFetch(`/api/admin/mensageria/conversations/${conversationId}/messages`, { method: 'POST', body: fd })
        if (!res.ok) {
          // Recusado pela API (ex.: tamanho acima do limite): devolve texto e anexo ao campo.
          const data = await res.json().catch(() => ({}))
          setAttachError(data.error || 'Não foi possível enviar o anexo.')
          setComposer(content)
          setPendingFile(file)
          return
        }
      } else {
        await adminFetch(`/api/admin/mensageria/conversations/${conversationId}/messages`, {
          method: 'POST', body: JSON.stringify({ content, isPrivate: isPrivateNote }),
        })
      }
      await loadDetail()
      setIsPrivateNote(false)
    } finally {
      setSending(false)
    }
  }

  // Gravação de áudio pelo navegador (MediaRecorder). Gera um arquivo que segue o mesmo caminho do anexo.
  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop()
      return
    }
    setRecError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecError('Gravação indisponível: o navegador só libera o microfone em conexão segura (https ou localhost).')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      const rec = new MediaRecorder(stream, { mimeType: mime })
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: mime })
        const audio = new File([blob], `audio-${Date.now()}.webm`, { type: mime })
        if (audio.size > MAX_ATTACHMENT_BYTES) {
          setAttachError(attachmentTooLargeMessage('Áudio gravado', audio.size) + ' Grave um trecho menor.')
        } else {
          setAttachError(null)
          setPendingFile(audio)
        }
        setRecording(false)
      }
      recorderRef.current = rec
      rec.start()
      setRecording(true)
    } catch (err: any) {
      console.error('[ConversationThread] falha ao acessar microfone:', err)
      setRecError(`Não foi possível acessar o microfone (${err?.name || 'erro'}). Verifique a permissão do navegador.`)
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    e.target.value = ''
    if (f) acceptAttachment(f)
  }

  // Valida e define o anexo pendente. Usada pelo clipe e pela colagem (Ctrl+V).
  function acceptAttachment(f: File) {
    const ok = f.type.startsWith('image/') || f.type.startsWith('audio/') || f.type === 'application/pdf'
    if (!ok) { alert('Use imagem, PDF ou áudio.'); return }
    if (f.size > MAX_ATTACHMENT_BYTES) {
      setAttachError(attachmentTooLargeMessage(f.name, f.size))
      return
    }
    setAttachError(null)
    setPendingFile(f)
  }

  async function patchConversation(patch: Record<string, any>) {
    await adminFetch(`/api/admin/mensageria/conversations/${conversationId}`, { method: 'PATCH', body: JSON.stringify(patch) })
    await loadDetail()
    onUpdated?.()
  }

  // Após associar/remover etiqueta, atualiza o detalhe E a lista (onUpdated), para o card
  // refletir a mudança sem o usuário recarregar a página.
  async function addLabel(labelId: string) {
    await adminFetch(`/api/admin/mensageria/conversations/${conversationId}/labels`, { method: 'POST', body: JSON.stringify({ labelId }) })
    await loadDetail()
    setShowLabelPicker(false)
    onUpdated?.()
  }

  async function removeLabel(labelId: string) {
    await adminFetch(`/api/admin/mensageria/conversations/${conversationId}/labels?labelId=${labelId}`, { method: 'DELETE' })
    await loadDetail()
    onUpdated?.()
  }

  if (loading || !detail) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#c5a028]/30 border-t-[#c5a028] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div ref={rootRef} className="flex flex-col h-full bg-[#091628]">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#c5a028]/15 border border-[#c5a028]/20 flex items-center justify-center text-[11px] font-semibold text-[#d4af37]">
            {detail.contact.avatarUrl ? (
              <img src={detail.contact.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : initials(detail.contact.name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{detail.contact.name || detail.contact.phone}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 flex-wrap">
              <PhoneIcon className="w-3 h-3" /> {detail.contact.phone}
              <span className="ml-1.5 text-slate-500">·</span>
              <span className="text-slate-300" title="Atendente responsável pela conversa">
                {detail.assignee?.name ? `Atribuído a ${detail.assignee.name}` : 'Não atribuída'}
              </span>
              {detail.team?.name && (
                <span className="text-slate-500" title="Time responsável pela conversa">· Time {detail.team.name}</span>
              )}
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
            <div className="inline-flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                <CheckCircleIcon className="w-3.5 h-3.5" /> Resolvida
              </span>
              <button onClick={() => patchConversation({ status: 'open' })} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/10 transition-colors">
                Reabrir
              </button>
            </div>
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

      <div ref={composerWrapRef} className="border-t border-white/5 px-3 pb-3 pt-1.5 relative">
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
        {attachError && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <span>{attachError}</span>
            <button onClick={() => setAttachError(null)} className="text-slate-400 hover:text-red-300" title="Fechar">✕</button>
          </div>
        )}
        {recError && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <span>{recError}</span>
            <button onClick={() => setRecError(null)} className="text-slate-400 hover:text-red-300" title="Fechar">✕</button>
          </div>
        )}
        {pendingFile && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-[#c5a028]/25 bg-[#c5a028]/8 px-3 py-2 text-xs text-slate-200">
            {pendingFile.type.startsWith('image/') && (
              <img src={URL.createObjectURL(pendingFile)} alt="" className="h-10 w-10 rounded object-cover" />
            )}
            <span className="truncate flex-1">
              {pendingFile.type.startsWith('audio/') ? 'Áudio gravado' : pendingFile.name}
            </span>
            <button onClick={() => setPendingFile(null)} className="text-slate-400 hover:text-red-400" title="Remover anexo">✕</button>
          </div>
        )}
        <div className="flex items-start gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,audio/*"
            className="hidden"
            onChange={onPickFile}
          />
          <textarea
            ref={composerRef}
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onPaste={(e) => {
              if (isPrivateNote) return
              const img = Array.from(e.clipboardData?.items ?? []).find((it) => it.kind === 'file' && it.type.startsWith('image/'))
              const raw = img?.getAsFile()
              if (raw) {
                // Imagem colada costuma chegar sem tipo/nome definidos; a API só aceita MIME de imagem.
                const ext = (raw.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
                const file = new File([raw], `colado-${Date.now()}.${ext}`, { type: raw.type || 'image/png' })
                e.preventDefault()
                acceptAttachment(file)
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={isPrivateNote ? 'Escreva uma nota interna...' : 'Escreva uma mensagem... (/ para respostas rápidas)'}
            rows={4}
            style={{ maxHeight: '40vh' }}
            className={`flex-1 self-stretch resize-none overflow-y-auto rounded-lg px-3 py-2 text-sm outline-none border transition-colors ${
              isPrivateNote ? 'bg-amber-500/5 border-amber-500/20 text-amber-100 focus:border-amber-500/40' : 'bg-[#112240] border-white/8 text-slate-200 focus:border-[#c5a028]'
            }`}
          />
          <div ref={emojiAreaRef} className="flex flex-col gap-1.5 relative">
            <button
              onClick={() => setShowEmojiPicker((v) => !v)}
              title="Inserir emoji"
              className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${showEmojiPicker ? 'bg-[#c5a028]/15 border-[#c5a028]/30 text-[#d4af37]' : 'bg-white/3 border-white/8 text-slate-400 hover:text-slate-200'}`}
            >
              <FaceSmileIcon className="w-4 h-4" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-10 right-0 z-30">
                <EmojiPicker
                  onEmojiClick={(data) => insertEmoji(data.emoji)}
                  width={300}
                  height={360}
                  searchDisabled={false}
                  skinTonesDisabled
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isPrivateNote}
              title={isPrivateNote ? 'Nota interna não envia anexo' : 'Anexar imagem, PDF ou áudio'}
              className="h-8 w-8 flex items-center justify-center rounded-lg border bg-white/3 border-white/8 text-slate-400 hover:text-slate-200 disabled:opacity-40 transition-colors"
            >
              <PaperClipIcon className="w-4 h-4" />
            </button>
            <button
              onClick={toggleRecording}
              disabled={isPrivateNote}
              title={recording ? 'Parar gravação' : 'Gravar áudio'}
              className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${recording ? 'bg-red-500/15 border-red-500/30 text-red-400' : 'bg-white/3 border-white/8 text-slate-400 hover:text-slate-200'}`}
            >
              <MicrophoneIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPrivateNote((v) => !v)}
              title="Alternar nota interna"
              className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ${isPrivateNote ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-white/3 border-white/8 text-slate-400 hover:text-slate-200'}`}
            >
              <LockClosedIcon className="w-4 h-4" />
            </button>
            <button
              onClick={sendMessage}
              disabled={sending || (!composer.trim() && !pendingFile)}
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
