'use client';

/**
 * CampanhasModal — modal full-page para consulta de campanhas lançadas.
 * v2: imagens via CreativeAsset, paginação, badges corretos, layout corrigido.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  ArrowPathIcon,
  MapPinIcon,
  RocketLaunchIcon,
  PhotoIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import { cn } from '@/lib/marketing-utils';
import { ANGLE_OPTIONS, angleLabel } from '@/lib/marketing/angles';
import { PencilIcon, CheckIcon } from '@heroicons/react/24/outline';
import ClientSelector, { type ClientOption, type ClientFilterValue } from '@/components/marketing/ClientSelector';
import DateInputPtBR from '@/components/ui/DateInputPtBR';

// ── Types ─────────────────────────────────────────────────────────

interface AdData {
  id: string;
  name: string;
  status: string;
  creativeType?: string | null;
  images: string[];
  assetUrls?: string[];   // CDN URLs from CreativeAsset (enriched by GET route)
  body: string;
  headline?: string | null;
  linkUrl?: string | null;
  ctaType: string;
}

interface AdSetData {
  id: string;
  name: string;
  dailyBudget: number;   // cents
  startTime: string;
  endTime?: string | null;
  optimizationGoal: string;
  ageMin: number;
  ageMax: number;
  genders: number[];      // Meta API: 1=Masculino, 2=Feminino, []=Todos
  locations: unknown;
  interests: unknown;
  scheduleDays: number[];
  scheduleStartHour?: number | null;
  scheduleEndHour?: number | null;
  scheduleTimeSlots?: unknown;
  ads: AdData[];
}

interface CampaignData {
  id: string;
  name: string;
  objective: string;
  status: string;
  lifecycleStatus?: string | null;
  funnelStage?: string | null;
  specialAdCategory?: string | null;
  metaCampaignId?: string | null;
  createdAt: string;
  updatedAt: string;
  adSets: AdSetData[];
  // FASE 14 — ângulo de comunicação
  declaredAngle?: string | null;
  // FASE 14d — fonte: 'declared' | 'llm_auto' | null
  angleSource?: string | null;
  // Indicadores cumulativos (desde sempre até agora) — mesmo conjunto da Visão Executiva do
  // dashboard, adaptado a 1 campanha. null quando a agregação falhou (não bloqueia o card).
  metrics?: {
    spend: number;
    leads: number;
    cpl: number | null;
    ctr: number | null;
    hookRate: number | null;
  } | null;
}

// ── Constants ─────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 12;
const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ── Helpers ───────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtBudget(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Diferente de fmtBudget: Insight.spend já vem em reais (não centavos) — ver CLAUDE.md
// "CPC e spend em reais".
function fmtCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtHour(h: number | null | undefined): string {
  if (h == null) return '';
  return `${String(h).padStart(2, '0')}:00`;
}

// Meta guarda dayparting em MINUTOS desde meia-noite (start_minute/end_minute), não em horas
// cheias — 1230 = 20:30, por exemplo. 1440 (=24:00) é o fim do dia, não "00:00" do dia
// seguinte, por isso tratado como caso especial.
function fmtMinutes(min: number | null | undefined): string {
  if (min == null) return '';
  if (min >= 1440) return '24:00';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const OBJECTIVE_MAP: Record<string, string> = {
  LEAD_GENERATION: 'Geração de Leads',
  CONVERSIONS: 'Conversões',
  LINK_CLICKS: 'Cliques no Link',
  BRAND_AWARENESS: 'Reconhecimento de Marca',
  REACH: 'Alcance',
  VIDEO_VIEWS: 'Visualizações de Vídeo',
  MESSAGES: 'Mensagens',
  STORE_VISITS: 'Visitas à Loja',
  APP_INSTALLS: 'Instalações de App',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_SALES: 'Vendas',
  OUTCOME_AWARENESS: 'Awareness',
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_APP_PROMOTION: 'Promoção de App',
};

function objectiveLabel(obj: string): string {
  return OBJECTIVE_MAP[obj] || obj.replace(/_/g, ' ');
}

function genderLabel(genders: number[]): string {
  if (!genders || genders.length === 0) return 'Todos';
  const hasMale   = genders.includes(1);
  const hasFemale = genders.includes(2);
  if (hasMale && hasFemale) return 'Todos';
  if (hasMale)   return 'Masculino';
  if (hasFemale) return 'Feminino';
  return 'Todos';
}

function extractLocations(locations: unknown): string[] {
  if (!locations) return [];

  // Formato array (ex: [{ name: 'SP' }])
  if (Array.isArray(locations)) {
    return (locations as Record<string, string>[])
      .map(l => l.name || l.city || l.region || String(l))
      .filter(Boolean);
  }

  if (typeof locations === 'object' && locations !== null) {
    const loc = locations as Record<string, unknown>;
    const result: string[] = [];

    // ── Formato wizard (LocationPicker): { custom_locations: [{ name, radius }] }
    const customLocs = loc.custom_locations as Record<string, unknown>[] | undefined;
    if (customLocs?.length) {
      customLocs.forEach(cl => {
        const name   = cl.name as string | undefined;
        const radius = cl.radius as number | undefined;
        if (name) result.push(radius ? `${name} (${radius}km)` : name);
      });
      return result;
    }

    // ── Formato antigo direto: { key: "BR:SP:Barueri", name: "Barueri" }
    if (loc.name && typeof loc.name === 'string') {
      return [loc.name];
    }

    // ── Formato Meta Ads com cities/regions/countries
    const countries = loc.countries as string[] | undefined;
    const cities    = loc.cities    as Record<string, string>[] | undefined;
    const regions   = loc.regions   as Record<string, string>[] | undefined;
    if (!cities?.length && !regions?.length) {
      result.push(countries?.includes('BR') ? 'Brasil' : (countries?.[0] ?? 'Brasil'));
    }
    cities?.forEach(c => { const n = c.name || c.city; if (n) result.push(n); });
    regions?.forEach(r => { if (r.name) result.push(r.name); });
    return result.length ? result : ['Brasil'];
  }

  return ['Brasil'];
}

function extractInterests(interests: unknown): string[] {
  if (!interests) return [];
  if (Array.isArray(interests)) {
    return (interests as Record<string, string>[])
      .map(i => i.name || String(i))
      .filter(Boolean);
  }
  return [];
}

function networkLabel(campaign: CampaignData): string {
  if (campaign.metaCampaignId) return 'Meta Ads';
  return 'Meta Ads'; // default — todos os lançamentos são via Meta
}

const CREATIVE_TYPE_MAP: Record<string, string> = {
  SINGLE_IMAGE: 'Imagem Única',
  VIDEO:        'Vídeo',
  CAROUSEL:     'Carrossel',
  COLLECTION:   'Coleção',
  DYNAMIC:      'Dinâmico',
  IMAGE:        'Imagem',
};

function fmtCreativeType(ct: string | null | undefined): string {
  if (!ct) return '';
  return CREATIVE_TYPE_MAP[ct] || ct.replace(/_/g, ' ');
}

// ── Status Badge ──────────────────────────────────────────────────
// Values come from DB; status = Campaign.status | lifecycle_status

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    // campaign.status
    ACTIVE:            { label: 'Ativa',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    PAUSED:            { label: 'Pausada',          cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    DELETED:           { label: 'Removida',         cls: 'bg-red-50 text-red-700 border-red-200' },
    ARCHIVED:          { label: 'Arquivada',        cls: 'bg-gray-100 text-gray-500 border-gray-200' },
    // lifecycle_status
    DRAFT:             { label: 'Rascunho',         cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    LEARNING:          { label: 'Aprendizado',      cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    LEARNING_LIMITED:  { label: 'Aprend. Limitado', cls: 'bg-violet-50 text-violet-600 border-violet-200' },
    IN_PROCESS:        { label: 'Em andamento',     cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    STABLE:            { label: 'Estável',          cls: 'bg-teal-50 text-teal-700 border-teal-200' },
    COMPLETED:         { label: 'Concluída',        cls: 'bg-teal-50 text-teal-600 border-teal-200' },
    KILLED:            { label: 'Encerrada',        cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    UNDER_REVIEW:      { label: 'Em revisão',       cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    WITH_ISSUES:       { label: 'Com problemas',    cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  };
  const { label, cls } = cfg[status] ?? {
    label: status.replace(/_/g, ' '),
    cls: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border',
      cls,
    )}>
      {label}
    </span>
  );
}

// ── Funnel Badge ──────────────────────────────────────────────────
// funnelStage values from DB: TOF | MOF | BOF | TOPO | MEIO | FUNDO

function FunnelBadge({ stage }: { stage: string }) {
  const MAP: Record<string, { label: string; cls: string }> = {
    TOF:    { label: 'Topo de Funil',  cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    TOPO:   { label: 'Topo de Funil',  cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    TOP:    { label: 'Topo de Funil',  cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    MOF:    { label: 'Meio de Funil',  cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    MEIO:   { label: 'Meio de Funil',  cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    MIDDLE: { label: 'Meio de Funil',  cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    BOF:    { label: 'Fundo de Funil', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    FUNDO:  { label: 'Fundo de Funil', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
    BOTTOM: { label: 'Fundo de Funil', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  };
  const entry = MAP[stage];
  if (!entry) return null;
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border',
      entry.cls,
    )}>
      {entry.label}
    </span>
  );
}

// ── Angle Badge (FASE 14d) — badge com fonte visual + edição inline ──

/**
 * Cores por fonte:
 *   declared  → emerald (humano confirmou)
 *   llm_auto  → blue    (IA classificou)
 *   sem angle → amber   (sem classificação — call-to-action)
 *   legacy    → violet  (dados anteriores à FASE 14d)
 */
function AngleBadge({ campaignId, angle, angleSource, onUpdated }: {
  campaignId: string;
  angle?: string | null;
  angleSource?: string | null;
  onUpdated: (newAngle: string | null, newSource: string | null) => void;
}) {
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [selected, setSelected] = useState(angle ?? '');

  async function save() {
    setSaving(true);
    try {
      await adminFetch(`/api/admin/campanhas/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ declaredAngle: selected || null }),
      });
      onUpdated(selected || null, selected ? 'declared' : null);
      setEditing(false);
    } catch { /* silencioso */ } finally { setSaving(false); }
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          autoFocus
          className="text-[10px] font-semibold border border-blue-300 rounded-md px-1.5 py-0.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="">Sem ângulo</option>
          {ANGLE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={saving}
          className="p-0.5 rounded text-blue-600 hover:bg-blue-50"
        >
          <CheckIcon className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  // Visual state
  const hasAngle = !!angle;
  const badgeCls = !hasAngle
    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
    : angleSource === 'declared'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
    : angleSource === 'llm_auto'
    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
    : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100';

  const badgeTitle = !hasAngle
    ? 'Sem ângulo — clique para classificar'
    : angleSource === 'declared'
    ? 'Ângulo confirmado por você — clique para editar'
    : angleSource === 'llm_auto'
    ? 'Classificado pela IA — clique para confirmar ou corrigir'
    : 'Clique para editar o ângulo';

  const badgeLabel = !hasAngle
    ? 'Sem ângulo'
    : `🎯 ${angleLabel(angle)}${angleSource === 'declared' ? ' ✓' : angleSource === 'llm_auto' ? ' · IA' : ''}`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-colors',
        badgeCls,
      )}
      title={badgeTitle}
      onClick={() => { setSelected(angle ?? ''); setEditing(true); }}
    >
      {badgeLabel}
      <PencilIcon className="h-2.5 w-2.5 opacity-50" />
    </span>
  );
}

// ── Classify Banner (FASE 14d) ────────────────────────────────────

function ClassifyBanner({ count, onClassify, onDismiss }: {
  count: number;
  onClassify: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3.5 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <SparklesIcon className="h-5 w-5 text-blue-600 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-black text-blue-900">
            {count} campanha{count !== 1 ? 's' : ''} sem ângulo classificado
          </p>
          <p className="text-xs text-blue-600 mt-0.5 hidden sm:block">
            Use a IA para classificar automaticamente pelo nome da campanha.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onClassify}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20 whitespace-nowrap"
        >
          <SparklesIcon className="h-3.5 w-3.5" />
          Classificar com IA
        </button>
        <button
          onClick={onDismiss}
          className="p-1 text-blue-400 hover:text-blue-700 transition-colors rounded-lg hover:bg-blue-100"
          title="Dispensar"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Classify Modal (FASE 14d) ─────────────────────────────────────

type ClassifyStep = 'loading' | 'review' | 'saving' | 'done';

interface ClassifyResultLocal {
  id: string;
  name: string;
  suggestedAngle: string;
  confidence: 'high' | 'medium' | 'low';
}

const CONF_DOT: Record<string, string> = {
  high:   'bg-emerald-400',
  medium: 'bg-amber-400',
  low:    'bg-red-400',
};

function ClassifyModal({ isOpen, onClose, onDone }: {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep]               = useState<ClassifyStep>('loading');
  const [results, setResults]         = useState<ClassifyResultLocal[]>([]);
  const [editedAngles, setEditedAngles] = useState<Record<string, string>>({});
  const [progress, setProgress]       = useState(0);
  const [savedCount, setSavedCount]   = useState(0);
  const [summary, setSummary]         = useState<[string, number][]>([]);
  const [classifyError, setClassifyError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep('loading');
    setResults([]);
    setEditedAngles({});
    setProgress(0);
    setClassifyError('');

    adminFetch('/api/admin/campanhas/portfolio/classify-angles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'preview' }),
    })
      .then(async res => {
        if (!res.ok) throw new Error(await res.text() || `Erro ${res.status}`);
        const data = await res.json();
        setResults(data.results || []);
        setStep('review');
      })
      .catch((err: Error) => {
        setClassifyError(err.message || 'Erro ao classificar campanhas');
        setStep('review');
      });
  }, [isOpen]);

  const lowConfidenceCount = results.filter(r => r.confidence === 'low').length;

  async function handleSave() {
    setStep('saving');
    setProgress(0);
    const assignments = results.map(r => ({
      id: r.id,
      angle: editedAngles[r.id] ?? r.suggestedAngle,
    }));

    const interval = setInterval(() => {
      setProgress(p => (p < 85 ? p + 8 : p));
    }, 150);

    try {
      const res = await adminFetch('/api/admin/campanhas/portfolio/classify-angles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'confirm', assignments }),
      });
      const data = await res.json();
      clearInterval(interval);
      setProgress(100);
      setSavedCount(data.saved ?? 0);

      const sumMap: Record<string, number> = {};
      for (const a of assignments) {
        const key = editedAngles[a.id] ?? a.angle;
        sumMap[key] = (sumMap[key] || 0) + 1;
      }
      setSummary(Object.entries(sumMap).sort((a, b) => b[1] - a[1]));

      setTimeout(() => { setStep('done'); onDone(); }, 400);
    } catch (err: any) {
      clearInterval(interval);
      setProgress(0);
      setStep('review');
      setClassifyError(err.message || 'Erro ao salvar classificações');
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-black text-gray-900">Classificar Ângulos com IA</h3>
              </div>
              {step !== 'saving' && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">

              {/* Loading */}
              {step === 'loading' && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="relative w-12 h-12">
                    <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                    <SparklesIcon className="h-5 w-5 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-gray-800">Analisando campanhas...</p>
                    <p className="text-xs text-gray-400 mt-1">A IA está lendo os nomes e inferindo o ângulo de comunicação.</p>
                  </div>
                </div>
              )}

              {/* Review */}
              {step === 'review' && (
                <div className="p-6 space-y-4">
                  {classifyError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 font-medium">
                      <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
                      {classifyError}
                    </div>
                  )}

                  {results.length === 0 && !classifyError && (
                    <p className="text-sm text-center text-gray-400 py-10">
                      Nenhuma campanha sem ângulo encontrada.
                    </p>
                  )}

                  {results.length > 0 && (
                    <>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-sm font-bold text-gray-700">
                          {results.length} campanha{results.length !== 1 ? 's' : ''} para classificar
                        </p>
                        {lowConfidenceCount > 0 && (
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                            {lowConfidenceCount} com baixa confiança — verifique
                          </span>
                        )}
                      </div>

                      <div className="border border-gray-100 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left px-4 py-2.5 font-black text-gray-500 uppercase tracking-wider text-[10px]">
                                Campanha
                              </th>
                              <th className="text-left px-4 py-2.5 font-black text-gray-500 uppercase tracking-wider text-[10px] w-48">
                                Ângulo sugerido
                              </th>
                              <th className="px-3 py-2.5 w-8" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {results.map(r => (
                              <tr
                                key={r.id}
                                className={cn(
                                  'transition-colors',
                                  r.confidence === 'low' ? 'bg-amber-50/40' : 'bg-white hover:bg-gray-50/50',
                                )}
                              >
                                <td className="px-4 py-2.5 text-gray-800 font-medium truncate max-w-[220px]" title={r.name}>
                                  {r.name}
                                </td>
                                <td className="px-4 py-2.5">
                                  <select
                                    value={editedAngles[r.id] ?? r.suggestedAngle}
                                    onChange={e => setEditedAngles(prev => ({ ...prev, [r.id]: e.target.value }))}
                                    className="w-full text-xs font-semibold border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 appearance-none"
                                  >
                                    {ANGLE_OPTIONS.map(o => (
                                      <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span
                                    className={cn('inline-block w-2.5 h-2.5 rounded-full', CONF_DOT[r.confidence])}
                                    title={`Confiança: ${r.confidence}`}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Alta confiança
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Média
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Baixa — verifique
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Saving */}
              {step === 'saving' && (
                <div className="flex flex-col items-center justify-center py-16 px-8 gap-5">
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-500 rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-sm font-black text-gray-700">
                    Salvando classificações... {Math.round(progress)}%
                  </p>
                </div>
              )}

              {/* Done */}
              {step === 'done' && (
                <div className="p-6 space-y-5">
                  <div className="text-center py-2">
                    <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <CheckIcon className="h-7 w-7 text-emerald-600" />
                    </div>
                    <p className="text-base font-black text-gray-900">
                      {savedCount} campanha{savedCount !== 1 ? 's' : ''} classificada{savedCount !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Os dados já estão disponíveis em Cross-Insights → Performance por Ângulo.
                    </p>
                  </div>

                  {summary.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {summary.map(([ang, count]) => (
                        <div key={ang} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2.5">
                          <span className="text-xs font-bold text-gray-700 truncate">{angleLabel(ang)}</span>
                          <span className="text-sm font-black text-gray-900 shrink-0 ml-2">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {(step === 'review' || step === 'done') && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                {step === 'review' && (
                  <>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={results.length === 0}
                      className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CheckIcon className="h-4 w-4" />
                      Salvar {results.length > 0 ? results.length : ''} classificaç{results.length !== 1 ? 'ões' : 'ão'}
                    </button>
                  </>
                )}
                {step === 'done' && (
                  <button
                    onClick={onClose}
                    className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-black hover:bg-gray-700 transition-all"
                  >
                    Fechar
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Creative Image Thumb ──────────────────────────────────────────

function CreativeThumb({ url, index }: { url: string; index: number }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className="w-[68px] h-[68px] rounded-xl border border-gray-100 shrink-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <PhotoIcon className="h-5 w-5 text-gray-300" />
      </div>
    );
  }
  return (
    <div className="w-[68px] h-[68px] rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-100 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Criativo ${index + 1}`}
        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

// ── Creative Strip ────────────────────────────────────────────────
// Order: headline/body text FIRST, then thumbnails

function CreativesStrip({ ads }: { ads: AdData[] }) {
  // Prefer CDN asset URLs over blob URLs
  const allImages = ads.flatMap(ad =>
    (ad.assetUrls && ad.assetUrls.length > 0) ? ad.assetUrls : (ad.images ?? [])
  ).slice(0, 8);

  const firstAd = ads[0];

  return (
    <div className="space-y-3">
      {/* Text content FIRST */}
      {firstAd && (firstAd.headline || firstAd.body) && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1">
          {firstAd.headline && (
            <p className="text-xs font-bold text-gray-900 line-clamp-1">{firstAd.headline}</p>
          )}
          {firstAd.body && (
            <p className="text-[11px] text-gray-500 line-clamp-3 leading-relaxed">{firstAd.body}</p>
          )}
          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            {firstAd.ctaType && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase tracking-wider">
                {firstAd.ctaType.replace(/_/g, ' ')}
              </span>
            )}
            {firstAd.creativeType && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase tracking-wider">
                {fmtCreativeType(firstAd.creativeType)}
              </span>
            )}
            {firstAd.linkUrl && (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-bold truncate max-w-[140px]" title={firstAd.linkUrl}>
                {firstAd.linkUrl.replace(/^https?:\/\//, '').split('/')[0]}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Thumbnails SECOND */}
      {allImages.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
          {allImages.map((url, i) => <CreativeThumb key={i} url={url} index={i} />)}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-400 py-1">
          <PhotoIcon className="h-4 w-4 shrink-0" />
          <span className="text-[11px] font-medium">Sem imagens vinculadas</span>
        </div>
      )}
    </div>
  );
}

// ── Schedule Display ──────────────────────────────────────────────

interface ScheduleDisplayProps {
  scheduleDays: number[];
  scheduleStartHour?: number | null;
  scheduleEndHour?: number | null;
  scheduleTimeSlots?: unknown;
}

function ScheduleDisplay({
  scheduleDays, scheduleStartHour, scheduleEndHour, scheduleTimeSlots,
}: ScheduleDisplayProps) {
  // Custom per-day slots — formato real do Meta (adset_schedule): array de
  // { days: number[], start_minute, end_minute, timezone_type } — uma entrada pode cobrir
  // vários dias de uma vez, e os horários são em MINUTOS desde meia-noite, não horas cheias
  // (ex.: 1230 = 20:30). Também aceita, defensivamente, o formato mais simples { day,
  // startHour, endHour } — caso algum dado histórico tenha sido gravado assim.
  if (scheduleTimeSlots && typeof scheduleTimeSlots === 'object') {
    type DaySlot = { day: number; startMin: number; endMin: number };
    const bySlots: unknown[] = Array.isArray(scheduleTimeSlots)
      ? scheduleTimeSlots
      : Object.entries(scheduleTimeSlots as Record<string, unknown>).map(([day, v]) => ({ day: parseInt(day), ...(v as object) }));

    const expanded: DaySlot[] = [];
    for (const raw of bySlots) {
      const entry = raw as Record<string, any>;
      if (!entry) continue;
      const days: number[] = Array.isArray(entry.days)
        ? entry.days
        : (typeof entry.day === 'number' ? [entry.day] : []);
      if (days.length === 0) continue;

      const hasMinutes = entry.start_minute != null || entry.end_minute != null;
      const startMin = hasMinutes ? (entry.start_minute ?? 0) : (entry.startHour ?? entry.start ?? 0) * 60;
      const endMin   = hasMinutes ? (entry.end_minute ?? 1440) : (entry.endHour ?? entry.end ?? 24) * 60;

      for (const d of days) expanded.push({ day: d, startMin, endMin });
    }

    if (expanded.length > 0) {
      expanded.sort((a, b) => a.day - b.day);
      return (
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-violet-50 border border-violet-200 rounded-md text-[10px] font-black text-violet-700 uppercase tracking-wider">
            Personalizado por dia
          </div>
          <div className="grid grid-cols-4 gap-1">
            {expanded.map((slot, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-center">
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">
                  {DAY_LABELS[slot.day] ?? `D${slot.day}`}
                </p>
                <p className="text-[10px] font-semibold text-gray-700 leading-tight mt-0.5">
                  {fmtMinutes(slot.startMin)}<span className="text-gray-400">–</span>{fmtMinutes(slot.endMin)}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  // Uniform schedule (mesmo horário todo dia veiculado)
  const allDays = !scheduleDays?.length || scheduleDays.length === 7;
  const hasCustomHours = scheduleStartHour != null || scheduleEndHour != null;

  return (
    <div className="space-y-2">
      {allDays ? (
        <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-[10px] font-black text-indigo-600 uppercase tracking-wider">
          Todos os dias
        </span>
      ) : (
        <div className="flex gap-1 flex-wrap">
          {DAY_LABELS.map((d, i) => (
            <span key={i} className={cn(
              'w-7 h-7 flex items-center justify-center rounded-md text-[10px] font-black',
              scheduleDays?.includes(i)
                ? 'bg-gold-premium text-navy-dark shadow-sm shadow-gold-premium/30'
                : 'bg-gray-100 text-gray-400',
            )}>
              {d.slice(0, 2)}
            </span>
          ))}
        </div>
      )}
      {/* Sempre mostra um horário — sem restrição configurada = veiculação o dia inteiro */}
      <p className="text-[11px] font-semibold text-gray-600">
        {hasCustomHours
          ? <>{fmtHour(scheduleStartHour)} <span className="text-gray-400">→</span> {fmtHour(scheduleEndHour)}</>
          : <>00:00 <span className="text-gray-400">→</span> 24:00 <span className="text-gray-400 font-medium">(dia todo)</span></>}
      </p>
    </div>
  );
}

// ── Campaign Card ─────────────────────────────────────────────────

function CampaignCard({ campaign, index }: { campaign: CampaignData; index: number }) {
  const [interestsExpanded, setInterestsExpanded] = useState(false);
  // FASE 14/14d — ângulo + fonte editáveis localmente sem recarregar a lista
  const [localAngle, setLocalAngle]             = useState<string | null>(campaign.declaredAngle ?? null);
  const [localAngleSource, setLocalAngleSource] = useState<string | null>(campaign.angleSource ?? null);

  // Sincroniza quando fetchCampaigns atualiza a prop (ex: após classificação em lote)
  useEffect(() => {
    setLocalAngle(campaign.declaredAngle ?? null);
    setLocalAngleSource(campaign.angleSource ?? null);
  }, [campaign.declaredAngle, campaign.angleSource]);
  const adSet    = campaign.adSets[0];
  const allAds   = campaign.adSets.flatMap(as => as.ads);
  const locations = adSet ? extractLocations(adSet.locations) : ['Brasil'];
  const interests = adSet ? extractInterests(adSet.interests) : [];
  const totalAds  = campaign.adSets.reduce((n, as) => n + as.ads.length, 0);
  const network   = networkLabel(campaign);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.25), type: 'spring', stiffness: 280, damping: 30 }}
      className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200 flex flex-col"
    >
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-50">
        {/* Badges row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            <StatusBadge status={campaign.status} />
            {campaign.lifecycleStatus && campaign.lifecycleStatus !== campaign.status && (
              <StatusBadge status={campaign.lifecycleStatus} />
            )}
            {/* FASE 14/14d — ângulo de comunicação (sempre visível, editável inline) */}
            <AngleBadge
              campaignId={campaign.id}
              angle={localAngle}
              angleSource={localAngleSource}
              onUpdated={(a, s) => { setLocalAngle(a); setLocalAngleSource(s); }}
            />
            {campaign.funnelStage && <FunnelBadge stage={campaign.funnelStage} />}
          </div>
          {/* Network chip + Meta ID */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-[10px] font-black text-blue-700 uppercase tracking-wider whitespace-nowrap">
              {network}
            </span>
            {campaign.metaCampaignId && (
              <span className="text-[9px] font-bold text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 font-mono hidden sm:inline-block select-all">
                {campaign.metaCampaignId.slice(0, 12)}…
              </span>
            )}
          </div>
        </div>

        {/* Campaign name */}
        <h3 className="text-sm font-black text-gray-900 leading-snug mb-2">
          <span className="text-gray-400 font-bold">CAMPANHA </span>
          {campaign.name}
        </h3>

        {/* Objetivo */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-[11px] font-bold text-indigo-700">
            <RocketLaunchIcon className="h-3 w-3 shrink-0" />
            {objectiveLabel(campaign.objective)}
          </span>
        </div>
      </div>

      {/* ── AdSet section ── */}
      {adSet && (
        <div className="px-5 py-4 border-b border-gray-50 space-y-4 flex-1">
          {/* Budget, Criação & Período — mesmo peso visual nos 3 */}
          <div className="flex items-stretch gap-3">
            <div className="flex-1 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">
                Orçamento diário
              </p>
              <p className="text-base font-black text-indigo-800 leading-tight">
                {fmtBudget(adSet.dailyBudget)}
              </p>
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                Criada em
              </p>
              <p className="text-[11px] font-bold text-gray-700 leading-snug">
                {fmtDate(campaign.createdAt)}
              </p>
            </div>
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                Período
              </p>
              <p className="text-[11px] font-bold text-gray-700 leading-snug">
                {fmtDate(adSet.startTime)}{' '}
                <span className="text-gray-400">→</span>{' '}
                {adSet.endTime
                  ? <span className="text-gray-700">{fmtDate(adSet.endTime)}</span>
                  : <span className="text-gray-400 font-medium">sem data final</span>}
              </p>
            </div>
          </div>

          {/* Desempenho acumulado — mesmos indicadores da Visão Executiva (dashboard), sem
              filtro de período: cumulativo desde sempre até agora. "Campanhas Ativas" fica de
              fora (métrica de portfólio, não de campanha individual). */}
          {campaign.metrics && (
            <div className="bg-slate-50/70 border border-slate-100 rounded-xl px-3 py-2.5">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Desempenho Acumulado
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                <div className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Gasto</p>
                  <p className="text-[11px] font-black text-slate-800 mt-0.5 leading-tight">
                    {fmtCurrency(campaign.metrics.spend)}
                  </p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-2 text-center">
                  <p className="text-[8px] font-black text-indigo-400 uppercase tracking-wider">Leads</p>
                  <p className="text-[11px] font-black text-indigo-700 mt-0.5 leading-tight">
                    {campaign.metrics.leads}
                  </p>
                </div>
                <div className="bg-teal-50 border border-teal-100 rounded-lg px-2 py-2 text-center">
                  <p className="text-[8px] font-black text-teal-500 uppercase tracking-wider">CPL Médio</p>
                  <p className="text-[11px] font-black text-teal-700 mt-0.5 leading-tight">
                    {campaign.metrics.cpl !== null ? fmtCurrency(campaign.metrics.cpl) : '—'}
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-2 py-2 text-center">
                  <p className="text-[8px] font-black text-amber-500 uppercase tracking-wider">
                    {campaign.metrics.hookRate !== null ? 'Hook Rate' : 'CTR'}
                  </p>
                  <p className="text-[11px] font-black text-amber-700 mt-0.5 leading-tight">
                    {(campaign.metrics.hookRate ?? campaign.metrics.ctr) !== null
                      ? `${(campaign.metrics.hookRate ?? campaign.metrics.ctr)!.toFixed(2)}%`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Público */}
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              Público-alvo
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700">
                {adSet.ageMin}–{adSet.ageMax} anos
              </span>
              <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700">
                {genderLabel(adSet.genders)}
              </span>
            </div>
          </div>

          {/* Otimização de entrega — separado do Público-alvo: não é quem é
              alcançado, é para QUAL AÇÃO o Meta otimiza a veiculação. */}
          {adSet.optimizationGoal && (
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Otimizado para
              </p>
              <span className="inline-block px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700">
                {adSet.optimizationGoal.replace(/_/g, ' ')}
              </span>
            </div>
          )}

          {/* Programação */}
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              Programação
            </p>
            <ScheduleDisplay
              scheduleDays={adSet.scheduleDays}
              scheduleStartHour={adSet.scheduleStartHour}
              scheduleEndHour={adSet.scheduleEndHour}
              scheduleTimeSlots={adSet.scheduleTimeSlots}
            />
          </div>

          {/* Localização */}
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
              Localização
            </p>
            <div className="flex flex-wrap gap-1">
              {locations.slice(0, 5).map((loc, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-sky-50 border border-sky-200 rounded-md text-[10px] font-bold text-sky-700">
                  <MapPinIcon className="h-2.5 w-2.5 shrink-0" />{loc}
                </span>
              ))}
              {locations.length > 5 && (
                <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[10px] font-bold text-gray-500">
                  +{locations.length - 5}
                </span>
              )}
            </div>
          </div>

          {/* Interesses (colapsável) */}
          {interests.length > 0 && (
            <div>
              <button
                onClick={() => setInterestsExpanded(p => !p)}
                className="flex items-center gap-1.5 mb-1.5 group"
              >
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">
                  Interesses
                </p>
                <span className="text-[9px] font-bold text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                  {interests.length}
                </span>
                <ChevronDownIcon className={cn(
                  'h-3 w-3 text-gray-400 transition-transform',
                  interestsExpanded && 'rotate-180',
                )} />
              </button>
              <AnimatePresence initial={false}>
                {interestsExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {interests.map((int, i) => (
                        <span key={i} className="px-2 py-0.5 bg-violet-50 border border-violet-200 rounded-md text-[10px] font-bold text-violet-700">
                          {int}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {!interestsExpanded && (
                <div className="flex flex-wrap gap-1">
                  {interests.slice(0, 4).map((int, i) => (
                    <span key={i} className="px-2 py-0.5 bg-violet-50 border border-violet-200 rounded-md text-[10px] font-bold text-violet-700">
                      {int}
                    </span>
                  ))}
                  {interests.length > 4 && (
                    <button
                      onClick={() => setInterestsExpanded(true)}
                      className="px-2 py-0.5 bg-gray-100 hover:bg-violet-50 rounded-md text-[10px] font-bold text-gray-500 hover:text-violet-700 transition-colors"
                    >
                      +{interests.length - 4} mais
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Criativos ── */}
      <div className="px-5 py-4 bg-gradient-to-b from-white to-gray-50/50">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
          Criativos
          {totalAds > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold">
              {totalAds} anúncio{totalAds !== 1 ? 's' : ''}
            </span>
          )}
        </p>
        <CreativesStrip ads={allAds} />
      </div>
    </motion.div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden animate-pulse">
      <div className="px-5 pt-5 pb-4 border-b border-gray-50 space-y-3">
        <div className="flex justify-between gap-3">
          <div className="flex gap-2">
            <div className="h-5 w-14 bg-gray-100 rounded-md" />
            <div className="h-5 w-20 bg-gray-100 rounded-md" />
          </div>
          <div className="h-5 w-16 bg-blue-50 rounded-md" />
        </div>
        <div className="h-4 w-52 bg-gray-100 rounded" />
        <div className="h-6 w-36 bg-indigo-50 rounded-lg" />
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 h-16 bg-indigo-50/60 rounded-xl" />
          <div className="flex-1 h-16 bg-slate-50 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <div className="h-2.5 w-20 bg-gray-100 rounded" />
          <div className="flex gap-1">
            {[0,1,2,3,4,5,6].map(i => <div key={i} className="w-7 h-7 bg-gray-100 rounded-md" />)}
          </div>
        </div>
        <div className="h-3 w-32 bg-gray-100 rounded" />
      </div>
      <div className="px-5 py-4 border-t border-gray-50 space-y-3">
        <div className="h-16 w-full bg-slate-50 rounded-xl" />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <div key={i} className="w-[68px] h-[68px] bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────

function Pagination({
  total, page, perPage, onChange,
}: { total: number; page: number; perPage: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;

  const pageNums: (number | '…')[] = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) pageNums.push(i);
  } else {
    pageNums.push(1);
    if (page > 3)           pageNums.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) pageNums.push(i);
    if (page < pages - 2)   pageNums.push('…');
    pageNums.push(pages);
  }

  return (
    <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-200">
      <p className="text-xs font-medium text-gray-500">
        Mostrando {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} de {total} campanha{total !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {pageNums.map((n, i) =>
          n === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm select-none">…</span>
          ) : (
            <button
              key={n}
              onClick={() => onChange(n as number)}
              className={cn(
                'w-8 h-8 rounded-lg text-sm font-bold transition-all',
                n === page
                  ? 'bg-gold-premium text-navy-dark shadow-sm shadow-gold-premium/30'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              {n}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────

export interface CampanhasModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** null = Minha Empresa (clientId=own), uuid string = cliente específico */
  effectiveClientId: string | null;
  campaignFor: 'own' | 'client';
  clientName?: string;
  /** Se true, não aplica filtro de clientId (master vê tudo) */
  isMaster?: boolean;
}

// Presets de período — mesma lógica de "Hoje/7d/15d/30d" do dashboard, adaptados
// pra filtro client-side por janela de veiculação (não agregação de gasto/leads).
const PERIOD_PRESETS = [
  { value: '1',  label: 'Hoje' },
  { value: '7',  label: '7d'   },
  { value: '15', label: '15d'  },
  { value: '30', label: '30d'  },
];

export default function CampanhasModal({
  isOpen, onClose, effectiveClientId, campaignFor, clientName, isMaster = false,
}: CampanhasModalProps) {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage]           = useState(1);
  // FASE 14d — classificação em lote
  const [showClassifyModal, setShowClassifyModal] = useState(false);
  const [classifyDismissed, setClassifyDismissed] = useState(false);

  // ── Pivot de cliente dentro do modal (sem fechar/reabrir) ──────────────────
  // 'own' | 'segment' (= todas: próprias + clientes) | <uuid de cliente>
  const [localClientFilter, setLocalClientFilter] = useState<ClientFilterValue>('own');
  const [clientOptions, setClientOptions]         = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading]       = useState(false);

  // ── Filtro de período — janela de veiculação (AdSet.startTime/endTime),
  // não janela de agregação de gasto/leads (esta tela não tem métrica). ─────
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd]     = useState('');
  const [quickPeriod, setQuickPeriod] = useState('');

  function applyQuickPeriod(days: string) {
    const end   = new Date();
    const start = new Date(Date.now() - (parseInt(days, 10) - 1) * 86400000);
    setQuickPeriod(days);
    setPeriodStart(start.toISOString().split('T')[0]);
    setPeriodEnd(end.toISOString().split('T')[0]);
  }

  function clearPeriod() {
    setQuickPeriod('');
    setPeriodStart('');
    setPeriodEnd('');
  }

  const fetchCampaigns = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (!isMaster) {
        if (localClientFilter === 'own') params.set('clientId', 'own');
        else if (localClientFilter !== 'segment') params.set('clientId', localClientFilter);
        // 'segment' (Todos os Clientes) → sem parâmetro; a API já retorna próprias + clientes
      }
      const res = await adminFetch(`/api/admin/campanhas/campaigns?${params}`);
      if (!res.ok) throw new Error(await res.text() || `Erro ${res.status}`);
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError((e as Error).message || 'Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }, [localClientFilter, isMaster]);

  // Reseta o estado do modal só na transição de abertura — pivotar cliente/período
  // DENTRO do modal já aberto não deve reiniciar busca/status/página sozinho.
  useEffect(() => {
    if (isOpen) {
      setLocalClientFilter(campaignFor === 'client' && effectiveClientId ? effectiveClientId : 'own');
      setSearch('');
      setStatusFilter('');
      clearPeriod();
      setPage(1);
      setClassifyDismissed(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Busca campanhas sempre que o modal abre OU o cliente pivotado muda
  useEffect(() => {
    if (isOpen) fetchCampaigns();
  }, [isOpen, fetchCampaigns]);

  // Carrega a lista de clientes pra o ClientSelector (não aplicável a master,
  // que já vê tudo sem noção de cliente único nesta tela)
  useEffect(() => {
    if (!isOpen || isMaster) return;
    setClientsLoading(true);
    fetch('/api/admin/campanhas/clients', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list: any[] = Array.isArray(data) ? data : (data.clients || []);
        setClientOptions(list.map((c: any) => ({
          id:            c.id   || c.uuid,
          name:          c.name || c.nome || '',
          email:         c.email || null,
          segmentName:   c.segmentName || c.segment_name || c.segment_slug || null,
          campaignCount: c.campaignCount ?? undefined,
        })));
      })
      .catch(() => {})
      .finally(() => setClientsLoading(false));
  }, [isOpen, isMaster]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, periodStart, periodEnd]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // FASE 14d — contagem para o banner de classificação
  const unclassifiedCount = campaigns.filter(c => !c.declaredAngle).length;

  // Overlap com a janela de veiculação real (AdSet.startTime/endTime) — não é
  // "criada entre X e Y", é "esteve/está ativa nesse intervalo" (mesmo critério
  // que o próprio Meta Ads Manager usa pra filtrar lista de campanhas por data).
  function overlapsPeriod(c: CampaignData): boolean {
    if (!periodStart && !periodEnd) return true;
    const rangeStart = periodStart ? new Date(`${periodStart}T00:00:00`) : null;
    const rangeEnd   = periodEnd   ? new Date(`${periodEnd}T23:59:59`)   : null;
    if (c.adSets.length === 0) return false;
    return c.adSets.some(as => {
      const flightStart = new Date(as.startTime);
      const flightEnd    = as.endTime ? new Date(as.endTime) : null;
      if (rangeEnd && flightStart > rangeEnd) return false;
      if (rangeStart && flightEnd && flightEnd < rangeStart) return false;
      return true;
    });
  }

  const hasActiveFilters = !!(search || statusFilter || periodStart || periodEnd);

  const filtered = campaigns.filter(c => {
    const matchSearch  = !search       || c.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchStatus  = !statusFilter || c.status === statusFilter;
    const matchPeriod  = overlapsPeriod(c);
    return matchSearch && matchStatus && matchPeriod;
  });

  const totalFiltered = filtered.length;
  const paginated     = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const isClientPivot   = localClientFilter !== 'own' && localClientFilter !== 'segment';
  const pivotedClientName = isClientPivot
    ? clientOptions.find(c => c.id === localClientFilter)?.name ?? clientName
    : undefined;

  const contextTitle = isMaster
    ? 'Todas as Campanhas'
    : localClientFilter === 'segment'
    ? 'Todas as Campanhas'
    : pivotedClientName
    ? `Campanhas de ${pivotedClientName}`
    : 'Campanhas da Minha Empresa';

  const contextSubtitle = isMaster
    ? 'Visão consolidada'
    : localClientFilter === 'segment'
    ? 'Próprias + Clientes'
    : pivotedClientName || 'Minha Empresa';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex flex-col bg-gray-950/50 backdrop-blur-[2px]"
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="flex flex-col w-full h-full bg-gray-50 overflow-hidden"
          >
            {/* ── Modal header ── */}
            <div className="shrink-0 bg-white border-b border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,.06)]">
              <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  {/* ← Retornar + title */}
                  <div className="flex items-center gap-4 min-w-0">
                    <button
                      onClick={onClose}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-black text-gray-600 border border-gray-200 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50 transition-all shrink-0 active:scale-95"
                    >
                      <ArrowLeftIcon className="h-4 w-4" />
                      Retornar
                    </button>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-0.5">
                        {contextSubtitle}
                      </p>
                      <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-baseline gap-2">
                        {contextTitle}
                        {!loading && campaigns.length > 0 && (
                          <span className="text-sm font-bold text-gray-400">
                            ({totalFiltered}
                            {totalFiltered !== campaigns.length && `/${campaigns.length}`})
                          </span>
                        )}
                      </h2>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Busca por nome (texto livre — filtra por substring, pode retornar 0) */}
                    <div className="relative hidden md:block">
                      <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        disabled={loading || campaigns.length === 0}
                        placeholder={loading ? 'Carregando…' : `Buscar por nome (${campaigns.length})`}
                        className="py-2 pl-8 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-[220px]"
                      />
                    </div>

                    {/* Status filter */}
                    <div className="relative hidden md:block">
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="py-2 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none shadow-sm cursor-pointer"
                      >
                        <option value="">Todos status</option>
                        <option value="ACTIVE">Ativas</option>
                        <option value="PAUSED">Pausadas</option>
                        <option value="ARCHIVED">Arquivadas</option>
                        <option value="DELETED">Removidas</option>
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    </div>

                    {/* Refresh */}
                    <button
                      onClick={fetchCampaigns}
                      disabled={loading}
                      className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all disabled:opacity-40"
                      title="Atualizar lista"
                    >
                      <ArrowPathIcon className={cn('h-5 w-5', loading && 'animate-spin')} />
                    </button>
                  </div>
                </div>

                {/* Mobile filters */}
                <div className="mt-3 md:hidden flex gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      disabled={loading || campaigns.length === 0}
                      placeholder={loading ? 'Carregando…' : 'Buscar por nome'}
                      className="w-full py-2.5 pl-8 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="h-full py-2 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer"
                    >
                      <option value="">Status</option>
                      <option value="ACTIVE">Ativas</option>
                      <option value="PAUSED">Pausadas</option>
                      <option value="ARCHIVED">Arquivadas</option>
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  </div>
                </div>

                {/* ── Pivot: Cliente + Período de veiculação ── */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                  {!isMaster && (
                    <ClientSelector
                      value={localClientFilter}
                      onChange={setLocalClientFilter}
                      clients={clientOptions}
                      loading={clientsLoading}
                      variant="toggle"
                    />
                  )}

                  {/* Container discreto — agrupa label + range + presets do período */}
                  <div className="flex flex-col gap-1.5 bg-gray-50/70 border border-gray-100 rounded-xl px-3 py-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Período de veiculação
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* DateInputPtBR: o <span> interno é sempre w-full do pai (a
                          largura vem de fora); sem esse wrapper de tamanho fixo, o
                          span estica pra ocupar a linha flex inteira e o ícone de
                          calendário (absolute right-2 do próprio componente) acaba
                          longe do fim visível do campo estreito. */}
                      <div className="w-[120px] shrink-0">
                        <DateInputPtBR
                          value={periodStart}
                          onChange={iso => { setPeriodStart(iso); setQuickPeriod(''); }}
                          className="w-full py-2 pl-3 pr-7 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                        />
                      </div>
                      <span className="text-gray-300 text-xs font-bold">→</span>
                      <div className="w-[120px] shrink-0">
                        <DateInputPtBR
                          value={periodEnd}
                          onChange={iso => { setPeriodEnd(iso); setQuickPeriod(''); }}
                          className="w-full py-2 pl-3 pr-7 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                        />
                      </div>
                      <div className="flex gap-1 rounded-lg p-1 border border-gray-200 bg-white">
                        {PERIOD_PRESETS.map(p => (
                          <button
                            key={p.value}
                            onClick={() => applyQuickPeriod(p.value)}
                            className={cn(
                              'px-2.5 py-1.5 rounded-md text-xs font-black transition-colors',
                              quickPeriod === p.value
                                ? 'bg-gold-premium text-navy-dark'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
                            )}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                      {(periodStart || periodEnd) && (
                        <button
                          onClick={clearPeriod}
                          title="Limpar período"
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-all"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Modal body ── */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto px-6 py-8">

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-8">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-red-700">Erro ao carregar campanhas</p>
                      <p className="text-xs text-red-500 mt-0.5 break-words">{error}</p>
                    </div>
                    <button
                      onClick={fetchCampaigns}
                      className="shrink-0 text-xs font-black text-red-600 hover:text-red-800 uppercase tracking-widest transition-colors"
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}

                {/* FASE 14d — banner de classificação automática */}
                {!loading && !error && unclassifiedCount > 0 && !classifyDismissed && (
                  <ClassifyBanner
                    count={unclassifiedCount}
                    onClassify={() => setShowClassifyModal(true)}
                    onDismiss={() => setClassifyDismissed(true)}
                  />
                )}

                {/* Skeletons */}
                {loading && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
                  </div>
                )}

                {/* Empty state */}
                {!loading && !error && totalFiltered === 0 && (
                  <div className="flex flex-col items-center justify-center py-28 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                      <RocketLaunchIcon className="h-12 w-12 text-indigo-300" />
                    </div>
                    <p className="text-lg font-black text-gray-700 mb-2">
                      {hasActiveFilters ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha lançada ainda'}
                    </p>
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                      {hasActiveFilters
                        ? 'Ajuste os filtros de busca, status ou período.'
                        : `Use "Configurar Campanha" para lançar ${
                            pivotedClientName ? `a primeira campanha de ${pivotedClientName}` : 'sua primeira campanha'
                          }.`}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={() => { setSearch(''); setStatusFilter(''); clearPeriod(); }}
                        className="mt-5 px-5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-all shadow-sm"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                )}

                {/* Grid */}
                {!loading && paginated.length > 0 && (
                  <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {paginated.map((campaign, i) => (
                        <CampaignCard key={campaign.id} campaign={campaign} index={i} />
                      ))}
                    </div>
                    <Pagination
                      total={totalFiltered}
                      page={page}
                      perPage={ITEMS_PER_PAGE}
                      onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    />
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* FASE 14d — Modal de classificação em lote (z-[60], acima do modal principal) */}
      <ClassifyModal
        isOpen={showClassifyModal}
        onClose={() => setShowClassifyModal(false)}
        onDone={() => {
          setShowClassifyModal(false);
          setClassifyDismissed(true);
          fetchCampaigns(); // atualiza badges após classificação
        }}
      />
    </AnimatePresence>
  );
}
