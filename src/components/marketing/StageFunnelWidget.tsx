'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, ChevronDownIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import type { FunnelData7, FunnelStage, ClientFilter } from '@/lib/marketing-api';
import { generateFunnelDiagnosis, updateCampaignFunnelStage } from '@/lib/marketing-api';
import { formatCurrency } from '@/lib/marketing-utils';

interface Props {
  data: FunnelData7;
  isDark?: boolean;
  clientId?: ClientFilter;
}

const STAGE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  TOF: {
    bg:     'bg-blue-50',
    border: 'border-blue-200',
    text:   'text-blue-700',
    badge:  'bg-blue-100 text-blue-700',
  },
  MOF: {
    bg:     'bg-indigo-50',
    border: 'border-indigo-200',
    text:   'text-indigo-700',
    badge:  'bg-indigo-100 text-indigo-700',
  },
  BOF: {
    bg:     'bg-emerald-50',
    border: 'border-emerald-200',
    text:   'text-emerald-700',
    badge:  'bg-emerald-100 text-emerald-700',
  },
};

function pct(n: number, decimals = 1) {
  return `${n.toFixed(decimals)}%`;
}

function compactCurrency(value: number) {
  if (value >= 1000) return `R$${(value / 1000).toFixed(1)}k`;
  if (value > 0)     return `R$${value.toFixed(0)}`;
  return 'R$0';
}

function RateArrow({ label, value, isBottleneck }: { label: string; value: number; isBottleneck?: boolean }) {
  const color = value === 0 ? 'text-slate-300' :
    value < 1 ? 'text-red-500' : value < 3 ? 'text-amber-500' : 'text-emerald-600';

  return (
    <div className="flex flex-col items-center justify-center shrink-0 w-10">
      <span className={`text-[8px] font-black uppercase tracking-widest mb-0.5 text-center leading-tight ${isBottleneck ? 'text-red-500' : 'text-slate-400'}`}>
        {label}
      </span>
      <div className={`flex items-center ${color}`}>
        <span className="text-[10px] font-black">{pct(value)}</span>
      </div>
      <div className="flex items-center mt-0.5">
        {isBottleneck && <ExclamationTriangleIcon className="h-2.5 w-2.5 text-red-400 mr-0.5" />}
        <svg className={`h-3 w-6 ${isBottleneck ? 'text-red-300' : 'text-slate-200'}`} viewBox="0 0 32 16" fill="none">
          <path d="M0 8 H26 M22 4 L28 8 L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function StageCard({ stage, isBottleneck, isDark }: { stage: FunnelStage; isBottleneck: boolean; isDark: boolean }) {
  const c = STAGE_COLORS[stage.code] ?? STAGE_COLORS.TOF;

  return (
    <div className={`flex-1 min-w-0 rounded-xl border-2 p-2.5 transition-all ${c.bg} ${c.border} ${isBottleneck ? 'ring-2 ring-red-300 ring-offset-1' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base shrink-0">{stage.icon}</span>
          <div className="min-w-0">
            <p className={`text-[9px] font-black uppercase tracking-widest truncate ${c.text}`}>{stage.label}</p>
            <p className="text-[8px] text-slate-400">{stage.campaigns_count} camp.</p>
          </div>
        </div>
        {isBottleneck && (
          <span className="text-[7px] font-black bg-red-100 text-red-600 border border-red-200 rounded-full px-1 py-0.5 uppercase tracking-wide shrink-0 ml-1">
            Gargalo
          </span>
        )}
      </div>

      <div className="space-y-1">
        {[
          { label: 'Invest.',  value: compactCurrency(stage.spend) },
          { label: 'Impr.',    value: stage.impressions > 0 ? (stage.impressions >= 1000 ? `${(stage.impressions/1000).toFixed(1)}k` : String(stage.impressions)) : '—' },
          { label: 'Cliques',  value: stage.clicks > 0 ? (stage.clicks >= 1000 ? `${(stage.clicks/1000).toFixed(1)}k` : String(stage.clicks)) : '—' },
          { label: 'Leads',    value: stage.leads > 0 ? String(stage.leads) : '—' },
        ].map(m => (
          <div key={m.label} className="flex justify-between items-center gap-1">
            <span className="text-[9px] text-slate-500 shrink-0">{m.label}</span>
            <span className={`text-[10px] font-bold truncate ${c.text}`}>{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const LEGEND_ITEMS = [
  { icon: '📢', label: 'TOF — Topo do Funil',   desc: 'Awareness · Traffic · Reach. Público frio, objetivo: visibilidade.' },
  { icon: '🎯', label: 'MOF — Meio do Funil',   desc: 'Engagement. Público morno, objetivo: interesse e consideração.' },
  { icon: '💰', label: 'BOF — Fundo do Funil',  desc: 'Leads · Sales · Conversions. Público quente, objetivo: converter.' },
  { icon: '→',  label: 'CTR',                   desc: 'Cliques ÷ Impressões × 100. Mede a atração do anúncio no Topo.' },
  { icon: '→',  label: 'Lead Rate',             desc: 'Leads ÷ Cliques × 100. Mede a conversão do clique em lead no Meio.' },
  { icon: '⚠️', label: 'Gargalo',               desc: 'Estágio com maior share de budget mas menor taxa de conversão ao próximo passo.' },
  { icon: '💲', label: 'CPL Geral',             desc: 'Custo Por Lead = Investimento Total ÷ Leads Totais do período.' },
];

export function StageFunnelWidget({ data, isDark = false, clientId }: Props) {
  const [diagnosis, setDiagnosis]     = useState<string | null>(null);
  const [diagnosing, setDiagnosing]   = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [diagError, setDiagError]     = useState<string | null>(null);
  const [showLegend, setShowLegend]   = useState(false);

  const { stages, conversionRates, bottleneck } = data;
  const tof = stages.find(s => s.code === 'TOF')!;
  const mof = stages.find(s => s.code === 'MOF')!;
  const bof = stages.find(s => s.code === 'BOF')!;

  const hasData = data.totals.spend > 0 || data.totals.impressions > 0;

  async function handleDiagnose() {
    if (diagnosis) {
      setShowDiagnosis(v => !v);
      return;
    }
    setDiagnosing(true);
    setDiagError(null);
    try {
      const result = await generateFunnelDiagnosis({
        stages, conversionRates, totals: data.totals,
        period: data.period, clientId,
      });
      setDiagnosis(result.diagnosis);
      setShowDiagnosis(true);
    } catch (e: any) {
      setDiagError(e?.response?.data?.error || e.message || 'Erro ao gerar diagnóstico');
    } finally {
      setDiagnosing(false);
    }
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <span className="text-3xl mb-2">📊</span>
        <p className="text-sm font-semibold text-slate-600 mb-1">Funil sem dados no período</p>
        <p className="text-xs text-slate-400">Sincronize métricas para ver os estágios do funil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Botão legenda ── */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowLegend(v => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
        >
          <InformationCircleIcon className="h-3.5 w-3.5" />
          {showLegend ? 'Ocultar legenda' : 'Como interpretar?'}
        </button>
      </div>

      {/* ── Painel legenda colapsável ── */}
      <AnimatePresence>
        {showLegend && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 grid grid-cols-1 gap-1.5">
              {LEGEND_ITEMS.map(item => (
                <div key={item.label} className="flex items-start gap-2">
                  <span className="text-sm shrink-0 w-5 text-center leading-tight">{item.icon}</span>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black text-slate-700">{item.label} </span>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Estágios + Taxas ── */}
      <div className="flex items-stretch gap-1.5">
        <StageCard stage={tof} isBottleneck={bottleneck === 'TOF'} isDark={isDark} />
        <RateArrow label="CTR" value={conversionRates.tof_ctr} isBottleneck={bottleneck === 'TOF'} />
        <StageCard stage={mof} isBottleneck={bottleneck === 'MOF'} isDark={isDark} />
        <RateArrow label="Lead Rate" value={conversionRates.mof_ltr} isBottleneck={bottleneck === 'MOF'} />
        <StageCard stage={bof} isBottleneck={bottleneck === 'BOF'} isDark={isDark} />
      </div>

      {/* ── Totais resumidos ── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Investimento Total', value: formatCurrency(data.totals.spend) },
          { label: 'Leads Totais',        value: String(data.totals.leads) },
          { label: 'CPL Geral',           value: data.totals.cpl > 0 ? formatCurrency(data.totals.cpl) : '—' },
        ].map(m => (
          <div key={m.label} className="bg-slate-50 rounded-xl border border-slate-100 px-3 py-2 text-center">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{m.label}</p>
            <p className="text-sm font-black text-slate-800">{m.value}</p>
          </div>
        ))}
      </div>

      {/* ── Botão Diagnóstico ── */}
      <div>
        <button
          onClick={handleDiagnose}
          disabled={diagnosing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all
            bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
        >
          {diagnosing ? (
            <><span className="h-3.5 w-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />Analisando funil...</>
          ) : (
            <>
              <SparklesIcon className="h-3.5 w-3.5" />
              {diagnosis ? (showDiagnosis ? 'Ocultar diagnóstico' : 'Ver diagnóstico da IA') : 'Diagnosticar gargalo com IA'}
              {diagnosis && <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${showDiagnosis ? 'rotate-180' : ''}`} />}
            </>
          )}
        </button>

        <AnimatePresence>
          {diagError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              ⚠️ {diagError}
            </div>
          )}
          {showDiagnosis && diagnosis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                <div className="flex items-center gap-1.5 mb-2">
                  <SparklesIcon className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Diagnóstico da IA</span>
                </div>
                <p className="text-xs text-indigo-900 leading-relaxed whitespace-pre-line">{diagnosis}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
