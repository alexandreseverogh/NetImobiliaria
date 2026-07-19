import React, { useEffect, useState, useCallback } from 'react';
import { ExclamationTriangleIcon, TrashIcon, ArrowPathIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { cn, formatCurrency, formatPercent, formatNumber } from '@/lib/marketing-utils';
import { getGoogleSearchTerms, negateGoogleSearchTerm, type GoogleSearchTermsData } from '@/lib/marketing-api';

interface GoogleAdsViewProps {
  isDark: boolean;
  cardBase: string;
  tx: string;
  txMuted: string;
}

/**
 * FASE 1 (Google Ads) A7 — drill-down Google: ROAS + IS Lost (Budget) por campanha, e a
 * lista de termos de busca sem conversão ainda não tratados, com ação de negativar manual
 * (complementa o agente automático da A6 — ver docs/PLANO_GOOGLE_TIKTOK.md).
 */
export function GoogleAdsView({ isDark, cardBase, tx, txMuted }: GoogleAdsViewProps) {
  const [data, setData] = useState<GoogleSearchTermsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [negatingKey, setNegatingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [negateError, setNegateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getGoogleSearchTerms({ status: 'none' });
      setData(result);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erro ao carregar dados do Google Ads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleNegate(campaignId: string, searchTerm: string, matchType: string) {
    const key = `${campaignId}|${searchTerm}`;
    setNegatingKey(key);
    setNegateError(null);
    try {
      await negateGoogleSearchTerm({ campaignId, searchTerm, matchType });
      setData(prev => prev ? { ...prev, terms: prev.terms.filter(t => !(t.campaignId === campaignId && t.searchTerm === searchTerm)) } : prev);
    } catch (e: any) {
      setNegateError(e?.response?.data?.error || 'Erro ao negativar termo');
    } finally {
      setNegatingKey(null);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={cn('rounded-2xl h-24', isDark ? 'bg-white/[0.03]' : 'bg-slate-100')} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('rounded-2xl p-8 text-center', cardBase)}>
        <p className={cn('text-sm font-bold', tx)}>{error}</p>
      </div>
    );
  }

  if (!data || data.campaigns.length === 0) {
    return (
      <div className={cn('rounded-2xl p-16 text-center', cardBase)}>
        <p className={cn('text-sm font-black mb-1', tx)}>Nenhuma campanha Google encontrada</p>
        <p className={cn('text-xs', txMuted)}>Lance uma campanha via Google AI Max para ver os dados aqui.</p>
      </div>
    );
  }

  const campaignNameById = new Map(data.campaigns.map(c => [c.id, c.name]));

  return (
    <div className="space-y-6">
      {/* Resumo por campanha — ROAS + IS Lost (Budget) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.campaigns.map(c => (
          <div key={c.id} className={cn('p-5 rounded-2xl border', cardBase, isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-200')}>
            <p className={cn('text-sm font-black truncate', tx)}>{c.name}</p>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <p className={cn('text-[10px] uppercase tracking-widest', txMuted)}>ROAS</p>
                <p className={cn('text-lg font-black', isDark ? 'text-emerald-400' : 'text-emerald-600')}>
                  {c.roas !== null ? `${c.roas.toFixed(2)}x` : '—'}
                </p>
              </div>
              <div className="text-right">
                <p className={cn('text-[10px] uppercase tracking-widest', txMuted)}>IS Lost (Budget)</p>
                <p className={cn('text-lg font-black', c.avgSearchBudgetLostIs > 20 ? 'text-amber-500' : (isDark ? 'text-slate-300' : 'text-slate-700'))}>
                  {formatPercent(c.avgSearchBudgetLostIs)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search Terms — revisão manual */}
      <div className={cn('rounded-3xl border overflow-hidden', cardBase, isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-slate-200')}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-xl', isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')}>
              <ExclamationTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className={cn('text-base font-black', tx)}>Termos de Busca Pendentes de Revisão</h3>
              <p className={cn('text-xs', txMuted)}>Últimos 30 dias — ainda não tratados. Conversões em vermelho = 0 (candidato do agente automático); os demais ficam aqui só para sua visibilidade.</p>
            </div>
          </div>
          <button onClick={load} className={cn('p-2 rounded-xl transition-colors', isDark ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-100 text-slate-500')}>
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>

        {negateError && (
          <div className={cn('mx-6 mt-4 px-4 py-3 rounded-xl text-sm font-medium flex items-start justify-between gap-3', isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600')}>
            <span>{negateError}</span>
            <button onClick={() => setNegateError(null)} className="shrink-0 font-bold">✕</button>
          </div>
        )}

        {data.terms.length === 0 ? (
          <div className="py-12 text-center">
            <ChartBarIcon className={cn('w-8 h-8 mx-auto mb-2', txMuted)} />
            <p className={cn('text-sm font-bold', tx)}>Nenhum termo pendente de revisão.</p>
            <p className={cn('text-xs mt-1', txMuted)}>Ou o agente automático já tratou tudo, ou ainda não há dados suficientes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={cn('text-[10px] uppercase tracking-widest', txMuted)}>
                  <th className="text-left px-6 py-3">Termo</th>
                  <th className="text-left px-3 py-3">Campanha</th>
                  <th className="text-left px-3 py-3">Match</th>
                  <th className="text-right px-3 py-3">Impressões</th>
                  <th className="text-right px-3 py-3">Cliques</th>
                  <th className="text-right px-3 py-3">Custo</th>
                  <th className="text-right px-3 py-3">Conversões</th>
                  <th className="text-right px-6 py-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {data.terms.map(t => {
                  const key = `${t.campaignId}|${t.searchTerm}`;
                  return (
                    <tr key={key} className={cn('border-t', isDark ? 'border-white/5' : 'border-slate-100')}>
                      <td className={cn('px-6 py-3 font-bold', tx)}>{t.searchTerm}</td>
                      <td className={cn('px-3 py-3 truncate max-w-[160px]', txMuted)}>{campaignNameById.get(t.campaignId) || t.campaignId}</td>
                      <td className={cn('px-3 py-3', txMuted)}>{t.matchType}</td>
                      <td className={cn('px-3 py-3 text-right', txMuted)}>{formatNumber(t.impressions)}</td>
                      <td className={cn('px-3 py-3 text-right', txMuted)}>{formatNumber(t.clicks)}</td>
                      <td className={cn('px-3 py-3 text-right font-bold', tx)}>{formatCurrency(t.cost)}</td>
                      <td className={cn('px-3 py-3 text-right', t.conversions === 0 ? 'text-rose-500 font-bold' : txMuted)}>{t.conversions}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleNegate(t.campaignId, t.searchTerm, t.matchType)}
                          disabled={negatingKey === key}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50',
                            isDark ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'bg-rose-50 text-rose-600 hover:bg-rose-100',
                          )}
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                          {negatingKey === key ? 'Negativando...' : 'Negativar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
