'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

/**
 * Filtro de Temas do ciclo de vendas em lista suspensa com checkboxes.
 * Default "Todos" (nada excluído). Marcar "Todos" seleciona todos os temas; desmarcar um
 * tema tira "Todos" da marcação. Os temas NÃO marcados ficam em `excluded`.
 * Leads sem tema nunca são ocultados pelo filtro.
 */

export interface TemaOption {
  id: number
  nome: string
}

interface Props {
  temas: TemaOption[]
  excluded: string[]
  onChange: (excluded: string[]) => void
  isDark: boolean
}

export default function TemaMultiSelect({ temas, excluded, onChange, isDark }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const todosMarcados = excluded.length === 0
  const marcados = temas.filter(t => !excluded.includes(String(t.id)))

  const label =
    temas.length === 0 ? 'Sem temas'
    : todosMarcados ? 'Todos os temas'
    : marcados.length === 0 ? 'Nenhum tema'
    : marcados.map(t => t.nome).join(', ')

  const toggleTodos = () => onChange(todosMarcados ? temas.map(t => String(t.id)) : [])
  const toggleTema = (id: string) =>
    onChange(excluded.includes(id) ? excluded.filter(x => x !== id) : [...excluded, id])

  const triggerCls = isDark
    ? 'bg-white/5 border-white/10 text-slate-200 hover:bg-white/10'
    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
  const panelCls = isDark
    ? 'bg-[#0d1421] border-white/10 text-slate-200'
    : 'bg-white border-slate-200 text-slate-800'
  const rowHover = isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={temas.length === 0}
        className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all min-w-[11rem] max-w-[18rem] disabled:opacity-50 ${triggerCls}`}
      >
        <span className="truncate flex-1 text-left">{label}</span>
        <ChevronDownIcon className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && temas.length > 0 && (
        <div className={`absolute left-0 z-50 mt-1 w-full min-w-[14rem] rounded-xl border shadow-xl py-1 ${panelCls}`}>
          <label className={`flex items-center gap-3 px-4 py-2 cursor-pointer text-sm font-bold border-b ${isDark ? 'border-white/10' : 'border-slate-100'} ${rowHover}`}>
            <input type="checkbox" checked={todosMarcados} onChange={toggleTodos} className="h-4 w-4 accent-[#c5a028]" />
            Todos
          </label>
          {temas.map(t => {
            const id = String(t.id)
            return (
              <label key={t.id} className={`flex items-center gap-3 px-4 py-2 cursor-pointer text-sm ${rowHover}`}>
                <input
                  type="checkbox"
                  checked={!excluded.includes(id)}
                  onChange={() => toggleTema(id)}
                  className="h-4 w-4 accent-[#c5a028]"
                />
                {t.nome}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
