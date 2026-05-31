'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparklesIcon, ChevronDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
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

function RateArrow({ label, value, isBottleneck }: { label: string; value: number; isBottleneck?: boolean }) {
  const color = value === 0 ? 'text-slate-300' :
    value < 1 ? 'text-red-500' : value < 3 ? 'text-amber-500' : 'text-emerald-600';

  return (
    <div className="flex flex-col items-center justify-center shrink-0 w-16">
      <span className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isBottleneck ? 'text-red-500' : 'text-slate-400'}`}>
        {label}
      </span>
      <div className={`flex items-center gap-1 ${color}`}>
        <span className="text-xs font-black">{pct(value)}</span>
      </div>
      <div className="flex items-center mt-0.5">
        {isBottleneck && <ExclamationTriangleIcon className="h-3 w-3 text-red-400 mr-0.5" />}
        <svg className={`h-4 w-8 ${isBottleneck ? 'text-red-300' : 'text-slate-200'}`} viewBox="0 0 32 16" fill="none">
          <path d="M0 8 H26 M22 4 L28 8 L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function StageCard({ stage, isBottleneck, isDark }: { stage: FunnelStage; isBottleneck: boolean; isDark: boolean }) {
  const c = STAGE_COLORS[stage.code] ?? STAGE_COLORS.TOF;

  return (
    <div className={`flex-1 rounded-2xl border-2 p-4 transition-all ${c.bg} ${c.border} ${isBottleneck ? 'ring-2 ring-red-300 ring-offset-1' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{stage.icon}</span>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${c.text}`}>{stage.label}</p>
            <p className="text-[9px] text-slate-400">{stage.campaigns_count} campanha{stage.campaigns_count !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {isBottleneck && (
          <span className="text-[8px] font-black bg-red-100 text-red-600 border border-red-200 rounded-full px-1.5 py-0.5 uppercase tracking-wide">
            Gargalo
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {[
          { label: 'Investido',    value: formatCurrency(stage.spend) },
          { label: 'Impressões',   value: stage.impressions > 0 ? stage.impressions.toLocaleString('pt-BR') : '—' },
          { label: 'Cliques',      value: stage.clicks > 0       ? stage.clicks.toLocaleString('pt-BR')      : '—' },
          { label: 'Leads',        value: stage.leads > 0        ? String(stage.leads)                        : '—' },
        ].map(m => (
          <div key={m.label} className="flex justify-between items-center">
            <span className="text-[10px] text-slate-500">{m.label}</span>
            <span className={`text-xs font-bold ${c.text}`}>{m.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StageFunnelWidget({ data, isDark = false, clientId }: Props) {
  const [diagnosis, setDiagnosis]     = useState<string | null>(null);
  const [diagnosing, setDiagnosing]   = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [diagError, setDiagError]     = useState<string | null>(null);

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
    <div className="space-y-4">
      {/* ── Estágios + Taxas ── */}
      <div className="flex items-center gap-2">
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
