'use client';

/**
 * Config padrão do "ativo" vinculado a um lead (imóvel, veículo, etc), por segmento —
 * docs/CHECKPOINT.md, 2026-08-14. Cada tenant desse segmento herda isso automaticamente em
 * /crm/config/segmentos (Vínculo Exato do Novo Lead + Enriquecimento da ficha), podendo
 * sobrepor com a própria config lá.
 */

import { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, CheckCircleIcon, QuestionMarkCircleIcon, ChevronUpIcon, ChevronDownIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

interface Badge { label: string; campo: string; icone: string; prefixo?: string; sufixo?: string; full_width?: boolean }
interface FormField { name: string; label: string; type: string; required: boolean }

interface AtivoConfig {
  target_table: string;
  target_fk_column: string;
  target_name_column: string;
  target_label: string;
  layout_json: { title_template?: string; subtitle_template?: string; badges?: Badge[] };
  form_schema_json: FormField[];
  is_active?: boolean;
}

interface Segment { id: string; name: string; slug: string }
interface Props { segment: Segment; onClose: () => void }

const EMPTY: AtivoConfig = {
  target_table: '',
  target_fk_column: 'imovel_id',
  target_name_column: '',
  target_label: '',
  layout_json: { title_template: '', subtitle_template: '', badges: [] },
  form_schema_json: [],
};

export function SegmentAtivoConfigModal({ segment, onClose }: Props) {
  const [config, setConfig] = useState<AtivoConfig>(EMPTY);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/master/segments/${segment.id}/ativo-config`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.config) {
          setConfig({
            ...d.config,
            layout_json: d.config.layout_json && Object.keys(d.config.layout_json).length ? d.config.layout_json : EMPTY.layout_json,
            form_schema_json: d.config.form_schema_json || [],
          });
          setExists(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [segment.id]);

  const update = (patch: Partial<AtivoConfig>) => setConfig(prev => ({ ...prev, ...patch }));

  const badges = config.layout_json.badges || [];
  const updateBadges = (next: Badge[]) => update({ layout_json: { ...config.layout_json, badges: next } });
  const addBadge = () => updateBadges([...badges, { label: 'Nova Label', campo: '', icone: 'map-pin' }]);
  const updateBadge = (i: number, patch: Partial<Badge>) => updateBadges(badges.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  const removeBadge = (i: number) => updateBadges(badges.filter((_, idx) => idx !== i));
  const moveBadge = (i: number, dir: -1 | 1) => {
    const arr = [...badges]; const t = i + dir;
    if (t < 0 || t >= arr.length) return;
    [arr[i], arr[t]] = [arr[t], arr[i]]; updateBadges(arr);
  };

  const fields = config.form_schema_json;
  const updateFields = (next: FormField[]) => update({ form_schema_json: next });
  const addField = () => updateFields([...fields, { name: '', label: 'Novo Campo', type: 'text', required: false }]);
  const updateField = (i: number, patch: Partial<FormField>) => updateFields(fields.map((f, idx) => idx === i ? { ...f, ...patch } : f));
  const removeField = (i: number) => updateFields(fields.filter((_, idx) => idx !== i));

  // Vínculo Exato é opcional — mas ou os 3 campos de identificação vêm juntos (tabela real
  // digitalizada), ou nenhum deles (segmento só com Perfil de Interesse). Nunca meio-preenchido.
  const ativoFieldsCount = [config.target_table, config.target_name_column, config.target_label].filter(v => v && v.trim()).length;
  const ativoPartial = ativoFieldsCount > 0 && ativoFieldsCount < 3;
  const canSave = !saving && !ativoPartial;

  async function suggestFields() {
    setSuggesting(true); setSuggestError('');
    try {
      const res = await fetch(`/api/admin/master/segments/${segment.id}/ativo-config`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao sugerir campos');
      // Sugestão só popula a lista — nunca salva sozinha. Revisão/edição/remoção continua
      // manual, e o "Salvar" no rodapé é sempre a confirmação humana.
      const suggested: FormField[] = (data.fields || []).map((f: any) => ({
        name: f.name, label: f.label, type: f.type, required: !!f.required,
      }));
      updateFields([...fields, ...suggested]);
    } catch (e: any) {
      setSuggestError(e.message ?? 'Erro ao sugerir campos');
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSave() {
    setSaving(true); setError(''); setSaveOk(false);
    try {
      const res = await fetch(`/api/admin/master/segments/${segment.id}/ativo-config`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setExists(true);
      setSaveOk(true);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">
              Segmento · {segment.name}
            </p>
            <h2 className="text-lg font-black text-gray-900">Config do Ativo (Vínculo Exato + Perfil de Interesse)</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              "Origem dos Dados" é opcional: só preencha se este segmento já tem uma tabela real
              de inventário digitalizada (imóvel, veículo, plano...). Sem ela, "Vínculo Exato"
              fica indisponível no Novo Lead — mas "Perfil de Interesse" (o formulário mais
              abaixo) funciona de qualquer jeito, mesmo sem nenhum inventário cadastrado.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={() => setShowHelp(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all',
                showHelp ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100',
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {showHelp && (
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4 space-y-2 text-xs text-gray-600">
              <p><span className="font-black text-gray-900">Entidade/Tabela</span>: nome real da tabela no banco (ex.: <code>imoveis</code>, <code>veiculos</code>) — precisa existir de verdade e ter uma coluna <code>id</code> como PK.</p>
              <p><span className="font-black text-gray-900">Coluna de nome</span>: qual coluna dessa tabela mostra o "nome" do item na busca (ex.: <code>titulo</code>).</p>
              <p><span className="font-black text-gray-900">Rótulo</span>: como chamar o item em português na tela (ex.: "Imóvel", "Veículo") — usado nos textos do Novo Lead.</p>
              <p><span className="font-black text-gray-900">Badges</span>: quais colunas aparecem na ficha do lead quando ele está vinculado a um item exato. <span className="font-black text-gray-900">Formulário</span>: campos livres pra quando o lead descreve só um perfil de interesse (sem item exato).</p>
              <p><span className="font-black text-gray-900">Obrig.</span> (nos campos do Formulário): efeito real, não decorativo — se marcado, o atendente não consegue finalizar um "Novo Lead" pela aba Perfil de Interesse sem preencher aquele campo (bloqueia no próprio modal, antes de salvar). <span className="font-black text-gray-900">"Sugerir com IA"</span> propõe 1-2 campos como obrigatórios por padrão (geralmente "o que o cliente quer" e algum campo de orçamento) — os demais ficam opcionais de propósito, pra não travar o cadastro manual com fricção desnecessária. É só um ponto de partida: revise e marque/desmarque como fizer sentido pro negócio antes de salvar.</p>
              <p>Cada tenant deste segmento pode sobrepor tudo isso na própria conta dele, em <span className="font-mono">/crm/config/segmentos</span> — isto aqui é só o padrão inicial.</p>
            </div>
          )}

          {error && <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>}

          {loading ? (
            <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />
          ) : (
            <>
              {!exists && (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-gray-500">Nenhuma config ainda pra este segmento</p>
                  <p className="text-xs text-gray-400 mt-1">Preencha abaixo e salve pra criar o padrão.</p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Origem dos Dados</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Entidade / Tabela</label>
                    <input value={config.target_table} onChange={e => update({ target_table: e.target.value })}
                      placeholder="ex: veiculos" className={cn(inputCls, 'w-full font-mono')} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Rótulo (PT-BR)</label>
                    <input value={config.target_label} onChange={e => update({ target_label: e.target.value })}
                      placeholder="ex: Veículo" className={cn(inputCls, 'w-full')} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Coluna de Nome</label>
                    <input value={config.target_name_column} onChange={e => update({ target_name_column: e.target.value })}
                      placeholder="ex: titulo" className={cn(inputCls, 'w-full font-mono')} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400">Coluna FK (em leads_staging)</label>
                    <input value={config.target_fk_column} onChange={e => update({ target_fk_column: e.target.value })}
                      className={cn(inputCls, 'w-full font-mono opacity-70')} />
                  </div>
                </div>
                {ativoPartial && (
                  <p className="text-xs text-amber-600 font-medium">
                    ⚠️ Preencha Entidade/Tabela, Coluna de Nome e Rótulo juntos pra ativar
                    Vínculo Exato — ou apague os {ativoFieldsCount} campos preenchidos pra usar
                    só Perfil de Interesse.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Badges na ficha do lead ({badges.length})
                    <span className="ml-2 font-normal normal-case text-gray-300">só usados com Vínculo Exato configurado acima</span>
                  </p>
                  <button onClick={addBadge} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100">
                    <PlusIcon className="h-4 w-4" />
                  </button>
                </div>
                {badges.map((b, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50/60 border border-gray-200 rounded-xl p-2.5">
                    <select value={b.icone} onChange={e => updateBadge(i, { icone: e.target.value })} className={cn(inputCls, 'col-span-2 py-1')}>
                      <option value="map-pin">📍</option>
                      <option value="bed">🛏️</option>
                      <option value="bath">🚿</option>
                      <option value="dollar-sign">💵</option>
                      <option value="maximize">📐</option>
                      <option value="car-front">🚗</option>
                    </select>
                    <input value={b.label} onChange={e => updateBadge(i, { label: e.target.value })} placeholder="Rótulo" className={cn(inputCls, 'col-span-3 py-1')} />
                    <input value={b.campo} onChange={e => updateBadge(i, { campo: e.target.value })} placeholder="coluna_bd" className={cn(inputCls, 'col-span-3 py-1 font-mono text-emerald-600')} />
                    <input value={b.prefixo || ''} onChange={e => updateBadge(i, { prefixo: e.target.value })} placeholder="Pref." className={cn(inputCls, 'col-span-1 py-1')} />
                    <input value={b.sufixo || ''} onChange={e => updateBadge(i, { sufixo: e.target.value })} placeholder="Suf." className={cn(inputCls, 'col-span-1 py-1')} />
                    <div className="col-span-2 flex items-center justify-end gap-0.5">
                      <button onClick={() => moveBadge(i, -1)} className="p-1 text-gray-400 hover:text-amber-600"><ChevronUpIcon className="h-3.5 w-3.5" /></button>
                      <button onClick={() => moveBadge(i, 1)} className="p-1 text-gray-400 hover:text-amber-600"><ChevronDownIcon className="h-3.5 w-3.5" /></button>
                      <button onClick={() => removeBadge(i)} className="p-1 text-gray-300 hover:text-red-500"><TrashIcon className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Formulário — Perfil de Interesse ({fields.length})</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={suggestFields}
                      disabled={suggesting}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 disabled:opacity-50 text-[10px] font-black uppercase tracking-wide"
                      title="A IA sugere campos — você revisa, edita ou remove antes de salvar"
                    >
                      <SparklesIcon className="h-3.5 w-3.5" />
                      {suggesting ? 'Sugerindo...' : 'Sugerir com IA'}
                    </button>
                    <button onClick={addField} className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100">
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {suggestError && <p className="text-xs text-red-600 font-medium">⚠️ {suggestError}</p>}
                {fields.map((f, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50/60 border border-gray-200 rounded-xl p-2.5">
                    <select value={f.type} onChange={e => updateField(i, { type: e.target.value })} className={cn(inputCls, 'col-span-2 py-1')}>
                      <option value="text">Texto</option>
                      <option value="number">Número</option>
                      <option value="currency">Moeda</option>
                      <option value="select">Lista</option>
                    </select>
                    <input value={f.label} onChange={e => updateField(i, { label: e.target.value })} placeholder="Rótulo" className={cn(inputCls, 'col-span-4 py-1')} />
                    <input value={f.name} onChange={e => updateField(i, { name: e.target.value })} placeholder="nome_variavel" className={cn(inputCls, 'col-span-3 py-1 font-mono text-purple-600')} />
                    <label className="col-span-2 flex items-center gap-1 text-[10px] font-bold text-gray-500">
                      <input type="checkbox" checked={f.required} onChange={e => updateField(i, { required: e.target.checked })} className="accent-purple-600" />
                      Obrig.
                    </label>
                    <button onClick={() => removeField(i)} className="col-span-1 p-1 text-gray-300 hover:text-red-500 justify-self-end"><TrashIcon className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
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
          <button onClick={handleSave} disabled={!canSave}
            className={cn('px-5 py-2 rounded-xl text-sm font-black text-white transition-all',
              !canSave ? 'bg-gray-300 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 shadow-sm')}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
