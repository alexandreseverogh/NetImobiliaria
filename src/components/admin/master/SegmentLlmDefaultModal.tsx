'use client';

/**
 * Default de LLM do Master POR SEGMENTO (docs/CHECKPOINT.md, 2026-08-28) — o nível 3 da
 * cascata Cliente → Tenant → Segmento → Global, usada só por CRM/Mensageria
 * (getLlmClient). Sem default próprio aqui, um tenant/cliente sem config cai na única
 * linha global de sempre (comportamento de antes desta cascata existir).
 */

import { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

interface Segment { id: string; name: string; slug: string }

interface Props {
  segment: Segment;
  onClose: () => void;
}

interface LlmModelOption { modelId: string; modelLabel: string }
interface LlmModelsResponse { providers: Record<string, { label: string; models: LlmModelOption[] }> }

export function SegmentLlmDefaultModal({ segment, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState('');

  const [llmModels, setLlmModels] = useState<LlmModelsResponse | null>(null);
  const [llmProvider, setLlmProvider] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmApiKeySet, setLlmApiKeySet] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/master/segments/${segment.id}/llm-default`, { credentials: 'include' }).then(r => r.json()),
      fetch('/api/admin/campanhas/settings/llm/models', { credentials: 'include' }).then(r => r.json()),
    ])
      .then(([def, models]) => {
        setLlmProvider(def.llmProvider || '');
        setLlmModel(def.llmModel || '');
        setLlmApiKeySet(!!def.llmApiKeySet);
        setLlmModels(models);
      })
      .catch(() => setError('Falha ao carregar'))
      .finally(() => setLoading(false));
  }, [segment.id]);

  const providerList = llmModels ? Object.entries(llmModels.providers).map(([key, val]) => ({ key, label: val.label })) : [];
  const providerModels: LlmModelOption[] = (llmProvider && llmModels?.providers[llmProvider]?.models) || [];

  async function handleSave() {
    setSaving(true); setError(''); setSaveOk(false);
    try {
      const payload: any = { llmProvider: llmProvider || null, llmModel: llmModel || null };
      if (llmApiKey) payload.llmApiKey = llmApiKey;
      const res = await fetch(`/api/admin/master/segments/${segment.id}/llm-default`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setLlmApiKeySet(!!llmApiKey || llmApiKeySet);
      setLlmApiKey('');
      setSaveOk(true);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-0.5">
              Segmento · {segment.name}
            </p>
            <h2 className="text-lg font-black text-gray-900">Modelo de IA Padrão do Segmento</h2>
            <p className="text-xs text-gray-400 mt-0.5 max-w-sm">
              Usado só por CRM/Mensageria quando um tenant deste segmento (ou um cliente dele)
              não tem modelo próprio configurado. Sem default aqui, cai no modelo global da
              plataforma.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors shrink-0">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>}

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-10 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : (
            <>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Provider</label>
                <select
                  value={llmProvider}
                  onChange={e => { setLlmProvider(e.target.value); setLlmModel(''); }}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <option value="">— Sem default (herda a linha global) —</option>
                  {providerList.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </div>

              {llmProvider && (
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Modelo</label>
                  <select
                    value={llmModel}
                    onChange={e => setLlmModel(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="">Selecione...</option>
                    {providerModels.map(m => <option key={m.modelId} value={m.modelId}>{m.modelLabel}</option>)}
                  </select>
                </div>
              )}

              {llmProvider && (
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    API Key {llmApiKeySet && '(já configurada — deixe vazio para manter)'}
                  </label>
                  <input
                    type="password"
                    value={llmApiKey}
                    onChange={e => setLlmApiKey(e.target.value)}
                    placeholder={llmApiKeySet ? '••••••••' : 'Cole a API Key aqui'}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 shrink-0">
          {saveOk && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <CheckCircleIcon className="h-4 w-4" /> Salvo!
            </span>
          )}
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-white transition-all">
            Fechar
          </button>
          <button onClick={handleSave} disabled={saving || loading}
            className={cn('px-5 py-2 rounded-xl text-sm font-black text-white transition-all',
              (saving || loading) ? 'bg-gray-300 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 shadow-sm')}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
