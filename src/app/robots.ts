import type { MetadataRoute } from 'next';

/**
 * robots.txt — gerado via convenção nativa do Next.js App Router (GET /robots.txt).
 *
 * Regra única, válida para qualquer domínio que sirva este mesmo app (PROD_DOMAIN e
 * PROD_DOMAIN_ARTEMIS compartilham o mesmo `prod_app`, ver ops/Caddyfile) — o que nunca
 * deve ser indexado (painéis autenticados, API, rotas de tracking) é o mesmo
 * independente de qual domínio o visitante usou para chegar.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
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
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
