'use client'

import ImageLightbox from '@/components/common/ImageLightbox'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { adminFetch } from '@/lib/auth/adminFetch'
import { CalendarDaysIcon, ChatBubbleLeftIcon, PencilSquareIcon, TrashIcon, XCircleIcon, PlusIcon } from '@heroicons/react/24/outline'
import DynamicIcon from '@/components/common/DynamicIcon'

type TimelineItem = {
  tipo: 'mensageria_message' | 'atividade'
  id: string
  occurredAt: string
  direction?: 'inbound' | 'outbound'
  senderType?: string
  content?: string | null
  contentType?: string
  attachments?: { url: string; mimetype?: string; name?: string }[]
  descricao?: string
  mensagemTipo?: { nome: string; icone: string | null; cor: string | null } | null
  tipoAtividade?: { nome: string; icone: string | null; cor: string | null } | null
}

type Visita = {
  id: string
  data_hora_inicio: string
  status: 'agendado' | 'confirmado' | 'cancelado' | 'realizado'
  corretor_nome?: string
  observacoes?: string
  /** Momento em que a visita foi registrada no sistema (timestamptz, com segundos). */
  created_at?: string
}

/** Uma entrada da linha do tempo unificada (mensagens, atividades e visitas, em ordem cronológica). */
type Entry =
  | { kind: 'msg'; at: number; item: TimelineItem }
  | { kind: 'ativ'; at: number; item: TimelineItem }
  | { kind: 'visit'; at: number; visit: Visita }

/** Conteúdo de uma mensagem: mídia (imagem/áudio/vídeo/documento) com legenda, ou texto. */
function TimelineMedia({ item, strong, muted }: { item: TimelineItem; strong: string; muted: string }) {
  const att = item.attachments?.[0]
  const url = att?.url
  const caption = item.content
  if (!url) return <p className={strong}>{caption || <em className={muted}>(mensagem sem conteúdo)</em>}</p>
  const isVideo = !!att?.mimetype?.startsWith('video/')
  let media: ReactNode
  if (item.contentType === 'image') {
    media = <ImageLightbox src={url} alt={caption || 'Imagem'} className="rounded-lg max-w-full max-h-48 object-cover" />
  } else if (item.contentType === 'audio') {
    media = <audio controls preload="none" src={url} className="max-w-full" />
  } else if (isVideo) {
    media = <video controls preload="metadata" src={url} className="rounded-lg max-w-full max-h-48" />
  } else {
    media = (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm underline text-[#d4af37]">
        📎 {att?.name || 'Abrir documento'}
      </a>
    )
  }
  return (
    <div className="space-y-1">
      {media}
      {caption && <p className={strong}>{caption}</p>}
    </div>
  )
}

interface Props {
  leadUuid: string
  isDark: boolean
  refreshKey?: number
  /** Abre o modal de agendamento de visita. Ausente = sem botão (tenant sem calendário). */
  onAgendar?: () => void
  /** Abre o formulário de nova atividade (renderizado logo abaixo da barra de ações). */
  onNovaAtividade?: () => void
  /** Editar/excluir uma atividade listada no histórico (a ação é executada pelo AtividadesLead). */
  onAtividadeAction?: (id: string, action: 'edit' | 'delete') => void
}

/** Cor de tipo só aceita hex válido (#RGB ou #RRGGBB). */
function corHex(cor: string | null | undefined): string {
  return cor && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(cor) ? cor : ''
}

/**
 * Histórico unificado do lead: mensagens do WhatsApp (balões: cliente à esquerda, empresa à
 * direita), atividades e visitas, todos intercalados em ordem cronológica.
 */
export default function LeadTimeline({ leadUuid, isDark, refreshKey, onAgendar, onNovaAtividade, onAtividadeAction }: Props) {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  // Recarrega mensagens/atividades e visitas. Usado na abertura e a cada mensagem nova (tempo real).
  const reload = useCallback(() => {
    const tl = adminFetch(`/api/crm/leads/${leadUuid}/timeline`)
      .then(r => r.json())
      .then(d => { if (d.success) setItems(d.items) })
      .catch(() => {})
    const ag = fetch(`/api/crm/agendamentos?lead_uuid=${leadUuid}`)
      .then(r => r.json())
      .then(d => { if (d.success) setVisitas(d.agendamentos) })
      .catch(() => {})
    return Promise.all([tl, ag])
  }, [leadUuid])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    reload().finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reload, refreshKey])

  // Tempo real: mesmo canal (SSE) da Mensageria. Sem permissão de Mensageria o canal não abre.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let es: EventSource | null = null
    try {
      es = new EventSource('/api/admin/mensageria/stream')
      es.onmessage = (ev) => {
        try {
          const event = JSON.parse(ev.data)
          if (event.type !== 'message.created') return
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => { reload() }, 400)
        } catch { /* payload inválido: ignora */ }
      }
      es.onerror = () => {}
    } catch { /* EventSource indisponível: segue sem tempo real */ }
    return () => {
      if (timer) clearTimeout(timer)
      es?.close()
    }
  }, [reload])

  async function cancelVisita(id: string) {
    setCancelingId(id)
    try {
      await fetch(`/api/crm/agendamentos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelado' }),
      })
      setVisitas(prev => prev.map(v => v.id === id ? { ...v, status: 'cancelado' } : v))
    } finally {
      setCancelingId(null)
    }
  }

  const muted = isDark ? 'text-white/50' : 'text-gray-500'
  const strong = isDark ? 'text-white/90' : 'text-gray-900'

  // Cor do tipo configurado pelo tenant: só aceita hex válido (#RGB ou #RRGGBB).
  const tipoCor = items.find(i => i.mensagemTipo)?.mensagemTipo?.cor || ''
  const corValida = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(tipoCor)
  const corTipo = corValida ? tipoCor : ''

  const entries: Entry[] = [
    ...items.map((it): Entry => ({
      kind: it.tipo === 'mensageria_message' ? 'msg' : 'ativ',
      at: new Date(it.occurredAt).getTime(),
      item: it,
    })),
    // Visita entra na linha do tempo no momento em que foi registrada (created_at), não na data
    // agendada — a data marcada já aparece no cartão. Assim tudo fica intercalado por ocorrência real.
    ...visitas.map((v): Entry => ({
      kind: 'visit',
      at: new Date(v.created_at || v.data_hora_inicio).getTime(),
      visit: v,
    })),
  ].sort((a, b) => a.at - b.at)

  const headerRow = (
    <div className={`flex items-center space-x-2 text-xs font-black uppercase tracking-widest ${strong}`}>
      <CalendarDaysIcon className="h-4 w-4 text-indigo-500" />
      <span>Histórico</span>
    </div>
  )

  // Barra de ações no fim do histórico: as duas inclusões ficam juntas, logo abaixo do último item.
  const actionBar = (
    <div className={`flex flex-wrap items-center gap-2 pt-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
      {onNovaAtividade && (
        <button onClick={onNovaAtividade}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${isDark ? 'border-blue-500/30 text-blue-300 hover:bg-blue-500/10' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}>
          <PlusIcon className="h-3.5 w-3.5" /> Nova atividade
        </button>
      )}
      {onAgendar && (
        <button onClick={onAgendar}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${isDark ? 'border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}>
          <PlusIcon className="h-3.5 w-3.5" /> Agendar visita
        </button>
      )}
    </div>
  )

  if (loading) return <div className="space-y-3">{headerRow}<p className={`text-xs ${muted}`}>Carregando histórico…</p>{actionBar}</div>

  return (
    <div className="space-y-3">
      {headerRow}
      {entries.length === 0 && <p className={`text-xs italic ${muted}`}>Nenhum registro ainda.</p>}
      <ul className="space-y-2">
        {entries.map(e => {
          const when = new Date(e.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

          if (e.kind === 'msg') {
            const it = e.item
            const fromLead = it.direction === 'inbound'
            return (
              <li key={`m-${it.id}`} className={`flex ${fromLead ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${fromLead ? (isDark ? 'bg-white/5' : 'bg-gray-100') : ''} ${!fromLead && !corValida ? (isDark ? 'bg-blue-500/15' : 'bg-blue-50') : ''}`}
                  style={!fromLead && corValida ? { backgroundColor: `${corTipo}26`, borderLeft: `3px solid ${corTipo}` } : undefined}
                >
                  <TimelineMedia item={it} strong={strong} muted={muted} />
                  <p className={`text-[10px] mt-1 flex items-center gap-1 ${muted}`}>
                    <ChatBubbleLeftIcon className="h-3 w-3 shrink-0" />
                    {fromLead ? 'Cliente' : 'Empresa'} · {it.mensagemTipo?.nome || 'WhatsApp'} · {when}
                  </p>
                </div>
              </li>
            )
          }

          if (e.kind === 'ativ') {
            const it = e.item
            const cor = corHex(it.tipoAtividade?.cor)
            return (
              <li key={`a-${it.id}`} className={`mx-auto w-full max-w-[90%] rounded-xl px-3 py-2 border ${cor ? '' : isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-white'}`}
                style={cor ? { borderColor: `${cor}55`, backgroundColor: `${cor}12` } : undefined}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                    style={cor ? { color: cor } : undefined}>
                    {it.tipoAtividade?.icone && <DynamicIcon iconName={it.tipoAtividade.icone} className="h-3.5 w-3.5" />}
                    {it.tipoAtividade?.nome || 'Atividade'}
                  </p>
                  {onAtividadeAction && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => onAtividadeAction(it.id, 'edit')} title="Editar atividade"
                        className={`${muted} hover:text-blue-500 transition-colors`}>
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => onAtividadeAction(it.id, 'delete')} title="Excluir atividade"
                        className={`${muted} hover:text-red-500 transition-colors`}>
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <p className={`text-sm mt-0.5 ${strong}`}>{it.descricao}</p>
                <p className={`text-[10px] mt-0.5 ${muted}`}>{when}</p>
              </li>
            )
          }

          const v = e.visit
          const cancelada = v.status === 'cancelado'
          const podeCancelar = !cancelada && v.status !== 'realizado'
          return (
            <li key={`v-${v.id}`} className={`mx-auto w-full max-w-[90%] rounded-xl px-3 py-2 border ${isDark ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50/60'} ${cancelada ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                  <CalendarDaysIcon className="h-3.5 w-3.5" />
                  Visita · {v.status}
                </p>
                {podeCancelar && (
                  <button onClick={() => cancelVisita(v.id)} disabled={cancelingId === v.id}
                    className="text-[10px] font-bold text-red-500 hover:text-red-400 disabled:opacity-50">
                    {cancelingId === v.id ? 'Cancelando…' : 'Cancelar visita'}
                  </button>
                )}
              </div>
              <p className={`text-sm ${strong}`}>{when}{v.corretor_nome ? ` · ${v.corretor_nome}` : ''}</p>
              {v.observacoes && <p className={`text-xs mt-0.5 ${muted}`}>{v.observacoes}</p>}
              {v.created_at && (
                <p className={`text-[10px] mt-1 ${muted}`}>
                  Registrada em {new Date(v.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })}
                </p>
              )}
            </li>
          )
        })}
      </ul>
      {actionBar}
    </div>
  )
}
