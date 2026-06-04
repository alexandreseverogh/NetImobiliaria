"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HelpItem {
  emoji: string;
  term: string;
  subtitle?: string;
  what: string;
  how: string;
  tip?: string;
  benchmark?: string;
}

// ─── Content ─────────────────────────────────────────────────────────────────

const METRICAS: HelpItem[] = [
  {
    emoji: '💸',
    term: 'Gasto',
    subtitle: 'Total investido no período',
    what: 'É o valor total gasto em todas as campanhas ativas no período selecionado.',
    how: 'Quanto maior, mais dinheiro foi investido em anúncios. Compare sempre com os resultados gerados (leads, conversões). Um gasto alto com poucos leads indica ineficiência.',
    tip: 'A seta vermelha (↑) é esperada — mais gasto significa mais investimento. Preocupe-se quando o CPL sobe junto.',
  },
  {
    emoji: '👁️',
    term: 'Impressões',
    subtitle: 'Quantas vezes o anúncio foi exibido',
    what: 'Número de vezes que seu anúncio apareceu na tela de alguém — incluindo exibições repetidas para a mesma pessoa.',
    how: 'Volume de exposição da sua mensagem. Alto número de impressões com baixo CTR indica que o anúncio não está chamando atenção suficiente para gerar cliques.',
    benchmark: 'Sem referência absoluta — compare entre períodos. Quedas bruscas podem indicar fim de verba ou problema no pixel.',
  },
  {
    emoji: '🎯',
    term: 'Alcance',
    subtitle: 'Pessoas únicas que viram o anúncio',
    what: 'Número de pessoas distintas que foram expostas ao anúncio — cada pessoa contada uma vez, independente de quantas vezes viu.',
    how: 'Diferente de Impressões: se a mesma pessoa viu o anúncio 5 vezes, o Alcance conta 1 e as Impressões contam 5. Alcance baixo com Impressões altas = alta frequência (mesmas pessoas vendo muitas vezes).',
    tip: 'Frequência muito alta (>3-4x por pessoa) pode causar "fadiga do anúncio" — as pessoas ficam entediadas e ignoram.',
  },
  {
    emoji: '🖱️',
    term: 'Cliques',
    subtitle: 'Total de cliques no anúncio',
    what: 'Número de vezes que alguém clicou em qualquer parte do anúncio — no link, no botão de chamada, no nome da página.',
    how: 'Indicador de interesse e intenção. Mais cliques = mais tráfego no seu site ou landing page. Avalie sempre em conjunto com o CTR para entender a qualidade do público.',
    benchmark: 'Monitore a proporção Cliques → Leads. Se muita gente clica mas poucos viram leads, o problema pode estar na landing page.',
  },
  {
    emoji: '📊',
    term: 'CTR',
    subtitle: 'Click-Through Rate — Taxa de Cliques',
    what: 'Percentual de pessoas que clicaram no anúncio em relação ao total que o viram. Fórmula: (Cliques ÷ Impressões) × 100.',
    how: 'É o principal indicador de relevância do criativo. CTR baixo = anúncio não está chamando atenção. CTR alto = mensagem está ressoando com o público.',
    benchmark: 'Referência para Meta Ads imobiliário: abaixo de 1% = ruim / 1–2% = regular / 2–3% = bom / acima de 3% = excelente.',
    tip: 'Se o CTR caiu entre períodos sem mudar o anúncio, o público pode ter "cansado" do criativo (fadiga).',
  },
  {
    emoji: '💰',
    term: 'CPC',
    subtitle: 'Cost Per Click — Custo por Clique',
    what: 'Quanto você paga, em média, por cada clique no seu anúncio. Fórmula: Gasto ÷ Cliques.',
    how: 'Quanto menor, melhor (você paga menos por cada pessoa que visita sua página). CPC alto pode indicar audiência muito concorrida ou criativo pouco relevante.',
    benchmark: 'Para imóveis no Brasil: R$ 0,50–R$ 1,50 = ótimo / R$ 1,50–R$ 3,00 = normal / acima de R$ 3,00 = revisar criativo ou público.',
    tip: 'A seta invertida — ↑ no CPC é negativo (está custando mais caro). ↓ é positivo.',
  },
  {
    emoji: '📡',
    term: 'CPM',
    subtitle: 'Cost Per Mille — Custo por 1.000 Impressões',
    what: 'Quanto você paga para exibir seu anúncio para 1.000 pessoas. Fórmula: (Gasto ÷ Impressões) × 1.000.',
    how: 'Indicador do "preço do mercado" de atenção. CPM alto significa que o público que você segmentou é disputado por muitos anunciantes (mais caro para alcançar).',
    benchmark: 'Varia muito por segmentação. Públicos premium (renda alta, cidades grandes) têm CPM naturalmente mais alto.',
    tip: 'CPM subindo sem mudança de segmentação indica aumento de concorrência no leilão do Meta.',
  },
  {
    emoji: '🔷',
    term: 'Pixel',
    subtitle: 'O rastreador invisível do Meta',
    what: 'O Pixel do Meta é um pequeno código (algumas linhas de JavaScript) instalado no seu site ou landing page. Ele age como uma "câmera de segurança digital" — registra silenciosamente tudo que os visitantes fazem depois de clicar no seu anúncio.',
    how: `Quando alguém clica no anúncio e chega ao seu site, o Pixel "acende" e começa a observar. Ele registra eventos como:

• Visitou a página (PageView)
• Preencheu o formulário (Lead)
• Chegou à página de obrigado (CompleteRegistration)

Esses dados voltam automaticamente para o Meta Ads, que usa as informações para:
1. Medir os resultados reais das campanhas (Conversões)
2. Otimizar os anúncios — o algoritmo aprende quem converte e busca mais pessoas parecidas
3. Criar públicos de remarketing (quem visitou mas não converteu)`,
    tip: 'Sem o Pixel instalado corretamente, o Meta "voa às cegas" — não sabe se os cliques estão gerando resultados reais, e não consegue otimizar as campanhas de forma inteligente.',
    benchmark: 'Verifique sempre o Tracking Health no dashboard — ele indica se o Pixel está funcionando. Score abaixo de 50 = dados não confiáveis.',
  },
  {
    emoji: '⚡',
    term: 'Conversões',
    subtitle: 'Ações rastreadas pelo pixel',
    what: 'Número de ações valiosas realizadas pelos visitantes após clicar no anúncio, rastreadas pelo Pixel do Meta (ex: preenchimento de formulário, visita à página de agradecimento).',
    how: 'Indica quantas pessoas completaram a ação desejada. Diferente de "Leads" (que vêm do CRM), Conversões são eventos do pixel e podem incluir ações pré-lead.',
    tip: 'Se Conversões é muito diferente de Leads, pode haver discrepância entre o evento do pixel e a captura real de contatos.',
  },
  {
    emoji: '👤',
    term: 'Leads',
    subtitle: 'Contatos captados no CRM',
    what: 'Número de pessoas que demonstraram interesse real e deixaram seus dados de contato — vindos diretamente do CRM da plataforma.',
    how: 'É a métrica mais importante para negócios de captação. Todo o esforço de campanha existe para maximizar leads qualificados a um custo sustentável (CPL).',
    benchmark: 'Avalie sempre o CPL junto: 100 leads por R$ 5,00 cada é melhor que 50 leads por R$ 15,00 cada.',
  },
  {
    emoji: '🏷️',
    term: 'CPL',
    subtitle: 'Cost Per Lead — Custo por Lead',
    what: 'Quanto você paga, em média, para captar cada lead. Fórmula: Gasto Total ÷ Número de Leads.',
    how: 'É a métrica-rainha para campanhas de geração de leads. Quanto menor o CPL, mais eficiente é sua campanha. Monitore a tendência: CPL subindo = eficiência caindo.',
    benchmark: 'Para imóveis no Brasil: abaixo de R$ 20 = excelente / R$ 20–50 = bom / R$ 50–100 = aceitável / acima de R$ 100 = investigar.',
    tip: 'Não existe CPL ideal universal — depende do ticket médio do imóvel. R$ 80 por lead é caro para imóveis populares, mas excelente para alto padrão.',
  },
  {
    emoji: '📅',
    term: 'Budget/dia',
    subtitle: 'Orçamento diário total das campanhas',
    what: 'Soma do orçamento diário configurado em todas as campanhas ativas no período.',
    how: 'Quanto o Meta está autorizado a gastar por dia. Serve para controlar o ritmo de investimento. Não confundir com Gasto real — o Meta pode gastar um pouco acima ou abaixo do limite diário.',
  },
  {
    emoji: '🎣',
    term: 'Hook Rate',
    subtitle: 'Taxa de captura — só vídeos',
    what: 'Percentual de pessoas que assistiram ao menos 3 segundos do vídeo em relação ao total que teve o anúncio exibido. Fórmula: (Views 3s ÷ Impressões) × 100.',
    how: '"Hook" significa "gancho" — os primeiros 3 segundos são o gancho do vídeo. Um Hook Rate alto significa que o início do vídeo está prendendo a atenção. Só aparece quando há dados de visualização de vídeo.',
    benchmark: 'Abaixo de 8% = gancho fraco, revisar os primeiros 3s / 8–12% = regular / acima de 12% = bom / acima de 20% = excelente.',
    tip: 'O segredo do Hook Rate está nos primeiros 2 segundos: mostre o resultado (imóvel, lifestyle) antes de qualquer texto ou logo.',
  },
];

const PAINEIS: HelpItem[] = [
  {
    emoji: '🔻',
    term: 'Funil por Estágio',
    subtitle: 'A jornada do desconhecido ao lead',
    what: 'Representação visual da jornada do público desde o primeiro contato com o anúncio até a conversão em lead. Cada estágio mostra quantas pessoas passaram para a próxima etapa.',
    how: `O funil tem 4 estágios em sequência:

1️⃣ IMPRESSÕES — Todo mundo que viu o anúncio (topo do funil, maior volume)
2️⃣ CLIQUES — Quem achou relevante o suficiente para clicar
3️⃣ CONVERSÕES — Quem chegou à landing page e realizou a ação do pixel
4️⃣ LEADS — Quem realmente deixou os dados de contato

A lógica: cada estágio é menor que o anterior. A "afunilagem" é normal e esperada. O que importa é a proporção de queda entre cada etapa.`,
    tip: 'Quedas abruptas entre etapas revelam gargalos: queda entre Impressões→Cliques = problema no criativo. Queda entre Cliques→Leads = problema na landing page.',
  },
  {
    emoji: '📈',
    term: 'Projeções por Regressão Linear',
    subtitle: 'Previsão matemática baseada no histórico',
    what: 'Projeção de métricas futuras (gasto, leads, CTR, CPC) calculada com base na tendência dos dados históricos usando regressão linear.',
    how: `Regressão linear é uma técnica estatística que traça a "linha de tendência" mais próxima dos dados reais e a prolonga no futuro. Pense assim:

📌 Imagine marcar um ponto no gráfico para cada dia: gasto do dia 1, gasto do dia 2, etc.
📌 A regressão linear encontra a linha reta que melhor "resume" esses pontos.
📌 Essa linha é então projetada para os próximos dias como previsão.

O gráfico mostra:
— Linha sólida = dados reais (histórico)
— Linha tracejada = projeção calculada
— Área sombreada = margem de incerteza (quanto maior, menos confiável)`,
    tip: 'Projeções são mais confiáveis com 14+ dias de histórico. Com poucos dias, a margem de erro é grande. Trate como indicativo, não como certeza.',
    benchmark: 'Se a projeção de CPL está subindo, é sinal de alerta: a campanha tende a ficar mais cara sem intervenção.',
  },
  {
    emoji: '🩺',
    term: 'Tracking Health',
    subtitle: 'Score 0–100 da saúde do rastreamento',
    what: 'Pontuação automática que avalia a qualidade do rastreamento de dados da campanha — se o pixel está disparando corretamente, se os eventos estão chegando, se há inconsistências.',
    how: `O score vai de 0 a 100 e é calculado com base em vários indicadores:

🟢 80–100 = Tracking saudável — dados confiáveis
🟡 50–79  = Atenção — possíveis falhas pontuais
🔴 0–49   = Crítico — dados podem estar incompletos ou incorretos

Problemas comuns que derrubam o score:
• Pixel não instalado ou instalado incorretamente
• Eventos duplicados (contando conversões em dobro)
• Dados de conversão chegando com atraso
• Discrepância grande entre conversões do Meta e leads reais`,
    tip: 'Um Tracking Health baixo significa que as métricas do dashboard podem não refletir a realidade. Antes de otimizar campanhas, corrija o tracking.',
  },
  {
    emoji: '🤖',
    term: 'Briefing Estratégico AI',
    subtitle: 'Documento de inteligência autônomo',
    what: 'Relatório estratégico gerado por Inteligência Artificial com base nos dados reais das campanhas. É um documento independente — não fica preso ao filtro de datas da página.',
    how: `O briefing é gerado duas vezes ao dia (08h e 18h) ou sob demanda clicando "Gerar · Xd" (onde Xd é o período que você quer analisar). Ele produz:

📋 Resumo de performance — como as campanhas se saíram
⚠️ Alertas urgentes — campanhas com CPL crítico ou problemas graves
🎯 Análise por campanha — diagnóstico individual com recomendação
💡 Recomendações de budget — redistribuição inteligente do investimento
✅ Plano de ação — próximos passos concretos

Por que o briefing é autônomo do filtro de datas?
Porque briefing e filtro são ferramentas diferentes:

🔍 O filtro de datas serve para exploração — você muda o período para inspecionar os gráficos em tempo real.

📄 O briefing é um documento de inteligência — foi gerado num momento específico, para um período específico, e contém contexto comparativo (período atual vs. anterior). Alterar o filtro da página não recalcula o documento; ele permanece como estava quando foi criado.

Cada briefing exibe seu próprio badge de período (ex: "7d", "30d") no canto do card, mostrando exatamente qual janela temporal foi analisada na geração. O histórico de briefings fica disponível clicando em "Histórico".`,
    tip: 'Para gerar um briefing do período que você está analisando, ajuste o filtro de datas no topo da página e depois clique em "Gerar · Xd" — o botão já mostra qual período será usado.',
    benchmark: '"Documento autônomo — período registrado na geração" significa que cada briefing carrega sua própria referência temporal, independente do que está filtrado na página.',
  },
  {
    emoji: '🎯',
    term: 'Ângulo de Comunicação',
    subtitle: 'A perspectiva estratégica central do anúncio',
    what: 'O ângulo é a lente pela qual o imóvel é apresentado ao potencial comprador — não o que você diz, mas por que a pessoa deveria se importar. É a motivação emocional ou racional que ancora o criativo.',
    how: `A plataforma trabalha com 7 ângulos distintos para imóveis:

💼 Investimento — Valorização, rentabilidade, retorno financeiro
🌴 Estilo de Vida — Qualidade de vida, lazer, bem-estar no cotidiano
👨‍👩‍👧 Família — Segurança, espaço, proximidade de escolas e serviços
💲 Preço — Condições especiais, parcelas acessíveis, custo-benefício
⏰ Urgência — Últimas unidades, oportunidade por tempo limitado
👥 Social — Prestígio, status, pertencimento a uma comunidade exclusiva
💎 Luxo — Alto padrão, acabamento diferenciado, exclusividade

Como a plataforma usa os ângulos:
• Ao criar uma campanha, você pode declarar o ângulo do criativo
• A IA analisa campanhas sem ângulo e sugere classificação automática em lote
• O dashboard exibe o ângulo com menor CPL (vencedor) e o de maior CPL (pior)
• A análise completa por ângulo está em Portfólio → Cross-Insights

Por que isso importa:
Concentrar todos os anúncios no mesmo ângulo limita o alcance — pessoas diferentes compram pelo investimento, pela família ou pelo estilo de vida. Diversificar ângulos e medir qual ressoa melhor com seu público é uma das alavancas mais eficientes de otimização.`,
    tip: 'Campanhas sem ângulo declarado aparecem como "não classificadas". Use o botão de classificação em lote (lista de campanhas) para deixar a IA sugerir o ângulo de cada uma — revise antes de confirmar.',
    benchmark: 'Referência prática: imóveis populares e médio padrão tendem a responder melhor a Preço e Família. Alto padrão e luxo respondem melhor a Estilo de Vida, Investimento e Luxo.',
  },
  {
    emoji: '💡',
    term: 'Insights de IA',
    subtitle: 'Sinais automáticos de ação imediata',
    what: 'Alertas e recomendações gerados automaticamente analisando CTR, CPC, frequência e CPL de cada campanha — sem depender de LLM externo.',
    how: `Cada insight tem um tipo com cor e ação sugerida:

🔴 PAUSE (Pausar) — Campanha com performance crítica: CPL muito alto, CTR em queda severa ou frequência excessiva. Ação: pausar para revisão.

🟢 SCALE (Escalar) — Campanha com excelente performance: CPL baixo, CTR alto e consistente. Ação: aumentar o orçamento diário.

🟡 OPTIMIZE (Otimizar) — Campanha com oportunidades de melhoria: performance regular com pontos específicos a ajustar (público, criativo ou bid).

🟠 ALERT (Alerta) — Anomalia detectada: mudança brusca em alguma métrica que merece atenção imediata.

O número "Confiança: XX%" indica o quão forte é o sinal — quanto maior, mais embasado estatisticamente.`,
    tip: 'Insights com confiança acima de 70% geralmente merecem ação imediata. Abaixo de 50%, monitore por mais um dia antes de agir.',
  },
];

// ─── Modal Component ──────────────────────────────────────────────────────────

interface Props {
  isDark: boolean;
}

export function DashboardHelpButton({ isDark }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen(true)}
        title="Ajuda — Guia de métricas e painéis"
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200',
          isDark
            ? 'bg-[rgba(99,102,241,0.10)] text-indigo-400 hover:bg-[rgba(99,102,241,0.18)] border border-[rgba(99,102,241,0.20)] hover:text-indigo-300'
            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 shadow-sm hover:text-indigo-700'
        )}
      >
        <QuestionMarkCircleIcon className="h-3.5 w-3.5" />
        Ajuda
      </button>

      {/* ── Modal ── */}
      <AnimatePresence>
        {open && (
          <DashboardHelpModal isDark={isDark} onClose={() => setOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

function DashboardHelpModal({ isDark, onClose }: { isDark: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'metricas' | 'paineis'>('metricas');

  const overlay = isDark ? 'bg-black/70' : 'bg-slate-900/40';
  const panel = isDark
    ? 'bg-[#0a0f1c] border border-[rgba(255,255,255,0.08)] shadow-[0_24px_80px_rgba(0,0,0,0.8)]'
    : 'bg-white border border-slate-200 shadow-[0_24px_80px_rgba(0,0,0,0.18)]';
  const tx      = isDark ? 'text-slate-100' : 'text-slate-900';
  const txMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const txFaint = isDark ? 'text-slate-600' : 'text-slate-400';
  const divider = isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-slate-100';

  const tabActive = isDark
    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
    : 'bg-indigo-600 text-white shadow-sm';
  const tabIdle = isDark
    ? 'text-slate-500 hover:text-slate-200 hover:bg-[rgba(255,255,255,0.05)]'
    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100';

  const items = tab === 'metricas' ? METRICAS : PAINEIS;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${overlay}`}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className={`relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl overflow-hidden ${panel}`}
      >
        {/* ── Header ── */}
        <div className={`px-7 pt-7 pb-5 border-b ${divider} shrink-0`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className={`p-1.5 rounded-lg ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-50'}`}>
                  <QuestionMarkCircleIcon className={`h-4 w-4 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                </div>
                <h2 className={`text-lg font-black ${tx}`}>Guia do Dashboard</h2>
              </div>
              <p className={`text-xs ${txMuted}`}>
                Entenda cada métrica, sigla e painel — do básico ao avançado.
              </p>
            </div>
            <button
              onClick={onClose}
              className={cn(
                'shrink-0 p-2 rounded-xl transition-colors',
                isDark
                  ? 'text-slate-500 hover:text-slate-200 hover:bg-[rgba(255,255,255,0.07)]'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              )}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className={cn(
            'flex gap-1 mt-5 p-1 rounded-xl',
            isDark ? 'bg-[rgba(255,255,255,0.04)]' : 'bg-slate-100'
          )}>
            {([
              { id: 'metricas', label: '📊 Métricas & KPIs', count: METRICAS.length },
              { id: 'paineis',  label: '🧩 Painéis Avançados', count: PAINEIS.length },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all duration-150',
                  tab === t.id ? tabActive : tabIdle
                )}
              >
                {t.label}
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-md font-black',
                  tab === t.id
                    ? 'bg-white/20 text-white'
                    : isDark ? 'bg-[rgba(255,255,255,0.07)] text-slate-500' : 'bg-white text-slate-500'
                )}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-7 py-6 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {items.map((item, i) => (
                <HelpCard key={i} item={item} isDark={isDark} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Footer ── */}
        <div className={`px-7 py-4 border-t ${divider} shrink-0`}>
          <p className={`text-[10px] text-center ${txFaint}`}>
            Pressione <kbd className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-mono mx-0.5',
              isDark ? 'bg-[rgba(255,255,255,0.07)] text-slate-400' : 'bg-slate-100 text-slate-500'
            )}>Esc</kbd> ou clique fora para fechar
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Help Card ────────────────────────────────────────────────────────────────

function HelpCard({ item, isDark }: { item: HelpItem; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const card = isDark
    ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.07)] hover:border-[rgba(99,102,241,0.25)] hover:bg-[rgba(255,255,255,0.05)]'
    : 'bg-slate-50/80 border-slate-200/80 hover:border-indigo-200 hover:bg-white';
  const tx      = isDark ? 'text-slate-100' : 'text-slate-900';
  const txMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const txFaint = isDark ? 'text-slate-600' : 'text-slate-400';
  const tipBg   = isDark ? 'bg-amber-500/08 border-amber-500/15 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-700';
  const benchBg = isDark ? 'bg-emerald-500/08 border-emerald-500/15 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700';

  const hasMore = !!(item.tip || item.benchmark);

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 transition-all duration-200 cursor-pointer select-none',
        card
      )}
      onClick={() => hasMore && setExpanded(p => !p)}
    >
      {/* ── Top row ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl leading-none shrink-0 mt-0.5">{item.emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-sm font-black leading-tight ${tx}`}>{item.term}</h3>
              {item.subtitle && (
                <span className={`text-[10px] font-semibold ${txFaint}`}>— {item.subtitle}</span>
              )}
            </div>
            <p className={`text-xs mt-1 leading-relaxed ${txMuted}`}>
              <span className={`font-black text-[10px] uppercase tracking-wide ${txFaint}`}>O que é: </span>
              {item.what}
            </p>
          </div>
        </div>
        {hasMore && (
          <span className={cn(
            'shrink-0 text-[10px] font-black uppercase tracking-wide mt-0.5 transition-transform duration-200',
            isDark ? 'text-indigo-500' : 'text-indigo-400',
            expanded && 'opacity-70'
          )}>
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>

      {/* ── How to interpret (always visible) ── */}
      <div className={cn(
        'mt-3 pl-10 text-xs leading-relaxed',
        txMuted
      )}>
        <span className={`font-black text-[10px] uppercase tracking-wide ${txFaint}`}>Como interpretar: </span>
        <span className="whitespace-pre-line">{item.how}</span>
      </div>

      {/* ── Expandable: tip + benchmark ── */}
      <AnimatePresence>
        {expanded && hasMore && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden pl-10 mt-3 space-y-2"
          >
            {item.benchmark && (
              <div className={cn('flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs', benchBg)}>
                <span className="shrink-0 font-black">📏 Referência:</span>
                <span>{item.benchmark}</span>
              </div>
            )}
            {item.tip && (
              <div className={cn('flex items-start gap-2 px-3 py-2.5 rounded-xl border text-xs', tipBg)}>
                <span className="shrink-0 font-black">💡 Dica:</span>
                <span>{item.tip}</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
