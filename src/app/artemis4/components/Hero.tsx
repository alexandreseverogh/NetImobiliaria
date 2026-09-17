'use client'

import { useEffect, useState } from 'react'
import {
  ShieldCheckIcon,
  BoltIcon,
  DevicePhoneMobileIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

import { AUTHORITY, SOURCES } from '../data'

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
    <div className="a4-console a4-enter a4-enter--4" aria-label="Exemplo de painel da plataforma">
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
   HERO
   ========================================================================== */

export function Hero({
  onEnter,
  onOpenSpecialist,
}: {
  onEnter: () => void
  onOpenSpecialist: () => void
}) {
  return (
    <section className="a4-hero" aria-labelledby="a4-hero-title">
      <div className="a4-hero__stars" aria-hidden="true" />
      <div className="a4-hero__horizon" aria-hidden="true" />
      <div className="a4-hero__glow" aria-hidden="true" />

      <div className="a4-wrap a4-wrap--wide">
        <div className="a4-hero__grid">
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
              <a href="#plataforma" className="a4-btn a4-btn--primary a4-btn--lg">
                Ver a plataforma funcionando
                <ArrowRightIcon width={17} height={17} />
              </a>
              <button type="button" onClick={onOpenSpecialist} className="a4-btn a4-btn--ghost a4-btn--lg">
                Falar com um especialista
              </button>
            </div>

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

          <MissionConsole />
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
