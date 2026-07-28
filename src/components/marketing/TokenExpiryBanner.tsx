'use client';

import { useEffect, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

interface ExpiringNetwork {
  code: string;
  name: string;
  daysLeft: number; // negativo = já expirou
}

/**
 * Alerta proativo de token expirando (CLAUDE.md — "Alerta de token Meta expirando").
 * Generalizado pra qualquer rede conectada (não só Meta) — cada rede em ad_networks já
 * carrega expires_at via /configuracoes/redes, então não faz sentido hardcodear Meta aqui
 * quando o resto da plataforma trata rede como dado, não código (mesmo padrão de T0-T4).
 * Some sozinho quando nenhuma rede conectada está a <30 dias de expirar.
 */
export function TokenExpiryBanner({ isDark }: { isDark: boolean }) {
  const [items, setItems] = useState<ExpiringNetwork[]>([]);

  useEffect(() => {
    fetch('/api/admin/campanhas/configuracoes/redes')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const now = Date.now();
        const risky: ExpiringNetwork[] = (d?.networks || [])
          .filter((n: any) => n.connected && n.expires_at)
          .map((n: any) => ({
            code: n.code,
            name: n.name,
            daysLeft: Math.ceil((new Date(n.expires_at).getTime() - now) / 86400000),
          }))
          .filter((n: ExpiringNetwork) => n.daysLeft < 30);
        setItems(risky);
      })
      .catch(() => setItems([]));
  }, []);

  if (items.length === 0) return null;

  const hasExpired = items.some(i => i.daysLeft < 0);

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-2xl border mb-6',
        hasExpired
          ? (isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200')
          : (isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'),
      )}
    >
      <ExclamationTriangleIcon className={cn('h-5 w-5 shrink-0 mt-0.5', hasExpired ? 'text-red-500' : 'text-amber-500')} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-black', hasExpired ? 'text-red-600' : 'text-amber-600')}>
          {hasExpired ? 'Token de acesso expirado' : 'Token de acesso expirando em breve'}
        </p>
        <p className={cn('text-xs mt-0.5', isDark ? 'text-slate-400' : 'text-slate-500')}>
          {items
            .map(i => `${i.name} — ${i.daysLeft < 0 ? 'expirou' : `expira em ${i.daysLeft} dia${i.daysLeft !== 1 ? 's' : ''}`}`)
            .join(' · ')}
          {' — '}
          <a href="/admin/campanhas/configuracoes/redes" className="underline font-bold">
            Reconectar agora
          </a>
        </p>
      </div>
    </div>
  );
}
