'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { ACTIVITY_ICON_LIBRARY, ActivityIcon } from '@/lib/crm/activityIcons'
import { useTheme } from '@/hooks/useTheme'

interface Props {
  value: string | null
  onChange: (name: string) => void
}

export default function ActivityIconPicker({ value, onChange }: Props) {
  const t = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = ACTIVITY_ICON_LIBRARY.find(o => o.name === value)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 rounded-xl py-2 px-4 text-sm ${t.inputBg}`}
      >
        <span className="flex items-center gap-2">
          <ActivityIcon name={value} className="h-4 w-4" />
          {selected ? selected.label : 'Escolher ícone...'}
        </span>
        <ChevronDownIcon className="h-4 w-4 opacity-50" />
      </button>

      {open && (
        <div className={`absolute z-20 mt-1 w-full rounded-xl border ${t.borderSub} ${t.modalBg} shadow-xl p-2`}>
          <div className="grid grid-cols-6 gap-1.5 max-h-56 overflow-y-auto">
            {ACTIVITY_ICON_LIBRARY.map(opt => (
              <button
                key={opt.name}
                type="button"
                title={opt.label}
                onClick={() => { onChange(opt.name); setOpen(false) }}
                className={`flex items-center justify-center p-2.5 rounded-lg border transition-all ${
                  value === opt.name
                    ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                    : `border-transparent ${t.hoverBg} ${t.textMuted} hover:text-blue-500`
                }`}
              >
                <opt.Icon className="h-5 w-5" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
