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

import { useState, useEffect, useRef, type CSSProperties } from 'react';
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

// ─── Cor real por segmento (system_segments.color_theme) ─────────────────────
// Antes desta correção, este componente ignorava `colorTheme` (o hex que o
// Master de fato escolhe em /admin/master/segments, com paleta de swatches +
// input customizado) e usava uma paleta fixa por slug — a personalização do
// Master nunca tinha efeito nenhum aqui, só na própria tela de gestão dele.
// Tailwind não consegue gerar classe a partir de um hex vindo do banco em
// runtime (JIT precisa da string literal em tempo de build), então a cor real
// é aplicada via estilo inline; hex+alfa (`${cor}26`) é 8-dígitos CSS válido
// em todos os browsers evergreen.
const FALLBACK_COLOR = '#6366f1'; // indigo — só se colorTheme vier nulo/vazio

function themeStyleFor(colorTheme: string | null | undefined, isDark: boolean) {
  const c = colorTheme || FALLBACK_COLOR;
  const dot: CSSProperties = { backgroundColor: c };
  const chip: CSSProperties = {
    backgroundColor: c + (isDark ? '26' : '14'),
    color: c,
    borderColor: c + (isDark ? '4D' : '33'),
  };
  const tabText: CSSProperties = { color: c };
  const tabBorder: CSSProperties = { borderBottomColor: c };
  const tabActive: CSSProperties = { backgroundColor: c + (isDark ? '1A' : '14') };
  return { dot, chip, tabText, tabBorder, tabActive };
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
      ? 'ring-2 ring-gold-premium/30 border-gold-premium/40'
      : 'ring-2 ring-gold-premium/20 border-gold-premium/40'),
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
                  const p = themeStyleFor(seg.colorTheme, isDark);
                  return (
                    <span
                      key={seg.id}
                      className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-lg border"
                      style={p.chip}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={p.dot} />
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
                        ? 'bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-600/50'
                        : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600/30',
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
                    const p          = themeStyleFor(seg.colorTheme, isDark);
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
                            ? isDark ? 'bg-[rgba(255,255,255,0.04)]' : 'bg-amber-50/60'
                            : rowHov,
                        )}
                      >
                        {/* Checkbox — único indicador de seleção (Regra do Acento Único: não
                            duplicar o mesmo sinal em cor de texto + badge + checkbox) */}
                        <span className={cn(
                          'w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors',
                          isSelected
                            ? 'bg-gold-premium border-gold-premium'
                            : isDark ? 'border-[rgba(255,255,255,0.15)] bg-transparent' : 'border-slate-300 bg-white',
                        )}>
                          {isSelected && <CheckIcon className="h-2.5 w-2.5 text-navy-dark" strokeWidth={3} />}
                        </span>

                        {/* Dot colorido */}
                        <span className="w-2 h-2 rounded-full shrink-0" style={p.dot} />

                        {/* Nome + meta */}
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-semibold truncate', tx)}>
                            {seg.name}
                          </p>
                          {seg.isOwn && (
                            <p className={cn('text-[10px]', txMute)}>Segmento da sua empresa</p>
                          )}
                        </div>

                        {/* Badge de campanhas no período */}
                        <span className={cn(
                          'text-[10px] font-black px-2 py-0.5 rounded-full shrink-0',
                          isDark ? 'bg-[rgba(255,255,255,0.06)] text-slate-500' : 'bg-slate-100 text-slate-500',
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
            const p        = themeStyleFor(seg.colorTheme, isDark);
            return (
              <button
                key={seg.id}
                onClick={() => onActivate(seg.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-[11px] font-black transition-all whitespace-nowrap border-b-2',
                  !isActive && (isDark
                    ? 'text-slate-500 hover:text-slate-300 hover:bg-[rgba(255,255,255,0.04)] border-b-transparent'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white border-b-transparent'),
                )}
                style={isActive ? { ...p.tabActive, ...p.tabText, ...p.tabBorder } : undefined}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={p.dot} />
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
