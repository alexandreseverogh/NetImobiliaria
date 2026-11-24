'use client';

import { useEffect, useState } from 'react';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import {
  getSegmentationInsights,
  generateSegmentationNarrative,
  type SegmentationInsightsData,
  type SegmentationInsightsParams,
} from '@/lib/marketing-api';
import { cn } from '@/lib/marketing-utils';

interface Props extends SegmentationInsightsParams {
  isDark: boolean;
  cardBase: string;
  tx: string;
  txMuted: string;
}

const TONE_DOT: Record<string, string> = {
  good: 'bg-emerald-500',
  warn: 'bg-red-500',
  info: 'bg-slate-400',
};

/**
 * Insights de Segmentação: fatos calculados por regra (sempre visíveis) + narrativa
 * redigida pela IA sob demanda. A IA não calcula números — só explica os fatos.
 */
export function SegmentationInsightsPanel({ isDark, cardBase, tx, txMuted, startDate, endDate, segmentId, clientId }: Props) {
  const [data, setData] = useState<SegmentationInsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params: SegmentationInsightsParams = { startDate, endDate, segmentId, clientId };
  const key = `${startDate}|${endDate}|${segmentId ?? ''}|${clientId ?? ''}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    getSegmentationInsights(params)
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError('Não foi possível carregar os insights de segmentação.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const d = await generateSegmentationNarrative(params);
      setData(d);
    } catch {
      setError('A IA não respondeu agora. Tente novamente em instantes.');
    } finally {
      setGenerating(false);
    }
  };

  const paragraphs = (data?.narrative ?? '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  return (
    <section className={cn('rounded-2xl p-6', cardBase)}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className={cn('text-[10px] font-black uppercase tracking-[0.2em] mb-1', txMuted)}>Segmentação</p>
          <h3 className={cn('text-lg font-black tracking-tight', tx)}>Insights de público, região e horário</h3>
          <p className={cn('text-xs mt-1', txMuted)}>Fatos calculados sobre o período. A IA explica o que eles significam.</p>
        </div>
        <button
          onClick={generate}
          disabled={generating || loading || !data?.hasData || (data?.facts.length ?? 0) === 0}
          className={cn(
            'shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors',
            'bg-gold-premium text-navy-dark hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {generating ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : <SparklesIcon className="w-3.5 h-3.5" />}
          {generating ? 'Analisando…' : data?.narrative ? 'Gerar de novo' : 'Gerar análise com IA'}
        </button>
      </div>

      {loading && <p className={cn('text-xs', txMuted)}>Carregando fatos…</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {!loading && data && !data.hasData && (
        <p className={cn('text-xs', txMuted)}>Sem quebra de segmentação no período.</p>
      )}

      {!loading && data?.hasData && data.facts.length === 0 && (
        <p className={cn('text-xs', txMuted)}>Dados insuficientes para comparar públicos, regiões ou horários neste período.</p>
      )}

      {!loading && data && data.facts.length > 0 && (
        <ul className="space-y-2.5">
          {data.facts.map((f, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', TONE_DOT[f.tone])} />
              <span className={cn('text-sm leading-snug', tx)}>{f.text}</span>
            </li>
          ))}
        </ul>
      )}

      {paragraphs.length > 0 && (
        <div className={cn('mt-5 pt-5 border-t space-y-3', isDark ? 'border-white/[0.06]' : 'border-slate-200')}>
          <p className={cn('text-[10px] font-black uppercase tracking-[0.2em]', txMuted)}>Análise da IA</p>
          {paragraphs.map((p, i) => (
            <p key={i} className={cn('text-sm leading-relaxed whitespace-pre-line', tx)}>{p}</p>
          ))}
        </div>
      )}
    </section>
  );
}
