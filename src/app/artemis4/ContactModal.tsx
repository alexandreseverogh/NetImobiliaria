'use client'

import { useEffect, useRef } from 'react'
import { XMarkIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

interface Props {
  open: boolean
  onClose: () => void
  /** Encadeia pro modal de "Falar com especialista" — fecha este e abre o outro. */
  onOpenSpecialist: () => void
}

export default function ContactModal({ open, onClose, onOpenSpecialist }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null)

  /* Mesmo padrão de acessibilidade de SpecialistContactModal.tsx: Escape fecha,
     scroll do body travado, foco entra no diálogo. */
  useEffect(() => {
    if (!open) return
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
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="a4-modal" role="dialog" aria-modal="true" aria-label="Contato" onClick={onClose}>
      <div
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="a4-modal__card"
        style={{ outline: 'none', maxWidth: '27rem' }}
      >
        <button type="button" onClick={onClose} aria-label="Fechar" className="a4-modal__close">
          <XMarkIcon width={19} height={19} />
        </button>

        <div className="a4-modal__body">
          <span className="a4-label a4-label--gold">Contato</span>
          <h2 className="a4-h2" style={{ fontSize: 'clamp(1.375rem, 3vw, 1.75rem)', marginTop: '0.5rem' }}>
            Fale diretamente com a Artemis9
          </h2>

          <ul className="a4-contact-list">
            <li className="a4-contact-row">
              <span className="a4-contact-row__icon">
                <PhoneIcon />
              </span>
              <span className="a4-contact-row__text">
                <span className="a4-contact-row__label">WhatsApp / Telefone</span>
                <a href="tel:+5581997930422" className="a4-contact-row__value">
                  (81) 99793-0422
                </a>
              </span>
            </li>
            <li className="a4-contact-row">
              <span className="a4-contact-row__icon">
                <EnvelopeIcon />
              </span>
              <span className="a4-contact-row__text">
                <span className="a4-contact-row__label">E-mail</span>
                <a href="mailto:contato@artemis9.com.br" className="a4-contact-row__value">
                  contato@artemis9.com.br
                </a>
              </span>
            </li>
            <li className="a4-contact-row">
              <span className="a4-contact-row__icon">
                <MapPinIcon />
              </span>
              <span className="a4-contact-row__text">
                <span className="a4-contact-row__label">Endereço</span>
                <span className="a4-contact-row__value">Recife, PE</span>
              </span>
            </li>
          </ul>

          <div className="a4-cta-row" style={{ marginTop: '1.75rem' }}>
            <button
              type="button"
              onClick={onOpenSpecialist}
              className="a4-btn a4-btn--primary a4-btn--lg"
              style={{ width: '100%' }}
            >
              Falar com especialista
              <ArrowRightIcon width={15} height={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
