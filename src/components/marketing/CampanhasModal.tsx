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
} from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import { cn } from '@/lib/marketing-utils';
import { ANGLE_OPTIONS, angleLabel } from '@/lib/marketing/angles';
import { PencilIcon, CheckIcon } from '@heroicons/react/24/outline';

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
  // FASE 14 — ângulo declarado
  declaredAngle?: string | null;
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

function fmtHour(h: number | null | undefined): string {
  if (h == null) return '';
  return `${String(h).padStart(2, '0')}:00`;
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
  if (Array.isArray(locations)) {
    return (locations as Record<string, string>[])
      .map(l => l.name || l.city || l.region || String(l))
      .filter(Boolean);
  }
  if (typeof locations === 'object' && locations !== null) {
    const loc = locations as Record<string, unknown>;
    const result: string[] = [];
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

// ── Angle Badge (FASE 14) — badge + edição inline ─────────────────

function AngleBadge({ campaignId, angle, onUpdated }: {
  campaignId: string;
  angle?: string | null;
  onUpdated: (newAngle: string | null) => void;
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
      onUpdated(selected || null);
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
          className="text-[10px] font-semibold border border-violet-300 rounded-md px-1.5 py-0.5 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
        >
          <option value="">IA infere</option>
          {ANGLE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={saving}
          className="p-0.5 rounded text-violet-600 hover:bg-violet-50"
        >
          <CheckIcon className="h-3.5 w-3.5" />
        </button>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border bg-violet-50 text-violet-700 border-violet-200 cursor-pointer hover:bg-violet-100 transition-colors"
      title="Clique para editar ângulo"
      onClick={() => { setSelected(angle ?? ''); setEditing(true); }}
    >
      🎯 {angle ? angleLabel(angle) : 'IA infere'}
      <PencilIcon className="h-2.5 w-2.5 text-violet-400" />
    </span>
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
  // Custom per-day slots
  if (scheduleTimeSlots && typeof scheduleTimeSlots === 'object') {
    type SlotEntry = { day: number; startHour: number; endHour: number };
    let entries: SlotEntry[] = [];

    if (Array.isArray(scheduleTimeSlots)) {
      entries = (scheduleTimeSlots as SlotEntry[]).slice(0, 7);
    } else {
      entries = Object.entries(scheduleTimeSlots as Record<string, unknown>).map(([day, v]) => {
        const val = v as Record<string, number>;
        return { day: parseInt(day), startHour: val?.start ?? val?.startHour ?? 0, endHour: val?.end ?? val?.endHour ?? 24 };
      });
    }

    if (entries.length > 0) {
      return (
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-violet-50 border border-violet-200 rounded-md text-[10px] font-black text-violet-700 uppercase tracking-wider">
            Personalizado por dia
          </div>
          <div className="grid grid-cols-4 gap-1">
            {entries.map((slot, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-center">
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">
                  {DAY_LABELS[slot.day ?? i] ?? `D${slot.day ?? i}`}
                </p>
                <p className="text-[10px] font-semibold text-gray-700 leading-tight mt-0.5">
                  {fmtHour(slot.startHour)}<span className="text-gray-400">–</span>{fmtHour(slot.endHour)}
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  // Uniform schedule
  const allDays = !scheduleDays?.length || scheduleDays.length === 7;

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
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'bg-gray-100 text-gray-400',
            )}>
              {d.slice(0, 2)}
            </span>
          ))}
        </div>
      )}
      {(scheduleStartHour != null || scheduleEndHour != null) && (
        <p className="text-[11px] font-semibold text-gray-600">
          {fmtHour(scheduleStartHour)} <span className="text-gray-400">→</span> {fmtHour(scheduleEndHour)}
        </p>
      )}
    </div>
  );
}

// ── Campaign Card ─────────────────────────────────────────────────

function CampaignCard({ campaign, index }: { campaign: CampaignData; index: number }) {
  const [interestsExpanded, setInterestsExpanded] = useState(false);
  // FASE 14 — ângulo editável localmente sem recarregar a lista
  const [localAngle, setLocalAngle] = useState<string | null>(campaign.declaredAngle ?? null);
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
            {/* FASE 14 — ângulo de comunicação (sempre visível, editável inline) */}
            <AngleBadge
              campaignId={campaign.id}
              angle={localAngle}
              onUpdated={setLocalAngle}
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
          {campaign.name}
        </h3>

        {/* Objetivo + data */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-[11px] font-bold text-indigo-700">
            <RocketLaunchIcon className="h-3 w-3 shrink-0" />
            {objectiveLabel(campaign.objective)}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">
            Criada em {fmtDate(campaign.createdAt)}
          </span>
        </div>
      </div>

      {/* ── AdSet section ── */}
      {adSet && (
        <div className="px-5 py-4 border-b border-gray-50 space-y-4 flex-1">
          {/* Budget & Período — uma linha cada */}
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
              {adSet.optimizationGoal && (
                <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700">
                  {adSet.optimizationGoal.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>

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
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
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

export default function CampanhasModal({
  isOpen, onClose, effectiveClientId, campaignFor, clientName, isMaster = false,
}: CampanhasModalProps) {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage]           = useState(1);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (!isMaster) {
        params.set('clientId', effectiveClientId || 'own');
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
  }, [effectiveClientId, campaignFor, isMaster]);

  useEffect(() => {
    if (isOpen) { fetchCampaigns(); setSearch(''); setStatusFilter(''); setPage(1); }
  }, [isOpen, fetchCampaigns]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filtered = campaigns.filter(c => {
    const matchSearch  = !search       || c.id === search;   // seleção exata pelo id
    const matchStatus  = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalFiltered = filtered.length;
  const paginated     = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const contextTitle = isMaster
    ? 'Todas as Campanhas'
    : campaignFor === 'client' && clientName
    ? `Campanhas de ${clientName}`
    : 'Campanhas da Minha Empresa';

  const contextSubtitle = isMaster
    ? 'Visão consolidada'
    : campaignFor === 'client' && clientName
    ? clientName
    : 'Minha Empresa';

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
                    {/* Campaign select — populated with loaded campaigns */}
                    <div className="relative hidden md:block">
                      <select
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        disabled={loading || campaigns.length === 0}
                        className="py-2 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed max-w-[260px]"
                      >
                        <option value="">
                          {loading ? 'Carregando…' : `Todas as campanhas (${campaigns.length})`}
                        </option>
                        {campaigns.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    </div>

                    {/* Status filter */}
                    <div className="relative hidden md:block">
                      <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="py-2 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none shadow-sm cursor-pointer"
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
                    <select
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      disabled={loading || campaigns.length === 0}
                      className="w-full py-2.5 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer disabled:opacity-50"
                    >
                      <option value="">{loading ? 'Carregando…' : 'Todas as campanhas'}</option>
                      {campaigns.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  </div>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="h-full py-2 pl-3 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="">Status</option>
                      <option value="ACTIVE">Ativas</option>
                      <option value="PAUSED">Pausadas</option>
                      <option value="ARCHIVED">Arquivadas</option>
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
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
                      {search || statusFilter ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha lançada ainda'}
                    </p>
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                      {search || statusFilter
                        ? 'Ajuste os filtros de busca ou status.'
                        : `Use "Configurar Campanha" para lançar ${
                            campaignFor === 'client' && clientName ? `a primeira campanha de ${clientName}` : 'sua primeira campanha'
                          }.`}
                    </p>
                    {(search || statusFilter) && (
                      <button
                        onClick={() => { setSearch(''); setStatusFilter(''); }}
                        className="mt-5 px-5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
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
    </AnimatePresence>
  );
}
