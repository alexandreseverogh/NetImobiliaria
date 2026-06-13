'use client';
/**
 * SegmentNarrative — Narrativa de inteligência de segmento gerada por LLM.
 * Componente premium com reveal progressivo e estrutura por seções.
 * Análise gerada sob demanda (botão explícito — não carrega automaticamente).
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { cn, formatCurrency } from '@/lib/marketing-utils';
import { adminFetch } from '@/lib/auth/adminFetch';
import type { SegmentDashboardResponse } from '@/app/api/admin/campanhas/dashboard/segment/route';
import type { SegmentIntelligenceResult } from '@/lib/marketing/services/segmentIntelligenceService';

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SectionTitle({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <p className={cn('text-[9px] font-black uppercase tracking-[0.3em] mb-2', isDark ? 'text-slate-600' : 'text-slate-400')}>
      {children}
    </p>
  );
}

function BulletList({ items, color, isDark }: { items: string[]; color: string; isDark: boolean }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
          className="flex items-start gap-2.5"
        >
          <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', color)} />
          <span className={cn('text-sm leading-relaxed', isDark ? 'text-slate-300' : 'text-slate-700')}>
            {item}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}

function ActionItem({
  item, isDark,
}: {
  item: { clientName: string; priority: string; action: string };
  isDark: boolean;
}) {
  const pMap = {
    high:   { label: 'Alta',   bg: isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-700 border-red-100', dot: 'bg-red-500' },
    medium: { label: 'Média',  bg: isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' },
    low:    { label: 'Baixa',  bg: isDark ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-500' },
  };
  const cfg = pMap[item.priority as keyof typeof pMap] ?? pMap.medium;
  return (
    <div className={cn('rounded-xl p-3.5', isDark ? 'bg-white/[0.03] border border-white/6' : 'bg-slate-50 border border-slate-100')}>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className={cn('text-xs font-black', isDark ? 'text-slate-200' : 'text-slate-800')}>
          {item.clientName}
        </span>
        <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider inline-flex items-center gap-1', cfg.bg)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          {cfg.label}
        </span>
      </div>
      <p className={cn('text-sm leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-600')}>
        {item.action}
      </p>
    </div>
  );
}

// ─── Padrões detectados (motor determinístico) ────────────────────────────────

function PatternCard({
  pattern, isDark,
}: {
  pattern: SegmentIntelligenceResult['patterns'][number];
  isDark: boolean;
}) {
  const typeMap = {
    cpl_rising:         { icon: '📈', color: isDark ? 'border-l-red-500'    : 'border-l-red-500',     label: 'CPL em Alta'         },
    ctr_low:            { icon: '📉', color: isDark ? 'border-l-amber-500'  : 'border-l-amber-500',   label: 'CTR Baixo'           },
    fatigue:            { icon: '😴', color: isDark ? 'border-l-orange-500' : 'border-l-orange-500',  label: 'Fadiga Criativa'     },
    no_leads:           { icon: '⚠️', color: isDark ? 'border-l-red-500'    : 'border-l-red-500',     label: 'Sem Conversões'      },
    scale_opportunity:  { icon: '🚀', color: isDark ? 'border-l-emerald-500': 'border-l-emerald-500', label: 'Oportunidade'        },
  };
  const cfg = typeMap[pattern.type] ?? { icon: '•', color: 'border-l-slate-500', label: pattern.type };
  return (
    <div className={cn(
      'rounded-xl p-4 border-l-4',
      cfg.color,
      isDark ? 'bg-white/[0.03] border-y border-r border-white/5' : 'bg-white border-y border-r border-slate-100',
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-base leading-none">{cfg.icon}</span>
        <span className={cn('text-[10px] font-black uppercase tracking-wider', isDark ? 'text-slate-300' : 'text-slate-700')}>{cfg.label}</span>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', isDark ? 'bg-white/8 text-slate-400' : 'bg-slate-100 text-slate-500')}>
          {pattern.clientCount} cliente{pattern.clientCount !== 1 ? 's' : ''}
        </span>
      </div>
      <p className={cn('text-xs leading-relaxed', isDark ? 'text-slate-400' : 'text-slate-600')}>
        {pattern.description}
      </p>
      {pattern.affectedClients.length > 0 && (
        <p className={cn('text-[10px] mt-1.5 font-medium', isDark ? 'text-slate-600' : 'text-slate-400')}>
          {pattern.affectedClients.join(' · ')}
        </p>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  segmentData: SegmentDashboardResponse;
  isDark?: boolean;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SegmentNarrative({ segmentData, isDark = true }: Props) {
  const [result,     setResult]     = useState<SegmentIntelligenceResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const cardBase = isDark
    ? 'bg-[rgba(13,20,33,0.92)] backdrop-blur-sm border border-white/7 shadow-[0_2px_16px_rgba(0,0,0,0.5)]'
    : 'bg-white border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)]';
  const tx      = isDark ? 'text-slate-300' : 'text-slate-900';
  const txMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const txFaint = isDark ? 'text-slate-500' : 'text-slate-400';
  const divider = isDark ? 'border-white/5'  : 'border-slate-100';

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await adminFetch('/api/admin/campanhas/segment-intelligence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentData }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data: SegmentIntelligenceResult = await res.json();
      setResult(data);
    } catch (e: any) {
      setError('Erro ao gerar análise. Verifique as configurações do LLM.');
    } finally {
      setGenerating(false);
    }
  }

  const narrative = result?.narrative;
  const patterns  = result?.patterns ?? [];
  const angles    = result?.anglesSummary ?? [];
  const vocab     = segmentData.segment.vocabulary ?? {};
  const totalClients = (segmentData.clients.length) + (segmentData.tenantOwn ? 1 : 0);

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <div className="flex items-center gap-3">
          <div className={cn('p-2.5 rounded-xl', isDark ? 'bg-violet-500/10' : 'bg-violet-50')}>
            <SparklesIcon className={cn('h-5 w-5', isDark ? 'text-violet-400' : 'text-violet-600')} />
          </div>
          <div>
            <h2 className={cn('text-lg font-black', tx)}>Inteligência do Segmento</h2>
            <p className={cn('text-xs mt-0.5', txMuted)}>
              Análise LLM com {totalClients} cliente{totalClients !== 1 ? 's' : ''} · {segmentData.segment.name}
            </p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-violet-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/20"
        >
          {generating
            ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />Analisando...</>
            : <><SparklesIcon  className="h-3.5 w-3.5" />{result ? 'Reanalisar' : 'Gerar Análise'}</>
          }
        </button>
      </div>

      {/* ── Estado: não gerado ─────────────────────────────────────────────── */}
      {!result && !generating && (
        <div className={cn('rounded-2xl p-12 text-center', cardBase)}>
          <div className={cn('w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl', isDark ? 'bg-violet-500/10' : 'bg-violet-50')}>
            🧠
          </div>
          <p className={cn('text-sm font-black mb-1', tx)}>Análise não gerada</p>
          <p className={cn('text-xs leading-relaxed max-w-sm mx-auto', txMuted)}>
            Clique em "Gerar Análise" para que o modelo LLM interprete os dados do segmento{' '}
            <strong className={isDark ? 'text-violet-400' : 'text-violet-600'}>{segmentData.segment.name}</strong>{' '}
            com {totalClients} cliente{totalClients !== 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {/* ── Estado: gerando ────────────────────────────────────────────────── */}
      {generating && (
        <div className={cn('rounded-2xl p-12 text-center', cardBase)}>
          <div className="flex justify-center mb-4">
            <ArrowPathIcon className={cn('h-8 w-8 animate-spin', isDark ? 'text-violet-400' : 'text-violet-600')} />
          </div>
          <p className={cn('text-sm font-black mb-1', tx)}>Analisando {totalClients} clientes...</p>
          <p className={cn('text-xs', txMuted)}>O modelo está processando os dados do segmento {segmentData.segment.name}.</p>
        </div>
      )}

      {/* ── Erro ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className={cn('rounded-2xl p-4 mb-4 border-l-4 border-l-red-500', isDark ? 'bg-red-500/5 border-r border-y border-red-500/20' : 'bg-red-50 border-r border-y border-red-100')}>
          <p className={cn('text-sm', isDark ? 'text-red-400' : 'text-red-600')}>{error}</p>
        </div>
      )}

      {/* ── Resultado ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Padrões detectados (motor determinístico) */}
            {patterns.length > 0 && (
              <div className={cn('rounded-2xl p-5', cardBase)}>
                <SectionTitle isDark={isDark}>Padrões Detectados · Motor de Regras</SectionTitle>
                <div className="space-y-3">
                  {patterns.map((p, i) => <PatternCard key={i} pattern={p} isDark={isDark} />)}
                </div>
              </div>
            )}

            {/* Diagnóstico geral */}
            {narrative?.segmentDiagnosis && (
              <div className={cn('rounded-2xl p-5', cardBase)}>
                <SectionTitle isDark={isDark}>Diagnóstico do Segmento</SectionTitle>
                <p className={cn('text-sm leading-relaxed', txMuted)}>{narrative.segmentDiagnosis}</p>
                {narrative.benchmarkContext && (
                  <p className={cn('text-xs leading-relaxed mt-3 pt-3 border-t', txFaint, divider)}>
                    <strong className={isDark ? 'text-slate-500' : 'text-slate-400'}>Contexto dos benchmarks: </strong>
                    {narrative.benchmarkContext}
                  </p>
                )}
              </div>
            )}

            {/* Grid: Top Performer + Alertas */}
            {(narrative?.topPerformerInsights?.length || narrative?.criticalAlerts?.length) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {narrative?.topPerformerInsights?.length ? (
                  <div className={cn('rounded-2xl p-5', cardBase)}>
                    <SectionTitle isDark={isDark}>🏆 O que o Melhor está Fazendo</SectionTitle>
                    <BulletList items={narrative.topPerformerInsights} color="bg-emerald-500" isDark={isDark} />
                  </div>
                ) : null}
                {narrative?.criticalAlerts?.length ? (
                  <div className={cn('rounded-2xl p-5 border-l-4 border-l-red-500', cardBase)}>
                    <SectionTitle isDark={isDark}>⚡ Alertas Críticos</SectionTitle>
                    <BulletList items={narrative.criticalAlerts} color="bg-red-500" isDark={isDark} />
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Padrões cross-cliente */}
            {narrative?.crossClientPatterns?.length ? (
              <div className={cn('rounded-2xl p-5', cardBase)}>
                <SectionTitle isDark={isDark}>🔗 Padrões Cross-Cliente · Sinais de Mercado</SectionTitle>
                <BulletList items={narrative.crossClientPatterns} color="bg-blue-500" isDark={isDark} />
              </div>
            ) : null}

            {/* Oportunidades */}
            {narrative?.segmentOpportunities?.length ? (
              <div className={cn('rounded-2xl p-5', cardBase)}>
                <SectionTitle isDark={isDark}>💡 Oportunidades do Segmento</SectionTitle>
                <BulletList items={narrative.segmentOpportunities} color="bg-violet-500" isDark={isDark} />
              </div>
            ) : null}

            {/* Ações por cliente */}
            {narrative?.clientSpecificActions?.length ? (
              <div className={cn('rounded-2xl p-5', cardBase)}>
                <SectionTitle isDark={isDark}>🎯 Ações por Cliente</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {narrative.clientSpecificActions
                    .sort((a, b) => (a.priority === 'high' ? -1 : b.priority === 'high' ? 1 : 0))
                    .map((item, i) => <ActionItem key={i} item={item} isDark={isDark} />)}
                </div>
              </div>
            ) : null}

            {/* Ângulos criativos */}
            {angles.length > 0 && (
              <div className={cn('rounded-2xl p-5', cardBase)}>
                <SectionTitle isDark={isDark}>🎨 Ângulos Criativos em Uso</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {angles.map((a, i) => (
                    <div key={i} className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold',
                      isDark ? 'bg-white/4 border-white/8 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700',
                    )}>
                      <span className="font-black capitalize">{a.angle}</span>
                      <span className={cn('text-[10px]', txFaint)}>{a.clientCount}×</span>
                      {a.avgCpl != null && (
                        <span className={cn('text-[10px]', isDark ? 'text-emerald-400' : 'text-emerald-600')}>
                          {formatCurrency(a.avgCpl)} CPL
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer de metadados */}
            <p className={cn('text-[10px] text-right', txFaint)}>
              Análise gerada em {new Date(result.generatedAt).toLocaleString('pt-BR')} · {segmentData.segment.name}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
