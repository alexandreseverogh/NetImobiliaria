"use client";
import { useState, useEffect, useCallback } from 'react';
import {
  MegaphoneIcon, PlusIcon, XMarkIcon, ArrowTopRightOnSquareIcon,
  PhotoIcon, ArrowPathIcon, ExclamationTriangleIcon, CheckCircleIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import { CreateGuard } from '@/components/admin/PermissionGuard';
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector';

interface OrganicPost {
  id: string;
  platform: string;
  format: string;
  status: string;
  externalPostId: string | null;
  permalinkUrl: string | null;
  errorMessage: string | null;
  caption?: string | null;
}

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  DRAFT:      { label: 'Rascunho',  cls: 'bg-gray-100 text-gray-600 border-gray-200',          dot: 'bg-gray-400' },
  SCHEDULED:  { label: 'Agendado',  cls: 'bg-blue-50 text-blue-700 border-blue-100',           dot: 'bg-blue-500' },
  PUBLISHING: { label: 'Publicando',cls: 'bg-amber-50 text-amber-700 border-amber-100',        dot: 'bg-amber-500' },
  PUBLISHED:  { label: 'Publicado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100',  dot: 'bg-emerald-500' },
  FAILED:     { label: 'Falhou',    cls: 'bg-red-50 text-red-600 border-red-100',              dot: 'bg-red-500' },
};

const CAPTION_MAX = 2200;

export default function PublicacoesPage() {
  const [posts, setPosts]     = useState<OrganicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);

  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('publicacoes');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (clientFilter !== 'all') params.set('clientId', clientFilter);
      const res  = await fetch(`/api/admin/campanhas/organic?${params}`);
      const data = await res.json();
      if (res.ok) setPosts(data.posts ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [clientFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-4 py-6 bg-gray-50 min-h-screen">
      <div className="w-full max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Campanhas</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Publicações Orgânicas</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">Publique criativos na página sem impulsionar — separado do fluxo pago</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ClientSelector
              value={clientFilter}
              onChange={setClientFilter}
              clients={clients}
              loading={clientsLoading}
              storageKey="publicacoes"
              variant="toggle"
            />
            <CreateGuard resource="publicacoes-organicas">
              <button onClick={() => setShowComposer(true)}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-lg shadow-emerald-500/20">
                <MegaphoneIcon className="h-4 w-4" /> Nova Publicação
              </button>
            </CreateGuard>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 h-24 animate-pulse" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <MegaphoneIcon className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-black text-gray-900 mb-1">Nenhuma publicação ainda</p>
            <p className="text-xs text-gray-400 mb-6">Crie sua primeira publicação orgânica na página</p>
            <CreateGuard resource="publicacoes-organicas">
              <button onClick={() => setShowComposer(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20">
                <PlusIcon className="h-3.5 w-3.5" /> Criar publicação
              </button>
            </CreateGuard>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(p => {
              const sm = STATUS_META[p.status] ?? STATUS_META.DRAFT;
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border ${sm.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />{sm.label}
                        </span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                          {p.platform === 'facebook' ? '📘 Facebook' : '📸 Instagram'} · {p.format}
                        </span>
                      </div>
                      {p.caption && <p className="text-sm text-gray-700 line-clamp-2">{p.caption}</p>}
                      {p.status === 'FAILED' && p.errorMessage && (
                        <p className="text-xs text-red-600 mt-1.5 flex items-start gap-1">
                          <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />{p.errorMessage}
                        </p>
                      )}
                    </div>
                    {p.permalinkUrl && (
                      <a href={p.permalinkUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0">
                        Ver post <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showComposer && (
        <Composer
          clientId={clientFilter}
          onClose={() => setShowComposer(false)}
          onPublished={() => { setShowComposer(false); load(); }}
        />
      )}
    </div>
  );
}

/* ── Composer ───────────────────────────────────────────────────────── */

function Composer({ clientId, onClose, onPublished }: { clientId: string; onClose: () => void; onPublished: () => void }) {
  const [platform, setPlatform]   = useState<'facebook' | 'instagram'>('facebook');
  const [postType, setPostType]   = useState<'feed' | 'video' | 'reel' | 'story'>('feed');
  const [storyKind, setStoryKind] = useState<'image' | 'video'>('image');
  const [caption, setCaption]     = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput]   = useState('');
  const [confirming, setConfirming] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError]         = useState('');

  const format = postType === 'feed'
    ? (mediaUrls.length > 1 ? 'carousel' : mediaUrls.length === 1 ? 'image' : 'text')
    : postType;
  const mediaIsVideo = postType === 'video' || postType === 'reel' || (postType === 'story' && storyKind === 'video');

  const canPublish = (() => {
    if (postType === 'video' || postType === 'reel' || postType === 'story') return mediaUrls.length >= 1;
    // feed: Instagram exige mídia; Facebook aceita texto puro
    return platform === 'instagram' ? mediaUrls.length > 0 : (caption.trim().length > 0 || mediaUrls.length > 0);
  })();
  const platformLabel = platform === 'facebook' ? 'Página do Facebook' : 'Instagram';

  const POST_TYPES = [
    { value: 'feed',  label: 'Feed' },
    { value: 'video', label: 'Vídeo' },
    { value: 'reel',  label: 'Reels' },
    { value: 'story', label: 'Stories' },
  ] as const;

  function addUrl() {
    const u = urlInput.trim();
    if (u && !mediaUrls.includes(u)) { setMediaUrls([...mediaUrls, u]); setUrlInput(''); }
  }

  async function handlePublish() {
    setPublishing(true);
    setError('');
    try {
      const res = await fetch('/api/admin/campanhas/organic/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId !== 'all' ? clientId : null,
          platform,
          format,
          caption: caption.trim() || undefined,
          mediaUrls,
          mediaKind: postType === 'story' ? storyKind : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao publicar');
      onPublished();
    } catch (e: any) {
      setError(e.message);
      setConfirming(false);
    } finally {
      setPublishing(false);
    }
  }

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 rounded-xl"><MegaphoneIcon className="h-4 w-4 text-emerald-600" /></div>
            <h2 className="text-sm font-black text-gray-900">Nova Publicação Orgânica</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><XMarkIcon className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Destino — Facebook ou Instagram */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Destino</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPlatform('facebook')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  platform === 'facebook' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                }`}>
                📘 Página do Facebook
              </button>
              <button type="button" onClick={() => setPlatform('instagram')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                  platform === 'instagram' ? 'bg-pink-50 text-pink-700 border-pink-300 ring-2 ring-pink-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                }`}>
                📸 Instagram
              </button>
            </div>
            {platform === 'instagram' && (
              <p className="text-[11px] text-pink-600 mt-1.5 font-medium">
                O Instagram exige ao menos uma mídia (URL pública) — não há post somente texto.
              </p>
            )}
          </div>

          {/* Formato */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Formato</label>
            <div className="flex gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1 w-fit">
              {POST_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setPostType(t.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                    postType === t.value ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            {postType === 'story' && (
              <div className="flex items-center gap-2 mt-2.5">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mídia do story:</span>
                {(['image', 'video'] as const).map(k => (
                  <button key={k} type="button" onClick={() => setStoryKind(k)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      storyKind === k ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-white text-gray-500 border-gray-200'
                    }`}>
                    {k === 'image' ? 'Imagem' : 'Vídeo'}
                  </button>
                ))}
              </div>
            )}
            {(postType === 'reel' || postType === 'video') && (
              <p className="text-[11px] text-gray-400 mt-1.5">
                {postType === 'reel' ? 'Reels: vídeo vertical 9:16.' : 'Vídeo de feed.'} Informe a URL pública do vídeo abaixo.
              </p>
            )}
          </div>

          {/* Legenda */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Texto da publicação</label>
              <span className={`text-[10px] font-bold ${caption.length > CAPTION_MAX ? 'text-red-500' : 'text-gray-400'}`}>
                {caption.length}/{CAPTION_MAX}
              </span>
            </div>
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={4}
              maxLength={CAPTION_MAX} placeholder="Escreva a legenda do post..." className={inputCls} />
          </div>

          {/* Imagens por URL */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              {mediaIsVideo ? 'Vídeo (URL pública)' : 'Imagens (URL pública)'}
              {postType === 'feed' && ' — opcional'}
            </label>
            <div className="flex gap-2">
              <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                placeholder="https://..." className={inputCls} />
              <button onClick={addUrl} className="px-4 py-2.5 bg-gray-900 text-white text-xs font-black uppercase rounded-xl hover:bg-gray-700 shrink-0">
                Add
              </button>
            </div>
            {mediaUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {mediaUrls.map((u, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg pl-2 pr-1 py-1">
                    <PhotoIcon className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-[11px] text-gray-600 max-w-[160px] truncate">{u}</span>
                    <button onClick={() => setMediaUrls(mediaUrls.filter(x => x !== u))} className="text-gray-400 hover:text-red-500">
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {postType === 'feed' && (
              <p className="text-[11px] text-gray-400 mt-1.5">
                Formato detectado: <strong>{format === 'text' ? 'Texto' : format === 'image' ? 'Foto única' : 'Carrossel'}</strong>
              </p>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />{error}
            </div>
          )}
        </div>

        {/* Footer — confirmação dupla */}
        <div className="px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          {!confirming ? (
            <button onClick={() => setConfirming(true)} disabled={!canPublish}
              className="w-full py-3 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 active:scale-95 disabled:opacity-40 transition-all">
              Publicar em {platformLabel}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-center text-gray-600 font-medium flex items-center justify-center gap-1.5">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                Isto publicará conteúdo <strong>público</strong> em <strong>{platformLabel}</strong>. Confirmar?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirming(false)} disabled={publishing}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-xs font-black uppercase rounded-xl hover:bg-gray-200 disabled:opacity-40">
                  Cancelar
                </button>
                <button onClick={handlePublish} disabled={publishing}
                  className="flex-1 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {publishing ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Publicando...</> : <><CheckCircleIcon className="h-3.5 w-3.5" /> Confirmar</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
