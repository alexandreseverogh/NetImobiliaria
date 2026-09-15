'use client'

import { useState } from 'react'
import {
  CheckIcon,
  ArrowPathIcon,
  MegaphoneIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

import {
  LEAK,
  LOOP,
  LOOP_CLOSE,
  PRODUCT_TOUR,
  CAPABILITIES,
  AGENT_LOG,
  AGENT_RULES,
} from '../data'
import { SectionHead } from './Chrome'

/* ==========================================================================
   1 · DIAGNÓSTICO — o vazamento
   Numerado porque é uma sequência real de causa e efeito, não decoração.
   ========================================================================== */

export function Diagnosis() {
  return (
    <section id="diagnostico" className="a4-section a4-band--void" aria-labelledby="a4-diag">
      <div className="a4-wrap a4-wrap--wide">
        <SectionHead
          id="a4-diag"
          /* sem kicker: o H2 abre a seção sozinho */
          title="O problema não é gerar interessado. É não perder o que você já pagou."
          sub={
            <>
              A maior parte do dinheiro de marketing digital no Brasil não é perdida no anúncio.
              É perdida <span className="a4-strong">depois dele</span> — no intervalo entre o
              cliente levantar a mão e alguém responder. Esse intervalo é invisível em qualquer
              painel de rede social, porque a rede social não sabe o que acontece no seu WhatsApp.
            </>
          }
        />

        <div className="a4-leak">
          {LEAK.map((s) => (
            <article
              key={s.ord}
              className={`a4-leak__step a4-rise${s.loss ? ' a4-leak__step--loss' : ''}`}
            >
              <span className="a4-leak__ord">{s.ord}</span>
              <h3 className="a4-h4">{s.title}</h3>
              <p className="a4-small" style={{ color: 'var(--ink-dim)', fontSize: '0.875rem' }}>
                {s.body}
              </p>
              <div style={{ marginTop: '0.375rem' }}>
                <div className="a4-leak__metric">
                  <b>{s.metric}</b>
                  <span className="a4-small">{s.metricLabel}</span>
                </div>
                <div
                  className={`a4-leak__bar${s.loss ? ' a4-leak__bar--loss' : ''}`}
                  style={{ marginTop: '0.625rem' }}
                >
                  <i style={{ width: `${s.fill}%` }} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   2 · CICLO FECHADO — 3 módulos como estágios de um loop
   ========================================================================== */

const STAGE_ICON: Record<string, typeof MegaphoneIcon> = {
  'trafego-pago': MegaphoneIcon,
  mensageria: ChatBubbleLeftRightIcon,
  crm: UserGroupIcon,
}

export function ClosedLoop({
  onOpenModule,
  visibleSlugs,
}: {
  onOpenModule: (slug: string) => void
  /** Slugs ativos em `system_modules`. Ausente = mostra todos (default seguro). */
  visibleSlugs?: string[]
}) {
  const stages = visibleSlugs ? LOOP.filter((s) => visibleSlugs.includes(s.slug)) : LOOP

  return (
    <section id="modulos" className="a4-section a4-band--panel a4-band--edge" aria-labelledby="a4-mod">
      <div className="a4-wrap a4-wrap--wide">
        <SectionHead
          id="a4-mod"
          title="Não são três ferramentas. São três estágios do mesmo ciclo."
          sub={
            <>
              Cada módulo é contratado separadamente e funciona por conta própria. Mas o valor real
              aparece quando eles se falam: é o que transforma{' '}
              <span className="a4-strong">gasto com anúncio</span> em{' '}
              <span className="a4-strong">receita rastreada</span>.
            </>
          }
        />

        <div className="a4-loop">
          {stages.map((stage, i) => {
            const Icon = STAGE_ICON[stage.slug] ?? MegaphoneIcon
            return (
              <article className="a4-loop__stage a4-rise" key={stage.slug}>
                <span className="a4-loop__badge">
                  <Icon />
                  <span className="a4-label a4-label--gold">{stage.stage}</span>
                </span>

                <h3 className="a4-h3">{stage.name}</h3>
                <p className="a4-body" style={{ fontSize: '0.9375rem' }}>
                  {stage.promise}
                </p>

                <ul className="a4-loop__gains">
                  {stage.gains.map((g) => (
                    <li key={g}>
                      <CheckIcon />
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>

                <p className="a4-small" style={{ borderTop: '1px solid var(--line)', paddingTop: '0.875rem' }}>
                  {stage.handoff}
                </p>

                <div className="a4-loop__foot">
                  <button
                    type="button"
                    onClick={() => onOpenModule(stage.slug)}
                    className="a4-btn a4-btn--ghost a4-btn--sm"
                    style={{ width: '100%' }}
                  >
                    Ver em detalhe
                    <ArrowRightIcon width={15} height={15} />
                  </button>
                </div>

                {i < stages.length - 1 && <span className="a4-loop__link" aria-hidden="true" />}
              </article>
            )
          })}
        </div>

        <div className="a4-loop__close a4-rise">
          <ArrowPathIcon />
          <p className="a4-body" style={{ maxWidth: '72ch', fontSize: '0.9375rem', margin: 0 }}>
            {LOOP_CLOSE}
          </p>
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   3 · TOUR DO PRODUTO — mocks de tela, um por funcionalidade real
   ----------------------------------------------------------------------------
   Estas são representações construídas em HTML/CSS, não capturas de tela:
   ficam nítidas em qualquer resolução, acompanham o tema e nunca expõem dado
   de cliente real. Cada uma corresponde a uma funcionalidade que existe hoje.
   ========================================================================== */

function MockFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="a4-mock">
      <div className="a4-mock__bar">
        <i />
        <i />
        <i />
        <span className="a4-label" style={{ fontSize: '0.625rem' }}>
          {label}
        </span>
      </div>
      <div className="a4-mock__body">{children}</div>
    </div>
  )
}

function MockMoney() {
  const nets = [
    { n: 'Instagram / Facebook', v: 'R$ 22.410', c: 'R$ 118,00', w: 58, lead: true, tone: 'ok' as const },
    { n: 'Google', v: 'R$ 14.680', c: 'R$ 132,50', w: 33, lead: false, tone: 'ok' as const },
    { n: 'TikTok', v: 'R$ 3.722', c: 'R$ 268,40', w: 9, lead: false, tone: 'warn' as const },
  ]
  return (
    <MockFrame label="Campanhas · Visão executiva">
      <div className="a4-mock__kpis">
        <div className="a4-mock__kpi">
          <span className="a4-label">Investido no mês</span>
          <b>R$ 40.812</b>
          <span className="a4-small">3 redes · 11 campanhas</span>
        </div>
        <div className="a4-mock__kpi">
          <span className="a4-label">Interessados</span>
          <b>329</b>
          <span className="a4-small" style={{ color: 'var(--ok)' }}>+18% vs. mês anterior</span>
        </div>
        <div className="a4-mock__kpi">
          <span className="a4-label">Custo por interessado</span>
          <b>R$ 124,05</b>
          <span className="a4-small">Meta do segmento: R$ 150,00</span>
        </div>
      </div>

      <div>
        <p className="a4-label" style={{ marginBottom: '0.75rem' }}>
          Investimento e custo por interessado, por rede
        </p>
        <div className="a4-bars">
          {nets.map((x) => (
            <div className="a4-bars__row" key={x.n} style={{ gridTemplateColumns: '10rem 1fr auto' }}>
              <span className="a4-bars__name">{x.n}</span>
              <span className="a4-bars__track">
                <i className={`a4-bars__fill${x.lead ? ' a4-bars__fill--lead' : ''}`} style={{ width: `${x.w}%` }} />
              </span>
              <span className="a4-bars__val" style={{ minWidth: '8.5rem' }}>
                {x.v} <span className={`a4-chip a4-chip--${x.tone}`} style={{ marginLeft: '0.375rem' }}>{x.c}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </MockFrame>
  )
}

function MockWaste() {
  const rows = [
    { t: 'Gastou e não trouxe ninguém', s: '2 campanhas · 9 dias', v: 'R$ 3.180', tone: 'crit' as const },
    { t: 'Custo por interessado acima do aceitável', s: '3 campanhas', v: 'R$ 2.460', tone: 'crit' as const },
    { t: 'Anúncio desgastado (mesma pessoa vendo demais)', s: '1 campanha · frequência 4,1', v: 'R$ 1.040', tone: 'warn' as const },
    { t: 'Custo baixo, muitos interessados — e zero venda', s: '1 campanha · 46 interessados, 0 negócio', v: 'R$ 2.905', tone: 'crit' as const, hi: true },
    { t: 'Ainda aprendendo (não mexer)', s: '2 campanhas · 4 dias', v: 'R$ 612', tone: 'ok' as const },
  ]
  return (
    <MockFrame label="Campanhas · Desperdício de verba">
      <div className="a4-mock__kpis">
        <div className="a4-mock__kpi">
          <span className="a4-label">Verba em risco no período</span>
          <b style={{ color: 'var(--crit)' }}>R$ 10.197</b>
          <span className="a4-small">25% do investido no mês</span>
        </div>
        <div className="a4-mock__kpi">
          <span className="a4-label">Recuperável agora</span>
          <b style={{ color: 'var(--gold-hot)' }}>R$ 7.585</b>
          <span className="a4-small">Com as ações sugeridas</span>
        </div>
      </div>

      <div className="a4-mock__rows">
        {rows.map((r) => (
          <div className={`a4-mock__row${r.hi ? ' a4-mock__row--hi' : ''}`} key={r.t}>
            <div className="a4-mock__rowmain">
              <strong>{r.t}</strong>
              <span>{r.s}</span>
            </div>
            <div className="a4-mock__rowside">
              <span className={`a4-chip a4-chip--${r.tone}`}>{r.v}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="a4-small">
        A linha destacada só existe porque o CRM devolve o negócio fechado para a campanha. Em
        qualquer outro painel, ela apareceria como a sua melhor campanha do mês.
      </p>
    </MockFrame>
  )
}

function MockApproval() {
  return (
    <MockFrame label="WhatsApp · Aprovação do agente">
      <div className="a4-wa">
        <div className="a4-wa__msg">
          <b>Artemis4 · Agente</b>
          <br />
          A campanha <b>Reforma · Carrossel</b> está entregando a R$ 96,40 por interessado — 36%
          abaixo da sua meta — há 7 dias seguidos.
          <br />
          <br />
          Proposta: <b>aumentar R$ 180/dia</b> (de R$ 500 para R$ 680).
          <br />
          Confirme com o código <b>482917</b>.
        </div>
        <p className="a4-wa__meta">Aprovar · Rejeitar · Ver histórico completo</p>

        <div className="a4-wa__msg a4-wa__msg--out">482917</div>

        <div className="a4-wa__msg">
          <b>Artemis4 · Agente</b>
          <br />
          Feito. Orçamento em R$ 680/dia. Vou medir o efeito e te dar o veredito em 14 dias.
        </div>
      </div>

      <div className="a4-mock__rows">
        <div className="a4-mock__row">
          <div className="a4-mock__rowmain">
            <strong>Pausar anúncio com queda de desempenho</strong>
            <span>Reduz gasto · a plataforma faz sozinha</span>
          </div>
          <div className="a4-mock__rowside">
            <span className="a4-chip a4-chip--ok">
              <i className="a4-dot" /> Automático
            </span>
          </div>
        </div>
        <div className="a4-mock__row a4-mock__row--hi">
          <div className="a4-mock__rowmain">
            <strong>Aumentar investimento diário</strong>
            <span>Aumenta gasto · exige seu código</span>
          </div>
          <div className="a4-mock__rowside">
            <span className="a4-chip a4-chip--gold">
              <i className="a4-dot" /> Precisa de você
            </span>
          </div>
        </div>
      </div>
    </MockFrame>
  )
}

function MockBot() {
  return (
    <MockFrame label="Mensageria · Atendimento automático">
      <div className="a4-wa">
        <div className="a4-wa__msg">
          Oi, vi o anúncio. Tem apartamento de 3 quartos em Boa Viagem até 700 mil?
        </div>
        <div className="a4-wa__msg a4-wa__msg--out">
          Tenho sim! Encontrei <b>3 opções</b> que batem com o que você procura:
          <br />
          <br />
          • <b>Ed. Marítimo</b> — 3 quartos, 1 suíte, 2 vagas, 94 m² — R$ 648.000
          <br />• <b>Ed. Aurora</b> — 3 quartos, 2 vagas, 88 m² — R$ 690.000
          <br />• <b>Ed. Costa Azul</b> — 3 quartos, 1 vaga, 82 m² — R$ 615.000
          <br />
          <br />
          Quer ver as fotos de algum deles?
        </div>
        <p className="a4-wa__meta">
          Respondeu em 4 segundos, consultando o cadastro real — valor, quartos, vagas e área
          conferidos na hora.
        </p>

        <div className="a4-wa__msg">E o financiamento, vocês fazem em 420 meses?</div>
        <div className="a4-wa__msg a4-wa__msg--out">
          Essa condição específica eu não tenho aqui. Vou chamar alguém do time para te responder
          com precisão — só um instante.
        </div>
      </div>

      <div className="a4-mock__rows">
        <div className="a4-mock__row a4-mock__row--hi">
          <div className="a4-mock__rowmain">
            <strong>Conversa transferida para pessoa</strong>
            <span>Motivo: pergunta fora da base cadastrada · histórico anexado</span>
          </div>
          <div className="a4-mock__rowside">
            <span className="a4-chip a4-chip--gold">Aguardando time</span>
          </div>
        </div>
      </div>
      <p className="a4-small">
        A regra é explícita no sistema: nunca afirmar o que não foi consultado. Preferimos um
        &ldquo;não sei, vou chamar alguém&rdquo; a uma resposta inventada na frente do seu cliente.
      </p>
    </MockFrame>
  )
}

function MockPendency() {
  const rows = [
    { n: 'Marcos Andrade', s: 'Aguardando nossa resposta há 2h14', b: 'nós', tone: 'crit' as const, tag: 'Cobrado o responsável', hi: true },
    { n: 'Juliana Peixoto', s: 'Aguardando nossa resposta há 41min', b: 'nós', tone: 'warn' as const, tag: 'Dentro do prazo' },
    { n: 'Rafael Nunes', s: 'Bola com o cliente há 3 dias', b: 'cliente', tone: 'ok' as const, tag: 'Reativação programada' },
    { n: 'Camila Torres', s: 'Sem resposta há 6h · responsável de atestado', b: 'nós', tone: 'crit' as const, tag: 'Reatribuído automaticamente' },
  ]
  return (
    <MockFrame label="CRM · Vigilância de atendimento">
      <div className="a4-mock__kpis">
        <div className="a4-mock__kpi">
          <span className="a4-label">Esperando por nós agora</span>
          <b style={{ color: 'var(--crit)' }}>3</b>
          <span className="a4-small">De 27 atendimentos abertos</span>
        </div>
        <div className="a4-mock__kpi">
          <span className="a4-label">Reatribuídos hoje</span>
          <b>1</b>
          <span className="a4-small">Sem ninguém pedir</span>
        </div>
      </div>

      <div className="a4-mock__rows">
        {rows.map((r) => (
          <div className={`a4-mock__row${r.hi ? ' a4-mock__row--hi' : ''}`} key={r.n}>
            <div className="a4-mock__rowmain">
              <strong>{r.n}</strong>
              <span>{r.s}</span>
            </div>
            <div className="a4-mock__rowside">
              <span className={`a4-chip a4-chip--${r.tone}`}>
                {r.b === 'nós' ? 'Bola com você' : 'Bola com o cliente'}
              </span>
              <span className="a4-chip">{r.tag}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="a4-small">
        Quatro degraus, sem intervenção humana: avisa o responsável, avisa acima, reatribui para
        quem está disponível e, se não houver ninguém, coloca o atendimento numa fila de resgate
        visível — em vez de deixá-lo apodrecer em silêncio.
      </p>
    </MockFrame>
  )
}

function MockRevenue() {
  const rows = [
    { c: 'Boa Viagem · Foto', inv: 'R$ 11.927', deals: '2 negócios', rev: 'R$ 1.318.000', ret: '110×', tone: 'ok' as const, hi: true },
    { c: 'Alto Padrão · Vídeo', inv: 'R$ 9.480', deals: '1 negócio', rev: 'R$ 420.000', ret: '44×', tone: 'ok' as const },
    { c: 'Lançamento · Carrossel', inv: 'R$ 8.905', deals: 'nenhum', rev: '—', ret: '0×', tone: 'crit' as const },
  ]
  return (
    <MockFrame label="Campanhas · Do anúncio ao caixa">
      <div className="a4-mock__rows">
        <div className="a4-mock__row" style={{ background: 'rgba(2,12,27,0.5)' }}>
          <div className="a4-mock__rowmain">
            <span className="a4-label">Campanha · investimento</span>
          </div>
          <div className="a4-mock__rowside">
            <span className="a4-label">Negócio fechado · retorno real</span>
          </div>
        </div>
        {rows.map((r) => (
          <div className={`a4-mock__row${r.hi ? ' a4-mock__row--hi' : ''}`} key={r.c}>
            <div className="a4-mock__rowmain">
              <strong>{r.c}</strong>
              <span>Investido: {r.inv}</span>
            </div>
            <div className="a4-mock__rowside">
              <span className="a4-small" style={{ textAlign: 'right' }}>
                {r.deals}
                <br />
                {r.rev}
              </span>
              <span className={`a4-chip a4-chip--${r.tone}`}>{r.ret}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="a4-small">
        A terceira linha é o caso mais comum e mais caro: a campanha que trazia mais gente pelo
        menor custo, e nunca fechou um negócio. Sem essa tela, ela seria a campanha que você
        escalaria neste mês.
      </p>
    </MockFrame>
  )
}

const MOCKS: Record<string, () => React.JSX.Element> = {
  money: MockMoney,
  waste: MockWaste,
  approval: MockApproval,
  bot: MockBot,
  pendency: MockPendency,
  revenue: MockRevenue,
}

export function ProductTour() {
  const [active, setActive] = useState(PRODUCT_TOUR[0].id)
  const item = PRODUCT_TOUR.find((t) => t.id === active) ?? PRODUCT_TOUR[0]
  const Mock = MOCKS[item.id] ?? MockMoney

  /**
   * Navegação por seta dentro do tablist.
   * `role="tablist"` cria a expectativa ARIA de mover com as setas; sem isso o
   * componente só responde a Tab e falha o padrão de teclado esperado.
   */
  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'Home', 'End']
    if (!keys.includes(e.key)) return
    e.preventDefault()

    const last = PRODUCT_TOUR.length - 1
    let next = index
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = index === last ? 0 : index + 1
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = index === 0 ? last : index - 1
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = last

    const id = PRODUCT_TOUR[next].id
    setActive(id)
    document.getElementById(`a4-tour-tab-${id}`)?.focus()
  }

  return (
    <section id="plataforma" className="a4-section a4-band--void a4-band--edge" aria-labelledby="a4-plat">
      <div className="a4-wrap a4-wrap--wide">
        <SectionHead
          id="a4-plat"
          title="Discurso é fácil. Isto é o que a tela mostra."
          sub={
            <>
              Seis funcionalidades que existem hoje, em operação. Escolha uma e veja exatamente o
              que a plataforma entrega — com o número, o motivo e a decisão à vista.
            </>
          }
        />

        <div className="a4-tour a4-rise">
          <div className="a4-tour__list" role="tablist" aria-label="Funcionalidades">
            {PRODUCT_TOUR.map((t, i) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={t.id === active}
                aria-controls={`a4-tour-panel-${t.id}`}
                id={`a4-tour-tab-${t.id}`}
                tabIndex={t.id === active ? 0 : -1}
                className="a4-tour__tab"
                onClick={() => setActive(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                <strong>{t.tab}</strong>
                <span>{t.tabHint}</span>
              </button>
            ))}
          </div>

          <div
            className="a4-tour__panel"
            role="tabpanel"
            id={`a4-tour-panel-${item.id}`}
            aria-labelledby={`a4-tour-tab-${item.id}`}
            tabIndex={-1}
          >
            <div className="a4-tour__copy">
              <span className="a4-chip a4-chip--gold">{item.module}</span>
              <h3 className="a4-h3">{item.title}</h3>
              <p className="a4-body">{item.body}</p>
              {item.note && (
                <p className="a4-small" style={{ maxWidth: '68ch' }}>
                  {item.note}
                </p>
              )}
            </div>

            <Mock />
          </div>
        </div>

        {/* Capacidades adicionais — volume real sem inflar o tour */}
        <div className="a4-rise" style={{ marginTop: 'clamp(2.5rem, 5vw, 4rem)' }}>
          <p className="a4-label" style={{ marginBottom: '1.25rem' }}>
            E também, já em operação
          </p>
          <div
            style={{
              display: 'grid',
              gap: '1px',
              background: 'var(--line)',
              border: '1px solid var(--line)',
              borderRadius: '14px',
              overflow: 'hidden',
              gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
            }}
          >
            {CAPABILITIES.map((c) => (
              <div key={c.title} style={{ background: 'var(--raised)', padding: '1.125rem 1.25rem' }}>
                <h4 className="a4-h4" style={{ marginBottom: '0.375rem' }}>
                  {c.title}
                </h4>
                <p className="a4-small">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ==========================================================================
   4 · AGENTE AUTÔNOMO — em formato de registro de eventos
   ========================================================================== */

const KIND_TONE: Record<string, string> = {
  detect: 'a4-chip',
  auto: 'a4-chip a4-chip--ok',
  notify: 'a4-chip',
  wait: 'a4-chip a4-chip--gold',
}

export function AgentSection() {
  return (
    <section id="agente" className="a4-section a4-band--panel a4-band--edge" aria-labelledby="a4-agente">
      <div className="a4-wrap a4-wrap--wide">
        <SectionHead
          id="a4-agente"
          title="Uma noite de trabalho que ninguém precisou fazer"
          sub={
            <>
              Este é um registro real de como a plataforma opera enquanto você dorme. Note onde ela
              age sozinha — e onde ela <span className="a4-strong">para e te pergunta</span>.
            </>
          }
        />

        <div className="a4-log a4-rise">
          <div className="a4-log__head">
            <span className="a4-label" style={{ color: 'var(--ok)' }}>
              <i className="a4-dot" style={{ display: 'inline-block', marginRight: '0.375rem' }} />
              Registro de decisões
            </span>
            <span className="a4-label">Madrugada de uma terça comum</span>
          </div>
          {AGENT_LOG.map((e, i) => (
            <div className="a4-log__row" key={`${e.time}-${i}`}>
              <span className="a4-log__t">{e.time}</span>
              <span className="a4-log__m" dangerouslySetInnerHTML={{ __html: e.text }} />
              <span className={KIND_TONE[e.kind]}>{e.tag}</span>
            </div>
          ))}
        </div>

        <div className="a4-split" style={{ marginTop: 'clamp(1.5rem, 3vw, 2.25rem)' }}>
          <div className="a4-rule a4-rule--auto a4-rise">
            <span className="a4-chip a4-chip--ok">
              <i className="a4-dot" /> Sem pedir licença
            </span>
            <h3 className="a4-h4">{AGENT_RULES.auto.title}</h3>
            <p className="a4-body" style={{ fontSize: '0.9375rem' }}>
              {AGENT_RULES.auto.body}
            </p>
            <div className="a4-rule__tags">
              {AGENT_RULES.auto.tags.map((t) => (
                <span className="a4-chip" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="a4-rule a4-rule--ask a4-rise">
            <span className="a4-chip a4-chip--gold">
              <i className="a4-dot" /> Sempre com seu código
            </span>
            <h3 className="a4-h4">{AGENT_RULES.ask.title}</h3>
            <p className="a4-body" style={{ fontSize: '0.9375rem' }}>
              {AGENT_RULES.ask.body}
            </p>
            <div className="a4-rule__tags">
              {AGENT_RULES.ask.tags.map((t) => (
                <span className="a4-chip" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
