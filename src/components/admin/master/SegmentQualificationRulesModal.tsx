'use client';

/**
 * Regras padrão de qualificação de lead por IA (CRM) + gate de ativação, por segmento.
 * Ver src/lib/ai/conciergeService.ts (motor que consome isto) e docs/CHECKPOINT.md.
 */

import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, QuestionMarkCircleIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

interface Rule {
  id?: string;
  palavras_chave: string;
  tag_resultante: string;
  resumo_modelo: string;
  score_base: number;
  ativa: boolean;
}

interface RuleStat { tagResultante: string; leadsGerados: number; leadsConvertidos: number; taxaConversaoObservada: number | null }

interface RecalibrationSuggestion {
  id: string;
  tag_resultante: string;
  score_atual: number;
  score_sugerido: number;
  leads_gerados: number;
  leads_convertidos: number;
  taxa_conversao_observada: number;
}

interface Segment { id: string; name: string; slug: string }

interface Props {
  segment: Segment;
  onClose: () => void;
}

const EMPTY_RULE: Rule = { palavras_chave: '', tag_resultante: '', resumo_modelo: '', score_base: 5, ativa: true };

export function SegmentQualificationRulesModal({ segment, onClose }: Props) {
  const [crmIaAtiva, setCrmIaAtiva] = useState(false);
  const [rules, setRules] = useState<Rule[]>([]);
  const [stats, setStats] = useState<Record<string, RuleStat>>({});
  const [suggestions, setSuggestions] = useState<RecalibrationSuggestion[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const load = useCallback(() => {
    return fetch(`/api/admin/master/segments/${segment.id}/qualification-rules`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setCrmIaAtiva(!!d.crmIaAtiva);
        setRules(Array.isArray(d.rules) ? d.rules : []);
        setStats(d.stats ?? {});
        setSuggestions(Array.isArray(d.recalibrationSuggestions) ? d.recalibrationSuggestions : []);
      })
      .catch(() => setRules([]));
  }, [segment.id]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function decideSuggestion(suggestionId: string, decision: 'apply' | 'dismiss') {
    setDecidingId(suggestionId);
    try {
      const res = await fetch(`/api/admin/master/segments/${segment.id}/qualification-rules/recalibration`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionId, decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao decidir sugestão');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Erro ao decidir sugestão');
    } finally {
      setDecidingId(null);
    }
  }

  const updateRule = (i: number, patch: Partial<Rule>) =>
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const removeRule = (i: number) => setRules(prev => prev.filter((_, idx) => idx !== i));
  const addRule = () => setRules(prev => [...prev, { ...EMPTY_RULE }]);

  async function handleSave() {
    setSaving(true); setError(''); setSaveOk(false);
    try {
      const clean = rules
        .map(r => ({ ...r, palavras_chave: r.palavras_chave.trim(), tag_resultante: r.tag_resultante.trim(), resumo_modelo: r.resumo_modelo.trim() }))
        .filter(r => r.tag_resultante && r.palavras_chave && r.resumo_modelo);
      const res = await fetch(`/api/admin/master/segments/${segment.id}/qualification-rules`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crmIaAtiva, rules: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      await load(); // reconsulta stats/sugestões — replace-all trocou os ids das regras
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
            <p className="text-[10px] font-black text-teal-500 uppercase tracking-widest mb-0.5">
              Segmento · {segment.name}
            </p>
            <h2 className="text-lg font-black text-gray-900">Qualificação de Lead por IA (CRM)</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Regras padrão usadas por todo tenant deste segmento (cada tenant pode adicionar as próprias
              em <span className="font-mono">/crm/config/ia</span>). Enquanto "IA Ativa" estiver desligado,
              nenhum tenant deste segmento consegue usar o Kanban/gestão de leads — a captação de lead
              continua funcionando normalmente nesse meio tempo.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={() => setShowHelp(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all',
                showHelp ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-600 hover:bg-teal-100 border border-teal-100',
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
            <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4 space-y-2 text-xs text-gray-600">
              <p><span className="font-black text-gray-900">Palavras-chave</span>: gatilhos que disparam a regra quando aparecem na mensagem do lead (separadas por vírgula) — usadas tanto como fallback determinístico quanto como contexto pro LLM.</p>
              <p><span className="font-black text-gray-900">Tag</span>: rótulo curto da intenção detectada (aparece na ficha do lead no Kanban). <span className="font-black text-gray-900">Score base</span>: 0 a 10, prontidão do lead pra avançar.</p>
              <p><span className="font-black text-gray-900">IA Ativa</span> é uma decisão deliberada, não automática — pode ativar mesmo com poucas regras cadastradas; o motor sempre tem um fallback genérico quando nenhuma regra bate.</p>
              <p><span className="font-black text-gray-900">Conversão real e sugestão de score</span> (agente "Recalibração de Score", ativado por segmento em Agentes de Aceleração): quando ativo, 1x por dia o sistema compara o score cadastrado com a taxa de conversão real dos leads que bateram nessa regra e reordena as regras por desempenho real (automático, sem aprovação — só muda a ordem interna de checagem). Quando o desvio é grande, aparece um card amarelo de sugestão abaixo da regra — "Aplicar" muda o score, "Descartar" ignora.</p>
            </div>
          )}

          <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 cursor-pointer">
            <div>
              <p className="text-sm font-black text-gray-900">IA Ativa neste segmento</p>
              <p className="text-[11px] text-gray-500">Libera o uso interno do CRM (Kanban/gestão) pra todo tenant deste segmento.</p>
            </div>
            <input type="checkbox" checked={crmIaAtiva} onChange={e => setCrmIaAtiva(e.target.checked)}
              className="h-5 w-5 rounded accent-teal-600" />
          </label>

          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{rules.length} regra(s)</p>
          </div>

          {error && <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : rules.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <p className="text-sm font-medium text-gray-500">Nenhuma regra cadastrada</p>
              <p className="text-xs text-gray-400 mt-1">Adicione ao menos algumas antes de ativar a IA pra este segmento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((r, i) => {
                const stat = stats[r.tag_resultante];
                const suggestion = suggestions.find(s => s.tag_resultante === r.tag_resultante);
                return (
                <div key={i} className="rounded-xl border border-gray-200 p-3 bg-gray-50/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <input value={r.tag_resultante}
                      onChange={e => updateRule(i, { tag_resultante: e.target.value })}
                      placeholder="Tag (ex: Primeiro Imóvel)"
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    <input type="number" min={0} max={10} value={r.score_base}
                      onChange={e => updateRule(i, { score_base: parseInt(e.target.value) || 0 })}
                      className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-center text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    <label className="flex items-center gap-1 text-[10px] font-bold text-gray-500 whitespace-nowrap">
                      <input type="checkbox" checked={r.ativa} onChange={e => updateRule(i, { ativa: e.target.checked })} className="accent-teal-600" />
                      Ativa
                    </label>
                    <button onClick={() => removeRule(i)} className="text-gray-300 hover:text-red-500 p-1">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <input value={r.palavras_chave}
                    onChange={e => updateRule(i, { palavras_chave: e.target.value })}
                    placeholder="palavras-chave, separadas por vírgula"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-400" />
                  <textarea value={r.resumo_modelo}
                    onChange={e => updateRule(i, { resumo_modelo: e.target.value })}
                    placeholder="Resumo que o profissional verá na ficha do lead..."
                    rows={2}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400" />

                  {/* F5 — conversão real, computada ao vivo (nunca armazenada na regra). */}
                  {stat && (
                    <p className="text-[10px] text-gray-400 font-mono">
                      {stat.leadsGerados === 0
                        ? 'Sem leads reais com esta tag ainda (últimos 90 dias)'
                        : `${stat.leadsGerados} lead(s) reais · ${stat.leadsConvertidos} fechado(s) · ${stat.taxaConversaoObservada}% conversão real (90d)`}
                    </p>
                  )}

                  {suggestion && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2">
                      <p className="flex items-center gap-1.5 text-[11px] text-amber-800">
                        <ArrowTrendingUpIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          <span className="font-black">Sugestão:</span> score {suggestion.score_atual} → {suggestion.score_sugerido}
                          {' '}(conversão real {suggestion.taxa_conversao_observada}%, baseado em {suggestion.leads_gerados} leads)
                        </span>
                      </p>
                      <div className="flex gap-1.5 shrink-0">
                        <button disabled={decidingId === suggestion.id}
                          onClick={() => decideSuggestion(suggestion.id, 'dismiss')}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-50">
                          Descartar
                        </button>
                        <button disabled={decidingId === suggestion.id}
                          onClick={() => decideSuggestion(suggestion.id, 'apply')}
                          className="px-2 py-1 rounded-lg text-[10px] font-black text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50">
                          {decidingId === suggestion.id ? 'Aplicando...' : 'Aplicar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}

          <button onClick={addRule}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-500 hover:border-teal-300 hover:text-teal-600 transition-all">
            <PlusIcon className="h-3.5 w-3.5" /> Adicionar regra
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
              saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 shadow-sm')}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
