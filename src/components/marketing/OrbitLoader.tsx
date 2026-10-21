'use client';

/**
 * Glifo de órbita — fonte única, importado tanto pela home do admin
 * (`src/app/admin/page.tsx`, decorativo) quanto por telas que precisam de um placeholder
 * de carregamento (`OrbitLoader` abaixo). Antes cada lugar tinha a própria cópia, uma
 * colorida pelo `accent` configurável do tenant, a outra com navy+gold fixo — a mesma
 * animação parecendo 2 componentes diferentes. Corrigido: só existe esta implementação, e
 * a cor é sempre fixa, nunca variável por tenant — "Uma paleta de dois pólos: o negro de
 * marinha profundo do espaço e o âmbar quente do alerta" (DESIGN.md §2). O corpo central
 * ("Terra") em navy-deep, o satélite em órbita ("Lua") em gold-accent, em toda a aplicação.
 *
 * `OrbitLoader` embrulha o glifo com uma legenda discreta — pensado pra substituir
 * skeletons genéricos (caixas cinza pulsando) em telas que podem demorar pra carregar,
 * deixando claro que a aplicação está trabalhando, não travada.
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/marketing-utils';

const NAVY = '#0a192f';
const GOLD = '#c5a028';

export function OrbitGlyph({ className }: { className?: string }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  return (
    <svg viewBox="0 0 220 130" className={className} aria-hidden="true">
      {/* órbita — guia neutro e discreto, nunca o foco */}
      <ellipse cx="110" cy="65" rx="95" ry="34" fill="none" stroke="#94a3b8" strokeOpacity="0.28" strokeWidth="1.25" />
      {/* corpo central — "Terra" */}
      <circle cx="110" cy="65" r="7" fill={NAVY} />
      <circle cx="110" cy="65" r="11" fill="none" stroke={NAVY} strokeOpacity="0.18" strokeWidth="1.5" />
      {/* rastro do satélite */}
      <circle r="9" fill={GOLD} fillOpacity="0.16">
        <animateMotion
          dur="22s"
          repeatCount={animate ? 'indefinite' : '0'}
          path="M 15,65 A 95,34 0 1,0 205,65 A 95,34 0 1,0 15,65 Z"
        />
      </circle>
      {/* satélite — "Lua" */}
      <circle r="3.5" fill={GOLD}>
        <animateMotion
          dur="22s"
          repeatCount={animate ? 'indefinite' : '0'}
          path="M 15,65 A 95,34 0 1,0 205,65 A 95,34 0 1,0 15,65 Z"
        />
      </circle>
    </svg>
  );
}

export function OrbitLoader({
  label = 'Carregando…',
  className,
  isDark = false,
}: {
  /** Texto discreto abaixo do glifo — null/'' omite a legenda. */
  label?: string | null;
  className?: string;
  isDark?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-10', className)}>
      <OrbitGlyph className="h-20 w-36 sm:h-24 sm:w-40" />
      {label && (
        <p className={cn('mt-3 text-xs font-medium', isDark ? 'text-slate-500' : 'text-gray-400')}>
          {label}
        </p>
      )}
    </div>
  );
}
