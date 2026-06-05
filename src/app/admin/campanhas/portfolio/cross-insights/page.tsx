'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon, ArrowPathIcon, ArrowLeftIcon,
  LightBulbIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon,
  TrophyIcon, ChevronDownIcon, ChevronUpIcon,
  ChatBubbleLeftRightIcon, FunnelIcon,
} from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import { formatCurrency } from '@/lib/marketing-utils';
import type {
  CrossInsightsResponse,
  CrossInsight,
  CrossPerformer,
  CrossSegment,
} from '@/app/api/admin/campanhas/portfolio/cross-insights/route';
import type { AngleStat, AngleInsightsResult } from '@/lib/marketing/services/angleInsightsService';

/* ── cores de segmento (badge) ──────────────────────────────────── */

const SEG_COLORS: Record<string, string> = {
  imobiliaria: 'bg-blue-50   text-blue-700   border-blue-200',
  saude:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  carros:      'bg-orange-50 text-orange-700  border-orange-200',
  educacao:    'bg-violet-50 text-violet-700  border-violet-200',
  geral:       'bg-slate-50  text-slate-600   border-slate-200',
};
function segColor(name: string | null): string {
  if (!name) return 'bg-gray-50 text-gray-500 border-gray-200';
  const slug = name.toLowerCase().replace(/\s+/g, '');
  return SEG_COLORS[slug] ?? 'bg-indigo-50 text-indigo-600 border-indigo-200';
}

/* ── InsightCard ────────────────────────────────────────────────── */

function InsightCard({ insight, index }: { insight: CrossInsight; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const cfg = {
    opportunity: {
      icon:       <LightBulbIcon className="h-5 w-5" />,
      color:      'bg-emerald-50 border-emerald-200',
      badge:      'bg-emerald-100 text-emerald-700',
      header:     'text-emerald-700',
      actionBg:   'bg-emerald-100/60',
      actionText: 'text-emerald-900',
      bullet:     'bg-emerald-400',
      label:      'Oportunidade',
    },
    warning: {
      icon:       <ExclamationTriangleIcon className="h-5 w-5" />,
      color:      'bg-red-50 border-red-200',
      badge:      'bg-red-100 text-red-700',
      header:     'text-red-700',
      actionBg:   'bg-red-100/60',
      actionText: 'text-red-900',
      bullet:     'bg-red-400',
      label:      'Alerta',
    },
    pattern: {
      icon:       <ArrowTrendingUpIcon className="h-5 w-5" />,
      color:      'bg-indigo-50 border-indigo-200',
      badge:      'bg-indigo-100 text-indigo-700',
      header:     'text-indigo-700',
      actionBg:   'bg-indigo-100/60',
      actionText: 'text-indigo-900',
      bullet:     'bg-indigo-400',
      label:      'Padrão',
    },
  }[insight.type];

  const actions: string[] = (insight as any).actions ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-2xl border p-5 ${cfg.color}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${cfg.header}`}>{cfg.icon}</div>
        <div className="flex-1 min-w-0">

          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
            {insight.segmentName && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${segColor(insight.segmentName)}`}>
                {insight.segmentName}
              </span>
            )}
            {insight.metric && (
              <span className="text-xs text-gray-500 bg-white/70 px-2 py-0.5 rounded-full border border-gray-200">
                {insight.metric}
              </span>
            )}
            {insight.improvement && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {insight.improvement}
              </span>
            )}
            {(insight as any).actionsSource === 'ai' && (
              <span className="text-[10px] font-black text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full border border-violet-300 flex items-center gap-1 ml-auto">
                <SparklesIcon className="h-2.5 w-2.5" />
                IA
              </span>
            )}
          </div>

          <p className={`font-semibold text-sm ${cfg.header} mb-1`}>{insight.title}</p>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">{insight.description}</p>

          {(insight.sourceClients.length > 0 || insight.targetClients.length > 0) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {insight.sourceClients.map(c => (
                <span key={c} className="text-xs bg-white/80 border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">
                  📤 referência: {c}
                </span>
              ))}
              {insight.targetClients.map(c => (
                <span key={c} className="text-xs bg-white/80 border border-gray-200 px-2 py-0.5 rounded-full text-gray-500">
                  🎯 foco: {c}
                </span>
              ))}
            </div>
          )}

          {actions.length > 0 && (
            <>
              <button
                onClick={() => setExpanded(v => !v)}
                className={`mt-1 text-xs font-semibold flex items-center gap-1 transition ${cfg.header} opacity-80 hover:opacity-100`}
              >
                {expanded
                  ? <><ChevronUpIcon className="h-3 w-3" />Ocultar ações</>
                  : <><ChevronDownIcon className="h-3 w-3" />O que fazer ({actions.length} passos)</>}
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <ol className={`mt-3 rounded-xl p-4 space-y-2 ${cfg.actionBg}`}>
                      {actions.map((action, i) => (
                        <li key={i} className={`flex items-start gap-2.5 text-xs leading-relaxed ${cfg.actionText}`}>
                          <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${cfg.bullet}`} />
                          {action}
                        </li>
                      ))}
                    </ol>

                    {/* Indicador de origem das ações */}
                    {(insight as any).actionsSource === 'ai' ? (
                      <p className="mt-2 text-[10px] font-semibold text-violet-600 flex items-center gap-1">
                        <SparklesIcon className="h-3 w-3 shrink-0" />
                        Ações geradas por IA com base nos dados reais deste cliente
                      </p>
                    ) : insight.type === 'warning' && (
                      <p className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
                        <SparklesIcon className="h-3 w-3 shrink-0 opacity-40" />
                        Ações padrão · clique em{' '}
                        <strong className="text-violet-500 font-black">✨ Análise IA</strong>
                        {' '}para personalizar com os dados reais deste cliente
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── RankedTable — todos os performers ranqueados por CPL ───────── */

const MEDALS = ['🥇', '🥈', '🥉'];
const INITIAL_ROWS = 8;

function RankedTable({ performers }: { performers: CrossPerformer[] }) {
  const [expanded, setExpanded] = useState(false);

  if (performers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
        Nenhum cliente com dados no período selecionado.
      </div>
    );
  }

  const visible = expanded ? performers : performers.slice(0, INITIAL_ROWS);
  const hidden  = performers.length - INITIAL_ROWS;
  const withCpl = performers.filter(p => p.cpl !== null);
  const maxCpl  = withCpl.length > 0 ? Math.max(...withCpl.map(p => p.cpl!)) : 1;

  function rowStyle(p: CrossPerformer, rank: number): string {
    if (rank <= 3 && p.cpl !== null) return 'bg-emerald-50/60 hover:bg-emerald-50';
    if (p.status === 'critical')     return 'bg-red-50/50    hover:bg-red-50';
    if (p.status === 'warn')         return 'bg-amber-50/40  hover:bg-amber-50';
    return 'hover:bg-gray-50';
  }

  function barColor(p: CrossPerformer, rank: number): string {
    if (rank <= 3 && p.cpl !== null) return 'bg-emerald-500';
    if (p.status === 'critical')     return 'bg-red-400';
    if (p.status === 'warn')         return 'bg-amber-400';
    return 'bg-indigo-400';
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

      {/* Cabeçalho da tabela */}
      <div className="hidden sm:grid sm:grid-cols-[40px_1fr_110px_180px_64px_90px] gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">#</span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Segmento</span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CPL</span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Leads</span>
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Investido</span>
      </div>

      {/* Linhas */}
      <div className="divide-y divide-gray-50/80">
        {visible.map((p, i) => {
          const rank = i + 1;
          return (
            <motion.div
              key={p.clientName}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`grid grid-cols-[40px_1fr_auto] sm:grid-cols-[40px_1fr_110px_180px_64px_90px] gap-x-3 gap-y-1 px-5 py-4 items-center transition-colors ${rowStyle(p, rank)}`}
            >
              {/* Rank / medal */}
              <span className="text-base font-black text-center leading-none">
                {rank <= 3 && p.cpl !== null ? MEDALS[rank - 1] : (
                  <span className="text-xs font-bold text-gray-400">{rank}</span>
                )}
              </span>

              {/* Nome + status label */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.clientName}</p>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {rank <= 3 && p.cpl !== null && (
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wide">✅ top {rank}</span>
                  )}
                  {p.status === 'critical' && (
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-wide">⚠️ crítico</span>
                  )}
                  {p.status === 'warn' && (
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-wide">⚡ atenção</span>
                  )}
                  {p.status === 'nodata' && (
                    <span className="text-[9px] font-medium text-gray-400">sem dados</span>
                  )}
                  {/* Segmento visível só em mobile */}
                  <span className={`sm:hidden text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${segColor(p.segmentName)}`}>
                    {p.segmentName ?? '—'}
                  </span>
                </div>
              </div>

              {/* CPL em mobile (à direita na grid de 3 colunas) */}
              {p.cpl !== null ? (
                <div className="sm:hidden text-right">
                  <p className="text-sm font-bold text-gray-800 tabular-nums">R$ {p.cpl.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">por lead</p>
                </div>
              ) : (
                <span className="sm:hidden text-xs text-gray-400 italic text-right">sem leads</span>
              )}

              {/* Segmento badge — desktop */}
              <span className={`hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border self-center ${segColor(p.segmentName)}`}>
                {p.segmentName ?? '—'}
              </span>

              {/* Barra de CPL — desktop */}
              {p.cpl !== null ? (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-800 w-[68px] text-right shrink-0 tabular-nums">
                    R$ {p.cpl.toFixed(2)}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor(p, rank)}`}
                      style={{ width: `${Math.min((p.cpl / maxCpl) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <span className="hidden sm:block text-xs text-gray-400 italic">sem leads</span>
              )}

              {/* Leads — desktop */}
              <span className="hidden sm:block text-xs font-medium text-gray-600 text-right tabular-nums">
                {p.leads}
              </span>

              {/* Investido — desktop */}
              <span className="hidden sm:block text-xs font-medium text-gray-600 text-right tabular-nums">
                {formatCurrency(p.spend)}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Toggle expandir/recolher */}
      {performers.length > INITIAL_ROWS && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full py-3 text-xs font-semibold transition-colors border-t border-gray-100 flex items-center justify-center gap-1.5 text-indigo-600 hover:bg-indigo-50"
        >
          {expanded ? (
            <><ChevronUpIcon className="h-3.5 w-3.5" />Recolher</>
          ) : (
            <><ChevronDownIcon className="h-3.5 w-3.5" />Ver mais {hidden} cliente{hidden !== 1 ? 's' : ''}</>
          )}
        </button>
      )}
    </div>
  );
}

/* ── AngleWidget ──────────────────────────────────────────────────── */

interface AngleApiResult extends AngleInsightsResult {
  narrative?: string | null;
}

function AngleCplBar({ cpl, maxCpl }: { cpl: number | null; maxCpl: number }) {
  if (cpl === null || maxCpl === 0) return <span className="text-xs text-gray-400">—</span>;
  const pct   = Math.min((cpl / (maxCpl * 1.1)) * 100, 100);
  const color = cpl === maxCpl ? 'bg-red-400' : cpl < maxCpl * 0.6 ? 'bg-emerald-500' : 'bg-amber-400';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <span className="text-xs font-bold text-gray-800 w-16 text-right shrink-0">{formatCurrency(cpl)}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AngleWidget({ period }: { period: string }) {
  const [data,       setData]       = useState<AngleApiResult | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminFetch(`/api/admin/campanhas/portfolio/angle-insights?period=${period}`)
      .then(r => r.json()).then(setData).catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const generateNarrative = async () => {
    setGenerating(true);
    try {
      const r = await adminFetch(`/api/admin/campanhas/portfolio/angle-insights?period=${period}&narrative=true`);
      setData(await r.json());
    } finally { setGenerating(false); }
  };

  const maxCpl   = data?.angleStats.filter(s => s.cpl !== null).reduce((m, s) => Math.max(m, s.cpl!), 0) ?? 0;
  const maxSpend = data?.angleStats.reduce((m, s) => Math.max(m, s.spend), 0) ?? 0;

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="h-5 w-5 text-violet-500" />
          Performance por Ângulo
        </h2>
        <button
          onClick={generateNarrative}
          disabled={generating || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 disabled:opacity-50 transition shadow-sm"
        >
          {generating ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <SparklesIcon className="h-3.5 w-3.5" />}
          {generating ? 'Analisando...' : 'Análise IA'}
        </button>
      </div>

      {loading ? (
        <div className="h-40 bg-white rounded-2xl border border-gray-100 animate-pulse" />
      ) : !data || data.angleStats.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
          Nenhuma campanha com ângulo registrado no período.<br />
          <span className="text-xs">Declare o ângulo ao lançar campanhas ou edite campanhas existentes.</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

          {data.narrative && (
            <div className="px-5 pt-5 pb-0">
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="h-4 w-4 text-violet-600" />
                  <span className="text-xs font-semibold text-violet-700">Análise IA — Ângulos</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{data.narrative}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-b border-gray-100">
            {data.topAngle && (
              <div className="flex items-center gap-3 p-5 border-r border-gray-100">
                <span className="text-2xl">✅</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ângulo Vencedor</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{data.topAngle.label}</p>
                  <p className="text-xs text-gray-500">
                    CPL {formatCurrency(data.topAngle.cpl ?? 0)} · {data.topAngle.campaigns} campanha{data.topAngle.campaigns !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
            {data.worstAngle ? (
              <div className="flex items-center gap-3 p-5">
                <span className="text-2xl">⚠️</span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Ângulo Fraco</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{data.worstAngle.label}</p>
                  <p className="text-xs text-gray-500">
                    CPL {formatCurrency(data.worstAngle.cpl ?? 0)} · {data.worstAngle.campaigns} campanha{data.worstAngle.campaigns !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-5">
                <span className="text-sm text-gray-400">Dados insuficientes para comparação</span>
              </div>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            <div className="grid grid-cols-[1fr_56px_80px_140px_80px] gap-3 px-5 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Ângulo</span>
              <span className="text-right">Camp.</span>
              <span className="text-right">CTR</span>
              <span className="text-right">CPL</span>
              <span className="text-right">Investido</span>
            </div>
            {data.angleStats.map((s, i) => {
              const spendPct = maxSpend > 0 ? (s.spend / maxSpend) * 100 : 0;
              const isWinner = data.topAngle?.angle === s.angle;
              const isWorst  = data.worstAngle?.angle === s.angle;
              return (
                <motion.div
                  key={s.angle}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`grid grid-cols-[1fr_56px_80px_140px_80px] gap-3 px-5 py-3.5 items-center hover:bg-gray-50 transition-colors ${isWinner ? 'bg-emerald-50/40' : isWorst ? 'bg-amber-50/30' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1 h-8 rounded-full bg-gray-200 relative shrink-0">
                      <div className="absolute bottom-0 left-0 w-full rounded-full bg-indigo-400 transition-all" style={{ height: `${spendPct}%` }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{s.label}</p>
                      {isWinner && <span className="text-[10px] font-black text-emerald-600 uppercase">✅ melhor</span>}
                      {isWorst  && <span className="text-[10px] font-black text-amber-600 uppercase">⚠️ revisar</span>}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 text-right font-medium">{s.campaigns}</span>
                  <span className="text-xs text-gray-600 text-right font-medium">
                    {s.ctr > 0 ? `${s.ctr.toFixed(2)}%` : '—'}
                  </span>
                  <div className="flex justify-end">
                    <AngleCplBar cpl={s.cpl} maxCpl={maxCpl} />
                  </div>
                  <span className="text-xs text-gray-600 text-right font-medium">{formatCurrency(s.spend)}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

/* ── main ─────────────────────────────────────────────────────────── */

export default function CrossInsightsPage() {
  const [data,       setData]       = useState<CrossInsightsResponse | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [aiWarning,  setAiWarning]  = useState<string | null>(null);
  const [period,     setPeriod]     = useState('30');
  const [segment,    setSegment]    = useState('');   // '' = todos

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const segParam = segment ? `&segmentId=${segment}` : '';
      const res  = await adminFetch(`/api/admin/campanhas/portfolio/cross-insights?period=${period}${segParam}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar insights');
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period, segment]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setAiWarning(null);
    try {
      const res  = await adminFetch('/api/admin/campanhas/portfolio/cross-insights', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ period: parseInt(period), segmentId: segment || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao gerar insights');
      setData(json);

      // Exibe aviso se LLM falhou no enriquecimento de ações críticas
      if (json.aiError) {
        setAiWarning(json.aiError);
      } else if (!json.aiEnriched && (json.insights ?? []).some((i: any) => i.id?.startsWith('critical-'))) {
        setAiWarning('LLM não enriqueceu as ações críticas. Verifique se cplCritical está configurado para o segmento.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  /* Segmentos disponíveis: carregados na resposta, nunca hardcoded */
  const segments: CrossSegment[] = data?.segments ?? [];

  const insightGroups = {
    warning:     data?.insights.filter(i => i.type === 'warning')     ?? [],
    opportunity: data?.insights.filter(i => i.type === 'opportunity') ?? [],
    pattern:     data?.insights.filter(i => i.type === 'pattern')     ?? [],
  };

  const activeSegmentName = segments.find(s => s.id === segment)?.name ?? null;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* ── Cabeçalho ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <a
              href="/admin/campanhas/portfolio"
              className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition"
            >
              <ArrowLeftIcon className="h-4 w-4 text-gray-600" />
            </a>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <SparklesIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Insights Cruzados</h1>
              <p className="text-sm text-gray-500">
                Padrões transferíveis entre clientes
                {activeSegmentName && (
                  <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${segColor(activeSegmentName)}`}>
                    {activeSegmentName}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Período */}
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="text-sm text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="7">7 dias</option>
              <option value="14">14 dias</option>
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
            </select>

            {/* Filtro de segmento — só aparece se há ≥ 2 segmentos */}
            {segments.length >= 2 && (
              <div className="relative">
                <FunnelIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <select
                  value={segment}
                  onChange={e => setSegment(e.target.value)}
                  className="text-sm text-gray-700 bg-white border border-gray-200 rounded-xl pl-7 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  title="Filtrar por segmento"
                >
                  <option value="">Todos os segmentos</option>
                  {segments.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.clientCount})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-sm text-white hover:opacity-90 transition shadow-sm"
            >
              {generating
                ? <ArrowPathIcon className="h-4 w-4 animate-spin" />
                : <SparklesIcon className="h-4 w-4" />}
              {generating ? 'Gerando...' : 'Análise IA'}
            </button>
          </div>
        </div>

        {/* ── Aviso de filtro de segmento ativo ─────────────────────── */}
        {activeSegmentName && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-700"
          >
            <FunnelIcon className="h-4 w-4 shrink-0" />
            <span>Exibindo apenas clientes do segmento <strong>{activeSegmentName}</strong>. Insights são comparações dentro deste segmento.</span>
            <button
              onClick={() => setSegment('')}
              className="ml-auto text-xs font-semibold text-indigo-500 hover:text-indigo-700 shrink-0"
            >
              Limpar filtro ×
            </button>
          </motion.div>
        )}

        {/* ── Erro ──────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            {error}
            <button onClick={load} className="ml-auto underline font-medium">Tentar novamente</button>
          </div>
        )}

        {/* ── Aviso LLM ─────────────────────────────────────────────── */}
        {aiWarning && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2"
          >
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold mb-0.5">Análise IA não pôde enriquecer as ações</p>
              <p className="text-xs text-amber-700 break-words">{aiWarning}</p>
              <p className="text-xs text-amber-600 mt-1">
                Verifique: <strong>Master → IA da Plataforma</strong> (API Key configurada) e se o segmento tem <strong>CPL Crítico</strong> definido.
              </p>
            </div>
            <button onClick={() => setAiWarning(null)} className="shrink-0 text-amber-400 hover:text-amber-600 text-lg leading-none">×</button>
          </motion.div>
        )}

        {/* ── Loading skeleton ───────────────────────────────────────── */}
        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && data && (
          <>
            {/* ── Narrativa LLM ─────────────────────────────────────── */}
            {data.narrative && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-6 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-2xl"
              >
                <div className="flex items-center gap-2 mb-3">
                  <SparklesIcon className="h-5 w-5 text-violet-600" />
                  <span className="text-sm font-semibold text-violet-700">Análise IA do Portfólio</span>
                  <span className="text-[10px] text-violet-400 bg-violet-100 px-2 py-0.5 rounded-full ml-auto">
                    {new Date(data.generatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{data.narrative}</p>
              </motion.div>
            )}

            {/* ── Sem dados ─────────────────────────────────────────── */}
            {data.totalClients === 0 ? (
              <div className="text-center py-20">
                <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">
                  {activeSegmentName
                    ? `Nenhum cliente no segmento "${activeSegmentName}" com campanhas no período`
                    : 'Nenhum cliente com campanhas no período'}
                </p>
                <p className="text-gray-400 text-sm mt-1">Adicione clientes e lance campanhas para ver insights cruzados</p>
              </div>
            ) : (
              <div className="space-y-8">

                {/* ── Ranking completo de CPL ──────────────────────── */}
                {data.allPerformers.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <TrophyIcon className="h-5 w-5 text-amber-500" />
                      <h2 className="font-bold text-gray-900">Ranking de CPL do Portfólio</h2>
                      <span className="text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        {data.allPerformers.filter(p => p.cpl !== null).length} cliente{data.allPerformers.filter(p => p.cpl !== null).length !== 1 ? 's' : ''} com CPL
                      </span>
                      {activeSegmentName && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${segColor(activeSegmentName)}`}>
                          {activeSegmentName}
                        </span>
                      )}
                    </div>
                    <RankedTable performers={data.allPerformers} />

                    {/* Nota informativa sobre comparação cross-segment */}
                    {!activeSegmentName && segments.length >= 2 && (
                      <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
                        <span>ℹ️</span>
                        CPL absoluto não é comparável entre segmentos diferentes.
                        Use o filtro de segmento para comparações válidas.
                      </p>
                    )}
                  </section>
                )}

                {/* ── Alertas críticos ──────────────────────────────── */}
                {insightGroups.warning.length > 0 && (
                  <section>
                    <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      Alertas que exigem ação
                      <span className="text-xs font-normal text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                        {insightGroups.warning.length}
                      </span>
                    </h2>
                    <div className="space-y-3">
                      {insightGroups.warning.map((ins, i) => <InsightCard key={ins.id} insight={ins} index={i} />)}
                    </div>
                  </section>
                )}

                {/* ── Oportunidades ─────────────────────────────────── */}
                {insightGroups.opportunity.length > 0 && (
                  <section>
                    <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <LightBulbIcon className="h-5 w-5 text-emerald-500" />
                      Oportunidades de transferência
                      <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {insightGroups.opportunity.length}
                      </span>
                    </h2>
                    <div className="space-y-3">
                      {insightGroups.opportunity.map((ins, i) => <InsightCard key={ins.id} insight={ins} index={i} />)}
                    </div>
                  </section>
                )}

                {/* ── Padrões ───────────────────────────────────────── */}
                {insightGroups.pattern.length > 0 && (
                  <section>
                    <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <ArrowTrendingUpIcon className="h-5 w-5 text-indigo-500" />
                      Padrões identificados
                      <span className="text-xs font-normal text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {insightGroups.pattern.length}
                      </span>
                    </h2>
                    <div className="space-y-3">
                      {insightGroups.pattern.map((ins, i) => <InsightCard key={ins.id} insight={ins} index={i} />)}
                    </div>
                  </section>
                )}

                {/* ── Sem insights ──────────────────────────────────── */}
                {data.insights.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <SparklesIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Portfólio equilibrado</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {activeSegmentName
                        ? `Clientes do segmento "${activeSegmentName}" operam dentro dos benchmarks.`
                        : 'Todos os clientes operam dentro dos benchmarks.'}
                      {' '}Use "Análise IA" para insights mais profundos.
                    </p>
                  </div>
                )}

                {/* ── Performance por Ângulo ────────────────────────── */}
                <AngleWidget period={period} />

              </div>
            )}

            {/* ── Rodapé informativo ────────────────────────────────── */}
            <p className="text-center text-xs text-gray-400 mt-8">
              Últimos {period} dias · {data.totalClients} cliente{data.totalClients !== 1 ? 's' : ''}
              {activeSegmentName ? ` no segmento "${activeSegmentName}"` : ' no portfólio'}
              {' · '}Insights gerados apenas entre clientes do mesmo segmento
              {data.narrative ? ' · +análise IA' : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
