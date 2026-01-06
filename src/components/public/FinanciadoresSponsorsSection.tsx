'use client'

import { useEffect, useState } from 'react'

type FinanciadorSponsor = {
  id: number
  nome: string
  headline: string
  logo_base64: string
  logo_tipo_mime: string
}

export default function FinanciadoresSponsorsSection({ enabled }: { enabled: boolean }) {
  const [items, setItems] = useState<FinanciadorSponsor[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        setLoading(true)
        const res = await fetch('/api/public/financiadores', { cache: 'no-store' })
        const json = await res.json().catch(() => null)
        if (!alive) return
        if (res.ok && json?.success && Array.isArray(json.data)) {
          setItems(json.data)
        } else {
          setItems([])
        }
      } catch {
        if (!alive) return
        setItems([])
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }

    if (enabled) load()
    return () => {
      alive = false
    }
  }, [enabled])

  // Regra: só exibir quando houver registros na tabela (via API)
  if (!enabled) return null
  if (!loading && items.length === 0) return null

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3">
        <div className="text-xs font-extrabold tracking-widest text-amber-900">
          FINANCIAMENTO — PARCEIROS PATROCINADORES
        </div>
        <div className="text-xs text-amber-800 mt-1">
          Marcas apoiadoras desta vitrine.
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-amber-900">Carregando patrocinadores...</div>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 8).map((it) => {
            const src = `data:${it.logo_tipo_mime};base64,${it.logo_base64}`
            return (
              <div
                key={it.id}
                className="rounded-lg bg-white border border-amber-200 shadow-sm p-3 flex items-center gap-3"
              >
                <div className="w-20 h-12 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={src}
                    alt={it.nome}
                    className="max-h-12 max-w-full"
                    draggable={false}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-amber-950 leading-snug">
                    {it.headline || it.nome}
                  </div>
                  <div className="mt-0.5 text-[11px] font-bold text-amber-900 uppercase tracking-wide truncate">
                    {it.nome}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}


