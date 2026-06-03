'use client';

/**
 * ClientAvatar — Avatar circular reutilizável para clientes e tenants.
 *
 * Exibe a logomarca (logo_url) quando disponível; caso contrário,
 * exibe as iniciais do nome sobre fundo colorido por segmento.
 *
 * Usado em: Portfolio, lista de clientes, ClientSelector, dashboard,
 * modal analítico, e qualquer outra página que precise identificar
 * visualmente um cliente ou o próprio tenant.
 */

import React from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ClientAvatarProps {
  /** Nome completo — usado para gerar as iniciais no fallback */
  name: string;
  /** URL ou base64 da logomarca (ex: tenants.logo_url, clientes.logo_url) */
  logoUrl?: string | null;
  /** Slug do segmento — define a cor do fallback de iniciais */
  segmentSlug?: string | null;
  /**
   * true  = empresa própria do tenant → fundo índigo
   * false = cliente externo           → cor do segmento (default)
   */
  isTenant?: boolean;
  size?: AvatarSize;
  /** Classes Tailwind extras para o elemento raiz */
  className?: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'w-6  h-6  text-[9px]',
  sm: 'w-7  h-7  text-[10px]',
  md: 'w-9  h-9  text-xs',
  lg: 'w-11 h-11 text-sm',
  xl: 'w-14 h-14 text-base',
};

/** Mapeamento slug → classes Tailwind de cor de fundo + texto */
export const SEGMENT_AVATAR_COLORS: Record<string, string> = {
  imobiliaria:       'bg-blue-100   text-blue-700',
  imobiliario:       'bg-blue-100   text-blue-700',
  real_estate:       'bg-blue-100   text-blue-700',
  automotivo:        'bg-orange-100 text-orange-700',
  carros:            'bg-orange-100 text-orange-700',
  saude:             'bg-rose-100   text-rose-700',
  health:            'bg-rose-100   text-rose-700',
  educacao:          'bg-violet-100 text-violet-700',
  education:         'bg-violet-100 text-violet-700',
  ecommerce:         'bg-emerald-100 text-emerald-700',
  varejo:            'bg-emerald-100 text-emerald-700',
  beleza:            'bg-pink-100   text-pink-700',
  'marketing-digital': 'bg-indigo-100 text-indigo-700',
  tecnologia:        'bg-sky-100    text-sky-700',
  alimentacao:       'bg-amber-100  text-amber-700',
  geral:             'bg-gray-100   text-gray-600',
  general:           'bg-gray-100   text-gray-600',
};

const FALLBACK_COLOR = 'bg-slate-100 text-slate-600';
const TENANT_COLOR   = 'bg-indigo-100 text-indigo-700';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extrai até 2 iniciais de um nome (ex: "João Silva" → "JS").
 * Exportado para uso em outros componentes que precisem das iniciais.
 */
export function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase() || '?'
  );
}

/**
 * Retorna as classes Tailwind de cor para um dado slug de segmento.
 * Exportado para reutilização em listas, badges, etc.
 */
export function getSegmentAvatarColor(segmentSlug?: string | null, isTenant?: boolean): string {
  if (isTenant) return TENANT_COLOR;
  const key = (segmentSlug ?? '').toLowerCase().trim();
  return SEGMENT_AVATAR_COLORS[key] ?? FALLBACK_COLOR;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ClientAvatar({
  name,
  logoUrl,
  segmentSlug,
  isTenant = false,
  size = 'md',
  className = '',
}: ClientAvatarProps) {
  const dimClass   = SIZE_CLASSES[size];
  const colorClass = getSegmentAvatarColor(segmentSlug, isTenant);
  const baseClass  = `${dimClass} rounded-full shrink-0 ${className}`;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={`${baseClass} object-cover border border-white/60 shadow-sm`}
        onError={e => {
          // Se a imagem falhar, mostra o fallback de iniciais trocando para div
          const target = e.currentTarget;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
    );
  }

  return (
    <div
      className={`${baseClass} flex items-center justify-center font-bold ${colorClass}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Variante com fallback inline (logo + div oculto) ─────────────────────────
//
// Quando `logoUrl` existe, renderiza imagem + div de iniciais escondido.
// O onError da imagem revela o div caso a URL esteja quebrada.
// Use esta variante em lugares onde a URL pode ser instável.

export function ClientAvatarWithFallback({
  name,
  logoUrl,
  segmentSlug,
  isTenant = false,
  size = 'md',
  className = '',
}: ClientAvatarProps) {
  const dimClass   = SIZE_CLASSES[size];
  const colorClass = getSegmentAvatarColor(segmentSlug, isTenant);
  const baseClass  = `${dimClass} rounded-full shrink-0 ${className}`;

  return (
    <>
      {logoUrl && (
        <img
          src={logoUrl}
          alt={name}
          className={`${baseClass} object-cover border border-white/60 shadow-sm`}
          onError={e => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            const next = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement | null;
            if (next) next.style.display = 'flex';
          }}
        />
      )}
      <div
        className={`${baseClass} flex items-center justify-center font-bold ${colorClass}`}
        style={{ display: logoUrl ? 'none' : 'flex' }}
        title={name}
      >
        {getInitials(name)}
      </div>
    </>
  );
}
