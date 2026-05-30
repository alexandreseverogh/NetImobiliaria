import type { Metadata } from 'next';
import { Suspense } from 'react';
import { MetaPixel } from '@/components/analytics/MetaPixel';
import { getMetaPixelId } from '@/lib/analytics/getMetaPixelId';

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
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden antialiased">
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
