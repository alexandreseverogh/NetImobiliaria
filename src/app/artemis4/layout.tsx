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

export const metadata: Metadata = {
  title: 'Artemis4 — Saiba qual anúncio virou venda de verdade',
  description:
    'Plataforma brasileira que une Marketing Digital, CRM e Mensageria num ciclo fechado: o interessado chega identificado com a campanha que o trouxe, é respondido em segundos e o negócio fechado volta para o anúncio de origem.',
  openGraph: {
    title: 'Artemis4 — Saiba qual anúncio virou venda de verdade',
    description:
      'Marketing Digital, CRM e Mensageria num ciclo fechado. Instagram, Google e TikTok num painel só, atendimento em segundos e retorno medido pelo seu caixa — não pela estimativa da rede social.',
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Artemis4',
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
