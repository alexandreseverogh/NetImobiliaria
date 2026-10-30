import type { MetadataRoute } from 'next';

/**
 * robots.txt — gerado via convenção nativa do Next.js App Router (GET /robots.txt).
 *
 * Regra única, válida para qualquer domínio que sirva este mesmo app (PROD_DOMAIN e
 * PROD_DOMAIN_ARTEMIS compartilham o mesmo `prod_app`, ver ops/Caddyfile) — o que nunca
 * deve ser indexado (painéis autenticados, API, rotas de tracking) é o mesmo
 * independente de qual domínio o visitante usou para chegar.
 */
/** Rotas que nunca devem ser indexadas por nenhum crawler, humano ou de IA — mesma lista
 *  independente de quem está perguntando. */
const DISALLOW = [
  '/admin/',
  '/crm/',
  '/mensageria/',
  '/api/',
  '/login',
  '/corretor/entrar',
  '/corretor/cadastro',
  '/corretor/areas-atuacao',
  '/corretor/imoveis',
  '/corretor/leads',
  '/corretor/pagamentos',
  '/meu-perfil',
  '/imovel-pdf/',
  '/l/', // redirecionamento de CTA de campanha (tracking), não é conteúdo de navegação
];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW,
      },
      // F2 do plano SEO/GEO (docs/PLANO_SEO_GEO_ARTEMIS4.md §7) — blocos nomeados explícitos
      // pros crawlers de IA generativa. O wildcard '*' acima já cobre esses bots hoje (nenhuma
      // mudança de comportamento real) — a razão de ser explícito é documentar a intenção e
      // blindar contra alguém, numa sessão futura, adicionar um bloqueio nomeado sem perceber
      // que isso silenciaria só os crawlers de IA (regra nomeada tem precedência sobre '*').
      { userAgent: 'GPTBot', allow: '/', disallow: DISALLOW },
      { userAgent: 'ClaudeBot', allow: '/', disallow: DISALLOW },
      { userAgent: 'PerplexityBot', allow: '/', disallow: DISALLOW },
      { userAgent: 'Google-Extended', allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
