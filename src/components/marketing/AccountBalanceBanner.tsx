'use client';

import { useEffect, useState } from 'react';
import { ArrowPathIcon, WalletIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

interface AccountBalanceData {
  network: string;
  currency: string | null;
  amountSpent: number | null;
  spendCap: number | null;
  available: number | null;
  balanceDue: number | null;
  isPrepay: boolean | null;
  fundingSourceType: string | null;
  checkedAt: string;
  unavailableReason?: string;
}

interface NetworkBalanceEntry {
  code: string;
  name: string;
  icon: string | null;
  color: string | null;
  contracted: boolean;
  connected: boolean;
  balance: AccountBalanceData | null;
}

const NETWORK_SHORT_ICON: Record<string, string> = {
  meta: '𝕗',
  google: 'G',
  tiktok: '♪',
};

function formatCurrency(value: number | null, currency: string | null): string {
  if (value === null) return '—';
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency || 'R$'} ${value.toFixed(2)}`;
  }
}

/**
 * Saldo disponível pra lançamento de campanhas pagas, por rede — mostrado no topo de
 * /admin/campanhas/nova. Só exibe card pras redes contratadas E conectadas (as únicas em que
 * o botão de lançar de fato funciona) — rede sem credencial nenhuma não aparece aqui, já tem
 * aviso próprio (tooltip dos botões + mensagem de redes não contratadas).
 *
 * Nem toda rede expõe saldo programaticamente (ver `AccountBalanceResult`) — quando não dá,
 * o card mostra o motivo em vez de inventar um número.
 */
export function AccountBalanceBanner({ isDark }: { isDark?: boolean }) {
  const [entries, setEntries] = useState<NetworkBalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/admin/campanhas/configuracoes/redes/balance')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return;
        const list: NetworkBalanceEntry[] = (d?.networks || []).filter(
          (n: NetworkBalanceEntry) => n.contracted && n.connected,
        );
        setEntries(list);
      })
      .catch(() => { if (!cancelled) setEntries([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadTick]);

  if (!loading && entries.length === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-wrap items-stretch gap-3 p-4 rounded-2xl border mb-6',
        isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm',
      )}
    >
      <div className="flex items-center gap-2 pr-3">
        <WalletIcon className={cn('h-5 w-5', isDark ? 'text-slate-400' : 'text-gray-400')} />
        <p className={cn('text-[10px] font-black uppercase tracking-widest', isDark ? 'text-slate-400' : 'text-gray-400')}>
          Saldo para Campanhas
        </p>
      </div>

      {loading && entries.length === 0 && (
        <div className={cn('flex items-center gap-2 text-xs font-medium', isDark ? 'text-slate-400' : 'text-gray-400')}>
          <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Consultando saldo nas redes…
        </div>
      )}

      {entries.map(entry => {
        const b = entry.balance;
        const hasData = b && !b.unavailableReason;
        return (
          <div
            key={entry.code}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl border min-w-[220px]',
              isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100',
            )}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: entry.color || '#64748b' }}
            >
              {NETWORK_SHORT_ICON[entry.code] || entry.code.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className={cn('text-[10px] font-black uppercase tracking-wider', isDark ? 'text-slate-400' : 'text-gray-400')}>
                {entry.name}
              </p>
              {!b ? (
                <p className={cn('text-xs font-medium', isDark ? 'text-slate-500' : 'text-gray-400')}>Consultando…</p>
              ) : hasData && b.available !== null ? (
                <p className={cn('text-sm font-black', isDark ? 'text-emerald-300' : 'text-emerald-600')}>
                  {formatCurrency(b.available, b.currency)}
                  <span className={cn('ml-1 font-medium text-[10px]', isDark ? 'text-slate-500' : 'text-gray-400')}>
                    disponível
                  </span>
                </p>
              ) : hasData && b.amountSpent !== null ? (
                <p className={cn('text-sm font-bold', isDark ? 'text-slate-200' : 'text-gray-700')}>
                  {formatCurrency(b.amountSpent, b.currency)}
                  <span className={cn('ml-1 font-medium text-[10px]', isDark ? 'text-slate-500' : 'text-gray-400')}>
                    gasto · sem teto
                  </span>
                </p>
              ) : (
                <p
                  className={cn('text-[11px] font-medium leading-snug', isDark ? 'text-amber-400' : 'text-amber-600')}
                  title={b.unavailableReason}
                >
                  Saldo não disponível via API
                </p>
              )}
            </div>
          </div>
        );
      })}

      {!loading && entries.length > 0 && (
        <button
          type="button"
          onClick={() => setReloadTick(t => t + 1)}
          title="Atualizar saldo"
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg transition-colors ml-auto',
            isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100',
          )}
        >
          <ArrowPathIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
