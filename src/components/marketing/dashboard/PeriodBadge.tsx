import React from 'react';
import { cn } from '@/lib/marketing-utils';

export function PeriodBadge({ label, isDark }: { label: string; isDark: boolean }) {
  if (!label) return null;
  return (
    <span className={cn(
      'text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shrink-0',
      isDark
        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
        : 'bg-indigo-50 text-indigo-500 border border-indigo-100',
    )}>
      {label}
    </span>
  );
}
