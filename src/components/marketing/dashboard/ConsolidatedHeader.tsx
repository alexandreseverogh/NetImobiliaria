'use client';

import React from 'react';
import { cn } from '@/lib/marketing-utils';

/**
 * Cabeçalho padrão das seções consolidadas do dashboard. Só aparece com mais de uma campanha.
 * Recolhido: "Consolidado de N campanhas" + link para expandir. Expandido: "Por campanha (N)" +
 * botão para recolher. A seção decide o que repetir por campanha quando expandida.
 */
export function ConsolidatedHeader({
  count,
  expanded,
  onToggle,
  isDark,
  txMuted,
  label,
}: {
  count: number;
  expanded: boolean;
  onToggle: () => void;
  isDark: boolean;
  txMuted: string;
  label?: string;
}) {
  if (count <= 1) return null;
  return (
    <div className="flex items-center gap-4 mb-3">
      <p className={cn('text-[11px] font-black uppercase tracking-widest', txMuted)}>
        {expanded
          ? `${label ?? 'Por campanha'} (${count})`
          : `${label ?? 'Consolidado'} de ${count} campanhas`}
      </p>
      <button
        type="button"
        onClick={onToggle}
        className={cn('text-[11px] font-black uppercase tracking-widest underline-offset-4 hover:underline', isDark ? 'text-gold-premium' : 'text-amber-700')}
      >
        {expanded ? 'Recolher' : 'Expandir por campanha'}
      </button>
    </div>
  );
}
