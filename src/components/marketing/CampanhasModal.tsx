'use client';

/**
 * CampanhasModal — modal full-page para consulta de campanhas lançadas.
 * Abre sobre a página /admin/campanhas/nova, respeita o contexto
 * "Minha Empresa" / "Para um Cliente" selecionado na página pai.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  MapPinIcon,
  RocketLaunchIcon,
  PhotoIcon,
  ExclamationCircleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import { cn } from '@/lib/marketing-utils';

// ── Types ─────────────────────────────────────────────────────────

interface AdData {
  id: string;
  name: string;
  status: string;
  creativeType?: string | null;
  images: string[];
  body: string;
  headline?: string | null;
  linkUrl?: string | null;
  ctaType: string;
}

interface AdSetData {
  id: string;
  name: string;
  dailyBudget: number; // cents
  startTime: string;
  endTime?: string | null;
  optimizationGoal: string;
  ageMin: number;
  ageMax: number;
  genders: string[];
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
}

// ── Helpers ───────────────────────────────────────────────────────

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

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

function genderLabel(genders: string[]): string {
  if (!genders || genders.length === 0) return 'Todos';
  if (genders.includes('MALE') && genders.includes('FEMALE')) return 'Todos';
  if (genders.includes('MALE')) return 'Masculino';
  if (genders.includes('FEMALE')) return 'Feminino';
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
    const cities = loc.cities as Record<string, string>[] | undefined;
    const regions = loc.regions as Record<string, string>[] | undefined;
    if (countries?.includes('BR') && !cities?.length && !regions?.length) result.push('Brasil');
    cities?.forEach(c => { if (c.name || c.city) result.push(c.name || c.city); });
    regions?.forEach(r => { if (r.name) result.push(r.name); });
    return result;
  }
  return [];
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

// ── Status Badge ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    ACTIVE:    { label: 'Ativa',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    PAUSED:    { label: 'Pausada',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    DELETED:   { label: 'Removida',   cls: 'bg-red-50 text-red-700 border-red-200' },
    ARCHIVED:  { label: 'Arquivada',  cls: 'bg-gray-100 text-gray-500 border-gray-200' },
    DRAFT:     { label: 'Rascunho',   cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    COMPLETED: { label: 'Concluída',  cls: 'bg-teal-50 text-teal-700 border-teal-200' },
    IN_PROCESS:{ label: 'Em processo',cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  };
  const { label, cls } = cfg[status] ?? {
    label: status,
    cls: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border',
        cls,
      )}
    >
      {label}
    </span>
  );
}

// ── Funnel Stage Badge ────────────────────────────────────────────

const FUNNEL_LABELS: Record<string, string> = {
  TOPO: 'Topo',
  MEIO: 'Meio',
  FUNDO: 'Fundo',
  TOP: 'Topo',
  MIDDLE: 'Meio',
  BOTTOM: 'Fundo',
};

function FunnelBadge({ stage }: { stage: string }) {
  const label = FUNNEL_LABELS[stage] ?? stage;
  const cls =
    stage === 'TOPO' || stage === 'TOP'
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : stage === 'MEIO' || stage === 'MIDDLE'
      ? 'bg-violet-50 text-violet-700 border-violet-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border',
        cls,
      )}
    >
      {label} de funil
    </span>
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
  scheduleDays,
  scheduleStartHour,
  scheduleEndHour,
  scheduleTimeSlots,
}: ScheduleDisplayProps) {
  // Custom per-day slots
  if (scheduleTimeSlots && typeof scheduleTimeSlots === 'object') {
    type SlotEntry = { day: number; startHour: number; endHour: number };
    let slotEntries: SlotEntry[] = [];

    if (Array.isArray(scheduleTimeSlots)) {
      slotEntries = (scheduleTimeSlots as SlotEntry[]).slice(0, 7);
    } else {
      slotEntries = Object.entries(scheduleTimeSlots as Record<string, unknown>).map(
        ([day, val]) => {
          const v = val as Record<string, number>;
          return {
            day: parseInt(day),
            startHour: v?.start ?? v?.startHour ?? 0,
            endHour: v?.end ?? v?.endHour ?? 24,
          };
        },
      );
    }

    if (slotEntries.length > 0) {
      return (
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-violet-50 border border-violet-200 rounded-md text-[10px] font-black text-violet-700 uppercase tracking-wider mb-0.5">
            Personalizado por dia
          </div>
          <div className="grid grid-cols-4 gap-1">
            {slotEntries.map((slot, i) => {
              const dayIdx = slot.day ?? i;
              return (
                <div
                  key={i}
                  className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-center"
                >
                  <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">
                    {DAY_LABELS[dayIdx] ?? `D${dayIdx}`}
                  </p>
                  <p className="text-[10px] font-semibold text-gray-700 leading-tight mt-0.5">
                    {fmtHour(slot.startHour)}
                    <span className="text-gray-400">–</span>
                    {fmtHour(slot.endHour)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  }

  // Uniform schedule
  const allDays = !scheduleDays?.length || scheduleDays.length === 7;

  return (
    <div className="space-y-2">
      {/* Day pills */}
      {allDays ? (
        <span className="inline-flex items-center px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-[10px] font-black text-indigo-600 uppercase tracking-wider">
          Todos os dias
        </span>
      ) : (
        <div className="flex gap-1 flex-wrap">
          {DAY_LABELS.map((d, i) => (
            <span
              key={i}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-md text-[10px] font-black',
                scheduleDays?.includes(i)
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'bg-gray-100 text-gray-400',
              )}
            >
              {d.slice(0, 2)}
            </span>
          ))}
        </div>
      )}

      {/* Hour range */}
      {(scheduleStartHour != null || scheduleEndHour != null) && (
        <p className="text-[11px] font-semibold text-gray-600">
          {fmtHour(scheduleStartHour)}{' '}
          <span className="text-gray-400">→</span>{' '}
          {fmtHour(scheduleEndHour)}
        </p>
      )}
    </div>
  );
}

// ── Creative Strip ────────────────────────────────────────────────

function CreativesStrip({ ads }: { ads: AdData[] }) {
  const allImages = ads.flatMap(ad => ad.images ?? []).slice(0, 6);
  const firstAd = ads[0];

  return (
    <div className="space-y-3">
      {allImages.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-0.5 px-0.5 scrollbar-thin scrollbar-thumb-gray-200">
          {allImages.map((url, i) => (
            <div
              key={i}
              className="w-[68px] h-[68px] rounded-xl overflow-hidden border border-gray-100 shrink-0 bg-gray-100 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Criativo ${i + 1}`}
                className="w-full h-full object-cover"
                onError={e => {
                  const el = e.target as HTMLImageElement;
                  el.parentElement!.innerHTML =
                    '<div class="w-full h-full flex items-center justify-center"><svg class="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg></div>';
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-gray-400 py-1">
          <PhotoIcon className="h-4 w-4 shrink-0" />
          <span className="text-[11px] font-medium">Sem criativos vinculados</span>
        </div>
      )}

      {firstAd && (firstAd.headline || firstAd.body) && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1">
          {firstAd.headline && (
            <p className="text-xs font-bold text-gray-900 line-clamp-1">{firstAd.headline}</p>
          )}
          {firstAd.body && (
            <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{firstAd.body}</p>
          )}
          <div className="flex items-center gap-2 pt-0.5">
            {firstAd.ctaType && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase tracking-wider">
                {firstAd.ctaType.replace(/_/g, ' ')}
              </span>
            )}
            {firstAd.creativeType && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase tracking-wider">
                {firstAd.creativeType.replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Campaign Card ─────────────────────────────────────────────────

function CampaignCard({ campaign, index }: { campaign: CampaignData; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const adSet = campaign.adSets[0];
  const allAds = campaign.adSets.flatMap(as => as.ads);
  const locations = adSet ? extractLocations(adSet.locations) : [];
  const interests = adSet ? extractInterests(adSet.interests) : [];
  const totalAds = campaign.adSets.reduce((n, as) => n + as.ads.length, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), type: 'spring', stiffness: 280, damping: 30 }}
      className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200 flex flex-col"
    >
      {/* ── Card header ── */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-50">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            <StatusBadge status={campaign.status} />
            {campaign.lifecycleStatus && campaign.lifecycleStatus !== campaign.status && (
              <StatusBadge status={campaign.lifecycleStatus} />
            )}
            {campaign.funnelStage && <FunnelBadge stage={campaign.funnelStage} />}
          </div>
          {campaign.metaCampaignId && (
            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 font-mono shrink-0 select-all">
              {campaign.metaCampaignId.slice(0, 14)}…
            </span>
          )}
        </div>

        <h3 className="text-sm font-black text-gray-900 leading-snug mb-2 pr-1">
          {campaign.name}
        </h3>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
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
          {/* Budget & period */}
          <div className="flex items-stretch gap-3">
            <div className="flex-1 bg-gradient-to-br from-indigo-50 to-indigo-100/60 border border-indigo-100 rounded-xl px-3 py-2.5">
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
                {fmtDate(adSet.startTime)}
              </p>
              {adSet.endTime ? (
                <p className="text-[11px] font-bold text-gray-700">→ {fmtDate(adSet.endTime)}</p>
              ) : (
                <p className="text-[10px] font-bold text-gray-400">→ Contínuo</p>
              )}
            </div>
          </div>

          {/* Audience */}
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

          {/* Schedule */}
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

          {/* Locations */}
          {locations.length > 0 && (
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                Localização
              </p>
              <div className="flex flex-wrap gap-1">
                {locations.slice(0, 5).map((loc, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 px-2 py-0.5 bg-sky-50 border border-sky-200 rounded-md text-[10px] font-bold text-sky-700"
                  >
                    <MapPinIcon className="h-2.5 w-2.5 shrink-0" />
                    {loc}
                  </span>
                ))}
                {locations.length > 5 && (
                  <span className="px-2 py-0.5 bg-gray-100 rounded-md text-[10px] font-bold text-gray-500">
                    +{locations.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Interests — collapsed by default if many */}
          {interests.length > 0 && (
            <div>
              <button
                onClick={() => setExpanded(p => !p)}
                className="flex items-center gap-1.5 mb-1.5 group"
              >
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">
                  Interesses
                </p>
                <span className="text-[9px] font-bold text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5">
                  {interests.length}
                </span>
                <ChevronDownIcon
                  className={cn(
                    'h-3 w-3 text-gray-400 transition-transform',
                    expanded && 'rotate-180',
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {interests.map((int, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-violet-50 border border-violet-200 rounded-md text-[10px] font-bold text-violet-700"
                        >
                          {int}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {!expanded && (
                <div className="flex flex-wrap gap-1">
                  {interests.slice(0, 3).map((int, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-violet-50 border border-violet-200 rounded-md text-[10px] font-bold text-violet-700"
                    >
                      {int}
                    </span>
                  ))}
                  {interests.length > 3 && (
                    <button
                      onClick={() => setExpanded(true)}
                      className="px-2 py-0.5 bg-gray-100 hover:bg-violet-50 rounded-md text-[10px] font-bold text-gray-500 hover:text-violet-700 transition-colors"
                    >
                      +{interests.length - 3} mais
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Creatives ── */}
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
        <div className="flex gap-2">
          <div className="h-5 w-16 bg-gray-100 rounded-md" />
          <div className="h-5 w-22 bg-gray-100 rounded-md" />
        </div>
        <div className="h-4 w-52 bg-gray-100 rounded" />
        <div className="h-3 w-36 bg-gray-100 rounded" />
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 h-16 bg-indigo-50/60 rounded-xl" />
          <div className="flex-1 h-16 bg-slate-50 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-20 bg-gray-100 rounded" />
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="w-7 h-7 bg-gray-100 rounded-md" />
            ))}
          </div>
        </div>
      </div>
      <div className="px-5 py-4 border-t border-gray-50">
        <div className="flex gap-2">
          {[1, 2, 3].map(i => <div key={i} className="w-[68px] h-[68px] bg-gray-100 rounded-xl" />)}
        </div>
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
  isOpen,
  onClose,
  effectiveClientId,
  campaignFor,
  clientName,
  isMaster = false,
}: CampanhasModalProps) {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (!isMaster) {
        if (effectiveClientId) {
          params.set('clientId', effectiveClientId);
        } else {
          // own → filtra campanhas sem clientId
          params.set('clientId', 'own');
        }
      }
      // master → sem filtro → retorna todas

      const res = await adminFetch(`/api/admin/campanhas/campaigns?${params}`);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Erro ${res.status}`);
      }
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError((e as Error).message || 'Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }, [effectiveClientId, campaignFor, isMaster]);

  // Fetch when opened
  useEffect(() => {
    if (isOpen) {
      fetchCampaigns();
      setSearch('');
      setStatusFilter('');
    }
  }, [isOpen, fetchCampaigns]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const filtered = campaigns.filter(c => {
    const matchSearch =
      !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const contextTitle = isMaster
    ? 'Todas as Campanhas'
    : campaignFor === 'client' && clientName
    ? `Campanhas de ${clientName}`
    : 'Campanhas da Minha Empresa';

  const contextSubtitle = isMaster
    ? 'Visão consolidada de todos os tenants'
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
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex flex-col bg-gray-950/50 backdrop-blur-[2px]"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="flex flex-col w-full h-full bg-gray-50 overflow-hidden"
          >
            {/* ── Modal header ── */}
            <div className="shrink-0 bg-white border-b border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  {/* Title */}
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-0.5">
                      {contextSubtitle}
                    </p>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                      {contextTitle}
                      {!loading && campaigns.length > 0 && (
                        <span className="text-sm font-bold text-gray-400">
                          ({filtered.length}
                          {filtered.length !== campaigns.length && `/${campaigns.length}`})
                        </span>
                      )}
                    </h2>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Search — hidden on mobile */}
                    <div className="relative hidden md:block">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar campanha..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-48 shadow-sm"
                      />
                      {search && (
                        <button
                          onClick={() => setSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
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

                    {/* Close */}
                    <button
                      onClick={onClose}
                      className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                      title="Fechar (Esc)"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Mobile search row */}
                <div className="mt-3 md:hidden flex gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
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

                {/* Error state */}
                {error && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-8">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-red-700">Erro ao carregar campanhas</p>
                      <p className="text-xs text-red-500 mt-0.5">{error}</p>
                    </div>
                    <button
                      onClick={fetchCampaigns}
                      className="shrink-0 text-xs font-black text-red-600 hover:text-red-800 uppercase tracking-widest transition-colors"
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}

                {/* Loading skeletons */}
                {loading && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <CardSkeleton key={i} />)}
                  </div>
                )}

                {/* Empty state */}
                {!loading && !error && filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-28 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                      <RocketLaunchIcon className="h-12 w-12 text-indigo-300" />
                    </div>
                    <p className="text-lg font-black text-gray-700 mb-2">
                      {search || statusFilter
                        ? 'Nenhuma campanha encontrada'
                        : 'Nenhuma campanha lançada ainda'}
                    </p>
                    <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                      {search || statusFilter
                        ? 'Tente ajustar os filtros de busca ou status.'
                        : `Use o botão "Configurar Campanha" para lançar sua primeira campanha ${
                            campaignFor === 'client' && clientName
                              ? `para ${clientName}`
                              : 'da empresa'
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

                {/* Campaign grid */}
                {!loading && filtered.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map((campaign, i) => (
                      <CampaignCard key={campaign.id} campaign={campaign} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
