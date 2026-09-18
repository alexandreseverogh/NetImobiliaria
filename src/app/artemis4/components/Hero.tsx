'use client'

import { useEffect, useState } from 'react'
import {
  ShieldCheckIcon,
  BoltIcon,
  DevicePhoneMobileIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline'

import { AUTHORITY, SOURCES, HERO_PITCH, CONSOLE_SCREENSHOTS } from '../data'

/* ==========================================================================
   CONSOLE DE MISSÃO — telemetria de NEGÓCIO, não de nave espacial.
   ----------------------------------------------------------------------------
   Substitui o HUD anterior (Mach 22.7, desgaste ablativo do escudo, "DEEP SPACE
   NETWORK Recife"): informação zero para um dono de negócio, ocupando os únicos
   3 segundos de atenção que a página tem. Aqui o visitante reconhece o próprio
   problema no primeiro olhar.

   O estado inicial é FIXO (igual no servidor e no cliente) para não gerar
   divergência de hidratação; só depois do mount os números passam a andar.
   ========================================================================== */

const SEED = { spend: 4812, people: 37, elapsed: 0 }

const NETWORKS = [
  { name: 'Instagram', share: 2410, lead: true },
  { name: 'Google', share: 1680, lead: false },
  { name: 'TikTok', share: 722, lead: false },
]

const FEED = [
  {
    time: '03:12',
    text: '<b>Lançamento · Vídeo 15s</b> perdendo força. Pausado sozinho — R$ 412/dia preservados.',
  },
  {
    time: '07:30',
    text: 'Proposta aguardando você: <b>aumentar R$ 180/dia</b> em Reforma · Carrossel.',
  },
  {
    time: '09:04',
    text: 'Termo <b>"curso grátis"</b> gastou R$ 96 sem ninguém. Bloqueado.',
  },
  {
    time: '11:47',
    text: 'Negócio fechado <b>R$ 68.000</b> creditado à campanha Boa Viagem · Foto.',
  },
]

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}
function brlCents(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

function MissionConsole() {
  const [tick, setTick] = useState(SEED)
  const [feedAt, setFeedAt] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const id = setInterval(() => {
      setTick((t) => {
        const next = { ...t, elapsed: t.elapsed + 1 }
        next.spend = t.spend + 7 + ((t.elapsed * 13) % 11)
        /* Uma pessoa nova a cada ~4 ciclos — passo plausível, não aleatório */
        next.people = t.elapsed % 4 === 3 ? t.people + 1 : t.people
        return next
      })
    }, 2200)

    const feedId = setInterval(() => setFeedAt((i) => (i + 1) % FEED.length), 4200)

    return () => {
      clearInterval(id)
      clearInterval(feedId)
    }
  }, [])

  const cpi = tick.spend / tick.people
  const total = NETWORKS.reduce((s, n) => s + n.share, 0)
  const visible = [FEED[feedAt], FEED[(feedAt + 1) % FEED.length], FEED[(feedAt + 2) % FEED.length]]

  return (
    <div className="a4-console" aria-label="Exemplo de painel da plataforma">
      <div className="a4-console__bar">
        <span className="a4-console__live a4-label" style={{ color: 'var(--ok)' }}>
          <i className="a4-dot" /> Ao vivo
        </span>
        <span className="a4-label" style={{ color: 'var(--ink-faint)' }}>
          Console de operação
        </span>
        <span className="a4-label a4-console__clock">Hoje</span>
      </div>

      <dl className="a4-console__readouts">
        <div className="a4-console__readout">
          <dt className="a4-label">Investido hoje</dt>
          <dd>{brl(tick.spend)}</dd>
          <p className="a4-console__delta a4-console__delta--muted">3 redes ativas</p>
        </div>
        <div className="a4-console__readout">
          <dt className="a4-label">Interessados</dt>
          <dd>{tick.people}</dd>
          <p className="a4-console__delta a4-console__delta--ok">+12% vs. ontem</p>
        </div>
        <div className="a4-console__readout">
          <dt className="a4-label">Custo por interessado</dt>
          <dd>{brlCents(cpi)}</dd>
          <p className="a4-console__delta a4-console__delta--ok">Meta: R$ 150,00</p>
        </div>
      </dl>

      <div className="a4-console__body">
        <div>
          <p className="a4-label" style={{ marginBottom: '0.75rem' }}>
            Onde está o dinheiro
          </p>
          <div className="a4-bars">
            {NETWORKS.map((n) => (
              <div key={n.name} className="a4-bars__row">
                <span className="a4-bars__name">{n.name}</span>
                <span className="a4-bars__track">
                  <i
                    className={`a4-bars__fill${n.lead ? ' a4-bars__fill--lead' : ''}`}
                    style={{ width: `${Math.round((n.share / total) * 100)}%` }}
                  />
                </span>
                <span className="a4-bars__val">{brl(n.share)}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="a4-label" style={{ marginBottom: '0.5rem' }}>
            O que a plataforma fez sozinha
          </p>
          <div className="a4-feed">
            {visible.map((f, i) => (
              <div className="a4-feed__item" key={`${f.time}-${i}`}>
                <span className="a4-feed__time">{f.time}</span>
                <span className="a4-feed__text" dangerouslySetInnerHTML={{ __html: f.text }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   CARROSSEL DO CONSOLE — slide 0 é o MissionConsole ao vivo; os demais são
   capturas reais da própria plataforma (ver nota em CONSOLE_SCREENSHOTS).
   ----------------------------------------------------------------------------
   Sem autoplay, de propósito: o hero já tem dois relógios rodando sozinhos
   (os números do console e o rodízio do feed) — mais um avançando por conta
   própria deixaria o primeiro olhar do visitante ocupado demais. Navegação
   é sempre por gesto do visitante (seta ou ponto), igual ao resto da página
   trata seleção (Tour do Produto, Segmentos).

   Setas ficam FORA da caixa do console, na mesma linha dos pontos — testado
   ao vivo com as setas sobre o card (posição óbvia demais pra não tentar
   primeiro): em mobile elas tapavam valores reais do painel ("Google"/
   "TikTok"), já que a altura do card varia por slide e a seta é centralizada
   verticalmente sobre TUDO. Sem overlay possível vivendo abaixo do card.

   Avanço automático a cada 6s — pausa com mouse ou foco em cima (inclusive
   teclado, `onFocus`/`onBlur` do React já se comportam como focusin/focusout,
   cobrindo qualquer botão interno) e nunca roda sob prefers-reduced-motion,
   mesma guarda já usada no tick do MissionConsole. `setTimeout` reagendado a
   cada troca de `active` — não `setInterval` — porque assim uma troca manual
   (seta/ponto) também reinicia a contagem, em vez de competir com o próximo
   avanço automático já em andamento.
   ========================================================================== */

function ConsoleCarousel() {
  const totalSlides = 1 + CONSOLE_SCREENSHOTS.length
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const go = (i: number) => setActive(((i % totalSlides) + totalSlides) % totalSlides)

  useEffect(() => {
    if (paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setTimeout(() => {
      setActive((a) => (a + 1) % totalSlides)
    }, 6000)
    return () => window.clearTimeout(id)
  }, [active, paused, totalSlides])

  return (
    <div
      className="a4-carousel a4-enter a4-enter--4"
      aria-roledescription="carrossel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {active === 0 ? (
        <MissionConsole />
      ) : (
        (() => {
          const shot = CONSOLE_SCREENSHOTS[active - 1]
          return (
            <div className="a4-console" aria-label="Exemplo real da plataforma">
              <div className="a4-console__bar">
                <span className="a4-label" style={{ color: 'var(--gold)' }}>
                  <i className="a4-dot" /> Exemplo real
                </span>
                <span className="a4-label" style={{ color: 'var(--ink-faint)' }}>
                  {shot.caption}
                </span>
              </div>
              {/* img cru, não next/image: são 5 arquivos locais já otimizados (7-30KB
                  cada, WebP), sem benefício real do pipeline de otimização do Next
                  aqui — e o slide precisa do tamanho intrínseco pra não recortar. */}
              <img src={shot.src} alt={shot.alt} className="a4-console__shot" loading="lazy" />
            </div>
          )
        })()
      )}

      {totalSlides > 1 && (
        <div className="a4-carousel__controls">
          <button
            type="button"
            className="a4-carousel__arrow"
            onClick={() => go(active - 1)}
            aria-label="Exemplo anterior"
          >
            <ArrowLeftIcon width={15} height={15} />
          </button>

          <div className="a4-carousel__dots" role="group" aria-label="Escolher exemplo">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                type="button"
                className="a4-carousel__dot"
                aria-current={i === active}
                aria-label={i === 0 ? 'Console ao vivo' : `Exemplo real ${i}`}
                onClick={() => go(i)}
              />
            ))}
          </div>

          <button
            type="button"
            className="a4-carousel__arrow"
            onClick={() => go(active + 1)}
            aria-label="Próximo exemplo"
          >
            <ArrowRightIcon width={15} height={15} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   HERO
   ========================================================================== */

export function Hero({
  onEnter,
  onOpenSpecialist,
}: {
  onEnter: () => void
  onOpenSpecialist: () => void
}) {
  /* Painel de contextualização revelado por clique, não navegação — pedido
     explícito: "Ver a plataforma funcionando" deixa de pular para #plataforma
     e passa a expandir, abaixo de si mesmo, o resumo do ciclo completo. O
     link para a seção detalhada (#modulos) some do botão e reaparece dentro
     do próprio painel, como próximo passo natural de quem já leu o resumo. */
  const [pitchOpen, setPitchOpen] = useState(false)

  return (
    <section className="a4-hero" aria-labelledby="a4-hero-title">
      <div className="a4-hero__stars" aria-hidden="true" />
      <div className="a4-hero__horizon" aria-hidden="true" />
      <div className="a4-hero__glow" aria-hidden="true" />

      <div className="a4-wrap a4-wrap--wide">
        {/* align-items:start quando aberto — com o painel expandido a coluna
            de texto cresce bem além da altura do console; centralizar as
            duas colunas deixaria o console flutuando no meio de um vão. */}
        <div className="a4-hero__grid" style={pitchOpen ? { alignItems: 'start' } : undefined}>
          <div className="a4-hero__copy">
            <span className="a4-hero__eyebrow a4-enter a4-enter--1">
              <i className="a4-dot" style={{ color: 'var(--gold)' }} />
              <span className="a4-label a4-label--gold">
                Marketing Digital · CRM · Mensageria
              </span>
            </span>

            <h1 className="a4-h1 a4-enter a4-enter--2" id="a4-hero-title">
              Enquanto você pensa em responder, seu concorrente já vendeu.
            </h1>

            <p className="a4-lead a4-enter a4-enter--3">
              A Artemis9 fecha o ciclo entre o anúncio e a venda: o interessado chega{' '}
              <span className="a4-strong">identificado com a campanha que o trouxe</span>, é
              respondido <span className="a4-strong">em segundos, a qualquer hora</span>, e você vê
              na tela <span className="a4-gold">qual anúncio virou dinheiro no seu caixa</span> — não
              uma estimativa que a rede social calcula sobre si mesma.
            </p>

            <div className="a4-cta-row a4-enter a4-enter--4">
              <button
                type="button"
                onClick={() => setPitchOpen((v) => !v)}
                aria-expanded={pitchOpen}
                aria-controls="a4-hero-pitch"
                className="a4-btn a4-btn--primary a4-btn--lg a4-hero__toggle"
              >
                Ver a plataforma funcionando
                <ArrowRightIcon width={17} height={17} />
              </button>
              <button type="button" onClick={onOpenSpecialist} className="a4-btn a4-btn--ghost a4-btn--lg">
                Falar com um especialista
              </button>
            </div>

            {pitchOpen && (
              <div id="a4-hero-pitch" className="a4-panel a4-panel--lit a4-hero__pitch a4-enter">
                <span className="a4-label a4-label--gold">{HERO_PITCH.kicker}</span>
                <p className="a4-body" style={{ fontSize: '0.9375rem' }}>
                  {HERO_PITCH.lead}
                </p>

                {HERO_PITCH.stages.map((s) => (
                  <div key={s.tag}>
                    <span className="a4-label a4-label--gold a4-hero__pitch-tag">{s.tag}</span>
                    <h4 className="a4-h4">{s.title}</h4>
                    <p className="a4-body" style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      {s.body}
                    </p>
                  </div>
                ))}

                <div className="a4-hero__callout">
                  <BoltIcon />
                  <p className="a4-body" style={{ fontSize: '0.9375rem', margin: 0 }}>
                    {HERO_PITCH.impossible}
                  </p>
                </div>

                <p className="a4-body" style={{ fontSize: '0.875rem' }}>
                  {HERO_PITCH.audience}
                </p>
                <p className="a4-body" style={{ fontSize: '0.875rem' }}>
                  {HERO_PITCH.segmentAgnostic}
                </p>

                <a href="#modulos" className="a4-btn a4-btn--ghost a4-btn--sm">
                  Ver os três estágios em detalhe
                  <ArrowRightIcon width={15} height={15} />
                </a>
              </div>
            )}

            <ul className="a4-hero__trust a4-enter a4-enter--5">
              <li>
                <ShieldCheckIcon /> A IA nunca aumenta seu gasto sem autorização
              </li>
              <li>
                <BoltIcon /> Três redes num painel só
              </li>
              <li>
                <DevicePhoneMobileIcon /> Aprovação pelo seu WhatsApp
              </li>
            </ul>
          </div>

          <ConsoleCarousel />
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   FAIXA DE AUTORIDADE — o dado duro entra cedo, com a fonte visível.
   Antes ficava escondido dentro de um modal a dois cliques de distância.
   ========================================================================== */

export function AuthorityBand() {
  return (
    <section className="a4-band--deep" aria-label="O que a pesquisa mostra">
      <div className="a4-wrap a4-wrap--wide">
        {/* Antes só existia como aria-label (invisível pra quem vê a tela) —
            os 4 números pareciam soltos, sem nada ligando-os entre si nem ao
            que o hero acabou de afirmar. Kicker visível, mesmo padrão de
            micro-cabeçalho já usado no resto da página. */}
        <p
          className="a4-label a4-label--gold"
          style={{ paddingTop: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: '1rem' }}
        >
          O que a pesquisa já mostra sobre o seu cliente
        </p>
        <div className="a4-authority a4-rise">
          {AUTHORITY.map((a) => {
            const s = SOURCES[a.sourceId]
            return (
              <div className="a4-authority__cell" key={a.figure}>
                <p className="a4-authority__fig">{a.figure}</p>
                <p className="a4-authority__claim">{a.claim}</p>
                <p className="a4-authority__src">
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
