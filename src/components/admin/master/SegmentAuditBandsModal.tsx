'use client';

/**
 * Editor das faixas de pontuação da auditoria (audit_scoring_bands) por segmento.
 * Cada dimensão agrupa regras; cada regra é uma tabela de faixas avaliadas em ordem:
 * a primeira que casa define a nota. A última faixa de cada regra é sempre 'Qualquer valor'
 * (fallback), e a API recusa salvar sem ela.
 */
import { useEffect, useMemo, useState } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export interface AuditBandsSegment { id: string; name: string }

interface Row {
  key: string;            // id local estável para React
  sortOrder: number;
  comparison: 'lte' | 'lt' | 'gte' | 'gt' | 'any';
  bound: string;          // texto do input
  score: string;
  label: string;
}

interface Rule { ruleKey: string; rows: Row[] }
interface Dimension { dimension: string; rules: Rule[] }

const DIMENSION_LABELS: Record<string, string> = {
  performance: 'Performance (CPL vs ideal)',
  spend_efficiency: 'Eficiência de Verba (desperdício)',
  funnel_health: 'Saúde do Funil',
  tracking: 'Saúde do Rastreamento',
  creative: 'Saúde Criativa',
  reference: 'Valores de referência (fallback)',
  problem: 'Problemas detectados',
  opportunity: 'Oportunidades',
};

const RULE_LABELS: Record<string, string> = {
  weight: 'Peso da dimensão no score geral',
  status_ok_min: 'Nota mínima para "saudável"',
  status_warn_min: 'Nota mínima para "atenção"',
  base: 'Nota quando não há dados suficientes',
  no_leads: 'Nota quando há gasto e nenhum lead',
  cpl_ratio: 'CPL ÷ CPL ideal',
  waste_pct: '% do gasto em desperdício',
  weight_tof: 'Peso do CTR (topo)',
  weight_mof: 'Peso do lead rate (meio)',
  weight_bof: 'Peso da conversão (fundo)',
  ctr_ratio: 'CTR ÷ CTR mínimo',
  lead_rate: 'Lead rate (%)',
  conv_rate: 'Conversão (%)',
  fallback: 'Nota sem health check',
  weight_freq: 'Peso da frequência',
  weight_hook: 'Peso do hook rate',
  freq_ratio: 'Frequência ÷ máximo',
  hook_ratio: 'Hook rate ÷ crítico',
  cpl_ideal: 'CPL ideal (fallback)',
  cpl_critical: 'CPL crítico (fallback)',
  ctr_min: 'CTR mínimo (fallback)',
  frequency_max: 'Frequência máxima (fallback)',
  hook_rate_critical: 'Hook rate crítico (fallback)',
  trigger_min: 'Nota abaixo disto vira problema',
  tracking_high_below: 'Nota de tracking de impacto alto abaixo de',
  waste_high_brl: 'Desperdício de impacto alto acima de (R$)',
  ctr_factor: 'Múltiplo do CTR mínimo para a meta',
  tracking_below: 'Nota de tracking abaixo disto gera oportunidade',
};

const COMPARISON_LABEL: Record<Row['comparison'], string> = {
  lte: 'até (≤)',
  lt: 'menor que (<)',
  gte: 'a partir de (≥)',
  gt: 'maior que (>)',
  any: 'qualquer valor (fallback)',
};

let keySeq = 0;
const nextKey = () => `r${++keySeq}`;

function groupBands(list: any[]): Dimension[] {
  const dims = new Map<string, Map<string, Row[]>>();
  for (const b of list) {
    if (!dims.has(b.dimension)) dims.set(b.dimension, new Map());
    const rules = dims.get(b.dimension)!;
    if (!rules.has(b.ruleKey)) rules.set(b.ruleKey, []);
    rules.get(b.ruleKey)!.push({
      key: nextKey(),
      sortOrder: b.sortOrder,
      comparison: b.comparison,
      bound: b.bound == null ? '' : String(b.bound),
      score: String(b.score),
      label: b.label ?? '',
    });
  }
  return Array.from(dims.entries()).map(([dimension, rules]) => ({
    dimension,
    rules: Array.from(rules.entries()).map(([ruleKey, rows]) => ({
      ruleKey,
      rows: rows.sort((a, c) => a.sortOrder - c.sortOrder),
    })),
  }));
}

export function SegmentAuditBandsModal({ segment, onClose }: { segment: AuditBandsSegment; onClose: () => void }) {
  const [dims, setDims] = useState<Dimension[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/master/segments/${segment.id}/audit-bands`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar');
        if (!cancelled) setDims(groupBands(data.bands ?? []));
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [segment.id]);

  const updateRow = (dimIdx: number, ruleIdx: number, rowKey: string, patch: Partial<Row>) => {
    setDims(prev => prev.map((d, di) => di !== dimIdx ? d : {
      ...d,
      rules: d.rules.map((r, ri) => ri !== ruleIdx ? r : {
        ...r,
        rows: r.rows.map(row => row.key === rowKey ? { ...row, ...patch } : row),
      }),
    }));
  };

  // Nova faixa entra antes da 'qualquer valor', que deve continuar por último.
  const addRow = (dimIdx: number, ruleIdx: number) => {
    setDims(prev => prev.map((d, di) => di !== dimIdx ? d : {
      ...d,
      rules: d.rules.map((r, ri) => {
        if (ri !== ruleIdx) return r;
        const newRow: Row = { key: nextKey(), sortOrder: 0, comparison: 'gte', bound: '', score: '', label: '' };
        const fallbackIdx = r.rows.findIndex(x => x.comparison === 'any');
        const rows = [...r.rows];
        if (fallbackIdx === -1) rows.push(newRow); else rows.splice(fallbackIdx, 0, newRow);
        return { ...r, rows };
      }),
    }));
  };

  const removeRow = (dimIdx: number, ruleIdx: number, rowKey: string) => {
    setDims(prev => prev.map((d, di) => di !== dimIdx ? d : {
      ...d,
      rules: d.rules.map((r, ri) => ri !== ruleIdx ? r : {
        ...r,
        rows: r.rows.filter(row => row.key !== rowKey),
      }),
    }));
  };

  const save = async () => {
    setError(null);
    setSavedMsg(null);
    const bands: any[] = [];
    try {
    for (const d of dims) {
      for (const r of d.rules) {
        r.rows.forEach((row, i) => {
          const score = Number(row.score.replace(',', '.'));
          if (!row.score.trim() || !Number.isFinite(score)) {
            throw new Error(`Informe a nota em ${DIMENSION_LABELS[d.dimension] ?? d.dimension} › ${RULE_LABELS[r.ruleKey] ?? r.ruleKey}`);
          }
          let bound: number | null = null;
          if (row.comparison !== 'any') {
            bound = Number(row.bound.replace(',', '.'));
            if (!row.bound.trim() || !Number.isFinite(bound)) {
              throw new Error(`Informe o limite em ${DIMENSION_LABELS[d.dimension] ?? d.dimension} › ${RULE_LABELS[r.ruleKey] ?? r.ruleKey}`);
            }
          }
          bands.push({
            dimension: d.dimension,
            ruleKey: r.ruleKey,
            sortOrder: i + 1,
            comparison: row.comparison,
            bound,
            score,
            label: row.label || null,
          });
        });
      }
    }
    } catch (e: any) {
      setError(e.message);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/master/segments/${segment.id}/audit-bands`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bands }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      setSavedMsg(`Salvo: ${data.count} faixas.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const sortedDims = useMemo(() => dims, [dims]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Pontuação da Auditoria</h2>
            <p className="text-xs text-gray-500">Segmento: <span className="font-semibold">{segment.name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><XMarkIcon className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <p className="text-xs text-gray-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            Cada regra é avaliada de cima para baixo: a primeira faixa que casa define a nota.
            A última faixa de cada regra é sempre <b>qualquer valor</b> (fallback) e não pode ser removida.
          </p>

          {loading && <p className="text-sm text-gray-500">Carregando…</p>}

          {!loading && sortedDims.map((d, di) => (
            <section key={d.dimension} className="border border-gray-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">{DIMENSION_LABELS[d.dimension] ?? d.dimension}</h3>
              <div className="space-y-4">
                {d.rules.map((r, ri) => (
                  <div key={r.ruleKey}>
                    <p className="text-xs font-semibold text-gray-600 mb-1">{RULE_LABELS[r.ruleKey] ?? r.ruleKey}</p>
                    <div className="space-y-1.5">
                      {r.rows.map(row => (
                        <div key={row.key} className="grid grid-cols-12 gap-2 items-center">
                          <select
                            value={row.comparison}
                            onChange={e => updateRow(di, ri, row.key, { comparison: e.target.value as Row['comparison'], bound: e.target.value === 'any' ? '' : row.bound })}
                            className="col-span-3 px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                          >
                            {(Object.keys(COMPARISON_LABEL) as Row['comparison'][]).map(c => (
                              <option key={c} value={c}>{COMPARISON_LABEL[c]}</option>
                            ))}
                          </select>
                          <input
                            type="text" inputMode="decimal" disabled={row.comparison === 'any'}
                            value={row.bound} placeholder="limite"
                            onChange={e => updateRow(di, ri, row.key, { bound: e.target.value })}
                            className="col-span-2 px-2 py-1.5 border border-gray-200 rounded-lg text-xs disabled:bg-gray-50 disabled:text-gray-400"
                          />
                          <input
                            type="text" inputMode="decimal" value={row.score} placeholder="nota"
                            onChange={e => updateRow(di, ri, row.key, { score: e.target.value })}
                            className="col-span-2 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold"
                          />
                          <input
                            type="text" value={row.label} placeholder="descrição (aparece no detalhe)"
                            onChange={e => updateRow(di, ri, row.key, { label: e.target.value })}
                            className="col-span-4 px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                          />
                          <button
                            onClick={() => removeRow(di, ri, row.key)}
                            disabled={row.comparison === 'any' || r.rows.length <= 1}
                            className="col-span-1 flex justify-center text-gray-400 hover:text-red-600 disabled:opacity-30"
                            title={row.comparison === 'any' ? 'A faixa de fallback não pode ser removida' : 'Remover faixa'}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => addRow(di, ri)}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <PlusIcon className="h-3.5 w-3.5" /> Adicionar faixa
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {error && <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          {savedMsg && <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{savedMsg}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Fechar</button>
          <button
            onClick={save} disabled={saving || loading}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar Pontuação'}
          </button>
        </div>
      </div>
    </div>
  );
}
