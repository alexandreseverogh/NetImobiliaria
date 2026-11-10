'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';
import { cn, formatCurrency, formatNumber } from '@/lib/marketing-utils';

type Status = 'ok' | 'atencao' | 'critico' | 'info' | 'sem_dado';

interface Explanation {
  indicator: string;
  status: Status;
  value: string;
  meaning: string;
  comparison: string;
  action: string | null;
}

interface AdPerformance {
  id: string;
  name: string;
  status: string;
  creativeType: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  thumbnailUrl: string | null;
  images: string[];
  imageCount: number;
  headline: string | null;
  body: string;
  campaignName: string;
  spend: number;
  hasData: boolean;
  explanations: Explanation[];
  issues: string[];
}

interface Props {
  isDark: boolean;
  periodDays: number;
  clientFilter?: string;
}

// Os seis indicadores principais, sempre exibidos nesta ordem, em todo criativo.
const CORE_ORDER = [
  'CTR (taxa de clique)',
  'Frequência',
  'Custo por conversa no WhatsApp',
  'Qualidade (Meta)',
  'Engajamento (Meta)',
  'Conversão (Meta)',
];

const TYPE_LABEL: Record<AdPerformance['creativeType'], string> = {
  IMAGE: 'Imagem',
  VIDEO: 'Vídeo',
  CAROUSEL: 'Carrossel',
};

const STATUS_STYLE: Record<Status, { dot: string; text: string; label: string }> = {
  ok: { dot: 'bg-emerald-500', text: 'text-emerald-500', label: 'Bom' },
  atencao: { dot: 'bg-amber-500', text: 'text-amber-500', label: 'Atenção' },
  critico: { dot: 'bg-red-500', text: 'text-red-500', label: 'Crítico' },
  info: { dot: 'bg-slate-400', text: 'text-slate-400', label: 'Informativo' },
  sem_dado: { dot: 'bg-slate-300', text: 'text-slate-400', label: 'Sem dados' },
};

function overallStatus(ad: AdPerformance): Status {
  if (ad.explanations.some(e => e.status === 'critico')) return 'critico';
  if (ad.explanations.some(e => e.status === 'atencao')) return 'atencao';
  return ad.hasData ? 'ok' : 'sem_dado';
}

const SEVERITY: Record<Status, number> = { critico: 0, atencao: 1, ok: 2, info: 3, sem_dado: 4 };

export function CreativesPerformanceView({ isDark, periodDays, clientFilter }: Props) {
  const [ads, setAds] = useState<AdPerformance[]>([]);
  const [benchmarks, setBenchmarks] = useState<Record<string, number> | null>(null);
  const [withIssues, setWithIssues] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [viewer, setViewer] = useState<{ name: string; images: string[]; index: number } | null>(null);

  // Fecha com Esc e navega com as setas quando o visualizador estiver aberto.
  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewer(null);
      if (e.key === 'ArrowRight') setViewer(v => v && { ...v, index: Math.min(v.index + 1, v.images.length - 1) });
      if (e.key === 'ArrowLeft') setViewer(v => v && { ...v, index: Math.max(v.index - 1, 0) });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ period: String(periodDays) });
    if (clientFilter) params.set('clientId', clientFilter);
    adminFetch(`/api/admin/campanhas/creatives/performance?${params}`)
      .then(async r => {
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok || d.error) setError(d.error ?? `HTTP ${r.status}`);
        else {
          setAds(d.ads ?? []);
          setBenchmarks(d.benchmarks ?? null);
          setWithIssues(d.withIssues ?? 0);
        }
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [periodDays, clientFilter]);

  // Prioridade: críticos primeiro, depois atenção, bons, informativos e sem dados; empate por gasto.
  const ordered = useMemo(() => {
    return [...ads].sort((a, b) => {
      const sa = SEVERITY[overallStatus(a)];
      const sb = SEVERITY[overallStatus(b)];
      if (sa !== sb) return sa - sb;
      return b.spend - a.spend;
    });
  }, [ads]);

  const toggle = (id: string) => setCollapsed(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const card = cn('rounded-3xl p-6 border', isDark ? 'bg-navy-light border-white/5' : 'bg-white border-slate-200 shadow-sm');
  const tx = isDark ? 'text-slate-100' : 'text-slate-900';
  const txMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const tile = cn('rounded-xl p-4 border', isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50/60 border-slate-200');

  return (
    <div className="space-y-6">
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className={cn('text-base font-black', tx)}>Criativos — feedback da Meta</h3>
            <p className={cn('text-xs mt-1 max-w-2xl', txMuted)}>
              Cada criativo mostra os seis indicadores principais, o que significam, como se comparam aos limites do
              segmento e aos concorrentes do mesmo público, e o que fazer. Os de maior prioridade aparecem primeiro.
            </p>
          </div>
          {!loading && !error && (
            <div className="text-right">
              <p className={cn('text-[10px] font-black uppercase tracking-widest', txMuted)}>Com alertas</p>
              <p className={cn('text-lg font-black', withIssues > 0 ? 'text-red-500' : 'text-emerald-500')}>
                {withIssues} de {ads.length}
              </p>
            </div>
          )}
        </div>
        {benchmarks && (
          <p className={cn('text-[11px] mt-3', txMuted)}>
            Limites do segmento: CTR mínimo {benchmarks.ctrMin}% · frequência máxima {benchmarks.frequencyMax} ·
            custo por conversa ideal até R$ {benchmarks.cplIdeal?.toFixed?.(2)} e crítico acima de R$ {benchmarks.cplCritical?.toFixed?.(2)}.
          </p>
        )}
      </div>

      {loading ? (
        <div className={cn(card, 'h-48 animate-pulse')} />
      ) : error ? (
        <div className={cn(card, 'text-sm text-red-500')}>Não foi possível carregar os criativos: {error}</div>
      ) : ads.length === 0 ? (
        <div className={cn(card, 'text-sm', txMuted)}>
          Nenhum criativo sincronizado ainda. Clique em Sincronizar no painel para trazer o desempenho por anúncio.
        </div>
      ) : (
        ordered.map(ad => {
          const isCollapsed = collapsed.has(ad.id);
          const overall = overallStatus(ad);
          const core = CORE_ORDER
            .map(name => ad.explanations.find(e => e.indicator === name))
            .filter((e): e is Explanation => !!e);
          const extras = ad.explanations.filter(e => !CORE_ORDER.includes(e.indicator));
          return (
            <div key={ad.id} className={card}>
              <div className="flex flex-wrap items-center gap-4">
                {ad.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <button
                    type="button"
                    onClick={() => setViewer({ name: ad.name, images: ad.images.length ? ad.images : [ad.thumbnailUrl as string], index: 0 })}
                    title="Ver criativo em tamanho original"
                    className="shrink-0 rounded-xl overflow-hidden border border-white/10 hover:ring-2 hover:ring-gold-premium transition-shadow"
                  >
                    <img src={ad.thumbnailUrl} alt="" className="h-24 w-24 object-cover" />
                  </button>
                ) : (
                  <div className={cn('h-24 w-24 rounded-xl shrink-0 flex items-center justify-center text-[10px] font-black uppercase text-center', isDark ? 'bg-white/5 text-slate-500' : 'bg-slate-100 text-slate-400')}>
                    Sem imagem
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn('font-black text-sm truncate', tx)}>{ad.name}</p>
                  <p className={cn('text-[11px] mt-0.5 truncate', txMuted)}>{ad.campaignName}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={cn('text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded',
                      ad.creativeType === 'CAROUSEL' ? 'bg-violet-500/15 text-violet-500'
                      : ad.creativeType === 'VIDEO' ? 'bg-sky-500/15 text-sky-500'
                      : 'bg-slate-500/15 text-slate-400')}>
                      {TYPE_LABEL[ad.creativeType]}{ad.creativeType === 'CAROUSEL' && ad.imageCount ? ` · ${ad.imageCount} cartões` : ''}
                    </span>
                    <span className={cn('text-[9px] font-black uppercase tracking-widest', txMuted)}>{ad.status}</span>
                    <span className={cn('text-[11px] font-bold', txMuted)}>Gasto: {ad.hasData ? formatCurrency(ad.spend) : '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', STATUS_STYLE[overall].dot)} />
                    <span className={cn('text-xs font-black uppercase tracking-widest', STATUS_STYLE[overall].text)}>{STATUS_STYLE[overall].label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(ad.id)}
                    className={cn('text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-colors',
                      isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
                  >
                    {isCollapsed ? 'Expandir' : 'Recolher'}
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="mt-5 space-y-4">
                  {(ad.headline || ad.body) && (
                    <div className={cn('rounded-xl p-3 text-xs', isDark ? 'bg-white/[0.03] border border-white/5' : 'bg-slate-50 border border-slate-200')}>
                      <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1', txMuted)}>Texto do anúncio</p>
                      {ad.headline && <p className={cn('font-bold', tx)}>{ad.headline}</p>}
                      {ad.body && <p className={cn('mt-1 whitespace-pre-wrap', txMuted)}>{ad.body}</p>}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {core.map((e, i) => (
                      <div key={i} className={tile}>
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn('text-xs font-black', tx)}>{e.indicator}</p>
                          <span className={cn('text-[10px] font-black uppercase tracking-widest', STATUS_STYLE[e.status].text)}>
                            {STATUS_STYLE[e.status].label}
                          </span>
                        </div>
                        <p className={cn('text-lg font-black mt-1', tx)}>{e.value}</p>
                        <p className={cn('text-[11px] mt-2', txMuted)}>{e.meaning}</p>
                        <p className={cn('text-[11px] mt-2 font-semibold', isDark ? 'text-slate-300' : 'text-slate-700')}>{e.comparison}</p>
                        {e.action && (
                          <div className={cn('mt-3 rounded-lg p-2.5 text-[11px]', isDark ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-800')}>
                            <span className="font-black">O que fazer: </span>{e.action}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {extras.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {extras.map((e, i) => (
                        <div key={`x${i}`} className={tile}>
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn('text-xs font-black', tx)}>{e.indicator}</p>
                            <span className={cn('text-[10px] font-black uppercase tracking-widest', STATUS_STYLE[e.status].text)}>
                              {STATUS_STYLE[e.status].label}
                            </span>
                          </div>
                          <p className={cn('text-sm font-black mt-1', tx)}>{e.value}</p>
                          <p className={cn('text-[11px] mt-2', txMuted)}>{e.meaning}</p>
                          <p className={cn('text-[11px] mt-2 font-semibold', isDark ? 'text-slate-300' : 'text-slate-700')}>{e.comparison}</p>
                          {e.action && (
                            <div className={cn('mt-3 rounded-lg p-2.5 text-[11px]', isDark ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-800')}>
                              <span className="font-black">O que fazer: </span>{e.action}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {viewer && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setViewer(null); }}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center">
            <div className="flex w-full items-center justify-between gap-4 mb-3">
              <p className="text-sm font-black text-white truncate">{viewer.name}</p>
              <button
                type="button"
                onClick={() => setViewer(null)}
                className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
              >
                Fechar (Esc)
              </button>
            </div>
            <div className="relative flex items-center justify-center">
              {viewer.images.length > 1 && viewer.index > 0 && (
                <button
                  type="button"
                  onClick={() => setViewer(v => v && { ...v, index: v.index - 1 })}
                  className="absolute -left-14 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white text-xl hover:bg-white/20"
                  aria-label="Cartão anterior"
                >‹</button>
              )}
              {/* Imagem original, sem redimensionamento: a qualidade é a do arquivo guardado. */}
              <img
                src={viewer.images[viewer.index]}
                alt={viewer.name}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl"
              />
              {viewer.images.length > 1 && viewer.index < viewer.images.length - 1 && (
                <button
                  type="button"
                  onClick={() => setViewer(v => v && { ...v, index: v.index + 1 })}
                  className="absolute -right-14 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 text-white text-xl hover:bg-white/20"
                  aria-label="Próximo cartão"
                >›</button>
              )}
            </div>
            {viewer.images.length > 1 && (
              <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-white/70">
                Cartão {viewer.index + 1} de {viewer.images.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
