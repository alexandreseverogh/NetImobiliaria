'use client';

/**
 * FASE 18.3 — Editor de Ângulos + Termos de Trends por segmento.
 * "Sugerir com IA" (LLM) → admin revisa/edita → Salva em segment_angle_terms.
 */

import { useState, useEffect } from 'react';
import { XMarkIcon, SparklesIcon, CheckCircleIcon, PlusIcon, TrashIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

/* ── Painel de ajuda ─────────────────────────────────────────────────── */
function AnglesHelpPanel() {
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 space-y-4 text-sm text-gray-700">
      <div>
        <p className="font-black text-gray-900 mb-1">Para que serve esta tela</p>
        <p className="text-xs text-gray-600">
          Define os <span className="font-semibold">ÂNGULOS da mensagem publicitária</span> — o "por quê" que leva
          o prospect a agir. O que você salvar aqui vira <span className="font-semibold">opção de 1 clique</span> no
          wizard de campanha de todos os tenants deste segmento, e alimenta o{' '}
          <span className="font-semibold">Radar de Demanda</span> via Google Trends.
        </p>
      </div>

      <div>
        <p className="font-black text-gray-900 mb-1">O que é um ângulo</p>
        <p className="text-xs text-gray-600 mb-2">
          É a razão emocional ou racional pela qual o público-alvo age. O mesmo produto pode ser
          anunciado por ângulos diferentes — e o ângulo certo dobra a taxa de conversão sem mudar
          o investimento.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-1 pr-3 font-bold">Segmento</th>
                <th className="py-1 pr-3 font-bold">Exemplos de ângulos</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-t border-violet-100">
                <td className="py-1 pr-3 font-semibold">Imobiliário</td>
                <td className="py-1">Preço Acessível · Localização Premium · Investimento · Primeira Casa</td>
              </tr>
              <tr className="border-t border-violet-100">
                <td className="py-1 pr-3 font-semibold">Saúde</td>
                <td className="py-1">Praticidade · Custo-benefício · Cobertura Ampla · Família</td>
              </tr>
              <tr className="border-t border-violet-100">
                <td className="py-1 pr-3 font-semibold">Veículos</td>
                <td className="py-1">Economia · Status · Segurança · Zero km · Financiamento</td>
              </tr>
              <tr className="border-t border-violet-100">
                <td className="py-1 pr-3 font-semibold">Educação</td>
                <td className="py-1">Empregabilidade · Renda Extra · Flexibilidade · Aprovação</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="font-black text-gray-900 mb-1">Termos de Trends — o que são e como usá-los</p>
        <p className="text-xs text-gray-600 mb-1.5">
          Cada ângulo tem <span className="font-semibold">1 a 4 termos</span> que representam como as pessoas
          realmente buscam no Google quando estão naquele estado mental. A plataforma consulta o Google Trends
          com esses termos para medir se o ângulo está <span className="font-semibold text-violet-700">aquecendo ou esfriando</span>.
        </p>
        <ul className="text-xs text-gray-600 space-y-0.5">
          <li>✅ Bom: específico e com intenção clara — <span className="font-mono bg-white rounded px-1">"financiamento imobiliário"</span></li>
          <li>❌ Evitar: genérico demais — <span className="font-mono bg-white rounded px-1">"imóvel"</span> — todo mundo busca, não diferencia intenção</li>
          <li>💡 Use variações reais de como o público fala, não jargão técnico</li>
        </ul>
      </div>

      <div>
        <p className="font-black text-gray-900 mb-1">Onde esses dados se propagam</p>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>
            <span className="font-semibold text-violet-700">Wizard de campanha</span> — o gerente escolhe
            o ângulo principal antes de criar; a IA gera copy alinhada ao ângulo selecionado.
          </li>
          <li>
            <span className="font-semibold text-violet-700">Radar de Demanda</span> — mostra qual ângulo
            está em alta no Google Trends → sugere alocar mais budget ali e pausar os que estão caindo.
          </li>
          <li>
            <span className="font-semibold text-violet-700">Agente Autônomo</span> — ao sugerir
            REFRESH_CREATIVE ou SCALE, menciona explicitamente o ângulo vencedor e o perdedor para embasar a recomendação.
          </li>
          <li>
            <span className="font-semibold text-violet-700">Insights de criativos</span> — performance
            por ângulo (qual gerou menor CPL) para orientar próximas criações.
          </li>
        </ul>
      </div>

      <div>
        <p className="font-black text-gray-900 mb-1">Boas práticas</p>
        <ul className="text-xs text-gray-600 space-y-0.5">
          <li>📐 <span className="font-semibold">3 a 6 ângulos</span> por segmento — mais dificulta a análise comparativa</li>
          <li>🔒 <span className="font-semibold">Slug estável</span> — não mude após lançar campanhas; dados históricos ficam atrelados ao slug</li>
          <li>📈 Ordene do mais <span className="font-semibold">emocional</span> (maior conversão TOFU) para o mais racional</li>
          <li>🔄 Revise trimestralmente — ângulos que funcionavam podem saturar</li>
        </ul>
      </div>
    </div>
  );
}

interface Angle { slug: string; label: string; terms: string[] }
interface Segment { id: string; name: string; slug: string }

interface Props {
  segment: Segment;
  onClose: () => void;
}

export function SegmentAnglesModal({ segment, onClose }: Props) {
  const [angles, setAngles]   = useState<Angle[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saveOk, setSaveOk]   = useState(false);
  const [error, setError]     = useState('');
  const [showHelp, setShowHelp] = useState(false);

  /* ── carregar ângulos atuais ── */
  useEffect(() => {
    fetch(`/api/admin/master/segments/${segment.id}/angles`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setAngles(Array.isArray(d.angles) ? d.angles : []))
      .catch(() => setAngles([]))
      .finally(() => setLoading(false));
  }, [segment.id]);

  /* ── sugerir com IA ── */
  async function handleSuggest() {
    setSuggesting(true); setError(''); setSaveOk(false);
    try {
      const res = await fetch(`/api/admin/master/segments/${segment.id}/angles`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao sugerir');
      setAngles(Array.isArray(data.angles) ? data.angles : []);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao sugerir ângulos');
    } finally {
      setSuggesting(false);
    }
  }

  /* ── edição local ── */
  const updateAngle = (i: number, patch: Partial<Angle>) =>
    setAngles(prev => prev.map((a, idx) => idx === i ? { ...a, ...patch } : a));
  const removeAngle = (i: number) => setAngles(prev => prev.filter((_, idx) => idx !== i));
  const addAngle    = () => setAngles(prev => [...prev, { slug: '', label: '', terms: [''] }]);
  const updateTerm  = (ai: number, ti: number, val: string) =>
    setAngles(prev => prev.map((a, idx) => idx === ai
      ? { ...a, terms: a.terms.map((t, tj) => tj === ti ? val : t) } : a));
  const addTerm     = (ai: number) =>
    setAngles(prev => prev.map((a, idx) => idx === ai ? { ...a, terms: [...a.terms, ''] } : a));
  const removeTerm  = (ai: number, ti: number) =>
    setAngles(prev => prev.map((a, idx) => idx === ai
      ? { ...a, terms: a.terms.filter((_, tj) => tj !== ti) } : a));

  /* ── salvar ── */
  async function handleSave() {
    setSaving(true); setError(''); setSaveOk(false);
    try {
      const clean = angles
        .map(a => ({ ...a, terms: a.terms.map(t => t.trim()).filter(Boolean) }))
        .filter(a => a.label.trim());
      const res = await fetch(`/api/admin/master/segments/${segment.id}/angles`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angles: clean }),
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
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">
              Segmento · {segment.name}
            </p>
            <h2 className="text-lg font-black text-gray-900">Ângulos & Termos de Demanda</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Vértices do Radar de Demanda e opções de ângulo no wizard. Os termos medem a demanda
              no Google Trends. Use a IA para propor e ajuste como quiser.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={() => setShowHelp(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all',
                showHelp
                  ? 'bg-violet-600 text-white'
                  : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100',
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {showHelp && <AnglesHelpPanel />}

          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {angles.length} ângulo(s)
            </p>
            <button onClick={handleSuggest} disabled={suggesting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-black uppercase tracking-wide hover:bg-violet-700 transition-all disabled:opacity-60">
              {suggesting
                ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sugerindo...</>
                : <><SparklesIcon className="h-3.5 w-3.5" /> Sugerir com IA</>}
            </button>
          </div>

          {error && <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : angles.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <SparklesIcon className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Nenhum ângulo configurado</p>
              <p className="text-xs text-gray-400 mt-1">Clique em "Sugerir com IA" ou adicione manualmente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {angles.map((a, ai) => (
                <div key={ai} className="rounded-xl border border-gray-200 p-3 bg-gray-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <input value={a.label}
                      onChange={e => updateAngle(ai, { label: e.target.value })}
                      placeholder="Rótulo (ex: Preço Acessível)"
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <input value={a.slug}
                      onChange={e => updateAngle(ai, { slug: e.target.value })}
                      placeholder="slug"
                      className="w-40 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    <button onClick={() => removeAngle(ai)} className="text-gray-300 hover:text-red-500 p-1">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center pl-1">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Trends:</span>
                    {a.terms.map((t, ti) => (
                      <span key={ti} className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-full pl-2.5 pr-1 py-0.5">
                        <input value={t}
                          onChange={e => updateTerm(ai, ti, e.target.value)}
                          placeholder="termo de busca"
                          className="text-xs text-gray-700 bg-transparent focus:outline-none"
                          style={{ width: `${Math.max(8, t.length + 2)}ch` }} />
                        <button onClick={() => removeTerm(ai, ti)} className="text-gray-300 hover:text-red-500">
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    <button onClick={() => addTerm(ai)}
                      className="inline-flex items-center gap-0.5 text-[11px] text-indigo-500 hover:text-indigo-700 font-semibold">
                      <PlusIcon className="h-3 w-3" /> termo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={addAngle}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all">
            <PlusIcon className="h-3.5 w-3.5" /> Adicionar ângulo
          </button>
        </div>

        {/* Footer */}
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
              saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm')}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
