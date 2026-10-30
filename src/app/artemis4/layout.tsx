import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Space_Grotesk, Inter } from 'next/font/google';
import { MetaPixel } from '@/components/analytics/MetaPixel';
import { GoogleTags } from '@/components/analytics/GoogleTags';
import { getMetaPixelId } from '@/lib/analytics/getMetaPixelId';
import { FAQ } from './data';

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
  title: 'Artemis9 — Marketing Digital, CRM com IA e Mensageria num ciclo só',
  description:
    'Plataforma brasileira que une Marketing Digital, CRM com inteligência artificial e Mensageria (automação de atendimento no WhatsApp) num ciclo fechado: o interessado chega identificado com a campanha que o trouxe, é respondido em segundos e o negócio fechado volta para o anúncio de origem.',
  alternates: {
    canonical: ARTEMIS_CANONICAL_PATH,
  },
  openGraph: {
    title: 'Artemis9 — Marketing Digital, CRM com IA e Mensageria num ciclo só',
    description:
      'Marketing Digital, CRM e Mensageria num ciclo fechado. Instagram, Google e TikTok num painel só, atendimento automatizado em segundos e retorno medido pelo seu caixa — não pela estimativa da rede social.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Artemis9',
    url: ARTEMIS_CANONICAL_PATH,
  },
  // F1 do plano SEO/GEO (docs/PLANO_SEO_GEO_ARTEMIS4.md §3) — libera o Google a mostrar
  // snippet/thumbnail maior no resultado de busca (sem limite de tamanho), aumenta CTR
  // orgânico sem custo nenhum de implementação.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  // Google Search Console — verificação de propriedade via meta tag. Só aparece quando a
  // variável real existir (pendência do usuário, F0 — ver docs/PLANO_SEO_GEO_ARTEMIS4.md §9.3):
  // o Search Console gera esse valor ao cadastrar a propriedade `artemis9.com.br`.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
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
  telephone: '+55-81-99793-0422',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Recife',
    addressRegion: 'PE',
    addressCountry: 'BR',
  },
  // sameAs (perfis reais de rede social) fica de fora de propósito — docs/
  // PLANO_SEO_GEO_ARTEMIS4.md §3: hoje não existe nenhum perfil publicado no rodapé da
  // página (Chrome.tsx), só um disclaimer de marca registrada. Nunca inventar aqui.
};

/* F1 — WebSite, schema.org separado de Organization (docs/PLANO_SEO_GEO_ARTEMIS4.md §3):
   declara idioma real da página e habilita, no futuro, uma SearchAction se a landing ganhar
   busca interna. */
const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Artemis9',
  url: ARTEMIS_URL + ARTEMIS_CANONICAL_PATH,
  inLanguage: 'pt-BR',
};

/* F1 — SoftwareApplication (não ProfessionalService — Artemis9 é uma plataforma SaaS, não um
   prestador de serviço local; ver nota de decisão em docs/PLANO_SEO_GEO_ARTEMIS4.md §3).
   Os 3 pilares vêm de ./data.ts (MODULE_CONTENT/eyebrow do Hero) — nunca inventados aqui. */
const softwareApplicationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Artemis9',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'Plataforma de Marketing Digital, CRM com inteligência artificial e Mensageria (automação de atendimento no WhatsApp) para empresas brasileiras de qualquer segmento.',
  url: ARTEMIS_URL + ARTEMIS_CANONICAL_PATH,
  offers: {
    '@type': 'Offer',
    availability: 'https://schema.org/InStock',
    url: ARTEMIS_URL + ARTEMIS_CANONICAL_PATH,
  },
};

/* F1 — FAQPage, derivado da MESMA fonte real que a seção visível de FAQ da página usa
   (./data.ts, FAQ[]) — nunca um texto duplicado à mão; se a FAQ visível mudar, o schema
   acompanha automaticamente, sem risco de os dois ficarem dessincronizados. */
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a,
    },
  })),
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
      {/* Dados estruturados (schema.org) — ver organizationJsonLd/websiteJsonLd/
          softwareApplicationJsonLd/faqJsonLd acima */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* GTM + GA4 + Consent Mode v2 — só renderiza se algum dos 2 IDs reais existir
          (docs/PLANO_SEO_GEO_ARTEMIS4.md §9.3 — pendência do usuário criar as contas) */}
      <GoogleTags
        gtmId={process.env.NEXT_PUBLIC_GTM_ID}
        ga4Id={process.env.NEXT_PUBLIC_GA4_ID}
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
