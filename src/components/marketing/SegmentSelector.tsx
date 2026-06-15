"use client";
/**
 * SegmentSelector — Seletor de segmento de negócio para o dashboard de campanhas.
 *
 * UX: trigger compacto com chips removíveis + dropdown pesquisável.
 * Escala para dezenas de segmentos sem quebrar o layout.
 *
 * Regra fundamental: NUNCA misturar dados de segmentos distintos.
 * Nenhum dado é carregado enquanto nenhum segmento estiver selecionado.
 *
 * Comportamento:
 *   - Default: nenhum selecionado → placeholder
 *   - 1 selecionado: chip no trigger, dashboard carrega
 *   - 2+ selecionados: chips com overflow "+N" + abas em linha separada
 *   - Aba ativa: controla qual segmento está sendo visualizado
 */

import { useState, useEffect, useRef } from 'react';
import {
  TagIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SegmentOption {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  colorTheme: string | null;
  clientCount: number;
  campaignCount: number;
  isOwn: boolean;
}

export interface SegmentSelectorProps {
  selected: string[];
  activeSegment: string | null;
  onToggle: (segmentId: string) => void;
  onActivate: (segmentId: string) => void;
  onClear: () => void;
  segments: SegmentOption[];
  loading?: boolean;
  isDark?: boolean;
}

// ─── Paleta por slug ──────────────────────────────────────────────────────────

const PALETTE: Record<string, { dot: string; chip: string; tab: string; tabActive: string }> = {
  imobiliaria: {
    dot:       'bg-blue-500',
    chip:      'bg-blue-500/15 text-blue-400 border-blue-500/30',
    tab:       'text-blue-400 border-b-blue-500',
    tabActive: 'bg-blue-500/10',
  },
  saude: {
    dot:       'bg-rose-500',
    chip:      'bg-rose-500/15 text-rose-400 border-rose-500/30',
    tab:       'text-rose-400 border-b-rose-500',
    tabActive: 'bg-rose-500/10',
  },
  pet: {
    dot:       'bg-amber-500',
    chip:      'bg-amber-500/15 text-amber-400 border-amber-500/30',
    tab:       'text-amber-400 border-b-amber-500',
    tabActive: 'bg-amber-500/10',
  },
  carros: {
    dot:       'bg-orange-500',
    chip:      'bg-orange-500/15 text-orange-400 border-orange-500/30',
    tab:       'text-orange-400 border-b-orange-500',
    tabActive: 'bg-orange-500/10',
  },
  geral: {
    dot:       'bg-slate-500',
    chip:      'bg-slate-500/15 text-slate-400 border-slate-500/30',
    tab:       'text-slate-400 border-b-slate-500',
    tabActive: 'bg-slate-500/10',
  },
  master: {
    dot:       'bg-violet-500',
    chip:      'bg-violet-500/15 text-violet-400 border-violet-500/30',
    tab:       'text-violet-400 border-b-violet-500',
    tabActive: 'bg-violet-500/10',
  },
};

const PALETTE_LIGHT: Record<string, { dot: string; chip: string; tab: string; tabActive: string }> = {
  imobiliaria: { dot: 'bg-blue-500',   chip: 'bg-blue-50 text-blue-700 border-blue-200',   tab: 'text-blue-600 border-b-blue-500',   tabActive: 'bg-blue-50'   },
  saude:       { dot: 'bg-rose-500',   chip: 'bg-rose-50 text-rose-700 border-rose-200',   tab: 'text-rose-600 border-b-rose-500',   tabActive: 'bg-rose-50'   },
  pet:         { dot: 'bg-amber-500',  chip: 'bg-amber-50 text-amber-700 border-amber-200', tab: 'text-amber-600 border-b-amber-500', tabActive: 'bg-amber-50'  },
  carros:      { dot: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700 border-orange-200', tab: 'text-orange-600 border-b-orange-500', tabActive: 'bg-orange-50' },
  geral:       { dot: 'bg-slate-500',  chip: 'bg-slate-50 text-slate-700 border-slate-200',  tab: 'text-slate-600 border-b-slate-500',  tabActive: 'bg-slate-50'  },
  master:      { dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700 border-violet-200', tab: 'text-violet-600 border-b-violet-500', tabActive: 'bg-violet-50' },
};

const DEFAULT_PAL_DARK  = { dot: 'bg-indigo-500', chip: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', tab: 'text-indigo-400 border-b-indigo-500', tabActive: 'bg-indigo-500/10' };
const DEFAULT_PAL_LIGHT = { dot: 'bg-indigo-500', chip: 'bg-indigo-50 text-indigo-700 border-indigo-200',         tab: 'text-indigo-600 border-b-indigo-500', tabActive: 'bg-indigo-50'         };

function palFor(slug: string, isDark: boolean) {
  const map = isDark ? PALETTE : PALETTE_LIGHT;
  return map[slug] ?? (isDark ? DEFAULT_PAL_DARK : DEFAULT_PAL_LIGHT);
}

// ─── Componente principal ─────────────────────────────────────────────────────

// Quantos chips mostrar antes de colapsar em "+N"
const MAX_VISIBLE_CHIPS = 2;

export default function SegmentSelector({
  selected,
  activeSegment,
  onToggle,
  onActivate,
  onClear,
  segments,
  loading = false,
  isDark = true,
}: SegmentSelectorProps) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const dropRef  = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fechar ao clicar fora
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 60);
  }, [open]);

  // Segmentos filtrados pela busca
  const filtered = search.length >= 1
    ? segments.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    : segments;

  const selectedSegs  = selected.map(id => segments.find(s => s.id === id)).filter(Boolean) as SegmentOption[];
  const visibleChips  = selectedSegs.slice(0, MAX_VISIBLE_CHIPS);
  const overflowCount = selectedSegs.length - MAX_VISIBLE_CHIPS;
  const hasSelected   = selected.length > 0;
  const multiMode     = selected.length >= 2;

  // ── Estilos base ──────────────────────────────────────────────────────────
  const triggerBase = cn(
    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all border select-none',
    isDark
      ? 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.07)]'
      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm',
    open && (isDark
      ? 'ring-2 ring-indigo-500/30 border-indigo-500/40'
      : 'ring-2 ring-indigo-500/20 border-indigo-300'),
  );

  const panelBase = cn(
    'absolute left-0 top-full mt-2 z-50 w-72 rounded-2xl shadow-2xl overflow-hidden',
    isDark
      ? 'bg-[#0d1421] border border-[rgba(255,255,255,0.09)]'
      : 'bg-white border border-slate-200',
  );

  const tx     = isDark ? 'text-slate-300'  : 'text-slate-800';
  const txMute = isDark ? 'text-slate-500'  : 'text-slate-400';
  const divCol = isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-slate-100';
  const rowHov = isDark ? 'hover:bg-[rgba(255,255,255,0.05)]' : 'hover:bg-slate-50';

  return (
    <div className="flex flex-col gap-0">

      {/* ── Linha 1: label + trigger ──────────────────────────────────────── */}
      <div className="flex items-center gap-2" ref={dropRef}>

        {/* Label */}
        <span className={cn('text-[9px] font-black uppercase tracking-[0.3em] shrink-0', txMute)}>
          Segmento
        </span>

        {/* Trigger */}
        <div className="relative">
          <button
            onClick={() => setOpen(o => !o)}
            className={triggerBase}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            {/* Ícone */}
            {loading ? (
              <span className={cn('w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin', txMute)} />
            ) : hasSelected ? null : (
              <TagIcon className={cn('h-3.5 w-3.5 shrink-0', txMute)} />
            )}

            {/* Chips dos segmentos selecionados */}
            {hasSelected ? (
              <div className="flex items-center gap-1.5">
                {visibleChips.map(seg => {
                  const p = palFor(seg.slug, isDark);
                  return (
                    <span
                      key={seg.id}
                      className={cn(
                        'inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-lg border',
                        p.chip,
                      )}
                    >
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', p.dot)} />
                      {seg.name}
                      {/* Botão remover chip individual */}
                      <button
                        onClick={e => { e.stopPropagation(); onToggle(seg.id); }}
                        className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                        aria-label={`Remover ${seg.name}`}
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
                {overflowCount > 0 && (
                  <span className={cn('text-[11px] font-black px-2 py-0.5 rounded-lg border', isDark ? 'bg-white/8 text-slate-400 border-white/10' : 'bg-slate-100 text-slate-500 border-slate-200')}>
                    +{overflowCount}
                  </span>
                )}
              </div>
            ) : (
              <span className={cn('text-[12px]', txMute)}>
                {loading ? 'Carregando...' : 'Selecionar segmento...'}
              </span>
            )}

            <ChevronDownIcon className={cn(
              'h-3.5 w-3.5 shrink-0 transition-transform duration-150',
              open && 'rotate-180',
              hasSelected ? txMute : txMute,
            )} />

            {/* Botão limpar tudo */}
            {hasSelected && (
              <button
                onClick={e => { e.stopPropagation(); onClear(); setOpen(false); }}
                className={cn('ml-0.5 opacity-50 hover:opacity-100 transition-opacity', txMute)}
                title="Limpar seleção"
                aria-label="Limpar todos os segmentos"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </button>

          {/* ── Dropdown panel ─────────────────────────────────────────── */}
          {open && (
            <div className={panelBase} role="listbox" aria-multiselectable>

              {/* Campo de busca — sempre visível */}
              <div className={cn('p-3 border-b', divCol)}>
                <div className="relative">
                  <MagnifyingGlassIcon className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5', txMute)} />
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar segmento..."
                    className={cn(
                      'w-full pl-8 pr-8 py-2 rounded-xl text-sm font-medium focus:outline-none transition-all',
                      isDark
                        ? 'bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/30'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20',
                    )}
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className={cn('absolute right-2.5 top-1/2 -translate-y-1/2', txMute)}>
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de segmentos */}
              <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
                {filtered.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className={cn('text-sm', txMute)}>
                      {search ? 'Nenhum segmento encontrado' : 'Nenhum segmento com atividade no período'}
                    </p>
                  </div>
                ) : (
                  filtered.map(seg => {
                    const isSelected = selected.includes(seg.id);
                    const p          = palFor(seg.slug, isDark);
                    return (
                      <button
                        key={seg.id}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onToggle(seg.id);
                          if (!isSelected) onActivate(seg.id);
                          setOpen(false);
                          setSearch('');
                        }}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                          isSelected
                            ? isDark ? 'bg-[rgba(255,255,255,0.04)]' : 'bg-indigo-50/60'
                            : rowHov,
                        )}
                      >
                        {/* Checkbox */}
                        <span className={cn(
                          'w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors',
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600'
                            : isDark ? 'border-[rgba(255,255,255,0.15)] bg-transparent' : 'border-slate-300 bg-white',
                        )}>
                          {isSelected && <CheckIcon className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                        </span>

                        {/* Dot colorido */}
                        <span className={cn('w-2 h-2 rounded-full shrink-0', p.dot)} />

                        {/* Nome + meta */}
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-semibold truncate', isSelected ? (isDark ? 'text-indigo-300' : 'text-indigo-700') : tx)}>
                            {seg.name}
                          </p>
                          {seg.isOwn && (
                            <p className={cn('text-[10px]', txMute)}>Segmento da sua empresa</p>
                          )}
                        </div>

                        {/* Badge de campanhas no período */}
                        <span className={cn(
                          'text-[10px] font-black px-2 py-0.5 rounded-full shrink-0',
                          isSelected
                            ? isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                            : isDark ? 'bg-[rgba(255,255,255,0.06)] text-slate-500' : 'bg-slate-100 text-slate-500',
                        )}>
                          {seg.campaignCount} camp.
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Rodapé — limpar seleção */}
              {hasSelected && (
                <div className={cn('p-3 border-t', divCol)}>
                  <button
                    onClick={() => { onClear(); setOpen(false); }}
                    className={cn(
                      'w-full text-center text-xs font-black py-2 rounded-xl transition-colors',
                      isDark
                        ? 'text-slate-500 hover:text-slate-300 hover:bg-[rgba(255,255,255,0.05)]'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    Limpar seleção
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Linha 2: abas (só quando 2+ segmentos ativos) ─────────────────── */}
      {multiMode && (
        <div className={cn(
          'flex items-center gap-0 mt-2 rounded-xl overflow-hidden border self-start',
          isDark ? 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]' : 'border-slate-200 bg-slate-50',
        )}>
          {selectedSegs.map(seg => {
            const isActive = activeSegment === seg.id;
            const p        = palFor(seg.slug, isDark);
            return (
              <button
                key={seg.id}
                onClick={() => onActivate(seg.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-[11px] font-black transition-all whitespace-nowrap',
                  isActive
                    ? cn(p.tabActive, p.tab, 'border-b-2')
                    : isDark
                      ? 'text-slate-500 hover:text-slate-300 hover:bg-[rgba(255,255,255,0.04)] border-b-2 border-b-transparent'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white border-b-2 border-b-transparent',
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', p.dot)} />
                {seg.name}
                <span className={cn('text-[9px] font-bold px-1 rounded', isDark ? 'bg-white/8' : 'bg-slate-200')}>
                  {seg.campaignCount}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSegmentSelector(params?: { startDate?: string; endDate?: string }) {
  const [segments,      setSegments]      = useState<SegmentOption[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [segmentFilter, setSegmentFilter] = useState<string[]>([]);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate)   qs.set('endDate',   params.endDate);

    fetch(`/api/admin/campanhas/segments${qs.size ? `?${qs}` : ''}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data: SegmentOption[]) => {
        const list = Array.isArray(data) ? data : [];
        setSegments(list);

        // Se há segmentos selecionados que deixaram de existir no novo período,
        // removê-los da seleção para evitar filtros fantasmas
        const validIds = new Set(list.map(s => s.id));
        setSegmentFilter(prev => {
          const next = prev.filter(id => validIds.has(id));
          setActiveSegment(cur => (cur && validIds.has(cur)) ? cur : (next[0] ?? null));
          return next;
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.startDate, params?.endDate]);

  function toggleSegment(segmentId: string) {
    setSegmentFilter(prev => {
      // Exclusive selection: clicking the active segment deselects it; clicking another replaces
      const next = prev.includes(segmentId) ? [] : [segmentId];
      setActiveSegment(next.length > 0 ? next[0] : null);
      return next;
    });
  }

  function activateSegment(segmentId: string) {
    setActiveSegment(segmentId);
  }

  function clearSegments() {
    setSegmentFilter([]);
    setActiveSegment(null);
  }

  return {
    segments,
    loading,
    segmentFilter,
    activeSegment,
    toggleSegment,
    activateSegment,
    clearSegments,
  };
}
