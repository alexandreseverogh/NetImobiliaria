/**
 * Conteúdo premium (resumo executivo + modal "Saiba Mais") por módulo, keyed por
 * system_modules.slug — mesma disciplina do resto da Artemis4 (copy estática em código,
 * não em banco). Escrito em linguagem leiga de propósito: o público desta página é dono de
 * negócio, não gestor de marketing — nunca usar ROAS/CTR/SLA/etc. Termos evitados de
 * propósito, mesmo sendo consagrados em marketing digital, porque quem nunca investiu em
 * tráfego pago não conhece: "lead" (usar "cliente em potencial"/"interessado"/"contato") e
 * "funil" (usar "ciclo de venda").
 *
 * Cada entrada só é adicionada aqui depois de verificada contra o que a plataforma
 * REALMENTE entrega hoje (não o roadmap) — nunca prometer no card algo que o cliente não
 * vai encontrar ao entrar na plataforma.
 */

export interface ModuleCardContent {
  /** Nome público, comercial — substitui o nome interno de system_modules.name na UI
   *  (ex.: "Gestão de Campanhas de Marketing Digital" → "Marketing Digital") */
  displayName: string
  /** Título curto do card, 1-2 linhas, formato benefício-resultado */
  headline: string
  /** 1 frase de contexto logo abaixo do headline */
  hook: string
  /** Exatamente 3 ganhos reais, cada um 1 frase terminando em consequência de negócio */
  gains: string[]
  /** 1 frase de gancho pra outro módulo complementar */
  crossSellLine: string
  modal: {
    /** Parágrafo de abertura — argumento de mercado/categoria, antes de qualquer diferencial */
    intro: string
    pillars: { title: string; description: string }[]
    /** Linha de confiança — reforça o limite entre automação e decisão humana */
    trustLine: string
    /** Rodapé mencionando os módulos complementares por nome */
    crossSellFooter: string
    ctaLabel: string
  }
}

export const MODULE_CONTENT: Record<string, ModuleCardContent> = {
  'trafego-pago': {
    displayName: 'Marketing Digital',
    headline: 'Seu Cliente Já Está Lá. A Pergunta é: Ele Vai Te Encontrar ou o Concorrente?',
    hook: 'Enquanto ele passa quase 1h30 por dia no Instagram e no TikTok — e pesquisa no Google antes de decidir — alguém está aparecendo na frente dele. Essa plataforma garante que seja você.',
    gains: [
      'Você sabe exatamente qual anúncio virou venda de verdade — não uma estimativa que a própria rede social inventa pra parecer bem-sucedida.',
      'Quando um anúncio começa a perder força, o sistema percebe antes de você — evitando pagar por algo que já parou de funcionar.',
      'Instagram, TikTok e Google numa tela só, com o investimento se movendo sozinho pra onde está realmente dando resultado.',
    ],
    crossSellLine: 'Some o CRM, e cada interessado que vem de um anúncio já chega identificado com a campanha exata que trouxe ele — sem planilha, sem adivinhação.',
    modal: {
      intro:
        'O brasileiro passa quase 3h30 por dia em redes sociais — mais que a média mundial. Instagram e TikTok empatam em quase 1h30 de uso diário cada. Antes de decidir qualquer compra, entre 87% e 93% pesquisam no Google, e 96% leem avaliação antes de escolher uma loja ou contratar um serviço. Isso não é tendência — é onde a decisão de compra já acontece hoje. A pergunta que sobra pro seu negócio não é "devo anunciar digitalmente", é "quem está aparecendo primeiro pro cliente que já está pesquisando: eu ou meu concorrente?"',
      pillars: [
        {
          title: 'Você Sabe o Que Realmente Virou Venda',
          description:
            'Cada negócio fechado de verdade é rastreado até a campanha que trouxe o cliente — o retorno mostrado é medido pelo seu negócio real, não por uma métrica que a própria rede social calcula a seu favor.',
        },
        {
          title: 'A Queda de Desempenho é Percebida Antes de Custar Caro',
          description:
            'A plataforma acompanha os sinais reais de cada anúncio e identifica quando ele está prestes a perder força — evitando semanas gastando verba num anúncio que já parou de trazer resultado.',
        },
        {
          title: 'Uma Decisão Só, Não Uma Por Rede Social',
          description:
            'Instagram, TikTok e Google geridos num único painel, com o investimento se realocando automaticamente entre eles pra onde está performando de verdade — sem você precisar comparar telas diferentes.',
        },
        {
          title: 'Um Piloto Automático que Nunca Descansa',
          description:
            'Enquanto você cuida do resto do negócio, um agente de inteligência artificial monitora cada campanha o dia inteiro e já toma as decisões que só reduzem risco — sem precisar de você por perto.',
        },
      ],
      trustLine:
        'Nada de aumento de investimento acontece sem você aprovar — a tecnologia protege seu orçamento sozinha, mas qualquer decisão de gastar mais sempre passa pela sua palavra, direto no seu WhatsApp.',
      crossSellFooter:
        'Integra nativamente com o CRM (cada cliente em potencial já chega identificado e priorizado) e a Mensageria (resposta automática em segundos).',
      ctaLabel: 'Começar Agora',
    },
  },

  mensageria: {
    displayName: 'Gestão de Mensagens',
    headline: '95% dos Brasileiros Já Estão no WhatsApp. Sua Empresa Responde na Velocidade que Eles Esperam?',
    hook: '68% dos consumidores preferem resolver tudo por WhatsApp — e esperam resposta em minutos, não em horas. Cada canal separado (WhatsApp, site, redes sociais) é uma chance a mais de perder essa resposta.',
    gains: [
      'Todas as conversas — WhatsApp, formulário do site, atendimento manual — chegam num só lugar, sem o cliente precisar repetir o que já contou.',
      'Um assistente de inteligência artificial responde na hora, 24 horas por dia, com informação real do seu negócio — não uma resposta genérica de robô.',
      'Quando o assistente não sabe responder, a conversa passa pra um humano automaticamente — o cliente nunca fica travado numa resposta errada.',
    ],
    crossSellLine: 'Some o CRM, e cada conversa se transforma automaticamente num cadastro organizado, pronto pra ser trabalhado até a venda.',
    modal: {
      intro:
        '95% dos brasileiros têm WhatsApp instalado, e 68% preferem esse canal pra resolver qualquer atendimento — à frente de qualquer outra opção. Mas quando cada canal (WhatsApp, redes sociais, site, telefone) funciona separado, o resultado é queda real de satisfação: de 67% quando os canais estão conectados, pra 28% quando não estão — porque quase 6 em cada 10 clientes se veem obrigados a repetir a própria história pra um atendente diferente. Não é sobre ter WhatsApp — é sobre nunca perder o fio da conversa, seja qual for o canal que o cliente escolher.',
      pillars: [
        {
          title: 'Uma Só Caixa de Entrada, Não Importa o Canal',
          description:
            'WhatsApp, formulário do site, atendimento por chat — toda conversa cai no mesmo lugar, com o histórico completo sempre visível. Ninguém da equipe precisa perguntar de novo o que o cliente já contou.',
        },
        {
          title: 'Um Assistente que Conhece Seu Negócio de Verdade',
          description:
            'O assistente de inteligência artificial responde com base no catálogo real do seu negócio, não com respostas genéricas que qualquer empresa poderia dar — pode até enviar fotos e comparar opções, como um atendente faria.',
        },
        {
          title: 'Nunca Fica no Escuro Fora do Horário Comercial',
          description:
            'Enquanto sua equipe descansa, o assistente continua respondendo dúvidas simples e captando interesse — sem deixar ninguém esperando até o próximo dia útil.',
        },
        {
          title: 'Passa pro Humano Assim que Precisa',
          description:
            'Quando a conversa exige negociação, uma decisão, ou o cliente simplesmente pede pra falar com uma pessoa, o assistente entrega a conversa pro time — com todo o histórico já visível, sem o cliente ter que recomeçar do zero.',
        },
        {
          title: 'Cada Conversa Sabe de Onde Veio',
          description:
            'Quando a mensagem chega a partir de um anúncio, ela já aparece identificada com a campanha exata que trouxe aquele cliente — conectando o que a equipe de atendimento vê com o que a equipe de marketing investiu.',
        },
      ],
      trustLine:
        'O assistente de inteligência artificial responde o que sabe com confiança e nunca inventa informação que não tem — quando a dúvida foge do que ele conhece, passa a conversa pra um humano em vez de arriscar uma resposta errada.',
      crossSellFooter:
        'Integra nativamente com o CRM (cada conversa vira um cadastro organizado, pronto pra negociação) e o Marketing Digital (conversas já chegam identificadas com a campanha de origem).',
      ctaLabel: 'Começar Agora',
    },
  },

  crm: {
    displayName: 'CRM',
    headline: 'Quem Responde Primeiro, Vende. Sua Empresa Sabe Pra Quem Cada Cliente em Potencial Deve Ir na Hora?',
    hook: '78% dos compradores fecham com quem fala com eles primeiro — nem sempre com quem tem a melhor oferta. A maioria das empresas ainda decide isso na sorte, ou numa planilha.',
    gains: [
      'Cada novo contato já cai automaticamente pra pessoa certa, e um agente de IA avisa sozinho se ele ficar esperando resposta por tempo demais.',
      'Ninguém fica esquecido parado no meio do ciclo de venda — um agente aponta antes que vire uma venda perdida em silêncio.',
      'A IA sugere o próximo passo certo pra cada cliente em potencial, e aprende com cada negócio fechado o que realmente funciona pro seu negócio.',
    ],
    crossSellLine: 'Some o Marketing Digital, e cada interessado que vem de um anúncio já chega aqui identificado com a campanha exata que trouxe ele.',
    modal: {
      intro:
        'Responder um cliente em potencial em 5 minutos gera 21 vezes mais chance de fechar negócio do que esperar 30 — e 78% dos compradores fecham com quem fala com eles primeiro. Mesmo assim, a empresa média leva quase 2 dias pra dar o primeiro retorno, e quase 1 em cada 3 interessados nunca chega a ser contatado. O que decide a venda, na prática, não é só o produto — é a velocidade e a organização de quem responde primeiro.',
      pillars: [
        {
          title: 'Roteamento Inteligente, Não Sorte',
          description:
            'Cada novo contato é direcionado automaticamente pra pessoa certa — por região de atuação, por quem já é responsável por aquele cliente, ou por ordem de fila — sem depender de alguém decidir manualmente.',
        },
        {
          title: 'Qualificação Automática Desde a Primeira Mensagem',
          description:
            'A inteligência artificial lê a mensagem assim que ela chega e já identifica a real intenção de quem entrou em contato — o que a pessoa quer, o quanto está pronta pra avançar — antes mesmo de um humano responder.',
        },
        {
          title: 'Um Agente Avisa Antes do Cliente Esfriar',
          description:
            'Assim que um novo contato chega e fica sem resposta por tempo demais, um agente de inteligência artificial avisa sozinho o responsável — sem esperar alguém lembrar de checar o WhatsApp ou o e-mail. A diferença entre 5 minutos e 2 dias de espera é, literalmente, a venda: quem responde primeiro leva o cliente.',
        },
        {
          title: 'Um Agente Aponta Quando Algo Trava no Ciclo de Venda',
          description:
            'Quando um cliente em potencial fica parado na mesma etapa por tempo demais sem contato, um segundo agente identifica isso sozinho e avisa a equipe — antes que vire uma venda perdida que ninguém percebeu a tempo.',
        },
        {
          title: 'Um Agente Sugere Exatamente o Que Fazer a Seguir',
          description:
            'A cada etapa do ciclo de venda, a inteligência artificial analisa o histórico daquele cliente específico e sugere a ação mais indicada pra avançar — ligar agora, mandar a informação que ainda falta, ajustar a proposta — em vez de deixar cada vendedor decidir sozinho, só na intuição.',
        },
        {
          title: 'Um Agente Reativa Quem Esfriou',
          description:
            'Quando alguém para de responder, um agente identifica o momento certo de tentar reengajar aquele contato e já sugere como — em vez de ele simplesmente sumir da lista de prioridades da equipe, esquecido pra sempre.',
        },
      ],
      trustLine:
        'Os agentes de inteligência artificial organizam, alertam, sugerem e aprendem com cada negócio fechado ou perdido — mas quem conversa, negocia e decide o que dizer ao cliente continua sendo sempre a sua equipe.',
      crossSellFooter:
        'Integra nativamente com o Marketing Digital (interessados vindos de anúncio chegam identificados) e a Mensageria (WhatsApp e demais canais unificados numa caixa de entrada só).',
      ctaLabel: 'Começar Agora',
    },
  },
}
