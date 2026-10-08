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
import { cn, NETWORK_LABELS } from '@/lib/marketing-utils';
import { ANGLE_OPTIONS, angleLabel } from '@/lib/marketing/angles';
import { PencilIcon, CheckIcon } from '@heroicons/react/24/outline';
import ClientSelector, { type ClientOption, type ClientFilterValue } from '@/components/crm/ClientSelector';
import DateInputPtBR from '@/components/ui/DateInputPtBR';
import SafeImage from '@/components/common/SafeImage';

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
  // Código real da rede (meta/google/tiktok...), resolvido no servidor via ad_networks —
  // nunca mais assumir "Meta Ads" fixo (ver networkLabel() mais abaixo).
  networkCode?: string;
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
  const code = campaign.networkCode ?? 'meta';
  return NETWORK_LABELS[code] ?? (code.charAt(0).toUpperCase() + code.slice(1));
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

// ── Theming ───────────────────────────────────────────────────────
// CampanhasModal é aberto tanto de /admin/campanhas/nova (sempre claro, sem conceito de
// tema) quanto de /admin/campanhas/dashboard (que tem o toggle claro/escuro próprio) —
// `isDark` é opcional (default false) pra preservar 100% o visual já existente em nova,
// e só entra em jogo quando o chamador passa o tema ativo do dashboard.

type BadgeTone = 'emerald' | 'amber' | 'red' | 'gray' | 'sky' | 'violet' | 'indigo' | 'teal' | 'rose' | 'yellow' | 'orange' | 'blue';

const BADGE_TONE_DARK: Record<BadgeTone, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  amber:   'bg-amber-500/10 text-amber-400 border-amber-500/30',
  red:     'bg-red-500/10 text-red-400 border-red-500/30',
  gray:    'bg-white/5 text-slate-400 border-white/10',
  sky:     'bg-sky-500/10 text-sky-400 border-sky-500/30',
  violet:  'bg-violet-500/10 text-violet-400 border-violet-500/30',
  indigo:  'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  teal:    'bg-teal-500/10 text-teal-400 border-teal-500/30',
  rose:    'bg-rose-500/10 text-rose-400 border-rose-500/30',
  yellow:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  orange:  'bg-orange-500/10 text-orange-400 border-orange-500/30',
  blue:    'bg-blue-500/10 text-blue-400 border-blue-500/30',
};
const BADGE_TONE_LIGHT: Record<BadgeTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  red:     'bg-red-50 text-red-700 border-red-200',
  gray:    'bg-gray-100 text-gray-500 border-gray-200',
  sky:     'bg-sky-50 text-sky-700 border-sky-200',
  violet:  'bg-violet-50 text-violet-700 border-violet-200',
  indigo:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  teal:    'bg-teal-50 text-teal-700 border-teal-200',
  rose:    'bg-rose-50 text-rose-700 border-rose-200',
  yellow:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  orange:  'bg-orange-50 text-orange-700 border-orange-200',
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
};

function badgeCls(tone: BadgeTone, isDark: boolean): string {
  return isDark ? BADGE_TONE_DARK[tone] : BADGE_TONE_LIGHT[tone];
}

// ── Status Badge ──────────────────────────────────────────────────
// Values come from DB; status = Campaign.status | lifecycle_status

function StatusBadge({ status, isDark = false }: { status: string; isDark?: boolean }) {
  const cfg: Record<string, { label: string; tone: BadgeTone }> = {
    // campaign.status
    ACTIVE:            { label: 'Ativa',           tone: 'emerald' },
    PAUSED:            { label: 'Pausada',          tone: 'amber' },
    DELETED:           { label: 'Removida',         tone: 'red' },
    ARCHIVED:          { label: 'Arquivada',        tone: 'gray' },
    // lifecycle_status
    DRAFT:             { label: 'Rascunho',         tone: 'sky' },
    LEARNING:          { label: 'Aprendizado',      tone: 'violet' },
    LEARNING_LIMITED:  { label: 'Aprend. Limitado', tone: 'violet' },
    IN_PROCESS:        { label: 'Em andamento',     tone: 'indigo' },
    STABLE:            { label: 'Estável',          tone: 'teal' },
    COMPLETED:         { label: 'Concluída',        tone: 'teal' },
    KILLED:            { label: 'Encerrada',        tone: 'rose' },
    UNDER_REVIEW:      { label: 'Em revisão',       tone: 'yellow' },
    WITH_ISSUES:       { label: 'Com problemas',    tone: 'orange' },
  };
  const { label, tone } = cfg[status] ?? { label: status.replace(/_/g, ' '), tone: 'gray' as BadgeTone };
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border',
      badgeCls(tone, isDark),
    )}>
      {label}
    </span>
  );
}

// ── Funnel Badge ──────────────────────────────────────────────────
// funnelStage values from DB: TOF | MOF | BOF | TOPO | MEIO | FUNDO

function FunnelBadge({ stage, isDark = false }: { stage: string; isDark?: boolean }) {
  const MAP: Record<string, { label: string; tone: BadgeTone }> = {
    TOF:    { label: 'Topo de Funil',  tone: 'indigo' },
    TOPO:   { label: 'Topo de Funil',  tone: 'indigo' },
    TOP:    { label: 'Topo de Funil',  tone: 'indigo' },
    MOF:    { label: 'Meio de Funil',  tone: 'violet' },
    MEIO:   { label: 'Meio de Funil',  tone: 'violet' },
    MIDDLE: { label: 'Meio de Funil',  tone: 'violet' },
    BOF:    { label: 'Fundo de Funil', tone: 'rose' },
    FUNDO:  { label: 'Fundo de Funil', tone: 'rose' },
    BOTTOM: { label: 'Fundo de Funil', tone: 'rose' },
  };
  const entry = MAP[stage];
  if (!entry) return null;
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border',
      badgeCls(entry.tone, isDark),
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
function AngleBadge({ campaignId, angle, angleSource, onUpdated, isDark = false }: {
  campaignId: string;
  angle?: string | null;
  angleSource?: string | null;
  onUpdated: (newAngle: string | null, newSource: string | null) => void;
  isDark?: boolean;
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
          className={cn(
            'text-[10px] font-semibold border rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400',
            isDark ? 'border-blue-500/40 bg-navy-light text-slate-200' : 'border-blue-300 bg-white text-gray-800',
          )}
        >
          <option value="">Sem ângulo</option>
          {ANGLE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={saving}
          className={cn('p-0.5 rounded', isDark ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50')}
        >
          <CheckIcon className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  // Visual state
  const hasAngle = !!angle;
  const tone: BadgeTone = !hasAngle
    ? 'amber'
    : angleSource === 'declared'
    ? 'emerald'
    : angleSource === 'llm_auto'
    ? 'blue'
    : 'violet';
  const hoverCls = isDark
    ? (!hasAngle ? 'hover:bg-amber-500/20' : angleSource === 'declared' ? 'hover:bg-emerald-500/20' : angleSource === 'llm_auto' ? 'hover:bg-blue-500/20' : 'hover:bg-violet-500/20')
    : (!hasAngle ? 'hover:bg-amber-100' : angleSource === 'declared' ? 'hover:bg-emerald-100' : angleSource === 'llm_auto' ? 'hover:bg-blue-100' : 'hover:bg-violet-100');

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
        badgeCls(tone, isDark),
        hoverCls,
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

function ClassifyBanner({ count, onClassify, onDismiss, isDark = false }: {
  count: number;
  onClassify: () => void;
  onDismiss: () => void;
  isDark?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5 mb-6 border',
      isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200',
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <SparklesIcon className={cn('h-5 w-5 shrink-0', isDark ? 'text-blue-400' : 'text-blue-600')} />
        <div className="min-w-0">
          <p className={cn('text-sm font-black', isDark ? 'text-blue-300' : 'text-blue-900')}>
            {count} campanha{count !== 1 ? 's' : ''} sem ângulo classificado
          </p>
          <p className={cn('text-xs mt-0.5 hidden sm:block', isDark ? 'text-blue-400' : 'text-blue-600')}>
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
          className={cn(
            'p-1 transition-colors rounded-lg',
            isDark ? 'text-blue-400 hover:text-blue-200 hover:bg-blue-500/20' : 'text-blue-400 hover:text-blue-700 hover:bg-blue-100',
          )}
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

function ClassifyModal({ isOpen, onClose, onDone, isDark = false }: {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
  isDark?: boolean;
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
    <>
    {/* Sem AnimatePresence/exit — mesmo risco já corrigido no modal principal: a animação
        de saída podia nunca completar, deixando este overlay (z-[60], tela cheia) preso no
        DOM pra sempre em opacity:0, bloqueando clique em tudo por trás mesmo depois de
        "fechado". */}
    {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-950/60"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className={cn(
              'rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden',
              isDark ? 'bg-navy-light' : 'bg-white',
            )}
          >
            {/* Header */}
            <div className={cn('px-6 py-4 flex items-center justify-between shrink-0 border-b', isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-gray-100')}>
              <div className="flex items-center gap-2">
                <SparklesIcon className={cn('h-5 w-5', isDark ? 'text-blue-400' : 'text-blue-600')} />
                <h3 className={cn('text-base font-black', isDark ? 'text-slate-100' : 'text-gray-900')}>Classificar Ângulos com IA</h3>
              </div>
              {step !== 'saving' && (
                <button
                  onClick={onClose}
                  className={cn(
                    'p-1 rounded-lg transition-all',
                    isDark ? 'text-slate-500 hover:text-slate-200 hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100',
                  )}
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
                    <div className={cn('w-12 h-12 rounded-full border-4 animate-spin', isDark ? 'border-blue-500/20 border-t-blue-400' : 'border-blue-100 border-t-blue-600')} />
                    <SparklesIcon className={cn('h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', isDark ? 'text-blue-400' : 'text-blue-600')} />
                  </div>
                  <div className="text-center">
                    <p className={cn('text-sm font-black', isDark ? 'text-slate-200' : 'text-gray-800')}>Analisando campanhas...</p>
                    <p className={cn('text-xs mt-1', isDark ? 'text-slate-500' : 'text-gray-400')}>A IA está lendo os nomes e inferindo o ângulo de comunicação.</p>
                  </div>
                </div>
              )}

              {/* Review */}
              {step === 'review' && (
                <div className="p-6 space-y-4">
                  {classifyError && (
                    <div className={cn(
                      'flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-medium border',
                      isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700',
                    )}>
                      <ExclamationCircleIcon className="h-4 w-4 shrink-0" />
                      {classifyError}
                    </div>
                  )}

                  {results.length === 0 && !classifyError && (
                    <p className={cn('text-sm text-center py-10', isDark ? 'text-slate-500' : 'text-gray-400')}>
                      Nenhuma campanha sem ângulo encontrada.
                    </p>
                  )}

                  {results.length > 0 && (
                    <>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className={cn('text-sm font-bold', isDark ? 'text-slate-300' : 'text-gray-700')}>
                          {results.length} campanha{results.length !== 1 ? 's' : ''} para classificar
                        </p>
                        {lowConfidenceCount > 0 && (
                          <span className={cn(
                            'flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border',
                            isDark ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-amber-700 bg-amber-50 border-amber-200',
                          )}>
                            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                            {lowConfidenceCount} com baixa confiança — verifique
                          </span>
                        )}
                      </div>

                      <div className={cn('rounded-xl overflow-hidden border', isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-gray-100')}>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className={cn('border-b', isDark ? 'bg-black/20 border-[rgba(255,255,255,0.06)]' : 'bg-gray-50 border-gray-100')}>
                              <th className={cn('text-left px-4 py-2.5 font-black uppercase tracking-wider text-[10px]', isDark ? 'text-slate-500' : 'text-gray-500')}>
                                Campanha
                              </th>
                              <th className={cn('text-left px-4 py-2.5 font-black uppercase tracking-wider text-[10px] w-48', isDark ? 'text-slate-500' : 'text-gray-500')}>
                                Ângulo sugerido
                              </th>
                              <th className="px-3 py-2.5 w-8" />
                            </tr>
                          </thead>
                          <tbody className={cn('divide-y', isDark ? 'divide-[rgba(255,255,255,0.04)]' : 'divide-gray-50')}>
                            {results.map(r => (
                              <tr
                                key={r.id}
                                className={cn(
                                  'transition-colors',
                                  r.confidence === 'low'
                                    ? (isDark ? 'bg-amber-500/5' : 'bg-amber-50/40')
                                    : (isDark ? 'bg-transparent hover:bg-white/[0.03]' : 'bg-white hover:bg-gray-50/50'),
                                )}
                              >
                                <td className={cn('px-4 py-2.5 font-medium truncate max-w-[220px]', isDark ? 'text-slate-200' : 'text-gray-800')} title={r.name}>
                                  {r.name}
                                </td>
                                <td className="px-4 py-2.5">
                                  <select
                                    value={editedAngles[r.id] ?? r.suggestedAngle}
                                    onChange={e => setEditedAngles(prev => ({ ...prev, [r.id]: e.target.value }))}
                                    className={cn(
                                      'w-full text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 appearance-none border',
                                      isDark ? 'border-white/10 bg-navy text-slate-200' : 'border-gray-200 bg-white text-gray-800',
                                    )}
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

                      <div className={cn('flex items-center gap-4 text-[10px]', isDark ? 'text-slate-500' : 'text-gray-400')}>
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
                  <div className={cn('w-full rounded-full h-2 overflow-hidden', isDark ? 'bg-white/5' : 'bg-gray-100')}>
                    <motion.div
                      className="h-full bg-blue-500 rounded-full"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-gray-700')}>
                    Salvando classificações... {Math.round(progress)}%
                  </p>
                </div>
              )}

              {/* Done */}
              {step === 'done' && (
                <div className="p-6 space-y-5">
                  <div className="text-center py-2">
                    <div className={cn('w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm', isDark ? 'bg-emerald-500/10' : 'bg-emerald-50')}>
                      <CheckIcon className={cn('h-7 w-7', isDark ? 'text-emerald-400' : 'text-emerald-600')} />
                    </div>
                    <p className={cn('text-base font-black', isDark ? 'text-slate-100' : 'text-gray-900')}>
                      {savedCount} campanha{savedCount !== 1 ? 's' : ''} classificada{savedCount !== 1 ? 's' : ''}
                    </p>
                    <p className={cn('text-xs mt-1', isDark ? 'text-slate-500' : 'text-gray-400')}>
                      Os dados já estão disponíveis em Cross-Insights → Performance por Ângulo.
                    </p>
                  </div>

                  {summary.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {summary.map(([ang, count]) => (
                        <div key={ang} className={cn('flex items-center justify-between rounded-xl px-3.5 py-2.5 border', isDark ? 'bg-white/[0.03] border-[rgba(255,255,255,0.06)]' : 'bg-gray-50 border-gray-100')}>
                          <span className={cn('text-xs font-bold truncate', isDark ? 'text-slate-300' : 'text-gray-700')}>{angleLabel(ang)}</span>
                          <span className={cn('text-sm font-black shrink-0 ml-2', isDark ? 'text-slate-100' : 'text-gray-900')}>{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {(step === 'review' || step === 'done') && (
              <div className={cn('px-6 py-4 flex items-center justify-end gap-3 shrink-0 border-t', isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-gray-100')}>
                {step === 'review' && (
                  <>
                    <button
                      onClick={onClose}
                      className={cn(
                        'px-4 py-2 text-sm font-bold rounded-xl transition-all',
                        isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
                      )}
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
                    className={cn(
                      'px-5 py-2 rounded-xl text-sm font-black transition-all',
                      isDark ? 'bg-white/10 text-slate-100 hover:bg-white/15' : 'bg-gray-900 text-white hover:bg-gray-700',
                    )}
                  >
                    Fechar
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
    )}
    </>
  );
}

// ── Creative Image Thumb ──────────────────────────────────────────

function CreativeThumb({ url, index, isDark = false }: { url: string; index: number; isDark?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className={cn(
        'w-[68px] h-[68px] rounded-xl border shrink-0 flex items-center justify-center',
        isDark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gradient-to-br from-gray-50 to-gray-100',
      )}>
        <PhotoIcon className={cn('h-5 w-5', isDark ? 'text-slate-600' : 'text-gray-300')} />
      </div>
    );
  }
  return (
    <div className={cn(
      'w-[68px] h-[68px] rounded-xl overflow-hidden border shrink-0 shadow-sm relative',
      isDark ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-100',
    )}>
      {/* SafeImage (next/image) redimensiona no servidor — os arquivos reais em
          CreativeAsset.storage_url são originais de até ~3MB, pesados demais pra
          baixar só pra exibir 68x68px; isso também evita o bloqueio silencioso do
          otimizador do Next pra host MinIO não configurado em remotePatterns, e lida
          com blob:/caminho relativo automaticamente (mesmo padrão já usado nas
          fotos de imóveis, ver next.config.js). */}
      <SafeImage
        src={url}
        alt={`Criativo ${index + 1}`}
        fill
        sizes="68px"
        className="object-cover hover:scale-105 transition-transform duration-300"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

// ── Creative Strip ────────────────────────────────────────────────
// Order: headline/body text FIRST, then thumbnails

function CreativesStrip({ ads, isDark = false }: { ads: AdData[]; isDark?: boolean }) {
  // Prefer CDN asset URLs over blob URLs
  const allImages = ads.flatMap(ad =>
    (ad.assetUrls && ad.assetUrls.length > 0) ? ad.assetUrls : (ad.images ?? [])
  ).slice(0, 8);

  const firstAd = ads[0];

  return (
    <div className="space-y-3">
      {/* Text content FIRST */}
      {firstAd && (firstAd.headline || firstAd.body) && (
        <div className={cn('rounded-xl p-3 space-y-1 border', isDark ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100')}>
          {firstAd.headline && (
            <p className={cn('text-xs font-bold line-clamp-1', isDark ? 'text-slate-100' : 'text-gray-900')}>{firstAd.headline}</p>
          )}
          {firstAd.body && (
            <p className={cn('text-[11px] line-clamp-3 leading-relaxed', isDark ? 'text-slate-400' : 'text-gray-500')}>{firstAd.body}</p>
          )}
          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            {firstAd.ctaType && (
              <span className={cn('px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider', isDark ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-100 text-indigo-700')}>
                {firstAd.ctaType.replace(/_/g, ' ')}
              </span>
            )}
            {firstAd.creativeType && (
              <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider', isDark ? 'bg-white/5 text-slate-400' : 'bg-gray-100 text-gray-500')}>
                {fmtCreativeType(firstAd.creativeType)}
              </span>
            )}
            {firstAd.linkUrl && (
              <span className={cn(
                'px-2 py-0.5 rounded text-[9px] font-bold truncate max-w-[140px] border',
                isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
              )} title={firstAd.linkUrl}>
                {firstAd.linkUrl.replace(/^https?:\/\//, '').split('/')[0]}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Thumbnails SECOND */}
      {allImages.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
          {allImages.map((url, i) => <CreativeThumb key={`${i}-${url}`} url={url} index={i} isDark={isDark} />)}
        </div>
      ) : (
        <div className={cn('flex items-center gap-2 py-1', isDark ? 'text-slate-600' : 'text-gray-400')}>
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
  scheduleDays, scheduleStartHour, scheduleEndHour, scheduleTimeSlots, isDark = false,
}: ScheduleDisplayProps & { isDark?: boolean }) {
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
          <div className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border',
            isDark ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : 'bg-violet-50 border-violet-200 text-violet-700',
          )}>
            Personalizado por dia
          </div>
          <div className="grid grid-cols-4 gap-1">
            {expanded.map((slot, i) => (
              <div key={i} className={cn('rounded-lg px-2 py-1.5 text-center border', isDark ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100')}>
                <p className={cn('text-[9px] font-black uppercase tracking-wider', isDark ? 'text-indigo-400' : 'text-indigo-600')}>
                  {DAY_LABELS[slot.day] ?? `D${slot.day}`}
                </p>
                <p className={cn('text-[10px] font-semibold leading-tight mt-0.5', isDark ? 'text-slate-300' : 'text-gray-700')}>
                  {fmtMinutes(slot.startMin)}<span className={isDark ? 'text-slate-600' : 'text-gray-400'}>–</span>{fmtMinutes(slot.endMin)}
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
  const arrowCls = isDark ? 'text-slate-600' : 'text-gray-400';

  return (
    <div className="space-y-2">
      {allDays ? (
        <span className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border',
          isDark ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600',
        )}>
          Todos os dias
        </span>
      ) : (
        <div className="flex gap-1 flex-wrap">
          {DAY_LABELS.map((d, i) => (
            <span key={i} className={cn(
              'w-7 h-7 flex items-center justify-center rounded-md text-[10px] font-black',
              scheduleDays?.includes(i)
                ? 'bg-gold-premium text-navy-dark shadow-sm shadow-gold-premium/30'
                : (isDark ? 'bg-white/5 text-slate-600' : 'bg-gray-100 text-gray-400'),
            )}>
              {d.slice(0, 2)}
            </span>
          ))}
        </div>
      )}
      {/* Sempre mostra um horário — sem restrição configurada = veiculação o dia inteiro */}
      <p className={cn('text-[11px] font-semibold', isDark ? 'text-slate-400' : 'text-gray-600')}>
        {hasCustomHours
          ? <>{fmtHour(scheduleStartHour)} <span className={arrowCls}>→</span> {fmtHour(scheduleEndHour)}</>
          : <>00:00 <span className={arrowCls}>→</span> 24:00 <span className={cn('font-medium', arrowCls)}>(dia todo)</span></>}
      </p>
    </div>
  );
}

// ── Campaign Card ─────────────────────────────────────────────────

function CampaignCard({ campaign, index, isDark = false }: { campaign: CampaignData; index: number; isDark?: boolean }) {
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

  const labelCls = cn('text-[9px] font-black uppercase tracking-widest mb-1.5', isDark ? 'text-slate-500' : 'text-gray-400');

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.25), type: 'spring', stiffness: 280, damping: 30 }}
      className={cn(
        'rounded-2xl shadow-sm overflow-hidden transition-all duration-200 flex flex-col border',
        isDark
          ? 'bg-navy-light border-[rgba(255,255,255,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.25)] hover:border-white/10'
          : 'bg-white border-gray-100 hover:shadow-md hover:border-gray-200',
      )}
    >
      {/* ── Header ── */}
      <div className={cn('px-5 pt-5 pb-4 border-b', isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-gray-50')}>
        {/* Badges row */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            <StatusBadge status={campaign.status} isDark={isDark} />
            {campaign.lifecycleStatus && campaign.lifecycleStatus !== campaign.status && (
              <StatusBadge status={campaign.lifecycleStatus} isDark={isDark} />
            )}
            {/* FASE 14/14d — ângulo de comunicação (sempre visível, editável inline) */}
            <AngleBadge
              campaignId={campaign.id}
              angle={localAngle}
              angleSource={localAngleSource}
              onUpdated={(a, s) => { setLocalAngle(a); setLocalAngleSource(s); }}
              isDark={isDark}
            />
            {campaign.funnelStage && <FunnelBadge stage={campaign.funnelStage} isDark={isDark} />}
          </div>
          {/* Network chip + Meta ID */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider whitespace-nowrap border', badgeCls('blue', isDark))}>
              {network}
            </span>
            {campaign.metaCampaignId && (
              <span className={cn(
                'text-[9px] font-bold rounded px-1.5 py-0.5 font-mono hidden sm:inline-block select-all border',
                isDark ? 'text-slate-500 bg-white/5 border-white/10' : 'text-gray-400 bg-gray-50 border-gray-200',
              )}>
                {campaign.metaCampaignId.slice(0, 12)}…
              </span>
            )}
          </div>
        </div>

        {/* Campaign name */}
        <h3 className={cn('text-sm font-black leading-snug mb-2', isDark ? 'text-slate-100' : 'text-gray-900')}>
          <span className={cn('font-bold', isDark ? 'text-slate-500' : 'text-gray-400')}>CAMPANHA </span>
          {campaign.name}
        </h3>

        {/* Objetivo */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border', badgeCls('indigo', isDark))}>
            <RocketLaunchIcon className="h-3 w-3 shrink-0" />
            {objectiveLabel(campaign.objective)}
          </span>
        </div>
      </div>

      {/* ── AdSet section ── */}
      {adSet && (
        <div className={cn('px-5 py-4 border-b space-y-4 flex-1', isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-gray-50')}>
          {/* Budget, Criação & Período — mesmo peso visual nos 3 */}
          <div className="flex items-stretch gap-3">
            <div className={cn(
              'flex-1 rounded-xl px-3 py-2.5 border',
              isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-100',
            )}>
              <p className={cn('text-[9px] font-black uppercase tracking-widest mb-0.5', isDark ? 'text-indigo-400' : 'text-indigo-400')}>
                Orçamento diário
              </p>
              <p className={cn('text-base font-black leading-tight', isDark ? 'text-indigo-300' : 'text-indigo-800')}>
                {fmtBudget(adSet.dailyBudget)}
              </p>
            </div>
            <div className={cn('flex-1 rounded-xl px-3 py-2.5 border', isDark ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100')}>
              <p className={cn('text-[9px] font-black uppercase tracking-widest mb-0.5', isDark ? 'text-slate-500' : 'text-gray-400')}>
                Criada em
              </p>
              <p className={cn('text-[11px] font-bold leading-snug', isDark ? 'text-slate-300' : 'text-gray-700')}>
                {fmtDate(campaign.createdAt)}
              </p>
            </div>
            <div className={cn('flex-1 rounded-xl px-3 py-2.5 border', isDark ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100')}>
              <p className={cn('text-[9px] font-black uppercase tracking-widest mb-0.5', isDark ? 'text-slate-500' : 'text-gray-400')}>
                Período
              </p>
              <p className={cn('text-[11px] font-bold leading-snug', isDark ? 'text-slate-300' : 'text-gray-700')}>
                {fmtDate(adSet.startTime)}{' '}
                <span className={isDark ? 'text-slate-600' : 'text-gray-400'}>→</span>{' '}
                {adSet.endTime
                  ? <span className={isDark ? 'text-slate-300' : 'text-gray-700'}>{fmtDate(adSet.endTime)}</span>
                  : <span className={cn('font-medium', isDark ? 'text-slate-600' : 'text-gray-400')}>sem data final</span>}
              </p>
            </div>
          </div>

          {/* Desempenho acumulado — mesmos indicadores da Visão Executiva (dashboard), sem
              filtro de período: cumulativo desde sempre até agora. "Campanhas Ativas" fica de
              fora (métrica de portfólio, não de campanha individual). */}
          {campaign.metrics && (
            <div className={cn('rounded-xl px-3 py-2.5 border', isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50/70 border-slate-100')}>
              <p className={cn('text-[9px] font-black uppercase tracking-widest mb-1.5', isDark ? 'text-slate-500' : 'text-gray-400')}>
                Desempenho Acumulado
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                <div className={cn('rounded-lg px-2 py-2 text-center border', isDark ? 'bg-white/[0.03] border-white/5' : 'bg-slate-50 border-slate-100')}>
                  <p className={cn('text-[8px] font-black uppercase tracking-wider', isDark ? 'text-slate-500' : 'text-slate-400')}>Gasto</p>
                  <p className={cn('text-[11px] font-black mt-0.5 leading-tight', isDark ? 'text-slate-200' : 'text-slate-800')}>
                    {fmtCurrency(campaign.metrics.spend)}
                  </p>
                </div>
                <div className={cn('rounded-lg px-2 py-2 text-center border', isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100')}>
                  <p className={cn('text-[8px] font-black uppercase tracking-wider leading-tight', isDark ? 'text-indigo-400' : 'text-indigo-400')}>Sinais Interesse</p>
                  <p className={cn('text-[11px] font-black mt-0.5 leading-tight', isDark ? 'text-indigo-300' : 'text-indigo-700')}>
                    {campaign.metrics.leads}
                  </p>
                </div>
                <div className={cn('rounded-lg px-2 py-2 text-center border', isDark ? 'bg-teal-500/10 border-teal-500/20' : 'bg-teal-50 border-teal-100')}>
                  <p className={cn('text-[8px] font-black uppercase tracking-wider', isDark ? 'text-teal-400' : 'text-teal-500')}>Custo/Sinal</p>
                  <p className={cn('text-[11px] font-black mt-0.5 leading-tight', isDark ? 'text-teal-300' : 'text-teal-700')}>
                    {campaign.metrics.cpl !== null ? fmtCurrency(campaign.metrics.cpl) : '—'}
                  </p>
                </div>
                <div className={cn('rounded-lg px-2 py-2 text-center border', isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-100')}>
                  <p className={cn('text-[8px] font-black uppercase tracking-wider', isDark ? 'text-amber-400' : 'text-amber-500')}>
                    {campaign.metrics.hookRate !== null ? 'Hook Rate' : 'CTR'}
                  </p>
                  <p className={cn('text-[11px] font-black mt-0.5 leading-tight', isDark ? 'text-amber-300' : 'text-amber-700')}>
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
            <p className={labelCls}>
              Público-alvo
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold', isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700')}>
                {adSet.ageMin}–{adSet.ageMax} anos
              </span>
              <span className={cn('px-2.5 py-1 rounded-lg text-[11px] font-bold', isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700')}>
                {genderLabel(adSet.genders)}
              </span>
            </div>
          </div>

          {/* Otimização de entrega — separado do Público-alvo: não é quem é
              alcançado, é para QUAL AÇÃO o Meta otimiza a veiculação. */}
          {adSet.optimizationGoal && (
            <div>
              <p className={labelCls}>
                Otimizado para
              </p>
              <span className={cn('inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold', isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-700')}>
                {adSet.optimizationGoal.replace(/_/g, ' ')}
              </span>
            </div>
          )}

          {/* Programação */}
          <div>
            <p className={labelCls}>
              Programação
            </p>
            <ScheduleDisplay
              scheduleDays={adSet.scheduleDays}
              scheduleStartHour={adSet.scheduleStartHour}
              scheduleEndHour={adSet.scheduleEndHour}
              scheduleTimeSlots={adSet.scheduleTimeSlots}
              isDark={isDark}
            />
          </div>

          {/* Localização */}
          <div>
            <p className={labelCls}>
              Localização
            </p>
            <div className="flex flex-wrap gap-1">
              {locations.slice(0, 5).map((loc, i) => (
                <span key={i} className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border', badgeCls('sky', isDark))}>
                  <MapPinIcon className="h-2.5 w-2.5 shrink-0" />{loc}
                </span>
              ))}
              {locations.length > 5 && (
                <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold', isDark ? 'bg-white/5 text-slate-400' : 'bg-gray-100 text-gray-500')}>
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
                <p className={cn(
                  'text-[9px] font-black uppercase tracking-widest transition-colors',
                  isDark ? 'text-slate-500 group-hover:text-slate-300' : 'text-gray-400 group-hover:text-gray-600',
                )}>
                  Interesses
                </p>
                <span className={cn('text-[9px] font-bold rounded-full px-1.5 py-0.5', isDark ? 'bg-white/5 text-slate-500' : 'bg-gray-100 text-gray-400')}>
                  {interests.length}
                </span>
                <ChevronDownIcon className={cn(
                  'h-3 w-3 transition-transform',
                  isDark ? 'text-slate-500' : 'text-gray-400',
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
                        <span key={i} className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold border', badgeCls('violet', isDark))}>
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
                    <span key={i} className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold border', badgeCls('violet', isDark))}>
                      {int}
                    </span>
                  ))}
                  {interests.length > 4 && (
                    <button
                      onClick={() => setInterestsExpanded(true)}
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors',
                        isDark ? 'bg-white/5 text-slate-400 hover:bg-violet-500/10 hover:text-violet-400' : 'bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-700',
                      )}
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
      <div className={cn('px-5 py-4', isDark ? 'bg-white/[0.015]' : 'bg-gradient-to-b from-white to-gray-50/50')}>
        <p className={cn('text-[9px] font-black uppercase tracking-widest mb-2.5', isDark ? 'text-slate-500' : 'text-gray-400')}>
          Criativos
          {totalAds > 0 && (
            <span className={cn('ml-1.5 px-1.5 py-0.5 rounded font-bold', isDark ? 'bg-white/5 text-slate-400' : 'bg-gray-100 text-gray-500')}>
              {totalAds} anúncio{totalAds !== 1 ? 's' : ''}
            </span>
          )}
        </p>
        <CreativesStrip ads={allAds} isDark={isDark} />
      </div>
    </motion.div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────

function CardSkeleton({ isDark = false }: { isDark?: boolean }) {
  const block  = isDark ? 'bg-white/5' : 'bg-gray-100';
  const border = isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-gray-100';
  const divider = isDark ? 'border-[rgba(255,255,255,0.05)]' : 'border-gray-50';
  return (
    <div className={cn('rounded-2xl shadow-sm overflow-hidden animate-pulse border', isDark ? 'bg-navy-light' : 'bg-white', border)}>
      <div className={cn('px-5 pt-5 pb-4 border-b space-y-3', divider)}>
        <div className="flex justify-between gap-3">
          <div className="flex gap-2">
            <div className={cn('h-5 w-14 rounded-md', block)} />
            <div className={cn('h-5 w-20 rounded-md', block)} />
          </div>
          <div className={cn('h-5 w-16 rounded-md', isDark ? 'bg-blue-500/10' : 'bg-blue-50')} />
        </div>
        <div className={cn('h-4 w-52 rounded', block)} />
        <div className={cn('h-6 w-36 rounded-lg', isDark ? 'bg-indigo-500/10' : 'bg-indigo-50')} />
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="flex gap-3">
          <div className={cn('flex-1 h-16 rounded-xl', isDark ? 'bg-indigo-500/10' : 'bg-indigo-50/60')} />
          <div className={cn('flex-1 h-16 rounded-xl', isDark ? 'bg-white/[0.03]' : 'bg-slate-50')} />
        </div>
        <div className="space-y-1.5">
          <div className={cn('h-2.5 w-20 rounded', block)} />
          <div className="flex gap-1">
            {[0,1,2,3,4,5,6].map(i => <div key={i} className={cn('w-7 h-7 rounded-md', block)} />)}
          </div>
        </div>
        <div className={cn('h-3 w-32 rounded', block)} />
      </div>
      <div className={cn('px-5 py-4 border-t space-y-3', divider)}>
        <div className={cn('h-16 w-full rounded-xl', isDark ? 'bg-white/[0.03]' : 'bg-slate-50')} />
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <div key={i} className={cn('w-[68px] h-[68px] rounded-xl', block)} />)}
        </div>
      </div>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────

function Pagination({
  total, page, perPage, onChange, isDark = false,
}: { total: number; page: number; perPage: number; onChange: (p: number) => void; isDark?: boolean }) {
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
    <div className={cn('flex items-center justify-between mt-10 pt-6 border-t', isDark ? 'border-[rgba(255,255,255,0.08)]' : 'border-gray-200')}>
      <p className={cn('text-xs font-medium', isDark ? 'text-slate-500' : 'text-gray-500')}>
        Mostrando {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} de {total} campanha{total !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={cn(
            'p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed',
            isDark ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
          )}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {pageNums.map((n, i) =>
          n === '…' ? (
            <span key={`ellipsis-${i}`} className={cn('px-1 text-sm select-none', isDark ? 'text-slate-600' : 'text-gray-400')}>…</span>
          ) : (
            <button
              key={n}
              onClick={() => onChange(n as number)}
              className={cn(
                'w-8 h-8 rounded-lg text-sm font-bold transition-all',
                n === page
                  ? 'bg-gold-premium text-navy-dark shadow-sm shadow-gold-premium/30'
                  : (isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'),
              )}
            >
              {n}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === pages}
          className={cn(
            'p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed',
            isDark ? 'text-slate-500 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
          )}
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
  /** Tema claro/escuro do chamador — /admin/campanhas/nova não tem toggle de tema (sempre
   * claro, default false); /admin/campanhas/dashboard repassa o próprio isDark ativo. */
  isDark?: boolean;
  /** Filtros ativos da página que abriu o modal — todos opcionais e só preenchidos por
   * /admin/campanhas/dashboard (que tem período/rede/campanha na própria tela); /nova nunca
   * passa nenhum destes, então o modal continua exatamente como antes lá (sem filtro nenhum
   * ao abrir). Servem só como VALOR INICIAL — o usuário pode ajustar/limpar livremente dentro
   * do modal sem afetar a página de origem (mesmo princípio já usado pro pivot de cliente). */
  initialPeriodStart?: string | null;
  initialPeriodEnd?: string | null;
  /** Código de rede (meta/google/tiktok...) ativo no filtro da página, se houver. */
  initialNetwork?: string | null;
  /** Campanha única selecionada no filtro da página, se houver — escopa a lista a só ela. */
  initialCampaignId?: string | null;
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
  isOpen, onClose, effectiveClientId, campaignFor, clientName, isMaster = false, isDark = false,
  initialPeriodStart = null, initialPeriodEnd = null, initialNetwork = null, initialCampaignId = null,
}: CampanhasModalProps) {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [networkFilter, setNetworkFilter] = useState<string>('');
  // Escopo a 1 campanha só (herdado do filtro da página) — diferente de `search`, que é
  // texto livre; este é um id exato, com affordance própria pra limpar (ver JSX abaixo).
  const [campaignIdFilter, setCampaignIdFilter] = useState<string | null>(null);
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

  // Reseta o estado do modal só na transição de abertura — pivotar cliente/período/rede/
  // campanha DENTRO do modal já aberto não deve reiniciar busca/status/página sozinho.
  // Período/rede/campanha nascem com o valor ATIVO na página de origem (initialX props) —
  // nunca travados nele: o usuário pode ajustar ou limpar livremente aqui dentro sem
  // nenhum efeito na página por trás (mesmo princípio já usado pro pivot de cliente).
  useEffect(() => {
    if (isOpen) {
      setLocalClientFilter(campaignFor === 'client' && effectiveClientId ? effectiveClientId : 'own');
      setSearch('');
      setStatusFilter('');
      setNetworkFilter(initialNetwork || '');
      setCampaignIdFilter(initialCampaignId || null);
      if (initialPeriodStart && initialPeriodEnd) {
        setQuickPeriod('');
        setPeriodStart(initialPeriodStart);
        setPeriodEnd(initialPeriodEnd);
      } else {
        clearPeriod();
      }
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
  useEffect(() => { setPage(1); }, [search, statusFilter, networkFilter, campaignIdFilter, periodStart, periodEnd]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Trava o scroll da página de baixo enquanto o modal (fixed inset-0, tela cheia) está
  // aberto e restaura exatamente a posição de scroll anterior ao fechar — sem isso, a
  // página por trás podia ser rolada (scroll chaining) enquanto o modal estava aberto, e ao
  // fechar o usuário caía numa posição diferente de onde tinha saído, dando a impressão de
  // "não retornou pra página de onde veio".
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

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

  const hasActiveFilters = !!(search || statusFilter || networkFilter || campaignIdFilter || periodStart || periodEnd);

  const filtered = campaigns.filter(c => {
    const matchSearch   = !search          || c.name.toLowerCase().includes(search.trim().toLowerCase());
    const matchStatus   = !statusFilter    || c.status === statusFilter;
    const matchNetwork  = !networkFilter   || (c.networkCode ?? 'meta') === networkFilter;
    const matchCampaign = !campaignIdFilter || c.id === campaignIdFilter;
    const matchPeriod   = overlapsPeriod(c);
    return matchSearch && matchStatus && matchNetwork && matchCampaign && matchPeriod;
  });

  // Redes realmente presentes no conjunto carregado — o seletor só aparece com ≥2 (mesmo
  // gate já usado no filtro de rede da página principal: 1 rede só seria ruído).
  const availableNetworkCodes = Array.from(new Set(campaigns.map(c => c.networkCode ?? 'meta'))).sort();

  function clearAllFilters() {
    setSearch('');
    setStatusFilter('');
    setNetworkFilter('');
    setCampaignIdFilter(null);
    clearPeriod();
  }

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
    <>
    {/* Sem AnimatePresence/exit de propósito — confirmado ao vivo (framer-motion 11, este
        componente) que a animação de saída às vezes nunca dispara o callback que faz o
        AnimatePresence desmontar o nó: o overlay fica pra sempre no DOM em opacity:0,
        invisível mas ainda com pointer-events, bloqueando qualquer clique no resto da
        página por trás — exatamente o sintoma relatado ("Retornar não volta pra página
        anterior", já que a página de fato está lá, só inacessível). `isOpen && (...)` sem
        AnimatePresence garante desmontagem instantânea e incondicional no fechamento —
        perde só a animação de saída (150ms), mantém a de entrada. */}
    {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex flex-col bg-gray-950/50"
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className={cn('flex flex-col w-full h-full overflow-hidden', isDark ? 'bg-navy' : 'bg-gray-50')}
          >
            {/* ── Modal header ── */}
            <div className={cn(
              'shrink-0 border-b',
              isDark ? 'bg-navy-light border-[rgba(255,255,255,0.06)]' : 'bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,.06)]',
            )}>
              <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  {/* ← Retornar + title */}
                  <div className="flex items-center gap-4 min-w-0">
                    <button
                      type="button"
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-black border transition-all shrink-0 active:scale-95',
                        isDark
                          ? 'text-slate-300 border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5'
                          : 'text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900 hover:bg-gray-50',
                      )}
                    >
                      <ArrowLeftIcon className="h-4 w-4" />
                      Retornar
                    </button>
                    <div className="min-w-0">
                      <p className={cn('text-[10px] font-black uppercase tracking-[0.3em] mb-0.5', isDark ? 'text-indigo-400' : 'text-indigo-600')}>
                        {contextSubtitle}
                      </p>
                      <h2 className={cn('text-xl font-black tracking-tight flex items-baseline gap-2', isDark ? 'text-slate-100' : 'text-gray-900')}>
                        {contextTitle}
                        {!loading && campaigns.length > 0 && (
                          <span className={cn('text-sm font-bold', isDark ? 'text-slate-500' : 'text-gray-400')}>
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
                      <MagnifyingGlassIcon className={cn('pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isDark ? 'text-slate-500' : 'text-gray-400')} />
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        disabled={loading || campaigns.length === 0}
                        placeholder={loading ? 'Carregando…' : `Buscar por nome (${campaigns.length})`}
                        className={cn(
                          'py-2 pl-8 pr-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-[220px] border',
                          isDark ? 'bg-black/20 border-white/10 text-slate-200 placeholder:text-slate-600' : 'bg-gray-50 border-gray-200 text-gray-700',
                        )}
                      />
                    </div>

                    {/* Status filter */}
                    <div className="relative hidden md:block">
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className={cn(
                          'py-2 pl-3 pr-8 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none shadow-sm cursor-pointer border',
                          isDark ? 'bg-black/20 border-white/10 text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-700',
                        )}
                      >
                        <option value="">Todos status</option>
                        <option value="ACTIVE">Ativas</option>
                        <option value="PAUSED">Pausadas</option>
                        <option value="ARCHIVED">Arquivadas</option>
                        <option value="DELETED">Removidas</option>
                      </select>
                      <ChevronDownIcon className={cn('pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isDark ? 'text-slate-500' : 'text-gray-400')} />
                    </div>

                    {/* Rede filter — só aparece com ≥2 redes reais no conjunto carregado,
                        mesmo gate já usado no filtro de rede da página principal. */}
                    {availableNetworkCodes.length > 1 && (
                      <div className="relative hidden md:block">
                        <select
                          value={networkFilter}
                          onChange={e => setNetworkFilter(e.target.value)}
                          className={cn(
                            'py-2 pl-3 pr-8 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all appearance-none shadow-sm cursor-pointer border',
                            isDark ? 'bg-black/20 border-white/10 text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-700',
                          )}
                        >
                          <option value="">Todas redes</option>
                          {availableNetworkCodes.map(code => (
                            <option key={code} value={code}>{NETWORK_LABELS[code] ?? code}</option>
                          ))}
                        </select>
                        <ChevronDownIcon className={cn('pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isDark ? 'text-slate-500' : 'text-gray-400')} />
                      </div>
                    )}

                    {/* Refresh */}
                    <button
                      onClick={fetchCampaigns}
                      disabled={loading}
                      className={cn(
                        'p-2 rounded-xl transition-all disabled:opacity-40',
                        isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
                      )}
                      title="Atualizar lista"
                    >
                      <ArrowPathIcon className={cn('h-5 w-5', loading && 'animate-spin')} />
                    </button>
                  </div>
                </div>

                {/* Mobile filters */}
                <div className="mt-3 md:hidden flex gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className={cn('pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isDark ? 'text-slate-500' : 'text-gray-400')} />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      disabled={loading || campaigns.length === 0}
                      placeholder={loading ? 'Carregando…' : 'Buscar por nome'}
                      className={cn(
                        'w-full py-2.5 pl-8 pr-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50 border',
                        isDark ? 'bg-black/20 border-white/10 text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-700',
                      )}
                    />
                  </div>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className={cn(
                        'h-full py-2 pl-3 pr-8 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 appearance-none cursor-pointer border',
                        isDark ? 'bg-black/20 border-white/10 text-slate-200' : 'bg-gray-50 border-gray-200',
                      )}
                    >
                      <option value="">Status</option>
                      <option value="ACTIVE">Ativas</option>
                      <option value="PAUSED">Pausadas</option>
                      <option value="ARCHIVED">Arquivadas</option>
                    </select>
                    <ChevronDownIcon className={cn('pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5', isDark ? 'text-slate-500' : 'text-gray-400')} />
                  </div>
                </div>

                {/* ── Pivot: Cliente + Campanha (herdada) + Período de veiculação ── */}
                <div className={cn('mt-3 pt-3 border-t flex items-center justify-between gap-4 flex-wrap', isDark ? 'border-[rgba(255,255,255,0.06)]' : 'border-gray-100')}>
                  <div className="flex items-center gap-3 flex-wrap">
                    {!isMaster && (
                      <ClientSelector
                        value={localClientFilter}
                        onChange={setLocalClientFilter}
                        clients={clientOptions}
                        loading={clientsLoading}
                        variant="toggle"
                      />
                    )}

                    {/* Escopo de campanha herdado do filtro da página — nunca criado aqui
                        dentro, só removível (botão "Ver todas") pra não duplicar o seletor
                        de campanha que já existe na página de origem. */}
                    {campaignIdFilter && (
                      <div className={cn(
                        'flex items-center gap-2 rounded-xl px-3 py-1.5 border text-xs font-bold',
                        isDark ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700',
                      )}>
                        <span className="truncate max-w-[200px]">
                          Campanha: {campaigns.find(c => c.id === campaignIdFilter)?.name ?? '—'}
                        </span>
                        <button
                          onClick={() => setCampaignIdFilter(null)}
                          title="Ver todas as campanhas"
                          className={cn('shrink-0', isDark ? 'text-indigo-400 hover:text-indigo-200' : 'text-indigo-500 hover:text-indigo-800')}
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Container discreto — agrupa label + range + presets do período */}
                  <div className={cn('flex flex-col gap-1.5 rounded-xl px-3 py-2 border', isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50/70 border-gray-100')}>
                    <span className={cn('text-[9px] font-black uppercase tracking-widest', isDark ? 'text-slate-500' : 'text-gray-400')}>
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
                          className={cn(
                            'w-full py-2 pl-3 pr-7 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all border',
                            isDark ? 'bg-navy-light border-white/10 text-slate-200' : 'bg-white border-gray-200 text-gray-700',
                          )}
                        />
                      </div>
                      <span className={cn('text-xs font-bold', isDark ? 'text-slate-600' : 'text-gray-300')}>→</span>
                      <div className="w-[120px] shrink-0">
                        <DateInputPtBR
                          value={periodEnd}
                          onChange={iso => { setPeriodEnd(iso); setQuickPeriod(''); }}
                          className={cn(
                            'w-full py-2 pl-3 pr-7 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all border',
                            isDark ? 'bg-navy-light border-white/10 text-slate-200' : 'bg-white border-gray-200 text-gray-700',
                          )}
                        />
                      </div>
                      <div className={cn('flex gap-1 rounded-lg p-1 border', isDark ? 'border-white/10 bg-navy-light' : 'border-gray-200 bg-white')}>
                        {PERIOD_PRESETS.map(p => (
                          <button
                            key={p.value}
                            onClick={() => applyQuickPeriod(p.value)}
                            className={cn(
                              'px-2.5 py-1.5 rounded-md text-xs font-black transition-colors',
                              quickPeriod === p.value
                                ? 'bg-gold-premium text-navy-dark'
                                : (isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'),
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
                          className={cn(
                            'p-1.5 rounded-lg transition-all',
                            isDark ? 'text-slate-500 hover:text-slate-200 hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-white',
                          )}
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
                  <div className={cn(
                    'flex items-start gap-3 rounded-2xl px-5 py-4 mb-8 border',
                    isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200',
                  )}>
                    <ExclamationCircleIcon className={cn('h-5 w-5 shrink-0 mt-0.5', isDark ? 'text-red-400' : 'text-red-500')} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-bold', isDark ? 'text-red-400' : 'text-red-700')}>Erro ao carregar campanhas</p>
                      <p className={cn('text-xs mt-0.5 break-words', isDark ? 'text-red-500' : 'text-red-500')}>{error}</p>
                    </div>
                    <button
                      onClick={fetchCampaigns}
                      className={cn('shrink-0 text-xs font-black uppercase tracking-widest transition-colors', isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-800')}
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
                    isDark={isDark}
                  />
                )}

                {/* Skeletons */}
                {loading && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} isDark={isDark} />)}
                  </div>
                )}

                {/* Empty state */}
                {!loading && !error && totalFiltered === 0 && (
                  <div className="flex flex-col items-center justify-center py-28 text-center">
                    <div className={cn(
                      'w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-sm',
                      isDark ? 'bg-indigo-500/10' : 'bg-gradient-to-br from-indigo-50 to-indigo-100',
                    )}>
                      <RocketLaunchIcon className={cn('h-12 w-12', isDark ? 'text-indigo-400' : 'text-indigo-300')} />
                    </div>
                    <p className={cn('text-lg font-black mb-2', isDark ? 'text-slate-200' : 'text-gray-700')}>
                      {hasActiveFilters ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha lançada ainda'}
                    </p>
                    <p className={cn('text-sm max-w-xs leading-relaxed', isDark ? 'text-slate-500' : 'text-gray-400')}>
                      {hasActiveFilters
                        ? 'Ajuste os filtros de busca, status ou período.'
                        : `Use "Configurar Campanha" para lançar ${
                            pivotedClientName ? `a primeira campanha de ${pivotedClientName}` : 'sua primeira campanha'
                          }.`}
                    </p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearAllFilters}
                        className={cn(
                          'mt-5 px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm border',
                          isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20 hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900',
                        )}
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
                        <CampaignCard key={campaign.id} campaign={campaign} index={i} isDark={isDark} />
                      ))}
                    </div>
                    <Pagination
                      total={totalFiltered}
                      page={page}
                      perPage={ITEMS_PER_PAGE}
                      onChange={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      isDark={isDark}
                    />
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
    )}

    {/* FASE 14d — Modal de classificação em lote (z-[60]); cada um (este e o principal
        acima) controla a própria desmontagem via isOpen direto, sem AnimatePresence — ver
        comentário no topo do return. */}
    <ClassifyModal
      isOpen={showClassifyModal}
      onClose={() => setShowClassifyModal(false)}
      onDone={() => {
        setShowClassifyModal(false);
        setClassifyDismissed(true);
        fetchCampaigns(); // atualiza badges após classificação
      }}
      isDark={isDark}
    />
    </>
  );
}
