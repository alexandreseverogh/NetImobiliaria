'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DocumentTextIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  BeakerIcon,
  GlobeAltIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

/* ── tipos ─────────────────────────────────────────────────── */

interface PromptTemplate {
  id: string;
  template_key: string;
  version: number;
  title: string;
  content: string;
  variables: string[] | null;
  is_active: boolean;
  segment_id: string | null;
  segment_name: string | null;
  segment_slug: string | null;
  content_length: number;
  created_at: string;
  updated_at: string;
}

interface SegmentOption {
  id: string;
  name: string;
  slug: string;
}

/* ── modal de edição ────────────────────────────────────────── */

function PromptModal({
  prompt,
  segments,
  onClose,
  onSaved,
}: {
  prompt: PromptTemplate;
  segments: SegmentOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState<'editor' | 'testar'>('editor');

  // editor state
  const [title, setTitle]     = useState(prompt.title);
  const [content, setContent] = useState(prompt.content);
  const [isActive, setIsActive] = useState(prompt.is_active);
  // '' = Geral (segment_id NULL); uuid = override de segmento
  const [segmentId, setSegmentId] = useState<string>(prompt.segment_id ?? '');
  const [saving, setSaving]   = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // testar state
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState<{
    rendered: string; response: string; unresolved: string[]; ms: number;
  } | null>(null);
  const [testError, setTestError] = useState('');

  // Detecta variáveis do conteúdo atual
  const detectedVars = [...new Set(
    [...content.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1])
  )];

  async function handleSave() {
    setSaving(true); setSaveMsg('');
    try {
      const res = await fetch(`/api/admin/master/prompts/${prompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          content,
          is_active: isActive,
          segment_id: segmentId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaveMsg('Salvo com sucesso!');
      onSaved();
    } catch (e: any) {
      setSaveMsg(`Erro: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  // Cria uma variação do prompt para o segmento selecionado, mantendo o original intacto.
  async function handleDuplicate() {
    setDuplicating(true); setSaveMsg('');
    try {
      const res = await fetch('/api/admin/master/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ source_id: prompt.id, segment_id: segmentId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSaveMsg('Variação criada com sucesso!');
      onSaved();
    } catch (e: any) {
      setSaveMsg(`Erro: ${e.message}`);
    } finally {
      setDuplicating(false);
    }
  }

  async function handleTest() {
    setTesting(true); setTestError(''); setTestResult(null);
    try {
      const res = await fetch(`/api/admin/master/prompts/${prompt.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content, variables: varValues }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTestResult(data);
    } catch (e: any) {
      setTestError(e.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-start justify-between rounded-t-2xl shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                {prompt.template_key}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-[10px] text-slate-400">v{prompt.version}</span>
              {prompt.segment_name ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-700/50">
                  <TagIcon className="h-3 w-3" />{prompt.segment_name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                  <GlobeAltIcon className="h-3 w-3" />Global
                </span>
              )}
            </div>
            <h2 className="text-lg font-black truncate">{title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white ml-4 shrink-0 text-xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0 bg-gray-50">
          {(['editor', 'testar'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2',
                tab === t
                  ? 'border-indigo-600 text-indigo-600 bg-white'
                  : 'border-transparent text-gray-400 hover:text-gray-600',
              )}
            >
              {t === 'editor' ? (
                <span className="flex items-center gap-1.5"><PencilSquareIcon className="h-3.5 w-3.5" />Editor</span>
              ) : (
                <span className="flex items-center gap-1.5"><BeakerIcon className="h-3.5 w-3.5" />Testar com LLM</span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── ABA EDITOR ── */}
          {tab === 'editor' && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {/* Título */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Título</label>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {/* Ativo */}
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded accent-indigo-600"
                    />
                    <span className="text-sm font-bold text-gray-700">Template ativo</span>
                  </label>
                </div>
              </div>

              {/* Segmento associado */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Segmento associado
                </label>
                <select
                  value={segmentId}
                  onChange={e => setSegmentId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">🌐 Geral — todos os segmentos (fallback)</option>
                  {segments.map(s => (
                    <option key={s.id} value={s.id}>🏷️ {s.name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1.5 leading-relaxed">
                  <strong>Geral</strong> vale para todos os segmentos que não tiverem um prompt próprio.
                  Um segmento específico <strong>sobrepõe</strong> o Geral só para aquele segmento.
                  Use <strong>Duplicar</strong> para criar uma variante sem apagar o Geral.
                </p>
              </div>

              {/* Variáveis detectadas */}
              {detectedVars.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Variáveis:</span>
                  {detectedVars.map(v => (
                    <span key={v} className="text-[11px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}

              {/* Textarea principal */}
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  Conteúdo do Prompt
                  <span className="ml-2 normal-case font-medium text-gray-300">{content.length} chars</span>
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={20}
                  spellCheck={false}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y leading-relaxed bg-gray-50"
                />
              </div>
            </div>
          )}

          {/* ── ABA TESTAR ── */}
          {tab === 'testar' && (
            <div className="p-6 space-y-5">
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
                Testa o conteúdo do editor acima com o LLM global configurado na plataforma. Preencha as variáveis antes de disparar.
              </div>

              {/* Campos de variáveis */}
              {detectedVars.length > 0 ? (
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                    Valores das variáveis ({detectedVars.length})
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {detectedVars.map(v => (
                      <div key={v}>
                        <label className="block text-[10px] font-mono text-indigo-600 mb-1">{`{{${v}}}`}</label>
                        <input
                          value={varValues[v] ?? ''}
                          onChange={e => setVarValues(prev => ({ ...prev, [v]: e.target.value }))}
                          placeholder={`Valor para ${v}...`}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Nenhuma variável detectada — o prompt será enviado diretamente.</p>
              )}

              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-black uppercase tracking-wide hover:bg-violet-700 transition-all disabled:opacity-60"
              >
                {testing
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Chamando LLM...</>
                  : <><SparklesIcon className="h-4 w-4" /> Disparar LLM</>}
              </button>

              {testError && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
                  ❌ {testError}
                </div>
              )}

              {testResult && (
                <div className="space-y-4">
                  {testResult.unresolved.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 text-xs text-amber-600">
                      ⚠️ Variáveis não preenchidas: {testResult.unresolved.map(v => `{{${v}}}`).join(', ')}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Prompt renderizado</p>
                      <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-72">
                        {testResult.rendered}
                      </pre>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        Resposta do LLM
                        <span className="normal-case font-medium text-gray-300">{testResult.ms}ms</span>
                      </p>
                      <pre className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-72">
                        {testResult.response}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
          <p className={cn(
            'text-xs font-semibold',
            saveMsg.startsWith('Erro') ? 'text-red-600' : 'text-emerald-600',
          )}>
            {saveMsg}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-white transition-all">
              Fechar
            </button>
            <button onClick={handleDuplicate} disabled={duplicating || saving}
              title="Cria um novo prompt para o segmento selecionado, mantendo este intacto"
              className="px-4 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-black hover:bg-violet-100 transition-all disabled:opacity-60">
              {duplicating ? 'Duplicando...' : 'Duplicar p/ segmento'}
            </button>
            <button onClick={handleSave} disabled={saving || duplicating}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all disabled:opacity-60 shadow-sm">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── página principal ───────────────────────────────────────── */

const PROVIDER_COLORS: Record<string, string> = {
  segment: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  global:  'bg-slate-100 text-slate-600 border-slate-200',
};

export default function MasterPromptsPage() {
  const [prompts, setPrompts]   = useState<PromptTemplate[]>([]);
  const [segments, setSegments] = useState<SegmentOption[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState<PromptTemplate | null>(null);
  const [search, setSearch]     = useState('');

  // Lista de segmentos — sempre do banco (system_segments), nunca hardcoded
  useEffect(() => {
    fetch('/api/system/segments', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setSegments(d.segments ?? []))
      .catch(() => setSegments([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/master/prompts', { credentials: 'include' });
      const data = await res.json();
      // Garantir que variables é sempre um array
      const normalizedPrompts = (data.prompts ?? []).map((p: any) => ({
        ...p,
        variables: Array.isArray(p.variables) ? p.variables : (p.variables ? Object.keys(p.variables) : [])
      }));
      setPrompts(normalizedPrompts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = prompts.filter(p =>
    !search ||
    p.template_key.includes(search.toLowerCase()) ||
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.segment_name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  // Agrupa por template_key
  const grouped = filtered.reduce<Record<string, PromptTemplate[]>>((acc, p) => {
    if (!acc[p.template_key]) acc[p.template_key] = [];
    acc[p.template_key].push(p);
    return acc;
  }, {});

  const totalActive = prompts.filter(p => p.is_active).length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <DocumentTextIcon className="h-8 w-8 text-indigo-600" />
            Editor de Prompts
          </h1>
          <p className="text-gray-500 mt-1.5 font-medium text-sm">
            {prompts.length} templates · {totalActive} ativos · edite o conteúdo e teste com o LLM real
          </p>
        </div>
        <input
          type="search"
          placeholder="Buscar por chave, título ou segmento..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-72 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl bg-gray-200 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([key, rows]) => (
            <div key={key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Key header */}
              <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <span className="text-xs font-mono font-black text-gray-500 tracking-wide">{key}</span>
                <span className="text-[10px] text-gray-300">({rows.length} variante{rows.length > 1 ? 's' : ''})</span>
              </div>

              {/* Rows */}
              {rows.map(p => (
                <div key={p.id}
                  className="flex items-center gap-4 px-5 py-3.5 border-b last:border-0 border-gray-50 hover:bg-indigo-50/30 transition-colors">

                  {/* Active badge */}
                  <div className="shrink-0">
                    {p.is_active
                      ? <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                      : <XCircleIcon    className="h-4 w-4 text-gray-300" />}
                  </div>

                  {/* Title + segment */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{p.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">v{p.version} · {p.content_length} chars</p>
                  </div>

                  {/* Segment pill */}
                  <div className="shrink-0">
                    {p.segment_name ? (
                      <span className={cn(
                        'inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border',
                        PROVIDER_COLORS.segment,
                      )}>
                        <TagIcon className="h-3 w-3" />{p.segment_name}
                      </span>
                    ) : (
                      <span className={cn(
                        'inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full border',
                        PROVIDER_COLORS.global,
                      )}>
                        <GlobeAltIcon className="h-3 w-3" />Global
                      </span>
                    )}
                  </div>

                  {/* Variables */}
                  <div className="hidden lg:flex items-center gap-1 shrink-0 max-w-[260px] flex-wrap">
                    {(p.variables ?? []).slice(0, 4).map(v => (
                      <span key={v} className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {`{{${v}}}`}
                      </span>
                    ))}
                    {(p.variables ?? []).length > 4 && (
                      <span className="text-[10px] text-gray-400">+{(p.variables ?? []).length - 4}</span>
                    )}
                  </div>

                  {/* Edit button */}
                  <button
                    onClick={() => setEditing(p)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                  >
                    <PencilSquareIcon className="h-3.5 w-3.5" />
                    Editar
                  </button>
                </div>
              ))}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <DocumentTextIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">Nenhum template encontrado</p>
            </div>
          )}
        </div>
      )}

      {editing && (
        <PromptModal
          prompt={editing}
          segments={segments}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
