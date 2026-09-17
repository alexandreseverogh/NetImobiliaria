'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Bars3Icon,
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

import { NAV_LINKS, SOURCES } from '../data'

/* ==========================================================================
   Reveal no scroll.
   O default é VISÍVEL: `data-anim="on"` só é ligado depois do mount, então
   renderização sem JS (ou headless) nunca mostra a página em branco.
   ========================================================================== */

export function useReveal() {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    root.dataset.anim = 'on'

    const targets = Array.from(root.querySelectorAll<HTMLElement>('.a4-rise'))
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            io.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    )
    targets.forEach((t) => io.observe(t))

    /**
     * Rede de segurança. O reveal depende do IntersectionObserver, e IO não
     * dispara de forma confiável em aba de fundo, renderizador headless ou
     * quando a janela está atrás de outra. Sem isso, `data-anim="on"` deixaria
     * a seção em opacity 0 para sempre e a página publicaria em branco.
     * Passado 1,2s, tudo aparece de qualquer maneira — a animação é um bônus,
     * nunca um pré-requisito para o conteúdo existir.
     */
    const safety = window.setTimeout(() => {
      targets.forEach((t) => t.classList.add('is-in'))
    }, 1200)

    /* Mesma lógica para a entrada do hero, que usa animação CSS com fill
       `both`: 1,5s cobre os 0,8s de duração + 0,44s de atraso máximo. */
    const settle = window.setTimeout(() => root.classList.add('a4-anim-settled'), 1500)

    return () => {
      io.disconnect()
      window.clearTimeout(safety)
      window.clearTimeout(settle)
    }
  }, [])

  return rootRef
}

/* ==========================================================================
   Cabeçalho de seção
   ========================================================================== */

/**
 * Cabeçalho de seção.
 *
 * `kicker` é OPCIONAL de propósito. A primeira versão desta página trazia um
 * label âmbar em caixa alta acima de todas as dez seções — o mesmo eyebrow
 * repetido como gramática, que é andaime, não voz. Os H2 aqui são específicos
 * o suficiente para abrir a seção sozinhos; o kicker ficou só nos três lugares
 * em que ele diz algo que o título não diz (o que é aquela faixa escura de
 * vídeo, e onde termina a página).
 */
export function SectionHead({
  kicker,
  title,
  sub,
  id,
  split = true,
}: {
  kicker?: string
  title: string
  sub?: React.ReactNode
  id?: string
  split?: boolean
}) {
  return (
    <header className={`a4-head a4-rise${split ? ' a4-head--split' : ''}`}>
      <div>
        {kicker ? <span className="a4-label a4-label--gold a4-head__kicker">{kicker}</span> : null}
        <h2 className="a4-h2" id={id}>
          {title}
        </h2>
      </div>
      {sub ? <p className="a4-lead a4-head__sub">{sub}</p> : null}
    </header>
  )
}

/* ==========================================================================
   Citação de fonte, reutilizável
   ========================================================================== */

export function Cite({ sourceId }: { sourceId: keyof typeof SOURCES }) {
  const s = SOURCES[sourceId]
  return (
    <p className="a4-authority__src">
      Fonte:{' '}
      <a href={s.url} target="_blank" rel="noopener noreferrer">
        {s.label}
      </a>
    </p>
  )
}

/* ==========================================================================
   NAV
   ========================================================================== */

export function Nav({
  onEnter,
  onOpenSpecialist,
}: {
  onEnter: () => void
  onOpenSpecialist: () => void
}) {
  const [open, setOpen] = useState(false)

  /* Fecha o drawer no Escape — teclado nunca fica preso no menu aberto */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="a4-nav">
      <div className="a4-wrap a4-wrap--wide a4-nav__inner">
        <Link href="/artemis4" className="a4-nav__brand" aria-label="Artemis9 — início">
          {/* next/image de propósito: o arquivo original é 1024x1024 / 206 KB e
              renderiza a 26px. Com <img> cru o visitante baixava os 206 KB
              inteiros no topo da página, acima da dobra. */}
          <span className="a4-nav__mark">
            <Image
              src="/Assets/artemis4_light_b.png"
              alt=""
              width={26}
              height={26}
              priority
              draggable={false}
            />
          </span>
          <span className="a4-nav__wordmark">
            Artemis<b>9</b>
          </span>
          {/* 10px é o piso: a 9px o texto ficava ilegível mesmo com contraste OK */}
          <span className="a4-nav__tag">
            <span className="a4-label" style={{ fontSize: '0.625rem', display: 'block', letterSpacing: '0.1em' }}>
              Marketing · CRM
            </span>
            <span className="a4-label" style={{ fontSize: '0.625rem', display: 'block', letterSpacing: '0.1em' }}>
              Mensageria
            </span>
          </span>
        </Link>

        <nav className="a4-nav__links" aria-label="Seções">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="a4-nav__link">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="a4-nav__right">
          <button
            type="button"
            onClick={onOpenSpecialist}
            className="a4-btn a4-btn--primary a4-btn--sm"
            style={{ whiteSpace: 'nowrap' }}
          >
            Falar com especialista
          </button>
          <a
            href="/admin/login"
            onClick={onEnter}
            className="a4-btn a4-btn--ghost a4-btn--sm"
            style={{ whiteSpace: 'nowrap' }}
          >
            Entrar
          </a>
          <button
            type="button"
            className="a4-nav__burger"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <XMarkIcon width={22} height={22} /> : <Bars3Icon width={22} height={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="a4-nav__drawer">
          <div className="a4-wrap">
            <nav aria-label="Seções">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="a4-nav__drawer-cta">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onOpenSpecialist()
                }}
                className="a4-btn a4-btn--primary"
              >
                Falar com um especialista
              </button>
              <a href="/admin/login" onClick={onEnter} className="a4-btn a4-btn--ghost">
                Já sou cliente · Entrar
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

/* ==========================================================================
   Overlay de saída — feedback imediato ao navegar para a área administrativa
   ========================================================================== */

export function LeavingOverlay() {
  return (
    <div className="a4-leaving" role="status" aria-live="polite">
      <div className="a4-leaving__ring" />
      <p className="a4-label a4-label--gold">Acessando sua conta…</p>
    </div>
  )
}

/* ==========================================================================
   FOOTER — com a lista consolidada de fontes citadas na página
   ========================================================================== */

export function Footer({ onOpenSpecialist }: { onOpenSpecialist: () => void }) {
  const cited = ['hbr', 'mit', 'mobileTime', 'dataReportal', 'esaOrion', 'nasaArtemis2'] as const

  return (
    <footer className="a4-footer">
      <div className="a4-wrap a4-wrap--wide">
        <div className="a4-footer__grid">
          <div className="a4-footer__col">
            <span className="a4-nav__wordmark" style={{ fontSize: '1.25rem' }}>
              Artemis<b>9</b>
            </span>
            <p className="a4-body" style={{ maxWidth: '38ch' }}>
              Plataforma brasileira que une marketing digital, atendimento e vendas num ciclo
              fechado — para você saber exatamente qual anúncio virou dinheiro no caixa.
            </p>
            <p className="a4-small" style={{ maxWidth: '38ch' }}>
              Recife, Pernambuco · Brasil
            </p>
          </div>

          <div className="a4-footer__col">
            <span className="a4-label">Plataforma</span>
            <ul>
              <li>
                <a href="#modulos">Módulos</a>
              </li>
              <li>
                <a href="#plataforma">A plataforma por dentro</a>
              </li>
              <li>
                <a href="#agente">Automação e limites</a>
              </li>
              <li>
                <a href="#segmentos">Segmentos atendidos</a>
              </li>
              <li>
                <a href="#perguntas">Perguntas frequentes</a>
              </li>
            </ul>
          </div>

          <div className="a4-footer__col">
            <span className="a4-label">Contato</span>
            <ul className="a4-footer__contact">
              <li>
                <PhoneIcon /> <span>(81) 99800-0047</span>
              </li>
              <li>
                <EnvelopeIcon /> <span>contato@artemis9.com.br</span>
              </li>
              <li>
                <MapPinIcon /> <span>Recife, PE</span>
              </li>
            </ul>
            <div style={{ marginTop: '0.5rem' }}>
              <button type="button" onClick={onOpenSpecialist} className="a4-btn a4-btn--ghost a4-btn--sm">
                Falar com especialista
              </button>
            </div>
          </div>
        </div>

        {/* Fontes consolidadas: a página faz afirmações com número, então a
            procedência fica disponível num só lugar, verificável. */}
        <div className="a4-footer__sources">
          <p style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: 'var(--ink-dim)' }}>Fontes citadas nesta página:</strong>
          </p>
          <ul style={{ display: 'grid', gap: '0.375rem', margin: 0, padding: 0, listStyle: 'none' }}>
            {cited.map((k) => {
              const s = SOURCES[k]
              return (
                <li key={k}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>{' '}
                  — {s.detail}
                </li>
              )
            })}
          </ul>
          <p style={{ marginTop: '0.75rem' }}>
            Artemis9 não possui vínculo, patrocínio ou endosso da NASA. Instagram e Facebook são
            marcas da Meta Platforms; Google e YouTube, da Google LLC; TikTok, da ByteDance;
            WhatsApp, da Meta Platforms. As marcas citadas pertencem aos respectivos titulares e
            aparecem apenas para identificar integrações.
          </p>
        </div>

        <div className="a4-footer__base">
          <p className="a4-small">© {new Date().getFullYear()} Artemis9. Todos os direitos reservados.</p>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <Link href="/privacidade" className="a4-small" style={{ textDecoration: 'none' }}>
              Privacidade
            </Link>
            <Link href="/termos" className="a4-small" style={{ textDecoration: 'none' }}>
              Termos de uso
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
