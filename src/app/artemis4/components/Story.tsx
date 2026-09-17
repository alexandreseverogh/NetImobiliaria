'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckIcon, PlusIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

import { ORIGIN, ORIGIN_VIDEO_ID, SOURCES, VERSUS, SEGMENTS, SEGMENT_NOTE, GUARANTEES, FAQ } from '../data'
import { SectionHead } from './Chrome'

/* ==========================================================================
   5 · ORIGEM DA MARCA — onde o vídeo de reentrada passa a ter função
   ----------------------------------------------------------------------------
   Decisão de arquitetura: o vídeo saiu do hero e veio para cá.
   No hero ele consumia os únicos segundos de atenção da página com uma
   metáfora sem legenda (e mantinha um canvas em requestAnimationFrame + o
   player do YouTube disputando a main thread — causa raiz documentada do
   "Entrar lento" em docs/CHECKPOINT.md). Aqui ele é a PROVA da metáfora:
   aparece junto do fato que explica o nome, e só carrega quando chega perto
   do viewport.
   ========================================================================== */

export function Origin() {
  const ref = useRef<HTMLElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    /* Quem pediu menos movimento não recebe vídeo em autoplay — fica o plasma em CSS */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let done = false
    const arm = () => {
      if (done) return
      done = true
      setArmed(true)
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
    }

    /**
     * Dois caminhos para armar o vídeo, de propósito.
     *
     * O IntersectionObserver é o caminho principal. Mas IO não é confiável em
     * aba de fundo ou quando a janela está atrás de outra — verificado ao vivo
     * nesta implementação: um IO novo sobre um elemento visível não disparou.
     * Um teste de posição no evento de scroll cobre esse caso sem precisar de
     * timer cego, então o vídeo nunca é baixado por quem não chegou até aqui.
     */
    const nearViewport = () => {
      const r = el.getBoundingClientRect()
      /* height > 0 é obrigatório: no primeiro frame o layout ainda não
         assentou, o rect vem colapsado e a checagem armaria o vídeo já no
         topo da página — exatamente o custo que este lazy existe para evitar
         (verificado ao vivo antes desta guarda). */
      return r.height > 0 && r.top < window.innerHeight + 400 && r.bottom > -400
    }
    const onScroll = () => {
      if (nearViewport()) arm()
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) arm()
      },
      { rootMargin: '400px 0px' },
    )
    io.observe(el)
    window.addEventListener('scroll', onScroll, { passive: true })

    /* Checagem inicial depois do layout assentar — cobre quem abre a página
       já com #origem na URL. Dois frames: um para o layout, um para a pintura. */
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(onScroll)
      rafRef.current = raf2
    })

    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf1)
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const src =
    `https://www.youtube.com/embed/${ORIGIN_VIDEO_ID}` +
    `?autoplay=1&mute=1&loop=1&playlist=${ORIGIN_VIDEO_ID}` +
    '&controls=0&modestbranding=1&playsinline=1&rel=0&disablekb=1&iv_load_policy=3&fs=0'

  return (
    <section
      id="origem"
      ref={ref}
      className="a4-origin a4-section"
      aria-labelledby="a4-origem"
      style={{ minHeight: '38rem' }}
    >
      {/* Fallback sempre presente: nunca um retângulo vazio se o vídeo não subir */}
      <div className="a4-origin__fallback" aria-hidden="true" />

      {armed && (
        <div className="a4-origin__stage" aria-hidden="true">
          <div>
            <iframe
              src={src}
              title="Reentrada atmosférica — programa Artemis (NASA)"
              allow="autoplay; encrypted-media"
              loading="lazy"
              tabIndex={-1}
            />
          </div>
        </div>
      )}

      <div className="a4-origin__veil" aria-hidden="true" />

      <div className="a4-wrap a4-wrap--wide">
        <div className="a4-origin__inner">
          <span className="a4-label a4-label--gold">{ORIGIN.kicker}</span>
          <h2 className="a4-h2" id="a4-origem">
            {ORIGIN.title}
          </h2>
          <p className="a4-lead">{ORIGIN.lede}</p>

          {ORIGIN.body.map((p) => (
            <p className="a4-body" key={p.slice(0, 28)}>
              {p}
            </p>
          ))}

          <div className="a4-origin__facts">
            {ORIGIN.facts.map((f) => {
              const s = SOURCES[f.sourceId]
              return (
                <div className="a4-origin__fact" key={f.figure}>
                  <b>{f.figure}</b>
                  <p className="a4-small" style={{ color: 'var(--ink-dim)' }}>
                    {f.text}
                  </p>
                  <p className="a4-authority__src" style={{ marginTop: '0.25rem' }}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.label}
                    </a>
                  </p>
                </div>
              )
            })}
          </div>

          <p className="a4-origin__disclaimer">{ORIGIN.disclaimer}</p>
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   6 · COMPARATIVO — tabela, não cards
   ========================================================================== */

export function Versus() {
  return (
    <section className="a4-section a4-band--void a4-band--edge" aria-labelledby="a4-vs">
      <div className="a4-wrap a4-wrap--wide">
        <SectionHead
          id="a4-vs"
          title="O que muda no dia seguinte"
          sub={
            <>
              Não é uma lista de recursos. É a mesma operação, nos dois cenários — o de hoje e o
              com a plataforma no meio.
            </>
          }
        />

        <div className="a4-vs a4-rise">
          <div className="a4-vs__head">
            <div className="a4-vs__topic">
              <span className="a4-label">Na prática</span>
            </div>
            <div>
              <span className="a4-label">Do jeito que é hoje</span>
            </div>
            <div>
              <span className="a4-label a4-label--gold">Com a Artemis9</span>
            </div>
          </div>

          {VERSUS.map((r) => (
            <div className="a4-vs__row" key={r.topic}>
              <div className="a4-vs__label">{r.topic}</div>
              <div className="a4-vs__old">{r.old}</div>
              <div className="a4-vs__new" dangerouslySetInnerHTML={{ __html: r.now }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   7 · MULTISSEGMENTO
   ========================================================================== */

export function Segments() {
  const [active, setActive] = useState(SEGMENTS[0].key)
  const seg = SEGMENTS.find((s) => s.key === active) ?? SEGMENTS[0]

  return (
    <section id="segmentos" className="a4-section a4-band--panel a4-band--edge" aria-labelledby="a4-seg">
      <div className="a4-wrap a4-wrap--wide">
        <SectionHead
          id="a4-seg"
          title="O motor é o mesmo. O vocabulário é do seu negócio."
          sub={
            <>
              A plataforma não foi feita para um setor e adaptada para os outros. Ela é agnóstica
              por construção: o que muda entre um negócio e outro é{' '}
              <span className="a4-strong">configuração, não programação</span>.
            </>
          }
        />

        <div className="a4-rise">
          <div className="a4-seg__chips" role="group" aria-label="Escolha um segmento">
            {SEGMENTS.map((s) => (
              <button
                key={s.key}
                type="button"
                className="a4-seg__chip"
                aria-pressed={s.key === active}
                onClick={() => setActive(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="a4-seg__demo">
            <div className="a4-seg__cell">
              <span className="a4-label">O que você anuncia</span>
              <strong>{seg.advertises}</strong>
            </div>
            <div className="a4-seg__cell">
              <span className="a4-label">O que o atendimento consulta</span>
              <strong>{seg.botReads}</strong>
            </div>
            <div className="a4-seg__cell">
              <span className="a4-label">O que conta como venda</span>
              <strong>{seg.counts}</strong>
            </div>
          </div>

          <p className="a4-small" style={{ marginTop: '1.25rem', maxWidth: '72ch' }}>
            {SEGMENT_NOTE}
          </p>
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   8 · GARANTIAS
   ========================================================================== */

export function Guarantees() {
  return (
    <section className="a4-section a4-section--tight a4-band--void a4-band--edge" aria-labelledby="a4-gar">
      <div className="a4-wrap a4-wrap--wide">
        <div className="a4-head a4-rise" style={{ marginBottom: '2rem' }}>
          <h2 className="a4-h2" id="a4-gar" style={{ maxWidth: '34ch' }}>
            Inteligência artificial com freio de mão
          </h2>
        </div>

        <div
          className="a4-rise"
          style={{
            display: 'grid',
            gap: '1px',
            background: 'var(--line)',
            border: '1px solid var(--line)',
            borderRadius: '14px',
            overflow: 'hidden',
            gridTemplateColumns: 'repeat(auto-fit, minmax(17rem, 1fr))',
          }}
        >
          {GUARANTEES.map((g) => (
            <div
              key={g.title}
              style={{
                background: 'var(--raised)',
                padding: 'clamp(1.125rem, 2vw, 1.5rem)',
                display: 'grid',
                gap: '0.625rem',
                alignContent: 'start',
              }}
            >
              <ShieldCheckIcon width={20} height={20} style={{ color: 'var(--gold)' }} />
              <h3 className="a4-h4">{g.title}</h3>
              <p className="a4-small">{g.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   9 · FAQ
   ========================================================================== */

export function Faq() {
  return (
    <section id="perguntas" className="a4-section a4-band--deep a4-band--edge" aria-labelledby="a4-faq">
      <div className="a4-wrap">
        <SectionHead
          id="a4-faq"
          title="As dúvidas que todo dono de negócio tem"
          split={false}
        />

        <div className="a4-faq a4-rise">
          {FAQ.map((f) => (
            <details className="a4-faq__item" key={f.q}>
              <summary>
                {f.q}
                <PlusIcon className="a4-faq__sign" />
              </summary>
              <p className="a4-faq__a">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   10 · CTA FINAL
   ========================================================================== */

export function FinalCta({
  onEnter,
  onOpenSpecialist,
}: {
  onEnter: () => void
  onOpenSpecialist: () => void
}) {
  const bullets = [
    'Diagnóstico das suas campanhas atuais, com a verba em risco calculada',
    'Configuração do seu segmento: o que qualifica um interessado no seu negócio',
    'Conexão das contas de anúncio que você já tem — sem começar do zero',
    'Você decide quais módulos entram: um, dois ou os três',
  ]

  return (
    <section className="a4-section a4-band--void" aria-labelledby="a4-final">
      <div className="a4-wrap a4-wrap--wide">
        <div className="a4-final a4-rise">
          <div className="a4-final__grid">
            <div>
              <span className="a4-label a4-label--gold">Próximo passo</span>
              <h2 className="a4-h2" id="a4-final" style={{ marginTop: '0.875rem' }}>
                Descubra quanto da sua verba está vazando hoje
              </h2>
              <p className="a4-lead" style={{ marginTop: '1.125rem' }}>
                Uma conversa de 30 minutos. Conectamos suas contas de anúncio e mostramos, com o
                seu próprio dado, onde o dinheiro está saindo sem voltar. Se não houver nada a
                recuperar, a gente diz isso.
              </p>

              <div className="a4-cta-row" style={{ marginTop: '1.75rem' }}>
                <button type="button" onClick={onOpenSpecialist} className="a4-btn a4-btn--primary a4-btn--lg">
                  Falar com um especialista
                </button>
                <a href="/admin/login" onClick={onEnter} className="a4-btn a4-btn--ghost a4-btn--lg">
                  Já sou cliente · Entrar
                </a>
              </div>
            </div>

            <div>
              <p className="a4-label" style={{ marginBottom: '1rem' }}>
                O que acontece nessa conversa
              </p>
              <ul className="a4-final__list">
                {bullets.map((b) => (
                  <li key={b}>
                    <CheckIcon />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
