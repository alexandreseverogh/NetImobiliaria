"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GlossaryEntry {
  label: string;
  desc: string;
}

interface HelpItem {
  emoji: string;
  term: string;
  subtitle?: string;
  what: string;                                  // degrau 1 — analogia/definição leiga
  how: string;                                   // degrau 2 — como interpretar
  glossary?: GlossaryEntry[];                    // degrau 3 — significado de cada valor
  actions?: { do: string[]; dont: string[] };    // degrau 4 — o que fazer / evitar
  benchmark?: string;                            // degrau 5 — referência numérica
  tip?: string;                                  // degrau 6 — dica avançada
}

// ─── Content: Métricas & KPIs ──────────────────────────────────────────────────

const METRICAS: HelpItem[] = [
  {
    emoji: '💸',
    term: 'Gasto',
    subtitle: 'Total investido no período',
    what: 'É o valor total gasto em todas as campanhas ativas no período selecionado.',
    how: 'Quanto maior, mais dinheiro foi investido em anúncios. Compare sempre com os resultados gerados (leads, conversões). Um gasto alto com poucos leads indica ineficiência.',
    actions: {
      do: [
        'Compare o gasto sempre com os leads gerados no mesmo período — é a relação que importa, não o número sozinho.',
        'Aumente o investimento apenas em campanhas que já provaram CPL baixo e estável.',
      ],
      dont: [
        'Não se assuste com a seta vermelha (↑) de gasto — mais investimento é esperado e normal.',
        'Não aumente o orçamento de uma campanha com o CPL subindo: você só vai gastar mais caro.',
      ],
    },
    tip: 'A seta vermelha (↑) é esperada — mais gasto significa mais investimento. Preocupe-se quando o CPL sobe junto.',
  },
  {
    emoji: '👁️',
    term: 'Impressões',
    subtitle: 'Quantas vezes o anúncio foi exibido',
    what: 'Número de vezes que seu anúncio apareceu na tela de alguém — incluindo exibições repetidas para a mesma pessoa.',
    how: 'Volume de exposição da sua mensagem. Alto número de impressões com baixo CTR indica que o anúncio não está chamando atenção suficiente para gerar cliques.',
    actions: {
      do: [
        'Use as impressões como termômetro de volume — compare entre períodos para detectar quedas de entrega.',
        'Se as impressões caírem de repente, verifique se a verba acabou ou se o pixel parou de funcionar.',
      ],
      dont: [
        'Não comemore impressões altas isoladamente — exposição sem clique não gera negócio.',
        'Não otimize uma campanha olhando só impressões; avalie o CTR junto.',
      ],
    },
    benchmark: 'Sem referência absoluta — compare entre períodos. Quedas bruscas podem indicar fim de verba ou problema no pixel.',
  },
  {
    emoji: '🎯',
    term: 'Alcance',
    subtitle: 'Pessoas únicas que viram o anúncio',
    what: 'Número de pessoas distintas que foram expostas ao anúncio — cada pessoa contada uma vez, independente de quantas vezes viu.',
    how: 'Diferente de Impressões: se a mesma pessoa viu o anúncio 5 vezes, o Alcance conta 1 e as Impressões contam 5. Alcance baixo com Impressões altas = alta frequência (mesmas pessoas vendo muitas vezes).',
    actions: {
      do: [
        'Acompanhe a frequência (Impressões ÷ Alcance). Acima de 3-4x por pessoa, renove o criativo.',
        'Para crescer, às vezes ampliar o público (mais alcance) rende mais que aumentar a verba.',
      ],
      dont: [
        'Não deixe a mesma pessoa ver o anúncio muitas vezes — isso cansa e queima a audiência.',
        'Não confunda alcance com impressões: alcance é gente, impressão é exibição.',
      ],
    },
    tip: 'Frequência muito alta (>3-4x por pessoa) pode causar "fadiga do anúncio" — as pessoas ficam entediadas e ignoram.',
  },
  {
    emoji: '🖱️',
    term: 'Cliques',
    subtitle: 'Total de cliques no anúncio',
    what: 'Número de vezes que alguém clicou em qualquer parte do anúncio — no link, no botão de chamada, no nome da página.',
    how: 'Indicador de interesse e intenção. Mais cliques = mais tráfego no seu site ou landing page. Avalie sempre em conjunto com o CTR para entender a qualidade do público.',
    actions: {
      do: [
        'Acompanhe a proporção Cliques → Leads. Se muita gente clica mas poucos viram leads, conserte a landing page.',
        'Compare os cliques entre criativos para descobrir qual chama mais atenção.',
      ],
      dont: [
        'Não avalie cliques sem o CTR — 100 cliques em 1 milhão de impressões é ruim.',
        'Não ignore uma landing page lenta: ela derruba a conversão de quem já clicou.',
      ],
    },
    benchmark: 'Monitore a proporção Cliques → Leads. Se muita gente clica mas poucos viram leads, o problema pode estar na landing page.',
  },
  {
    emoji: '📊',
    term: 'CTR',
    subtitle: 'Click-Through Rate — Taxa de Cliques',
    what: 'Percentual de pessoas que clicaram no anúncio em relação ao total que o viram. Fórmula: (Cliques ÷ Impressões) × 100.',
    how: 'É o principal indicador de relevância do criativo. CTR baixo = anúncio não está chamando atenção. CTR alto = mensagem está ressoando com o público.',
    actions: {
      do: [
        'Se o CTR estiver abaixo de 1%, troque o criativo (imagem, vídeo ou título) — não o público.',
        'Teste 2-3 variações de criativo ao mesmo tempo e mantenha a de maior CTR.',
      ],
      dont: [
        'Não deixe rodando um anúncio com CTR caindo período após período — é sinal de fadiga.',
        'Não mexa no público quando o problema é claramente o criativo (CTR baixo desde o início).',
      ],
    },
    benchmark: 'Referência para Meta Ads imobiliário: abaixo de 1% = ruim / 1–2% = regular / 2–3% = bom / acima de 3% = excelente.',
    tip: 'Se o CTR caiu entre períodos sem mudar o anúncio, o público pode ter "cansado" do criativo (fadiga).',
  },
  {
    emoji: '💰',
    term: 'CPC',
    subtitle: 'Cost Per Click — Custo por Clique',
    what: 'Quanto você paga, em média, por cada clique no seu anúncio. Fórmula: Gasto ÷ Cliques.',
    how: 'Quanto menor, melhor (você paga menos por cada pessoa que visita sua página). CPC alto pode indicar audiência muito concorrida ou criativo pouco relevante.',
    actions: {
      do: [
        'CPC subindo: revise o criativo ou abra o público para reduzir a concorrência no leilão.',
        'Compare o CPC com o ticket do seu produto — CPC alto pode valer a pena se o lead converte muito.',
      ],
      dont: [
        'Não ignore a seta ↑ no CPC — diferente do gasto, aqui subir é ruim.',
        'Não estreite demais o público achando que melhora: público pequeno costuma encarecer o clique.',
      ],
    },
    benchmark: 'Em tráfego pago no Brasil: R$ 0,50–R$ 1,50 = ótimo / R$ 1,50–R$ 3,00 = normal / acima de R$ 3,00 = revisar criativo ou público. Valores variam por segmento e ticket médio.',
    tip: 'A seta invertida — ↑ no CPC é negativo (está custando mais caro). ↓ é positivo.',
  },
  {
    emoji: '📡',
    term: 'CPM',
    subtitle: 'Cost Per Mille — Custo por 1.000 Impressões',
    what: 'Quanto você paga para exibir seu anúncio para 1.000 pessoas. Fórmula: (Gasto ÷ Impressões) × 1.000.',
    how: 'Indicador do "preço do mercado" de atenção. CPM alto significa que o público que você segmentou é disputado por muitos anunciantes (mais caro para alcançar).',
    actions: {
      do: [
        'CPM alto: considere segmentar públicos menos disputados ou rodar em horários alternativos.',
        'Use o CPM para entender se o seu nicho é caro — públicos premium custam mais por natureza.',
      ],
      dont: [
        'Não force CPM baixo sacrificando a qualidade do público — leads ruins custam mais no fim.',
        'Não confunda CPM alto com campanha ruim; o que importa de verdade é o CPL final.',
      ],
    },
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
    actions: {
      do: [
        'Confirme na Saúde do Rastreamento se o pixel está disparando antes de confiar em qualquer métrica.',
        'Garanta o pixel instalado em todas as páginas: anúncio, formulário e página de obrigado.',
      ],
      dont: [
        'Não rode campanha de conversão sem pixel — o Meta otimiza às cegas e desperdiça verba.',
        'Não ignore uma Saúde do Rastreamento abaixo de 50: os números do dashboard ficam não confiáveis.',
      ],
    },
    tip: 'Sem o Pixel instalado corretamente, o Meta "voa às cegas" — não sabe se os cliques estão gerando resultados reais, e não consegue otimizar as campanhas de forma inteligente.',
    benchmark: 'Verifique sempre a Saúde do Rastreamento no dashboard — ela indica se o Pixel está funcionando. Score abaixo de 50 = dados não confiáveis.',
  },
  {
    emoji: '⚡',
    term: 'Conversões',
    subtitle: 'Ações rastreadas pelo pixel',
    what: 'Número de ações valiosas realizadas pelos visitantes após clicar no anúncio, rastreadas pelo Pixel do Meta (ex: preenchimento de formulário, visita à página de agradecimento).',
    how: 'Indica quantas pessoas completaram a ação desejada. Diferente de "Leads" (que vêm do CRM), Conversões são eventos do pixel e podem incluir ações pré-lead.',
    actions: {
      do: [
        'Compare Conversões (pixel) com Leads (CRM). Se divergem muito, há erro de rastreamento a corrigir.',
        'Deixe o Meta otimizar por conversões — ele busca mais pessoas parecidas com quem converte.',
      ],
      dont: [
        'Não trate conversões e leads como a mesma coisa — conversão é evento do pixel, lead é contato real.',
        'Não confie nas conversões se a Saúde do Rastreamento estiver crítica.',
      ],
    },
    tip: 'Se Conversões é muito diferente de Leads, pode haver discrepância entre o evento do pixel e a captura real de contatos.',
  },
  {
    emoji: '👤',
    term: 'Leads',
    subtitle: 'Contatos captados no CRM',
    what: 'Número de pessoas que demonstraram interesse real e deixaram seus dados de contato — vindos diretamente do CRM da plataforma.',
    how: 'É a métrica mais importante para negócios de captação. Todo o esforço de campanha existe para maximizar leads qualificados a um custo sustentável (CPL).',
    actions: {
      do: [
        'Olhe sempre Leads junto com o CPL — volume só importa a um custo sustentável.',
        'Priorize campanhas que trazem leads que de fato viram cliente, não só volume.',
      ],
      dont: [
        'Não persiga volume ignorando o custo: 50 leads baratos podem valer mais que 200 caros.',
        'Não some leads de segmentos diferentes como se fossem comparáveis.',
      ],
    },
    benchmark: 'Avalie sempre o CPL junto: 100 leads por R$ 5,00 cada é melhor que 50 leads por R$ 15,00 cada.',
  },
  {
    emoji: '🏷️',
    term: 'CPL',
    subtitle: 'Cost Per Lead — Custo por Lead',
    what: 'Quanto você paga, em média, para captar cada lead. Fórmula: Gasto Total ÷ Número de Leads.',
    how: 'É a métrica-rainha para campanhas de geração de leads. Quanto menor o CPL, mais eficiente é sua campanha. Monitore a tendência: CPL subindo = eficiência caindo.',
    actions: {
      do: [
        'Defina seu CPL-alvo a partir do ticket do produto e pause o que passar muito disso.',
        'Escale (aumente verba) campanhas com CPL baixo e estável por vários dias seguidos.',
      ],
      dont: [
        'Não compare CPL entre segmentos diferentes — R$ 80 pode ser ótimo num, péssimo noutro.',
        'Não deixe uma campanha com CPL em alta consistente sem intervir.',
      ],
    },
    benchmark: 'Referências gerais em tráfego pago no Brasil: abaixo de R$ 20 = excelente / R$ 20–50 = bom / R$ 50–100 = aceitável / acima de R$ 100 = investigar. Os valores ideais variam muito por segmento e ticket médio do produto ou serviço.',
    tip: 'Não existe CPL ideal universal — depende do ticket médio do seu produto ou serviço. R$ 80 por lead pode ser caro em um segmento e excelente em outro de maior valor.',
  },
  {
    emoji: '📅',
    term: 'Budget/dia',
    subtitle: 'Orçamento diário total das campanhas',
    what: 'Soma do orçamento diário configurado em todas as campanhas ativas no período.',
    how: 'Quanto o Meta está autorizado a gastar por dia. Serve para controlar o ritmo de investimento. Não confundir com Gasto real — o Meta pode gastar um pouco acima ou abaixo do limite diário.',
    actions: {
      do: [
        'Ajuste o budget de forma gradual (20-30% por vez) para não resetar o aprendizado do Meta.',
        'Concentre o budget nas campanhas vencedoras em vez de espalhar igual entre todas.',
      ],
      dont: [
        'Não mude o orçamento várias vezes ao dia — isso atrapalha o algoritmo do Meta.',
        'Não confunda budget (limite autorizado) com gasto (valor realmente consumido).',
      ],
    },
  },
  {
    emoji: '🎣',
    term: 'Hook Rate',
    subtitle: 'Taxa de captura — só vídeos',
    what: 'Percentual de pessoas que assistiram ao menos 3 segundos do vídeo em relação ao total que teve o anúncio exibido. Fórmula: (Views 3s ÷ Impressões) × 100.',
    how: '"Hook" significa "gancho" — os primeiros 3 segundos são o gancho do vídeo. Um Hook Rate alto significa que o início do vídeo está prendendo a atenção. Só aparece quando há dados de visualização de vídeo.',
    actions: {
      do: [
        'Se o Hook Rate estiver abaixo de 8%, regrave os primeiros 3 segundos — mostre o resultado logo de cara.',
        'Comece o vídeo pelo produto ou pela transformação, antes de qualquer logo ou texto.',
      ],
      dont: [
        'Não comece o vídeo com abertura institucional ou logo: o público rola a tela antes do gancho.',
        'Não pause o vídeo inteiro por causa do hook — só troque a abertura.',
      ],
    },
    benchmark: 'Abaixo de 8% = gancho fraco, revisar os primeiros 3s / 8–12% = regular / acima de 12% = bom / acima de 20% = excelente.',
    tip: 'O segredo do Hook Rate está nos primeiros 2 segundos: mostre o resultado (produto, transformação, lifestyle) antes de qualquer texto ou logo.',
  },
];

// ─── Content: Painéis Avançados ────────────────────────────────────────────────

const PAINEIS: HelpItem[] = [
  {
    emoji: '🔻',
    term: 'Funil por Estágio',
    subtitle: 'A jornada do desconhecido ao lead',
    what: 'Representação visual da jornada do público desde o primeiro contato com o anúncio até a conversão em lead. Cada estágio mostra quantas pessoas passaram para a próxima etapa.',
    how: 'O funil é uma sequência em que cada etapa é menor que a anterior. A "afunilagem" é normal e esperada — o que importa é a proporção de queda entre cada etapa.',
    glossary: [
      { label: '1️⃣ Impressões', desc: 'Todo mundo que viu o anúncio — o topo do funil, com o maior volume.' },
      { label: '2️⃣ Cliques', desc: 'Quem achou relevante o suficiente para clicar no anúncio.' },
      { label: '3️⃣ Conversões', desc: 'Quem chegou à landing page e realizou a ação rastreada pelo pixel.' },
      { label: '4️⃣ Leads', desc: 'Quem realmente deixou os dados de contato — o fundo do funil.' },
    ],
    actions: {
      do: [
        'Identifique o estágio com a maior queda e ataque a causa dele primeiro.',
        'Queda Impressões→Cliques: troque o criativo. Queda Cliques→Leads: conserte a landing page.',
      ],
      dont: [
        'Não tente consertar tudo de uma vez — corrija o maior gargalo primeiro.',
        'Não estranhe o afunilamento: cada etapa ser menor que a anterior é normal.',
      ],
    },
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
    actions: {
      do: [
        'Use a projeção apenas como tendência, e com 14+ dias de histórico para ser confiável.',
        'Se a projeção de CPL sobe, intervenha antes (criativo ou público) — não espere o custo subir.',
      ],
      dont: [
        'Não trate a linha tracejada como certeza — é estimativa, não promessa.',
        'Não tome decisão grande com poucos dias de dados (a margem de erro é alta).',
      ],
    },
    tip: 'Projeções são mais confiáveis com 14+ dias de histórico. Com poucos dias, a margem de erro é grande. Trate como indicativo, não como certeza.',
    benchmark: 'Se a projeção de CPL está subindo, é sinal de alerta: a campanha tende a ficar mais cara sem intervenção.',
  },
  {
    emoji: '🩺',
    term: 'Saúde do Rastreamento',
    subtitle: 'Score 0–100 da saúde do rastreamento',
    what: 'Pontuação automática que avalia a qualidade do rastreamento de dados da campanha — se o pixel está disparando corretamente, se os eventos estão chegando, se há inconsistências.',
    how: 'O score vai de 0 a 100 e resume vários indicadores de saúde do rastreamento numa única nota. Ele responde a pergunta: "posso confiar nos números do meu dashboard?"',
    glossary: [
      { label: '🟢 80–100', desc: 'Rastreamento saudável — os dados são confiáveis para tomar decisão.' },
      { label: '🟡 50–79', desc: 'Atenção — possíveis falhas pontuais; investigue antes de decidir grande.' },
      { label: '🔴 0–49', desc: 'Crítico — dados podem estar incompletos ou incorretos; corrija primeiro.' },
    ],
    actions: {
      do: [
        'Corrija o rastreamento ANTES de otimizar campanhas — sem dado confiável, otimizar é chute.',
        'Investigue eventos duplicados se as conversões parecerem altas demais.',
      ],
      dont: [
        'Não confie nos KPIs do dashboard com o score abaixo de 50.',
        'Não ignore alertas de token ou pixel expirando — eles derrubam a captura silenciosamente.',
      ],
    },
    tip: 'Uma Saúde do Rastreamento baixa significa que as métricas do dashboard podem não refletir a realidade. Antes de otimizar campanhas, corrija o rastreamento.',
  },
];

// ─── Content: Inteligência da IA ───────────────────────────────────────────────

const INTELIGENCIA: HelpItem[] = [
  {
    emoji: '💡',
    term: 'Insights de IA',
    subtitle: 'Sinais automáticos de ação imediata',
    what: 'Alertas e recomendações gerados automaticamente analisando CTR, CPC, frequência, CPL e diversidade criativa de cada campanha — sem depender de IA externa, em tempo real.',
    how: 'Cada insight chega com um tipo (que indica a urgência e a ação sugerida) e um número de "Confiança: XX%". Quanto maior a confiança, mais forte e embasado é o sinal.',
    glossary: [
      { label: '🔴 PAUSE (Pausar)', desc: 'Performance crítica: CPL muito alto, CTR despencando ou frequência excessiva. Pause para revisão.' },
      { label: '🟢 SCALE (Escalar)', desc: 'Excelente performance: CPL baixo e CTR alto e consistente. Aumente o orçamento diário.' },
      { label: '🟡 OPTIMIZE (Otimizar)', desc: 'Performance regular com pontos a ajustar (público, criativo ou lance).' },
      { label: '🟠 ALERT (Alerta)', desc: 'Anomalia: mudança brusca numa métrica que merece atenção imediata.' },
      { label: '🟣 CREATIVE_FATIGUE', desc: 'Saturação criativa: um mesmo tipo de gancho domina o portfólio (risco de fadiga). Veja "Saúde Criativa".' },
    ],
    actions: {
      do: [
        'Aja primeiro nos insights com confiança acima de 70%.',
        'Trate PAUSE como urgente e SCALE como oportunidade de aumentar verba.',
      ],
      dont: [
        'Não aja em insight com confiança abaixo de 50% sem observar mais um dia.',
        'Não ignore um PAUSE recorrente — a campanha está queimando verba.',
      ],
    },
    tip: 'Insights com confiança acima de 70% geralmente merecem ação imediata. Abaixo de 50%, monitore por mais um dia antes de agir.',
  },
  {
    emoji: '🪝',
    term: 'Hook (Gancho)',
    subtitle: 'O que "fisga" a atenção nos primeiros segundos',
    what: 'Hook (gancho) é o primeiro impacto do anúncio — a frase de abertura, a primeira imagem ou os 3 primeiros segundos do vídeo que decidem se a pessoa para de rolar a tela ou ignora. É a isca que captura a atenção.',
    how: 'Não confunda Hook com Ângulo. O Ângulo é POR QUE a pessoa deveria se importar (ex: investimento, família). O Hook é COMO você prende a atenção dela no primeiro instante. O mesmo ângulo pode ser apresentado com ganchos bem diferentes.',
    glossary: [
      { label: '⏰ Urgência', desc: '"Últimas unidades", "só até sexta" — cria pressa e medo de perder a oportunidade.' },
      { label: '❓ Curiosidade', desc: 'Uma pergunta ou frase intrigante que só se resolve continuando — "Você sabia que...?".' },
      { label: '👥 Prova Social', desc: 'Depoimento, número de clientes, avaliação — "mais de 500 famílias já compraram".' },
      { label: '🎁 Benefício', desc: 'Mostra logo o ganho concreto — "more pagando menos que o aluguel".' },
      { label: '📖 História', desc: 'Abre com uma narrativa ou situação real com que a pessoa se identifica.' },
      { label: '⚠️ Problema', desc: 'Começa nomeando uma dor do público — "cansado de pagar aluguel?".' },
      { label: '💲 Preço', desc: 'Lidera pela condição financeira — desconto, parcela, entrada facilitada.' },
    ],
    actions: {
      do: [
        'Varie os tipos de gancho entre seus anúncios para alcançar perfis diferentes de público.',
        'Teste um gancho de Curiosidade (pergunta) contra um de Prova Social (depoimento) e meça qual converte.',
      ],
      dont: [
        'Não use o mesmo tipo de gancho em todos os anúncios — o público se acostuma e passa a ignorar.',
        'Não confunda gancho com oferta: mudar o gancho não exige mudar o produto ou o preço.',
      ],
    },
    tip: 'O gancho mais poderoso costuma ser o que toca uma emoção (curiosidade, medo de perder, identificação) nos 2 primeiros segundos — antes de qualquer informação racional.',
  },
  {
    emoji: '🧬',
    term: 'Saúde Criativa & Saturação de Hook',
    subtitle: 'O quanto seus anúncios variam o gancho',
    what: 'Mede se os seus criativos ativos usam ganchos variados ou repetem sempre o mesmo. Quando muitos anúncios usam o mesmo tipo de gancho, ocorre "saturação": o público vê sempre a mesma abordagem, cansa, e o custo sobe.',
    how: `Dois números resumem a saúde:

📊 Índice de Diversidade (0–100) — mede o equilíbrio geral entre os tipos de gancho. Quanto mais alto, mais variado e saudável é o portfólio.

🎯 Concentração do gancho dominante (%) — qual fatia dos criativos usa o gancho mais comum. É este número que dispara o alerta de saturação.

Pode acontecer de a diversidade ser alta (vários tipos presentes) e, ainda assim, um único gancho concentrar metade dos anúncios — por isso os dois números são exibidos juntos.`,
    glossary: [
      { label: '🟢 Até 49%', desc: 'Concentração saudável — nenhum gancho domina demais. Mantenha variando.' },
      { label: '🟡 50% a 69%', desc: 'Atenção — um gancho começa a dominar. Comece a diversificar com novos criativos.' },
      { label: '🔴 70% ou mais', desc: 'Crítico — alto risco de fadiga. Crie urgentemente anúncios com outros ganchos.' },
    ],
    actions: {
      do: [
        'Quando um gancho passar de 50% dos criativos, crie novos anúncios com os ganchos sugeridos pela IA.',
        'Mire numa distribuição equilibrada — nenhum tipo de gancho dominando o portfólio.',
      ],
      dont: [
        'Não continue lançando anúncios com o gancho que já domina — isso acelera a fadiga e encarece.',
        'Não pause os anúncios atuais às cegas: primeiro adicione variedade, depois compare a performance.',
      ],
    },
    benchmark: 'Concentração até 49% = saudável / 50–69% = atenção, comece a diversificar / 70%+ = crítico. Índice de diversidade acima de 70 indica bom equilíbrio entre tipos de gancho.',
    tip: 'A saturação não significa que o gancho é ruim — significa que você está dependendo demais de um só. A diversificação é um seguro contra o público cansar.',
  },
  {
    emoji: '🎯',
    term: 'Ângulo de Comunicação',
    subtitle: 'Por que a pessoa deveria se importar',
    what: 'O ângulo é a lente pela qual seu produto é apresentado — não o que você diz, mas por que a pessoa deveria se importar. É a motivação emocional ou racional que ancora o criativo. (Enquanto o Hook prende a atenção, o Ângulo justifica o interesse.)',
    how: 'Ao criar uma campanha você pode declarar o ângulo; a IA também classifica automaticamente as campanhas sem ângulo. O dashboard então mostra qual ângulo tem o menor CPL (vencedor) e o de maior CPL (pior). A análise completa fica em Portfólio → Cross-Insights.',
    glossary: [
      { label: '💼 Investimento', desc: 'Valorização, rentabilidade, retorno financeiro.' },
      { label: '🌴 Estilo de Vida', desc: 'Qualidade de vida, lazer, bem-estar no cotidiano.' },
      { label: '👨‍👩‍👧 Família', desc: 'Segurança, espaço, proximidade de escolas e serviços.' },
      { label: '💲 Preço', desc: 'Condições especiais, parcelas acessíveis, custo-benefício.' },
      { label: '⏰ Urgência', desc: 'Últimas unidades, oportunidade por tempo limitado.' },
      { label: '👥 Social', desc: 'Prestígio, status, pertencimento a uma comunidade exclusiva.' },
      { label: '💎 Luxo', desc: 'Alto padrão, acabamento diferenciado, exclusividade.' },
    ],
    actions: {
      do: [
        'Rode 2-3 ângulos diferentes e deixe o dashboard mostrar qual tem o menor CPL.',
        'Reforce a verba no ângulo vencedor e aposente o de pior CPL.',
      ],
      dont: [
        'Não concentre todos os anúncios num único ângulo — isso limita o alcance.',
        'Não deixe campanhas "não classificadas": use a classificação em lote da IA e revise antes de confirmar.',
      ],
    },
    benchmark: 'Referência prática: tickets menores respondem melhor a Preço e Urgência. Tickets altos e mercados premium respondem melhor a Estilo de Vida, Investimento e Luxo. Família e Social funcionam bem em qualquer segmento com apelo emocional forte.',
    tip: 'Diferença-chave: Ângulo é a razão (por que comprar); Hook é a isca (o que faz parar de rolar). Um bom anúncio combina um ângulo forte com um gancho afiado.',
  },
  {
    emoji: '🤖',
    term: 'Briefing Estratégico AI',
    subtitle: 'Documento de inteligência autônomo',
    what: 'Relatório estratégico gerado por Inteligência Artificial com base nos dados reais das campanhas. É um documento independente — não fica preso ao filtro de datas da página, é um retrato de um momento.',
    how: `Gerado duas vezes ao dia (08h e 18h) ou sob demanda clicando "Gerar · Xd" (onde Xd é o período a analisar). Ele produz: resumo de performance, alertas urgentes (CPL crítico), análise por campanha, recomendações de budget e um plano de ação concreto.

Por que é autônomo do filtro de datas? Porque o filtro serve para exploração ao vivo dos gráficos, enquanto o briefing é um documento gerado num momento específico, para um período específico, com contexto comparativo (período atual vs. anterior). Mudar o filtro não recalcula o documento. Cada briefing exibe seu próprio badge de período no canto do card.`,
    actions: {
      do: [
        'Ajuste o filtro de período e clique "Gerar · Xd" para um briefing do recorte que você quer analisar.',
        'Use o plano de ação do briefing como o checklist da sua semana.',
      ],
      dont: [
        'Não espere o briefing mudar ao mexer no filtro de datas — ele é um snapshot fixo do momento da geração.',
        'Não descarte os alertas urgentes do briefing — são justamente os CPLs críticos.',
      ],
    },
    tip: 'Para gerar um briefing do período que você está analisando, ajuste o filtro de datas no topo da página e depois clique em "Gerar · Xd" — o botão já mostra qual período será usado.',
    benchmark: '"Documento autônomo — período registrado na geração" significa que cada briefing carrega sua própria referência temporal, independente do que está filtrado na página.',
  },
  {
    emoji: '📡',
    term: 'Radar de Demanda',
    subtitle: 'O que o mercado está procurando agora',
    what: 'Cruza o que VOCÊ está anunciando (seus ângulos) com o que o MERCADO está buscando no Google (tendências reais de pesquisa). Revela oportunidades onde há demanda alta e pouca concorrência sua.',
    how: 'Cada ângulo é posicionado num quadrante conforme a demanda externa (Google Trends) e o seu investimento atual naquele ângulo. O objetivo é encontrar "oceanos azuis" — temas quentes que você ainda explora pouco.',
    glossary: [
      { label: '🌊 Oceano Azul', desc: 'Alta demanda do mercado, baixo investimento seu. A maior oportunidade — invista aqui.' },
      { label: '🔥 Saturado', desc: 'Alta demanda e alto investimento seu. Mantenha, mas vigie a concorrência.' },
      { label: '👀 Vigiar', desc: 'Demanda subindo. Ainda não é hora de investir pesado, mas prepare criativos.' },
      { label: '💀 Ponto Morto', desc: 'Baixa demanda do mercado. Não vale priorizar investimento neste ângulo agora.' },
    ],
    actions: {
      do: [
        'Priorize criar campanhas nos ângulos marcados como "Oceano Azul".',
        'Acompanhe os ângulos em "Vigiar" e prepare criativos antes da demanda explodir.',
      ],
      dont: [
        'Não despeje verba em ângulos de "Ponto Morto" só porque sempre foram usados.',
        'Não confunda o radar com garantia de venda — ele mostra interesse de busca, não conversão.',
      ],
    },
    tip: 'O radar usa tendências reais de busca do Google. Um ângulo "Oceano Azul" é onde o público já procura, mas seus concorrentes (e você) ainda anunciam pouco.',
  },
];

// ─── Anchors & deep-link bus ────────────────────────────────────────────────────

const HELP_EVENT = 'dashboard-help:open';

/** Converte o título do item numa âncora estável (sem acento, kebab-case). */
function slug(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const TAB_ITEMS: Record<TabId, HelpItem[]> = {
  metricas: METRICAS,
  paineis: PAINEIS,
  inteligencia: INTELIGENCIA,
};

/** Descobre em qual aba está a âncora informada. */
function tabForAnchor(anchor: string): TabId | null {
  for (const [t, items] of Object.entries(TAB_ITEMS) as [TabId, HelpItem[]][]) {
    if (items.some(it => slug(it.term) === anchor)) return t;
  }
  return null;
}

/**
 * Dispara a abertura do Guia já posicionado num item específico.
 * Use via o componente <HelpHint term="..." /> ou diretamente openHelp('CPL').
 */
export function openHelp(term: string) {
  window.dispatchEvent(new CustomEvent(HELP_EVENT, { detail: { anchor: slug(term) } }));
}

/** Ícone "?" contextual: ao clicar, abre o Guia rolado no item `term`. */
export function HelpHint({ term, isDark, className }: { term: string; isDark?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); openHelp(term); }}
      title={`O que significa? — abrir guia em "${term}"`}
      className={cn(
        'inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-black leading-none transition-colors align-middle',
        isDark
          ? 'bg-[rgba(99,102,241,0.18)] text-indigo-300 hover:bg-indigo-500/30'
          : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200',
        className
      )}
    >
      ?
    </button>
  );
}

// ─── Modal Component ──────────────────────────────────────────────────────────

type TabId = 'metricas' | 'paineis' | 'inteligencia';

interface Props {
  isDark: boolean;
}

export function DashboardHelpButton({ isDark }: Props) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    function onOpen(e: Event) {
      const detail = (e as CustomEvent).detail as { anchor?: string } | undefined;
      setAnchor(detail?.anchor ?? null);
      setOpen(true);
    }
    document.addEventListener('keydown', onKey);
    window.addEventListener(HELP_EVENT, onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(HELP_EVENT, onOpen);
    };
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
          <DashboardHelpModal
            isDark={isDark}
            initialAnchor={anchor}
            onClose={() => { setOpen(false); setAnchor(null); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function DashboardHelpModal({ isDark, initialAnchor, onClose }: {
  isDark: boolean;
  initialAnchor?: string | null;
  onClose: () => void;
}) {
  const initialTab = (initialAnchor && tabForAnchor(initialAnchor)) || 'metricas';
  const [tab, setTab] = useState<TabId>(initialTab);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  // Deep-link: ao abrir via "?", rola até o item e o destaca brevemente.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!initialAnchor) return;
    const t = setTimeout(() => {
      const el = bodyRef.current?.querySelector<HTMLElement>(`#help-${initialAnchor}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const ring = isDark ? ['ring-2', 'ring-indigo-400/60'] : ['ring-2', 'ring-indigo-400'];
        el.classList.add(...ring);
        setTimeout(() => el.classList.remove(...ring), 1800);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [initialAnchor, tab]);

  const overlay = isDark ? 'bg-black/70' : 'bg-slate-900/40';
  const panel = isDark
    ? 'bg-[#0a0f1c] border border-[rgba(255,255,255,0.08)] shadow-[0_24px_80px_rgba(0,0,0,0.8)]'
    : 'bg-white border border-slate-200 shadow-[0_24px_80px_rgba(0,0,0,0.18)]';
  const tx      = isDark ? 'text-slate-300' : 'text-slate-900';
  const txMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const txFaint = isDark ? 'text-slate-500' : 'text-slate-400';
  const divider = isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-slate-100';

  const tabActive = isDark
    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
    : 'bg-indigo-600 text-white shadow-sm';
  const tabIdle = isDark
    ? 'text-slate-500 hover:text-slate-300 hover:bg-[rgba(255,255,255,0.05)]'
    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100';

  const items = tab === 'metricas' ? METRICAS : tab === 'paineis' ? PAINEIS : INTELIGENCIA;

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
                Entenda cada métrica, sigla e painel — e o que fazer com cada um.
              </p>
            </div>
            <button
              onClick={onClose}
              className={cn(
                'shrink-0 p-2 rounded-xl transition-colors',
                isDark
                  ? 'text-slate-500 hover:text-slate-300 hover:bg-[rgba(255,255,255,0.07)]'
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
              { id: 'metricas',     label: '📊 Métricas & KPIs',   count: METRICAS.length },
              { id: 'paineis',      label: '🧩 Painéis',           count: PAINEIS.length },
              { id: 'inteligencia', label: '🧠 Inteligência da IA', count: INTELIGENCIA.length },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-black transition-all duration-150',
                  tab === t.id ? tabActive : tabIdle
                )}
              >
                <span className="truncate">{t.label}</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-md font-black shrink-0',
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
        <div ref={bodyRef} className="overflow-y-auto flex-1 px-7 py-6 space-y-4">
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
  const tx      = isDark ? 'text-slate-300' : 'text-slate-900';
  const txMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const txFaint = isDark ? 'text-slate-500' : 'text-slate-400';
  const tipBg   = isDark ? 'bg-amber-500/08 border-amber-500/15 text-amber-400' : 'bg-amber-50 border-amber-100 text-amber-700';
  const benchBg = isDark ? 'bg-emerald-500/08 border-emerald-500/15 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-700';

  // Glossário
  const glossRow = isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-slate-200/70';
  const glossLabel = isDark ? 'text-slate-300' : 'text-slate-800';

  // Faça / Evite
  const doBg   = isDark ? 'bg-emerald-500/06 border-emerald-500/15' : 'bg-emerald-50/70 border-emerald-100';
  const doTx   = isDark ? 'text-emerald-300' : 'text-emerald-800';
  const doHead = isDark ? 'text-emerald-400' : 'text-emerald-600';
  const dontBg = isDark ? 'bg-red-500/06 border-red-500/15' : 'bg-red-50/70 border-red-100';
  const dontTx = isDark ? 'text-red-300' : 'text-red-800';
  const dontHead = isDark ? 'text-red-400' : 'text-red-600';

  const hasMore = !!(item.tip || item.benchmark);

  return (
    <div
      id={`help-${slug(item.term)}`}
      className={cn('rounded-2xl border p-4 transition-all duration-300 scroll-mt-2', card)}
    >
      {/* ── Top row ── */}
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none shrink-0 mt-0.5">{item.emoji}</span>
        <div className="min-w-0 flex-1">
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

      {/* ── Como interpretar (sempre visível) ── */}
      <div className={cn('mt-3 pl-10 text-xs leading-relaxed', txMuted)}>
        <span className={`font-black text-[10px] uppercase tracking-wide ${txFaint}`}>Como interpretar: </span>
        <span className="whitespace-pre-line">{item.how}</span>
      </div>

      {/* ── Glossário (sempre visível, quando houver) ── */}
      {item.glossary && item.glossary.length > 0 && (
        <div className="mt-3 pl-10">
          <div className={`rounded-xl border ${glossRow} overflow-hidden`}>
            {item.glossary.map((g, i) => (
              <div
                key={i}
                className={cn(
                  'flex gap-2 px-3 py-2 text-[11px] leading-snug',
                  i > 0 && `border-t ${glossRow}`
                )}
              >
                <span className={`font-black shrink-0 ${glossLabel}`}>{g.label}</span>
                <span className={txMuted}>{g.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Faça / Evite (sempre visível, quando houver) ── */}
      {item.actions && (
        <div className="mt-3 pl-10 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className={cn('rounded-xl border px-3 py-2.5', doBg)}>
            <p className={`text-[10px] font-black uppercase tracking-wide mb-1.5 ${doHead}`}>✅ Faça</p>
            <ul className="space-y-1.5">
              {item.actions.do.map((a, i) => (
                <li key={i} className={`text-[11px] leading-snug flex gap-1.5 ${doTx}`}>
                  <span className="shrink-0">•</span><span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={cn('rounded-xl border px-3 py-2.5', dontBg)}>
            <p className={`text-[10px] font-black uppercase tracking-wide mb-1.5 ${dontHead}`}>🚫 Evite</p>
            <ul className="space-y-1.5">
              {item.actions.dont.map((a, i) => (
                <li key={i} className={`text-[11px] leading-snug flex gap-1.5 ${dontTx}`}>
                  <span className="shrink-0">•</span><span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Expandable: benchmark + dica ── */}
      {hasMore && (
        <div className="pl-10 mt-3">
          <button
            onClick={() => setExpanded(p => !p)}
            className={cn(
              'text-[10px] font-black uppercase tracking-wide transition-colors',
              isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-500 hover:text-indigo-600'
            )}
          >
            {expanded ? '▲ Menos detalhes' : '▼ Referência e dica avançada'}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mt-2 space-y-2"
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
      )}
    </div>
  );
}
