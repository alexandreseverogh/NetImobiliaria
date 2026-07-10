'use client';

/**
 * M4.2 (Ponto 3c) — "Dados do Bot": quais tabelas/colunas/relações o bot de um
 * segmento pode consultar (mensageria.segment_data_entities). Zero SQL — o Master
 * cadastra aqui, o genericResolver.ts vira ferramenta automaticamente pro LLM.
 */

import { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, PlusIcon, TrashIcon, QuestionMarkCircleIcon, CircleStackIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

interface Column {
  name: string;
  type: 'text' | 'number' | 'boolean';
  description: string;
  selectable: boolean;
  filterable: boolean;
}
interface Relation {
  name: string;
  description: string;
  bridge_table: string;
  bridge_fk: string;
  base_pk: string;
  lookup_table: string;
  lookup_fk: string;
  lookup_pk: string;
  select_column: string;
  agg: 'array' | 'count' | 'first';
  max: number;
}
interface Entity {
  entityName: string;
  tableName: string;
  description: string;
  tenantColumn: string;
  defaultFilter: string;
  maxRows: number;
  isActive: boolean;
  columns: Column[];
  relations: Relation[];
}
interface Segment { id: string; name: string; slug: string }

interface Props {
  segment: Segment;
  onClose: () => void;
}

const emptyColumn = (): Column => ({ name: '', type: 'text', description: '', selectable: true, filterable: false });
const emptyRelation = (): Relation => ({
  name: '', description: '', bridge_table: '', bridge_fk: '', base_pk: 'id',
  lookup_table: '', lookup_fk: '', lookup_pk: 'id', select_column: '', agg: 'array', max: 25,
});
const emptyEntity = (): Entity => ({
  entityName: '', tableName: '', description: '', tenantColumn: 'tenant_id', defaultFilter: 'ativo = true',
  maxRows: 5, isActive: true, columns: [emptyColumn()], relations: [],
});

function HelpPanel() {
  return (
    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-3 text-sm text-gray-700">
      <div>
        <p className="font-black text-gray-900 mb-1">Para que serve esta tela</p>
        <p className="text-xs text-gray-600">
          Cada <span className="font-semibold">entidade</span> vira automaticamente uma ferramenta que o
          bot da Mensageria pode chamar durante uma conversa — sem escrever código. O bot só enxerga o
          que você marcar como <span className="font-semibold">selecionável</span> (aparece na resposta)
          ou <span className="font-semibold">filtrável</span> (o LLM pode buscar por isso).
        </p>
      </div>
      <div>
        <p className="font-black text-gray-900 mb-1">Colunas × Relações</p>
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Colunas</span> vêm direto da tabela principal (ex.: `imoveis.bairro`).{' '}
          <span className="font-semibold">Relações</span> trazem dado de tabelas correlacionadas — inclusive
          via uma tabela-ponte + uma tabela de nomes (ex.: imóvel → `imovel_amenidades` → `amenidades.nome`).
          Use "array" pra listas (várias amenidades), "count" pra contagem (nº de fotos), "first" pra 1 valor só.
        </p>
      </div>
      <div>
        <p className="font-black text-gray-900 mb-1">Segurança</p>
        <p className="text-xs text-gray-600">
          O bot nunca escreve SQL. Toda consulta é sempre isolada pelo tenant (coluna configurada em
          "Coluna de tenant") e só toca nas colunas/tabelas que você cadastrar aqui.
        </p>
      </div>
    </div>
  );
}

export function SegmentDataEntitiesModal({ segment, onClose }: Props) {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/master/segments/${segment.id}/data-entities`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const loaded = (Array.isArray(d.entities) ? d.entities : []).map((e: any) => ({
          entityName: e.entityName ?? '',
          tableName: e.tableName ?? '',
          description: e.description ?? '',
          tenantColumn: e.tenantColumn ?? 'tenant_id',
          defaultFilter: e.defaultFilter ?? '',
          maxRows: e.maxRows ?? 5,
          isActive: e.isActive !== false,
          columns: (e.columns ?? []).map((c: any) => ({
            name: c.name ?? '', type: c.type ?? 'text', description: c.description ?? '',
            selectable: !!c.selectable, filterable: !!c.filterable,
          })),
          relations: (e.relations ?? []).map((r: any) => ({
            name: r.name ?? '', description: r.description ?? '', bridge_table: r.bridge_table ?? '',
            bridge_fk: r.bridge_fk ?? '', base_pk: r.base_pk ?? 'id', lookup_table: r.lookup_table ?? '',
            lookup_fk: r.lookup_fk ?? '', lookup_pk: r.lookup_pk ?? 'id', select_column: r.select_column ?? '',
            agg: r.agg ?? 'array', max: r.max ?? 25,
          })),
        }));
        setEntities(loaded);
      })
      .catch(() => setEntities([]))
      .finally(() => setLoading(false));
  }, [segment.id]);

  const updateEntity = (i: number, patch: Partial<Entity>) =>
    setEntities((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const removeEntity = (i: number) => setEntities((prev) => prev.filter((_, idx) => idx !== i));
  const addEntity = () => setEntities((prev) => [...prev, emptyEntity()]);

  const updateColumn = (ei: number, ci: number, patch: Partial<Column>) =>
    setEntities((prev) => prev.map((e, idx) => idx === ei
      ? { ...e, columns: e.columns.map((c, cj) => (cj === ci ? { ...c, ...patch } : c)) } : e));
  const addColumn = (ei: number) =>
    setEntities((prev) => prev.map((e, idx) => (idx === ei ? { ...e, columns: [...e.columns, emptyColumn()] } : e)));
  const removeColumn = (ei: number, ci: number) =>
    setEntities((prev) => prev.map((e, idx) => idx === ei
      ? { ...e, columns: e.columns.filter((_, cj) => cj !== ci) } : e));

  const updateRelation = (ei: number, ri: number, patch: Partial<Relation>) =>
    setEntities((prev) => prev.map((e, idx) => idx === ei
      ? { ...e, relations: e.relations.map((r, rj) => (rj === ri ? { ...r, ...patch } : r)) } : e));
  const addRelation = (ei: number) =>
    setEntities((prev) => prev.map((e, idx) => (idx === ei ? { ...e, relations: [...e.relations, emptyRelation()] } : e)));
  const removeRelation = (ei: number, ri: number) =>
    setEntities((prev) => prev.map((e, idx) => idx === ei
      ? { ...e, relations: e.relations.filter((_, rj) => rj !== ri) } : e));

  async function handleSave() {
    setSaving(true); setError(''); setSaveOk(false);
    try {
      const clean = entities
        .filter((e) => e.entityName.trim() && e.tableName.trim())
        .map((e) => ({
          ...e,
          entityName: e.entityName.trim(),
          tableName: e.tableName.trim(),
          columns: e.columns.filter((c) => c.name.trim()),
          relations: e.relations.filter((r) => r.name.trim() && r.bridge_table.trim() && r.bridge_fk.trim() && r.select_column.trim()),
        }));
      const res = await fetch(`/api/admin/master/segments/${segment.id}/data-entities`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setEntities(clean);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2500);
    } catch (e: any) {
      setError(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">
              Segmento · {segment.name}
            </p>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <CircleStackIcon className="h-5 w-5 text-emerald-500" /> Dados do Bot
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Tabelas que o bot deste segmento pode consultar durante uma conversa — sem código.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={() => setShowHelp((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all',
                showHelp ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100',
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
          {showHelp && <HelpPanel />}

          {error && <p className="text-xs text-red-600 font-medium">⚠️ {error}</p>}

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : entities.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <CircleStackIcon className="h-8 w-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-500">Nenhuma entidade cadastrada</p>
              <p className="text-xs text-gray-400 mt-1">O bot deste segmento ainda não consulta nenhum dado real.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entities.map((e, ei) => (
                <div key={ei} className="rounded-xl border border-gray-200 p-4 bg-gray-50/50">
                  {/* Cabeçalho da entidade */}
                  <div className="flex items-start gap-2 mb-3">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">
                          Nome da entidade (o LLM vê)
                        </label>
                        <input value={e.entityName} onChange={(ev) => updateEntity(ei, { entityName: ev.target.value })}
                          placeholder="ex: imovel" spellCheck={false}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">
                          Tabela física
                        </label>
                        <input value={e.tableName} onChange={(ev) => updateEntity(ei, { tableName: ev.target.value })}
                          placeholder="ex: imoveis" spellCheck={false}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pt-5 shrink-0">
                      <button
                        onClick={() => updateEntity(ei, { isActive: !e.isActive })}
                        className={cn('h-8 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-colors',
                          e.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400')}
                      >
                        {e.isActive ? 'Ativa' : 'Inativa'}
                      </button>
                      <button onClick={() => removeEntity(ei)} className="text-gray-300 hover:text-red-500 p-1.5">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">
                      Descrição (o LLM usa isso pra saber quando chamar esta ferramenta)
                    </label>
                    <textarea value={e.description} onChange={(ev) => updateEntity(ei, { description: ev.target.value })}
                      rows={2} placeholder="ex: Imóveis ativos à venda/locação — use para responder disponibilidade, bairro, preço."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Coluna de tenant</label>
                      <input value={e.tenantColumn} onChange={(ev) => updateEntity(ei, { tenantColumn: ev.target.value })}
                        spellCheck={false}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Filtro padrão</label>
                      <input value={e.defaultFilter} onChange={(ev) => updateEntity(ei, { defaultFilter: ev.target.value })}
                        placeholder="ativo = true" spellCheck={false}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Máx. resultados</label>
                      <input type="number" min={1} max={20} value={e.maxRows}
                        onChange={(ev) => updateEntity(ei, { maxRows: parseInt(ev.target.value, 10) || 5 })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </div>
                  </div>

                  {/* Colunas */}
                  <div className="mb-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Colunas</p>
                    <div className="space-y-1.5">
                      {e.columns.map((c, ci) => (
                        <div key={ci} className="flex items-center gap-1.5 bg-white rounded-lg border border-gray-200 px-2 py-1.5">
                          <input value={c.name} onChange={(ev) => updateColumn(ei, ci, { name: ev.target.value })}
                            placeholder="coluna" spellCheck={false}
                            className="w-32 text-xs font-mono text-gray-800 focus:outline-none" />
                          <select value={c.type} onChange={(ev) => updateColumn(ei, ci, { type: ev.target.value as Column['type'] })}
                            className="text-xs text-gray-600 bg-transparent focus:outline-none">
                            <option value="text">texto</option>
                            <option value="number">número</option>
                            <option value="boolean">booleano</option>
                          </select>
                          <input value={c.description} onChange={(ev) => updateColumn(ei, ci, { description: ev.target.value })}
                            placeholder="descrição pro LLM"
                            className="flex-1 text-xs text-gray-500 focus:outline-none" />
                          <label className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
                            <input type="checkbox" checked={c.selectable} onChange={(ev) => updateColumn(ei, ci, { selectable: ev.target.checked })} />
                            mostra
                          </label>
                          <label className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
                            <input type="checkbox" checked={c.filterable} onChange={(ev) => updateColumn(ei, ci, { filterable: ev.target.checked })} />
                            filtra
                          </label>
                          <button onClick={() => removeColumn(ei, ci)} className="text-gray-300 hover:text-red-500 shrink-0">
                            <XMarkIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => addColumn(ei)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold">
                      <PlusIcon className="h-3 w-3" /> coluna
                    </button>
                  </div>

                  {/* Relações */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                      Relações (tabelas correlacionadas — opcional)
                    </p>
                    <div className="space-y-2">
                      {e.relations.map((r, ri) => (
                        <div key={ri} className="bg-white rounded-lg border border-gray-200 p-2 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <input value={r.name} onChange={(ev) => updateRelation(ei, ri, { name: ev.target.value })}
                              placeholder="nome (ex: amenidades)" spellCheck={false}
                              className="w-32 text-xs font-mono font-bold text-gray-800 focus:outline-none" />
                            <select value={r.agg} onChange={(ev) => updateRelation(ei, ri, { agg: ev.target.value as Relation['agg'] })}
                              className="text-xs text-gray-600 bg-transparent focus:outline-none">
                              <option value="array">lista (array)</option>
                              <option value="count">contagem</option>
                              <option value="first">1 valor</option>
                            </select>
                            <input value={r.description} onChange={(ev) => updateRelation(ei, ri, { description: ev.target.value })}
                              placeholder="descrição pro LLM"
                              className="flex-1 text-xs text-gray-500 focus:outline-none" />
                            <button onClick={() => removeRelation(ei, ri)} className="text-gray-300 hover:text-red-500 shrink-0">
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            <input value={r.bridge_table} onChange={(ev) => updateRelation(ei, ri, { bridge_table: ev.target.value })}
                              placeholder="tabela-ponte" spellCheck={false}
                              className="px-2 py-1 rounded border border-gray-200 text-[11px] font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            <input value={r.bridge_fk} onChange={(ev) => updateRelation(ei, ri, { bridge_fk: ev.target.value })}
                              placeholder="FK p/ entidade" spellCheck={false}
                              className="px-2 py-1 rounded border border-gray-200 text-[11px] font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            <input value={r.lookup_table} onChange={(ev) => updateRelation(ei, ri, { lookup_table: ev.target.value })}
                              placeholder="tabela de nomes (opcional)" spellCheck={false}
                              className="px-2 py-1 rounded border border-gray-200 text-[11px] font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            <input value={r.lookup_fk} onChange={(ev) => updateRelation(ei, ri, { lookup_fk: ev.target.value })}
                              placeholder="FK p/ tabela de nomes" spellCheck={false}
                              className="px-2 py-1 rounded border border-gray-200 text-[11px] font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                          </div>
                          <div className="grid grid-cols-4 gap-1.5">
                            <input value={r.select_column} onChange={(ev) => updateRelation(ei, ri, { select_column: ev.target.value })}
                              placeholder="coluna a trazer" spellCheck={false}
                              className="px-2 py-1 rounded border border-gray-200 text-[11px] font-mono text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            <input value={r.base_pk} onChange={(ev) => updateRelation(ei, ri, { base_pk: ev.target.value })}
                              placeholder="PK da entidade" spellCheck={false}
                              className="px-2 py-1 rounded border border-gray-200 text-[11px] font-mono text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            <input value={r.lookup_pk} onChange={(ev) => updateRelation(ei, ri, { lookup_pk: ev.target.value })}
                              placeholder="PK da tabela de nomes" spellCheck={false}
                              className="px-2 py-1 rounded border border-gray-200 text-[11px] font-mono text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            {r.agg === 'array' && (
                              <input type="number" min={1} max={50} value={r.max}
                                onChange={(ev) => updateRelation(ei, ri, { max: parseInt(ev.target.value, 10) || 25 })}
                                placeholder="teto de itens"
                                className="px-2 py-1 rounded border border-gray-200 text-[11px] text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => addRelation(ei)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold">
                      <PlusIcon className="h-3 w-3" /> relação
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={addEntity}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-gray-300 text-xs font-bold text-gray-500 hover:border-emerald-300 hover:text-emerald-600 transition-all">
            <PlusIcon className="h-3.5 w-3.5" /> Adicionar entidade
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
              saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-sm')}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
