'use client';

import { useState, useEffect } from 'react';
import {
  XMarkIcon, CheckCircleIcon,
  AdjustmentsHorizontalIcon, BoltIcon, EyeIcon, SignalIcon,
} from '@heroicons/react/24/outline';

interface Props {
  segment: { id: string; name: string };
  onClose: () => void;
}

type Unit = 'PCT' | 'BRL' | 'NUM';

interface FieldDef {
  key: string;
  label: string;
  unit: Unit;
  hint: string;
  fallback: number;
}

// ── Detecção: condições que disparam as ações do agente ──────────────────────
const DETECTION_FIELDS: FieldDef[] = [
  { key: 'cpl_ideal',          label: 'CPL Ideal',                    unit: 'BRL', fallback: 30,   hint: 'CPL que indica campanha saudável — base para sugerir escala.' },
  { key: 'cpl_critical',       label: 'CPL Crítico',                  unit: 'BRL', fallback: 80,   hint: 'Acima disto o agente pausa ou reduz o budget automaticamente.' },
  { key: 'ctr_min',            label: 'CTR Mínimo',                   unit: 'PCT', fallback: 1.0,  hint: 'CTR abaixo disto indica criativo fraco — gatilho de alerta.' },
  { key: 'ctr_scale',          label: 'CTR p/ Escalar',               unit: 'PCT', fallback: 2.0,  hint: 'CTR acima disto com bom CPL → agente sugere SCALE.' },
  { key: 'frequency_max',      label: 'Frequência Máxima',            unit: 'NUM', fallback: 3.0,  hint: 'Acima disto a audiência está saturada — dispara DOWNSCALE.' },
  { key: 'spend_no_lead',      label: 'Gasto sem Lead',               unit: 'BRL', fallback: 50,   hint: 'Gasto máximo sem nenhum lead antes de pausar automaticamente.' },
  { key: 'min_leads_scale',    label: 'Leads Mín. p/ Escalar',        unit: 'NUM', fallback: 5,    hint: 'Mínimo de leads no período para o agente recomendar escala.' },
  { key: 'min_days_running',   label: 'Dias Mín. Rodando',            unit: 'NUM', fallback: 3,    hint: 'Dias mínimos de campanha ativa antes de qualquer avaliação.' },
  { key: 'hook_rate_critical', label: 'Hook Rate Crítico',            unit: 'PCT', fallback: 8,    hint: 'Hook rate (vídeo) abaixo disto → criativo ruim, alerta emitido.' },
  { key: 'hook_rate_min',      label: 'Hook Rate Mínimo',             unit: 'PCT', fallback: 12,   hint: 'Hook rate mínimo aceitável para vídeos neste segmento.' },
];

// ── Execução: como o agente age quando a condição é atendida ────────────────
const EXECUTION_FIELDS: FieldDef[] = [
  { key: 'scale_budget_base_pct', label: 'Escala Base (%)',            unit: 'PCT', fallback: 10,   hint: 'Aumento mínimo ao escalar — aplicado quando a campanha acabou de passar no threshold de CTR.' },
  { key: 'scale_budget_max_pct',  label: 'Escala Máxima (%)',          unit: 'PCT', fallback: 25,   hint: 'Teto de aumento em % — campanhas excepcionais chegam aqui. Manter ≤25% para não resetar o aprendizado do Meta.' },
  { key: 'scale_ratio_cap',       label: 'CTR Cap (×threshold)',       unit: 'NUM', fallback: 3.0,  hint: 'Multiplicador de CTR que atinge a escala máxima. Ex: 3.0 = campanha com 3× o CTR-alvo recebe o % máximo.' },
  { key: 'downscale_budget_pct',  label: 'Redução de Budget (%)',      unit: 'PCT', fallback: 30,   hint: 'Quanto reduzir o orçamento ao downscalar (defensivo, automático).' },
  { key: 'scale_budget_max',      label: 'Teto Absoluto (R$)',         unit: 'BRL', fallback: 0,    hint: 'Limite máximo em R$ por adset ao escalar (0 = sem teto). Sobrescreve o % máximo.' },
  { key: 'scale_budget_pct',      label: 'Escala Legada (%)',          unit: 'PCT', fallback: 20,   hint: 'Fallback fixo usado apenas se "Escala Base" não estiver configurada. Deixe em branco para usar o cálculo proporcional.' },
];

// ── Sinais & Aprendizado ─────────────────────────────────────────────────────
const SIGNAL_FIELDS: FieldDef[] = [
  { key: 'cpm_delta_max',         label: 'CPM Delta Máx',              unit: 'PCT', fallback: 0.20, hint: 'Variação % de CPM acima disto dispara alerta de custo elevado.' },
  { key: 'fir_floor',             label: 'First Impression Ratio Mín', unit: 'NUM', fallback: 0.20, hint: 'Proporção mínima de impressões únicas (0 a 1). Abaixo disto indica saturação.' },
  { key: 'learning_conv_target',  label: 'Conversões p/ Sair do Learning', unit: 'NUM', fallback: 50, hint: 'Conversões que o Meta exige neste segmento para encerrar a fase de aprendizado.' },
  { key: 'pressure_w_engagement', label: 'Peso Engagement (Pressão)',  unit: 'NUM', fallback: 0.40, hint: 'Peso do engagement_rate_ranking no índice de pressão (soma dos 3 pesos = 1).' },
  { key: 'pressure_w_conversion', label: 'Peso Conversão (Pressão)',   unit: 'NUM', fallback: 0.35, hint: 'Peso do conversion_rate_ranking no índice de pressão.' },
  { key: 'pressure_w_quality',    label: 'Peso Qualidade (Pressão)',   unit: 'NUM', fallback: 0.25, hint: 'Peso do quality_ranking no índice de pressão (engagement + conversão + qualidade = 1).' },
];

const ALL_FIELDS = [...DETECTION_FIELDS, ...EXECUTION_FIELDS, ...SIGNAL_FIELDS];

// ── Field: componente de nível de módulo para evitar remount a cada keystroke ──
interface FieldProps {
  f: FieldDef;
  value: string;
  onChange: (key: string, val: string) => void;
}

function Field({ f, value, onChange }: FieldProps) {
  return (
    <div>
      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
        {f.label}
        {f.unit !== 'NUM' && (
          <span className="ml-1 font-medium normal-case text-gray-400">
            ({f.unit === 'BRL' ? 'R$' : '%'})
          </span>
        )}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(f.key, e.target.value)}
        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm font-medium
                   focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 outline-none"
      />
      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{f.hint}</p>
    </div>
  );
}

// ── Modal principal ──────────────────────────────────────────────────────────
export function SegmentBenchmarksModal({ segment, onClose }: Props) {
  const [values, setValues]   = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saveOk, setSaveOk]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch(`/api/admin/master/segments/${segment.id}/benchmarks`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const rows: Array<{ metric_key: string; value: string | number }> = d.benchmarks ?? [];
        const map: Record<string, string> = {};
        for (const f of ALL_FIELDS) {
          const found = rows.find(r => r.metric_key === f.key);
          map[f.key] = found != null ? String(Number(found.value)) : String(f.fallback);
        }
        setValues(map);
      })
      .catch(() => {
        const map: Record<string, string> = {};
        for (const f of ALL_FIELDS) map[f.key] = String(f.fallback);
        setValues(map);
      })
      .finally(() => setLoading(false));
  }, [segment.id]);

  function handleChange(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaveOk(false);
    try {
      const benchmarks = ALL_FIELDS.map(f => ({
        metric_key:   f.key,
        metric_label: f.label,
        unit:         f.unit,
        value:        parseFloat(values[f.key] ?? String(f.fallback)) || 0,
      }));
      const res = await fetch(`/api/admin/master/segments/${segment.id}/benchmarks`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ benchmarks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-indigo-500" />
            <div>
              <h2 className="text-lg font-black text-gray-900">Parâmetros do Agente</h2>
              <p className="text-xs text-gray-500">
                Segmento: <span className="font-semibold">{segment.name}</span>
                <span className="ml-2 text-gray-400">— precedência: cliente → tenant → segmento → global</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Carregando parâmetros…</div>
          ) : (
            <>
              {/* Detecção */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <EyeIcon className="h-4 w-4 text-indigo-500" />
                  <h3 className="text-xs font-black text-indigo-700 uppercase tracking-widest">Detecção — Quando agir</h3>
                  <div className="flex-1 h-px bg-indigo-100" />
                </div>
                <p className="text-[11px] text-gray-500 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-3">
                  Limites que o agente compara com os dados reais de cada campanha para decidir
                  se deve pausar, reduzir budget, sugerir escala ou emitir alertas.
                </p>
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                  {DETECTION_FIELDS.map(f => (
                    <Field key={f.key} f={f} value={values[f.key] ?? ''} onChange={handleChange} />
                  ))}
                </div>
              </section>

              {/* Execução */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <BoltIcon className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-black text-amber-700 uppercase tracking-widest">Execução — Como agir</h3>
                  <div className="flex-1 h-px bg-amber-100" />
                </div>
                <p className="text-[11px] text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                  Percentuais e tetos usados na execução real das ações de budget.
                  Nenhum valor está fixo no código — tudo vem daqui.
                </p>
                <div className="grid grid-cols-3 gap-x-5 gap-y-4">
                  {EXECUTION_FIELDS.map(f => (
                    <Field key={f.key} f={f} value={values[f.key] ?? ''} onChange={handleChange} />
                  ))}
                </div>
              </section>

              {/* Sinais & Aprendizado */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <SignalIcon className="h-4 w-4 text-slate-500" />
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Sinais & Aprendizado</h3>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
                <p className="text-[11px] text-gray-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-3">
                  Parâmetros do signal engine e da fase de aprendizado do Meta.
                  Variam por segmento — um e-commerce e uma clínica têm realidades de CPM e conversão completamente diferentes.
                </p>
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                  {SIGNAL_FIELDS.map(f => (
                    <Field key={f.key} f={f} value={values[f.key] ?? ''} onChange={handleChange} />
                  ))}
                </div>
              </section>
            </>
          )}

          {error && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white
                       bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {saveOk
              ? <><CheckCircleIcon className="h-4 w-4" /> Salvo!</>
              : saving ? 'Salvando…' : 'Salvar Parâmetros'}
          </button>
        </div>
      </div>
    </div>
  );
}
