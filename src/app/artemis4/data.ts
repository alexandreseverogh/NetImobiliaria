/**
 * ARTEMIS4 — conteúdo da landing (copy estática em código, não em banco:
 * mesma disciplina já adotada em `moduleContent.ts`).
 *
 * REGRA DE VOZ (herdada de moduleContent.ts, mantida aqui):
 * o público é dono de negócio, não gestor de marketing. Proibido: "lead",
 * "funil", ROAS, CTR, CPL, SLA, "conversão". Usar: "interessado", "cliente em
 * potencial", "ciclo de venda", "custo por interessado", "retorno real".
 *
 * REGRA DE PROVA: nenhum número entra aqui sem fonte primária verificável, e
 * nenhuma funcionalidade entra sem existir DE FATO na plataforma hoje (não
 * roadmap). Cada item de `PRODUCT_TOUR` foi conferido contra o que está
 * documentado como implementado e testado em docs/CHECKPOINT.md.
 */

/* ==========================================================================
   FONTES — citadas na página e consolidadas no rodapé
   ========================================================================== */

export interface Source {
  id: string
  label: string
  detail: string
  url: string
}

export const SOURCES: Record<string, Source> = {
  hbr: {
    id: 'hbr',
    label: 'Harvard Business Review (2011)',
    detail:
      'Oldroyd, McElheran & Elkington, "The Short Life of Online Sales Leads" — auditoria de 2.241 empresas.',
    url: 'https://hbr.org/2011/03/the-short-life-of-online-sales-leads',
  },
  mit: {
    id: 'mit',
    label: 'MIT Sloan / InsideSales (Lead Response Management Study)',
    detail:
      'Dr. James B. Oldroyd — 3 anos de dados, 6 empresas, mais de 15.000 interessados e 100.000 tentativas de contato.',
    url: 'https://hbr.org/2011/03/the-short-life-of-online-sales-leads',
  },
  mobileTime: {
    id: 'mobileTime',
    label: 'Panorama Mobile Time / Opinion Box — "WhatsApp no Brasil" (2026)',
    detail: '1.000 entrevistados, junho–julho de 2026, margem de erro de 3 pontos percentuais.',
    url: 'https://pesquisas.mobiletime.com.br/',
  },
  dataReportal: {
    id: 'dataReportal',
    label: 'DataReportal / We Are Social — "Digital 2026: Brazil"',
    detail: 'Dados referentes a outubro de 2025.',
    url: 'https://datareportal.com/reports/digital-2026-brazil',
  },
  nasaArtemis2: {
    id: 'nasaArtemis2',
    label: 'NASA — Artemis II',
    detail: 'Missão tripulada de sobrevoo lunar: lançamento em 01/04/2026, retorno em 10/04/2026.',
    url: 'https://www.nasa.gov/mission/artemis-ii/',
  },
  esaOrion: {
    id: 'esaOrion',
    label: 'ESA — Orion blog, "Artemis I: splashdown"',
    detail: 'Reentrada da cápsula Orion: temperatura e blecaute de comunicação por plasma.',
    url: 'https://blogs.esa.int/orion/2023/04/12/artemis-i-flight-day-26-splashdown/',
  },
}

/* ==========================================================================
   FAIXA DE AUTORIDADE — o dado que sustenta o argumento, com a fonte à vista
   ========================================================================== */

export interface AuthorityStat {
  figure: string
  claim: string
  sourceId: keyof typeof SOURCES
}

export const AUTHORITY: AuthorityStat[] = [
  {
    figure: '42 h',
    claim:
      'É o tempo médio que uma empresa leva para responder alguém que pediu contato pelo site. Quase um quarto delas nunca responde.',
    sourceId: 'hbr',
  },
  {
    figure: '21×',
    claim:
      'É o quanto despenca a chance de aproveitar esse interessado se a resposta sai em 30 minutos em vez de 5.',
    sourceId: 'mit',
  },
  {
    figure: '98,3%',
    claim:
      'Dos celulares brasileiros têm WhatsApp instalado — e 8 de cada 10 usuários conversam com empresas por lá.',
    sourceId: 'mobileTime',
  },
  {
    figure: '185 mi',
    claim:
      'De brasileiros estão na internet: 86,9% da população. Seu cliente já está online. A dúvida é quem ele vai encontrar.',
    sourceId: 'dataReportal',
  },
]

/* ==========================================================================
   DIAGNÓSTICO — o vazamento, em 3 etapas (sequência real, por isso numerada)
   ========================================================================== */

export interface LeakStep {
  ord: string
  title: string
  body: string
  metric: string
  metricLabel: string
  fill: number
  loss?: boolean
}

export const LEAK: LeakStep[] = [
  {
    ord: 'Etapa 1',
    title: 'O dinheiro sai todo dia',
    body:
      'A verba do anúncio é debitada por clique, por exibição, por dia — com venda ou sem venda. Essa parte funciona perfeitamente, e é a única que nunca falha.',
    metric: '100%',
    metricLabel: 'do investimento é cobrado',
    fill: 100,
  },
  {
    ord: 'Etapa 2',
    title: 'O clique vira conversa',
    body:
      'Alguém clica, manda mensagem, preenche o formulário. Esse é o ativo mais caro do seu negócio: uma pessoa que levantou a mão. E é exatamente aqui que começa o vazamento.',
    metric: '5 min',
    metricLabel: 'é a janela real de resposta',
    fill: 62,
  },
  {
    ord: 'Etapa 3',
    title: 'A conversa morre esperando',
    body:
      'Ninguém viu a mensagem. O atendente achou que outro ia responder. Segunda-feira chegou. E o relatório do anúncio continua mostrando um número bonito, calculado pela própria rede social.',
    metric: '23%',
    metricLabel: 'nunca recebem resposta',
    fill: 23,
    loss: true,
  },
]

/* ==========================================================================
   CICLO FECHADO — os 3 módulos como estágios de um loop, não 3 produtos
   ========================================================================== */

export interface LoopStage {
  slug: string
  stage: string
  name: string
  promise: string
  gains: string[]
  handoff: string
}

export const LOOP: LoopStage[] = [
  {
    slug: 'trafego-pago',
    stage: 'Atrai',
    name: 'Marketing Digital',
    promise: 'Instagram, Facebook, Google e TikTok num painel só — e a verba andando sozinha para o que funciona.',
    gains: [
      'Você vê o investimento e o custo por interessado de cada rede lado a lado, no mesmo número.',
      'Quando um anúncio começa a perder força, a plataforma percebe antes de você e age.',
      'A verba se realoca entre as redes para onde está dando retorno de verdade.',
    ],
    handoff: 'Entrega ao próximo estágio: o interessado, já identificado com o anúncio exato que o trouxe.',
  },
  {
    slug: 'mensageria',
    stage: 'Atende',
    name: 'Gestão de Mensagens',
    promise: 'Resposta em segundos, 24 horas por dia — consultando os dados reais do seu negócio, não um texto genérico.',
    gains: [
      'O atendimento automático responde preço, disponibilidade e condição consultando seu cadastro real.',
      'Quando a conversa passa do que ele sabe, entra uma pessoa do time — sem o cliente perceber degrau.',
      'Todas as conversas de todos os canais numa caixa de entrada única, com dono e prazo.',
    ],
    handoff: 'Entrega ao próximo estágio: a conversa quente, com histórico e grau de interesse já medido.',
  },
  {
    slug: 'crm',
    stage: 'Fecha',
    name: 'CRM de Vendas',
    promise: 'O interessado avança de etapa com ajuda da plataforma — e ninguém fica esperando resposta.',
    gains: [
      'Cada contato chega com uma nota de intenção de compra e de encaixe no seu negócio.',
      'A plataforma sabe de quem é a vez de agir e cobra sozinha quando o prazo estoura.',
      'Quem esfriou é reativado automaticamente, com uma mensagem escrita para aquele caso.',
    ],
    handoff: 'Fecha o ciclo: o valor do negócio fechado volta para o anúncio que originou o cliente.',
  },
]

export const LOOP_CLOSE =
  'É esse retorno que muda o jogo. Sem ele, você otimiza anúncio por clique — um número que a rede social calcula a favor dela. Com ele, você otimiza por dinheiro que entrou no seu caixa.'

/* ==========================================================================
   TOUR DO PRODUTO — prova concreta. Cada item existe hoje na plataforma.
   ========================================================================== */

export interface TourItem {
  id: string
  tab: string
  tabHint: string
  module: string
  title: string
  body: string
  note?: string
}

export const PRODUCT_TOUR: TourItem[] = [
  {
    id: 'money',
    tab: 'Onde está o dinheiro',
    tabHint: 'Investimento e retorno por rede, no mesmo número',
    module: 'Marketing Digital',
    title: 'Três redes, um número só',
    body:
      'Instagram e Facebook, Google e TikTok aparecem juntos, com o investimento e o custo por interessado de cada um calculados da mesma forma. Sem trocar de painel, sem exportar planilha, sem comparar métricas que cada rede define do jeito que lhe convém.',
    note:
      'Cada rede sinaliza um "interessado" de maneira diferente. A plataforma normaliza isso antes de somar — por isso os números fecham entre si.',
  },
  {
    id: 'waste',
    tab: 'Verba desperdiçada',
    tabHint: 'O que está gastando sem retorno, separado por motivo',
    module: 'Marketing Digital',
    title: 'O relatório que nenhuma rede social te mostra',
    body:
      'A plataforma separa o que está queimando dinheiro e explica o motivo: gastou e não trouxe ninguém, custo por interessado acima do aceitável, anúncio desgastado de tanto repetir para as mesmas pessoas. E a categoria mais traiçoeira de todas: custo baixo, muitos interessados — e zero venda.',
    note:
      'Essa última só é possível porque o CRM devolve o negócio fechado para a campanha. É o tipo de desperdício que parece sucesso em qualquer outro painel.',
  },
  {
    id: 'approval',
    tab: 'Aprovação no seu WhatsApp',
    tabHint: 'A IA protege sozinha; para gastar mais, pede licença',
    module: 'Marketing Digital',
    title: 'A automação tem limite — e o limite é o seu dinheiro',
    body:
      'Decisão que reduz risco, a plataforma toma sozinha: pausa o anúncio que está queimando verba, reduz orçamento, bloqueia termo de busca que só gera clique inútil. Decisão que aumenta gasto nunca: ela te manda a proposta no WhatsApp com o motivo, o valor e um código de seis dígitos. Sem esse código, nada acontece.',
    note: 'Todas as decisões ficam registradas com horário, motivo e efeito — auditáveis depois.',
  },
  {
    id: 'bot',
    tab: 'Resposta em segundos',
    tabHint: 'Atendimento automático consultando seu cadastro real',
    module: 'Gestão de Mensagens',
    title: 'Não é um robô de mensagem pronta',
    body:
      'O atendimento automático consulta os dados reais do seu negócio antes de responder: o que tem disponível, por qual preço, em qual condição. Se o cliente pergunta algo fora do que existe cadastrado, ele diz que não sabe e chama uma pessoa — em vez de inventar uma resposta e queimar sua credibilidade.',
    note:
      'Você também cadastra sua própria base de conhecimento (políticas, condições, regras) e o atendimento passa a responder com base nela.',
  },
  {
    id: 'pendency',
    tab: 'Ninguém fica esperando',
    tabHint: 'A plataforma sabe de quem é a vez de agir',
    module: 'CRM de Vendas',
    title: 'De quem é a bola nesta conversa?',
    body:
      'A plataforma marca, em cada atendimento, se a vez de agir é sua ou do cliente — e há quanto tempo. Passou do prazo, ela avisa o responsável. Continuou parado, ela avisa acima. Continuou parado, ela reatribui o atendimento para outra pessoa disponível. Sem ninguém precisar lembrar.',
    note:
      'Atendente de folga ou atestado é respeitado: entra no sistema como indisponível e para de receber atendimento novo, sem ser penalizado.',
  },
  {
    id: 'revenue',
    tab: 'Do anúncio ao caixa',
    tabHint: 'Qual anúncio virou venda, com valor real',
    module: 'Marketing Digital + CRM',
    title: 'O único retorno que importa é o que entrou',
    body:
      'Quando um negócio é marcado como fechado no CRM, o valor volta para a campanha que trouxe aquele cliente. O retorno que você lê na tela é dinheiro do seu caixa — não uma estimativa que a plataforma de anúncio produz sobre o próprio desempenho.',
    note:
      'É o que permite descobrir que a campanha "mais barata" era a que nunca fechou negócio nenhum.',
  },
]

/* ==========================================================================
   CAPACIDADES ADICIONAIS — volume sem inflar o tour
   ========================================================================== */

export const CAPABILITIES: { title: string; body: string }[] = [
  {
    title: 'Radar de demanda',
    body: 'Cruza o que as pessoas estão buscando no Google com os temas que você está anunciando, e mostra onde há procura sem concorrência.',
  },
  {
    title: 'Aviso de desgaste antecipado',
    body: 'Estima em quantos dias um anúncio vai saturar, antes de saturar — pelos sinais de entrega, não pelo resultado já perdido.',
  },
  {
    title: 'Público parecido, automático',
    body: 'A partir dos seus clientes que realmente fecharam negócio, monta e mantém atualizado o público semelhante nas redes.',
  },
  {
    title: 'Distribuição de atendimento',
    body: 'Define quem recebe cada interessado: por região, por dono da carteira, por fila ou por quem está de plantão.',
  },
  {
    title: 'Saúde do rastreamento',
    body: 'Uma nota de 0 a 100 que avisa quando o rastreamento quebrou — antes de você perder um mês de dados sem notar.',
  },
  {
    title: 'Auditoria mensal e semanal',
    body: 'Um relatório com nota por dimensão, principais problemas, oportunidades e um plano de ação para a semana.',
  },
  {
    title: 'Reativação de quem esfriou',
    body: 'Quem parou de responder recebe uma mensagem escrita para o caso dele — e você decide se ela sai sozinha ou só com sua autorização.',
  },
  {
    title: 'Sugestão da próxima ação',
    body: 'Em cada atendimento, a plataforma sugere qual é o próximo passo concreto, com base no histórico real daquela conversa.',
  },
]

/* ==========================================================================
   AGENTE AUTÔNOMO — em formato de registro de eventos
   ========================================================================== */

export interface AgentEvent {
  time: string
  text: string
  kind: 'detect' | 'auto' | 'notify' | 'wait'
  tag: string
}

export const AGENT_LOG: AgentEvent[] = [
  {
    time: '03:12',
    text: 'Queda de desempenho detectada no anúncio <b>Lançamento · Vídeo 15s</b>. Custo por interessado subiu 61% em três dias.',
    kind: 'detect',
    tag: 'Detectado',
  },
  {
    time: '03:12',
    text: 'Anúncio pausado automaticamente. Verba preservada: <b>R$ 412 por dia</b>.',
    kind: 'auto',
    tag: 'Feito sozinho',
  },
  {
    time: '03:13',
    text: 'Aviso enviado no seu WhatsApp com o motivo, o histórico e o que foi feito.',
    kind: 'notify',
    tag: 'Você avisado',
  },
  {
    time: '07:30',
    text: 'Anúncio <b>Reforma · Carrossel</b> está entregando abaixo do custo-alvo há sete dias.',
    kind: 'detect',
    tag: 'Detectado',
  },
  {
    time: '07:30',
    text: 'Proposta enviada para sua aprovação: <b>aumentar R$ 180 por dia</b>. Código de confirmação 4 8 2 9 1 7.',
    kind: 'wait',
    tag: 'Aguardando você',
  },
  {
    time: '09:04',
    text: 'Termo de busca <b>"curso grátis"</b> consumiu R$ 96 sem nenhum interessado. Bloqueado na campanha.',
    kind: 'auto',
    tag: 'Feito sozinho',
  },
]

export const AGENT_RULES = {
  auto: {
    title: 'Ela decide sozinha',
    body: 'Só o que reduz risco ou gasto. Protege primeiro, te avisa depois — com o motivo registrado.',
    tags: ['Pausar anúncio', 'Reduzir orçamento', 'Bloquear termo de busca'],
  },
  ask: {
    title: 'Ela precisa de você',
    body: 'Qualquer decisão que aumente o gasto. Chega no seu WhatsApp com valor, motivo e um código de seis dígitos.',
    tags: ['Aumentar investimento', 'Trocar criativo', 'Mudar público', 'Realocar verba entre redes'],
  },
}

/* ==========================================================================
   ORIGEM DA MARCA — o vídeo passa a ter função narrativa
   ========================================================================== */

export const ORIGIN = {
  kicker: 'A origem do nome',
  title: 'Toda operação tem a sua reentrada',
  lede:
    'Artemis é o programa da NASA que está levando o ser humano de volta à Lua. A parte mais perigosa de uma missão dessas não é a decolagem — é a volta.',
  body: [
    'Na reentrada, a cápsula atravessa a atmosfera envolvida em uma bola de plasma a cerca de 2.760 °C, metade da temperatura da superfície do Sol, e perde todo o contato por rádio. Por alguns minutos, ninguém em Terra sabe o que está acontecendo lá dentro. É o instante em que tudo que foi investido na missão se confirma — ou se perde.',
    'Todo negócio tem esse momento. É quando o dinheiro colocado em anúncio precisa virar receita: o interessado aparece, a conversa começa, e a maioria das empresas perde exatamente aí o sinal do que está acontecendo. Paga, não vê, e descobre no fim do mês.',
    'A Artemis4 é a telemetria que não cai. O nome é uma homenagem e uma promessa: atravessar a parte quente com instrumento, não com fé.',
  ],
  facts: [
    {
      figure: '2.760 °C',
      text: 'Temperatura na reentrada da cápsula Orion — metade da superfície do Sol. O plasma corta todas as comunicações.',
      sourceId: 'esaOrion' as keyof typeof SOURCES,
    },
    {
      figure: '4,7 km do alvo',
      text: 'Precisão do pouso da Artemis II no Pacífico em 10 de abril de 2026, depois de dez dias e um sobrevoo da Lua — a primeira missão tripulada ao nosso satélite em mais de cinquenta anos.',
      sourceId: 'nasaArtemis2' as keyof typeof SOURCES,
    },
    {
      figure: 'Artemis IV',
      text: 'É a próxima missão do programa. Escolhemos o número porque é para onde olhamos: o próximo salto, não o último.',
      sourceId: 'nasaArtemis2' as keyof typeof SOURCES,
    },
  ],
  disclaimer:
    'A Artemis4 é uma empresa brasileira, sediada em Recife (PE), sem qualquer vínculo, patrocínio ou endosso da NASA. As imagens de reentrada e os dados de missão citados são de domínio público e servem apenas para explicar a origem do nome.',
}

/* ID do vídeo de reentrada no YouTube (mantido da versão anterior da página) */
export const ORIGIN_VIDEO_ID = 'bxYdG17IeUA'

/* ==========================================================================
   COMPARATIVO
   ========================================================================== */

export const VERSUS: { topic: string; old: string; now: string }[] = [
  {
    topic: 'Saber o que deu retorno',
    old: 'O número que a própria rede social calcula sobre o desempenho dela mesma.',
    now: 'O <b>negócio fechado no seu caixa</b>, ligado ao anúncio exato que trouxe aquele cliente.',
  },
  {
    topic: 'Tempo de resposta',
    old: 'Depende de alguém estar com o celular na mão naquele minuto.',
    now: '<b>Segundos</b>, 24 horas por dia, inclusive domingo e feriado.',
  },
  {
    topic: 'Anúncio que parou de funcionar',
    old: 'Você descobre no fim do mês, quando olha a fatura.',
    now: 'A plataforma percebe pelos sinais de entrega e <b>pausa antes de virar prejuízo</b>.',
  },
  {
    topic: 'Anunciar em várias redes',
    old: 'Três painéis, três logins, três relatórios que não se somam.',
    now: 'Um painel. E a <b>verba se move sozinha</b> para a rede que está performando.',
  },
  {
    topic: 'Interessado que esfriou',
    old: 'Fica na planilha até alguém lembrar dele — normalmente ninguém lembra.',
    now: 'A plataforma <b>lembra, cobra e reativa</b> com uma mensagem escrita para aquele caso.',
  },
  {
    topic: 'Atendimento sem dono',
    old: '"Achei que você ia responder."',
    now: 'A plataforma <b>registra de quem é a vez</b>, cobra, escalona e reatribui.',
  },
]

/* ==========================================================================
   MULTISSEGMENTO — o motor é o mesmo; o vocabulário é de cada negócio
   ========================================================================== */

export interface SegmentDemo {
  key: string
  label: string
  advertises: string
  botReads: string
  counts: string
}

export const SEGMENTS: SegmentDemo[] = [
  {
    key: 'imob',
    label: 'Imobiliário',
    advertises: 'Apartamento de 3 quartos em Boa Viagem, na planta ou pronto para morar.',
    botReads: 'Imóveis disponíveis, valor, condomínio, quartos, vagas, bairro e fotos reais do cadastro.',
    counts: 'Proposta aceita, com o valor da unidade vendida.',
  },
  {
    key: 'auto',
    label: 'Veículos',
    advertises: 'SUV seminovo automático até R$ 90 mil, com entrada facilitada.',
    botReads: 'Estoque real: marca, modelo, ano, quilometragem, preço e se aceita o carro do cliente na troca.',
    counts: 'Venda faturada, com o valor do veículo.',
  },
  {
    key: 'saude',
    label: 'Saúde',
    advertises: 'Avaliação com especialista, com horário disponível nesta semana.',
    botReads: 'Especialidades, profissionais, convênios aceitos e agenda com vaga de verdade.',
    counts: 'Procedimento realizado, com o valor do pacote.',
  },
  {
    key: 'serv',
    label: 'Serviços',
    advertises: 'Orçamento de reforma sem compromisso, com visita técnica na região.',
    botReads: 'Serviços prestados, área de atendimento, faixa de preço e prazo de execução.',
    counts: 'Contrato assinado, com o valor do serviço.',
  },
]

export const SEGMENT_NOTE =
  'Nenhuma linha de código muda entre um segmento e outro. O que muda é a configuração: quais dados o atendimento consulta, quais perguntas qualificam um interessado, e o que conta como venda. Por isso a plataforma serve um negócio que você não encontraria nesta lista.'

/* ==========================================================================
   GARANTIAS — objeção mais comum: "a IA vai gastar meu dinheiro?"
   ========================================================================== */

export const GUARANTEES: { title: string; body: string }[] = [
  {
    title: 'A automação nunca aumenta seu gasto sozinha',
    body: 'Sozinha ela só reduz risco: pausa, corta, bloqueia. Para gastar mais, pede autorização no seu WhatsApp com um código.',
  },
  {
    title: 'Toda decisão fica registrada',
    body: 'Horário, motivo, o que foi feito e qual foi o efeito. Você pode auditar qualquer ação automática semanas depois.',
  },
  {
    title: 'Seus dados não se misturam',
    body: 'Cada empresa opera isolada na plataforma. Se você gerencia contas de clientes, cada cliente também fica isolado do outro.',
  },
  {
    title: 'O atendimento automático não inventa',
    body: 'Ele responde a partir do que está cadastrado. Fora disso, admite que não sabe e chama uma pessoa do seu time.',
  },
]

/* ==========================================================================
   FAQ
   ========================================================================== */

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Preciso entender de marketing digital para usar?',
    a: 'Não. A plataforma foi construída para o dono do negócio, não para o especialista. Você escolhe o objetivo, as fotos e quanto quer investir por dia; o resto é preenchido automaticamente com base no seu segmento. Os avisos importantes chegam no seu WhatsApp em português claro, com o motivo e o que fazer.',
  },
  {
    q: 'A inteligência artificial pode gastar meu dinheiro sem eu saber?',
    a: 'Não. Essa fronteira é o alicerce do sistema, não uma configuração. Decisões que reduzem gasto ou risco a plataforma toma sozinha — pausar um anúncio ruim, cortar orçamento, bloquear um termo de busca inútil. Qualquer decisão que aumente o investimento chega para você aprovar, com valor, motivo e um código de seis dígitos. Sem o código, não acontece.',
  },
  {
    q: 'Serve para o meu segmento?',
    a: 'A plataforma é agnóstica de segmento por construção: o que muda de um negócio para outro é configuração, não programação. Hoje ela opera com imobiliário, veículos, saúde e serviços — e aceita um segmento novo sem precisar de desenvolvimento, porque quais dados o atendimento consulta e o que conta como venda são parametrizados, não escritos em código.',
  },
  {
    q: 'Já tenho uma agência cuidando dos meus anúncios. Faz sentido?',
    a: 'Faz, e normalmente é onde a diferença aparece mais rápido. A plataforma não substitui quem opera: ela dá a visibilidade que hoje não existe. Você passa a ver qual campanha gerou negócio fechado de verdade, onde há verba sendo queimada e qual foi a decisão tomada em cada ponto — com horário e motivo. Muitas agências usam a plataforma justamente para provar o próprio resultado ao cliente.',
  },
  {
    q: 'O atendimento automático vai responder besteira para o meu cliente?',
    a: 'Ele só responde a partir do que está cadastrado no seu negócio: estoque, preço, condição, mais a base de conhecimento que você escreve. Quando a pergunta sai desse terreno, ele não improvisa — diz que não tem a informação e transfere para uma pessoa do seu time, com o histórico da conversa. A regra é explícita no sistema: nunca afirmar o que não foi consultado.',
  },
  {
    q: 'Preciso contratar os três módulos?',
    a: 'Não. Cada módulo é contratado separadamente e funciona de pé próprio. Mas vale saber o que se perde ao separá-los: é a combinação de Marketing Digital com CRM que permite dizer qual anúncio virou venda com valor real, e é a Mensageria que garante que o interessado seja respondido antes de esfriar. Os três juntos fecham o ciclo; separados, cada um resolve o seu pedaço.',
  },
  {
    q: 'Quanto tempo até ver resultado?',
    a: 'A visibilidade é imediata: assim que as contas de anúncio são conectadas, o histórico já aparece consolidado e o relatório de verba desperdiçada já aponta o que está queimando dinheiro hoje. As decisões automáticas precisam de alguns dias de dados para serem confiáveis — a plataforma sabe disso e não age sobre campanha imatura, justamente para não decidir com amostra pequena.',
  },
]

/* ==========================================================================
   NAVEGAÇÃO
   ========================================================================== */

export const NAV_LINKS = [
  { href: '#diagnostico', label: 'O problema' },
  { href: '#modulos', label: 'Módulos' },
  { href: '#plataforma', label: 'A plataforma' },
  { href: '#origem', label: 'Por que Artemis' },
  { href: '/contato', label: 'Contato' },
]
