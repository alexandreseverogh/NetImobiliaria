'use client';

import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, MagnifyingGlassIcon, BoltIcon, CheckCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/marketing-utils';

/* ── Painel de ajuda (genérico, multi-segmento) ──────────────────────── */
function InterestsHelpPanel() {
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-4 text-sm text-gray-700">
      <div>
        <p className="font-black text-gray-900 mb-1">Para que serve esta tela</p>
        <p className="text-xs text-gray-600">
          Define <span className="font-semibold">QUEM</span> vê os anúncios (público/segmentação no Meta).
          O que você salvar aqui vira sugestão de 1 clique no wizard de campanha para todos os tenants
          deste segmento. Os IDs são reais da Meta API — válidos para targeting.
        </p>
      </div>

      <div>
        <p className="font-black text-gray-900 mb-1">Regra de ouro: camadas que se cruzam</p>
        <p className="text-xs text-gray-600 mb-2">
          Não jogue uma lista solta de interesses. Combine <span className="font-semibold">1 da camada de
          intenção + 1 ou 2 das outras</span>. Muitos interesses juntos (mais de 5–6) diluem o público e o
          algoritmo do Meta perde foco.
        </p>
        <ul className="text-xs text-gray-600 space-y-1 list-none">
          <li><span className="font-semibold text-indigo-700">1. Intenção</span> — quem está comprando/contratando agora (o que mais converte)</li>
          <li><span className="font-semibold text-indigo-700">2. Estágio de vida / gatilho</span> — quem está prestes a precisar</li>
          <li><span className="font-semibold text-indigo-700">3. Comportamento adjacente</span> — sinais de poder de compra ou afinidade</li>
        </ul>
      </div>

      <div>
        <p className="font-black text-gray-900 mb-1">Exemplos por segmento (a lógica vale para qualquer nicho)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-gray-400">
                <th className="py-1 pr-3 font-bold">Segmento</th>
                <th className="py-1 pr-3 font-bold">Intenção</th>
                <th className="py-1 font-bold">Contexto (estágio / comportamento)</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-t border-indigo-100">
                <td className="py-1 pr-3 font-semibold">Imobiliário</td>
                <td className="py-1 pr-3">Financiamento imobiliário, Compra de imóveis</td>
                <td className="py-1">Recém-casados, Decoração, Investimentos</td>
              </tr>
              <tr className="border-t border-indigo-100">
                <td className="py-1 pr-3 font-semibold">Saúde</td>
                <td className="py-1 pr-3">Plano de saúde, Telemedicina</td>
                <td className="py-1">Bem-estar, Academia, Pais</td>
              </tr>
              <tr className="border-t border-indigo-100">
                <td className="py-1 pr-3 font-semibold">Veículos</td>
                <td className="py-1 pr-3">Compra de carro, Financiamento de veículos</td>
                <td className="py-1">Test drive, Marcas de carro, Viagens</td>
              </tr>
              <tr className="border-t border-indigo-100">
                <td className="py-1 pr-3 font-semibold">Educação</td>
                <td className="py-1 pr-3">Cursos online, Vestibular</td>
                <td className="py-1">Carreira, Concursos, Jovens adultos</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="font-black text-gray-900 mb-1">Erros que reduzem o retorno</p>
        <ul className="text-xs text-gray-600 space-y-0.5">
          <li>❌ Interesse genérico demais (público gigante e raso) — cruze sempre com intenção</li>
          <li>❌ Muitos interesses (mais de 5–6) — o Meta não consegue otimizar</li>
          <li>❌ Interesses sem conexão com a oferta — cliques caros sem conversão</li>
        </ul>
      </div>
    </div>
  );
}

interface Interest { id: string; name: string; audienceLower?: number; audienceUpper?: number; }
interface Segment  { id: string; name: string; slug: string; }

interface Props {
  segment: Segment;
  network?: string;
  onClose: () => void;
}

function formatAudienceSize(lower?: number, upper?: number): string | null {
  if (!lower) return null;
  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(0)}M` :
    n >= 1_000     ? `${(n / 1_000).toFixed(0)}K`     : String(n);
  return upper ? `${fmt(lower)}–${fmt(upper)}` : `${fmt(lower)}+`;
}

export function SegmentInterestsModal({ segment, network = 'meta', onClose }: Props) {
  const [saved, setSaved]         = useState<Interest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saveOk, setSaveOk]       = useState(false);
  const [showHelp, setShowHelp]   = useState(false);

  // Search state
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<Interest[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  /* ── Load current interests ── */
  useEffect(() => {
    fetch(`/api/admin/master/segments/${segment.id}/interests?network=${network}`, {
      credentials: 'include',
    })
      .then(r => r.json())
      .then(d => setSaved(Array.isArray(d.interests) ? d.interests : []))
      .catch(() => setSaved([]))
      .finally(() => setLoading(false));
  }, [segment.id, network]);

  /* ── Meta Targeting Search ── */
  async function searchMeta(q: string) {
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true); setSearchMsg('');
    try {
      const res  = await fetch(
        `/api/admin/campanhas/interests/search?q=${encodeURIComponent(q.trim())}`,
        { credentials: 'include' },
      );
      const data = await res.json();
      if (data.configured === false) {
        setSearchMsg('Token Meta não configurado. Configure em Configurações → Redes.');
        setResults([]);
      } else if (data.message) {
        setSearchMsg(data.message);
        setResults(data.data || []);
      } else {
        setResults(data.data || []);
      }
    } catch {
      setSearchMsg('Erro de conexão com a Meta API.');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchMeta(value), 350);
  }

  /* ── Manage saved interests ── */
  function addInterest(item: Interest) {
    if (saved.some(s => s.id === item.id)) return;
    setSaved(prev => [...prev, { id: item.id, name: item.name }]);
    setSaveOk(false);
  }

  function removeInterest(id: string) {
    setSaved(prev => prev.filter(s => s.id !== id));
    setSaveOk(false);
  }

  /* ── Save ── */
  async function handleSave() {
    setSaving(true); setSaveOk(false);
    try {
      await fetch(`/api/admin/master/segments/${segment.id}/interests`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ network, interests: saved }),
      });
      setSaveOk(true);
    } finally {
      setSaving(false);
    }
  }

  const filteredResults = results.filter(r => !saved.some(s => s.id === r.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">
              Segmento · {segment.name}
            </p>
            <h2 className="text-lg font-black text-gray-900">Interesses Sugeridos — Meta Ads</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Estes interesses aparecerão como sugestões de 1 clique no wizard de campanha para todos
              os tenants deste segmento.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={() => setShowHelp(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all',
                showHelp
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100',
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {showHelp && <InterestsHelpPanel />}

          {/* Current saved list */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Interesses configurados ({saved.length})
            </p>
            {loading ? (
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-8 w-28 rounded-full bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : saved.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center">
                <BoltIcon className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">Nenhum interesse configurado ainda</p>
                <p className="text-xs text-gray-400 mt-1">
                  Busque abaixo para adicionar interesses com IDs reais da Meta API.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {saved.map(item => (
                  <span key={item.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-sm text-indigo-700 font-medium">
                    {item.name}
                    <button onClick={() => removeInterest(item.id)}
                      className="text-indigo-300 hover:text-red-500 transition-colors">
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Buscar na Meta API
            </p>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                placeholder="Ex: imóveis, construção civil, financiamento..."
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
              />
              {searching && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {searchMsg && (
              <p className="text-xs text-amber-600 font-medium">⚠️ {searchMsg}</p>
            )}

            {filteredResults.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-400 font-medium">
                  {filteredResults.length} resultado(s) — clique para adicionar
                </p>
                <div className="flex flex-wrap gap-2">
                  {filteredResults.map(item => {
                    const aud = formatAudienceSize(item.audienceLower, item.audienceUpper);
                    return (
                      <button key={item.id} onClick={() => addInterest(item)}
                        className="group flex items-center gap-2 text-xs px-3 py-2 rounded-xl border border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50 transition-all">
                        <span>+ {item.name}</span>
                        {aud && (
                          <span className="text-[9px] font-bold text-gray-400 group-hover:text-indigo-400 bg-gray-100 group-hover:bg-indigo-100 rounded-full px-1.5 py-0.5 transition-all">
                            {aud}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {query.length >= 2 && !searching && filteredResults.length === 0 && !searchMsg && (
              <p className="text-xs text-gray-400">Nenhum resultado encontrado para "{query}".</p>
            )}

            {/* Meta ID info */}
            {query.length === 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex items-start gap-2.5">
                <span className="text-base shrink-0">🔑</span>
                <p className="text-xs text-gray-500">
                  Os resultados incluem IDs numéricos reais da Meta API (ex: <code className="font-mono bg-gray-100 px-1 rounded">6003107902433</code>).
                  Esses IDs são válidos para o targeting de campanhas — não são inventados.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-400">
            {saved.length} interesse{saved.length !== 1 ? 's' : ''} configurado{saved.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-3">
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
              className={cn(
                'px-5 py-2 rounded-xl text-sm font-black text-white transition-all',
                saving
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm',
              )}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
