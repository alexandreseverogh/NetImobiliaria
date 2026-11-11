"use client";
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/auth/adminFetch';
import { ClipboardDocumentListIcon, PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

/**
 * Formulário de Perfil de Interesse do lead (campos extras capturados na criação do lead,
 * gravados em leads_staging.raw_json). Editável pelo próprio tenant.
 *
 * Padrão do segmento (curado pelo Master) vale até o tenant salvar o próprio formulário — a
 * partir daí o tenant tem um override. "Restaurar padrão do segmento" remove o override.
 * Nomes de campos já existentes ficam travados: são chaves dos leads já cadastrados.
 */

type Campo = { name: string; label: string; type: 'text' | 'number'; required: boolean; isNew?: boolean };

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function slugify(label: string): string {
  const base = label
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!base) return '';
  return /^[a-z]/.test(base) ? base : `campo_${base}`;
}

export function FormularioLeadSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [personalizado, setPersonalizado] = useState(false);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [original, setOriginal] = useState<Campo[]>([]);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/crm/config/segmentos');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Falha ao carregar');
      const lista: Campo[] = (data.effective?.formSchemaJson || []).map((f: any) => ({
        name: f.name,
        label: f.label,
        type: f.type === 'number' ? 'number' : 'text',
        required: !!f.required,
      }));
      setCampos(lista);
      setOriginal(lista);
      setPersonalizado(!!data.tenantOverride);
    } catch (e: any) {
      setErro(e.message || 'Erro ao carregar o formulário');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const atualizar = (idx: number, patch: Partial<Campo>) =>
    setCampos(prev => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const adicionar = () =>
    setCampos(prev => [...prev, { name: '', label: '', type: 'text', required: false, isNew: true }]);

  const remover = (idx: number) => setCampos(prev => prev.filter((_, i) => i !== idx));

  const mover = (idx: number, delta: -1 | 1) =>
    setCampos(prev => {
      const j = idx + delta;
      if (j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[idx], copia[j]] = [copia[j], copia[idx]];
      return copia;
    });

  const alterado = JSON.stringify(campos.map(({ isNew, ...c }) => c)) !== JSON.stringify(original);

  const validar = (): string | null => {
    const nomes = new Set<string>();
    for (const c of campos) {
      if (!c.label.trim()) return 'Todo campo precisa de um rótulo.';
      const nome = c.name.trim();
      if (!IDENT_RE.test(nome)) return `Nome inválido para "${c.label}". Use letras, números e _, começando por letra.`;
      if (nomes.has(nome)) return `Nome duplicado: "${nome}".`;
      nomes.add(nome);
    }
    return null;
  };

  const salvar = async () => {
    setErro(null);
    setSucesso(null);
    const invalido = validar();
    if (invalido) return setErro(invalido);
    setSaving(true);
    try {
      const body = {
        form_only: true,
        form_schema_json: campos.map(c => ({
          name: c.name.trim(),
          label: c.label.trim(),
          type: c.type,
          required: c.required,
        })),
      };
      const res = await adminFetch('/api/crm/config/segmentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha ao salvar');
      setSucesso('Formulário salvo. Os leads passam a usar estes campos.');
      await carregar();
    } catch (e: any) {
      setErro(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const restaurar = async () => {
    if (!window.confirm('Restaurar o formulário padrão do segmento? As perguntas personalizadas desta empresa serão removidas.')) return;
    setErro(null);
    setSucesso(null);
    setRestoring(true);
    try {
      const res = await adminFetch('/api/crm/config/segmentos', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Falha ao restaurar');
      setSucesso('Padrão do segmento restaurado.');
      await carregar();
    } catch (e: any) {
      setErro(e.message || 'Erro ao restaurar');
    } finally {
      setRestoring(false);
    }
  };

  const inputCls = 'w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
        <div className="p-2 bg-gold-premium/10 rounded-xl">
          <ClipboardDocumentListIcon className="h-5 w-5 text-gold-premium" />
        </div>
        <div>
          <h2 className="text-sm font-black text-gray-900">Formulário de Perfil de Interesse</h2>
          <p className="text-xs text-gray-400 mt-0.5">Perguntas que o atendente registra sobre o interesse do lead ao cadastrá-lo no CRM</p>
        </div>
      </div>
      <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${personalizado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
          {personalizado ? 'Personalizado para esta empresa' : 'Padrão do segmento'}
        </span>
        {personalizado && (
          <button
            type="button"
            onClick={restaurar}
            disabled={restoring}
            className="text-xs font-bold text-amber-600 hover:text-amber-500 disabled:opacity-50"
          >
            {restoring ? 'Restaurando…' : 'Restaurar padrão do segmento'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-400">Carregando…</p>
      ) : (
        <div className="space-y-3">
          {campos.length === 0 && (
            <p className="text-xs italic text-gray-400">Nenhuma pergunta configurada. Adicione abaixo.</p>
          )}
          {campos.map((c, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl border border-gray-100 bg-white">
              <div className="col-span-12 md:col-span-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rótulo</label>
                <input
                  className={inputCls}
                  value={c.label}
                  onChange={e => {
                    const label = e.target.value;
                    atualizar(idx, { label, ...(c.isNew ? { name: slugify(label) } : {}) });
                  }}
                  placeholder="Ex.: Faixa de orçamento"
                />
              </div>
              <div className="col-span-12 md:col-span-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nome interno</label>
                <input
                  className={inputCls}
                  value={c.name}
                  disabled={!c.isNew}
                  onChange={e => atualizar(idx, { name: e.target.value })}
                  placeholder="gerado a partir do rótulo"
                />
                {!c.isNew && <p className="text-[10px] text-gray-400 mt-1">Travado: leads já cadastrados usam esta chave.</p>}
              </div>
              <div className="col-span-6 md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tipo</label>
                <select className={inputCls} value={c.type} onChange={e => atualizar(idx, { type: e.target.value as 'text' | 'number' })}>
                  <option value="text">Texto</option>
                  <option value="number">Número</option>
                </select>
              </div>
              <label className="col-span-6 md:col-span-1 flex items-center gap-1.5 text-xs font-bold text-gray-600 pb-2.5">
                <input type="checkbox" checked={c.required} onChange={e => atualizar(idx, { required: e.target.checked })} />
                Obrig.
              </label>
              <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-1 pb-1">
                <button type="button" onClick={() => mover(idx, -1)} disabled={idx === 0} className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Subir">
                  <ArrowUpIcon className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => mover(idx, 1)} disabled={idx === campos.length - 1} className="p-2 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Descer">
                  <ArrowDownIcon className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => remover(idx)} className="p-2 text-red-500 hover:text-red-400" title="Remover pergunta">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <button type="button" onClick={adicionar} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-500">
            <PlusIcon className="h-4 w-4" /> Adicionar pergunta
          </button>

          {erro && <p className="text-xs font-bold text-red-600">{erro}</p>}
          {sucesso && <p className="text-xs font-bold text-emerald-600">{sucesso}</p>}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={salvar}
              disabled={!alterado || saving}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-gold-premium text-navy-dark disabled:opacity-40"
            >
              {saving ? 'Salvando…' : 'Salvar formulário'}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
