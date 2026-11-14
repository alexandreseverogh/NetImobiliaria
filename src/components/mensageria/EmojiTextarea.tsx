'use client'

import { useEffect, useRef, useState } from 'react'
import { FaceSmileIcon } from '@heroicons/react/24/outline'
import EmojiPicker from 'emoji-picker-react'

/**
 * Textarea com seletor de emoji. Insere o emoji na posição do cursor, fecha ao escolher e
 * ao clicar fora. Reaproveitado pela criação e pela edição de respostas rápidas.
 */
export default function EmojiTextarea({
  value, onChange, placeholder, rows = 3, className = '',
}: {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  rows?: number
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const areaRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (areaRef.current && !areaRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function insertEmoji(emoji: string) {
    const el = textareaRef.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    onChange(value.slice(0, start) + emoji + value.slice(end))
    setOpen(false)
    requestAnimationFrame(() => {
      el?.focus()
      const pos = start + emoji.length
      el?.setSelectionRange(pos, pos)
    })
  }

  return (
    <div ref={areaRef} className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 pr-10 rounded-lg bg-[#112240] border border-white/8 text-sm text-slate-200 outline-none focus:border-[#c5a028] resize-none transition-colors ${className}`}
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Inserir emoji"
        className="absolute right-2 top-2 h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-[#d4af37] transition-colors"
      >
        <FaceSmileIcon className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-30">
          <EmojiPicker
            onEmojiClick={(data) => insertEmoji(data.emoji)}
            width={300}
            height={360}
            skinTonesDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}
    </div>
  )
}
