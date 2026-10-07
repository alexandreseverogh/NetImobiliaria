import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Space_Grotesk, Inter } from 'next/font/google';
import { MetaPixel } from '@/components/analytics/MetaPixel';
import { getMetaPixelId } from '@/lib/analytics/getMetaPixelId';

/* Fonte display característica (espacial/premium) para wordmark e títulos */
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

/* Fonte de corpo neutra e legível */
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

/* URL pública real do domínio Artemis9 (ex: https://www.artemis9.com.br) — NUNCA o domínio
   principal de imóveis (NEXT_PUBLIC_APP_URL), que serve conteúdo diferente na raiz. Gerada
   automaticamente por scripts/vps/deploy-github.sh a partir de PROD_DOMAIN_ARTEMIS; cai em
   NEXT_PUBLIC_APP_URL só como fallback de dev local (onde não há 2º domínio configurado). */
const ARTEMIS_URL = process.env.NEXT_PUBLIC_APP_URL_ARTEMIS || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ARTEMIS_CANONICAL_PATH = '/artemis4'; // URL real da rota — ver redir em ops/Caddyfile

export const metadata: Metadata = {
  metadataBase: new URL(ARTEMIS_URL),
  title: 'Artemis9 — Saiba qual anúncio virou venda de verdade',
  description:
    'Plataforma brasileira que une Marketing Digital, CRM e Mensageria num ciclo fechado: o interessado chega identificado com a campanha que o trouxe, é respondido em segundos e o negócio fechado volta para o anúncio de origem.',
  alternates: {
    canonical: ARTEMIS_CANONICAL_PATH,
  },
  openGraph: {
    title: 'Artemis9 — Saiba qual anúncio virou venda de verdade',
    description:
      'Marketing Digital, CRM e Mensageria num ciclo fechado. Instagram, Google e TikTok num painel só, atendimento em segundos e retorno medido pelo seu caixa — não pela estimativa da rede social.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Artemis9',
    url: ARTEMIS_CANONICAL_PATH,
  },
};

/* Dados estruturados (schema.org/Organization) — todo valor abaixo é real, extraído do
   rodapé já publicado da própria página (components/Chrome.tsx), nunca inventado aqui.
   Ajuda o Google a entender a entidade por trás da página (rich results, knowledge panel). */
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Artemis9',
  url: ARTEMIS_URL + ARTEMIS_CANONICAL_PATH,
  logo: `${ARTEMIS_URL}/Assets/artemis4_light_b.png`,
  description:
    'Plataforma brasileira que une marketing digital, atendimento e vendas num ciclo fechado — para você saber exatamente qual anúncio virou dinheiro no caixa.',
  email: 'contato@artemis9.com.br',
  telephone: '+55-81-99800-0047',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Recife',
    addressRegion: 'PE',
    addressCountry: 'BR',
  },
};

/* UUID do tenant master — dono das credenciais Meta para as páginas Artemis4 */
const MASTER_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export default async function Artemis4Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* Busca o pixel_id do tenant master (falha silenciosa → string vazia) */
  const pixelId = await getMetaPixelId(MASTER_TENANT_ID);

  return (
    <div className={`${spaceGrotesk.variable} ${inter.variable} min-h-screen bg-[#020c1b] text-white overflow-x-hidden antialiased font-[family-name:var(--font-body)]`}>
      {/* Dados estruturados (schema.org) — ver organizationJsonLd acima */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {/* Meta Pixel — só renderiza se pixelId estiver configurado */}
      {pixelId && (
        <Suspense fallback={null}>
          <MetaPixel pixelId={pixelId} />
        </Suspense>
      )}
      {children}
    </div>
  );
}
