'use client';

/**
 * Editor das estimativas e limites de exibição da auditoria por segmento (audit_text_settings).
 * Estimativas aceitam intervalo (mínimo e máximo). Limites de exibição são um único número.
 */
import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export interface AuditTextsSegment { id: string; name: string }

interface Param { key: string; min: string; max: string }

interface FieldDef { key: string; label: string; help: string; range: boolean; section: 'estimate' | 'limit' }

const FIELDS: FieldDef[] = [
  { key: 'lead_gain_factor', section: 'estimate', range: false,
    label: 'Fator de leads adicionais', help: 'Fração do CTR usada para estimar leads extras por mês. Ex.: 0,8.' },
  { key: 'cpl_reduction', section: 'estimate', range: true,
    label: 'Redução estimada de CPL (%)', help: 'Usado na oportunidade de ativar o meio do funil.' },
  { key: 'tracking_gain', section: 'estimate', range: true,
    label: 'Ganho de eficiência com tracking limpo (%)', help: 'Usado na oportunidade de melhorar o tracking.' },
  { key: 'scale_gain', section: 'estimate', range: true,
    label: 'Escala de leads com nova audiência (%)', help: 'Usado na oportunidade de expandir audiências.' },
  { key: 'lla_range', section: 'estimate', range: true,
    label: 'Faixa de Lookalike sugerida (%)', help: 'Porcentagem de similaridade citada na recomendação de Lookalike.' },
  { key: 'problem_dimensions', section: 'limit', range: false,
    label: 'Dimensões analisadas para problemas', help: 'Quantas das dimensões com pior nota entram na análise de problemas.' },
  { key: 'max_problems', section: 'limit', range: false,
    label: 'Máximo de problemas exibidos', help: 'Quantos problemas aparecem no relatório.' },
  { key: 'max_opportunities', section: 'limit', range: false,
    label: 'Máximo de oportunidades exibidas', help: 'Quantas oportunidades aparecem no relatório.' },
  { key: 'client_campaigns_top', section: 'limit', range: false,
    label: 'Campanhas exibidas por categoria de desperdício', help: 'Campanhas listadas em cada categoria de desperdício.' },
  { key: 'tenant_campaigns_top', section: 'limit', range: false,
    label: 'Campanhas exibidas no total de desperdício', help: 'Campanhas listadas no ranking geral de desperdício.' },
];

export function SegmentAuditTextsModal({ segment, onClose }: { segment: AuditTextsSegment; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, { min: string; max: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/master/segments/${segment.id}/audit-texts`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao carregar');
        const map: Record<string, { min: string; max: string }> = {};
        for (const p of (data.params ?? []) as Array<{ key: string; min: number; max: number | null }>) {
          map[p.key] = { min: String(p.min), max: p.max == null ? '' : String(p.max) };
        }
        if (!cancelled) setValues(map);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [segment.id]);

  const setField = (key: string, patch: Partial<{ min: string; max: string }>) => {
    setValues(prev => {
      const current = prev[key] ?? { min: '', max: '' };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  };

  const save = async () => {
    setError(null);
    setSavedMsg(null);
    const params: Array<{ key: string; min: number; max?: number | null }> = [];
    for (const f of FIELDS) {
      const v = values[f.key] ?? { min: '', max: '' };
      const min = Number(v.min.replace(',', '.'));
      if (!v.min.trim() || !Number.isFinite(min)) {
        setError(`Informe o valor de "${f.label}"`);
        return;
      }
      if (f.range) {
        const max = v.max.trim() ? Number(v.max.replace(',', '.')) : min;
        if (!Number.isFinite(max) || max < min) {
          setError(`Intervalo inválido em "${f.label}": máximo menor que mínimo`);
          return;
        }
        params.push({ key: f.key, min, max });
      } else {
        params.push({ key: f.key, min });
      }
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/master/segments/${segment.id}/audit-texts`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ params }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      setSavedMsg(`Salvo: ${data.count} parâmetros.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const estimates = FIELDS.filter(f => f.section === 'estimate');
  const limits = FIELDS.filter(f => f.section === 'limit');

  const renderField = (f: FieldDef) => (
    <div key={f.key} className="grid grid-cols-12 gap-2 items-start">
      <div className="col-span-5">
        <p className="text-xs font-semibold text-gray-700">{f.label}</p>
        <p className="text-[11px] text-gray-500">{f.help}</p>
      </div>
      <input
        type="text" inputMode="decimal" disabled={loading}
        value={values[f.key]?.min ?? ''} placeholder={f.range ? 'mínimo' : 'valor'}
        onChange={e => setField(f.key, { min: e.target.value })}
        className="col-span-3 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold"
      />
      {f.range ? (
        <input
          type="text" inputMode="decimal" disabled={loading}
          value={values[f.key]?.max ?? ''} placeholder="máximo"
          onChange={e => setField(f.key, { max: e.target.value })}
          className="col-span-3 px-2 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold"
        />
      ) : (
        <div className="col-span-3 text-[11px] text-gray-400 pt-2">limite único</div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Textos e Limites da Auditoria</h2>
            <p className="text-xs text-gray-500">Segmento: <span className="font-semibold">{segment.name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><XMarkIcon className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <p className="text-xs text-gray-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            Estimativas usadas nos conselhos do relatório e limites de quantos itens aparecem.
            Estimativas com intervalo têm mínimo e máximo; limites têm um único valor.
          </p>

          {loading && <p className="text-sm text-gray-500">Carregando…</p>}

          {!loading && (
            <>
              <section className="border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-800">Estimativas</h3>
                {estimates.map(renderField)}
              </section>
              <section className="border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-800">Limites de exibição</h3>
                {limits.map(renderField)}
              </section>
            </>
          )}

          {error && <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          {savedMsg && <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{savedMsg}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Fechar</button>
          <button
            onClick={save} disabled={saving || loading}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar Textos'}
          </button>
        </div>
      </div>
    </div>
  );
}
