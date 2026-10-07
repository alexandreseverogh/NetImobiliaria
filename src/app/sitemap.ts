import type { MetadataRoute } from 'next';

/**
 * sitemap.xml — gerado via convenção nativa do Next.js App Router (GET /sitemap.xml).
 *
 * Escopo desta versão: só as páginas públicas ESTÁTICAS do app (incluindo a landing
 * Artemis9 em /artemis4, que é o que motivou esta implementação). Deliberadamente NÃO
 * inclui as páginas de imóvel individuais (/imoveis/[id]) ainda — cada domínio real
 * (PROD_DOMAIN de imóveis × PROD_DOMAIN_ARTEMIS da landing) serve um conteúdo de raiz
 * diferente sobre o MESMO app (ver ops/Caddyfile), e decidir se o sitemap deveria variar
 * por domínio (sitemap dinâmico por Host) ou listar todo imóvel de todo tenant junto é uma
 * decisão de arquitetura maior, fora do escopo deste pedido — ver nota no código se for
 * retomar isso depois.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const now = new Date();

  return [
    {
      url: `${baseUrl}/artemis4`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/landpaging`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/procurar-imovel`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/mapa-imoveis`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/anunciar-imovel`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}
