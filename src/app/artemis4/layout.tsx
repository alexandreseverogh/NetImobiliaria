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
  title: 'Artemis4 - Plataforma de Alta Performance para Negócios',
  description: 'Artemis4 é a plataforma definitiva de gestão, CRM de vendas e aceleração de marketing para múltiplos segmentos de mercado.',
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
    <div className={`${spaceGrotesk.variable} ${inter.variable} min-h-screen bg-[#020617] text-white overflow-x-hidden antialiased font-[family-name:var(--font-body)]`}>
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
