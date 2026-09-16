'use client';

import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { cn, networkLabel } from '@/lib/marketing-utils';

/**
 * Avisa quando os cálculos exibidos incluem dado histórico de uma rede que não está mais
 * contratada pelo tenant agora (contracted=false, mas o Insight já gravado continua contando
 * — decisão deliberada de nunca esconder retroativamente, ver discussão de descontinuidade
 * de rede). `discontinuedNetworks` vem pronto de GET /dashboard/full (availableNetworks no
 * escopo atual menos as redes provisionadas agora) — este componente só renderiza, não
 * recalcula nada.
 */
export function DiscontinuedNetworkBanner({
  isDark,
  discontinuedNetworks,
}: {
  isDark: boolean;
  discontinuedNetworks: string[];
}) {
  if (!discontinuedNetworks || discontinuedNetworks.length === 0) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-2xl border mb-6',
        isDark ? 'bg-sky-500/10 border-sky-500/30' : 'bg-sky-50 border-sky-200',
      )}
    >
      <InformationCircleIcon className={cn('h-5 w-5 shrink-0 mt-0.5', isDark ? 'text-sky-400' : 'text-sky-600')} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-black', isDark ? 'text-sky-400' : 'text-sky-700')}>
          Os cálculos abaixo incluem dado histórico de rede não contratada
        </p>
        <p className={cn('text-xs mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>
          {discontinuedNetworks.map(networkLabel).join(', ')}
          {discontinuedNetworks.length > 1 ? ' não estão mais contratadas' : ' não está mais contratada'} — o dado
          já sincronizado continua contando nos números acima, mas nenhuma métrica nova está sendo coletada.
          {' — '}
          <a href="/admin/campanhas/configuracoes/redes" className="underline font-bold">
            Revisar em Configurações → Redes
          </a>
        </p>
      </div>
    </div>
  );
}
