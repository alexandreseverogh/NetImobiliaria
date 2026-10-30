import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { BLOG_POSTS } from './artemis4/blog/data';

/**
 * sitemap.xml — gerado via convenção nativa do Next.js App Router (GET /sitemap.xml).
 *
 * **Ciente de domínio (Host-aware), desde 2026-10-30** — achado real, não hipotético: a
 * versão anterior sempre usava `NEXT_PUBLIC_APP_URL` (o domínio principal de imóveis,
 * `imovtec.com.br`) pra montar TODAS as URLs, mesmo quando o sitemap era acessado via
 * `artemis9.com.br/sitemap.xml` — o Google Search Console rejeita (ou ignora) qualquer
 * entrada de sitemap cujo domínio não bate com o da propriedade verificada, então o
 * sitemap da landing Artemis9 nunca teria nenhuma URL válida pra submeter.
 *
 * Resolvido lendo o header `Host` real da requisição (`next/headers`, suportado desde
 * sempre no Next 14 App Router — força esta rota a ser dinâmica, renderizada por
 * requisição, não estática) e decidindo o conjunto de URLs certo pra cada domínio. O
 * `ops/Caddyfile` já confirma que o `Host` original chega intacto no `reverse_proxy
 * prod_app:3000` (sem `header_up Host` sobrescrevendo) — então isso é confiável em
 * produção. Decisão de arquitetura antes deliberadamente adiada (ver histórico do git
 * deste arquivo) — não varia por domínio E lista todo imóvel de todo tenant junto, só
 * resolve a parte do grão de domínio, que era o problema real.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const host = headers().get('host') || '';
  const now = new Date();

  // Domínio real da landing Artemis9, sem protocolo nem "www." (ex.: "artemis9.com.br") —
  // derivado da mesma env var já usada pelo canonical/JSON-LD da própria landing
  // (artemis4/layout.tsx), nunca um valor novo inventado aqui.
  const artemisDomain = (process.env.NEXT_PUBLIC_APP_URL_ARTEMIS || '')
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '');

  const isArtemisHost = !!artemisDomain && host.includes(artemisDomain);

  if (isArtemisHost) {
    return [
      {
        url: `https://${host}/artemis4`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 1,
      },
      {
        url: `https://${host}/artemis4/blog`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      ...BLOG_POSTS.map((post) => ({
        url: `https://${host}/artemis4/blog/${post.slug}`,
        lastModified: new Date(post.publishedAt),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
    ];
  }

  // Qualquer outro host (domínio principal de imóveis, staging, localhost em dev) —
  // monta a URL a partir do próprio Host recebido, não mais de uma env var fixa; cobre
  // produção, staging e dev sem precisar de um 3º branch de código.
  const baseUrl = host ? `https://${host}` : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

  return [
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
