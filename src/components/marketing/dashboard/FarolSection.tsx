import React from 'react';
import { cn } from '@/lib/marketing-utils';
import { PeriodBadge } from './PeriodBadge';

function FarolIcon({ isDark }: { isDark: boolean }) {
  return (
    <img
      src="/farol-de-milha.png"
      alt="Farol de Milha"
      width={56}
      height={56}
      className={cn('object-contain shrink-0', isDark ? 'opacity-90' : 'opacity-85')}
      style={{ filter: isDark ? 'none' : 'brightness(0.95)' }}
    />
  );
}

export function FarolSection({ isDark, children, periodLabel }: { isDark: boolean; children: React.ReactNode; periodLabel?: string }) {
  return (
    <div className={cn(
      'rounded-3xl p-6 mb-8 border',
      isDark
        ? 'border-[rgba(34,211,238,0.13)] shadow-[0_0_60px_rgba(34,211,238,0.03),inset_0_1px_0_rgba(34,211,238,0.06)] bg-[rgba(7,13,20,0.55)] backdrop-blur-sm'
        : 'border-sky-200/50 bg-gradient-to-br from-sky-50/50 to-white shadow-[0_4px_24px_rgba(14,165,233,0.05)]',
    )}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <FarolIcon isDark={isDark} />
          <div>
            <p className={cn('text-[9px] font-black uppercase tracking-[0.35em] mb-0.5', isDark ? 'text-cyan-700' : 'text-sky-500')}>
              Farol de Milha
            </p>
            <h2 className={cn('text-base font-black leading-tight', isDark ? 'text-slate-300' : 'text-slate-800')}>
              Sinais Leading & Antecipação
            </h2>
            <p className={cn('text-[11px] mt-0.5', isDark ? 'text-slate-600' : 'text-slate-400')}>
              Quando / para onde — motor de sinais Meta (FASE 8.5)
            </p>
          </div>
        </div>
        {periodLabel && <PeriodBadge label={periodLabel} isDark={isDark} />}
      </div>
      {children}
    </div>
  );
}
