'use client'

import { useEffect, useRef } from 'react'
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import type { ModuleCardContent } from './moduleContent'

interface Props {
  moduleName: string
  content: ModuleCardContent
  onClose: () => void
  onEnter: () => void
}

export default function ModuleDetailModal({ moduleName, content, onClose, onEnter }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null)

  /* Escape fecha; foco entra no diálogo; scroll do body travado enquanto aberto.
     (A versão anterior não tratava nenhum dos três.) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cardRef.current?.focus()

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      className="a4-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes do módulo ${moduleName}`}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="a4-modal__card"
        style={{ outline: 'none' }}
      >
        <button type="button" onClick={onClose} aria-label="Fechar" className="a4-modal__close">
          <XMarkIcon width={19} height={19} />
        </button>

        <div className="a4-modal__body">
          <span className="a4-label a4-label--gold">Módulo de operação</span>
          <h2 className="a4-h2" style={{ fontSize: 'clamp(1.625rem, 3.2vw, 2.25rem)' }}>
            {moduleName}
          </h2>

          {/* Argumento de mercado antes de qualquer diferencial */}
          <p className="a4-lead">{content.modal.intro}</p>

          <div className="a4-modal__pillars">
            {content.modal.pillars.map((pillar) => (
              <div className="a4-modal__pillar" key={pillar.title}>
                <h3 className="a4-h4">{pillar.title}</h3>
                <p className="a4-small">{pillar.description}</p>
              </div>
            ))}
          </div>

          <div className="a4-modal__trust">
            <p className="a4-body" style={{ fontSize: '0.875rem', margin: 0, color: 'var(--gold-hot)' }}>
              {content.modal.trustLine}
            </p>
          </div>

          <p className="a4-small" style={{ maxWidth: '64ch' }}>
            {content.modal.crossSellFooter}
          </p>

          <div className="a4-cta-row" style={{ marginTop: '1.75rem' }}>
            <a href="/contato" className="a4-btn a4-btn--primary">
              Falar com um especialista
              <ArrowRightIcon width={15} height={15} />
            </a>
            <a href="/admin/login" onClick={onEnter} className="a4-btn a4-btn--ghost">
              Já sou cliente · Entrar
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
