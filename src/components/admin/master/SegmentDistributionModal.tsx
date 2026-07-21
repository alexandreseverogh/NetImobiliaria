'use client';

/**
 * Botão "Estratégias de Distribuição" em /admin/master/segments — lista ORDENADA de
 * estratégias plugáveis que decidem quem recebe cada lead deste segmento (dono do ativo,
 * área geográfica, fila, plantonista...). Substitui a cascata fixa que só fazia sentido pro
 * Imobiliário — cada segmento monta sua própria combinação, sem código novo.
 * Ver src/lib/routing/strategies/ e docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §6.
 */

import { useState, useEffect } from 'react';
import {
  XMarkIcon, AdjustmentsHorizontalIcon, PlusIcon, TrashIcon,
  ChevronUpIcon, ChevronDownIcon, CheckIcon,
} from '@heroicons/react/24/outline';

interface StrategyRow {
  strategyKey: string;
  priority: number;
  isActive: boolean;
  config: Record<string, any>;
}

interface CatalogEntry {
  key: string;
  label: string;
  description: string;
}

interface Props {
  segment: { id: string; name: string };
  onClose: () => void;
}

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function SegmentDistributionModal({ segment, onClose }: Props) {
  const [strategies, setStrategies] = useState<StrategyRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/master/segments/${segment.id}/distribution-strategies`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setStrategies(Array.isArray(d.strategies) ? d.strategies : []);
        setCatalog(Array.isArray(d.catalog) ? d.catalog : []);
      })
      .catch(() => { if (!cancelled) setError('Erro ao carregar estratégias'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [segment.id]);

  const available = catalog.filter((c) => !strategies.some((s) => s.strategyKey === c.key));

  function addStrategy(key: string) {
    setStrategies((prev) => [...prev, { strategyKey: key, priority: prev.length + 1, isActive: true, config: {} }]);
  }

  function removeStrategy(key: string) {
    setStrategies((prev) => prev.filter((s) => s.strategyKey !== key).map((s, i) => ({ ...s, priority: i + 1 })));
  }

  function move(key: string, dir: -1 | 1) {
    setStrategies((prev) => {
      const idx = prev.findIndex((s) => s.strategyKey === key);
      const swapWith = idx + dir;
      if (idx < 0 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next.map((s, i) => ({ ...s, priority: i + 1 }));
    });
  }

  function toggleActive(key: string) {
    setStrategies((prev) => prev.map((s) => (s.strategyKey === key ? { ...s, isActive: !s.isActive } : s)));
  }

  function updateConfig(key: string, field: string, value: string) {
    setStrategies((prev) => prev.map((s) => (s.strategyKey === key ? { ...s, config: { ...s.config, [field]: value } } : s)));
  }

  const IDENT_FIELDS_BY_STRATEGY: Record<string, string[]> = {
    owner_of_asset: ['targetTable', 'targetIdColumn', 'ownerColumn', 'estadoColumn', 'cidadeColumn'],
    geo_area: ['sellerAreaTable', 'sellerAreaFk', 'sellerEstadoColumn', 'sellerCidadeColumn'],
    plantonista_fallback: ['sellerAreaTable', 'sellerAreaFk', 'sellerEstadoColumn', 'sellerCidadeColumn'],
  };

  function validate(): string | null {
    for (const s of strategies) {
      const fields = IDENT_FIELDS_BY_STRATEGY[s.strategyKey] || [];
      for (const field of fields) {
        const v = s.config[field];
        if (v && !IDENT_RE.test(v)) {
          const label = catalog.find((c) => c.key === s.strategyKey)?.label || s.strategyKey;
          return `"${field}" em ${label} tem caractere inválido — só letras, números e underscore.`;
        }
      }
    }
    return null;
  }

  async function handleSave() {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/master/segments/${segment.id}/distribution-strategies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ strategies }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-0.5">
              Segmento · {segment.name}
            </p>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-sky-500" /> Estratégias de Distribuição
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Ajuda */}
        <div className="px-6 pt-4 shrink-0">
          <p className="text-xs text-gray-500 leading-relaxed bg-sky-50 border border-sky-100 rounded-xl px-3.5 py-2.5">
            Ordem importa: o motor tenta a 1ª estratégia; se não achar candidato, tenta a 2ª, e
            assim por diante. Deixe pelo menos uma etapa de fallback (ex.: Plantonista) por
            último, pra sempre garantir um responsável.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && <p className="text-xs text-red-600 font-medium mb-3">⚠️ {error}</p>}

          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {strategies.length === 0 && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                  <p className="text-sm font-medium text-gray-500">Nenhuma estratégia configurada.</p>
                  <p className="text-xs text-gray-400 mt-1">Sem nenhuma etapa, leads deste segmento nunca são roteados automaticamente.</p>
                </div>
              )}
              {strategies.map((s, idx) => {
                const meta = catalog.find((c) => c.key === s.strategyKey);
                return (
                  <div key={s.strategyKey} className={`rounded-xl border p-3.5 ${s.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-0.5 pt-0.5 shrink-0">
                        <button onClick={() => move(s.strategyKey, -1)} disabled={idx === 0} className="p-0.5 text-gray-400 hover:text-sky-600 disabled:opacity-20 disabled:cursor-not-allowed">
                          <ChevronUpIcon className="h-4 w-4" />
                        </button>
                        <span className="text-[10px] font-black text-gray-400">{idx + 1}</span>
                        <button onClick={() => move(s.strategyKey, 1)} disabled={idx === strategies.length - 1} className="p-0.5 text-gray-400 hover:text-sky-600 disabled:opacity-20 disabled:cursor-not-allowed">
                          <ChevronDownIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-gray-800">{meta?.label || s.strategyKey}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => toggleActive(s.strategyKey)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-colors ${
                                s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              {s.isActive ? 'Ativa' : 'Inativa'}
                            </button>
                            <button onClick={() => removeStrategy(s.strategyKey)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">{meta?.description}</p>

                        {s.strategyKey === 'owner_of_asset' && (
                          <div className="mt-2.5 space-y-1.5">
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="text" placeholder="tabela (ex: imoveis)"
                                value={s.config.targetTable || ''}
                                onChange={(e) => updateConfig(s.strategyKey, 'targetTable', e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                              />
                              <input
                                type="text" placeholder="coluna id (ex: id)"
                                value={s.config.targetIdColumn || ''}
                                onChange={(e) => updateConfig(s.strategyKey, 'targetIdColumn', e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                              />
                              <input
                                type="text" placeholder="coluna dono (ex: corretor_fk)"
                                value={s.config.ownerColumn || ''}
                                onChange={(e) => updateConfig(s.strategyKey, 'ownerColumn', e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                              />
                            </div>
                            <p className="text-[10px] text-gray-400">
                              Opcional — só preencher se este ativo também tiver geografia (usado como fallback pela "Área Geográfica" quando o lead não informa estado/cidade direto):
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text" placeholder="coluna estado (ex: estado_fk)"
                                value={s.config.estadoColumn || ''}
                                onChange={(e) => updateConfig(s.strategyKey, 'estadoColumn', e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                              />
                              <input
                                type="text" placeholder="coluna cidade (ex: cidade_fk)"
                                value={s.config.cidadeColumn || ''}
                                onChange={(e) => updateConfig(s.strategyKey, 'cidadeColumn', e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                              />
                            </div>
                          </div>
                        )}
                        {(s.strategyKey === 'geo_area' || s.strategyKey === 'plantonista_fallback') && (
                          <div className="mt-2.5 space-y-1.5">
                            <p className="text-[10px] text-gray-400">
                              Opcional — de qual tabela vem a área de atuação do vendedor. Deixe em branco pra usar o padrão (atendente_area_atuacao):
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text" placeholder="tabela (padrão: atendente_area_atuacao)"
                                value={s.config.sellerAreaTable || ''}
                                onChange={(e) => updateConfig(s.strategyKey, 'sellerAreaTable', e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                              />
                              <input
                                type="text" placeholder="coluna FK do vendedor (padrão: corretor_fk)"
                                value={s.config.sellerAreaFk || ''}
                                onChange={(e) => updateConfig(s.strategyKey, 'sellerAreaFk', e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                              />
                              <input
                                type="text" placeholder="coluna estado (padrão: estado_fk)"
                                value={s.config.sellerEstadoColumn || ''}
                                onChange={(e) => updateConfig(s.strategyKey, 'sellerEstadoColumn', e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                              />
                              <input
                                type="text" placeholder="coluna cidade (padrão: cidade_fk)"
                                value={s.config.sellerCidadeColumn || ''}
                                onChange={(e) => updateConfig(s.strategyKey, 'sellerCidadeColumn', e.target.value)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                              />
                            </div>
                          </div>
                        )}
                        {s.strategyKey === 'round_robin' && (
                          <div className="mt-2.5">
                            <input
                              type="number" placeholder="SLA em minutos (padrão 15)"
                              value={s.config.slaMinutos || ''}
                              onChange={(e) => updateConfig(s.strategyKey, 'slaMinutos', e.target.value)}
                              className="w-48 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && available.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Adicionar etapa</p>
              <div className="flex flex-wrap gap-2">
                {available.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => addStrategy(c.key)}
                    title={c.description}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-sky-300 text-xs font-semibold text-sky-700 hover:bg-sky-50 transition-colors"
                  >
                    <PlusIcon className="h-3.5 w-3.5" /> {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-white transition-all">
            Fechar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-all"
          >
            {saved ? <><CheckIcon className="h-4 w-4" /> Salvo</> : saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
