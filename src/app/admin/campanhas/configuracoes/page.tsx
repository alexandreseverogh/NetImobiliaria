"use client";
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  getSettings, updateSettings,
  getWhatsAppConfig, updateWhatsAppConfig,
  getLlmSettings, updateLlmSettings, testLlmConnection, testWhatsAppBriefing,
  getLlmModels,
  getClientCreativePaths, updateClientCreativePath,
  getMetaIdentity, updateMetaIdentity,
  type LlmModelOption, type LlmModelsResponse, type ClientWithCreativesPath,
  type MetaIdentitySettings,
} from '@/lib/marketing-api';
import {
  Cog6ToothIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  WifiIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  XMarkIcon,
  IdentificationIcon,
  PhotoIcon,
  LinkIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';
import { UpdateGuard } from '@/components/admin/PermissionGuard';

// ─── Helpers compartilhados ───────────────────────────────────────────────────

function Stars({ score }: { score: number }) {
  return (
    <span className="text-amber-400 text-sm tracking-tight">
      {'★'.repeat(score)}{'☆'.repeat(5 - score)}
    </span>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${color}`}>
      {children}
    </span>
  );
}

function Field({
  label, value, onChange, placeholder, type = 'text', hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</label>
      <div className="relative">
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-gray-50 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all pl-4",
            isPassword ? "pr-12" : "pr-4"
          )}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {show ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  );
}

function SectionCard({ icon: Icon, title, description, children }: {
  icon: React.ElementType; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-xl">
          <Icon className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-sm font-black text-gray-900">{title}</h2>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function getKeyHint(provider: string): string {
  const hints: Record<string, string> = {
    anthropic:  'Obtenha em: console.anthropic.com',
    openai:     'Obtenha em: platform.openai.com/api-keys',
    gemini:     'Obtenha em: aistudio.google.com/app/apikey',
    groq:       'Obtenha em: console.groq.com/keys',
    deepseek:   'Obtenha em: platform.deepseek.com',
    openrouter: 'Obtenha em: openrouter.ai/keys',
    kimi:       'Obtenha em: platform.moonshot.cn',
    qwen:       'Obtenha em: dashscope.aliyuncs.com (chave "DashScope")',
  };
  return hints[provider] || 'Consulte a documentação do provider para obter a API Key';
}

// ─── Seção Identidade Meta ────────────────────────────────────────────────────

function MetaIdentityField({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  hint,
  badge,
  type = 'text',
  status,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  badge?: { text: string; color: string };
  type?: string;
  status?: 'ok' | 'warn' | 'empty';
}) {
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </label>
        <div className="flex items-center gap-2">
          {badge && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${badge.color}`}>
              {badge.text}
            </span>
          )}
          {status === 'ok'   && <CheckCircleIcon   className="h-4 w-4 text-emerald-500" />}
          {status === 'warn' && <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />}
          {status === 'empty' && <div className="h-4 w-4 rounded-full border-2 border-gray-200" />}
        </div>
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:border-transparent transition-all',
          status === 'ok'
            ? 'border-emerald-200 focus:ring-emerald-500'
            : status === 'warn'
            ? 'border-amber-200 focus:ring-amber-500'
            : 'border-gray-200 focus:ring-blue-600',
        )}
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

function MetaIdentitySection() {
  const [data, setData] = useState<MetaIdentitySettings>({
    pageId: '', pixelId: '', instagramActorId: '',
    accessToken: '', appId: '', adAccountId: '',
    credentialsActive: false, lastValidated: null, tokenExpiresAt: null,
    website: '', tenantName: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getMetaIdentity()
      .then(d => { setData(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  async function handleSave() {
    setSaving(true); setSaved(false); setError('');
    try {
      await updateMetaIdentity({
        pageId:           data.pageId,
        pixelId:          data.pixelId,
        instagramActorId: data.instagramActorId,
        website:          data.website,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  function fieldStatus(val: string): 'ok' | 'empty' {
    return val.trim().length > 0 ? 'ok' : 'empty';
  }

  const pageIdOk   = data.pageId.trim().length > 0;
  const pixelOk    = data.pixelId.trim().length > 0;
  const websiteOk  = data.website.trim().length > 0;
  const completeness = [pageIdOk, pixelOk, websiteOk].filter(Boolean).length;

  if (!loaded) return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-center">
      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gold-premium" />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header com gradiente */}
      <div className="relative px-6 py-5 overflow-hidden" style={{
        background: 'linear-gradient(135deg, #1877f2 0%, #0e5fd8 40%, #6366f1 100%)',
      }}>
        {/* Padrão decorativo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-white" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white" />
        </div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <IdentificationIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Identidade Meta</h2>
              <p className="text-xs text-blue-100 mt-0.5">Page ID, Pixel, Instagram e Site</p>
            </div>
          </div>
          {/* Progress pill */}
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className={cn(
                  'h-1.5 w-5 rounded-full transition-all',
                  i < completeness ? 'bg-white' : 'bg-white/30',
                )} />
              ))}
            </div>
            <span className="text-[10px] font-black text-white">{completeness}/3</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">

        {/* Alerta se page_id não configurado */}
        {!pageIdOk && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-amber-800">Facebook Page ID obrigatório</p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Sem o Page ID os criativos não podem ser criados no Meta. O lançamento de campanhas falhará.
              </p>
            </div>
          </div>
        )}

        {/* Grade 2 colunas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <MetaIdentityField
            icon={IdentificationIcon}
            label="Facebook Page ID"
            value={data.pageId}
            onChange={v => setData(d => ({ ...d, pageId: v }))}
            placeholder="Ex: 105308234567890"
            hint="ID numérico da sua Página do Facebook. Obrigatório para criar criativos."
            badge={{ text: 'Obrigatório', color: 'bg-red-100 text-red-600' }}
            status={fieldStatus(data.pageId)}
          />

          <MetaIdentityField
            icon={ShieldCheckIcon}
            label="Meta Pixel ID"
            value={data.pixelId}
            onChange={v => setData(d => ({ ...d, pixelId: v }))}
            placeholder="Ex: 876543210987654"
            hint="Para rastreamento de conversões. Derivado automaticamente nas campanhas."
            badge={{ text: 'Conversões', color: 'bg-indigo-100 text-indigo-600' }}
            status={fieldStatus(data.pixelId)}
          />

          <MetaIdentityField
            icon={PhotoIcon}
            label="Instagram Actor ID"
            value={data.instagramActorId}
            onChange={v => setData(d => ({ ...d, instagramActorId: v }))}
            placeholder="Ex: 17841234567890"
            hint="ID da conta Instagram vinculada. Opcional — para criativos no Instagram."
            badge={{ text: 'Opcional', color: 'bg-gray-100 text-gray-500' }}
            status={data.instagramActorId ? fieldStatus(data.instagramActorId) : 'empty'}
          />

          <MetaIdentityField
            icon={LinkIcon}
            label="Website / Site da Empresa"
            value={data.website}
            onChange={v => setData(d => ({ ...d, website: v }))}
            placeholder="https://seusite.com.br"
            hint="Pré-preenche o Link da campanha no wizard. WhatsApp sempre vem do seu número de contato."
            status={fieldStatus(data.website)}
          />
        </div>

        {/* Info de credenciais existentes */}
        {(data.adAccountId || data.credentialsActive) && (
          <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-medium">Ad Account:</span>
              <code className="bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-xs font-mono text-gray-700">
                act_{data.adAccountId || '—'}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                'h-2 w-2 rounded-full',
                data.credentialsActive ? 'bg-emerald-500' : 'bg-gray-300',
              )} />
              <span className="text-[11px] text-gray-500">
                {data.credentialsActive ? 'Credenciais ativas' : 'Credenciais inativas'}
              </span>
            </div>
            {data.tokenExpiresAt && (
              <div className="text-[11px] text-gray-400">
                Token expira: {new Date(data.tokenExpiresAt).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-3 pt-1 border-t border-gray-50">
          <UpdateGuard resource="configuracoes-campanhas">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-[#1877f2] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#1464d0] active:scale-95 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Identidade Meta'}
            </button>
          </UpdateGuard>
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
              <CheckCircleIcon className="h-4 w-4" /> Salvo com sucesso
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1.5 text-xs font-black text-red-500">
              <XCircleIcon className="h-4 w-4" /> {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── View MASTER — página completa ───────────────────────────────────────────

function MasterSettingsView() {
  const [settings, setSettings] = useState({
    metaAppId: '', metaAppSecret: '', metaToken: '', adAccountId: '',
    creativesPath: '', publicDomain: '',
    anthropicApiKey: '',
    slackWebhookUrl: '',
    evolutionApiUrl: '',
    evolutionApiKey: '',
    evolutionInstance: '',
    agentConfidenceThreshold: 0.85,
  });
  const [whatsapp, setWhatsapp] = useState({
    phoneNumber: '', defaultMessage: '', businessName: '',
  });

  const [llmProvider,   setLlmProvider]   = useState('anthropic');
  const [llmModel,      setLlmModel]       = useState('claude-sonnet-4-5');
  const [llmApiKey,     setLlmApiKey]      = useState('');
  const [llmApiKeySet,  setLlmApiKeySet]   = useState(false);
  const [llmModels,     setLlmModels]      = useState<LlmModelsResponse | null>(null);
  const [llmSaving,     setLlmSaving]      = useState(false);
  const [llmSaved,      setLlmSaved]       = useState(false);
  const [llmTesting,    setLlmTesting]     = useState(false);
  const [llmTestResult, setLlmTestResult]  = useState<{ success: boolean; message: string } | null>(null);

  const [briefingTesting,    setBriefingTesting]    = useState(false);
  const [briefingTestResult, setBriefingTestResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const providerModels: LlmModelOption[] = llmModels?.providers[llmProvider]?.models || [];
  const selectedModel = providerModels.find(m => m.modelId === llmModel);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [s, w, l, m] = await Promise.all([
        getSettings(), getWhatsAppConfig(), getLlmSettings(), getLlmModels(),
      ]);
      setSettings({
        metaAppId:     s.metaAppId     || '',
        metaAppSecret: s.metaAppSecret || '',
        metaToken:     s.metaToken     || '',
        adAccountId:   s.adAccountId   || '',
        creativesPath: s.creativesPath || '',
        publicDomain:  s.publicDomain  || '',
        anthropicApiKey: s.anthropicApiKey || '',
        slackWebhookUrl: s.slackWebhookUrl || '',
        evolutionApiUrl: s.evolutionApiUrl || '',
        evolutionApiKey: s.evolutionApiKey || '',
        evolutionInstance: s.evolutionInstance || '',
        agentConfidenceThreshold: s.agentConfidenceThreshold !== undefined ? s.agentConfidenceThreshold : 0.85,
      });
      setWhatsapp({
        phoneNumber:    w.phoneNumber    || '',
        defaultMessage: w.defaultMessage || '',
        businessName:   w.businessName   || '',
      });
      setLlmProvider(l.llmProvider || 'anthropic');
      setLlmModel(l.llmModel       || 'claude-sonnet-4-5');
      setLlmApiKeySet(l.llmApiKeySet);
      setLlmModels(m);
    } catch { /* primeiro carregamento pode falhar */ }
  }

  function handleProviderChange(p: string) {
    setLlmProvider(p);
    const provModels = llmModels?.providers[p]?.models || [];
    const recommended = provModels.find(m => m.isRecommended) || provModels[0];
    if (recommended) setLlmModel(recommended.modelId);
    setLlmTestResult(null);
  }

  async function handleSaveLlm() {
    setLlmSaving(true);
    try {
      const payload: any = { llmProvider, llmModel };
      if (llmApiKey) payload.llmApiKey = llmApiKey;
      await updateLlmSettings(payload);
      setLlmSaved(true);
      setLlmApiKeySet(!!llmApiKey || llmApiKeySet);
      setLlmApiKey('');
      setTimeout(() => setLlmSaved(false), 3000);
    } catch { alert('Erro ao salvar configuração LLM'); }
    finally { setLlmSaving(false); }
  }

  async function handleTestLlm() {
    setLlmTesting(true);
    setLlmTestResult(null);
    try {
      const r = await testLlmConnection();
      setLlmTestResult({
        success: r.success,
        message: r.success
          ? `Conectado — ${r.provider} / ${r.model}`
          : (r.error || 'Falha na conexão'),
      });
    } catch {
      setLlmTestResult({ success: false, message: 'Erro de conexão' });
    } finally { setLlmTesting(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all([updateSettings(settings), updateWhatsAppConfig(whatsapp)]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      const detail = err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Erro desconhecido';
      alert(`Erro ao salvar configurações:\n${detail}`);
    } finally { setSaving(false); }
  }

  const providerList = llmModels
    ? Object.entries(llmModels.providers).map(([key, val]: [string, any]) => ({ key, label: val.label }))
    : [{ key: 'anthropic', label: 'Anthropic' }];

  const selectCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all";

  return (
    <div className="space-y-6">

      {/* ── Redes de Anúncios ─── */}
      <Link href="/admin/campanhas/configuracoes/redes">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between hover:border-gold-premium/40 hover:shadow-md transition-colors cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gold-premium/10 rounded-xl group-hover:bg-gold-premium transition-colors">
              <GlobeAltIcon className="h-5 w-5 text-gold-premium group-hover:text-navy-dark transition-colors" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900">Redes de Anúncios</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {/* LinkedIn removido do texto — oculto da UI por enquanto, ver route.ts de /configuracoes/redes */}
                Conecte Meta, Google e TikTok — gerencie credenciais por rede
              </p>
            </div>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-gray-300 group-hover:text-gold-premium transition-colors" />
        </div>
      </Link>

      {/* ── Meta API ─── */}
      <SectionCard icon={Cog6ToothIcon} title="Meta Marketing API" description="App ID, credenciais e conta de anúncios">
        <Field label="App ID" value={settings.metaAppId}
          onChange={v => setSettings(s => ({ ...s, metaAppId: v }))}
          placeholder="Ex: 972196948862111" />
        <Field label="App Secret" value={settings.metaAppSecret}
          onChange={v => setSettings(s => ({ ...s, metaAppSecret: v }))}
          placeholder="abc123def456..." type="password" />
        <Field label="Access Token (Token do administrador)" value={settings.metaToken}
          onChange={v => setSettings(s => ({ ...s, metaToken: v }))}
          placeholder="Token de longa duração" type="password"
          hint="Deixe em branco para manter o token atual" />
        <Field label="Ad Account ID" value={settings.adAccountId}
          onChange={v => setSettings(s => ({ ...s, adAccountId: v }))}
          placeholder="Ex: 10150461381441874 (sem 'act_')" />
      </SectionCard>

      {/* ── Identidade Meta — Page ID, Pixel, Instagram, Website ─── */}
      <MetaIdentitySection />

      {/* ── LLM ─── */}
      <SectionCard icon={CpuChipIcon} title="Inteligência Artificial (LLM)"
        description="Para briefings estratégicos e análises de campanha">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Provider</label>
          <select value={llmProvider} onChange={e => handleProviderChange(e.target.value)} className={selectCls}>
            {providerList.map(p => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Modelo</label>
          {providerModels.length > 0 ? (
            <select value={llmModel} onChange={e => setLlmModel(e.target.value)} className={selectCls}>
              {providerModels.map(m => (
                <option key={m.modelId} value={m.modelId}>
                  {m.modelLabel}{m.isRecommended ? ' ⭐' : ''}{m.isFree ? ' 🆓' : ''}
                </option>
              ))}
            </select>
          ) : (
            <input type="text" value={llmModel} onChange={e => setLlmModel(e.target.value)}
              placeholder="ID do modelo"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all" />
          )}
        </div>

        {selectedModel && (
          <div className="bg-indigo-50 rounded-xl p-3 flex flex-wrap items-center gap-3">
            <Stars score={selectedModel.qualityScore} />
            {selectedModel.isFree && <Badge color="bg-emerald-100 text-emerald-700">🆓 Tier gratuito</Badge>}
            {selectedModel.isRecommended && <Badge color="bg-blue-100 text-blue-700">⭐ Recomendado</Badge>}
            {selectedModel.contextWindow && (
              <Badge color="bg-violet-100 text-violet-700">
                {selectedModel.contextWindow >= 1000000
                  ? `${(selectedModel.contextWindow / 1000000).toFixed(1)}M tokens`
                  : `${Math.round(selectedModel.contextWindow / 1000)}k tokens`}
              </Badge>
            )}
            {selectedModel.notes && <span className="text-xs text-gray-500 w-full">{selectedModel.notes}</span>}
          </div>
        )}

        <Field
          label={llmApiKeySet ? 'API Key (já configurada — deixe vazio para manter)' : 'API Key'}
          value={llmApiKey}
          onChange={setLlmApiKey}
          placeholder={llmApiKeySet ? '••••••••' : 'Cole sua API Key aqui'}
          type="password"
          hint={getKeyHint(llmProvider)}
        />

        <div className="flex items-center gap-3 flex-wrap pt-1">
          <UpdateGuard resource="configuracoes-campanhas">
            <button onClick={handleSaveLlm} disabled={llmSaving}
              className="px-5 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gold transition-colors disabled:opacity-50">
              {llmSaving ? 'Salvando...' : 'Salvar IA'}
            </button>
          </UpdateGuard>
          <button onClick={handleTestLlm} disabled={llmTesting}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50">
            <span className="flex items-center gap-2">
              <WifiIcon className="h-3.5 w-3.5" />
              {llmTesting ? 'Testando...' : 'Testar Conexão'}
            </span>
          </button>
          {llmSaved && (
            <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
              <CheckCircleIcon className="h-4 w-4" /> Salvo
            </span>
          )}
          {llmTestResult && (
            <span className={`flex items-center gap-1.5 text-xs font-black ${llmTestResult.success ? 'text-emerald-600' : 'text-red-500'}`}>
              {llmTestResult.success ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
              {llmTestResult.message}
            </span>
          )}
        </div>
      </SectionCard>

      {/* ── WhatsApp ─── */}
      <SectionCard icon={ChatBubbleLeftRightIcon} title="WhatsApp"
        description="Número de destino dos leads e configuração de briefing">
        <Field label="Número (DDI+DDD+Número)" value={whatsapp.phoneNumber}
          onChange={v => setWhatsapp(w => ({ ...w, phoneNumber: v }))}
          placeholder="5511999999999"
          hint="Para onde os leads serão direcionados ao clicar no anúncio" />
        <Field label="Nome do Negócio" value={whatsapp.businessName}
          onChange={v => setWhatsapp(w => ({ ...w, businessName: v }))}
          placeholder="Net Imobiliária" />
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Mensagem Padrão</label>
          <textarea
            value={whatsapp.defaultMessage}
            onChange={e => setWhatsapp(w => ({ ...w, defaultMessage: e.target.value }))}
            placeholder="Olá! Vi o anúncio e quero saber mais sobre o imóvel..."
            rows={3}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all resize-none"
          />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={async () => {
              setBriefingTesting(true); setBriefingTestResult(null);
              try {
                await testWhatsAppBriefing();
                setBriefingTestResult('Briefing enviado!');
              } catch { setBriefingTestResult('Erro ao enviar briefing de teste'); }
              finally { setBriefingTesting(false); }
            }}
            disabled={briefingTesting}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50"
          >
            {briefingTesting ? 'Enviando...' : 'Testar Briefing'}
          </button>
          {briefingTestResult && (
            <span className={`flex items-center gap-1.5 text-xs font-black ${briefingTestResult.includes('Erro') ? 'text-red-500' : 'text-emerald-600'}`}>
              {briefingTestResult.includes('Erro') ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
              {briefingTestResult}
            </span>
          )}
        </div>
      </SectionCard>

      {/* ── Geral ─── */}
      <SectionCard icon={Cog6ToothIcon} title="Geral" description="Pasta de criativos e domínio de tracking da plataforma">
        <Field label="Pasta de Criativos (Master)" value={settings.creativesPath}
          onChange={v => setSettings(s => ({ ...s, creativesPath: v }))}
          placeholder="C:\NetImobiliária\TrafegoPago\criativos" />
        <Field label="Domínio Público (para links de tracking)" value={settings.publicDomain}
          onChange={v => setSettings(s => ({ ...s, publicDomain: v }))}
          placeholder="https://seudominio.com" />
      </SectionCard>

      {/* ── Configurações de Comunicação e Agentes (Slack, Evolution, IA) ─── */}
      <SectionCard icon={Cog6ToothIcon} title="Configurações de Comunicação e Agentes" description="WhatsApp, Slack, IA e Threshold do Agente">
        <Field label="Slack Webhook URL" value={settings.slackWebhookUrl}
          onChange={v => setSettings(s => ({ ...s, slackWebhookUrl: v }))}
          placeholder="https://hooks.slack.com/services/..." />
        <Field label="Evolution API URL" value={settings.evolutionApiUrl}
          onChange={v => setSettings(s => ({ ...s, evolutionApiUrl: v }))}
          placeholder="http://localhost:8080" />
        <Field label="Evolution API Key" value={settings.evolutionApiKey}
          onChange={v => setSettings(s => ({ ...s, evolutionApiKey: v }))}
          placeholder="Chave da API Evolution" type="password" />
        <Field label="Evolution Instance" value={settings.evolutionInstance}
          onChange={v => setSettings(s => ({ ...s, evolutionInstance: v }))}
          placeholder="Nome da Instância" />
        <Field label="Anthropic API Key (IA do Tenant)" value={settings.anthropicApiKey}
          onChange={v => setSettings(s => ({ ...s, anthropicApiKey: v }))}
          placeholder="Cole a chave Anthropic do Tenant" type="password" />
        <Field label="Threshold de Confiança do Agente" value={settings.agentConfidenceThreshold.toString()}
          onChange={v => setSettings(s => ({ ...s, agentConfidenceThreshold: parseFloat(v) || 0 }))}
          placeholder="0.85" type="number" hint="Confiança mínima para execução/notificação automática do Agente Decisor" />
      </SectionCard>

      {/* ── Save ─── */}
      <div className="flex items-center gap-4 pb-8">
        <UpdateGuard resource="configuracoes-campanhas">
          <button onClick={handleSave} disabled={saving}
            className="px-8 py-3 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gold transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </UpdateGuard>
        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
            <CheckCircleIcon className="h-4 w-4" /> Salvo com sucesso
          </span>
        )}
      </div>

    </div>
  );
}

// ─── View Tenant — Pasta de Criativos (Minha Empresa ou por Cliente) ──────────

function TenantSettingsView() {
  // Toggle modo
  const [importMode, setImportMode] = useState<'own' | 'client'>('own');

  // ── "Minha Empresa" ──────────────────────────────────────────────────────────
  const [ownPath,    setOwnPath]    = useState('');
  const [ownSaving,  setOwnSaving]  = useState(false);
  const [ownSaved,   setOwnSaved]   = useState(false);
  const [ownError,   setOwnError]   = useState('');

  // ── "Cliente" ────────────────────────────────────────────────────────────────
  const [clients, setClients]               = useState<ClientWithCreativesPath[]>([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientWithCreativesPath | null>(null);
  const [editingPath, setEditingPath]       = useState('');
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [saveError, setSaveError]           = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState({
    anthropicApiKey: '',
    slackWebhookUrl: '',
    evolutionApiUrl: '',
    evolutionApiKey: '',
    evolutionInstance: '',
    agentConfidenceThreshold: 0.85,
    metaAppId: '',
    metaAppSecret: '',
    metaToken: '',
    adAccountId: '',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    Promise.all([
      getSettings(),
      getClientCreativePaths(),
    ]).then(([s, d]) => {
      setOwnPath(s.creativesPath || '');
      setClients(d.clients || []);
      setSettings({
        anthropicApiKey: s.anthropicApiKey || '',
        slackWebhookUrl: s.slackWebhookUrl || '',
        evolutionApiUrl: s.evolutionApiUrl || '',
        evolutionApiKey: s.evolutionApiKey || '',
        evolutionInstance: s.evolutionInstance || '',
        agentConfidenceThreshold: s.agentConfidenceThreshold !== undefined ? s.agentConfidenceThreshold : 0.85,
        metaAppId: s.metaAppId || '',
        metaAppSecret: s.metaAppSecret || '',
        metaToken: s.metaToken || '',
        adAccountId: s.adAccountId || '',
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleSaveSettings() {
    setSettingsSaving(true);
    setSettingsSaved(false);
    setSettingsError('');
    try {
      const payload: any = {
        anthropicApiKey: settings.anthropicApiKey,
        slackWebhookUrl: settings.slackWebhookUrl,
        evolutionApiUrl: settings.evolutionApiUrl,
        evolutionApiKey: settings.evolutionApiKey,
        evolutionInstance: settings.evolutionInstance,
        agentConfidenceThreshold: settings.agentConfidenceThreshold,
        metaAppId: settings.metaAppId,
        metaAppSecret: settings.metaAppSecret,
        adAccountId: settings.adAccountId,
      };
      if (settings.metaToken) {
        payload.metaToken = settings.metaToken;
      }
      await updateSettings(payload);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err: any) {
      setSettingsError(err?.response?.data?.error || err?.message || 'Erro ao salvar');
    } finally { setSettingsSaving(false); }
  }

  // ── Minha Empresa: salvar ────────────────────────────────────────────────────
  async function handleSaveOwn() {
    setOwnSaving(true);
    setOwnSaved(false);
    setOwnError('');
    try {
      await updateSettings({ creativesPath: ownPath });
      setOwnSaved(true);
      setTimeout(() => setOwnSaved(false), 3000);
    } catch (err: any) {
      setOwnError(err?.response?.data?.error || err?.message || 'Erro ao salvar');
    } finally { setOwnSaving(false); }
  }

  // ── Cliente: filtrar ─────────────────────────────────────────────────────────
  const filtered = search.length >= 3
    ? clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  function handleSelect(client: ClientWithCreativesPath) {
    setSelectedClient(client);
    setEditingPath(client.creativesPath || '');
    setSaved(false);
    setSaveError('');
  }

  // ── Cliente: salvar ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!selectedClient) return;
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      await updateClientCreativePath(selectedClient.id, editingPath);
      const updated = { ...selectedClient, creativesPath: editingPath };
      setClients(prev => prev.map(c => c.id === selectedClient.id ? updated : c));
      setSelectedClient(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || err?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  }

  function initials(name: string) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-premium" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Toggle Minha Empresa / Cliente ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
          Configurar pasta de criativos
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setImportMode('own')}
            className={cn(
              'flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-black transition-colors border',
              importMode === 'own'
                ? 'bg-gold-premium text-navy-dark border-gold-premium'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900'
            )}
          >
            <BuildingOfficeIcon className="h-4 w-4" />
            Minha Empresa
          </button>
          <button
            onClick={() => { setImportMode('client'); setSelectedClient(null); setSearch(''); }}
            className={cn(
              'flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-black transition-colors border',
              importMode === 'client'
                ? 'bg-gold-premium text-navy-dark border-gold-premium'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900'
            )}
          >
            <UserCircleIcon className="h-4 w-4" />
            Cliente
          </button>
        </div>
      </div>

      {/* ── Minha Empresa: campo único ── */}
      {importMode === 'own' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <BuildingOfficeIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900">Minha Empresa</h2>
              <p className="text-xs text-gray-400 mt-0.5">Pasta local de criativos da sua empresa</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <FolderOpenIcon className="h-3.5 w-3.5" />
                Pasta de Criativos
              </label>
              <input
                type="text"
                value={ownPath}
                onChange={e => { setOwnPath(e.target.value); setOwnSaved(false); setOwnError(''); }}
                placeholder="Ex: C:\Criativos\MinhaEmpresa"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
              <p className="text-[10px] text-gray-400 mt-1.5">
                Anotação do caminho local na sua máquina — usado como referência ao abrir a pasta na página de Criativos.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <UpdateGuard resource="configuracoes-campanhas">
                <button
                  onClick={handleSaveOwn}
                  disabled={ownSaving}
                  className="px-6 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gold transition-colors disabled:opacity-50"
                >
                  {ownSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </UpdateGuard>
              {ownSaved && (
                <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
                  <CheckCircleIcon className="h-4 w-4" /> Salvo
                </span>
              )}
              {ownError && (
                <span className="flex items-center gap-1.5 text-xs font-black text-red-500">
                  <XCircleIcon className="h-4 w-4" /> {ownError}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cliente: grid dois colunas ── */}
      {importMode === 'client' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Coluna esquerda: lista */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <UserCircleIcon className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900">Clientes</h2>
                <p className="text-xs text-gray-400 mt-0.5">{clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Busca */}
            <div className="px-4 py-3 border-b border-gray-50">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou e-mail..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                {search && (
                  <button onClick={() => { setSearch(''); searchRef.current?.focus(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              {search.length > 0 && search.length < 3 && (
                <p className="text-[10px] text-gray-400 mt-1.5 px-1">
                  Digite ao menos 3 letras para filtrar
                </p>
              )}
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1" style={{ maxHeight: '420px' }}>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <UserCircleIcon className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-xs font-black uppercase tracking-widest">
                    {search.length >= 3 ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                  </p>
                </div>
              ) : (
                filtered.map(client => {
                  const isSelected = selectedClient?.id === client.id;
                  const hasPath    = !!client.creativesPath;
                  return (
                    <button
                      key={client.id}
                      onClick={() => handleSelect(client)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-gray-50 last:border-0 ${
                        isSelected
                          ? 'bg-amber-50/80'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                        isSelected ? 'bg-gold-premium text-navy-dark' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {initials(client.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate text-gray-900">
                          {client.name}
                        </p>
                        {client.email && (
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{client.email}</p>
                        )}
                      </div>
                      {hasPath && (
                        <span className="shrink-0">
                          <FolderOpenIcon className="h-4 w-4 text-emerald-500" title="Pasta configurada" />
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Coluna direita: editar pasta */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            {!selectedClient ? (
              <div className="flex flex-col items-center justify-center flex-1 py-24 text-gray-400 px-8">
                <FolderOpenIcon className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-xs font-black uppercase tracking-widest text-center">
                  Selecione um cliente para configurar a pasta de criativos
                </p>
              </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gold-premium flex items-center justify-center text-xs font-black text-navy-dark shrink-0">
                    {initials(selectedClient.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-black text-gray-900 truncate">{selectedClient.name}</h2>
                    {selectedClient.email && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{selectedClient.email}</p>
                    )}
                  </div>
                </div>
                <div className="p-6 space-y-4 flex-1">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <FolderOpenIcon className="h-3.5 w-3.5" />
                      Pasta de Criativos
                    </label>
                    <input
                      type="text"
                      value={editingPath}
                      onChange={e => { setEditingPath(e.target.value); setSaved(false); setSaveError(''); }}
                      placeholder="Ex: C:\Criativos\NomeDoCliente"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                    <p className="text-[10px] text-gray-400 mt-1.5">
                      Anotação do caminho local na sua máquina — usado como referência ao preparar os criativos para a campanha.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <UpdateGuard resource="configuracoes-campanhas">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gold transition-colors disabled:opacity-50"
                      >
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                    </UpdateGuard>
                    {saved && (
                      <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
                        <CheckCircleIcon className="h-4 w-4" /> Salvo
                      </span>
                    )}
                    {saveError && (
                      <span className="flex items-center gap-1.5 text-xs font-black text-red-500">
                        <XCircleIcon className="h-4 w-4" /> {saveError}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Meta Marketing API (Credenciais do Tenant) ── */}
      <SectionCard icon={Cog6ToothIcon} title="Meta Marketing API" description="App ID, credenciais e conta de anúncios da sua empresa">
        <Field label="App ID" value={settings.metaAppId}
          onChange={v => setSettings(s => ({ ...s, metaAppId: v }))}
          placeholder="Ex: 972196948862111" />
        <Field label="App Secret" value={settings.metaAppSecret}
          onChange={v => setSettings(s => ({ ...s, metaAppSecret: v }))}
          placeholder="abc123def456..." type="password" />
        <Field label="Access Token (Token do administrador)" value={settings.metaToken}
          onChange={v => setSettings(s => ({ ...s, metaToken: v }))}
          placeholder="Token de longa duração" type="password"
          hint="Deixe em branco para manter o token atual" />
        <Field label="Ad Account ID" value={settings.adAccountId}
          onChange={v => setSettings(s => ({ ...s, adAccountId: v }))}
          placeholder="Ex: 10150461381441874 (sem 'act_')" />
      </SectionCard>

      {/* ── Identidade Meta ── */}
      <MetaIdentitySection />

      {/* ── Comunicação e Inteligência ── */}
      <SectionCard icon={Cog6ToothIcon} title="Agentes, Alertas e IA" description="Configurações de notificações do WhatsApp, Slack e chaves de IA do Tenant">
        <Field label="Slack Webhook URL" value={settings.slackWebhookUrl}
          onChange={v => setSettings(s => ({ ...s, slackWebhookUrl: v }))}
          placeholder="https://hooks.slack.com/services/..." />
        <Field label="Evolution API URL" value={settings.evolutionApiUrl}
          onChange={v => setSettings(s => ({ ...s, evolutionApiUrl: v }))}
          placeholder="http://localhost:8080" />
        <Field label="Evolution API Key" value={settings.evolutionApiKey}
          onChange={v => setSettings(s => ({ ...s, evolutionApiKey: v }))}
          placeholder="Chave da API Evolution" type="password" />
        <Field label="Evolution Instance" value={settings.evolutionInstance}
          onChange={v => setSettings(s => ({ ...s, evolutionInstance: v }))}
          placeholder="Nome da Instância" />
        <Field label="Anthropic API Key (IA do Tenant)" value={settings.anthropicApiKey}
          onChange={v => setSettings(s => ({ ...s, anthropicApiKey: v }))}
          placeholder="Chave Anthropic do Tenant" type="password" />
        <Field label="Threshold de Confiança do Agente" value={settings.agentConfidenceThreshold.toString()}
          onChange={v => setSettings(s => ({ ...s, agentConfidenceThreshold: parseFloat(v) || 0 }))}
          placeholder="0.85" type="number" hint="Confiança mínima para execução/notificação automática do Agente Decisor" />
        
        <div className="flex items-center gap-3 pt-2">
          <UpdateGuard resource="configuracoes-campanhas">
            <button
              onClick={handleSaveSettings}
              disabled={settingsSaving}
              className="px-6 py-2.5 bg-gold-premium text-navy-dark text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gold transition-colors disabled:opacity-50"
            >
              {settingsSaving ? 'Salvando...' : 'Salvar Configurações adicionais'}
            </button>
          </UpdateGuard>
          {settingsSaved && (
            <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
              <CheckCircleIcon className="h-4 w-4" /> Salvo com sucesso
            </span>
          )}
          {settingsError && (
            <span className="flex items-center gap-1.5 text-xs font-black text-red-500">
              <XCircleIcon className="h-4 w-4" /> {settingsError}
            </span>
          )}
        </div>
      </SectionCard>

    </div>
  );
}

// ─── Componente raiz — detecta MASTER vs Tenant ───────────────────────────────

export function SettingsPage() { // mantido para imports legados
  return <SettingsPageInner />;
}

function SettingsPageInner() {
  const [isMaster, setIsMaster] = useState<boolean | null>(null);

  useEffect(() => {
    getSettings()
      .then((data: any) => setIsMaster(!!data.isMaster))
      .catch(() => setIsMaster(false));
  }, []);

  const header = (
    <div className="mb-8">
      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Campanhas</p>
      <h1 className="text-3xl font-black text-gray-900 tracking-tight">Configurações</h1>
      <p className="text-gray-500 mt-1 text-sm font-medium">
        {isMaster === true
          ? 'Credenciais Meta, WhatsApp, Inteligência Artificial e Geral'
          : 'Pasta de Criativos — Minha Empresa ou por Cliente'}
      </p>
    </div>
  );

  if (isMaster === null) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto">
          {header}
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-premium" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className={`mx-auto ${isMaster ? 'max-w-3xl' : 'max-w-5xl'}`}>
        {header}
        {isMaster ? <MasterSettingsView /> : <TenantSettingsView />}
      </div>
    </div>
  );
}

export default SettingsPageInner;
