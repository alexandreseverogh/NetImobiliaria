'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  onOpenContact,
}: {
  onEnter: () => void
  onOpenSpecialist: () => void
  onOpenContact: () => void
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
          {/* Logomarca oficial (fundo escuro). next/image de propósito: o arquivo tem
              1293x338 e é exibido a ~52px de altura; o otimizador entrega o tamanho certo. */}
          <Image
            src="/Assets/artemis9/artemis9_logo_header_transparente.png"
            alt="Artemis9"
            width={1293}
            height={338}
            priority
            draggable={false}
            className="a4-nav__logo"
          />
        </Link>

        <nav className="a4-nav__links" aria-label="Seções">
          {NAV_LINKS.map((l) =>
            /* "Contato" nunca é uma página real — abre o modal em vez de navegar
               pra uma rota que não existe (/contato sempre deu 404). */
            l.href === '/contato' ? (
              <button key={l.href} type="button" onClick={onOpenContact} className="a4-nav__link">
                {l.label}
              </button>
            ) : (
              <a key={l.href} href={l.href} className="a4-nav__link">
                {l.label}
              </a>
            ),
          )}
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
              {NAV_LINKS.map((l) =>
                l.href === '/contato' ? (
                  <button
                    key={l.href}
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      onOpenContact()
                    }}
                  >
                    {l.label}
                  </button>
                ) : (
                  <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
                    {l.label}
                  </a>
                ),
              )}
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

type LegalDoc = 'privacidade' | 'termos'

const LEGAL_TITLES: Record<LegalDoc, string> = {
  privacidade: 'Política de Privacidade',
  termos: 'Termos de Uso',
}

function LegalModal({ doc, onClose }: { doc: LegalDoc; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={LEGAL_TITLES[doc]}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(2, 12, 27, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--panel, #0b1a2e)',
          color: 'var(--ink, #e6edf7)',
          maxWidth: '44rem',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: '12px',
          padding: '1.75rem',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{LEGAL_TITLES[doc]}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{ background: 'none', border: 'none', color: 'inherit', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        <LegalBody doc={doc} />
      </div>
    </div>
  )
}

function LegalBody({ doc }: { doc: LegalDoc }) {
  const h: React.CSSProperties = { fontSize: '1rem', fontWeight: 600, marginTop: '1.25rem', marginBottom: '0.4rem' }
  const p: React.CSSProperties = { fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '0.6rem', opacity: 0.9 }
  const ul: React.CSSProperties = { paddingLeft: '1.25rem', margin: '0 0 0.6rem', fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.9 }

  if (doc === 'privacidade') {
    return (
      <div>
        <p style={p}><em>Última atualização: 21/11/2026</em></p>
        <h3 style={h}>1. Quem somos</h3>
        <p style={p}>
          Esta política descreve como a <strong>Artemis9</strong> (CAMPOS TECHNOLOGY LTDA, CNPJ 29.278.729/0001-06,
          Rua Jorge de Lima, 1501 A, Recife/PE, CEP 51160-070) trata os dados pessoais de quem interage com nossos sites,
          formulários, anúncios e atendimento pelo WhatsApp.
        </p>
        <h3 style={h}>2. Dados que coletamos</h3>
        <ul style={ul}>
          <li>Nome, telefone e e-mail informados em formulários de contato ou de interesse.</li>
          <li>Mensagens trocadas conosco pelo WhatsApp e outros canais de atendimento.</li>
          <li>Dados de navegação e de interação com nossos anúncios, usados para medir a eficácia das campanhas.</li>
        </ul>
        <h3 style={h}>3. Como usamos seus dados</h3>
        <ul style={ul}>
          <li>Responder à sua solicitação e dar atendimento comercial.</li>
          <li>Mensurar o desempenho de anúncios e melhorar nossas campanhas.</li>
          <li>Cumprir obrigações legais.</li>
        </ul>
        <p style={p}>Não vendemos seus dados pessoais.</p>
        <h3 style={h}>4. Compartilhamento</h3>
        <p style={p}>
          Seus dados podem ser tratados por provedores que nos ajudam a operar (por exemplo, serviços de mensageria e de
          hospedagem), sempre sob obrigação de confidencialidade. Quando anúncios são veiculados em plataformas como Meta
          (Facebook e Instagram), essas plataformas tratam dados conforme as próprias políticas.
        </p>
        <h3 style={h}>5. Seus direitos e exclusão de dados</h3>
        <p style={p}>
          Você pode pedir acesso, correção ou exclusão dos seus dados pessoais a qualquer momento. Para isso, envie um
          e-mail para <strong>contato@artemis9.com.br</strong> com o assunto &quot;Exclusão de dados&quot;, informando o
          telefone ou e-mail usado no contato. Respondemos em até 15 dias.
        </p>
        <h3 style={h}>6. Segurança</h3>
        <p style={p}>Adotamos medidas técnicas e administrativas para proteger seus dados contra acesso não autorizado.</p>
        <h3 style={h}>7. Contato</h3>
        <p style={p}>Dúvidas sobre esta política: <strong>contato@artemis9.com.br</strong>.</p>
      </div>
    )
  }

  return (
    <div>
      <p style={p}><em>Última atualização: 21/11/2026</em></p>
      <h3 style={h}>1. Aceitação</h3>
      <p style={p}>
        Ao acessar o site e os serviços da <strong>Artemis9</strong> (CAMPOS TECHNOLOGY LTDA, CNPJ 29.278.729/0001-06),
        você concorda com estes Termos de Uso. Se não concordar, não utilize o site.
      </p>
      <h3 style={h}>2. Serviços</h3>
      <p style={p}>
        A Artemis9 oferece soluções de gestão de marketing digital e de relacionamento com clientes, incluindo
        gestão de campanhas, atendimento e análise de resultados. As funcionalidades podem variar conforme o plano contratado.
      </p>
      <h3 style={h}>3. Uso adequado</h3>
      <ul style={ul}>
        <li>Fornecer informações verdadeiras nos formulários e canais de contato.</li>
        <li>Não usar o site para atividades ilícitas, fraudulentas ou que violem direitos de terceiros.</li>
        <li>Não tentar acessar áreas restritas nem prejudicar o funcionamento da plataforma.</li>
      </ul>
      <h3 style={h}>4. Propriedade intelectual</h3>
      <p style={p}>
        Marcas, textos, imagens e código do site são de titularidade da Artemis9 ou de seus licenciadores. Nenhum
        direito é transferido ao usuário além do necessário para o uso dos serviços.
      </p>
      <h3 style={h}>5. Terceiros</h3>
      <p style={p}>
        Integrações com plataformas de terceiros (como Meta, Google e WhatsApp) seguem as próprias políticas e termos
        dessas empresas.
      </p>
      <h3 style={h}>6. Limitação de responsabilidade</h3>
      <p style={p}>
        Os resultados de campanhas dependem de fatores de mercado e de terceiros. A Artemis9 não garante resultados
        específicos e não responde por indisponibilidades causadas por plataformas externas.
      </p>
      <h3 style={h}>7. Alterações</h3>
      <p style={p}>Estes termos podem ser atualizados. A versão vigente é sempre a publicada nesta página.</p>
      <h3 style={h}>8. Foro e contato</h3>
      <p style={p}>
        Fica eleito o foro da comarca de Recife/PE. Dúvidas: <strong>contato@artemis9.com.br</strong>.
      </p>
    </div>
  )
}

export function Footer({ onOpenSpecialist }: { onOpenSpecialist: () => void }) {
  const cited = ['hbr', 'mit', 'mobileTime', 'dataReportal', 'esaOrion', 'nasaArtemis2'] as const
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null)
  const closeLegal = useCallback(() => setLegalDoc(null), [])

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
                <PhoneIcon /> <span>(81) 98524-0480</span>
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
            <button
              type="button"
              className="a4-small"
              onClick={() => setLegalDoc('privacidade')}
              style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}
            >
              Privacidade
            </button>
            <button
              type="button"
              className="a4-small"
              onClick={() => setLegalDoc('termos')}
              style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, color: 'inherit', cursor: 'pointer' }}
            >
              Termos de uso
            </button>
          </div>
        </div>
      </div>
      {legalDoc && <LegalModal doc={legalDoc} onClose={closeLegal} />}
    </footer>
  )
}
