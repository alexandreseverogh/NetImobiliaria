'use client';

/**
 * Agentes de Aceleração do CRM, por segmento (docs/PLANO_AGENTES_ACELERACAO_CRM.md).
 * Lista vem de CRM_AGENT_CATALOG (código) — cresce 1 entrada por fase (F1-F5). Nesta fase
 * (F0 — Fundação) o catálogo está vazio de propósito: nenhum agente real existe ainda, então
 * a tela mostra isso honestamente em vez de expor um toggle sem efeito nenhum por trás.
 */

import { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, PlusIcon, TrashIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';
import { AgentesAceleracaoHelp } from '@/components/crm/AgentesAceleracaoHelp';

interface ParamHint { key: string; label: string; default: string }
interface CatalogAgent { key: string; label: string; description: string; paramHints?: ParamHint[] }
interface AgentConfig { agent_key: string; ativo: boolean; params: Record<string, any> }
interface Segment { id: string; name: string; slug: string }

interface Props {
  segment: Segment;
  onClose: () => void;
}

const ORDINAL = ['1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º'];

export function SegmentAgentesModal({ segment, onClose }: Props) {
  const [catalog, setCatalog] = useState<CatalogAgent[]>([]);
  const [configByKey, setConfigByKey] = useState<Record<string, AgentConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/master/segments/${segment.id}/agentes`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const cat: CatalogAgent[] = Array.isArray(d.catalog) ? d.catalog : [];
        setCatalog(cat);
        const byKey: Record<string, AgentConfig> = {};
        for (const c of cat) {
          const existing = (d.config ?? []).find((r: any) => r.agent_key === c.key);
          byKey[c.key] = existing
            ? { agent_key: c.key, ativo: !!existing.ativo, params: existing.params ?? {} }
            : { agent_key: c.key, ativo: false, params: {} };
        }
        setConfigByKey(byKey);
      })
      .catch(() => setCatalog([]))
      .finally(() => setLoading(false));
  }, [segment.id]);

  const setAtivo = (key: string, ativo: boolean) =>
    setConfigByKey(prev => ({ ...prev, [key]: { ...prev[key], ativo } }));

  const setParam = (key: string, paramKey: string, value: string) =>
    setConfigByKey(prev => ({ ...prev, [key]: { ...prev[key], params: { ...prev[key].params, [paramKey]: value } } }));

  const removeParam = (key: string, paramKey: string) =>
    setConfigByKey(prev => {
      const { [paramKey]: _omit, ...rest } = prev[key].params;
      return { ...prev, [key]: { ...prev[key], params: rest } };
    });

  const addParam = (key: string) =>
    setConfigByKey(prev => ({ ...prev, [key]: { ...prev[key], params: { ...prev[key].params, '': '' } } }));

  // Preenche já com chave+valor padrão do hint — o Master só confirma/ajusta, não precisa
  // saber de cabeça o nome exato do parâmetro nem redigitar o default documentado no código.
  const useHint = (key: string, hint: ParamHint) =>
    setConfigByKey(prev => ({ ...prev, [key]: { ...prev[key], params: { ...prev[key].params, [hint.key]: hint.default } } }));

  const renameParamKey = (key: string, oldKey: string, newKey: string) =>
    setConfigByKey(prev => {
      const params = { ...prev[key].params };
      const value = params[oldKey];
      delete params[oldKey];
      params[newKey] = value;
      return { ...prev, [key]: { ...prev[key], params } };
    });

  async function handleSave() {
    setSaving(true); setError(''); setSaveOk(false);
    try {
      const agents = Object.values(configByKey).map(c => ({
        agent_key: c.agent_key,
        ativo: c.ativo,
        params: Object.fromEntries(Object.entries(c.params).filter(([k]) => k.trim() !== '')),
      }));
      const res = await fetch(`/api/admin/master/segments/${segment.id}/agentes`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setSaveOk(true);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">
              Segmento · {segment.name}
            </p>
            <h2 className="text-lg font-black text-gray-900">Agentes de Aceleração (CRM)</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Liga/desliga cada agente e ajusta os parâmetros dele — vale pra todo tenant deste
              segmento. Clique em "Ajuda" pra ver, agente a agente, como preencher e onde cada
              parâmetro faz efeito.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button onClick={() => setShowHelp(v => !v)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                showHelp ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100')}>
              <QuestionMarkCircleIcon className="h-4 w-4" /> Ajuda
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>}

          {showHelp && (
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 text-gray-700">
              <AgentesAceleracaoHelp
                catalog={catalog}
                intro={
                  <p>
                    Cada agente abaixo é um comportamento fixo no código (o que ele faz não muda),
                    mas <span className="font-semibold">se ele roda ou não, e com qual limiar,
                    é 100% definido aqui</span> — nada disso fica fixo no código da aplicação.
                    O que você salva aqui vale como <span className="font-semibold">padrão para
                    todo tenant deste segmento</span> ({segment.name}).
                  </p>
                }
              >
                <div className="pt-3 border-t border-orange-200/70 space-y-1">
                  <p className="font-black text-gray-900">Sobre override por tenant</p>
                  <p>
                    Cada tenant deste segmento pode sobrepor o que você salvar aqui em{' '}
                    <span className="font-mono bg-white px-1 rounded">/crm/config/agentes</span> —
                    ele escolhe, agente a agente, entre herdar o padrão do segmento ou forçar
                    ativado/desativado só pra empresa dele. Enquanto o tenant não mexer em nada,
                    usa exatamente o que for salvo aqui.
                  </p>
                </div>
              </AgentesAceleracaoHelp>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : catalog.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <p className="text-sm font-medium text-gray-500">Nenhum agente disponível ainda</p>
              <p className="text-xs text-gray-400 mt-1">
                Os agentes são liberados um de cada vez, conforme cada fase do plano é implementada
                (Velocidade de 1º Contato, Estagnação, Próxima Ação, Reativação, Recalibração de Score).
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {catalog.map((agent, i) => {
                const cfg = configByKey[agent.key];
                if (!cfg) return null;
                const paramEntries = Object.entries(cfg.params);
                const pendingHints = (agent.paramHints ?? []).filter(h => !(h.key in cfg.params));
                return (
                  <div key={agent.key} className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-3">
                    <label className="flex items-center justify-between gap-3 cursor-pointer">
                      <div>
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">{ORDINAL[i] ?? `${i + 1}º`} Agente</p>
                        <p className="text-sm font-black text-gray-900">{agent.label}</p>
                        <p className="text-[11px] text-gray-500">{agent.description}</p>
                      </div>
                      <input type="checkbox" checked={cfg.ativo} onChange={e => setAtivo(agent.key, e.target.checked)}
                        className="h-5 w-5 rounded accent-orange-600 shrink-0" />
                    </label>

                    <div className="space-y-1.5">
                      {paramEntries.map(([pKey, pVal], i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <input value={pKey} onChange={e => renameParamKey(agent.key, pKey, e.target.value)}
                            placeholder="parâmetro"
                            className="w-1/3 px-2 py-1 rounded-lg border border-gray-200 text-xs font-mono text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                          <input value={String(pVal)} onChange={e => setParam(agent.key, pKey, e.target.value)}
                            placeholder="valor"
                            className="flex-1 px-2 py-1 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                          <button onClick={() => removeParam(agent.key, pKey)} className="text-gray-300 hover:text-red-500 p-1">
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => addParam(agent.key)}
                        className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-orange-600">
                        <PlusIcon className="h-3 w-3" /> Adicionar parâmetro
                      </button>
                    </div>

                    {pendingHints.length > 0 && (
                      <div className="pt-1 border-t border-gray-100 space-y-1.5">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Parâmetros deste agente</p>
                        <div className="flex flex-wrap gap-1.5">
                          {pendingHints.map(hint => (
                            <button key={hint.key} onClick={() => useHint(agent.key, hint)}
                              title={`Adiciona "${hint.key}" com o valor padrão (${hint.default})`}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-orange-200 bg-orange-50 text-[11px] font-semibold text-orange-700 hover:bg-orange-100 transition-colors">
                              <PlusIcon className="h-3 w-3" /> {hint.label} <span className="font-mono text-orange-400">({hint.default})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
          <button onClick={handleSave} disabled={saving || catalog.length === 0}
            className={cn('px-5 py-2 rounded-xl text-sm font-black text-white transition-all',
              saving || catalog.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 shadow-sm')}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
