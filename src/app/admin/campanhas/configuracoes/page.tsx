"use client";
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  getSettings, updateSettings,
  getWhatsAppConfig, updateWhatsAppConfig,
  getLlmSettings, updateLlmSettings, testLlmConnection, testWhatsAppBriefing,
  getLlmModels,
  getClientCreativePaths, updateClientCreativePath,
  type LlmModelOption, type LlmModelsResponse, type ClientWithCreativesPath,
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
  XMarkIcon,
} from '@heroicons/react/24/outline';
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

// ─── View MASTER — página completa ───────────────────────────────────────────

function MasterSettingsView() {
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
    } finally { setSaving(false); }
  }

  const providerList = llmModels
    ? Object.entries(llmModels.providers).map(([key, val]) => ({ key, label: val.label }))
    : [{ key: 'anthropic', label: 'Anthropic' }];

  const selectCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";

  return (
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
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
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
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
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
  );
}

// ─── View Tenant — apenas Pasta de Criativos por cliente ─────────────────────

function TenantSettingsView() {
  const [clients, setClients]               = useState<ClientWithCreativesPath[]>([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientWithCreativesPath | null>(null);
  const [editingPath, setEditingPath]       = useState('');
  const [saving, setSaving]                 = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [saveError, setSaveError]           = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getClientCreativePaths()
      .then(data => setClients(data.clients || []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  }, []);

  // Filtra a partir de 3 caracteres; sem filtro mostra todos
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

  function handleClearSearch() {
    setSearch('');
    searchRef.current?.focus();
  }

  async function handleSave() {
    if (!selectedClient) return;
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      await updateClientCreativePath(selectedClient.id, editingPath);
      // Atualiza lista local
      const updated = { ...selectedClient, creativesPath: editingPath };
      setClients(prev => prev.map(c => c.id === selectedClient.id ? updated : c));
      setSelectedClient(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err?.response?.data?.error || err?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  // Inicial do nome para o avatar
  function initials(name: string) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Coluna esquerda: lista de clientes ── */}
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-9 py-2.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              {search && (
                <button onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-gray-50 last:border-0 ${
                      isSelected
                        ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {initials(client.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black truncate ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>
                        {client.name}
                      </p>
                      {client.email && (
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{client.email}</p>
                      )}
                    </div>

                    {/* Badge pasta configurada */}
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

        {/* ── Coluna direita: editar pasta ── */}
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
                <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-black text-white shrink-0">
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                      className="px-6 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
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
          : 'Pasta de Criativos por Cliente'}
      </p>
    </div>
  );

  if (isMaster === null) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto">
          {header}
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600" />
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
