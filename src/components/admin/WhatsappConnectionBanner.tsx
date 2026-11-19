'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/auth/adminFetch'

/**
 * Faixa de aviso quando o WhatsApp da empresa está desconectado. Some sozinha quando a conexão
 * volta. Só aparece para quem tem permissão de dados da empresa (a própria API decide).
 */
export default function WhatsappConnectionBanner() {
  const [since, setSince] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = () =>
      adminFetch('/api/admin/conexao-whatsapp/aviso')
        .then(r => (r.ok ? r.json() : { show: false }))
        .then(d => { if (alive) setSince(d.show ? d.since : null) })
        .catch(() => { if (alive) setSince(null) })
    load()
    const id = setInterval(load, 60_000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  if (!since) return null

  const when = new Date(since).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between gap-4 text-sm">
      <span className="font-semibold text-amber-800">
        O WhatsApp da empresa está desconectado desde {when}. As mensagens não estão sendo recebidas.
      </span>
      <Link href="/admin/dados-empresa?tab=comunicacao" className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-black uppercase tracking-widest">
        Reconectar
      </Link>
    </div>
  )
}
