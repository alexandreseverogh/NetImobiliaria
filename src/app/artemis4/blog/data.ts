/**
 * ARTEMIS4 BLOG — conteúdo em código, mesma disciplina de `../data.ts`/`moduleContent.ts`
 * (copy estática, não em banco — mais simples de versionar/revisar, e já é o padrão desta
 * landing inteira).
 *
 * REGRA DE VOZ (herdada de ../data.ts): o público é dono de negócio, não gestor de
 * marketing. Proibido: "lead", "funil", ROAS, CTR, CPL, SLA, "conversão". Usar:
 * "interessado", "cliente em potencial", "ciclo de venda", "custo por interessado",
 * "retorno real".
 *
 * REGRA DE PROVA: nenhum número entra aqui sem fonte primária verificável — reaproveita
 * as MESMAS fontes já citadas e conferidas na faixa de autoridade da landing (`../data.ts`,
 * `SOURCES`/`AUTHORITY`), nunca um dado novo sem checar.
 */

import { SOURCES } from '../data'

export interface BlogBlock {
  type: 'p' | 'h2' | 'quote' | 'list'
  text?: string
  items?: string[]
  /** só pra blocos 'quote' — cita a fonte real, igual já é feito na faixa de autoridade */
  sourceId?: keyof typeof SOURCES
}

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  /** YYYY-MM-DD — usado no <lastmod>/dateModified e na listagem */
  publishedAt: string
  readingMinutes: number
  body: BlogBlock[]
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'quanto-tempo-ate-responder-quem-demonstrou-interesse',
    title:
      'Quanto tempo você está perdendo até responder quem demonstrou interesse — e por que isso decide a venda',
    excerpt:
      'Duas pesquisas reais (Harvard Business Review e MIT Sloan) medem o efeito direto da velocidade de resposta sobre a chance real de fechar negócio. O número é maior do que a maioria dos donos de negócio imagina.',
    publishedAt: '2026-10-30',
    readingMinutes: 5,
    body: [
      {
        type: 'p',
        text: 'Imagine que alguém viu seu anúncio, gostou do que viu, e mandou uma mensagem perguntando o preço. Esse é o momento de maior interesse que essa pessoa vai ter pelo seu negócio — e, segundo duas pesquisas reais (não estimativa, não achismo), é também o momento em que a maioria das empresas brasileiras demora demais pra agir.',
      },
      {
        type: 'h2',
        text: 'O número real: 42 horas',
      },
      {
        type: 'quote',
        text: 'É o tempo médio que uma empresa leva para responder alguém que pediu contato pelo site. Quase um quarto delas nunca responde.',
        sourceId: 'hbr',
      },
      {
        type: 'p',
        text: 'Uma auditoria real de 2.241 empresas, publicada pela Harvard Business Review, mediu o tempo médio de resposta a um pedido de contato real — não uma mensagem de teste, uma pessoa de verdade querendo comprar. O resultado: 42 horas de espera, em média. Quase um quarto dessas empresas simplesmente nunca respondeu.',
      },
      {
        type: 'p',
        text: 'Pensa no seu próprio comportamento como cliente: quantas vezes você mandou mensagem pra 2 ou 3 negócios parecidos ao mesmo tempo, e comprou de quem respondeu primeiro? É exatamente isso que está acontecendo com os interessados que chegam até você.',
      },
      {
        type: 'h2',
        text: 'O que a velocidade de resposta muda de verdade',
      },
      {
        type: 'quote',
        text: 'É o quanto despenca a chance de aproveitar esse interessado se a resposta sai em 30 minutos em vez de 5.',
        sourceId: 'mit',
      },
      {
        type: 'p',
        text: 'Um estudo do MIT Sloan, com dados reais de 3 anos, 6 empresas e mais de 15.000 pessoas que demonstraram interesse real, chegou a um número que costuma surpreender: responder em 30 minutos — não 42 horas, só 30 minutos — já reduz a chance de fechar negócio em 21 vezes, comparado a responder em 5.',
      },
      {
        type: 'p',
        text: 'Não é sobre ter uma equipe maior nem trabalhar mais rápido. É sobre o interesse de uma pessoa esfriar enquanto ela espera — e, enquanto espera, ela continua olhando outras opções.',
      },
      {
        type: 'h2',
        text: 'Por que isso é ainda mais crítico no WhatsApp',
      },
      {
        type: 'quote',
        text: 'Dos celulares brasileiros têm WhatsApp instalado — e 8 de cada 10 usuários conversam com empresas por lá.',
        sourceId: 'mobileTime',
      },
      {
        type: 'p',
        text: 'No Brasil, 98,3% dos celulares têm WhatsApp instalado, e 8 em cada 10 usuários já usam o aplicativo pra conversar com empresas — segundo pesquisa real da Panorama Mobile Time/Opinion Box. É o canal onde a maior parte do seu cliente em potencial espera ser atendido rápido, por ser o mesmo canal onde ele conversa com a família e os amigos — a expectativa de resposta é instantânea, não comercial.',
      },
      {
        type: 'h2',
        text: 'O que dá pra fazer com isso',
      },
      {
        type: 'list',
        items: [
          'Responder em minutos, não em horas — mesmo fora do horário comercial, é quando boa parte do interesse real acontece.',
          'Saber, de verdade, qual anúncio trouxe aquele interessado — pra entender o que está funcionando, não só achar.',
          'Nunca inventar resposta — quando a pergunta sai do que você já tem cadastrado (estoque, preço, condição), é melhor admitir e passar pra uma pessoa do time do que arriscar uma informação errada.',
        ],
      },
      {
        type: 'p',
        text: 'Foi justamente pensando nesses 3 pontos que a Artemis9 foi construída: o interessado chega identificado com a campanha que o trouxe, é respondido em segundos — a qualquer hora —, e o negócio fechado volta pro anúncio de origem, pra você saber de verdade o que está dando retorno.',
      },
    ],
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug)
}
