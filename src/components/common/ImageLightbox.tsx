'use client'

import { useEffect, useState } from 'react'

interface Props {
  src: string
  alt?: string
  /** Classes da miniatura exibida na conversa/ficha. */
  className?: string
}

/**
 * Miniatura clicável que abre a imagem ampliada num modal centralizado.
 * Fecha ao clicar fora da imagem ou pressionar Esc.
 */
export default function ImageLightbox({ src, alt = 'Imagem', className = '' }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onClick={() => setOpen(true)}
        className={`cursor-zoom-in ${className}`}
      />
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-black/90"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg shadow-2xl"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}
