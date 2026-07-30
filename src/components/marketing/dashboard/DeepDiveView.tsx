import React from 'react';
import { motion } from 'framer-motion';
import { PeriodBadge } from './PeriodBadge'; // To be extracted
import { cn } from '@/lib/marketing-utils';

import { TimeToEventBar } from '@/components/marketing/charts/TimeToEventBar';
import { SignalTrajectory } from '@/components/marketing/charts/SignalTrajectory';
import { PredictionChart } from '@/components/marketing/charts/PredictionChart';
import { DemandRadar } from '@/components/marketing/charts/DemandRadar';
import { CampaignMapWidget } from '@/components/marketing/CampaignMapWidget';

import { SparklesIcon, ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { ExecuteGuard } from '@/components/admin/PermissionGuard';
import { BriefingCard } from '@/components/marketing/dashboard/BriefingCard';
import { WinningAngleChip } from '@/components/marketing/WinningAngleChip';
import { TrackingHealthWidget } from '@/components/marketing/TrackingHealthWidget';
import { HelpHint } from '@/components/marketing/DashboardHelpModal';
import { FarolSection } from '@/components/marketing/dashboard/FarolSection';

// Types
import type { PredictionData, AnticipationResult, TimeToEvent, Trajectory } from '@/lib/marketing-api';

interface DeepDiveViewProps {
  isDark: boolean;
  anticipationData: AnticipationResult[];
  predictions: PredictionData | null;
  campaigns: any[];
  cardBase: string;
  tx: string;
  txMuted: string;
  txFaint: string;
  periodLabel: string;
  periodBadgeLabel: string;
  predColors: string[];
  activeSegment: string | null;
  clientFilter: string;
  segmentPeriodStart: string;
  segmentPeriodEnd: string;
  dateRange: string;
  
  // New props for Briefing & AI Insights
  briefings: any[];
  briefingHistory: any[];
  showBriefingHistory: boolean;
  setShowBriefingHistory: (b: boolean) => void;
  generatingBriefing: boolean;
  handleGenerateBriefing: () => void;
  aiInsights: any[];
  aiInsightsBySegment: any[];
  hookSaturation: any;
}

export function DeepDiveView({
  isDark,
  anticipationData,
  predictions,
  campaigns,
  cardBase,
  tx,
  txMuted,
  txFaint,
  periodLabel,
  periodBadgeLabel,
  predColors,
  activeSegment,
  clientFilter,
  segmentPeriodStart,
  segmentPeriodEnd,
  dateRange,
  briefings,
  briefingHistory,
  showBriefingHistory,
  setShowBriefingHistory,
  generatingBriefing,
  handleGenerateBriefing,
  aiInsights,
  aiInsightsBySegment,
  hookSaturation,
}: DeepDiveViewProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ══════════════════════════════════════════════════════════════
          FAROL DE MILHA — Sinais Leading & Antecipação (FASE 8.5)
      ══════════════════════════════════════════════════════════════ */}
      <FarolSection isDark={isDark} periodLabel={periodBadgeLabel}>
        {anticipationData.length > 0 ? (
          <div className="space-y-6">
            {/* ── TimeToEvent bars ──────────────────────────────────── */}
            {(() => {
              const allEvents = anticipationData.flatMap(r =>
                r.events.map(e => ({ ...e, campaignId: r.campaignId }))
              );
              if (allEvents.length === 0) return null;
              return (
                <div>
                  <p className={cn('text-[10px] font-black uppercase tracking-widest mb-3', isDark ? 'text-cyan-700' : 'text-sky-500')}>
                    Contagem Regressiva de Eventos
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allEvents.map((e, i) => {
                      const campName = campaigns.find(c => c.id === e.campaignId)?.name;
                      return (
                        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                          <TimeToEventBar event={e as TimeToEvent} campaignName={campName} />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── Signal trajectories ───────────────────────────────── */}
            {(() => {
              const allTraj = anticipationData.flatMap(r => r.trajectories);
              if (allTraj.length === 0) return null;
              return (
                <div>
                  <p className={cn('text-[10px] font-black uppercase tracking-widest mb-3', isDark ? 'text-cyan-700' : 'text-sky-500')}>
                    Trajetória dos Sinais Leading
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {allTraj.map((traj, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <SignalTrajectory trajectory={traj as Trajectory} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : null}

        {/* ── Projeções legadas (regressão linear) ─────────────────── */}
        {predictions && !predictions.insufficientData && (
          <details className="mt-6 group" open>
            <summary className={cn(
              'flex items-center gap-2 cursor-pointer select-none text-[10px] font-black uppercase tracking-widest',
              isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-600'
            )}>
              <span className="transition-transform group-open:rotate-90">▶</span>
              Projeções por regressão linear (legado)
            </summary>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
              {([
                { label: 'Gasto Diário (R$)', color: predColors[0], hist: predictions.historical.spend, pred: predictions.spend,  fmt: (v: number) => `R$${v.toFixed(0)}` },
                { label: 'Leads Diários',     color: predColors[1], hist: predictions.historical.leads, pred: predictions.leads,  fmt: (v: number) => v.toFixed(0) },
                { label: 'CTR (%)',           color: predColors[2], hist: predictions.historical.ctr,   pred: predictions.ctr,    fmt: (v: number) => `${v.toFixed(2)}%` },
                { label: 'CPC (R$)',          color: predColors[3], hist: predictions.historical.cpc,   pred: predictions.cpc,    fmt: (v: number) => `R$${v.toFixed(2)}` },
              ] as const).map((p, i) => (
                <motion.div key={p.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className={cn('rounded-2xl p-6', cardBase)}>
                  <PredictionChart isDark={isDark} label={p.label} color={p.color}
                    historical={predictions.historical.dates.map((dt, j) => ({ date: dt, value: (p.hist as number[])[j] }))}
                    predictions={p.pred as any} formatter={p.fmt as any}
                    sigmaMult={predictions.sigmaMult} />
                </motion.div>
              ))}
            </div>
          </details>
        )}

        {/* ── Radar de Demanda + Geolocalização ─────────────────── */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <DemandRadar
            isDark={isDark}
            clientId={(clientFilter && clientFilter !== 'own') ? clientFilter as string : undefined}
            segmentId={activeSegment ?? undefined}
            periodDays={parseInt(dateRange) || 30}
          />
          <CampaignMapWidget
            isDark={isDark}
            clientId={clientFilter ?? null}
            segmentId={activeSegment ?? null}
            startDate={segmentPeriodStart}
            endDate={segmentPeriodEnd}
          />
        </div>
      </FarolSection>

      {/* ══════════════════════════════════════════════════════════════
          TRACKING HEALTH — Saúde do Tracking (FASE 8)
      ══════════════════════════════════════════════════════════════ */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl', isDark ? 'bg-rose-500/10' : 'bg-rose-50')}>
              <span className="text-base leading-none">🩺</span>
            </div>
            <div>
              <h2 className={cn('text-lg font-black', tx)}>Saúde do Rastreamento</h2>
              <p className={cn('text-xs', txMuted)}>Score 0-100 — monitoramento automático do tracking e pixel</p>
            </div>
          </div>
          <PeriodBadge label={periodBadgeLabel} isDark={isDark} />
        </div>
        {/* Tracking isolado pelo clientFilter + segmento ativo */}
        <TrackingHealthWidget
          clientId={(clientFilter && clientFilter !== 'own' && clientFilter !== 'segment') ? clientFilter as string : null}
          segmentId={activeSegment ?? null}
        />
      </div>

      {/* ── Briefing Estratégico AI ──────────────────────────────────── */}
      <div className="mb-8">
        <div className="mb-5">
          {/* Linha única: ícone + título + botões */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={cn('p-2.5 rounded-xl', isDark ? 'bg-violet-500/10' : 'bg-violet-50')}>
                <SparklesIcon className={cn('h-5 w-5', isDark ? 'text-violet-400' : 'text-violet-600')} />
              </div>
              <div>
                <h2 className={cn('text-lg font-black', tx)}>Resumo Estratégico provido pela Inteligência Artificial</h2>
                <p className={cn('text-xs', txMuted)}>Documento autônomo — período registrado na geração</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowBriefingHistory(!showBriefingHistory)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all',
                  isDark
                    ? 'bg-[rgba(255,255,255,0.05)] text-slate-400 hover:bg-[rgba(255,255,255,0.09)] border border-[rgba(255,255,255,0.06)]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}>
                <ClockIcon className="h-3.5 w-3.5" />
                {showBriefingHistory ? 'Ocultar' : 'Histórico'}
              </button>
              <ExecuteGuard resource="dashboard-campanhas">
                <button onClick={handleGenerateBriefing} disabled={generatingBriefing}
                  className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-violet-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/20">
                  {generatingBriefing
                    ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Gerando...</>
                    : <><SparklesIcon className="h-3.5 w-3.5" /> Gerar · {periodBadgeLabel}</>}
                </button>
              </ExecuteGuard>
            </div>
          </div>
        </div>

        {briefings.length > 0
          ? (
            <div className="space-y-5">
              {briefings.map(b => (
                <div key={b.id}>
                  {b.segmentName && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      <h3 className={cn('text-sm font-black', tx)}>{b.segmentName}</h3>
                    </div>
                  )}
                  <BriefingCard briefing={b} isDark={isDark} />
                </div>
              ))}
            </div>
          )
          : (
            <div className={cn('rounded-2xl p-10 text-center', cardBase)}>
              <p className={cn('text-sm font-black mb-1', tx)}>Nenhum briefing gerado ainda</p>
              <p className={cn('text-xs', txMuted)}>Clique em "Gerar Novo" ou aguarde o envio automático (08h e 18h).</p>
            </div>
          )}
        {showBriefingHistory && briefingHistory.length > briefings.length && (
          <div className="mt-4 space-y-3">
            <p className={cn('text-[10px] font-black uppercase tracking-widest', txFaint)}>Histórico</p>
            {briefingHistory.filter(b => !briefings.some(cur => cur.id === b.id)).map(b => (
              <BriefingCard key={b.id} briefing={b} isDark={isDark} compact />
            ))}
          </div>
        )}
      </div>

      {/* ── Ângulos Cobertura (FASE 14) ──────────────────────────────── */}
      <WinningAngleChip
        isDark={isDark}
        period={parseInt(dateRange) || 30}
        clientId={(clientFilter && clientFilter !== 'own') ? clientFilter : undefined}
      />

      {/* ── AI Insights (por segmento — FASE 18.2) ──────────────────── */}
      {(aiInsights.length > 0 || hookSaturation?.saturationAlert) && (() => {
        type IS = { border: string; badge: string; dot: string; glow: string };
        const ds: Record<string, IS> = {
          PAUSE:            { border: 'border-l-red-500',    badge: 'bg-red-500/10 text-red-400 border border-red-500/20',        dot: 'bg-red-500',    glow: 'shadow-[0_0_24px_rgba(239,68,68,0.07)]'    },
          SCALE:            { border: 'border-l-emerald-500',badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',dot:'bg-emerald-500',glow:'shadow-[0_0_24px_rgba(16,185,129,0.07)]' },
          OPTIMIZE:         { border: 'border-l-amber-500',  badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',   dot: 'bg-amber-500',  glow: 'shadow-[0_0_24px_rgba(245,158,11,0.07)]'  },
          ALERT:            { border: 'border-l-orange-500', badge: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', dot: 'bg-orange-500', glow: 'shadow-[0_0_24px_rgba(249,115,22,0.07)]'  },
          CREATIVE_FATIGUE: { border: 'border-l-violet-500', badge: 'bg-violet-500/10 text-violet-400 border border-violet-500/20', dot: 'bg-violet-500', glow: 'shadow-[0_0_24px_rgba(139,92,246,0.07)]'  },
        };
        const ls: Record<string, IS> = {
          PAUSE:            { border: 'border-l-red-500',    badge: 'bg-red-50 text-red-600 border border-red-100',             dot: 'bg-red-500',    glow: '' },
          SCALE:            { border: 'border-l-emerald-500',badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100', dot: 'bg-emerald-500',glow: '' },
          OPTIMIZE:         { border: 'border-l-amber-500',  badge: 'bg-amber-50 text-amber-700 border border-amber-100',       dot: 'bg-amber-500',  glow: '' },
          ALERT:            { border: 'border-l-orange-500', badge: 'bg-orange-50 text-orange-700 border border-orange-100',    dot: 'bg-orange-500', glow: '' },
          CREATIVE_FATIGUE: { border: 'border-l-violet-500', badge: 'bg-violet-50 text-violet-700 border border-violet-100',    dot: 'bg-violet-500', glow: '' },
        };
        const styles = isDark ? ds : ls;
        // Se o serviço não trouxe bySegment, cai num grupo único.
        const groups = aiInsightsBySegment.length > 0
          ? aiInsightsBySegment.filter(g => g.insights.length > 0)
          : [{ segmentId: null, segmentName: '', insights: aiInsights }];

        const renderCard = (insight: any, i: number) => {
          const s = styles[insight.type] || styles.ALERT;
          return (
            <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              className={cn(`rounded-2xl p-4 border-l-4 ${s.border} ${s.glow}`, cardBase)}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn(`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide`, s.badge)}>
                  <span className={cn(`w-1.5 h-1.5 rounded-full`, s.dot)} />{insight.type}
                </span>
                <span className={cn('text-[10px] font-bold', txFaint)}>
                  Confiança: {(insight.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <h4 className={cn('text-sm font-black mb-1', tx)}>{insight.title}</h4>
              <p className={cn('text-xs', txMuted)}>{insight.description}</p>
            </motion.div>
          );
        };

        return (
          <div className="mb-8">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className={cn('text-lg font-black flex items-center gap-2', tx)}>
                  Insights da IA
                  <HelpHint term="Insights de IA" isDark={isDark} />
                </h2>
                <p className={cn('text-xs mt-0.5', txMuted)}>Análise automática por segmento — benchmark próprio de cada segmento</p>
              </div>
              <PeriodBadge label={periodBadgeLabel} isDark={isDark} />
            </div>
            <div className="space-y-6">
              {/* Card CREATIVE_FATIGUE — nível de portfólio */}
              {hookSaturation?.saturationAlert && (() => {
                const hk = hookSaturation;
                const s = styles.CREATIVE_FATIGUE;
                return (
                  <motion.div
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    className={cn(`rounded-2xl p-4 border-l-4 ${s.border} ${s.glow}`, cardBase)}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wide`, s.badge)}>
                        <span className={cn(`w-1.5 h-1.5 rounded-full`, s.dot)} />CREATIVE_FATIGUE
                      </span>
                      <a href="/admin/campanhas/criativos/padroes"
                        className={`text-[10px] font-bold text-violet-500 hover:underline`}>
                        Ver análise →
                      </a>
                    </div>
                    <h4 className={cn('text-sm font-black mb-1 flex items-center gap-2', tx)}>
                      Saturação de Hook Criativo
                      <HelpHint term="Saúde Criativa & Saturação de Hook" isDark={isDark} />
                    </h4>
                    <p className={cn('text-xs', txMuted)}>
                      {hk.dominantShare}% dos criativos ativos usam o hook "{hk.hookStats[0]?.label}" — risco de fadiga de público.
                      {hk.suggestion && ` ${hk.suggestion}.`}
                      {' '}Diversidade criativa: {hk.diversityIndex}/100.
                    </p>
                  </motion.div>
                );
              })()}
              {groups.map((g, gi) => (
                <div key={g.segmentId ?? gi}>
                  {g.segmentName && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      <h3 className={cn('text-sm font-black', tx)}>{g.segmentName}</h3>
                      <span className={cn('text-[10px]', txFaint)}>· {g.insights.length} insight(s)</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {g.insights.map(renderCard)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
