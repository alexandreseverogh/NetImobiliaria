import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { createCampaign, getMetaIdentity, type Creative } from '@/lib/marketing-api';
import { cn, OBJECTIVES, CTA_TYPES, DAYS_OF_WEEK, formatCurrency } from '@/lib/marketing-utils';
import { LocationPicker, type LocationEntry } from './LocationPicker';
import { ShieldCheckIcon, BoltIcon } from '@heroicons/react/24/outline';

interface Props {
  selectedImages: Creative[];
  onClose: () => void;
  onSuccess: () => void;
  /** UUID do cliente selecionado (null = campanha do próprio tenant). */
  clientId?: string | null;
}

/** Chip indicando campo preenchido automaticamente */
function AutoChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-[10px] font-black text-indigo-300 uppercase tracking-wide">
      <BoltIcon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

const STEPS = [
  { key: 'rede',     label: 'Rede',       desc: 'Plataforma de anuncios' },
  { key: 'tipo',     label: 'Tipo',       desc: 'Formato do anuncio' },
  { key: 'texto',    label: 'Texto & CTA',desc: 'Conteudo e acao' },
  { key: 'publico',  label: 'Publico',    desc: 'Segmentacao' },
  { key: 'orcamento',label: 'Orcamento',  desc: 'Investimento e agenda' },
  { key: 'objetivo', label: 'Objetivo',   desc: 'Meta da campanha' },
  { key: 'revisao',  label: 'Revisao',    desc: 'Confirmar e lancar' },
];

function Section({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('glass-card p-6 space-y-5', className)}>
      {title && <h4 className="text-base font-semibold text-white tracking-wide">{title}</h4>}
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-gray-400 mb-1.5 block">{children}</label>;
}

export function CampaignWizard({ selectedImages, onClose, onSuccess, clientId }: Props) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Campos automáticos resolvidos da identidade Meta + segmento
  const [autoFields, setAutoFields] = useState({
    pixelId:          '',
    specialAdCategory: 'NONE',
    customEventType:  'LEAD',
    objective:        'OUTCOME_LEADS',
    websiteDefault:   '',
  });

  const [form, setForm] = useState({
    networkCode: 'meta',
    creativeType: selectedImages.length === 1 ? 'SINGLE_IMAGE' : '',
    name: '',
    body: '',
    headline: '',
    linkUrl: '',
    ctaType: 'WHATSAPP_MESSAGE',
    whatsappNumber: '',
    whatsappMessage: 'Ola! Vi o anuncio e quero saber mais!',
    ageMin: 18,
    ageMax: 65,
    genders: [] as number[],
    locationEntries: [] as LocationEntry[],
    locations: { countries: ['BR'] } as any,
    interests: [] as any[],
    dailyBudget: 20,
    startTime: new Date().toISOString().split('T')[0],
    endTime: '',
    scheduleDays: [0, 1, 2, 3, 4, 5, 6],
    scheduleTimeSlots: [{ start: 6, end: 23 }] as { start: number; end: number }[],
    objective: 'OUTCOME_LEADS',
    // Campos de conversão (resolvidos do segmento + editáveis)
    specialAdCategory: '',  // '' = usar autoFields
    pixelId:           '',  // '' = usar autoFields
    customEventType:   '',  // '' = usar autoFields
  });

  // Pré-preencher campos automáticos: MetaIdentity + segment defaults via API
  useEffect(() => {
    async function loadAutoFields() {
      try {
        // Buscar identidade Meta (pixel, website)
        const identity = await getMetaIdentity().catch(() => null);
        // Buscar segment defaults via endpoint de campanhas
        const endpoint = clientId
          ? `/api/admin/campanhas/segment-defaults?clientId=${clientId}&network=meta`
          : `/api/admin/campanhas/segment-defaults?network=meta`;
        const segDefaults = await fetch(endpoint, { credentials: 'include' })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null);

        const resolved = {
          pixelId:           identity?.pixelId           || '',
          websiteDefault:    identity?.website            || '',
          specialAdCategory: segDefaults?.specialAdCategory || 'NONE',
          customEventType:   segDefaults?.customEventType   || 'LEAD',
          objective:         segDefaults?.objective          || 'OUTCOME_LEADS',
        };
        setAutoFields(resolved);
        // Pré-preencher linkUrl com o site (somente se estiver vazio)
        setForm(f => ({
          ...f,
          linkUrl:   f.linkUrl   || resolved.websiteDefault,
          objective: f.objective === 'OUTCOME_LEADS' ? resolved.objective : f.objective,
        }));
      } catch { /* fallback gracioso: não quebra o wizard */ }
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
        latitude: e.latitude,
        longitude: e.longitude,
        radius: e.radius,
        distance_unit: 'kilometer',
        name: e.name,
      })),
    };
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await createCampaign({
        networkCode:      form.networkCode,
        name:             form.name || `Campanha ${new Date().toLocaleDateString('pt-BR')}`,
        objective:        form.objective,
        creativeType:     form.creativeType || 'SINGLE_IMAGE',
        images:           selectedImages.map(img => img.path),
        body:             form.body,
        headline:         form.headline,
        linkUrl:          form.linkUrl,
        ctaType:          form.ctaType,
        whatsappNumber:   form.whatsappNumber,
        whatsappMessage:  form.whatsappMessage,
        ageMin:           form.ageMin,
        ageMax:           form.ageMax,
        genders:          form.genders,
        locations:        buildLocationsPayload(form.locationEntries),
        interests:        form.interests,
        dailyBudget:      form.dailyBudget,
        startTime:        form.startTime,
        endTime:          form.endTime || undefined,
        scheduleDays:     form.scheduleDays,
        scheduleTimeSlots: form.scheduleTimeSlots,
        // Campos de conversão — usa override manual se informado, senão usa auto
        specialAdCategory: form.specialAdCategory || autoFields.specialAdCategory || 'NONE',
        pixelId:           form.pixelId           || autoFields.pixelId           || undefined,
        customEventType:   form.customEventType   || autoFields.customEventType   || 'LEAD',
        // Cliente associado
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
    <div className="fixed inset-0 z-50 flex bg-surface/95 backdrop-blur-md">
      {/* Sidebar com steps */}
      <div className="w-64 shrink-0 border-r border-card-border bg-surface flex flex-col">
        <div className="p-6 border-b border-card-border">
          <h2 className="text-xl font-bold text-white">Nova Campanha</h2>
          <p className="text-xs text-gray-500 mt-1">{selectedImages.length} criativo(s) selecionado(s)</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {STEPS.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStep(i)}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3',
                i === step
                  ? 'bg-primary/15 border border-primary/30'
                  : i < step
                    ? 'hover:bg-surface-light/30'
                    : 'opacity-50'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                i === step
                  ? 'bg-primary text-white'
                  : i < step
                    ? 'bg-primary/30 text-primary-light'
                    : 'bg-surface-light text-gray-500'
              )}>
                {i < step ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  i === step ? 'text-white' : i < step ? 'text-gray-300' : 'text-gray-500'
                )}>{s.label}</p>
                <p className="text-[11px] text-gray-500">{s.desc}</p>
              </div>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-card-border">
          <button onClick={onClose} className="w-full btn-secondary text-sm">
            Cancelar
          </button>
        </div>
      </div>

      {/* Conteudo principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-10 py-5 border-b border-card-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-white">{STEPS[step].label}</h3>
            <p className="text-sm text-gray-500">{STEPS[step].desc}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            Passo {step + 1} de {STEPS.length}
          </div>
        </div>

        {/* Conteudo scrollavel */}
        <div className="flex-1 overflow-y-auto p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="max-w-4xl"
            >
              {step === 0 && <StepNetwork form={form} updateForm={updateForm} />}
              {step === 1 && <StepType form={form} updateForm={updateForm} selectedImages={selectedImages} />}
              {step === 2 && <StepTextCta form={form} updateForm={updateForm} />}
              {step === 3 && <StepTargeting form={form} updateForm={updateForm} />}
              {step === 4 && <StepBudget form={form} updateForm={updateForm} />}
              {step === 5 && <StepObjective form={form} updateForm={updateForm} autoFields={autoFields} />}
              {step === 6 && <StepReview form={form} selectedImages={selectedImages} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer com navegacao */}
        <div className="px-10 py-5 border-t border-card-border flex justify-between shrink-0">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="btn-secondary"
          >
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="btn-primary px-8">
              Proximo
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary px-8">
              {submitting ? 'Lancando...' : 'Lancar Campanha'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== STEP 0 — REDE ===================== */

interface NetworkOption {
  id: string;
  code: string;
  name: string;
  icon: string;
  color: string;
  network_active: boolean;
  capabilities: { supported?: boolean };
  connected?: boolean;
}

function StepNetwork({ form, updateForm }: any) {
  const [networks, setNetworks] = useState<NetworkOption[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    axios.get('/api/admin/campanhas/configuracoes/redes')
      .then(r => setNetworks(r.data.networks || []))
      .catch(() => {
        // fallback: ao menos mostrar Meta se a API falhar
        setNetworks([{ id: '', code: 'meta', name: 'Meta Ads', icon: 'meta', color: '#1877f2', network_active: true, capabilities: { supported: true }, connected: true }]);
      })
      .finally(() => setLoading(false));
  }, []);

  const ICONS: Record<string, string> = { meta: '𝕗', google: 'G', linkedin: 'in', tiktok: '♪' };

  if (loading) {
    return (
      <Section title="Rede de Anuncios">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 rounded-xl bg-surface-light/30 animate-pulse" />
          ))}
        </div>
      </Section>
    );
  }

  return (
    <div className="space-y-8">
      <Section title="Rede de Anuncios">
        <p className="text-sm text-gray-400 -mt-2 mb-4">
          Selecione a plataforma onde esta campanha sera veiculada.
          Cada campanha tem seu proprio budget independente.
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
                  'glass-card p-5 text-center transition-all relative',
                  isSelected && 'ring-2 ring-primary bg-primary/10',
                  (!isSupported || !net.connected) && 'opacity-50 cursor-not-allowed',
                  isSupported && net.connected && !isSelected && 'hover:bg-surface-light/30 cursor-pointer',
                )}
              >
                <div
                  className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: net.color }}
                >
                  {ICONS[net.code] || net.code.slice(0, 2).toUpperCase()}
                </div>
                <p className="text-sm font-medium text-white">{net.name}</p>
                {net.connected ? (
                  <p className="text-xs text-emerald-400 mt-1">Conectado</p>
                ) : isSupported ? (
                  <p className="text-xs text-amber-400 mt-1">Nao conectado</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Em breve</p>
                )}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
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
          <p className="text-xs text-gray-500 mt-3">
            Redes com "Nao conectado" precisam de credenciais em{' '}
            <a href="/admin/campanhas/configuracoes/redes" target="_blank" className="text-indigo-400 underline">
              Configuracoes → Redes
            </a>.
          </p>
        )}
      </Section>
    </div>
  );
}

/* ===================== STEP 1 — TIPO ===================== */

function StepType({ form, updateForm, selectedImages }: any) {
  if (selectedImages.length === 1) {
    return (
      <div className="space-y-8">
        <Section title="Criativo Selecionado">
          <div className="flex items-start gap-8">
            <div className="w-56 h-56 rounded-2xl overflow-hidden border border-card-border shrink-0">
              <img src={selectedImages[0].url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 space-y-4 pt-2">
              <p className="text-gray-300">Formato: <span className="text-white font-medium">Imagem unica</span></p>
              <div>
                <Label>Nome da campanha</Label>
                <input
                  type="text"
                  placeholder="Ex: Lancamento Edif. Aurora - Maio 2026"
                  value={form.name}
                  onChange={e => updateForm({ name: e.target.value })}
                  className="input-field w-full"
                />
                <p className="text-xs text-gray-500 mt-1.5">Opcional. Se vazio, sera gerado automaticamente.</p>
              </div>
            </div>
          </div>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Section title="Formato do Anuncio">
        <div className="grid grid-cols-2 gap-5">
          <button
            onClick={() => updateForm({ creativeType: 'CAROUSEL' })}
            className={cn(
              'glass-card p-6 text-center transition-all hover:bg-surface-light/30',
              form.creativeType === 'CAROUSEL' && 'ring-2 ring-primary bg-primary/5'
            )}
          >
            <div className="text-4xl mb-3">🎠</div>
            <p className="text-lg font-medium text-white">Carrossel</p>
            <p className="text-sm text-gray-400 mt-1">Multiplas imagens deslizaveis em um unico anuncio</p>
          </button>
          <button
            onClick={() => updateForm({ creativeType: 'SINGLE_IMAGE' })}
            className={cn(
              'glass-card p-6 text-center transition-all hover:bg-surface-light/30',
              form.creativeType === 'SINGLE_IMAGE' && 'ring-2 ring-primary bg-primary/5'
            )}
          >
            <div className="text-4xl mb-3">📸</div>
            <p className="text-lg font-medium text-white">Multiplos Anuncios</p>
            <p className="text-sm text-gray-400 mt-1">Um anuncio separado para cada imagem</p>
          </button>
        </div>
      </Section>

      <Section title="Identificacao">
        <div>
          <Label>Nome da campanha</Label>
          <input
            type="text"
            placeholder="Ex: Lancamento Edif. Aurora - Maio 2026"
            value={form.name}
            onChange={e => updateForm({ name: e.target.value })}
            className="input-field w-full max-w-lg"
          />
          <p className="text-xs text-gray-500 mt-1.5">Opcional. Se vazio, sera gerado automaticamente.</p>
        </div>
      </Section>
    </div>
  );
}

/* ===================== STEP 2 — TEXTO & CTA ===================== */

function StepTextCta({ form, updateForm }: any) {
  return (
    <div className="space-y-8">
      <Section title="Conteudo do Anuncio">
        <div>
          <Label>Texto do Anuncio *</Label>
          <textarea
            value={form.body}
            onChange={e => updateForm({ body: e.target.value })}
            placeholder="Escreva o texto principal do seu anuncio..."
            rows={5}
            className="input-field w-full resize-none"
          />
        </div>
        <div className="max-w-lg">
          <Label>Titulo / Headline</Label>
          <input
            type="text"
            value={form.headline}
            onChange={e => updateForm({ headline: e.target.value })}
            placeholder="Titulo curto e impactante"
            className="input-field w-full"
          />
        </div>
      </Section>

      <Section title="Chamada para Acao (CTA)">
        <div className="max-w-sm">
          <Label>Tipo de CTA</Label>
          <select
            value={form.ctaType}
            onChange={e => updateForm({ ctaType: e.target.value })}
            className="input-field w-full"
          >
            {CTA_TYPES.map(cta => (
              <option key={cta.value} value={cta.value}>{cta.label}</option>
            ))}
          </select>
        </div>

        {form.ctaType === 'WHATSAPP_MESSAGE' ? (
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Numero WhatsApp (com DDI+DDD)</Label>
              <input
                type="text"
                value={form.whatsappNumber}
                onChange={e => updateForm({ whatsappNumber: e.target.value })}
                placeholder="5581999999999"
                className="input-field w-full"
              />
            </div>
            <div>
              <Label>Mensagem Pre-preenchida</Label>
              <textarea
                value={form.whatsappMessage}
                onChange={e => updateForm({ whatsappMessage: e.target.value })}
                rows={2}
                className="input-field w-full resize-none"
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
              className="input-field w-full"
            />
            <p className="text-[11px] text-gray-500 mt-1.5">
              Pré-preenchido com o site configurado na conta. Edite para usar uma landing page específica.
            </p>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ===================== STEP 3 — PUBLICO ===================== */

function StepTargeting({ form, updateForm }: any) {
  return (
    <div className="space-y-8">
      <Section title="Demografico">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <Label>Faixa Etaria</Label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={form.ageMin}
                onChange={e => updateForm({ ageMin: parseInt(e.target.value) })}
                min={13}
                max={65}
                className="input-field w-24"
              />
              <span className="text-gray-500">ate</span>
              <input
                type="number"
                value={form.ageMax}
                onChange={e => updateForm({ ageMax: parseInt(e.target.value) })}
                min={13}
                max={65}
                className="input-field w-24"
              />
              <span className="text-gray-500">anos</span>
            </div>
          </div>

          <div>
            <Label>Genero</Label>
            <div className="flex gap-2">
              {[
                { value: [], label: 'Todos' },
                { value: [1], label: 'Masculino' },
                { value: [2], label: 'Feminino' },
              ].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => updateForm({ genders: opt.value })}
                  className={cn(
                    'px-5 py-2.5 rounded-xl border transition-all text-sm font-medium',
                    JSON.stringify(form.genders) === JSON.stringify(opt.value)
                      ? 'border-primary bg-primary/20 text-white'
                      : 'border-card-border text-gray-400 hover:text-white hover:border-gray-500'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Localizacao">
        <LocationPicker
          locations={form.locationEntries}
          onChange={entries => updateForm({ locationEntries: entries })}
        />
      </Section>

      <Section title="Interesses">
        <InterestsPicker
          interests={form.interests}
          onChange={interests => updateForm({ interests })}
        />
      </Section>
    </div>
  );
}

/* ===================== INTERESTS PICKER ===================== */

const INTEREST_CATEGORIES: { label: string; items: { id: string; name: string }[] }[] = [
  {
    label: 'Imobiliario',
    items: [
      { id: 'real_estate', name: 'Imoveis' },
      { id: 'real_estate_investing', name: 'Investimento imobiliario' },
      { id: 'mortgage_loan', name: 'Financiamento imobiliario' },
      { id: 'interior_design', name: 'Decoracao de interiores' },
      { id: 'architecture', name: 'Arquitetura' },
      { id: 'home_moving', name: 'Mudanca de casa' },
      { id: 'rental_property', name: 'Aluguel de imoveis' },
      { id: 'luxury_real_estate', name: 'Imoveis de luxo' },
      { id: 'first_home', name: 'Primeiro imovel' },
      { id: 'condominium', name: 'Condominios' },
      { id: 'construction', name: 'Construcao civil' },
    ],
  },
  {
    label: 'Saude',
    items: [
      { id: 'health_wellness', name: 'Saude e bem-estar' },
      { id: 'fitness', name: 'Fitness e academia' },
      { id: 'nutrition', name: 'Nutricao' },
      { id: 'yoga', name: 'Yoga e meditacao' },
      { id: 'mental_health', name: 'Saude mental' },
      { id: 'dental', name: 'Odontologia' },
      { id: 'aesthetics', name: 'Estetica e beleza' },
      { id: 'medical', name: 'Medicina e clinicas' },
      { id: 'pharmacy', name: 'Farmacia' },
      { id: 'health_insurance', name: 'Plano de saude' },
    ],
  },
  {
    label: 'Educacao',
    items: [
      { id: 'education', name: 'Educacao' },
      { id: 'online_courses', name: 'Cursos online' },
      { id: 'higher_education', name: 'Ensino superior' },
      { id: 'languages', name: 'Idiomas' },
      { id: 'technology_edu', name: 'Tecnologia e TI' },
      { id: 'mba', name: 'MBA e pos-graduacao' },
      { id: 'professional_dev', name: 'Desenvolvimento profissional' },
      { id: 'kids_education', name: 'Educacao infantil' },
      { id: 'enem_vestibular', name: 'ENEM e vestibular' },
    ],
  },
  {
    label: 'Servicos',
    items: [
      { id: 'consulting', name: 'Consultoria' },
      { id: 'accounting', name: 'Contabilidade' },
      { id: 'legal_services', name: 'Servicos juridicos' },
      { id: 'insurance', name: 'Seguros' },
      { id: 'cleaning', name: 'Limpeza e manutencao' },
      { id: 'events', name: 'Eventos e festas' },
      { id: 'photography', name: 'Fotografia' },
      { id: 'marketing_services', name: 'Marketing digital' },
      { id: 'delivery', name: 'Delivery e logistica' },
      { id: 'pet_services', name: 'Pet shop e veterinaria' },
    ],
  },
  {
    label: 'Vendas e Comercio',
    items: [
      { id: 'ecommerce', name: 'E-commerce' },
      { id: 'fashion', name: 'Moda e vestuario' },
      { id: 'electronics', name: 'Eletronicos' },
      { id: 'automotive', name: 'Automotivo' },
      { id: 'food_beverage', name: 'Alimentacao e bebidas' },
      { id: 'furniture', name: 'Moveis e decoracao' },
      { id: 'sports_goods', name: 'Artigos esportivos' },
      { id: 'cosmetics', name: 'Cosmeticos' },
      { id: 'jewelry', name: 'Joias e acessorios' },
      { id: 'marketplace', name: 'Marketplace' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { id: 'investing', name: 'Investimentos' },
      { id: 'personal_finance', name: 'Financas pessoais' },
      { id: 'entrepreneurship', name: 'Empreendedorismo' },
      { id: 'credit', name: 'Credito e emprestimos' },
      { id: 'cryptocurrency', name: 'Criptomoedas' },
      { id: 'stock_market', name: 'Bolsa de valores' },
      { id: 'passive_income', name: 'Renda passiva' },
      { id: 'financial_planning', name: 'Planejamento financeiro' },
    ],
  },
  {
    label: 'Estilo de Vida',
    items: [
      { id: 'travel', name: 'Viagens e turismo' },
      { id: 'gastronomy', name: 'Gastronomia' },
      { id: 'family', name: 'Familia e filhos' },
      { id: 'luxury', name: 'Luxo e lifestyle' },
      { id: 'sustainability', name: 'Sustentabilidade' },
      { id: 'culture', name: 'Cultura e arte' },
      { id: 'gaming', name: 'Games e entretenimento' },
      { id: 'music', name: 'Musica' },
    ],
  },
];

const ALL_INTERESTS = INTEREST_CATEGORIES.flatMap(c => c.items);

function InterestsPicker({ interests, onChange }: { interests: any[]; onChange: (v: any[]) => void }) {
  const [query, setQuery] = useState('');
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

  function addInterest(item: { id: string; name: string }) {
    onChange([...interests, item]);
    setQuery('');
  }

  function addCustom() {
    if (query.trim().length < 2) return;
    const id = query.trim().toLowerCase().replace(/\s+/g, '_');
    if (interests.some((i: any) => i.id === id)) return;
    onChange([...interests, { id, name: query.trim() }]);
    setQuery('');
  }

  function removeInterest(id: string) {
    onChange(interests.filter((i: any) => i.id !== id));
  }

  return (
    <div className="space-y-4">
      {interests.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {interests.map((i: any) => (
            <span
              key={i.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-sm text-primary-light"
            >
              {i.name}
              <button
                onClick={() => removeInterest(i.id)}
                className="text-primary-light/60 hover:text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="max-w-lg">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (filtered.length > 0) addInterest(filtered[0]);
              else addCustom();
            }
          }}
          placeholder="Buscar interesses em todos os segmentos..."
          className="input-field w-full"
        />
      </div>

      {query.length >= 2 ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">{filtered.length} resultado(s) encontrado(s)</p>
          <div className="flex flex-wrap gap-2">
            {filtered.slice(0, 12).map(item => (
              <button
                key={item.id}
                onClick={() => addInterest(item)}
                className="text-xs px-3 py-1.5 rounded-full border border-card-border text-gray-400 hover:text-white hover:border-primary/50 transition-all"
              >
                + {item.name}
              </button>
            ))}
            {filtered.length === 0 && query.trim().length >= 2 && (
              <button
                onClick={addCustom}
                className="text-xs px-3 py-1.5 rounded-full border border-dashed border-primary/40 text-primary-light hover:bg-primary/10 transition-all"
              >
                + Adicionar "{query.trim()}" como interesse personalizado
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {INTEREST_CATEGORIES.map(cat => (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(cat.label)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-lg transition-all font-medium',
                  activeCategory === cat.label
                    ? 'bg-primary/20 text-primary-light border border-primary/30'
                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryItems.slice(0, 10).map(item => (
              <button
                key={item.id}
                onClick={() => addInterest(item)}
                className="text-xs px-3 py-1.5 rounded-full border border-card-border text-gray-400 hover:text-white hover:border-primary/50 transition-all"
              >
                + {item.name}
              </button>
            ))}
            {categoryItems.length === 0 && (
              <p className="text-xs text-gray-500">Todos os interesses desta categoria ja foram selecionados.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== STEP 4 — ORCAMENTO ===================== */

function StepBudget({ form, updateForm }: any) {
  return (
    <div className="space-y-8">
      <Section title="Investimento">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <Label>Orcamento Diario</Label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-medium">R$</span>
              <input
                type="number"
                value={form.dailyBudget}
                onChange={e => updateForm({ dailyBudget: parseFloat(e.target.value) })}
                min={1}
                step={1}
                className="input-field w-32"
              />
              <span className="text-gray-500">/ dia</span>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">Estimativa mensal: <span className="text-primary-light font-medium">{formatCurrency(form.dailyBudget * 30)}</span></p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data Inicio</Label>
                <input
                  type="date"
                  value={form.startTime}
                  onChange={e => updateForm({ startTime: e.target.value })}
                  className="input-field w-full"
                />
              </div>
              <div>
                <Label>Data Fim (opcional)</Label>
                <input
                  type="date"
                  value={form.endTime}
                  onChange={e => updateForm({ endTime: e.target.value })}
                  className="input-field w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Programacao de Veiculacao">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <Label>Dias da Semana</Label>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.value}
                  onClick={() => {
                    const days = form.scheduleDays.includes(day.value)
                      ? form.scheduleDays.filter((d: number) => d !== day.value)
                      : [...form.scheduleDays, day.value];
                    updateForm({ scheduleDays: days });
                  }}
                  className={cn(
                    'w-11 h-11 rounded-xl text-sm font-medium transition-all',
                    form.scheduleDays.includes(day.value)
                      ? 'bg-primary text-white'
                      : 'bg-surface-light/50 text-gray-400 border border-card-border hover:border-gray-500'
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Horarios de Veiculacao</Label>
            <div className="space-y-3">
              {form.scheduleTimeSlots.map((slot: { start: number; end: number }, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <input
                    type="number"
                    value={slot.start}
                    onChange={e => {
                      const slots = [...form.scheduleTimeSlots];
                      slots[i] = { ...slots[i], start: parseInt(e.target.value) };
                      updateForm({ scheduleTimeSlots: slots });
                    }}
                    min={0}
                    max={23}
                    className="input-field w-20"
                  />
                  <span className="text-gray-500">h ate</span>
                  <input
                    type="number"
                    value={slot.end}
                    onChange={e => {
                      const slots = [...form.scheduleTimeSlots];
                      slots[i] = { ...slots[i], end: parseInt(e.target.value) };
                      updateForm({ scheduleTimeSlots: slots });
                    }}
                    min={0}
                    max={23}
                    className="input-field w-20"
                  />
                  <span className="text-gray-500">h</span>
                  {form.scheduleTimeSlots.length > 1 && (
                    <button
                      onClick={() => {
                        const slots = form.scheduleTimeSlots.filter((_: any, idx: number) => idx !== i);
                        updateForm({ scheduleTimeSlots: slots });
                      }}
                      className="text-red-400 hover:text-red-300 text-lg px-2"
                      title="Remover intervalo"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => updateForm({ scheduleTimeSlots: [...form.scheduleTimeSlots, { start: 0, end: 6 }] })}
                className="text-sm text-primary hover:text-primary/80"
              >
                + Adicionar intervalo
              </button>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ===================== STEP 5 — OBJETIVO & CONVERSÃO ===================== */

function StepObjective({ form, updateForm, autoFields }: any) {
  const effectiveSpecial = form.specialAdCategory || autoFields.specialAdCategory || 'NONE';
  const effectivePixel   = form.pixelId           || autoFields.pixelId           || '';
  const effectiveEvent   = form.customEventType   || autoFields.customEventType   || 'LEAD';
  const isAutoSpecial    = !form.specialAdCategory && !!autoFields.specialAdCategory;
  const isAutoPixel      = !form.pixelId           && !!autoFields.pixelId;
  const isAutoEvent      = !form.customEventType   && !!autoFields.customEventType;

  const SPECIAL_AD_OPTIONS = [
    { value: 'NONE',                       label: 'Nenhuma (padrão)' },
    { value: 'HOUSING',                    label: 'Habitação / Imóveis' },
    { value: 'EMPLOYMENT',                 label: 'Emprego / Vagas' },
    { value: 'CREDIT',                     label: 'Crédito' },
    { value: 'FINANCIAL_PRODUCTS_SERVICES',label: 'Serviços Financeiros' },
    { value: 'ISSUES_ELECTIONS_POLITICS',  label: 'Política / Eleições' },
  ];

  const EVENT_OPTIONS = [
    { value: 'LEAD',               label: 'Lead / Contato' },
    { value: 'PURCHASE',           label: 'Compra / Venda' },
    { value: 'COMPLETE_REGISTRATION', label: 'Cadastro completo' },
    { value: 'ADD_TO_CART',        label: 'Adicionar ao carrinho' },
    { value: 'INITIATED_CHECKOUT', label: 'Iniciar checkout' },
    { value: 'SCHEDULE',           label: 'Agendamento' },
    { value: 'CONTACT',            label: 'Contato' },
  ];

  return (
    <div className="space-y-8">
      {/* Objetivo da campanha */}
      <Section title="Qual o objetivo principal desta campanha?">
        <div className="grid grid-cols-2 gap-4">
          {OBJECTIVES.map(obj => (
            <button
              key={obj.value}
              onClick={() => updateForm({ objective: obj.value })}
              className={cn(
                'glass-card p-5 text-left transition-all hover:bg-surface-light/30 flex items-center gap-4',
                form.objective === obj.value && 'ring-2 ring-primary bg-primary/5'
              )}
            >
              <span className="text-3xl shrink-0">{obj.icon}</span>
              <div>
                <p className="font-medium text-white">{obj.label}</p>
                {obj.value === autoFields.objective && (
                  <AutoChip label="segmento" />
                )}
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Conversão & Pixel */}
      <Section title="Rastreamento e Conversão">
        <p className="text-sm text-gray-400 -mt-2 mb-2">
          Campos marcados com <span className="text-indigo-300 font-semibold">⚡ automático</span> são
          preenchidos a partir do segmento de negócio e das configurações da conta.
          Você pode sobrescrever qualquer um deles.
        </p>

        <div className="grid grid-cols-2 gap-6">
          {/* Special Ad Category */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-sm font-medium text-gray-400">Categoria Especial de Anúncio</label>
              {isAutoSpecial && <AutoChip label="segmento" />}
            </div>
            <select
              value={effectiveSpecial}
              onChange={e => updateForm({ specialAdCategory: e.target.value === autoFields.specialAdCategory ? '' : e.target.value })}
              className="input-field w-full"
            >
              {SPECIAL_AD_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              Obrigatório para imóveis, emprego, crédito. Restringe segmentação.
            </p>
          </div>

          {/* Custom Event Type */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <label className="text-sm font-medium text-gray-400">Evento de Conversão</label>
              {isAutoEvent && <AutoChip label="segmento" />}
            </div>
            <select
              value={effectiveEvent}
              onChange={e => updateForm({ customEventType: e.target.value === autoFields.customEventType ? '' : e.target.value })}
              className="input-field w-full"
            >
              {EVENT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              Evento do Pixel a ser otimizado nesta campanha.
            </p>
          </div>
        </div>

        {/* Pixel ID */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheckIcon className="h-4 w-4 text-indigo-400" />
            <label className="text-sm font-medium text-gray-400">Meta Pixel ID</label>
            {isAutoPixel && <AutoChip label="configurações" />}
          </div>
          <input
            type="text"
            value={effectivePixel}
            onChange={e => updateForm({ pixelId: e.target.value || '' })}
            placeholder={isAutoPixel ? `${autoFields.pixelId} (da conta)` : 'Ex: 876543210987654'}
            className={cn('input-field w-full max-w-sm', !effectivePixel && 'border-amber-500/40')}
          />
          {!effectivePixel && (
            <p className="text-[11px] text-amber-400 mt-1">
              ⚠️ Sem Pixel, a campanha não rastreia conversões. Configure em Configurações → Identidade Meta.
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}

/* ===================== STEP 6 — REVISAO ===================== */

function StepReview({ form, selectedImages }: any) {
  return (
    <div className="space-y-8">
      <Section title="Resumo da Campanha">
        <div className="divide-y divide-card-border">
          <Row label="Criativos" value={`${selectedImages.length} imagem(ns) - ${form.creativeType === 'CAROUSEL' ? 'Carrossel' : 'Simples'}`} />
          <Row label="Texto" value={form.body || '(nao informado)'} />
          <Row label="CTA" value={CTA_TYPES.find(c => c.value === form.ctaType)?.label || form.ctaType} />
          {form.ctaType === 'WHATSAPP_MESSAGE' && <Row label="WhatsApp" value={form.whatsappNumber || '(nao informado)'} />}
          <Row label="Publico" value={`${form.ageMin}-${form.ageMax} anos, ${form.genders.length === 0 ? 'Todos' : form.genders.includes(1) ? 'Masculino' : 'Feminino'}`} />
          <Row label="Localizacao" value={form.locationEntries.length === 0 ? 'Brasil inteiro' : form.locationEntries.map((l: LocationEntry) => `${l.name} (${l.radius}km)`).join('; ')} />
          <Row label="Interesses" value={form.interests.length === 0 ? '(nenhum selecionado)' : form.interests.map((i: any) => i.name).join(', ')} />
          <Row label="Orcamento" value={`${formatCurrency(form.dailyBudget)} / dia (${formatCurrency(form.dailyBudget * 30)} / mes)`} />
          <Row label="Periodo" value={`${form.startTime} ${form.endTime ? `ate ${form.endTime}` : '(sem data fim)'}`} />
          <Row label="Dias" value={form.scheduleDays.map((d: number) => DAYS_OF_WEEK[d]?.label).join(', ')} />
          <Row label="Horarios" value={form.scheduleTimeSlots.map((s: any) => `${s.start}h - ${s.end}h`).join(', ')} />
          <Row label="Objetivo" value={OBJECTIVES.find(o => o.value === form.objective)?.label || form.objective} />
        </div>
      </Section>

      <div className="glass-card p-4 border-primary/20 bg-primary/5 flex items-center gap-3">
        <svg className="w-5 h-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-gray-300">
          A campanha sera criada com status <span className="text-primary-light font-medium">PAUSADA</span>. Ative manualmente apos revisar no Meta Ads Manager.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start py-3">
      <span className="text-sm font-medium text-gray-400 w-32 shrink-0">{label}</span>
      <span className="text-sm text-gray-200 text-right flex-1">{value}</span>
    </div>
  );
}


