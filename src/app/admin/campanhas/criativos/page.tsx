'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  PhotoIcon, SparklesIcon, ArrowPathIcon,
  FunnelIcon, ChartBarIcon, ExclamationTriangleIcon,
  CheckCircleIcon, ClockIcon, XMarkIcon, PaintBrushIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import { cn } from '@/lib/marketing-utils';
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector';
import { ANGLE_LABELS as SHARED_ANGLE_LABELS } from '@/lib/marketing/angles';

// ── Types ──────────────────────────────────────────────────────────────────────
interface CreativeAsset {
  id: string;
  original_name: string;
  storage_url: string;
  file_size: number | null;
  mime_type: string | null;
  campaign_id: string | null;
  ad_id: string | null;
  uploaded_at: string;
  analysis_status: 'pending' | 'running' | 'done' | 'failed' | null;
  hook_type: string | null;
  angle: string | null;
  emotional_tone: string | null;
  cta_style: string | null;
  has_people: boolean | null;
  has_property: boolean | null;
  has_text_overlay: boolean | null;
  is_ugc_style: boolean | null;
  is_corporate_style: boolean | null;
  scene_description: string | null;
  key_visual_elements: string[] | null;
  llm_confidence: number | null;
  error_message: string | null;
  ai_generated: boolean | null;
}

// ── Label maps ─────────────────────────────────────────────────────────────────
const HOOK_LABELS: Record<string, string> = {
  urgency: 'Urgência', curiosity: 'Curiosidade', social_proof: 'Prova Social',
  benefit: 'Benefício', story: 'História', problem: 'Problema', other: 'Outro',
  // variações que LLMs costumam retornar fora do enum
  investment: 'Investimento', price: 'Preço', lifestyle: 'Lifestyle',
  family: 'Família', luxury: 'Luxo', social: 'Social',
};
// Fonte única de taxonomia de ângulo (src/lib/marketing/angles.ts) — indexação solta
// (Record<string,string>) preservada aqui de propósito, pro código existente abaixo (que
// testa presença de chave por string arbitrária) continuar igual, sem duplicar as traduções.
const ANGLE_LABELS: Record<string, string> = SHARED_ANGLE_LABELS;

const HOOK_COLORS: Record<string, string> = {
  urgency: 'bg-red-100 text-red-700', curiosity: 'bg-purple-100 text-purple-700',
  social_proof: 'bg-blue-100 text-blue-700', benefit: 'bg-green-100 text-green-700',
  story: 'bg-amber-100 text-amber-700', problem: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-600',
};

const STATUS_ICON = {
  pending: <ClockIcon className="h-3.5 w-3.5 text-amber-500" />,
  running: <ArrowPathIcon className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
  done:    <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />,
  failed:  <ExclamationTriangleIcon className="h-3.5 w-3.5 text-red-500" />,
};

// ── FASE 6.5 types ─────────────────────────────────────────────────────────────
interface CreativeTemplate { id: string; name: string; style: string; formats: string[]; }
interface GenerationJob {
  id: string; status: string; outputUrls: string[];
  formats: string[]; errorMessage: string | null;
}

const FORMAT_LABELS: Record<string, string> = { '1:1': '1:1 — Feed', '4:5': '4:5 — Feed vertical', '9:16': '9:16 — Story/Reel' };

const AI_FORMAT_OPTIONS = [
  { value: 'feed',   label: 'Feed',   dims: '1024×1024', ratio: '1:1'  },
  { value: 'story',  label: 'Story',  dims: '768×1344',  ratio: '9:16' },
  { value: 'banner', label: 'Banner', dims: '1344×768',  ratio: '16:9' },
] as const;

// ── GenerateAIModal ─────────────────────────────────────────────────────────────

interface AIConcept {
  scene: string;
  headline: string;
  hook_text: string;
  cta: string;
  why_it_works: string;
  format?: string;
}

const HOOK_LABELS_PT: Record<string, string> = {
  urgency: 'Urgência', curiosity: 'Curiosidade', social_proof: 'Prova Social',
  benefit: 'Benefício', story: 'História', problem: 'Problema',
  price: 'Preço', investment: 'Investimento', lifestyle: 'Lifestyle',
  family: 'Família', luxury: 'Luxo', social: 'Social', other: 'Outro',
};

const HOOK_COLORS_MODAL: Record<string, string> = {
  urgency: 'bg-red-100 text-red-700 border-red-200',
  curiosity: 'bg-purple-100 text-purple-700 border-purple-200',
  social_proof: 'bg-blue-100 text-blue-700 border-blue-200',
  benefit: 'bg-green-100 text-green-700 border-green-200',
  story: 'bg-amber-100 text-amber-700 border-amber-200',
  problem: 'bg-orange-100 text-orange-700 border-orange-200',
  price: 'bg-teal-100 text-teal-700 border-teal-200',
  investment: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  lifestyle: 'bg-pink-100 text-pink-700 border-pink-200',
  family: 'bg-rose-100 text-rose-700 border-rose-200',
  luxury: 'bg-slate-100 text-slate-700 border-slate-200',
  other: 'bg-gray-100 text-gray-600 border-gray-200',
};

type AIModalStep = 'analyzing' | 'concepts' | 'format' | 'generating' | 'done' | 'error';

function GenerateAIModal({
  onClose, onGenerated, clientFilter,
}: {
  onClose: () => void;
  onGenerated: () => void;
  clientFilter: string;
}) {
  const [step, setStep]                   = useState<AIModalStep>('analyzing');
  const [concepts, setConcepts]           = useState<AIConcept[]>([]);
  const [suggestedHook, setSuggestedHook] = useState('benefit');
  const [suggestedAngle, setSuggestedAngle] = useState('lifestyle');
  const [saturationMsg, setSaturationMsg] = useState('');
  const [selectedConcept, setSelectedConcept] = useState<AIConcept | null>(null);
  const [format, setFormat]               = useState<'feed' | 'story' | 'banner'>('feed');
  const [result, setResult]               = useState<{ url: string; provider: string; model: string; durationMs: number; hookType: string | null } | null>(null);
  const [errorMsg, setErrorMsg]           = useState('');
  const [elapsed, setElapsed]             = useState(0);

  // Timer durante geração
  useEffect(() => {
    if (step !== 'generating') { setElapsed(0); return; }
    const iv = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, [step]);

  // Auto-analisar ao abrir
  useEffect(() => {
    analyzeAndSuggest();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function analyzeAndSuggest() {
    setStep('analyzing');
    try {
      // 1. Verificar saturação de hooks na biblioteca
      const cId = clientFilter !== 'all' && clientFilter !== 'own' ? `?clientId=${clientFilter}` : '';
      const satRes = await adminFetch(`/api/admin/campanhas/criativos/hook-saturation${cId}`);
      const satData = satRes.ok ? await satRes.json() : null;

      // Determinar hook a sugerir (priorizar diversificação)
      let hookToUse = 'benefit';
      let angleToUse = 'lifestyle';
      let satMsg = '';

      if (satData?.hookStats?.length > 0) {
        // Encontrar hook menos usado ou não usado
        const usedHooks = new Set<string>(satData.hookStats.map((h: any) => h.hookType));
        const allHooks = ['curiosity', 'social_proof', 'benefit', 'story', 'problem', 'lifestyle', 'family'];
        const unusedHook = allHooks.find(h => !usedHooks.has(h));
        hookToUse = unusedHook || satData.dominantHook || 'benefit';

        if (satData.saturationAlert) {
          satMsg = `Seu portfólio tem ${Math.round(satData.dominantShare * 100)}% de "${HOOK_LABELS_PT[satData.dominantHook] || satData.dominantHook}". Sugerindo diversificar com "${HOOK_LABELS_PT[hookToUse] || hookToUse}".`;
        } else if (unusedHook) {
          satMsg = `Hook "${HOOK_LABELS_PT[hookToUse]}" ainda não explorado na sua biblioteca.`;
        }
      }

      setSuggestedHook(hookToUse);
      setSuggestedAngle(angleToUse);
      setSaturationMsg(satMsg);

      // 2. Gerar conceitos com esse hook
      const conceptRes = await adminFetch('/api/admin/campanhas/criativos/concepts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hookType: hookToUse,
          angle: angleToUse,
          emotionalTone: 'aspirational',
          isUgc: false,
          avgCtr: 0,
          avgCpl: 0,
          adsCount: 1,
        }),
      });
      const conceptData = conceptRes.ok ? await conceptRes.json() : null;
      const rawConcepts: AIConcept[] = conceptData?.concepts?.slice(0, 3) || [];

      if (rawConcepts.length === 0) throw new Error('Não foi possível gerar conceitos. Tente novamente.');

      setConcepts(rawConcepts);
      setStep('concepts');
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro ao analisar biblioteca');
      setStep('error');
    }
  }

  function handleSelectConcept(c: AIConcept) {
    setSelectedConcept(c);
    setStep('format');
  }

  async function handleGenerate() {
    if (!selectedConcept) return;
    setStep('generating');
    try {
      const res = await adminFetch('/api/admin/campanhas/criativos/generate/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene:    selectedConcept.scene,
          hookType: suggestedHook,
          angle:    suggestedAngle,
          format,
          clientId: clientFilter !== 'all' && clientFilter !== 'own' ? clientFilter : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar imagem');
      setResult({
        url:       data.asset.storage_url,
        provider:  data.generation.provider,
        model:     data.generation.model,
        durationMs: data.generation.durationMs,
        hookType:  data.generation.hookType,
      });
      onGenerated();
      setStep('done');
    } catch (e: any) {
      setErrorMsg(e.message);
      setStep('error');
    }
  }

  const isCloseable = step !== 'generating';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm shadow-violet-300">
              <CpuChipIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Criar novo criativo com IA</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {step === 'analyzing'  && 'Analisando sua biblioteca...'}
                {step === 'concepts'   && 'Passo 1 de 3 — Escolha um conceito'}
                {step === 'format'     && 'Passo 2 de 3 — Escolha o formato'}
                {step === 'generating' && 'Passo 3 de 3 — Gerando imagem...'}
                {step === 'done'       && 'Imagem criada com sucesso!'}
                {step === 'error'      && 'Algo deu errado'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={!isCloseable}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">

          {/* ── STEP: ANALYZING ── */}
          {step === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-violet-100" />
                <div className="absolute inset-0 w-14 h-14 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <SparklesIcon className="h-5 w-5 text-violet-500" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800">Analisando sua biblioteca criativa...</p>
                <p className="text-xs text-slate-400 mt-1">Identificando hooks sub-representados e gerando conceitos</p>
              </div>
            </div>
          )}

          {/* ── STEP: CONCEPTS ── */}
          {step === 'concepts' && (
            <div className="space-y-3">
              {/* Insight de saturação */}
              {saturationMsg && (
                <div className="flex items-start gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3.5 py-2.5">
                  <SparklesIcon className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-violet-700 font-medium">{saturationMsg}</p>
                </div>
              )}

              <p className="text-[10px] text-slate-400 leading-relaxed">
                A IA analisou seu portfólio e criou 3 conceitos prontos para usar. O <span className="text-emerald-600 font-bold">Recomendado</span> é o que melhor equilibra diversificação e tendência. Escolha o que mais conecta com sua audiência.
              </p>

              <div className="space-y-2.5">
                {concepts.map((c, i) => {
                  const isRec = i === 0;
                  // Detectar estilo visual a partir da cena
                  const sceneLC = c.scene.toLowerCase();
                  const visualStyle =
                    sceneLC.includes('animaç') || sceneLC.includes('vídeo') || sceneLC.includes('video') ? '🎬 Vídeo/animação'
                    : sceneLC.includes('alternân') || sceneLC.includes('slideshow') || sceneLC.includes('carrossel') || sceneLC.includes('sequência') ? '🖼️ Carrossel'
                    : '📷 Foto estática';

                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectConcept(c)}
                      className={cn(
                        'w-full text-left p-4 rounded-xl border-2 transition-all group',
                        isRec
                          ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-50/80'
                          : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {/* Recomendado badge */}
                        {isRec && (
                          <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                            ★ Recomendado
                          </span>
                        )}
                        {!isRec && (
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Opção {i + 1}
                          </span>
                        )}
                        {/* Hook badge */}
                        <span className={cn(
                          'text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border',
                          HOOK_COLORS_MODAL[suggestedHook] || HOOK_COLORS_MODAL.other
                        )}>
                          {HOOK_LABELS_PT[suggestedHook] || suggestedHook}
                        </span>
                        {/* Estilo visual */}
                        <span className="text-[9px] text-slate-400 ml-auto">{visualStyle}</span>
                      </div>

                      {/* Cena visual — texto completo */}
                      <p className={cn(
                        'text-xs font-bold leading-snug mb-1.5',
                        isRec ? 'text-emerald-900' : 'text-slate-800',
                      )}>
                        {c.scene}
                      </p>

                      {/* Headline */}
                      {c.headline && (
                        <p className="text-[10px] text-slate-500 italic mb-2">
                          "{c.headline}"
                        </p>
                      )}

                      {/* Por que funciona */}
                      {c.why_it_works && (
                        <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                          💡 {c.why_it_works}
                        </p>
                      )}

                      <div className={cn(
                        'mt-2.5 text-[10px] font-black uppercase tracking-widest',
                        isRec ? 'text-emerald-600 group-hover:text-emerald-700' : 'text-violet-500 group-hover:text-violet-700',
                      )}>
                        {isRec ? '★ Usar este conceito →' : 'Usar este →'}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={analyzeAndSuggest}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Gerar outros conceitos
              </button>
            </div>
          )}

          {/* ── STEP: FORMAT ── */}
          {step === 'format' && selectedConcept && (
            <div className="space-y-5">
              {/* Conceito selecionado (resumo) */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border',
                    HOOK_COLORS_MODAL[suggestedHook] || HOOK_COLORS_MODAL.other
                  )}>
                    {HOOK_LABELS_PT[suggestedHook] || suggestedHook}
                  </span>
                  <button onClick={() => setStep('concepts')} className="text-[9px] text-slate-400 hover:text-slate-600 ml-auto">
                    ← Trocar conceito
                  </button>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-snug line-clamp-2">{selectedConcept.scene}</p>
              </div>

              {/* Seletor de formato */}
              <div>
                <p className="text-xs font-black text-slate-700 uppercase tracking-widest mb-3">Formato da imagem</p>
                <div className="grid grid-cols-3 gap-3">
                  {AI_FORMAT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFormat(opt.value)}
                      className={cn(
                        'flex flex-col items-center py-4 rounded-xl border-2 transition-all',
                        format === opt.value
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-violet-200',
                      )}
                    >
                      {/* Aspect ratio visual */}
                      <div className={cn(
                        'bg-slate-200 rounded mb-2',
                        opt.value === 'feed'   && 'w-8 h-8',
                        opt.value === 'story'  && 'w-5 h-9',
                        opt.value === 'banner' && 'w-10 h-5',
                      )} />
                      <span className="text-xs font-black text-slate-800">{opt.label}</span>
                      <span className="text-[10px] text-slate-400">{opt.ratio}</span>
                      <span className="text-[9px] text-slate-300">{opt.dims}px</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-violet-200 hover:bg-violet-700 transition-all flex items-center justify-center gap-2"
              >
                <CpuChipIcon className="h-4 w-4" />
                Gerar imagem agora
              </button>

              <p className="text-[10px] text-center text-slate-400">
                A IA converterá o conceito em imagem automaticamente — sem precisar escrever nada em inglês.
              </p>
            </div>
          )}

          {/* ── STEP: GENERATING ── */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-14 gap-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-violet-100" />
                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <CpuChipIcon className="h-6 w-6 text-violet-400" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-slate-800">Criando sua imagem...</p>
                <p className="text-xs text-slate-400">
                  Hook: <span className="font-semibold text-violet-600">{HOOK_LABELS_PT[suggestedHook] || suggestedHook}</span>
                  {' · '}Formato: <span className="font-semibold">{AI_FORMAT_OPTIONS.find(o => o.value === format)?.label}</span>
                </p>
                <p className="text-xs text-slate-400 mt-2">{elapsed}s decorridos</p>
              </div>
              <div className="w-full max-w-xs bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all duration-1000 rounded-full"
                  style={{ width: `${Math.min((elapsed / 60) * 100, 95)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-300">Flux Schnell · pode levar até 60s no plano gratuito</p>
            </div>
          )}

          {/* ── STEP: DONE ── */}
          {step === 'done' && result && (
            <div className="space-y-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.url} alt="Imagem gerada" className="w-full rounded-xl object-contain max-h-72 border border-slate-100" />

              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                <CheckCircleIcon className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-black text-emerald-800">Adicionada à biblioteca automaticamente</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    Hook: {HOOK_LABELS_PT[result.hookType || ''] || result.hookType || '—'}
                    {' · '}{result.provider}/{result.model}
                    {' · '}{(result.durationMs / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('concepts'); setResult(null); setSelectedConcept(null); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-violet-600 border border-violet-200 hover:bg-violet-50 transition-all"
                >
                  Gerar outro conceito
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black text-white bg-violet-600 hover:bg-violet-700 transition-all"
                >
                  Ver na galeria
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: ERROR ── */}
          {step === 'error' && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800">Algo deu errado</p>
                  <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
                </div>
              </div>
              <button
                onClick={analyzeAndSuggest}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-violet-600 border border-violet-200 hover:bg-violet-50 transition-all flex items-center justify-center gap-2"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Tentar novamente
              </button>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}

// ── GenerateModal ───────────────────────────────────────────────────────────────
function GenerateModal({
  asset, onClose, onApproved,
}: {
  asset: CreativeAsset;
  onClose: () => void;
  onApproved: () => void;
}) {
  const [templates, setTemplates] = useState<CreativeTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [formats, setFormats]       = useState<string[]>(['1:1']);
  const [headline, setHeadline]     = useState('');
  const [cta, setCta]               = useState('Quero Saber Mais');
  const [job, setJob]               = useState<GenerationJob | null>(null);
  const [screen, setScreen]         = useState<'config' | 'generating' | 'review'>('config');
  const [busy, setBusy]             = useState(false);
  const [selected, setSelected]     = useState<string[]>([]);
  const [approveErr, setApproveErr] = useState('');

  // Carrega templates ao abrir
  useEffect(() => {
    adminFetch(`/api/admin/campanhas/criativos/generate?sourceAssetId=${asset.id}`)
      .then(r => r.json())
      .then(d => {
        setTemplates(d.templates ?? []);
        if (d.templates?.length) setTemplateId(d.templates[0].id);
      })
      .catch(() => {});
  }, [asset.id]);

  // Polling enquanto gerando
  useEffect(() => {
    if (screen !== 'generating' || !job) return;
    const iv = setInterval(async () => {
      const r = await adminFetch(`/api/admin/campanhas/criativos/generate/${job.id}`);
      const d = await r.json();
      const j: GenerationJob = d.job;
      if (j.status === 'NEEDS_REVIEW') {
        setJob(j);
        setSelected(j.outputUrls);
        setScreen('review');
        clearInterval(iv);
      } else if (j.status === 'FAILED') {
        setJob(j);
        setScreen('review');
        clearInterval(iv);
      }
    }, 2500);
    return () => clearInterval(iv);
  }, [screen, job]);

  async function handleGenerate() {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/campanhas/criativos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAssetId: asset.id,
          sourceUrl:     asset.storage_url,
          templateId:    templateId || null,
          concept:       { headline: headline.trim() || undefined, cta: cta.trim() || undefined },
          formats,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Erro ao iniciar geração');
      setJob(d.job);
      setScreen('generating');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!job) return;
    setBusy(true);
    setApproveErr('');
    try {
      const r = await adminFetch(`/api/admin/campanhas/criativos/generate/${job.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedUrls: selected }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Erro ao aprovar');
      onApproved();
      onClose();
    } catch (e: any) {
      setApproveErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!job) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/campanhas/criativos/generate/${job.id}/reject`, { method: 'POST' });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  function toggleFormat(f: string) {
    setFormats(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }
  function toggleSelected(url: string) {
    setSelected(prev => prev.includes(url) ? prev.filter(x => x !== url) : [...prev, url]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PaintBrushIcon className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-black text-slate-900">Gerar variações</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {/* ── SCREEN: CONFIG ── */}
          {screen === 'config' && (
            <div className="space-y-5">
              <div className="flex gap-4">
                {/* Preview da imagem fonte */}
                <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.storage_url} alt={asset.original_name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-0.5">Imagem fonte</p>
                  <p className="text-[11px] text-slate-500 mb-2 truncate max-w-xs">{asset.original_name}</p>
                  <p className="text-[11px] text-slate-400">
                    O agente fará smart-crop para cada formato e aplicará headline + CTA em overlay.
                  </p>
                </div>
              </div>

              {/* Formatos */}
              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">Formatos a gerar</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(FORMAT_LABELS).map(([f, label]) => (
                    <button key={f} onClick={() => toggleFormat(f)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                        formats.includes(f)
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300',
                      )}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template */}
              {templates.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">Template visual</p>
                  <div className="grid grid-cols-3 gap-2">
                    {templates.map(t => (
                      <button key={t.id} onClick={() => setTemplateId(t.id)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition-all',
                          templateId === t.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-100 bg-white hover:border-indigo-200',
                        )}>
                        <p className="text-[11px] font-bold text-slate-800">{t.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{t.formats.join(' · ')}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Conceito */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Headline (opcional)</label>
                  <input
                    value={headline} onChange={e => setHeadline(e.target.value)}
                    placeholder="Ex: Apartamento dos seus sonhos..."
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CTA (opcional)</label>
                  <input
                    value={cta} onChange={e => setCta(e.target.value)}
                    placeholder="Ex: Quero Saber Mais"
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-300"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={busy || formats.length === 0}
                className={cn(
                  'w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all',
                  busy || formats.length === 0
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200',
                )}>
                {busy ? 'Iniciando...' : `Gerar ${formats.length} variação(ões)`}
              </button>
            </div>
          )}

          {/* ── SCREEN: GENERATING ── */}
          {screen === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100" />
                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800">Gerando variações...</p>
                <p className="text-xs text-slate-400 mt-1">Smart-crop + overlay de texto em andamento</p>
              </div>
            </div>
          )}

          {/* ── SCREEN: REVIEW ── */}
          {screen === 'review' && job && (
            <div className="space-y-4">
              {job.status === 'FAILED' ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <p className="font-bold mb-1">Geração falhou</p>
                  <p className="text-xs">{job.errorMessage ?? 'Erro desconhecido'}</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-700">
                    Selecione as variações para adicionar à biblioteca ({selected.length}/{job.outputUrls.length} selecionadas):
                  </p>
                  <div className={cn(
                    'grid gap-3',
                    job.outputUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3',
                  )}>
                    {job.outputUrls.map((url, i) => {
                      const isSel = selected.includes(url);
                      const fmt   = job.formats[i] ?? '?';
                      return (
                        <button key={url} onClick={() => toggleSelected(url)}
                          className={cn(
                            'relative rounded-xl overflow-hidden border-2 transition-all group',
                            isSel ? 'border-indigo-500 shadow-md shadow-indigo-100' : 'border-slate-200 opacity-60 hover:opacity-90',
                          )}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Variação ${fmt}`} className="w-full object-cover max-h-48" />
                          <div className={cn(
                            'absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-white',
                            isSel ? 'bg-indigo-600' : 'bg-slate-500',
                          )}>
                            {fmt}
                          </div>
                          {isSel && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shadow">
                              <CheckCircleIcon className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {approveErr && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{approveErr}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleReject} disabled={busy}
                      className="flex-1 py-2 rounded-xl text-sm font-bold text-slate-600 border border-slate-200 hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-50">
                      Rejeitar todas
                    </button>
                    <button
                      onClick={handleApprove} disabled={busy || selected.length === 0}
                      className={cn(
                        'flex-1 py-2 rounded-xl text-sm font-bold text-white transition-all',
                        busy || selected.length === 0
                          ? 'bg-slate-300 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200',
                      )}>
                      {busy ? 'Salvando...' : `Aprovar ${selected.length} variação(ões)`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Tag chip ───────────────────────────────────────────────────────────────────
function Tag({ label, color = 'bg-slate-100 text-slate-600' }: { label: string; color?: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${color}`}>
      {label}
    </span>
  );
}

// ── Asset card ─────────────────────────────────────────────────────────────────
function AssetCard({
  asset, onReanalyze, onGenerate,
}: {
  asset: CreativeAsset;
  onReanalyze: (id: string) => void;
  onGenerate:  (asset: CreativeAsset) => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const status = asset.analysis_status ?? 'pending';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
    >
      {/* Imagem */}
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
        {imgErr ? (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="h-10 w-10 text-slate-300" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.storage_url}
            alt={asset.original_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgErr(true)}
          />
        )}

        {/* Status badge */}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
          {STATUS_ICON[status] ?? STATUS_ICON.pending}
          <span className="text-[9px] font-bold text-slate-600 capitalize">
            {status === 'done' ? 'Analisado' : status === 'running' ? 'Analisando...' : status === 'failed' ? 'Erro' : 'Pendente'}
          </span>
        </div>

        {/* AI / UGC badge */}
        {asset.ai_generated ? (
          <div className="absolute top-2 left-2 bg-violet-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow flex items-center gap-0.5">
            <CpuChipIcon className="h-2.5 w-2.5" />
            IA
          </div>
        ) : asset.is_ugc_style && (
          <div className="absolute top-2 left-2 bg-violet-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow">
            UGC
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-800 truncate">{asset.original_name}</p>

        {/* Vinculado a campanha */}
        {asset.ad_id && (
          <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 rounded px-1.5 py-0.5 w-fit">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.1-1.1" />
            </svg>
            Vinculado à campanha
          </div>
        )}

        {/* Erro de análise */}
        {status === 'failed' && asset.error_message && (
          <p className="text-[9px] text-red-600 bg-red-50 rounded px-1.5 py-1 leading-relaxed line-clamp-3" title={asset.error_message}>
            {asset.error_message}
          </p>
        )}

        {/* Tags de análise */}
        {status === 'done' && (
          <div className="flex flex-wrap gap-1">
            {asset.hook_type && (
              <Tag
                label={`Hook: ${HOOK_LABELS[asset.hook_type] ?? asset.hook_type}`}
                color={HOOK_COLORS[asset.hook_type] ?? HOOK_COLORS.other}
              />
            )}
            {asset.angle && (
              <Tag label={ANGLE_LABELS[asset.angle] ?? asset.angle} color="bg-indigo-100 text-indigo-700" />
            )}
            {asset.has_people    && <Tag label="Pessoa"  color="bg-pink-100 text-pink-700" />}
            {asset.has_property  && <Tag label="Imóvel"  color="bg-teal-100 text-teal-700" />}
            {asset.has_text_overlay && <Tag label="Texto" color="bg-yellow-100 text-yellow-700" />}
          </div>
        )}

        {/* Scene description */}
        {status === 'done' && asset.scene_description && (
          <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
            {asset.scene_description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[9px] text-slate-400">
            {new Date(asset.uploaded_at).toLocaleDateString('pt-BR')}
          </span>
          {(status === 'pending' || status === 'failed') && (
            <button
              onClick={() => onReanalyze(asset.id)}
              className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
            >
              <SparklesIcon className="h-3 w-3" />
              {status === 'failed' ? 'Re-analisar' : 'Analisar'}
            </button>
          )}
          {status === 'done' && (
            <div className="flex items-center gap-2">
              {asset.llm_confidence != null && (
                <span className="text-[9px] text-slate-400">
                  {Math.round((asset.llm_confidence as number) * 100)}% conf.
                </span>
              )}
              <button
                onClick={() => onReanalyze(asset.id)}
                className="text-[9px] text-slate-300 hover:text-indigo-500 transition-colors"
                title="Re-analisar"
              >
                <ArrowPathIcon className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Gerar variações — visível para imagens (mime type image/*) */}
        {asset.mime_type?.startsWith('image/') && (
          <button
            onClick={() => onGenerate(asset)}
            className="w-full mt-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 border border-dashed border-indigo-200 hover:border-indigo-400 transition-all"
          >
            <PaintBrushIcon className="h-3 w-3" />
            Gerar variações
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function GaleriaCreativosPage() {
  const [assets, setAssets]         = useState<CreativeAsset[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Seletor Minha Empresa / Para um Cliente — padrão 'own'
  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('criativos');

  // Filtros
  const [filterHook,   setFilterHook]   = useState('');
  const [filterAngle,  setFilterAngle]  = useState('');
  const [filterUgc,    setFilterUgc]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  // FASE 6.5 — modal de geração de variações
  const [genAsset, setGenAsset] = useState<CreativeAsset | null>(null);

  // FASE 17-A — modal de geração AI (texto → imagem)
  const [showAIModal, setShowAIModal]         = useState(false);
  const [allowAiImages, setAllowAiImages]     = useState<boolean | null>(null);

  useEffect(() => {
    adminFetch('/api/admin/campanhas/segment-config')
      .then(r => r.ok ? r.json() : null)
      .then(d => setAllowAiImages(d?.segment?.imagens_por_ia ?? false))
      .catch(() => setAllowAiImages(false));
  }, []);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60', offset: '0' });
      if (filterHook)             params.set('hookType',  filterHook);
      if (filterAngle)            params.set('angle',     filterAngle);
      if (filterUgc)              params.set('isUgc',     filterUgc);
      if (filterStatus)           params.set('status',    filterStatus);
      if (clientFilter !== 'all') params.set('clientId',  clientFilter);

      const res = await adminFetch(`/api/admin/campanhas/criativos/library?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterHook, filterAngle, filterUgc, filterStatus, clientFilter]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  async function handleReanalyze(assetId: string) {
    await adminFetch(`/api/admin/campanhas/criativos/${assetId}/analyze`, { method: 'POST' });
    setAssets(prev => prev.map(a =>
      a.id === assetId ? { ...a, analysis_status: 'running' } : a
    ));
    setTimeout(() => loadAssets(), 12000);
  }

  async function handleReanalyzeAll() {
    const targets = assets.filter(a => a.analysis_status !== 'running');
    if (!targets.length) return;
    setUploadMsg(`🔄 Re-analisando ${targets.length} criativo(s)...`);
    for (const a of targets) {
      await adminFetch(`/api/admin/campanhas/criativos/${a.id}/analyze`, { method: 'POST' });
    }
    setAssets(prev => prev.map(a => ({ ...a, analysis_status: 'running' as const })));
    setTimeout(() => { setUploadMsg(''); loadAssets(); }, 15000);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setUploadMsg(`Enviando ${files.length} arquivo(s)...`);
    let success = 0;
    const errors: string[] = [];

    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await adminFetch('/api/admin/campanhas/criativos/upload', { method: 'POST', body: fd });
        if (res.ok) {
          success++;
        } else {
          const errData = await res.json().catch(() => ({}));
          errors.push(`${file.name}: ${errData.error ?? res.status}`);
        }
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    if (errors.length) {
      setUploadMsg(`⚠️ ${success}/${files.length} enviados. Erros: ${errors.join(' | ')}`);
    } else {
      setUploadMsg(`✅ ${success}/${files.length} enviado(s). Análise em andamento...`);
    }
    setUploading(false);
    e.target.value = '';
    setTimeout(() => { setUploadMsg(''); loadAssets(); }, errors.length ? 8000 : 3000);
  }

  const statusCounts = assets.reduce((acc, a) => {
    const s = a.analysis_status ?? 'pending';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PhotoIcon className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-black text-slate-900">Galeria de Criativos</h1>
          </div>
          <p className="text-sm text-slate-500">
            Biblioteca inteligente com análise de IA — {total} criativo{total !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor Minha Empresa / Para um Cliente */}
          <ClientSelector
            value={clientFilter}
            onChange={setClientFilter}
            clients={clients}
            loading={clientsLoading}
            storageKey="criativos"
            variant="toggle"
          />
          <Link
            href="/admin/campanhas/criativos/padroes"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all"
          >
            <ChartBarIcon className="h-4 w-4" />
            Padrões Vencedores
          </Link>

          {assets.length > 0 && (
            <button
              onClick={handleReanalyzeAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 transition-all"
              title="Re-analisar todos os criativos"
            >
              <SparklesIcon className="h-4 w-4" />
              Re-analisar todos
            </button>
          )}

          {/* FASE 17-A — Geração AI */}
          {allowAiImages === true && (
            <button
              onClick={() => setShowAIModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 hover:border-violet-400 transition-all"
            >
              <CpuChipIcon className="h-4 w-4" />
              Gerar com IA
            </button>
          )}

          <label className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white cursor-pointer transition-all',
            uploading
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200',
          )}>
            <PhotoIcon className="h-4 w-4" />
            {uploading ? 'Enviando...' : 'Adicionar Criativos'}
            <input
              type="file" multiple accept="image/*" className="hidden"
              disabled={uploading} onChange={handleFileUpload}
            />
          </label>

          <button
            onClick={() => { setRefreshing(true); loadAssets(); }}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-50"
          >
            <ArrowPathIcon className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Upload feedback */}
      <AnimatePresence>
        {uploadMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-medium text-indigo-700 flex items-center gap-2"
          >
            <SparklesIcon className="h-4 w-4 flex-shrink-0" />
            {uploadMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status summary ── */}
      {assets.length > 0 && (
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {Object.entries(statusCounts).map(([s, n]) => (
            <div key={s} className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-lg px-3 py-1.5 shadow-sm">
              {STATUS_ICON[s as keyof typeof STATUS_ICON] ?? STATUS_ICON.pending}
              <span className="text-xs font-semibold text-slate-700">{n}</span>
              <span className="text-[10px] text-slate-400">
                {s === 'done' ? 'analisados' : s === 'running' ? 'em análise' : s === 'failed' ? 'com erro' : 'pendentes'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <FunnelIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
        {[
          { val: filterHook, set: setFilterHook, label: 'Todos os Hooks', opts: HOOK_LABELS },
          { val: filterAngle, set: setFilterAngle, label: 'Todos os Ângulos', opts: ANGLE_LABELS },
        ].map(({ val, set, label, opts }) => (
          <select key={label} value={val} onChange={e => set(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400">
            <option value="">{label}</option>
            {Object.entries(opts).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        ))}

        <select value={filterUgc} onChange={e => setFilterUgc(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400">
          <option value="">UGC + Corporativo</option>
          <option value="true">Apenas UGC</option>
          <option value="false">Apenas Corporativo</option>
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400">
          <option value="">Todos os Status</option>
          <option value="done">Analisados</option>
          <option value="pending">Pendentes</option>
          <option value="failed">Com erro</option>
        </select>

        {(filterHook || filterAngle || filterUgc || filterStatus) && (
          <button
            onClick={() => { setFilterHook(''); setFilterAngle(''); setFilterUgc(''); setFilterStatus(''); }}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse">
              <div className="aspect-[4/3] bg-slate-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-2 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <PhotoIcon className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-2">Nenhum criativo na biblioteca</h3>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            Carregue criativos para iniciar a análise automática com IA. Eles também são salvos quando você lança campanhas.
          </p>
          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-sm transition-all">
            <PhotoIcon className="h-4 w-4" />
            Adicionar primeiros criativos
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {assets.map(asset => (
            <AssetCard key={asset.id} asset={asset} onReanalyze={handleReanalyze} onGenerate={setGenAsset} />
          ))}
        </motion.div>
      )}

      {!loading && assets.length > 0 && assets.length < total && (
        <div className="mt-8 text-center">
          <button
            onClick={loadAssets}
            className="px-6 py-2 rounded-xl text-sm font-bold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-all"
          >
            Carregar mais ({total - assets.length} restantes)
          </button>
        </div>
      )}

      {/* FASE 17-A — Modal de geração AI */}
      <AnimatePresence>
        {showAIModal && (
          <GenerateAIModal
            onClose={() => { setShowAIModal(false); loadAssets(); }}
            onGenerated={() => {}}
            clientFilter={clientFilter}
          />
        )}
      </AnimatePresence>

      {/* FASE 6.5 — Modal de geração de variações */}
      <AnimatePresence>
        {genAsset && (
          <GenerateModal
            asset={genAsset}
            onClose={() => setGenAsset(null)}
            onApproved={() => { setGenAsset(null); loadAssets(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
