'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon, ArrowPathIcon, ArrowLeftIcon,
  LightBulbIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon,
  TrophyIcon, ChevronDownIcon, ChevronUpIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import { formatCurrency } from '@/lib/marketing-utils';
import type { CrossInsightsResponse, CrossInsight } from '@/app/api/admin/campanhas/portfolio/cross-insights/route';
import type { AngleStat, AngleInsightsResult } from '@/lib/marketing/services/angleInsightsService';

/* ── tipo badge de insight ──────────────────────────────────────────── */

function InsightCard({ insight, index }: { insight: CrossInsight; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const cfg = {
    opportunity: {
      icon:       <LightBulbIcon className="h-5 w-5" />,
      color:      'bg-emerald-50 border-emerald-200',
      badge:      'bg-emerald-100 text-emerald-700',
      header:     'text-emerald-700',
      actionBg:   'bg-emerald-100/60',
      actionText: 'text-emerald-800',
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

          {/* ── badges de tipo / métrica / melhoria ── */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
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
          </div>

          {/* ── título ── */}
          <p className={`font-semibold text-sm ${cfg.header} mb-1`}>{insight.title}</p>

          {/* ── descrição — sempre visível ── */}
          <p className="text-sm text-gray-600 leading-relaxed mb-2">{insight.description}</p>

          {/* ── chips de clientes envolvidos ── */}
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

          {/* ── toggle: ações recomendadas ── */}
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

/* ── performer card ─────────────────────────────────────────────────── */

function PerformerCard({ name, cpl, spend, rank }: {
  name: string; cpl: number | null; spend: number; rank: number;
}) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
      <span className="text-2xl">{medals[rank] ?? '🏅'}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm truncate">{name}</p>
        <p className="text-xs text-gray-400">{formatCurrency(spend)} investido</p>
      </div>
      {cpl !== null && (
        <div className="text-right shrink-0">
          <p className="font-bold text-emerald-600 text-sm">{formatCurrency(cpl)}</p>
          <p className="text-[10px] text-gray-400">por lead</p>
        </div>
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
  const [data,        setData]        = useState<AngleApiResult | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);

  useEffect(() => {
    setLoading(true);
    adminFetch(`/api/admin/campanhas/portfolio/angle-insights?period=${period}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const generateNarrative = async () => {
    setGenerating(true);
    try {
      const r = await adminFetch(
        `/api/admin/campanhas/portfolio/angle-insights?period=${period}&narrative=true`,
      );
      const d = await r.json();
      setData(d);
    } finally {
      setGenerating(false);
    }
  };

  const maxCpl = data?.angleStats
    .filter(s => s.cpl !== null)
    .reduce((m, s) => Math.max(m, s.cpl!), 0) ?? 0;

  const maxSpend = data?.angleStats
    .reduce((m, s) => Math.max(m, s.spend), 0) ?? 0;

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="h-5 w-5 text-violet-500" />
          Performance por Ângulo
          <span className="text-xs font-normal text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
            FASE 14
          </span>
        </h2>
        <button
          onClick={generateNarrative}
          disabled={generating || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 disabled:opacity-50 transition shadow-sm"
        >
          {generating
            ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
            : <SparklesIcon className="h-3.5 w-3.5" />}
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

          {/* LLM Narrative */}
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

          {/* Winner / Loser summary */}
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

          {/* Per-angle table */}
          <div className="divide-y divide-gray-50">
            {/* Header */}
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
                    {/* Spend bar */}
                    <div className="w-1 h-8 rounded-full bg-gray-200 relative shrink-0">
                      <div
                        className="absolute bottom-0 left-0 w-full rounded-full bg-indigo-400 transition-all"
                        style={{ height: `${spendPct}%` }}
                      />
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
                  <span className="text-xs text-gray-600 text-right font-medium">
                    {formatCurrency(s.spend)}
                  </span>
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
  const [data,      setData]      = useState<CrossInsightsResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [period,    setPeriod]    = useState('30');
  const [top,       setTop]       = useState('3');   // FASE 13 — Top N configurável

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await adminFetch(`/api/admin/campanhas/portfolio/cross-insights?period=${period}&top=${top}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar insights');
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [period, top]);

  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res  = await adminFetch('/api/admin/campanhas/portfolio/cross-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: parseInt(period), top: parseInt(top) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao gerar insights');
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  /* ── render ────────────────────────────────────────────────────── */

  const insightGroups = {
    warning:     data?.insights.filter(i => i.type === 'warning')     ?? [],
    opportunity: data?.insights.filter(i => i.type === 'opportunity') ?? [],
    pattern:     data?.insights.filter(i => i.type === 'pattern')     ?? [],
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* ── header ──────────────────────────────────────────────── */}
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
              <p className="text-sm text-gray-500">Padrões transferíveis entre clientes do portfólio</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="text-sm text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none"
            >
              <option value="7">7 dias</option>
              <option value="14">14 dias</option>
              <option value="30">30 dias</option>
              <option value="60">60 dias</option>
              <option value="90">90 dias</option>
            </select>

            <select
              value={top}
              onChange={e => setTop(e.target.value)}
              className="text-sm text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none"
              title="Quantos melhores CPLs exibir"
            >
              <option value="3">Top 3</option>
              <option value="5">Top 5</option>
              <option value="10">Top 10</option>
            </select>

            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
              Atualizar
            </button>

            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-sm text-white hover:opacity-90 transition shadow-sm"
            >
              {generating
                ? <ArrowPathIcon className="h-4 w-4 animate-spin" />
                : <SparklesIcon className="h-4 w-4" />}
              {generating ? 'Gerando análise...' : 'Gerar análise IA'}
            </button>
          </div>
        </div>

        {/* ── erro ────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
            {error}
            <button onClick={load} className="ml-auto underline font-medium">Tentar novamente</button>
          </div>
        )}

        {/* ── loading ─────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && data && (
          <>
            {/* ── narrativa LLM ────────────────────────────────────── */}
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

            {/* ── sem dados ────────────────────────────────────────── */}
            {data.totalClients === 0 ? (
              <div className="text-center py-20">
                <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Nenhum cliente com campanhas no período</p>
                <p className="text-gray-400 text-sm mt-1">Adicione clientes e lance campanhas para ver insights cruzados</p>
              </div>
            ) : (
              <div className="space-y-8">

                {/* ── top performers ───────────────────────────────── */}
                {data.topPerformers.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <TrophyIcon className="h-5 w-5 text-amber-500" />
                      <h2 className="font-bold text-gray-900">Melhores CPLs do Portfólio</h2>
                      <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        {data.topPerformers.length >= data.top
                          ? `Top ${data.topPerformers.length}`
                          : `Top ${data.topPerformers.length} de ${data.top}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {data.topPerformers.map((p, i) => (
                        <PerformerCard key={p.clientName} name={p.clientName} cpl={p.cpl} spend={p.spend} rank={i} />
                      ))}
                    </div>
                  </section>
                )}

                {/* ── alertas críticos ─────────────────────────────── */}
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

                {/* ── oportunidades ────────────────────────────────── */}
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

                {/* ── padrões ─────────────────────────────────────── */}
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

                {/* ── sem insights ─────────────────────────────────── */}
                {data.insights.length === 0 && (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <SparklesIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Portfólio equilibrado</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Todos os clientes operam dentro dos benchmarks. Use "Gerar análise IA" para insights mais profundos.
                    </p>
                  </div>
                )}

                {/* ── FASE 14: performance por ângulo ──────────────── */}
                <AngleWidget period={period} />
              </div>
            )}

            {/* ── disclaimer ───────────────────────────────────────── */}
            <p className="text-center text-xs text-gray-400 mt-8">
              Insights baseados em dados dos últimos {period} dias · {data.totalClients} cliente{data.totalClients !== 1 ? 's' : ''}
              {' · '}Análise rule-based{data.narrative ? ' + IA' : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
