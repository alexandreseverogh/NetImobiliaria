'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChartBarIcon, SparklesIcon, ArrowLeftIcon, ArrowPathIcon,
  TrophyIcon, XMarkIcon, LightBulbIcon, CheckIcon, RocketLaunchIcon,
  ExclamationTriangleIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector';
import { DashboardHelpButton, HelpHint } from '@/components/marketing/DashboardHelpModal';
import type { HookSaturationResult } from '@/lib/marketing/services/hookSaturationService';
import { ANGLE_LABELS as SHARED_ANGLE_LABELS } from '@/lib/marketing/angles';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Pattern {
  hook_type: string | null;
  is_ugc_style: boolean | null;
  angle: string | null;
  emotional_tone: string | null;
  is_corporate_style: boolean | null;
  ads_count: number;
  avg_ctr: number | null;
  avg_cpc: number | null;
  total_spend: number | null;
  avg_cpl: number | null;
  sample_ads: Array<{ assetId: string; adId: string; adName: string; storageUrl: string }> | null;
}

interface Concept {
  format: string;
  scene: string;
  hook_text: string;
  body: string;
  headline: string;
  cta: string;
  why_it_works: string;
}

// ── Label maps ─────────────────────────────────────────────────────────────────
const HOOK_LABELS: Record<string, string> = {
  urgency: 'Urgência', curiosity: 'Curiosidade', social_proof: 'Prova Social',
  benefit: 'Benefício', story: 'História', problem: 'Problema',
  price: 'Preço', investment: 'Investimento', lifestyle: 'Lifestyle',
  family: 'Família', social: 'Social', luxury: 'Luxo', other: 'Outro',
};
// Fonte única de taxonomia de ângulo (src/lib/marketing/angles.ts) — indexação solta
// (Record<string,string>) preservada aqui de propósito, pro código existente abaixo (que
// testa presença de chave por string arbitrária) continuar igual, sem duplicar as traduções.
const ANGLE_LABELS: Record<string, string> = SHARED_ANGLE_LABELS;
const TONE_LABELS: Record<string, string> = {
  aspirational: 'Aspiracional', fear: 'Medo', joy: 'Alegria',
  trust: 'Confiança', excitement: 'Empolgação', neutral: 'Neutro',
};
const FORMAT_LABELS: Record<string, string> = {
  image: '🖼️ Imagem', video_15s: '🎬 Vídeo 15s', video_30s: '🎬 Vídeo 30s', carousel: '🎠 Carrossel',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function patternLabel(p: Pattern): string {
  const parts: string[] = [];
  if (p.is_ugc_style) parts.push('UGC');
  else if (p.is_corporate_style) parts.push('Corporativo');
  if (p.hook_type && HOOK_LABELS[p.hook_type]) parts.push(`Hook ${HOOK_LABELS[p.hook_type]}`);
  if (p.angle && ANGLE_LABELS[p.angle]) parts.push(`Ângulo ${ANGLE_LABELS[p.angle]}`);
  return parts.join(' + ') || 'Padrão Geral';
}

function fmtBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function rank(i: number) {
  if (i === 0) return { icon: '🥇', color: 'border-amber-300 bg-amber-50' };
  if (i === 1) return { icon: '🥈', color: 'border-slate-300 bg-slate-50' };
  if (i === 2) return { icon: '🥉', color: 'border-orange-200 bg-orange-50' };
  return { icon: `#${i + 1}`, color: 'border-slate-200 bg-white' };
}

// ── Concept modal ──────────────────────────────────────────────────────────────
function ConceptModal({ concepts, pattern, onClose }: {
  concepts: Concept[];
  pattern: Pattern;
  onClose: () => void;
}) {
  const [saved, setSaved] = useState<number[]>([]);
  const router = useRouter();

  function useInWizard(c: Concept) {
    const params = new URLSearchParams();
    if (c.body)      params.set('body',      c.body);
    if (c.headline)  params.set('headline',  c.headline);
    if (c.hook_text) params.set('hookText',  c.hook_text);
    router.push(`/admin/campanhas/nova?${params.toString()}`);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LightBulbIcon className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-black text-slate-900">5 Conceitos Gerados pela IA</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4">
          <p className="text-xs text-slate-500 mb-4">
            Baseado no padrão: <strong>{patternLabel(pattern)}</strong>
            {pattern.avg_ctr && ` · CTR médio ${pattern.avg_ctr}%`}
            {pattern.avg_cpl && ` · CPL médio ${fmtBRL(pattern.avg_cpl)}`}
          </p>

          <div className="space-y-4">
            {concepts.map((c, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-200 transition-all">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-700">{i + 1}.</span>
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {FORMAT_LABELS[c.format] ?? c.format}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSaved(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        saved.includes(i)
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {saved.includes(i) ? <><CheckIcon className="h-3 w-3" /> Salvo</> : 'Salvar'}
                    </button>
                    <button
                      onClick={() => useInWizard(c)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                      title="Pré-preenche o wizard de campanha com este copy"
                    >
                      <RocketLaunchIcon className="h-3 w-3" />
                      Usar no Wizard
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wide text-[9px]">Cena</span>
                    <p className="text-slate-700 mt-0.5">{c.scene}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
                    <span className="font-bold text-amber-600 uppercase tracking-wide text-[9px]">Hook</span>
                    <p className="text-amber-800 font-semibold mt-0.5">"{c.hook_text}"</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wide text-[9px]">Headline</span>
                    <p className="text-slate-800 font-bold mt-0.5">{c.headline}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wide text-[9px]">Copy</span>
                    <p className="text-slate-700 mt-0.5">{c.body}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-500 uppercase tracking-wide text-[9px]">CTA</span>
                      <p className="text-indigo-700 font-semibold mt-0.5">{c.cta}</p>
                    </div>
                    <div className="text-right max-w-[50%]">
                      <span className="font-bold text-slate-500 uppercase tracking-wide text-[9px]">Por que funciona</span>
                      <p className="text-slate-500 text-[10px] mt-0.5">{c.why_it_works}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {saved.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-xs font-medium text-green-700 flex items-center gap-2">
              <CheckIcon className="h-4 w-4 flex-shrink-0" />
              {saved.length} conceito{saved.length > 1 ? 's' : ''} marcado{saved.length > 1 ? 's' : ''} para produção
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Hook Health Card ───────────────────────────────────────────────────────────
const HOOK_COLORS: Record<string, string> = {
  urgency:      'bg-red-500',
  curiosity:    'bg-violet-500',
  social_proof: 'bg-emerald-500',
  benefit:      'bg-blue-500',
  story:        'bg-amber-500',
  problem:      'bg-orange-500',
  other:        'bg-slate-400',
};

function HookHealthCard({ data }: { data: HookSaturationResult }) {
  const { hookStats, diversityIndex, dominantHook, dominantShare, saturationAlert, suggestion, totalCreatives } = data;

  const scoreColor = diversityIndex >= 70
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : diversityIndex >= 40
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200';
  const scoreLabel = diversityIndex >= 70 ? 'Alta' : diversityIndex >= 40 ? 'Média' : 'Baixa';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-2 rounded-2xl p-5 mb-6 bg-white border-slate-200"
    >
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <ShieldCheckIcon className="h-5 w-5 text-slate-500 flex-shrink-0" />
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              Saúde Criativa
              <HelpHint term="Saúde Criativa & Saturação de Hook" />
            </h2>
            <p className="text-[10px] text-slate-500">
              Distribuição de hooks · {totalCreatives} criativo{totalCreatives !== 1 ? 's' : ''} analisado{totalCreatives !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black ${scoreColor}`}>
          {diversityIndex}/100 · Diversidade {scoreLabel}
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-2 mb-4">
        {hookStats.map(h => (
          <div key={h.hookType} className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-600 w-24 flex-shrink-0 text-right">
              {h.label}
            </span>
            <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${h.share}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`h-full rounded-full ${HOOK_COLORS[h.hookType] ?? 'bg-slate-400'} ${
                  h.hookType === dominantHook && saturationAlert ? 'opacity-90' : 'opacity-70'
                }`}
              />
            </div>
            <span className="text-[10px] font-black text-slate-700 w-10 text-right">{h.share}%</span>
            {h.avgCtr != null && (
              <span className="text-[9px] text-slate-400 w-20 hidden md:block">
                CTR {h.avgCtr.toFixed(1)}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Alert / OK */}
      {saturationAlert ? (() => {
        const isCritical = dominantShare >= 70;
        const bg    = isCritical ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
        const icon  = isCritical ? 'text-red-500' : 'text-amber-500';
        const title = isCritical ? 'text-red-800' : 'text-amber-800';
        const sub   = isCritical ? 'text-red-600' : 'text-amber-600';
        const label = data.hookStats.find(h => h.hookType === dominantHook)?.label;
        return (
          <div className={`flex items-start gap-2.5 p-3 border rounded-xl ${bg}`}>
            <ExclamationTriangleIcon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${icon}`} />
            <div>
              <p className={`text-xs font-black ${title}`}>
                {isCritical ? 'Saturação crítica' : 'Atenção: concentração de hook'} — {dominantShare}% usam "{label}"
              </p>
              {suggestion && (
                <p className={`text-[10px] mt-0.5 ${sub}`}>{suggestion}</p>
              )}
            </div>
          </div>
        );
      })() : (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
          <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          <p className="text-[10px] font-bold text-emerald-700">
            Portfólio criativo diversificado — ótimo para evitar fadiga de público
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ── Pattern card ───────────────────────────────────────────────────────────────
function PatternCard({ pattern, index, onGenerateConcepts }: {
  pattern: Pattern;
  index: number;
  onGenerateConcepts: (p: Pattern) => void;
}) {
  const { icon, color } = rank(index);
  const isLoser = pattern.avg_ctr !== null && pattern.avg_ctr < 0.5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`border-2 rounded-2xl p-5 ${color} ${isLoser ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{icon}</span>
          <div>
            <h3 className="text-sm font-black text-slate-900">{patternLabel(pattern)}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {pattern.ads_count} anúncio{pattern.ads_count !== 1 ? 's' : ''} testado{pattern.ads_count !== 1 ? 's' : ''}
              {isLoser && ' · ⚠️ Performance abaixo'}
            </p>
          </div>
        </div>
        {!isLoser && (
          <button
            onClick={() => onGenerateConcepts(pattern)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex-shrink-0"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            Gerar conceitos
          </button>
        )}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'CTR', value: pattern.avg_ctr != null ? `${pattern.avg_ctr}%` : '—' },
          { label: 'CPC', value: pattern.avg_cpc != null ? fmtBRL(pattern.avg_cpc) : '—' },
          { label: 'CPL', value: pattern.avg_cpl != null ? fmtBRL(pattern.avg_cpl) : '—' },
          { label: 'Investido', value: pattern.total_spend != null ? fmtBRL(pattern.total_spend) : '—' },
        ].map(m => (
          <div key={m.label} className="text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{m.label}</p>
            <p className="text-sm font-black text-slate-800 mt-0.5">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Tags do padrão */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {pattern.is_ugc_style && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-violet-100 text-violet-700 uppercase tracking-wide">UGC</span>
        )}
        {pattern.is_corporate_style && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-700 uppercase tracking-wide">Corporativo</span>
        )}
        {pattern.hook_type && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-700 uppercase tracking-wide">
            Hook: {HOOK_LABELS[pattern.hook_type] ?? pattern.hook_type}
          </span>
        )}
        {pattern.angle && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-700 uppercase tracking-wide">
            {ANGLE_LABELS[pattern.angle] ?? pattern.angle}
          </span>
        )}
        {pattern.emotional_tone && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-green-100 text-green-700 uppercase tracking-wide">
            {TONE_LABELS[pattern.emotional_tone] ?? pattern.emotional_tone}
          </span>
        )}
      </div>

      {/* Thumbnails */}
      {pattern.sample_ads && pattern.sample_ads.length > 0 && (
        <div className="flex gap-1.5">
          {pattern.sample_ads.slice(0, 4).map((ad, j) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={j} src={ad.storageUrl} alt={ad.adName}
              className="w-10 h-10 rounded-lg object-cover border border-white shadow-sm"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ))}
          {(pattern.sample_ads.length > 4) && (
            <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-600">
              +{pattern.sample_ads.length - 4}
            </div>
          )}
        </div>
      )}

      {isLoser && (
        <div className="mt-3 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-[10px] font-medium text-red-600">
          💡 Recomendação: pausar anúncios deste padrão — CTR abaixo de 0.5%
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function PadroesPage() {
  const [patterns, setPatterns]     = useState<Pattern[]>([]);
  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState(false);
  const [concepts, setConcepts]     = useState<Concept[]>([]);
  const [activePattern, setActivePattern] = useState<Pattern | null>(null);
  const [hookHealth, setHookHealth] = useState<HookSaturationResult | null>(null);

  // ClientSelector — ALTA PRIORIDADE (CLAUDE.md)
  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('padroes');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (clientFilter && clientFilter !== 'all') params.set('clientId', clientFilter);
    const qs = params.toString();
    Promise.all([
      adminFetch(`/api/admin/campanhas/criativos/patterns?${qs}`)
        .then(r => r.ok ? r.json() : { patterns: [] }),
      adminFetch(`/api/admin/campanhas/criativos/hook-saturation?${qs}`)
        .then(r => r.ok ? r.json() : null),
    ])
      .then(([pData, hData]) => {
        setPatterns(pData.patterns || []);
        setHookHealth(hData && hData.totalCreatives > 0 ? hData : null);
      })
      .finally(() => setLoading(false));
  }, [clientFilter]);

  async function handleGenerateConcepts(p: Pattern) {
    setGenerating(true);
    setActivePattern(p);
    try {
      const res = await adminFetch('/api/admin/campanhas/criativos/concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hookType:     p.hook_type,
          angle:        p.angle,
          emotionalTone: p.emotional_tone,
          isUgc:        p.is_ugc_style,
          avgCtr:       p.avg_ctr,
          avgCpl:       p.avg_cpl,
          adsCount:     p.ads_count,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConcepts(data.concepts || []);
      }
    } catch (e: any) {
      alert('Erro ao gerar conceitos: ' + e.message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/campanhas/criativos"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
              <ArrowLeftIcon className="h-4 w-4" />
            </Link>
            <TrophyIcon className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-black text-slate-900">Padrões Vencedores</h1>
          </div>
          <p className="text-sm text-slate-500 ml-8">
            Padrões de criativos correlacionados com performance real
          </p>
        </div>
        {/* Seletor de cliente — Minha Empresa / Para um Cliente */}
        <div className="flex items-center gap-2">
          <ClientSelector
            value={clientFilter}
            onChange={setClientFilter}
            clients={clients}
            loading={clientsLoading}
            storageKey="padroes"
            variant="toggle"
          />
          <DashboardHelpButton isDark={false} />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-2 border-slate-200 rounded-2xl p-5 animate-pulse">
              <div className="h-5 bg-slate-100 rounded w-1/2 mb-4" />
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[1,2,3,4].map(j => <div key={j} className="h-8 bg-slate-100 rounded" />)}
              </div>
              <div className="flex gap-1.5">
                {[1,2,3].map(j => <div key={j} className="h-5 bg-slate-100 rounded-full w-16" />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && patterns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4">
            <ChartBarIcon className="h-8 w-8 text-amber-400" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-2">Nenhum padrão disponível ainda</h3>
          <p className="text-sm text-slate-400 max-w-sm mb-5">
            Os padrões aparecem depois que criativos são analisados e vinculados a campanhas com dados de performance.
          </p>
          <Link href="/admin/campanhas/criativos"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-all">
            <ArrowLeftIcon className="h-4 w-4" />
            Ir para Galeria
          </Link>
        </div>
      )}

      {/* Hook Health */}
      {!loading && hookHealth && <HookHealthCard data={hookHealth} />}

      {/* Patterns grid */}
      {!loading && patterns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patterns.map((p, i) => (
            <PatternCard
              key={i} pattern={p} index={i}
              onGenerateConcepts={handleGenerateConcepts}
            />
          ))}
        </div>
      )}

      {/* Generating overlay */}
      <AnimatePresence>
        {generating && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-8 text-center shadow-2xl max-w-xs w-full mx-4"
            >
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="h-6 w-6 text-indigo-600 animate-pulse" />
              </div>
              <p className="font-black text-slate-900 mb-1">Gerando conceitos...</p>
              <p className="text-xs text-slate-500">A IA está criando 5 ideias de criativos baseadas no padrão vencedor</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Concept modal */}
      <AnimatePresence>
        {concepts.length > 0 && activePattern && (
          <ConceptModal
            concepts={concepts}
            pattern={activePattern}
            onClose={() => { setConcepts([]); setActivePattern(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
