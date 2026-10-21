'use client';

/**
 * Guia de Calibração de Criativos — explica, em linguagem acessível, o loop completo que vai
 * da foto que o usuário sobe até a próxima campanha que ele lança: ângulo declarado na
 * campanha → Vision lê cada criativo → a plataforma cruza isso com resultado real (CPL/CTR) →
 * vira recomendação → ação real do usuário via "Padrões Vencedores → Gerar com IA → Usar no
 * Wizard". Conteúdo compartilhado entre as páginas que expõem esse loop
 * (`/admin/campanhas/portfolio/cross-insights` e `/admin/campanhas/criativos/padroes`) — um só
 * texto, nunca duas versões divergentes.
 *
 * Deliberadamente fora da identidade "Ajuda" (indigo + emoji, ver DashboardHelpModal.tsx) —
 * este é um painel de missão dedicado, sempre no modo escuro real da marca (navy + âmbar),
 * porque o conteúdo é um processo operacional que merece o acento de decisão único do sistema
 * (gold-accent), não a camada de glossário. Ícones são Heroicons reais, nunca emoji.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  TagIcon,
  PhotoIcon,
  ChartBarIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CursorArrowRaysIcon,
  SparklesIcon,
  RocketLaunchIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

// ─── Tokens — reaproveita os valores de tinta já verificados contra contraste para o
// par navy-void/navy-surface (DESIGN.md §7, landing /artemis4), nunca inventados aqui ───
const ink = '#f1f5f9';      // 17,6:1 sobre navy-void
const inkDim = '#a7b4c6';   // 9,3:1
const inkFaint = '#8695ab'; // 6,7:1 sobre navy-void · 5,2:1 sobre navy-surface
const gold = '#c5a028';
const goldWarm = '#d4af37';

function Code({ children }: { children: ReactNode }) {
  return (
    <code
      className="font-mono text-xs px-1.5 py-0.5 rounded"
      style={{ background: 'rgba(255,255,255,0.08)', color: goldWarm }}
    >
      {children}
    </code>
  );
}

// ─── Passo da timeline (sequência real — a ordem é informação, não decoração) ───
interface FlowStep {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: ReactNode;
  body: ReactNode;
}

const LEARN_STEPS: FlowStep[] = [
  {
    icon: TagIcon,
    title: 'A campanha ganha um motivo',
    body: (
      <>Toda campanha carrega uma etiqueta dizendo <em>por que</em> a pessoa deveria se
      interessar — por exemplo, "Crescimento de Vendas" ou "ROI Comprovado". Você escolhe isso
      ao criar a campanha, ou a inteligência artificial lê o nome dela depois e sugere sozinha,
      sempre dentro do vocabulário real do seu segmento de negócio.</>
    ),
  },
  {
    icon: PhotoIcon,
    title: 'Cada foto conta sua própria história',
    body: (
      <>Ao subir uma imagem, a IA observa a cena e anota, sem você digitar nada, que tipo de
      gancho psicológico ela usa — urgência, curiosidade, prova social, benefício direto, entre
      outros.</>
    ),
  },
  {
    icon: ChartBarIcon,
    title: 'Os números decidem, não a opinião',
    body: (
      <>Depois de alguns dias rodando, a plataforma cruza tudo isso com o resultado real — custo
      por lead, taxa de clique — e descobre qual mensagem está trazendo lead mais barato, e qual
      está desperdiçando verba.</>
    ),
  },
  {
    icon: LightBulbIcon,
    title: 'A plataforma te avisa',
    body: (
      <>O vencedor e o perdedor aparecem lado a lado num painel dedicado, e um alerta chega
      quando um anúncio está cansando o público e precisa ser trocado.</>
    ),
  },
];

const ACT_STEPS: FlowStep[] = [
  {
    icon: SparklesIcon,
    title: (
      <>Abra <Code>Padrões Vencedores</Code></>
    ),
    body: 'Essa tela já mostra, com dado real, qual combinação de gancho e ângulo está trazendo o CPL mais baixo até agora — o histórico que embasa o passo seguinte.',
  },
  {
    icon: CursorArrowRaysIcon,
    title: 'Clique em "Gerar Conceito com IA"',
    body: 'A inteligência artificial escreve um texto de anúncio novo (título, corpo, gancho) usando exatamente o padrão que está vencendo — nunca inventa do zero.',
  },
  {
    icon: RocketLaunchIcon,
    title: 'Clique em "Usar no Wizard"',
    body: 'O texto gerado já chega pronto na tela de criação de campanha — só falta escolher uma imagem e lançar.',
  },
  {
    icon: CheckCircleIcon,
    title: 'Escolha uma imagem e lance',
    body: 'Pode ser a mesma foto com um texto diferente, ou uma foto nova. Esse anúncio novo entra no ciclo e, em alguns dias, já tem dado próprio para a próxima rodada de análise.',
  },
];

interface TableRow {
  action: string;
  automatic: string;
  youDo: string;
}

const TABLE_ROWS: TableRow[] = [
  {
    action: 'Pausar ou reduzir orçamento (ângulo perdedor)',
    automatic: 'Executa na hora, direto na Meta ou no Google',
    youDo: 'Nada — você só é avisado depois',
  },
  {
    action: 'Escalar investimento (ângulo vencedor)',
    automatic: 'Prepara a mudança e pede sua confirmação',
    youDo: 'Aprovar pelo link do WhatsApp ou na fila de aprovações',
  },
  {
    action: 'Trocar criativo (fadiga detectada)',
    automatic: 'Só avisa — não cria nada sozinha',
    youDo: 'Ir em Padrões Vencedores e lançar um criativo novo (os 4 passos acima)',
  },
  {
    action: 'Ajustar público',
    automatic: 'Só avisa — não altera nada sozinha',
    youDo: 'Ajustar a segmentação manualmente no Wizard',
  },
];

// ─── Trigger button — auto-contido: gerencia o próprio estado de abertura,
// a página-host só renderiza <CalibrationGuideButton /> sem nenhuma fiação extra ───

export function CalibrationGuideButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Como usar a calibração de criativos para gerar mais leads"
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors duration-150',
          className,
        )}
        style={{ background: gold, color: '#020c1b' }}
        onMouseEnter={e => { e.currentTarget.style.background = goldWarm; }}
        onMouseLeave={e => { e.currentTarget.style.background = gold; }}
      >
        <AdjustmentsHorizontalIcon className="h-4 w-4" strokeWidth={2.25} />
        Como Calibrar?
      </button>

      <AnimatePresence>
        {open && <CalibrationGuideModal onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function CalibrationGuideModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: 'rgba(2,12,27,0.72)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 14 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: '#0a192f',
          border: '1px solid rgba(197,160,40,0.14)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="px-7 pt-7 pb-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(197,160,40,0.14)' }}
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5" style={{ color: gold }} strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight" style={{ color: ink }}>
                  Como Calibrar Seus Criativos
                </h2>
                <p className="text-xs mt-1" style={{ color: inkDim }}>
                  O guia completo — da foto que você sobe até a próxima campanha que você lança.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-2 rounded-lg transition-colors"
              style={{ color: inkFaint }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = ink; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = inkFaint; }}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-7 py-6 space-y-7">

          {/* Abertura */}
          <p className="text-sm leading-relaxed" style={{ color: inkDim }}>
            Toda vez que você sobe uma foto para um anúncio, a plataforma lê aquela imagem
            sozinha e aprende algo sobre ela. Depois de alguns dias rodando, ela cruza isso com
            os resultados reais — quantos cliques, quantos leads, a que custo — e descobre qual
            tipo de mensagem está realmente funcionando para o seu negócio. Este guia explica,
            passo a passo, como esse processo acontece e o que você precisa fazer com cada
            recomendação que aparecer.
          </p>

          {/* Como a plataforma aprende */}
          <section>
            <h3 className="text-sm font-bold mb-4" style={{ color: ink }}>
              Como a plataforma aprende
            </h3>
            <FlowTimeline steps={LEARN_STEPS} />
          </section>

          {/* Callout — o detalhe que muda tudo */}
          <div
            className="rounded-xl px-4 py-4"
            style={{ background: 'rgba(253,224,71,0.07)', border: '1px solid rgba(253,224,71,0.22)' }}
          >
            <div className="flex items-start gap-2.5">
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#fde047' }} />
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: '#fde047' }}>
                  Um detalhe que muda tudo
                </p>
                <p className="text-xs leading-relaxed" style={{ color: inkDim }}>
                  Editar a etiqueta de uma campanha (o badge de ângulo) <strong style={{ color: ink }}>não muda o
                  que o público vê no anúncio</strong>. É só uma correção de registro interno, para a
                  análise continuar certa. Para realmente mudar a mensagem que as pessoas
                  recebem, você precisa criar um anúncio novo — e é exatamente isso que o passo
                  a seguir explica.
                </p>
              </div>
            </div>
          </div>

          {/* O caminho real */}
          <section>
            <h3 className="text-sm font-bold mb-4" style={{ color: ink }}>
              O caminho real, clique a clique
            </h3>
            <FlowTimeline steps={ACT_STEPS} accent />
          </section>

          {/* Tabela automático × manual */}
          <section>
            <h3 className="text-sm font-bold mb-3" style={{ color: ink }}>
              O que é automático × o que depende de você
            </h3>
            <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <th className="py-2.5 px-3 font-bold" style={{ color: ink }}>Recomendação</th>
                    <th className="py-2.5 px-3 font-bold" style={{ color: ink }}>A plataforma faz sozinha</th>
                    <th className="py-2.5 px-3 font-bold" style={{ color: ink }}>O que você precisa fazer</th>
                  </tr>
                </thead>
                <tbody>
                  {TABLE_ROWS.map((row, i) => (
                    <tr
                      key={row.action}
                      style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                    >
                      <td className="py-2.5 px-3 font-semibold align-top" style={{ color: ink }}>{row.action}</td>
                      <td className="py-2.5 px-3 align-top" style={{ color: inkDim }}>{row.automatic}</td>
                      <td className="py-2.5 px-3 align-top" style={{ color: inkDim }}>{row.youDo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Fechamento */}
          <div className="flex items-start gap-2.5 pt-1">
            <CheckCircleIcon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: gold }} />
            <p className="text-xs leading-relaxed" style={{ color: inkFaint }}>
              Esse cruzamento só fica confiável depois de alguns dias de anúncio rodando de
              verdade — e funciona igual para qualquer tipo de negócio na plataforma, não só
              para imóveis.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-7 py-3.5 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs text-center" style={{ color: inkFaint }}>
            Pressione{' '}
            <kbd
              className="px-1.5 py-0.5 rounded text-xs font-mono mx-0.5"
              style={{ background: 'rgba(255,255,255,0.07)', color: inkDim }}
            >
              Esc
            </kbd>{' '}
            ou clique fora para fechar
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Timeline — sequência conectada; a ordem é informação real, não decoração ───

function FlowTimeline({ steps, accent = false }: { steps: FlowStep[]; accent?: boolean }) {
  return (
    <div className="relative">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isLast = i === steps.length - 1;
        return (
          <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast && (
              <div
                className="absolute left-[19px] top-10 bottom-0 w-px"
                style={{ background: 'rgba(255,255,255,0.09)' }}
              />
            )}
            <div
              className="relative shrink-0 h-10 w-10 rounded-full flex items-center justify-center"
              style={{
                background: accent ? 'rgba(197,160,40,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${accent ? 'rgba(197,160,40,0.30)' : 'rgba(255,255,255,0.10)'}`,
              }}
            >
              <Icon className="h-4 w-4" style={{ color: accent ? gold : inkDim }} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 pt-1.5">
              <p className="text-xs font-bold leading-snug" style={{ color: ink }}>
                {step.title}
              </p>
              <p className="text-xs leading-relaxed mt-1" style={{ color: inkDim }}>
                {step.body}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
