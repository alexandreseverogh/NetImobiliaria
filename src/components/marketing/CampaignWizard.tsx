'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { createCampaign, getMetaIdentity, getWhatsAppConfig, type Creative } from '@/lib/marketing-api';
import { cn, OBJECTIVES, CTA_TYPES, DAYS_OF_WEEK, formatCurrency, networkLabel } from '@/lib/marketing-utils';
import { LocationPicker, type LocationEntry } from './LocationPicker';
import { ANGLE_OPTIONS, angleLabel } from '@/lib/marketing/angles';
import {
  ShieldCheckIcon, BoltIcon, XMarkIcon, RocketLaunchIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline';

/* ── shared input class ──────────────────────────────────── */
const inputCls =
  'px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 ' +
  'placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all disabled:opacity-60';

/* ── types ───────────────────────────────────────────────── */
interface Props {
  selectedImages?: Creative[];
  onClose: () => void;
  onSuccess: () => void;
  /** UUID do cliente selecionado (null = campanha do próprio tenant). */
  clientId?: string | null;
  /**
   * FASE 6: promessa iniciada no /nova ao abrir o wizard.
   * Quando resolvida, retorna os IDs dos CreativeAssets enviados para a biblioteca.
   * Usados para vincular o ad_id após o lançamento e fechar o loop de correlação.
   */
  getAssetIds?: () => Promise<string[]>;
  /**
   * Pré-preenchimento vindo de "Usar no Wizard" na página Padrões Vencedores.
   * Popula os campos de texto antes do usuário chegar ao step 2.
   */
  initialValues?: {
    body?:        string;
    headline?:    string;
    hookText?:    string;  // exibido como dica no step 2
    /** Pré-seleciona a rede no step 0 — vem do botão específico clicado em /nova (Meta/TikTok). */
    networkCode?: string;
  };
}

/* ── AutoChip ────────────────────────────────────────────── */
function AutoChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-wide">
      <BoltIcon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

/* ── steps (Fase 2 — sem criativos, gerenciado fora do wizard) ── */
const STEPS = [
  { key: 'rede',      label: 'Rede',         desc: 'Plataforma de anúncios' },
  { key: 'tipo',      label: 'Tipo',          desc: 'Formato do anúncio' },
  { key: 'texto',     label: 'Texto & CTA',   desc: 'Conteúdo e ação' },
  { key: 'publico',   label: 'Público',       desc: 'Segmentação' },
  { key: 'orcamento', label: 'Orçamento',     desc: 'Investimento e agenda' },
  { key: 'objetivo',  label: 'Objetivo',      desc: 'Meta da campanha' },
  { key: 'revisao',   label: 'Revisão',       desc: 'Confirmar e lançar' },
];

/* ── Section card ────────────────────────────────────────── */
function Section({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5', className)}>
      {title && <h4 className="text-base font-semibold text-gray-900 tracking-wide">{title}</h4>}
      {children}
    </div>
  );
}

/* ── Field label ─────────────────────────────────────────── */
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block', className)}>
      {children}
    </label>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN WIZARD COMPONENT — FASE 2 (configuração da campanha)
══════════════════════════════════════════════════════════ */
export function CampaignWizard({ selectedImages: selectedImagesProp, onClose, onSuccess, clientId, getAssetIds, initialValues }: Props) {
  const selectedImages = selectedImagesProp ?? [];
  const [step, setStep]             = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Iniciativas disponíveis para vincular (PLANNED/ACTIVE do cliente/own)
  const [initiatives, setInitiatives] = useState<{ id: string; name: string; status: string }[]>([]);

  const [hookAlert, setHookAlert] = useState<{
    dominantLabel: string; dominantShare: number; suggestion: string | null;
  } | null>(null);

  const [autoFields, setAutoFields] = useState({
    pixelId:            '',
    specialAdCategory:  'NONE',
    customEventType:    'LEAD',
    objective:          'OUTCOME_LEADS',
    websiteDefault:     '',
    suggestedInterests: [] as { id: string; name: string }[],
    whatsappNumber:     '',
    whatsappMessage:    '',
    // FASE 18.2 — ângulos do segmento do cliente (dirigido por banco)
    allowedAngles:      [] as { slug: string; label: string }[],
    segmentName:        '' as string,
  });

  const [form, setForm] = useState({
    networkCode:  initialValues?.networkCode || 'meta',
    creativeType: selectedImages.length === 1 ? 'SINGLE_IMAGE' : '',
    name:         '',
    body:         initialValues?.body     || '',
    headline:     initialValues?.headline || '',
    linkUrl:      '',
    ctaType:      'WHATSAPP_MESSAGE',
    whatsappNumber:  '',
    whatsappMessage: 'Olá! Vi o anúncio e quero saber mais!',
    ageMin:  18,
    ageMax:  65,
    genders: [] as number[],
    locationEntries: [] as LocationEntry[],
    locations: { countries: ['BR'] } as any,
    interests: [] as any[],
    dailyBudget:  20,
    startTime:    new Date().toISOString().split('T')[0],
    endTime:      '',
    scheduleDays:      [0, 1, 2, 3, 4, 5, 6],
    scheduleTimeSlots: [{ start: 6, end: 23 }] as { start: number; end: number }[],
    scheduleMode:  'uniform' as 'uniform' | 'perday',
    perDaySlots:   {} as Record<number, { start: number; end: number }>,
    objective:         'OUTCOME_LEADS',
    specialAdCategory: '',
    pixelId:           '',
    customEventType:   '',
    declaredAngle:     '',   // FASE 14 — vazio = deixa o Vision inferir
    initiativeId:      '',   // vínculo opcional a uma Iniciativa de Marketing
  });

  /* pre-fill from identity + segment + whatsapp */
  useEffect(() => {
    async function loadAutoFields() {
      try {
        // Carregar em paralelo: identidade Meta, WhatsApp config e segment defaults
        const hookSatQs = clientId ? `?clientId=${clientId}` : '';
        const [identity, whatsapp, clientSettings, segDefaultsRaw, hookSat] = await Promise.all([
          getMetaIdentity().catch(() => null),
          getWhatsAppConfig().catch(() => null),
          clientId
            ? fetch(`/api/admin/clientes/${clientId}/campaign-settings`, { credentials: 'include' })
                .then(r => r.ok ? r.json() : null).catch(() => null)
            : Promise.resolve(null),
          fetch(
            clientId
              ? `/api/admin/campanhas/segment-defaults?clientId=${clientId}&network=meta`
              : `/api/admin/campanhas/segment-defaults?network=meta`,
            { credentials: 'include' },
          ).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/admin/campanhas/criativos/hook-saturation${hookSatQs}`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (hookSat?.saturationAlert) {
          setHookAlert({
            dominantLabel: hookSat.hookStats?.[0]?.label ?? hookSat.dominantHook,
            dominantShare: hookSat.dominantShare,
            suggestion: hookSat.suggestion,
          });
        }

        const segDefaults = segDefaultsRaw;

        // Cascade de pixel/website: cliente → fallback tenant (via campaign-settings) → identity
        const resolvedPixelId = clientSettings?.pixelId
          || clientSettings?.fallback?.pixelId
          || identity?.pixelId
          || '';
        const resolvedWebsite = clientSettings?.website
          || clientSettings?.fallback?.website
          || identity?.website
          || '';

        const resolved = {
          pixelId:            resolvedPixelId,
          websiteDefault:     resolvedWebsite,
          specialAdCategory:  segDefaults?.specialAdCategory || 'NONE',
          customEventType:    segDefaults?.customEventType   || 'LEAD',
          objective:          segDefaults?.objective         || 'OUTCOME_LEADS',
          suggestedInterests: segDefaults?.suggestedInterests || [],
          whatsappNumber:     whatsapp?.phoneNumber    || '',
          whatsappMessage:    whatsapp?.defaultMessage || '',
          allowedAngles:      segDefaults?.allowedAngles || [],
          segmentName:        segDefaults?.segmentName   || '',
        };

        setAutoFields(resolved);
        setForm(f => ({
          ...f,
          linkUrl:         f.linkUrl         || resolved.websiteDefault,
          objective:       f.objective === 'OUTCOME_LEADS' ? resolved.objective : f.objective,
          // Pré-preencher WhatsApp apenas se o campo ainda estiver vazio (não sobrescreve digitado)
          whatsappNumber:  f.whatsappNumber  || resolved.whatsappNumber,
          whatsappMessage: f.whatsappMessage || resolved.whatsappMessage,
        }));
      } catch { /* graceful fallback */ }
    }
    loadAutoFields();

    // Carregar iniciativas vinculáveis (mesmo escopo de cliente da campanha)
    async function loadInitiatives() {
      try {
        const scope = clientId ? clientId : 'own';
        const res   = await fetch(`/api/admin/campanhas/iniciativas?clientId=${scope}&limit=100`, { credentials: 'include' });
        if (!res.ok) return;
        const data  = await res.json();
        // Só faz sentido vincular a iniciativas em andamento (planejada ou ativa)
        const linkable = (data.items ?? []).filter(
          (i: { status: string }) => i.status === 'PLANNED' || i.status === 'ACTIVE',
        );
        setInitiatives(linkable);
      } catch { /* silencioso — vínculo é opcional */ }
    }
    loadInitiatives();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  function updateForm(updates: Partial<typeof form>) {
    setForm(prev => ({ ...prev, ...updates }));
  }

  function buildLocationsPayload(entries: LocationEntry[]) {
    if (entries.length === 0) return { countries: ['BR'] };
    return {
      custom_locations: entries.map(e => ({
        latitude: e.latitude, longitude: e.longitude,
        radius: e.radius, distance_unit: 'kilometer', name: e.name,
      })),
    };
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Build Meta API adset_schedule format
      const metaScheduleSlots = (() => {
        if (form.scheduleMode === 'perday') {
          // Group days that share the same time slot → fewer API entries
          const groups = new Map<string, number[]>();
          form.scheduleDays.forEach((day: number) => {
            const s = form.perDaySlots[day] || { start: 6, end: 23 };
            const key = `${s.start}-${s.end}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(day);
          });
          return Array.from(groups.entries()).map(([key, days]) => {
            const [start, end] = key.split('-').map(Number);
            return { days, start_minute: start * 60, end_minute: Math.min(end * 60, 1439), timezone_type: 'USER' };
          });
        }
        // Uniform: same time slots for all selected days
        return form.scheduleTimeSlots.map((slot: { start: number; end: number }) => ({
          days:          form.scheduleDays,
          start_minute:  slot.start * 60,
          end_minute:    Math.min(slot.end * 60, 1439),
          timezone_type: 'USER',
        }));
      })();

      // FASE 6: aguarda os uploads iniciados no /nova para obter os assetIds
      const assetIds = getAssetIds ? await getAssetIds() : [];

      await createCampaign({
        networkCode:       form.networkCode,
        name:              form.name || `Campanha ${new Date().toLocaleDateString('pt-BR')}`,
        objective:         form.objective,
        creativeType:      form.creativeType || 'SINGLE_IMAGE',
        images:            selectedImages.map(img => img.path),
        body:              form.body,
        headline:          form.headline,
        linkUrl:           form.linkUrl,
        ctaType:           form.ctaType,
        whatsappNumber:    form.whatsappNumber,
        whatsappMessage:   form.whatsappMessage,
        ageMin:            form.ageMin,
        ageMax:            form.ageMax,
        genders:           form.genders,
        locations:         buildLocationsPayload(form.locationEntries),
        interests:         form.interests,
        dailyBudget:       form.dailyBudget,
        startTime:         form.startTime,
        endTime:           form.endTime || undefined,
        scheduleDays:      form.scheduleDays,
        scheduleTimeSlots: metaScheduleSlots,
        specialAdCategory: form.specialAdCategory || autoFields.specialAdCategory || 'NONE',
        pixelId:           form.pixelId           || autoFields.pixelId           || undefined,
        customEventType:   form.customEventType   || autoFields.customEventType   || 'LEAD',
        declaredAngle:     form.declaredAngle || undefined,   // FASE 14
        initiativeId:      form.initiativeId || undefined,    // vínculo opcional à iniciativa
        clientId:          clientId || undefined,
        assetIds:          assetIds.length > 0 ? assetIds : undefined,
      });
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Erro ao criar campanha. Verifique os dados e tente novamente.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-white">

      {/* ── Sidebar ── */}
      <div className="w-64 shrink-0 border-r border-gray-100 bg-white flex flex-col">

        {/* Brand + phase indicator */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[9px] font-black bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 uppercase tracking-widest">Fase 1</span>
            <span className="text-[9px] text-gray-300">→</span>
            <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 rounded-full px-2 py-0.5 uppercase tracking-widest">Fase 2</span>
          </div>
          <h2 className="text-xl font-black text-gray-900">Configurar Campanha</h2>
          <p className="text-xs text-gray-400 mt-1">
            {selectedImages.length === 0
              ? 'Sem criativos anexados'
              : `${selectedImages.length} criativo(s) selecionado(s)`}
          </p>
        </div>

        {/* Steps nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3',
                i === step   ? 'bg-indigo-50 border border-indigo-100' :
                i < step     ? 'hover:bg-gray-50 cursor-pointer' :
                               'opacity-40 cursor-default'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                i === step   ? 'bg-indigo-600 text-white' :
                i < step     ? 'bg-indigo-100 text-indigo-600' :
                               'bg-gray-100 text-gray-400'
              )}>
                {i < step ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <div>
                <p className={cn(
                  'text-sm font-semibold',
                  i === step ? 'text-gray-900' : i < step ? 'text-gray-700' : 'text-gray-400'
                )}>{s.label}</p>
                <p className="text-[11px] text-gray-400">{s.desc}</p>
              </div>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
          >
            ← Voltar aos Criativos
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="px-10 py-5 border-b border-gray-100 bg-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-black text-gray-900">{STEPS[step].label}</h3>
            <p className="text-sm text-gray-500">{STEPS[step].desc}</p>
          </div>
          <span className="text-sm font-medium text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
            {step + 1} / {STEPS.length}
          </span>
        </div>

        {/* Scrollable step content */}
        <div className="flex-1 overflow-y-auto p-10 bg-gray-50">
          <AnimatePresence>
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl"
            >
              {step === 0 && <StepNetwork   form={form} updateForm={updateForm} />}
              {step === 1 && <StepType      form={form} updateForm={updateForm} selectedImages={selectedImages} hookAlert={hookAlert} />}
              {step === 2 && <StepTextCta   form={form} updateForm={updateForm} autoFields={autoFields} hookTextHint={initialValues?.hookText} isPrefilled={!!(initialValues?.body || initialValues?.headline)} />}
              {step === 3 && <StepTargeting form={form} updateForm={updateForm} clientId={clientId} suggestedInterests={autoFields.suggestedInterests} />}
              {step === 4 && <StepBudget    form={form} updateForm={updateForm} />}
              {step === 5 && <StepObjective form={form} updateForm={updateForm} autoFields={autoFields} initiatives={initiatives} />}
              {step === 6 && <StepReview    form={form} selectedImages={selectedImages} autoFields={autoFields} initiatives={initiatives} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <div className="px-10 py-5 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
          >
            {step === 0 ? '← Criativos' : '← Voltar'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-8 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              Próximo →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-60"
              style={{ background: submitting ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Lançando...
                </>
              ) : (
                <>
                  <RocketLaunchIcon className="h-4 w-4" />
                  Lançar Campanha
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STEP 0 — REDE
══════════════════════════════════════════════════════════ */

interface NetworkOption {
  id: string; code: string; name: string; icon: string; color: string;
  network_active: boolean; capabilities: { supported?: boolean }; connected?: boolean;
  contracted?: boolean;
}

function StepNetwork({ form, updateForm }: any) {
  const [networks, setNetworks] = useState<NetworkOption[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    axios.get('/api/admin/campanhas/configuracoes/redes')
      .then(r => setNetworks(r.data.networks || []))
      .catch(() => {
        setNetworks([{
          id: '', code: 'meta', name: 'Meta Ads', icon: 'meta', color: '#1877f2',
          network_active: true, capabilities: { supported: true }, connected: true,
        }]);
      })
      .finally(() => setLoading(false));
  }, []);

  const ICONS: Record<string, string> = { meta: '𝕗', google: 'G', linkedin: 'in', tiktok: '♪' };

  if (loading) {
    return (
      <Section title="Rede de Anúncios">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      </Section>
    );
  }

  return (
    <div className="space-y-8">
      <Section title="Rede de Anúncios">
        <p className="text-sm text-gray-500 -mt-2 mb-4">
          Selecione a plataforma onde esta campanha será veiculada.
          Cada campanha tem seu próprio budget independente.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {networks.map(net => {
            const isSupported  = net.capabilities?.supported !== false;
            // Contratação (modelo de negócio: cada rede é cobrada separadamente) tem
            // prioridade sobre "conectado" — sem contratar, nem adianta ter credencial.
            const isContracted = net.contracted !== false;
            const isSelected   = form.networkCode === net.code;
            const isClickable  = isSupported && isContracted && net.connected;
            return (
              <button
                key={net.code}
                disabled={!isClickable}
                onClick={() => isClickable && updateForm({ networkCode: net.code })}
                className={cn(
                  'bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center transition-all relative',
                  isSelected && 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-200',
                  !isClickable && 'opacity-50 cursor-not-allowed',
                  isClickable && !isSelected && 'hover:bg-gray-50 cursor-pointer',
                )}
              >
                <div
                  className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: net.color }}
                >
                  {ICONS[net.code] || net.code.slice(0, 2).toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-gray-900">{net.name}</p>
                {!isSupported ? (
                  <p className="text-xs text-gray-400 mt-1">Em breve</p>
                ) : !isContracted ? (
                  <p className="text-xs text-gray-400 mt-1">Não contratado</p>
                ) : net.connected ? (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">Conectado</p>
                ) : (
                  <p className="text-xs text-amber-500 mt-1">Não conectado</p>
                )}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {networks.some(n => n.capabilities?.supported !== false && n.contracted !== false && !n.connected) && (
          <p className="text-xs text-gray-400 mt-3">
            Redes com "Não conectado" precisam de credenciais em{' '}
            <a href="/admin/campanhas/configuracoes/redes" target="_blank" className="text-indigo-600 underline">
              Configurações → Redes
            </a>.
          </p>
        )}
      </Section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STEP 1 — TIPO
══════════════════════════════════════════════════════════ */

function StepType({ form, updateForm, selectedImages, hookAlert }: any) {
  /* Single image: show preview + name field */
  if (selectedImages.length === 1) {
    return (
      <div className="space-y-8">
        {hookAlert && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-lg shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-black text-amber-800">
                Portfólio saturado com hook "{hookAlert.dominantLabel}" ({hookAlert.dominantShare}%)
              </p>
              {hookAlert.suggestion && (
                <p className="text-xs text-amber-700 mt-0.5">{hookAlert.suggestion} para maior alcance.</p>
              )}
            </div>
          </div>
        )}
        <Section title="Criativo Selecionado">
          <div className="flex items-start gap-8">
            <div className="w-56 h-56 rounded-2xl overflow-hidden border border-gray-200 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedImages[0].path} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 space-y-4 pt-2">
              <p className="text-sm text-gray-600">Formato: <span className="text-gray-900 font-semibold">Imagem única</span></p>
              <div>
                <Label>Nome da campanha</Label>
                <input
                  type="text"
                  placeholder="Ex: Lançamento Edif. Aurora — Maio 2026"
                  value={form.name}
                  onChange={e => updateForm({ name: e.target.value })}
                  className={cn(inputCls, 'w-full')}
                />
                <p className="text-xs text-gray-400 mt-1.5">Opcional. Se vazio, será gerado automaticamente.</p>
              </div>
            </div>
          </div>
        </Section>
      </div>
    );
  }

  /* No images: show info + name field only */
  if (selectedImages.length === 0) {
    return (
      <div className="space-y-8">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-xl shrink-0">📭</span>
          <div>
            <p className="text-sm font-bold text-amber-800">Nenhum criativo selecionado</p>
            <p className="text-sm text-amber-700 mt-1">
              A campanha será criada sem imagem. Você poderá adicionar criativos diretamente no {networkLabel(form.networkCode)} Ads Manager após o lançamento.
            </p>
          </div>
        </div>
        <Section title="Identificação">
          <div>
            <Label>Nome da campanha</Label>
            <input
              type="text"
              placeholder="Ex: Lançamento Edif. Aurora — Maio 2026"
              value={form.name}
              onChange={e => updateForm({ name: e.target.value })}
              className={cn(inputCls, 'w-full max-w-lg')}
            />
            <p className="text-xs text-gray-400 mt-1.5">Opcional. Se vazio, será gerado automaticamente.</p>
          </div>
        </Section>
      </div>
    );
  }

  /* Multiple images: show format cards */
  return (
    <div className="space-y-8">
      <Section title="Formato do Anúncio">
        <div className="grid grid-cols-2 gap-5">
          {[
            { value: 'CAROUSEL',     emoji: '🎠', label: 'Carrossel',          desc: 'Múltiplas imagens deslizáveis em um único anúncio' },
            { value: 'SINGLE_IMAGE', emoji: '📸', label: 'Múltiplos Anúncios', desc: 'Um anúncio separado para cada imagem' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => updateForm({ creativeType: opt.value })}
              className={cn(
                'bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center transition-all',
                form.creativeType === opt.value
                  ? 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-200'
                  : 'hover:bg-gray-50'
              )}
            >
              <div className="text-4xl mb-3">{opt.emoji}</div>
              <p className="text-lg font-semibold text-gray-900">{opt.label}</p>
              <p className="text-sm text-gray-500 mt-1">{opt.desc}</p>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Identificação">
        <div>
          <Label>Nome da campanha</Label>
          <input
            type="text"
            placeholder="Ex: Lançamento Edif. Aurora — Maio 2026"
            value={form.name}
            onChange={e => updateForm({ name: e.target.value })}
            className={cn(inputCls, 'w-full max-w-lg')}
          />
          <p className="text-xs text-gray-400 mt-1.5">Opcional. Se vazio, será gerado automaticamente.</p>
        </div>
      </Section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STEP 2 — TEXTO & CTA
══════════════════════════════════════════════════════════ */

function StepTextCta({ form, updateForm, autoFields, hookTextHint, isPrefilled }: any) {
  const isAutoWhatsapp = !!autoFields?.whatsappNumber && form.whatsappNumber === autoFields.whatsappNumber;
  const isAutoMessage  = !!autoFields?.whatsappMessage && form.whatsappMessage === autoFields.whatsappMessage;

  /* Destinos cadastrados (formulários hospedados / links) para o seletor de CTA */
  const [destinos, setDestinos] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/admin/campanhas/destinos', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setDestinos(Array.isArray(d?.destinos) ? d.destinos.filter((x: any) => x.is_active) : []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-8">

      {/* Banner: texto pré-preenchido pela IA */}
      {isPrefilled && (
        <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-4">
          <span className="text-lg shrink-0">✨</span>
          <div>
            <p className="text-sm font-bold text-indigo-800">Texto gerado pela IA</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Headline e copy foram pré-preenchidos a partir do conceito que você escolheu em <strong>Padrões Vencedores</strong>.
              Edite à vontade antes de lançar.
            </p>
          </div>
        </div>
      )}

      <Section title="Conteúdo do Anúncio">
        <div>
          <Label>Texto do Anúncio *</Label>
          <textarea
            value={form.body}
            onChange={e => updateForm({ body: e.target.value })}
            placeholder="Escreva o texto principal do seu anúncio..."
            rows={5}
            className={cn(inputCls, 'w-full resize-none')}
          />
          {hookTextHint && (
            <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              <span className="text-xs shrink-0 mt-0.5">🪝</span>
              <p className="text-xs text-amber-800">
                <span className="font-bold">Hook sugerido:</span>{' '}
                <span className="italic">"{hookTextHint}"</span>
                <span className="text-amber-600 ml-1">(já incluído no texto acima)</span>
              </p>
            </div>
          )}
        </div>
        <div className="max-w-lg">
          <Label>Título / Headline</Label>
          <input
            type="text"
            value={form.headline}
            onChange={e => updateForm({ headline: e.target.value })}
            placeholder="Título curto e impactante"
            className={cn(inputCls, 'w-full')}
          />
        </div>
      </Section>

      <Section title="Chamada para Ação (CTA)">
        <div className="max-w-sm">
          <Label>Tipo de CTA</Label>
          <select
            value={form.ctaType}
            onChange={e => updateForm({ ctaType: e.target.value })}
            className={cn(inputCls, 'w-full')}
          >
            {CTA_TYPES.map(cta => (
              <option key={cta.value} value={cta.value}>{cta.label}</option>
            ))}
          </select>
        </div>

        {form.ctaType === 'WHATSAPP_MESSAGE' ? (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Label className="mb-0">Número WhatsApp (com DDI+DDD)</Label>
                {isAutoWhatsapp && <AutoChip label="configurações" />}
              </div>
              <input
                type="text"
                value={form.whatsappNumber}
                onChange={e => updateForm({ whatsappNumber: e.target.value })}
                placeholder="5581999999999"
                className={cn(inputCls, 'w-full')}
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Label className="mb-0">Mensagem Pré-preenchida</Label>
                {isAutoMessage && <AutoChip label="configurações" />}
              </div>
              <textarea
                value={form.whatsappMessage}
                onChange={e => updateForm({ whatsappMessage: e.target.value })}
                rows={2}
                className={cn(inputCls, 'w-full resize-none')}
              />
            </div>
          </div>
        ) : (
          <div className="max-w-lg space-y-3">
            {destinos.length > 0 && (
              <div>
                <Label>Destino cadastrado</Label>
                <select
                  className={cn(inputCls, 'w-full')}
                  value=""
                  onChange={e => {
                    const d = destinos.find((x: any) => x.id === e.target.value);
                    if (d) updateForm({ linkUrl: `${window.location.origin}/l/${d.slug}` });
                  }}
                >
                  <option value="">— selecionar formulário/landing hospedado —</option>
                  {destinos.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.type === 'APP_FORM' ? '(Formulário)' : d.type === 'EXTERNAL_URL' ? '(Link)' : '(WhatsApp)'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Destinos hospedados capturam os dados e geram leads no CRM automaticamente.{' '}
                  <a href="/admin/campanhas/destinos" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Gerenciar destinos
                  </a>
                </p>
              </div>
            )}
            <div>
              <Label>URL de Destino</Label>
              <input
                type="url"
                value={form.linkUrl}
                onChange={e => updateForm({ linkUrl: e.target.value })}
                placeholder="https://seusite.com.br"
                className={cn(inputCls, 'w-full')}
              />
              <p className="text-[11px] text-gray-400 mt-1.5">
                Pré-preenchido com o site da conta. Selecione um destino acima ou edite manualmente.
              </p>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STEP 3 — PÚBLICO
══════════════════════════════════════════════════════════ */

function StepTargeting({ form, updateForm, clientId, suggestedInterests }: any) {
  const [showInterests, setShowInterests] = useState(false);
  const hasInterests = form.interests.length > 0;

  // Auto-expand if there are already selected interests
  useEffect(() => {
    if (hasInterests) setShowInterests(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <Section title="Demográfico">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <Label>Faixa Etária</Label>
            <div className="flex items-center gap-3">
              <input type="number" value={form.ageMin}
                onChange={e => updateForm({ ageMin: parseInt(e.target.value) })}
                min={13} max={65} className={cn(inputCls, 'w-24')} />
              <span className="text-gray-400 text-sm">até</span>
              <input type="number" value={form.ageMax}
                onChange={e => updateForm({ ageMax: parseInt(e.target.value) })}
                min={13} max={65} className={cn(inputCls, 'w-24')} />
              <span className="text-gray-400 text-sm">anos</span>
            </div>
          </div>
          <div>
            <Label>Gênero</Label>
            <div className="flex gap-2">
              {[
                { value: [],  label: 'Todos' },
                { value: [1], label: 'Masculino' },
                { value: [2], label: 'Feminino' },
              ].map(opt => (
                <button key={opt.label} onClick={() => updateForm({ genders: opt.value })}
                  className={cn('px-5 py-2.5 rounded-xl border transition-all text-sm font-medium',
                    JSON.stringify(form.genders) === JSON.stringify(opt.value)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  )}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Localização">
        <LocationPicker locations={form.locationEntries} onChange={entries => updateForm({ locationEntries: entries })} />
      </Section>

      {/* ── Interesses: colapsável (impacto baixo, avançado) ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowInterests(v => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-all text-left"
        >
          <div>
            <p className="text-base font-semibold text-gray-900">Interesses</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Segmentação por interesse — opcional, avançado
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {hasInterests && (
              <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full uppercase tracking-wide">
                {form.interests.length} selecionado{form.interests.length !== 1 ? 's' : ''}
              </span>
            )}
            {(suggestedInterests || []).length > 0 && !hasInterests && (
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {(suggestedInterests || []).length} sugestão{(suggestedInterests || []).length !== 1 ? 'ões' : ''} do segmento
              </span>
            )}
            <ChevronDownIcon className={cn('h-5 w-5 text-gray-400 transition-transform duration-200', showInterests && 'rotate-180')} />
          </div>
        </button>

        {showInterests && (
          <div className="px-6 pb-6 pt-2 border-t border-gray-100">
            <div className="mb-4 bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2.5">
              <span className="shrink-0 mt-0.5">💡</span>
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Interesses são opcionais e de impacto variável.</span>{' '}
                Campanhas sem interesse (broad) frequentemente superam campanhas restritas, pois o algoritmo
                do Meta tem acesso a muito mais sinais de conversão do que interesses declarados.
                Para campanhas de <strong>habitação (HOUSING)</strong>, parte do targeting por interesse é restrito por lei.
              </p>
            </div>
            <InterestsPicker
              interests={form.interests}
              onChange={interests => updateForm({ interests })}
              clientId={clientId}
              suggestedInterests={suggestedInterests || []}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   INTERESTS PICKER — Meta Targeting Search API (IDs reais)
══════════════════════════════════════════════════════════ */

interface MetaInterest {
  id: string;
  name: string;
  topic?: string;
  path?: string[];
  audienceLower?: number;
  audienceUpper?: number;
}

function formatAudienceSize(lower?: number, upper?: number): string | null {
  if (!lower) return null;
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(0)}K`     : String(n);
  return upper ? `${fmt(lower)}–${fmt(upper)}` : `${fmt(lower)}+`;
}

function InterestsPicker({ interests, onChange, clientId, suggestedInterests }: {
  interests: any[];
  onChange: (v: any[]) => void;
  clientId?: string | null;
  suggestedInterests?: { id: string; name: string }[];
}) {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<MetaInterest[]>([]);
  const [searching, setSearching] = useState(false);
  const [apiMsg, setApiMsg]       = useState('');   // warning/error from API
  const [configured, setConfigured] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  async function fetchInterests(q: string) {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true); setApiMsg('');
    try {
      const params = new URLSearchParams({ q: q.trim() });
      if (clientId) params.append('clientId', clientId);
      const res  = await fetch(`/api/admin/campanhas/interests/search?${params}`, { credentials: 'include' });
      const data = await res.json();
      setConfigured(data.configured !== false);
      setResults(data.data || []);
      if (data.message) setApiMsg(data.message);
    } catch {
      setApiMsg('Erro de conexão ao buscar interesses.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchInterests(value), 350);
  }

  function addInterest(item: MetaInterest) {
    if (!interests.some((i: any) => i.id === item.id)) {
      onChange([...interests, { id: item.id, name: item.name }]);
    }
    setQuery(''); setResults([]);
  }

  function addCustom() {
    if (query.trim().length < 2) return;
    const id = `custom_${query.trim().toLowerCase().replace(/\s+/g, '_')}`;
    if (interests.some((i: any) => i.id === id)) return;
    onChange([...interests, { id, name: query.trim() }]);
    setQuery(''); setResults([]);
  }

  function removeInterest(id: string) { onChange(interests.filter((i: any) => i.id !== id)); }

  const filteredResults = results.filter(r => !interests.some((i: any) => i.id === r.id));
  const segmentChips = (suggestedInterests || []).filter(s => !interests.some((i: any) => i.id === s.id));

  return (
    <div className="space-y-4">

      {/* Selected chips */}
      {interests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {interests.map((i: any) => (
            <span key={i.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-sm text-indigo-700 font-medium">
              {i.name}
              <button onClick={() => removeInterest(i.id)}
                className="text-indigo-300 hover:text-indigo-600 transition-colors ml-0.5">
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          <button onClick={() => onChange([])}
            className="text-xs px-3 py-1.5 rounded-full border border-dashed border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-all">
            Limpar todos
          </button>
        </div>
      )}

      {/* Segment suggestions */}
      {segmentChips.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-1">
            <BoltIcon className="h-3 w-3" /> Sugeridos para este segmento
          </p>
          <div className="flex flex-wrap gap-2">
            {segmentChips.map(item => (
              <button key={item.id} onClick={() => addInterest(item)}
                className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-medium transition-all">
                + {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search input */}
      <div className="max-w-lg relative">
        <input
          type="text"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (filteredResults.length > 0) addInterest(filteredResults[0]);
              else if (query.trim().length >= 2) addCustom();
            }
          }}
          placeholder="Buscar interesses na Meta (ex: imóveis, fitness, viagens)..."
          className={cn(inputCls, 'w-full pr-9')}
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Status messages */}
      {!configured && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
          <span className="text-amber-500 shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="text-xs font-semibold text-amber-800">Token Meta não configurado</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Configure em <a href="/admin/campanhas/configuracoes/redes" target="_blank"
                className="underline">Configurações → Redes de Anúncios</a> para buscar
              interesses reais com IDs válidos.
            </p>
          </div>
        </div>
      )}
      {configured && apiMsg && (
        <p className="text-xs text-amber-600 font-medium">⚠️ {apiMsg}</p>
      )}

      {/* Results from Meta API */}
      {query.length >= 2 && filteredResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {filteredResults.length} interesse{filteredResults.length !== 1 ? 's' : ''} encontrado{filteredResults.length !== 1 ? 's' : ''} na Meta API
          </p>
          <div className="flex flex-wrap gap-2">
            {filteredResults.map(item => {
              const audience = formatAudienceSize(item.audienceLower, item.audienceUpper);
              return (
                <button key={item.id} onClick={() => addInterest(item)}
                  className="group flex items-center gap-2 text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-all">
                  <span>+ {item.name}</span>
                  {audience && (
                    <span className="text-[9px] font-bold text-gray-400 group-hover:text-indigo-400 bg-gray-100 group-hover:bg-indigo-100 rounded-full px-1.5 py-0.5 transition-all">
                      {audience}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400">↩ Enter para adicionar o primeiro resultado</p>
        </div>
      )}

      {/* No results + add custom */}
      {query.length >= 2 && !searching && filteredResults.length === 0 && !apiMsg && configured && (
        <div className="flex items-center gap-3">
          <button onClick={addCustom}
            className="text-xs px-3 py-2 rounded-xl border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-all">
            + Adicionar "{query.trim()}" como interesse livre
          </button>
          <p className="text-xs text-gray-400">Nenhum resultado na Meta API. Interesses livres não têm ID validado.</p>
        </div>
      )}

      {/* Empty state */}
      {query.length === 0 && interests.length === 0 && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 font-medium mb-1">
            💡 Os interesses são buscados diretamente na Meta API
          </p>
          <p className="text-xs text-gray-400">
            Os resultados incluem IDs reais do Meta e o tamanho estimado da audiência.
            Ex: "imóveis", "construção civil", "financiamento".
          </p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DATE INPUT — dd/mm/aaaa mask, stores ISO YYYY-MM-DD
══════════════════════════════════════════════════════════ */

function DateInput({ value, onChange, placeholder, className }: {
  value: string; onChange: (iso: string) => void; placeholder?: string; className?: string;
}) {
  function toDisplay(iso: string) {
    if (!iso || iso.length < 10) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return '';
    return `${d}/${m}/${y}`;
  }

  const [local, setLocal] = useState(() => toDisplay(value));

  useEffect(() => {
    const display = toDisplay(value);
    setLocal(prev => {
      // Only sync if the ISO value changed externally (avoid fighting with user typing)
      const prevISO = prev.length === 10
        ? `${prev.slice(6)}-${prev.slice(3,5)}-${prev.slice(0,2)}`
        : '';
      return prevISO !== value ? display : prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    let fmt = raw;
    if (raw.length >= 3) fmt = raw.slice(0, 2) + '/' + raw.slice(2);
    if (raw.length >= 5) fmt = raw.slice(0, 2) + '/' + raw.slice(2, 4) + '/' + raw.slice(4);
    setLocal(fmt);
    if (raw.length === 8) {
      // dd/mm/yyyy → YYYY-MM-DD
      onChange(`${raw.slice(4)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}`);
    } else {
      onChange('');
    }
  }

  return (
    <input
      type="text"
      value={local}
      onChange={handleChange}
      placeholder={placeholder ?? 'dd/mm/aaaa'}
      maxLength={10}
      className={cn(inputCls, className)}
    />
  );
}

/* ══════════════════════════════════════════════════════════
   STEP 4 — ORÇAMENTO
══════════════════════════════════════════════════════════ */

function StepBudget({ form, updateForm }: any) {
  const scheduleMode = (form.scheduleMode || 'uniform') as 'uniform' | 'perday';
  const perDaySlots  = (form.perDaySlots  || {}) as Record<number, { start: number; end: number }>;

  function switchToPerDay() {
    // Pre-fill from global slot so it feels seamless
    const globalSlot = form.scheduleTimeSlots?.[0] || { start: 6, end: 23 };
    const slots: Record<number, { start: number; end: number }> = {};
    for (let d = 0; d < 7; d++) slots[d] = { ...globalSlot };
    updateForm({ scheduleMode: 'perday', perDaySlots: slots });
  }

  function updateSlot(i: number, field: 'start' | 'end', val: number) {
    const slots = [...(form.scheduleTimeSlots as { start: number; end: number }[])];
    slots[i] = { ...slots[i], [field]: val };
    updateForm({ scheduleTimeSlots: slots });
  }

  function updatePerDay(day: number, field: 'start' | 'end', val: number) {
    updateForm({
      perDaySlots: {
        ...perDaySlots,
        [day]: { ...(perDaySlots[day] || { start: 6, end: 23 }), [field]: val },
      },
    });
  }

  function toggleDay(dayValue: number) {
    const days = form.scheduleDays.includes(dayValue)
      ? form.scheduleDays.filter((d: number) => d !== dayValue)
      : [...form.scheduleDays, dayValue];
    updateForm({ scheduleDays: days });
  }

  return (
    <div className="space-y-8">
      <Section title="Investimento">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <Label>Orçamento Diário</Label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-semibold text-sm">R$</span>
              <input type="number" value={form.dailyBudget}
                onChange={e => updateForm({ dailyBudget: parseFloat(e.target.value) })}
                min={1} step={1} className={cn(inputCls, 'w-32')} />
              <span className="text-gray-400 text-sm">/ dia</span>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Estimativa mensal:{' '}
              <span className="text-indigo-600 font-semibold">{formatCurrency(form.dailyBudget * 30)}</span>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Início</Label>
              <DateInput
                value={form.startTime}
                onChange={v => updateForm({ startTime: v })}
                className="w-full"
              />
            </div>
            <div>
              <Label>Data Fim (opcional)</Label>
              <DateInput
                value={form.endTime}
                onChange={v => updateForm({ endTime: v })}
                placeholder="Sem data fim"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Programação de Veiculação">
        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => updateForm({ scheduleMode: 'uniform' })}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all',
              scheduleMode === 'uniform'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
            )}
          >
            🗓️ Mesmo horário todos os dias
          </button>
          <button
            onClick={switchToPerDay}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all',
              scheduleMode === 'perday'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
            )}
          >
            ⚙️ Personalizar por dia
          </button>
        </div>

        {scheduleMode === 'uniform' ? (
          <div className="grid grid-cols-2 gap-8">
            <div>
              <Label>Dias da Semana</Label>
              <div className="flex gap-2 flex-wrap">
                {DAYS_OF_WEEK.map(day => (
                  <button key={day.value} onClick={() => toggleDay(day.value)}
                    className={cn('w-11 h-11 rounded-xl text-sm font-semibold transition-all',
                      form.scheduleDays.includes(day.value)
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300'
                    )}>
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Horários de Veiculação</Label>
              <div className="space-y-3">
                {(form.scheduleTimeSlots as { start: number; end: number }[]).map((slot, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <input type="number" value={slot.start}
                      onChange={e => updateSlot(i, 'start', parseInt(e.target.value))}
                      min={0} max={23} className={cn(inputCls, 'w-20 text-center')} />
                    <span className="text-gray-400 text-sm">h até</span>
                    <input type="number" value={slot.end}
                      onChange={e => updateSlot(i, 'end', parseInt(e.target.value))}
                      min={0} max={23} className={cn(inputCls, 'w-20 text-center')} />
                    <span className="text-gray-400 text-sm">h</span>
                    {form.scheduleTimeSlots.length > 1 && (
                      <button
                        onClick={() => updateForm({ scheduleTimeSlots: form.scheduleTimeSlots.filter((_: any, idx: number) => idx !== i) })}
                        className="text-red-400 hover:text-red-600 transition-colors" title="Remover">
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => updateForm({ scheduleTimeSlots: [...form.scheduleTimeSlots, { start: 0, end: 6 }] })}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                  + Adicionar intervalo
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Per-day mode */
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3">
              Clique no dia para ativar / desativar. Defina horários individuais para cada dia.
            </p>
            {DAYS_OF_WEEK.map(day => {
              const isActive = form.scheduleDays.includes(day.value);
              const slot = perDaySlots[day.value] || { start: 6, end: 23 };
              return (
                <div key={day.value} className={cn(
                  'flex items-center gap-4 px-4 py-3 rounded-xl border transition-all',
                  isActive ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-100 bg-gray-50 opacity-50'
                )}>
                  <button
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      'w-12 h-10 rounded-xl text-sm font-bold shrink-0 transition-all',
                      isActive ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-200 text-gray-400'
                    )}>
                    {day.label}
                  </button>
                  <div className="flex items-center gap-2">
                    <input type="number" value={slot.start} min={0} max={23} disabled={!isActive}
                      onChange={e => updatePerDay(day.value, 'start', parseInt(e.target.value))}
                      className={cn(inputCls, 'w-20 text-center disabled:opacity-40 disabled:cursor-not-allowed')} />
                    <span className="text-gray-400 text-sm">h até</span>
                    <input type="number" value={slot.end} min={0} max={23} disabled={!isActive}
                      onChange={e => updatePerDay(day.value, 'end', parseInt(e.target.value))}
                      className={cn(inputCls, 'w-20 text-center disabled:opacity-40 disabled:cursor-not-allowed')} />
                    <span className="text-gray-400 text-sm">h</span>
                  </div>
                  {!isActive && <span className="text-[10px] text-gray-400 italic">desativado</span>}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STEP 5 — OBJETIVO & CONVERSÃO
══════════════════════════════════════════════════════════ */

function StepObjective({ form, updateForm, autoFields, initiatives = [] }: any) {
  const effectiveSpecial = form.specialAdCategory || autoFields.specialAdCategory || 'NONE';
  const effectivePixel   = form.pixelId           || autoFields.pixelId           || '';
  const effectiveEvent   = form.customEventType   || autoFields.customEventType   || 'LEAD';
  const isAutoSpecial    = !form.specialAdCategory && !!autoFields.specialAdCategory;
  const isAutoPixel      = !form.pixelId           && !!autoFields.pixelId;
  const isAutoEvent      = !form.customEventType   && !!autoFields.customEventType;

  const SPECIAL_AD_OPTIONS = [
    { value: 'NONE',                        label: 'Nenhuma (padrão)' },
    { value: 'HOUSING',                     label: 'Habitação / Imóveis' },
    { value: 'EMPLOYMENT',                  label: 'Emprego / Vagas' },
    { value: 'CREDIT',                      label: 'Crédito' },
    { value: 'FINANCIAL_PRODUCTS_SERVICES', label: 'Serviços Financeiros' },
    { value: 'ISSUES_ELECTIONS_POLITICS',   label: 'Política / Eleições' },
  ];
  const EVENT_OPTIONS = [
    { value: 'LEAD',                  label: 'Lead / Contato' },
    { value: 'PURCHASE',              label: 'Compra / Venda' },
    { value: 'COMPLETE_REGISTRATION', label: 'Cadastro completo' },
    { value: 'ADD_TO_CART',           label: 'Adicionar ao carrinho' },
    { value: 'INITIATED_CHECKOUT',    label: 'Iniciar checkout' },
    { value: 'SCHEDULE',              label: 'Agendamento' },
    { value: 'CONTACT',               label: 'Contato' },
  ];

  return (
    <div className="space-y-8">
      <Section title="Qual o objetivo principal desta campanha?">
        <div className="grid grid-cols-2 gap-4">
          {OBJECTIVES.map(obj => (
            <button key={obj.value} onClick={() => updateForm({ objective: obj.value })}
              className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left transition-all flex items-center gap-4',
                form.objective === obj.value ? 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50'
              )}>
              <span className="text-3xl shrink-0">{obj.icon}</span>
              <div>
                <p className="font-semibold text-gray-900">{obj.label}</p>
                {obj.value === autoFields.objective && <AutoChip label="segmento" />}
              </div>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Rastreamento e Conversão">
        <p className="text-sm text-gray-500 -mt-2 mb-2">
          Campos com <span className="text-indigo-600 font-semibold">⚡ automático</span> são preenchidos
          a partir do segmento e das configurações da conta. Você pode sobrescrever.
        </p>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoria Especial</label>
              {isAutoSpecial && <AutoChip label="segmento" />}
            </div>
            <select value={effectiveSpecial}
              onChange={e => updateForm({ specialAdCategory: e.target.value === autoFields.specialAdCategory ? '' : e.target.value })}
              className={cn(inputCls, 'w-full')}>
              {SPECIAL_AD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Obrigatório para imóveis, emprego, crédito.</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Evento de Conversão</label>
              {isAutoEvent && <AutoChip label="segmento" />}
            </div>
            <select value={effectiveEvent}
              onChange={e => updateForm({ customEventType: e.target.value === autoFields.customEventType ? '' : e.target.value })}
              className={cn(inputCls, 'w-full')}>
              {EVENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">Evento do Pixel a ser otimizado.</p>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheckIcon className="h-4 w-4 text-indigo-500" />
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meta Pixel ID</label>
            {isAutoPixel && <AutoChip label="configurações" />}
          </div>
          <input type="text" value={effectivePixel}
            onChange={e => updateForm({ pixelId: e.target.value || '' })}
            placeholder={isAutoPixel ? `${autoFields.pixelId} (da conta)` : 'Ex: 876543210987654'}
            className={cn(inputCls, 'w-full max-w-sm', !effectivePixel && 'border-amber-300 focus:ring-amber-400')} />
          {!effectivePixel && (
            <p className="text-[11px] text-gray-400 mt-1">
              Sem Pixel configurado — conversões não serão rastreadas.
            </p>
          )}
        </div>
      </Section>

      {/* FASE 14/18.2 — Ângulo de comunicação declarado (opcional, dirigido por segmento) */}
      <Section title="Ângulo da comunicação">
        <p className="text-sm text-gray-500 -mt-2 mb-2">
          Opcional — qual a <span className="font-semibold text-gray-700">intenção estratégica</span> deste
          criativo? Ajuda a plataforma a comparar quais ângulos convertem melhor.
          Deixe em branco para a IA inferir a partir da imagem.
          {autoFields?.segmentName && (
            <span className="block mt-1 text-[11px] text-indigo-500 font-medium">
              Ângulos do segmento: {autoFields.segmentName}
            </span>
          )}
        </p>
        <select
          value={form.declaredAngle || ''}
          onChange={e => updateForm({ declaredAngle: e.target.value })}
          className={cn(inputCls, 'w-full max-w-sm')}
        >
          <option value="">Deixe a IA inferir</option>
          {(autoFields?.allowedAngles?.length
            ? autoFields.allowedAngles.map((o: { slug: string; label: string }) => ({ value: o.slug, label: o.label }))
            : ANGLE_OPTIONS
          ).map((o: { value: string; label: string }) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Section>

      {/* Vínculo opcional a uma Iniciativa de Marketing — agrupa a campanha sob um objetivo/budget comuns */}
      {initiatives.length > 0 && (
        <Section title="Iniciativa de Marketing">
          <p className="text-sm text-gray-500 -mt-2 mb-2">
            Opcional — vincule esta campanha a uma <span className="font-semibold text-gray-700">iniciativa</span> para
            consolidar métricas, orçamento planejado e KPI sob um objetivo comum.
          </p>
          <select
            value={form.initiativeId || ''}
            onChange={e => updateForm({ initiativeId: e.target.value })}
            className={cn(inputCls, 'w-full max-w-sm')}
          >
            <option value="">Sem iniciativa</option>
            {initiatives.map((i: { id: string; name: string; status: string }) => (
              <option key={i.id} value={i.id}>
                {i.name}{i.status === 'PLANNED' ? ' (planejada)' : ''}
              </option>
            ))}
          </select>
        </Section>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STEP 6 — REVISÃO
══════════════════════════════════════════════════════════ */

function StepReview({ form, selectedImages, autoFields, initiatives = [] }: any) {
  const resolveAngleLabel = (slug: string) =>
    autoFields?.allowedAngles?.find((a: { slug: string; label: string }) => a.slug === slug)?.label
      ?? angleLabel(slug);
  const initiativeName = form.initiativeId
    ? (initiatives.find((i: { id: string; name: string }) => i.id === form.initiativeId)?.name ?? '(vinculada)')
    : 'Sem iniciativa';
  return (
    <div className="space-y-8">
      <Section title="Resumo da Campanha">
        <div className="divide-y divide-gray-100">
          <Row label="Criativos"   value={`${selectedImages.length} imagem(ns) — ${form.creativeType === 'CAROUSEL' ? 'Carrossel' : selectedImages.length === 0 ? 'Sem criativo' : 'Simples'}`} />
          <Row label="Texto"       value={form.body || '(não informado)'} />
          <Row label="CTA"         value={CTA_TYPES.find(c => c.value === form.ctaType)?.label || form.ctaType} />
          {form.ctaType === 'WHATSAPP_MESSAGE' && <Row label="WhatsApp" value={form.whatsappNumber || '(não informado)'} />}
          <Row label="Público"     value={`${form.ageMin}–${form.ageMax} anos, ${form.genders.length === 0 ? 'Todos' : form.genders.includes(1) ? 'Masculino' : 'Feminino'}`} />
          <Row label="Localização" value={form.locationEntries.length === 0 ? 'Brasil inteiro' : form.locationEntries.map((l: LocationEntry) => `${l.name} (${l.radius}km)`).join('; ')} />
          <Row label="Interesses"  value={form.interests.length === 0 ? '(nenhum selecionado)' : form.interests.map((i: any) => i.name).join(', ')} />
          <Row label="Orçamento"   value={`${formatCurrency(form.dailyBudget)} / dia (${formatCurrency(form.dailyBudget * 30)} / mês)`} />
          <Row label="Período"     value={`${form.startTime} ${form.endTime ? `até ${form.endTime}` : '(sem data fim)'}`} />
          <Row label="Dias"        value={form.scheduleDays.map((d: number) => DAYS_OF_WEEK[d]?.label).join(', ')} />
          <Row label="Horários"    value={form.scheduleTimeSlots.map((s: any) => `${s.start}h — ${s.end}h`).join(', ')} />
          <Row label="Objetivo"    value={OBJECTIVES.find(o => o.value === form.objective)?.label || form.objective} />
          <Row label="Ângulo"      value={form.declaredAngle ? resolveAngleLabel(form.declaredAngle) : 'IA infere'} />
          <Row label="Iniciativa"  value={initiativeName} />
        </div>
      </Section>
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3">
        <svg className="w-5 h-5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-indigo-700">
          A campanha será criada com status <span className="font-bold">PAUSADA</span>.
          Ative manualmente após revisar no {networkLabel(form.networkCode)} Ads Manager.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-3">
      <span className="text-sm font-medium text-gray-400 w-32 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right flex-1">{value}</span>
    </div>
  );
}
