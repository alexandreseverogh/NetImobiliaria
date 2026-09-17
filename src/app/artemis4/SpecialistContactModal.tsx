'use client'

import { useEffect, useRef, useState } from 'react'
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

interface Props {
  open: boolean
  onClose: () => void
}

type PersonType = 'pf' | 'pj'

/* Mesmo formatador já usado em NovoLeadModal.tsx/EditUserModal.tsx — máscara
   (99) 99999-9999 aplicada progressivamente a cada dígito. */
function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
}

export default function SpecialistContactModal({ open, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null)

  const [personType, setPersonType] = useState<PersonType>('pf')
  const [name, setName] = useState('')
  const [segment, setSegment] = useState('')
  const [demand, setDemand] = useState('')
  const [contactName, setContactName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  /* Mesmo padrão de acessibilidade de ModuleDetailModal.tsx: Escape fecha,
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

  /* Reseta o formulário sempre que o modal é reaberto depois de um envio anterior */
  useEffect(() => {
    if (open) return
    const t = window.setTimeout(() => {
      setPersonType('pf')
      setName('')
      setSegment('')
      setDemand('')
      setContactName('')
      setWhatsapp('')
      setError(null)
      setSuccess(false)
      setSubmitting(false)
    }, 300)
    return () => window.clearTimeout(t)
  }, [open])

  if (!open) return null

  const whatsappDigits = whatsapp.replace(/\D/g, '')
  const isValid =
    name.trim().length >= 2 &&
    segment.trim().length >= 2 &&
    demand.trim().length >= 5 &&
    contactName.trim().length >= 2 &&
    whatsappDigits.length >= 10

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/public/artemis4/contato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personType,
          name: name.trim(),
          segment: segment.trim(),
          demand: demand.trim(),
          contactName: contactName.trim(),
          whatsapp: whatsappDigits,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) {
        setError(data?.error ?? 'Não foi possível enviar agora. Tente novamente em instantes.')
        setSubmitting(false)
        return
      }

      setSuccess(true)
      setSubmitting(false)
    } catch {
      setError('Falha de conexão. Verifique sua internet e tente novamente.')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="a4-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Falar com um especialista"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="a4-modal__card"
        style={{ outline: 'none', maxWidth: '38rem' }}
      >
        <button type="button" onClick={onClose} aria-label="Fechar" className="a4-modal__close">
          <XMarkIcon width={19} height={19} />
        </button>

        <div className="a4-modal__body">
          {success ? (
            <>
              <span className="a4-label a4-label--gold">Recebido</span>
              <h2 className="a4-h2" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginTop: '0.5rem' }}>
                Obrigado, {contactName.split(' ')[0]}.
              </h2>
              <div className="a4-form-status a4-form-status--success" style={{ marginTop: '1.25rem' }}>
                Recebemos suas informações. Um especialista da Artemis9 vai falar com você pelo
                WhatsApp <strong>{formatPhoneNumber(whatsappDigits)}</strong> em breve.
              </div>
              <div className="a4-cta-row" style={{ marginTop: '1.5rem' }}>
                <button type="button" onClick={onClose} className="a4-btn a4-btn--primary">
                  Fechar
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="a4-label a4-label--gold">Fale com um especialista</span>
              <h2 className="a4-h2" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginTop: '0.5rem' }}>
                Conte um pouco sobre o seu negócio
              </h2>
              <p className="a4-lead" style={{ marginTop: '0.75rem', fontSize: '0.9375rem' }}>
                Leva menos de um minuto. Um especialista entra em contato pelo WhatsApp que você
                informar abaixo.
              </p>

              <form onSubmit={handleSubmit} style={{ marginTop: '1.75rem', display: 'grid', gap: '1.125rem' }}>
                <div className="a4-field">
                  <span className="a4-field__label">Pessoa Física ou Pessoa Jurídica</span>
                  <div className="a4-radio-group" role="group" aria-label="Tipo de pessoa">
                    <button
                      type="button"
                      className="a4-radio-pill"
                      aria-pressed={personType === 'pf'}
                      onClick={() => setPersonType('pf')}
                    >
                      Pessoa Física
                    </button>
                    <button
                      type="button"
                      className="a4-radio-pill"
                      aria-pressed={personType === 'pj'}
                      onClick={() => setPersonType('pj')}
                    >
                      Pessoa Jurídica
                    </button>
                  </div>
                </div>

                <div className="a4-field">
                  <label className="a4-field__label" htmlFor="a4-sc-name">
                    {personType === 'pj' ? 'Razão Social' : 'Nome'} <b>*</b>
                  </label>
                  <input
                    id="a4-sc-name"
                    className="a4-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={personType === 'pj' ? 'Nome da sua empresa' : 'Seu nome'}
                    required
                    minLength={2}
                  />
                </div>

                <div className="a4-field">
                  <label className="a4-field__label" htmlFor="a4-sc-segment">
                    Segmento de atuação <b>*</b>
                  </label>
                  <input
                    id="a4-sc-segment"
                    className="a4-input"
                    type="text"
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Ex.: Imobiliária, Venda de carros, Clínica..."
                    required
                    minLength={2}
                  />
                </div>

                <div className="a4-field">
                  <label className="a4-field__label" htmlFor="a4-sc-demand">
                    Baseado no que leu na plataforma Artemis9, qual é a sua maior demanda? <b>*</b>
                  </label>
                  <textarea
                    id="a4-sc-demand"
                    className="a4-textarea"
                    value={demand}
                    onChange={(e) => setDemand(e.target.value)}
                    placeholder="Ex.: Saber qual anúncio realmente vira venda, responder mais rápido no WhatsApp..."
                    required
                    minLength={5}
                  />
                </div>

                <div className="a4-field">
                  <label className="a4-field__label" htmlFor="a4-sc-contact-name">
                    Nome da pessoa que irá receber o contato <b>*</b>
                  </label>
                  <input
                    id="a4-sc-contact-name"
                    className="a4-input"
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nome de quem vai atender o especialista"
                    required
                    minLength={2}
                  />
                </div>

                <div className="a4-field">
                  <label className="a4-field__label" htmlFor="a4-sc-whatsapp">
                    WhatsApp da pessoa de contato <b>*</b>
                  </label>
                  <input
                    id="a4-sc-whatsapp"
                    className="a4-input"
                    type="tel"
                    inputMode="numeric"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatPhoneNumber(e.target.value))}
                    placeholder="(99) 99999-9999"
                    required
                    maxLength={16}
                  />
                </div>

                {error && <p className="a4-form-error">{error}</p>}

                <div className="a4-cta-row" style={{ marginTop: '0.25rem' }}>
                  <button
                    type="submit"
                    className="a4-btn a4-btn--primary a4-btn--lg"
                    disabled={!isValid || submitting}
                    style={{ width: '100%' }}
                  >
                    {submitting ? 'Enviando…' : 'Enviar'}
                    {!submitting && <ArrowRightIcon width={15} height={15} />}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
