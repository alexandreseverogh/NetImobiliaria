import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Artemis4 - Plataforma de Alta Performance para Negócios',
  description: 'Artemis4 é a plataforma definitiva de gestão, CRM de vendas e aceleração de marketing para múltiplos segmentos de mercado.',
};

export default function Artemis4Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden antialiased">
      {children}
    </div>
  );
}
