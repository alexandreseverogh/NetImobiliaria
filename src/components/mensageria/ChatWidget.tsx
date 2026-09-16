'use client'

/**
 * M4.4 — Widget de chat público (docs/PLANO_MENSAGERIA.md seção 8.4). Bolha flutuante +
 * painel, embutida em páginas públicas (ex.: detalhe de imóvel) e parametrizada só por
 * `tenantId` — genérico por construção, o mesmo componente serve qualquer segmento/tenant que
 * tenha um bot ativo, sem código novo por vertical.
 *
 * Fica invisível (retorna null) se o tenant não tiver `bot_flows.is_active=true` — checado uma
 * vez via GET ao montar. Identidade do visitante: UUID gerado no navegador, persistido em
 * localStorage por tenant (uma sessão de chat por tenant, não uma global).
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'

interface ChatMessage {
  id: string
  direction: 'inbound' | 'outbound'
  senderType: 'contact' | 'agent' | 'bot' | 'system'
  content: string | null
  contentType: string
  attachments: { url: string }[] | null
  createdAt: string
}

interface Props {
  tenantId: string | null | undefined
  /** Contexto da página atual — dirigido por config, nunca hardcoded (ex.: { entity: 'imovel', id: 1 }). */
  pageContext?: { entity: string; id: string | number } | null
}

function getOrCreateSessionId(tenantId: string): string {
  const key = `mensageria_webchat_session_${tenantId}`
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export default function ChatWidget({ tenantId, pageContext }: Props) {
  const [available, setAvailable] = useState(false)
  const [checked, setChecked] = useState(false)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const sessionIdRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Checa 1x se esse tenant tem bot ativo — sem isso, a bolha nunca aparece (evita oferecer
  // um chat que nunca vai responder pra empresas que não configuraram o bot).
  useEffect(() => {
    if (!tenantId) return
    sessionIdRef.current = getOrCreateSessionId(tenantId)
    const sessionId = sessionIdRef.current
    fetch(`/api/public/mensageria/chat?tenantId=${tenantId}&sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        setAvailable(!!d.active)
        if (Array.isArray(d.messages)) setMessages(d.messages)
      })
      .catch(() => setAvailable(false))
      .finally(() => setChecked(true))
  }, [tenantId])

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || !tenantId || !sessionIdRef.current || sending) return
    setInput('')
    setSending(true)
    // Otimista: mostra a mensagem do visitante na hora, sem esperar o round-trip.
    setMessages((prev) => [...prev, {
      id: `optimistic-${Date.now()}`, direction: 'inbound', senderType: 'contact',
      content: text, contentType: 'text', attachments: null, createdAt: new Date().toISOString(),
    }])
    try {
      const res = await fetch('/api/public/mensageria/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, sessionId: sessionIdRef.current, message: text, pageContext }),
      })
      const data = await res.json()
      if (res.ok && Array.isArray(data.messages)) setMessages(data.messages)
    } catch {
      // Falha de rede — a mensagem otimista fica visível, sem resposta; visitante pode tentar de novo.
    } finally {
      setSending(false)
    }
  }, [input, tenantId, sending])

  if (!tenantId || !checked || !available) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[340px] h-[460px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-indigo-600 text-white flex items-center justify-between shrink-0">
            <span className="font-black text-sm">Fale conosco</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 text-center mt-6">Envie uma mensagem para começar.</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.direction === 'inbound' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.direction === 'inbound' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  {m.contentType === 'image' && m.attachments?.[0]?.url ? (
                    <img src={m.attachments[0].url} alt="" className="rounded-lg max-w-full" />
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-gray-100 flex items-center gap-2 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Digite sua mensagem..."
              disabled={sending}
              className="flex-1 px-3 py-2 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-40 shrink-0"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-14 w-14 rounded-full bg-indigo-600 text-white shadow-xl flex items-center justify-center hover:bg-indigo-700 transition-colors"
        title="Fale conosco"
      >
        {open ? <XMarkIcon className="h-6 w-6" /> : <ChatBubbleLeftRightIcon className="h-6 w-6" />}
      </button>
    </div>
  )
}
