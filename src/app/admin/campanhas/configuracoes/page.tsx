"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  getSettings, updateSettings,
  getWhatsAppConfig, updateWhatsAppConfig,
  getLlmSettings, updateLlmSettings, testLlmConnection, testWhatsAppBriefing,
  getLlmModels,
  type LlmModelOption, type LlmModelsResponse,
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
} from '@heroicons/react/24/outline';
import { UpdateGuard } from '@/components/admin/PermissionGuard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
      />
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

// ─── Componente principal ─────────────────────────────────────────────────────

export function SettingsPage() {
  const [settings, setSettings] = useState({
    metaAppId: '', metaAppSecret: '', metaToken: '', adAccountId: '',
    creativesPath: '', publicDomain: '',
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
        metaToken:     '',
        adAccountId:   s.adAccountId   || '',
        creativesPath: s.creativesPath || '',
        publicDomain:  s.publicDomain  || '',
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
    }
    finally { setSaving(false); }
  }

  const providerList = llmModels
    ? Object.entries(llmModels.providers).map(([key, val]) => ({ key, label: val.label }))
    : [{ key: 'anthropic', label: 'Anthropic' }];

  const selectCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Campanhas</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Configurações</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">Credenciais Meta, WhatsApp e Inteligência Artificial</p>
        </div>

        <div className="space-y-6">

          {/* ── Redes de Anúncios ─── */}
          <Link href="/admin/campanhas/configuracoes/redes">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-indigo-50 rounded-xl group-hover:bg-indigo-600 transition-colors">
                  <GlobeAltIcon className="h-5 w-5 text-indigo-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-gray-900">Redes de Anúncios</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Conecte Meta, Google, LinkedIn e TikTok — gerencie credenciais por rede
                  </p>
                </div>
              </div>
              <ArrowRightIcon className="h-4 w-4 text-gray-300 group-hover:text-indigo-600 transition-colors" />
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
            <Field label="Access Token" value={settings.metaToken}
              onChange={v => setSettings(s => ({ ...s, metaToken: v }))}
              placeholder="Token de longa duração" type="password"
              hint="Deixe em branco para manter o token atual" />
            <Field label="Ad Account ID" value={settings.adAccountId}
              onChange={v => setSettings(s => ({ ...s, adAccountId: v }))}
              placeholder="Ex: 10150461381441874 (sem 'act_')" />
          </SectionCard>

          {/* ── LLM ─── */}
          <SectionCard icon={CpuChipIcon} title="Inteligência Artificial (LLM)"
            description="Para briefings estratégicos e análises de campanha — alertas de CTR/CPC funcionam sem LLM">
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
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
              )}
            </div>

            {selectedModel && (
              <div className="bg-indigo-50 rounded-xl p-3 flex flex-wrap items-center gap-3">
                <Stars score={selectedModel.qualityScore} />
                {selectedModel.isFree && (
                  <Badge color="bg-emerald-100 text-emerald-700">🆓 Tier gratuito</Badge>
                )}
                {selectedModel.isRecommended && (
                  <Badge color="bg-blue-100 text-blue-700">⭐ Recomendado</Badge>
                )}
                {selectedModel.contextWindow && (
                  <Badge color="bg-violet-100 text-violet-700">
                    {selectedModel.contextWindow >= 1000000
                      ? `${(selectedModel.contextWindow / 1000000).toFixed(1)}M tokens`
                      : `${Math.round(selectedModel.contextWindow / 1000)}k tokens`}
                  </Badge>
                )}
                {selectedModel.notes && (
                  <span className="text-xs text-gray-500 w-full">{selectedModel.notes}</span>
                )}
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
                  className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50">
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
                  {llmTestResult.success
                    ? <CheckCircleIcon className="h-4 w-4" />
                    : <XCircleIcon className="h-4 w-4" />}
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={async () => {
                  setBriefingTesting(true);
                  setBriefingTestResult(null);
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
                  {briefingTestResult.includes('Erro')
                    ? <XCircleIcon className="h-4 w-4" />
                    : <CheckCircleIcon className="h-4 w-4" />}
                  {briefingTestResult}
                </span>
              )}
            </div>
          </SectionCard>

          {/* ── Geral ─── */}
          <SectionCard icon={Cog6ToothIcon} title="Geral" description="Caminhos de arquivos e domínio de tracking">
            <Field label="Pasta de Criativos" value={settings.creativesPath}
              onChange={v => setSettings(s => ({ ...s, creativesPath: v }))}
              placeholder="C:\NetImobiliária\TrafegoPago\criativos" />
            <Field label="Domínio Público (para links de tracking)" value={settings.publicDomain}
              onChange={v => setSettings(s => ({ ...s, publicDomain: v }))}
              placeholder="https://seudominio.com" />
          </SectionCard>

          {/* ── Save ─── */}
          <div className="flex items-center gap-4 pb-8">
            <UpdateGuard resource="configuracoes-campanhas">
              <button onClick={handleSave} disabled={saving}
                className="px-8 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50">
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
      </div>
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

export default SettingsPage;
