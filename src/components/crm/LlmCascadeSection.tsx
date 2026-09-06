'use client'

/**
 * Modelo de LLM em cascata (docs/CHECKPOINT.md, 2026-08-28) — Cliente → Tenant → Segmento
 * (curado pelo Master) → Global (Master). Só CRM/Mensageria consomem essa cascata
 * (getLlmClient) — Campanhas de Marketing Digital usa getLlmClientForCampaigns, sempre
 * global, nunca lê esta tabela por clientId (decisão ratificada em 2026-08-28).
 *
 * Extraído de dentro de /admin/campanhas/configuracoes (2026-09-01) — achado real de teste:
 * mesmo servindo só CRM/Mensageria, a tela só existia atrás do gate de Campanhas, tornando-a
 * inalcançável pra um tenant que só contratou CRM ou só Mensageria (nunca contrataram
 * Campanhas, então nunca têm a feature/rota que levava até ela). Vive em `components/crm/`
 * pelo mesmo motivo de `PromptOverrideCard.tsx` (o irmão desta cascata — mesmo padrão, só que
 * pro TEXTO do prompt em vez do MODELO): CRM é a origem/dona natural da cascata cliente→tenant
 * neste código, e Mensageria reaproveita o componente daqui sem problema, mesmo padrão já
 * aceito nesta base pro PromptOverrideCard.
 *
 * Sem `UpdateGuard`/`PermissionGuard` de propósito — nem `/crm/config/ia` nem
 * `/mensageria/config` usam gate client-side fino nos próprios botões de salvar; a
 * reachability da PÁGINA (sidebar + feature) já é o controle de acesso real. O servidor
 * (`/api/admin/campanhas/settings/llm`) aceita qualquer um de {crm-settings,
 * mensageria-config, configuracoes-campanhas} — quem quer que tenha chegado até aqui via
 * alguma dessas 3 páginas já provou que tem o módulo certo provisionado.
 */

import { useState, useEffect, useRef } from 'react'
import {
  getLlmSettings, updateLlmSettings, deleteLlmSettings, testLlmConnection, getLlmModels,
  type LlmModelOption, type LlmModelsResponse,
} from '@/lib/marketing-api'
import { CpuChipIcon, WifiIcon, CheckCircleIcon, XCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import ClientSelector, { useClientSelector } from '@/components/crm/ClientSelector'

interface Props {
  /** Tema leve — mesmo padrão { isDark, textPrimary, textMuted, inputBg, ... } de useTheme(), já usado por PromptOverrideCard. */
  t: any
  /** Chave própria de sessionStorage pro ClientSelector — cada host (CRM/Mensageria) precisa da sua, senão o escopo de edição vaza entre as duas telas. */
  storageKey: string
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

export function LlmCascadeSection({ t, storageKey }: Props) {
  const [llmProvider,   setLlmProvider]   = useState('anthropic');
  const [llmModel,      setLlmModel]       = useState('claude-sonnet-4-5');
  const [llmApiKey,     setLlmApiKey]      = useState('');
  const [llmApiKeySet,  setLlmApiKeySet]   = useState(false);
  const [llmModels,     setLlmModels]      = useState<LlmModelsResponse | null>(null);
  const [llmSaving,     setLlmSaving]      = useState(false);
  const [llmSaved,      setLlmSaved]       = useState(false);
  const [llmTesting,    setLlmTesting]     = useState(false);
  const [llmTestResult, setLlmTestResult]  = useState<{ success: boolean; message: string } | null>(null);
  const [llmLoading,    setLlmLoading]     = useState(false);
  const [llmHasOverride, setLlmHasOverride] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector(storageKey);
  const scopeClientId = clientFilter === 'own' || clientFilter === 'segment' ? null : clientFilter;

  const providerModels: LlmModelOption[] = llmModels?.providers[llmProvider]?.models || [];
  const selectedModel = providerModels.find(m => m.modelId === llmModel);

  useEffect(() => {
    Promise.all([getLlmSettings(), getLlmModels()]).then(([l, m]) => {
      setLlmProvider(l.llmProvider || 'anthropic');
      setLlmModel(l.llmModel       || 'claude-sonnet-4-5');
      setLlmApiKeySet(l.llmApiKeySet);
      setLlmHasOverride(!!(l.llmProvider || l.llmModel || l.llmApiKeySet));
      setLlmModels(m);
    }).catch(() => { /* primeiro carregamento pode falhar */ });
  }, []);

  // Recarrega quando o escopo (tenant vs. cliente) muda — pulado no 1º render, já coberto
  // pelo efeito de mount acima (que sempre carrega o escopo 'own').
  const skippedFirstRun = useRef(false);
  async function loadForScope(clientId: string | null) {
    setLlmLoading(true);
    setLlmTestResult(null);
    try {
      const l = await getLlmSettings(clientId);
      // Sem override no nível do cliente, os 3 campos vêm null (rota já sinaliza isso) — não
      // finge um valor herdado aqui, deixa a UI mostrar honestamente "sem override próprio".
      setLlmProvider(l.llmProvider || (clientId ? '' : 'anthropic'));
      setLlmModel(l.llmModel || (clientId ? '' : 'claude-sonnet-4-5'));
      setLlmApiKeySet(l.llmApiKeySet);
      setLlmHasOverride(!!(l.llmProvider || l.llmModel || l.llmApiKeySet));
      setLlmApiKey('');
    } catch { /* mantém o estado anterior visível em vez de zerar tudo */ }
    finally { setLlmLoading(false); }
  }
  useEffect(() => {
    if (!skippedFirstRun.current) { skippedFirstRun.current = true; return; }
    loadForScope(scopeClientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeClientId]);

  function handleProviderChange(p: string) {
    setLlmProvider(p);
    const provModels = llmModels?.providers[p]?.models || [];
    const recommended = provModels.find(m => m.isRecommended) || provModels[0];
    if (recommended) setLlmModel(recommended.modelId);
    setLlmTestResult(null);
  }

  async function handleSave() {
    setLlmSaving(true);
    try {
      const payload: any = { llmProvider, llmModel, clientId: scopeClientId };
      if (llmApiKey) payload.llmApiKey = llmApiKey;
      await updateLlmSettings(payload);
      setLlmSaved(true);
      setLlmApiKeySet(!!llmApiKey || llmApiKeySet);
      setLlmHasOverride(true);
      setLlmApiKey('');
      setTimeout(() => setLlmSaved(false), 3000);
    } catch { alert('Erro ao salvar configuração LLM'); }
    finally { setLlmSaving(false); }
  }

  async function handleRestore() {
    if (!scopeClientId) return;
    if (!confirm('Restaurar a herança da cascata pra este cliente, apagando o modelo próprio dele?')) return;
    setLlmSaving(true);
    try {
      await deleteLlmSettings(scopeClientId);
      await loadForScope(scopeClientId);
    } catch { alert('Erro ao restaurar configuração LLM'); }
    finally { setLlmSaving(false); }
  }

  async function handleTest() {
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

  const providerList = llmModels
    ? Object.entries(llmModels.providers).map(([key, val]: [string, any]) => ({ key, label: val.label }))
    : [{ key: 'anthropic', label: 'Anthropic' }];

  const selectCls = `w-full rounded-2xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all ${t.isDark ? t.inputBg : 'bg-white text-gray-900 border border-gray-200'}`;

  return (
    <div className={`${t.isDark ? 'bg-blue-600/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'} border p-6 rounded-3xl space-y-4`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className={`text-base font-black italic tracking-tighter uppercase flex items-center ${t.textPrimary}`}>
          <CpuChipIcon className="h-5 w-5 text-blue-500 mr-2" />
          Modelo de IA (LLM)
        </h3>
        <ClientSelector
          value={clientFilter}
          onChange={setClientFilter}
          clients={clients}
          loading={clientsLoading}
          variant="toggle"
          allowSegment={false}
          storageKey={storageKey}
        />
      </div>
      <p className={`text-xs font-medium -mt-2 ${t.textMuted}`}>
        Cascata Cliente → Tenant → Segmento → Global. Campanhas de Marketing Digital usa sempre
        o modelo global do Master, à parte — este seletor é só pra CRM/Mensageria.
      </p>

      {scopeClientId && !llmLoading && !llmHasOverride && (
        <div className={`rounded-2xl p-3 text-xs ${t.isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
          Este cliente ainda não tem modelo próprio — está herdando do tenant (ou do padrão do
          segmento, se o tenant também não tiver). Escolha um provider/modelo abaixo e salve
          pra criar um override só pra ele.
        </div>
      )}

      <div>
        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.textMuted}`}>Provider</label>
        <select value={llmProvider} onChange={e => handleProviderChange(e.target.value)} className={selectCls} disabled={llmLoading}>
          {scopeClientId && <option value="">— Sem override (herda a cascata) —</option>}
          {providerList.map(p => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.textMuted}`}>Modelo</label>
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
            placeholder="ID do modelo" className={selectCls} />
        )}
      </div>

      {selectedModel && (
        <div className={`rounded-2xl p-3 flex flex-wrap items-center gap-3 ${t.isDark ? 'bg-white/5' : 'bg-white'}`}>
          <span className="text-amber-400 text-sm tracking-tight">
            {'★'.repeat(selectedModel.qualityScore)}{'☆'.repeat(5 - selectedModel.qualityScore)}
          </span>
          {selectedModel.isFree && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-500/10 text-emerald-500">🆓 Tier gratuito</span>
          )}
          {selectedModel.isRecommended && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-blue-500/10 text-blue-500">⭐ Recomendado</span>
          )}
          {selectedModel.contextWindow && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-violet-500/10 text-violet-500">
              {selectedModel.contextWindow >= 1000000
                ? `${(selectedModel.contextWindow / 1000000).toFixed(1)}M tokens`
                : `${Math.round(selectedModel.contextWindow / 1000)}k tokens`}
            </span>
          )}
          {selectedModel.notes && <span className={`text-xs w-full ${t.textMuted}`}>{selectedModel.notes}</span>}
        </div>
      )}

      <div>
        <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${t.textMuted}`}>
          {llmApiKeySet ? 'API Key (já configurada — deixe vazio para manter)' : 'API Key'}
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={llmApiKey}
            onChange={e => setLlmApiKey(e.target.value)}
            placeholder={llmApiKeySet ? '••••••••' : 'Cole sua API Key aqui'}
            className={`${selectCls} pr-12`}
          />
          <button type="button" onClick={() => setShowKey(!showKey)}
            className={`absolute right-4 top-1/2 -translate-y-1/2 ${t.isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`}>
            {showKey ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
        <p className={`text-xs mt-1.5 ${t.textMuted}`}>{getKeyHint(llmProvider)}</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap pt-1">
        <button onClick={handleSave} disabled={llmSaving}
          className="px-5 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-50">
          {llmSaving ? 'Salvando...' : 'Salvar IA'}
        </button>
        {!scopeClientId && (
          <button onClick={handleTest} disabled={llmTesting}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 ${t.isDark ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'}`}>
            <span className="flex items-center gap-2">
              <WifiIcon className="h-3.5 w-3.5" />
              {llmTesting ? 'Testando...' : 'Testar Conexão'}
            </span>
          </button>
        )}
        {scopeClientId && llmHasOverride && (
          <button onClick={handleRestore} disabled={llmSaving}
            className="px-5 py-2.5 bg-transparent border border-amber-400/40 text-amber-500 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-amber-500/10 transition-colors disabled:opacity-50">
            Restaurar herança
          </button>
        )}
        {llmSaved && (
          <span className="flex items-center gap-1.5 text-xs font-black text-emerald-500">
            <CheckCircleIcon className="h-4 w-4" /> Salvo
          </span>
        )}
        {llmTestResult && (
          <span className={`flex items-center gap-1.5 text-xs font-black ${llmTestResult.success ? 'text-emerald-500' : 'text-red-500'}`}>
            {llmTestResult.success ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
            {llmTestResult.message}
          </span>
        )}
      </div>
    </div>
  );
}
