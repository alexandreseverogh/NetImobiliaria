'use client';

/**
 * Critérios de Fit (ICP) padrão por segmento (docs/PLANO_AGENTES_ACELERACAO_CRM.md §3.1).
 * Ver src/lib/ai/conciergeService.ts (motor que consome isto, 1 chamada de LLM, 2 scores).
 */

import { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

interface FitCriterion {
  id?: string;
  criterio: string;
  peso: number;
  ativo: boolean;
}

interface Segment { id: string; name: string; slug: string }

interface Props {
  segment: Segment;
  onClose: () => void;
}

const EMPTY_CRITERION: FitCriterion = { criterio: '', peso: 5, ativo: true };

export function SegmentFitCriteriaModal({ segment, onClose }: Props) {
  const [criteria, setCriteria] = useState<FitCriterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/master/segments/${segment.id}/fit-criteria`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setCriteria(Array.isArray(d.criteria) ? d.criteria : []))
      .catch(() => setCriteria([]))
      .finally(() => setLoading(false));
  }, [segment.id]);

  const updateCriterion = (i: number, patch: Partial<FitCriterion>) =>
    setCriteria(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  const removeCriterion = (i: number) => setCriteria(prev => prev.filter((_, idx) => idx !== i));
  const addCriterion = () => setCriteria(prev => [...prev, { ...EMPTY_CRITERION }]);

  async function handleSave() {
    setSaving(true); setError(''); setSaveOk(false);
    try {
      const clean = criteria
        .map(c => ({ ...c, criterio: c.criterio.trim() }))
        .filter(c => c.criterio);
      const res = await fetch(`/api/admin/master/segments/${segment.id}/fit-criteria`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteria: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setCriteria(clean);
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
            <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-0.5">
              Segmento · {segment.name}
            </p>
            <h2 className="text-lg font-black text-gray-900">Critérios de Fit (ICP)</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              O quão bem um lead se encaixa no perfil ideal de cliente deste segmento — dimensão
              separada da intenção (Qualificação). Cada tenant pode complementar em
              <span className="font-mono"> /crm/config/ia</span>.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={() => setShowHelp(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all',
                showHelp ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100',
              )}
              title="Como preencher esta tela"
            >
              <QuestionMarkCircleIcon className="h-4 w-4" />
              Ajuda
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {showHelp && (
            <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 space-y-2 text-xs text-gray-600">
              <p><span className="font-black text-gray-900">Fit</span> mede encaixe, não interesse — um lead pode estar muito engajado (alta intenção) mas fora do perfil ideal, ou o contrário. Nunca é combinado num "score geral" com a intenção; os dois aparecem separados na ficha do lead.</p>
              <p>Descreva o critério em texto livre (ex.: "orçamento declarado compatível com o portfólio ativo", "está dentro da área de cobertura atendida") — a IA avalia com base na mensagem do lead, sem inventar dado que não foi dito.</p>
              <p><span className="font-black text-gray-900">Peso</span>: 0 a 10, o quanto esse critério pesa na avaliação geral de fit.</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{criteria.length} critério(s)</p>
          </div>

          {error && <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : criteria.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <p className="text-sm font-medium text-gray-500">Nenhum critério cadastrado</p>
              <p className="text-xs text-gray-400 mt-1">Sem critérios, a IA sempre retorna fit neutro (5) — não é um erro, só não há curadoria ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {criteria.map((c, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-3 bg-gray-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <input value={c.criterio}
                      onChange={e => updateCriterion(i, { criterio: e.target.value })}
                      placeholder="Ex.: orçamento declarado compatível com o portfólio ativo"
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    <input type="number" min={0} max={10} value={c.peso}
                      onChange={e => updateCriterion(i, { peso: parseInt(e.target.value) || 0 })}
                      className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-center text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    <label className="flex items-center gap-1 text-[10px] font-bold text-gray-500 whitespace-nowrap">
                      <input type="checkbox" checked={c.ativo} onChange={e => updateCriterion(i, { ativo: e.target.checked })} className="accent-violet-600" />
                      Ativo
                    </label>
                    <button onClick={() => removeCriterion(i)} className="text-gray-300 hover:text-red-500 p-1">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={addCriterion}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-500 hover:border-violet-300 hover:text-violet-600 transition-all">
            <PlusIcon className="h-3.5 w-3.5" /> Adicionar critério
          </button>
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
          <button onClick={handleSave} disabled={saving}
            className={cn('px-5 py-2 rounded-xl text-sm font-black text-white transition-all',
              saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700 shadow-sm')}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
