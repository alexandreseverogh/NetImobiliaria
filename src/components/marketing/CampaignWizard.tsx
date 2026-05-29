'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { createCampaign, getMetaIdentity, type Creative } from '@/lib/marketing-api';
import { cn, OBJECTIVES, CTA_TYPES, DAYS_OF_WEEK, formatCurrency } from '@/lib/marketing-utils';
import { LocationPicker, type LocationEntry } from './LocationPicker';
import {
  ShieldCheckIcon, BoltIcon, XMarkIcon, RocketLaunchIcon,
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
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
      {children}
    </label>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN WIZARD COMPONENT — FASE 2 (configuração da campanha)
══════════════════════════════════════════════════════════ */
export function CampaignWizard({ selectedImages: selectedImagesProp, onClose, onSuccess, clientId }: Props) {
  const selectedImages = selectedImagesProp ?? [];
  const [step, setStep]             = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [autoFields, setAutoFields] = useState({
    pixelId:           '',
    specialAdCategory: 'NONE',
    customEventType:   'LEAD',
    objective:         'OUTCOME_LEADS',
    websiteDefault:    '',
  });

  const [form, setForm] = useState({
    networkCode:  'meta',
    creativeType: selectedImages.length === 1 ? 'SINGLE_IMAGE' : '',
    name:         '',
    body:         '',
    headline:     '',
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
  });

  /* pre-fill from identity + segment */
  useEffect(() => {
    async function loadAutoFields() {
      try {
        const identity = await getMetaIdentity().catch(() => null);
        const endpoint = clientId
          ? `/api/admin/campanhas/segment-defaults?clientId=${clientId}&network=meta`
          : `/api/admin/campanhas/segment-defaults?network=meta`;
        const segDefaults = await fetch(endpoint, { credentials: 'include' })
          .then(r => r.ok ? r.json() : null).catch(() => null);

        const resolved = {
          pixelId:           identity?.pixelId          || '',
          websiteDefault:    identity?.website           || '',
          specialAdCategory: segDefaults?.specialAdCategory || 'NONE',
          customEventType:   segDefaults?.customEventType   || 'LEAD',
          objective:         segDefaults?.objective         || 'OUTCOME_LEADS',
        };
        setAutoFields(resolved);
        setForm(f => ({
          ...f,
          linkUrl:   f.linkUrl   || resolved.websiteDefault,
          objective: f.objective === 'OUTCOME_LEADS' ? resolved.objective : f.objective,
        }));
      } catch { /* graceful fallback */ }
    }
    loadAutoFields();
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
        clientId:          clientId || undefined,
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
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl"
            >
              {step === 0 && <StepNetwork   form={form} updateForm={updateForm} />}
              {step === 1 && <StepType      form={form} updateForm={updateForm} selectedImages={selectedImages} />}
              {step === 2 && <StepTextCta   form={form} updateForm={updateForm} />}
              {step === 3 && <StepTargeting form={form} updateForm={updateForm} />}
              {step === 4 && <StepBudget    form={form} updateForm={updateForm} />}
              {step === 5 && <StepObjective form={form} updateForm={updateForm} autoFields={autoFields} />}
              {step === 6 && <StepReview    form={form} selectedImages={selectedImages} />}
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
            const isSupported = net.capabilities?.supported !== false;
            const isSelected  = form.networkCode === net.code;
            return (
              <button
                key={net.code}
                disabled={!isSupported || !net.connected}
                onClick={() => isSupported && net.connected && updateForm({ networkCode: net.code })}
                className={cn(
                  'bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center transition-all relative',
                  isSelected && 'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-200',
                  (!isSupported || !net.connected) && 'opacity-50 cursor-not-allowed',
                  isSupported && net.connected && !isSelected && 'hover:bg-gray-50 cursor-pointer',
                )}
              >
                <div
                  className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: net.color }}
                >
                  {ICONS[net.code] || net.code.slice(0, 2).toUpperCase()}
                </div>
                <p className="text-sm font-semibold text-gray-900">{net.name}</p>
                {net.connected ? (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">Conectado</p>
                ) : isSupported ? (
                  <p className="text-xs text-amber-500 mt-1">Não conectado</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">Em breve</p>
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
        {networks.some(n => n.capabilities?.supported !== false && !n.connected) && (
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

function StepType({ form, updateForm, selectedImages }: any) {
  /* Single image: show preview + name field */
  if (selectedImages.length === 1) {
    return (
      <div className="space-y-8">
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
              A campanha será criada sem imagem. Você poderá adicionar criativos diretamente no Meta Ads Manager após o lançamento.
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

function StepTextCta({ form, updateForm }: any) {
  return (
    <div className="space-y-8">
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
              <Label>Número WhatsApp (com DDI+DDD)</Label>
              <input
                type="text"
                value={form.whatsappNumber}
                onChange={e => updateForm({ whatsappNumber: e.target.value })}
                placeholder="5581999999999"
                className={cn(inputCls, 'w-full')}
              />
            </div>
            <div>
              <Label>Mensagem Pré-preenchida</Label>
              <textarea
                value={form.whatsappMessage}
                onChange={e => updateForm({ whatsappMessage: e.target.value })}
                rows={2}
                className={cn(inputCls, 'w-full resize-none')}
              />
            </div>
          </div>
        ) : (
          <div className="max-w-lg">
            <Label>URL de Destino</Label>
            <input
              type="url"
              value={form.linkUrl}
              onChange={e => updateForm({ linkUrl: e.target.value })}
              placeholder="https://seusite.com.br"
              className={cn(inputCls, 'w-full')}
            />
            <p className="text-[11px] text-gray-400 mt-1.5">
              Pré-preenchido com o site configurado na conta. Edite para usar uma landing page específica.
            </p>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STEP 3 — PÚBLICO
══════════════════════════════════════════════════════════ */

function StepTargeting({ form, updateForm }: any) {
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
      <Section title="Interesses">
        <InterestsPicker interests={form.interests} onChange={interests => updateForm({ interests })} />
      </Section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   INTERESTS PICKER
══════════════════════════════════════════════════════════ */

const INTEREST_CATEGORIES: { label: string; items: { id: string; name: string }[] }[] = [
  {
    label: 'Imobiliário',
    items: [
      { id: 'real_estate',           name: 'Imóveis' },
      { id: 'real_estate_investing', name: 'Investimento imobiliário' },
      { id: 'mortgage_loan',         name: 'Financiamento imobiliário' },
      { id: 'interior_design',       name: 'Decoração de interiores' },
      { id: 'architecture',          name: 'Arquitetura' },
      { id: 'home_moving',           name: 'Mudança de casa' },
      { id: 'rental_property',       name: 'Aluguel de imóveis' },
      { id: 'luxury_real_estate',    name: 'Imóveis de luxo' },
      { id: 'first_home',            name: 'Primeiro imóvel' },
      { id: 'condominium',           name: 'Condomínios' },
      { id: 'construction',          name: 'Construção civil' },
    ],
  },
  {
    label: 'Saúde',
    items: [
      { id: 'health_wellness', name: 'Saúde e bem-estar' },
      { id: 'fitness',         name: 'Fitness e academia' },
      { id: 'nutrition',       name: 'Nutrição' },
      { id: 'yoga',            name: 'Yoga e meditação' },
      { id: 'mental_health',   name: 'Saúde mental' },
      { id: 'dental',          name: 'Odontologia' },
      { id: 'aesthetics',      name: 'Estética e beleza' },
      { id: 'medical',         name: 'Medicina e clínicas' },
      { id: 'pharmacy',        name: 'Farmácia' },
      { id: 'health_insurance',name: 'Plano de saúde' },
    ],
  },
  {
    label: 'Educação',
    items: [
      { id: 'education',        name: 'Educação' },
      { id: 'online_courses',   name: 'Cursos online' },
      { id: 'higher_education', name: 'Ensino superior' },
      { id: 'languages',        name: 'Idiomas' },
      { id: 'technology_edu',   name: 'Tecnologia e TI' },
      { id: 'mba',              name: 'MBA e pós-graduação' },
      { id: 'professional_dev', name: 'Desenvolvimento profissional' },
      { id: 'kids_education',   name: 'Educação infantil' },
      { id: 'enem_vestibular',  name: 'ENEM e vestibular' },
    ],
  },
  {
    label: 'Serviços',
    items: [
      { id: 'consulting',         name: 'Consultoria' },
      { id: 'accounting',         name: 'Contabilidade' },
      { id: 'legal_services',     name: 'Serviços jurídicos' },
      { id: 'insurance',          name: 'Seguros' },
      { id: 'cleaning',           name: 'Limpeza e manutenção' },
      { id: 'events',             name: 'Eventos e festas' },
      { id: 'photography',        name: 'Fotografia' },
      { id: 'marketing_services', name: 'Marketing digital' },
      { id: 'delivery',           name: 'Delivery e logística' },
      { id: 'pet_services',       name: 'Pet shop e veterinária' },
    ],
  },
  {
    label: 'Vendas e Comércio',
    items: [
      { id: 'ecommerce',    name: 'E-commerce' },
      { id: 'fashion',      name: 'Moda e vestuário' },
      { id: 'electronics',  name: 'Eletrônicos' },
      { id: 'automotive',   name: 'Automotivo' },
      { id: 'food_beverage',name: 'Alimentação e bebidas' },
      { id: 'furniture',    name: 'Móveis e decoração' },
      { id: 'sports_goods', name: 'Artigos esportivos' },
      { id: 'cosmetics',    name: 'Cosméticos' },
      { id: 'jewelry',      name: 'Joias e acessórios' },
      { id: 'marketplace',  name: 'Marketplace' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { id: 'investing',          name: 'Investimentos' },
      { id: 'personal_finance',   name: 'Finanças pessoais' },
      { id: 'entrepreneurship',   name: 'Empreendedorismo' },
      { id: 'credit',             name: 'Crédito e empréstimos' },
      { id: 'cryptocurrency',     name: 'Criptomoedas' },
      { id: 'stock_market',       name: 'Bolsa de valores' },
      { id: 'passive_income',     name: 'Renda passiva' },
      { id: 'financial_planning', name: 'Planejamento financeiro' },
    ],
  },
  {
    label: 'Estilo de Vida',
    items: [
      { id: 'travel',         name: 'Viagens e turismo' },
      { id: 'gastronomy',     name: 'Gastronomia' },
      { id: 'family',         name: 'Família e filhos' },
      { id: 'luxury',         name: 'Luxo e lifestyle' },
      { id: 'sustainability', name: 'Sustentabilidade' },
      { id: 'culture',        name: 'Cultura e arte' },
      { id: 'gaming',         name: 'Games e entretenimento' },
      { id: 'music',          name: 'Música' },
    ],
  },
];

const ALL_INTERESTS = INTEREST_CATEGORIES.flatMap(c => c.items);

function InterestsPicker({ interests, onChange }: { interests: any[]; onChange: (v: any[]) => void }) {
  const [query, setQuery]               = useState('');
  const [activeCategory, setActiveCategory] = useState(INTEREST_CATEGORIES[0].label);

  const filtered = query.length >= 2
    ? ALL_INTERESTS.filter(
        i => !interests.some((sel: any) => sel.id === i.id) &&
          i.name.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const categoryItems = INTEREST_CATEGORIES.find(c => c.label === activeCategory)?.items.filter(
    i => !interests.some((sel: any) => sel.id === i.id)
  ) ?? [];

  function addInterest(item: { id: string; name: string }) { onChange([...interests, item]); setQuery(''); }
  function addCustom() {
    if (query.trim().length < 2) return;
    const id = query.trim().toLowerCase().replace(/\s+/g, '_');
    if (interests.some((i: any) => i.id === id)) return;
    onChange([...interests, { id, name: query.trim() }]); setQuery('');
  }
  function removeInterest(id: string) { onChange(interests.filter((i: any) => i.id !== id)); }

  return (
    <div className="space-y-4">
      {interests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {interests.map((i: any) => (
            <span key={i.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-sm text-indigo-700">
              {i.name}
              <button onClick={() => removeInterest(i.id)} className="text-indigo-400 hover:text-indigo-700 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="max-w-lg">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { filtered.length > 0 ? addInterest(filtered[0]) : addCustom(); } }}
          placeholder="Buscar interesses em todos os segmentos..."
          className={cn(inputCls, 'w-full')} />
      </div>
      {query.length >= 2 ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">{filtered.length} resultado(s) encontrado(s)</p>
          <div className="flex flex-wrap gap-2">
            {filtered.slice(0, 12).map(item => (
              <button key={item.id} onClick={() => addInterest(item)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-indigo-300 transition-all">
                + {item.name}
              </button>
            ))}
            {filtered.length === 0 && query.trim().length >= 2 && (
              <button onClick={addCustom}
                className="text-xs px-3 py-1.5 rounded-full border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-all">
                + Adicionar "{query.trim()}" como interesse personalizado
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {INTEREST_CATEGORIES.map(cat => (
              <button key={cat.label} onClick={() => setActiveCategory(cat.label)}
                className={cn('text-xs px-3 py-1.5 rounded-lg transition-all font-medium',
                  activeCategory === cat.label
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'text-gray-500 hover:text-gray-700 border border-transparent'
                )}>
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryItems.slice(0, 10).map(item => (
              <button key={item.id} onClick={() => addInterest(item)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-indigo-300 transition-all">
                + {item.name}
              </button>
            ))}
            {categoryItems.length === 0 && (
              <p className="text-xs text-gray-400">Todos os interesses desta categoria já foram selecionados.</p>
            )}
          </div>
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

function StepObjective({ form, updateForm, autoFields }: any) {
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
            <p className="text-[11px] text-amber-600 mt-1">
              ⚠️ Sem Pixel, a campanha não rastreia conversões.
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   STEP 6 — REVISÃO
══════════════════════════════════════════════════════════ */

function StepReview({ form, selectedImages }: any) {
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
        </div>
      </Section>
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3">
        <svg className="w-5 h-5 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-indigo-700">
          A campanha será criada com status <span className="font-bold">PAUSADA</span>.
          Ative manualmente após revisar no Meta Ads Manager.
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
