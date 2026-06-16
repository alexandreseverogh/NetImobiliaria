"use client";
import { useState, useEffect, useCallback } from 'react';
import {
  MegaphoneIcon, PlusIcon, XMarkIcon, ArrowTopRightOnSquareIcon,
  PhotoIcon, ArrowPathIcon, ExclamationTriangleIcon, CheckCircleIcon, TrashIcon,
} from '@heroicons/react/24/outline';
import { CreateGuard } from '@/components/admin/PermissionGuard';
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector';
import DateInputPtBR from '@/components/ui/DateInputPtBR';

interface OrganicPost {
  id: string;
  platform: string;
  format: string;
  status: string;
  externalPostId: string | null;
  permalinkUrl: string | null;
  errorMessage: string | null;
  caption?: string | null;
  scheduledAt?: string | null;
  createdAt?: string;
}

const IG_DAILY_LIMIT = 100;

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
  const [view, setView]       = useState<'list' | 'calendar'>('list');
  const [insights, setInsights] = useState<Record<string, Record<string, number> | 'loading' | 'error'>>({});

  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('publicacoes');

  async function cancelPost(id: string) {
    if (!confirm('Cancelar/remover esta publicação?')) return;
    const res = await fetch(`/api/admin/campanhas/organic/${id}`, { method: 'DELETE' });
    if (res.ok) setPosts(p => p.filter(x => x.id !== id));
  }

  async function loadInsights(id: string) {
    setInsights(s => ({ ...s, [id]: 'loading' }));
    try {
      const res = await fetch(`/api/admin/campanhas/organic/${id}/insights`);
      const data = await res.json();
      setInsights(s => ({ ...s, [id]: res.ok ? data.insights : 'error' }));
    } catch {
      setInsights(s => ({ ...s, [id]: 'error' }));
    }
  }

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

  // Contador de rate-limit do Instagram: publicações IG nas últimas 24h
  const igLast24h = posts.filter(p => {
    if (p.platform !== 'instagram' || p.status !== 'PUBLISHED' || !p.createdAt) return false;
    return Date.now() - new Date(p.createdAt).getTime() < 24 * 60 * 60 * 1000;
  }).length;

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
            <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
              {(['list', 'calendar'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                    view === v ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}>
                  {v === 'list' ? 'Lista' : 'Calendário'}
                </button>
              ))}
            </div>
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
        ) : view === 'calendar' ? (
          <CalendarView posts={posts} />
        ) : (
          <div className="space-y-3">
            {posts.map(p => {
              const sm = STATUS_META[p.status] ?? STATUS_META.DRAFT;
              const ins = insights[p.id];
              const canCancel = ['DRAFT', 'SCHEDULED', 'FAILED'].includes(p.status);
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
                        {p.status === 'SCHEDULED' && p.scheduledAt && (
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-wide bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                            🗓 {new Date(p.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                      {p.caption && <p className="text-sm text-gray-700 line-clamp-2">{p.caption}</p>}
                      {p.status === 'FAILED' && p.errorMessage && (
                        <p className="text-xs text-red-600 mt-1.5 flex items-start gap-1">
                          <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />{p.errorMessage}
                        </p>
                      )}
                      {/* Insights */}
                      {ins && ins !== 'loading' && ins !== 'error' && (
                        <div className="flex gap-4 mt-2.5">
                          {Object.entries(ins).map(([k, v]) => (
                            <div key={k}>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{k}</p>
                              <p className="text-sm font-black text-gray-800">{v}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {ins === 'error' && <p className="text-[11px] text-amber-600 mt-1.5">Métricas indisponíveis (requer credenciais/permissões).</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {p.permalinkUrl && (
                        <a href={p.permalinkUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                          Ver post <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {p.status === 'PUBLISHED' && (
                        <button onClick={() => loadInsights(p.id)} disabled={ins === 'loading'}
                          className="text-[11px] font-black text-gray-500 hover:text-gray-800 flex items-center gap-1 disabled:opacity-50">
                          {ins === 'loading' ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : '📊'} Métricas
                        </button>
                      )}
                      {canCancel && (
                        <button onClick={() => cancelPost(p.id)}
                          className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1">
                          <TrashIcon className="h-3 w-3" /> {p.status === 'SCHEDULED' ? 'Cancelar' : 'Remover'}
                        </button>
                      )}
                    </div>
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
          igLast24h={igLast24h}
          onClose={() => setShowComposer(false)}
          onPublished={() => { setShowComposer(false); load(); }}
        />
      )}
    </div>
  );
}

/* ── Calendário ─────────────────────────────────────────────────────── */

function CalendarView({ posts }: { posts: OrganicPost[] }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  const year = month.getFullYear(), mon = month.getMonth();
  const firstWeekday = new Date(year, mon, 1).getDay();
  const daysInMonth  = new Date(year, mon + 1, 0).getDate();
  const monthLabel   = month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Agrupa posts (agendados pela data agendada; demais pela criação) por dia do mês exibido
  const byDay = new Map<number, OrganicPost[]>();
  for (const p of posts) {
    const ref = p.scheduledAt || p.createdAt;
    if (!ref) continue;
    const d = new Date(ref);
    if (d.getFullYear() !== year || d.getMonth() !== mon) continue;
    const day = d.getDate();
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(p);
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const todayN = (new Date().getFullYear() === year && new Date().getMonth() === mon) ? new Date().getDate() : -1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonth(new Date(year, mon - 1, 1))} className="px-3 py-1.5 rounded-lg text-sm font-black text-gray-500 hover:bg-gray-100">←</button>
        <h2 className="text-sm font-black text-gray-900 capitalize">{monthLabel}</h2>
        <button onClick={() => setMonth(new Date(year, mon + 1, 1))} className="px-3 py-1.5 rounded-lg text-sm font-black text-gray-500 hover:bg-gray-100">→</button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
          <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest py-1">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className={`min-h-[72px] rounded-lg border p-1.5 ${day === null ? 'border-transparent' : day === todayN ? 'border-indigo-300 bg-indigo-50/40' : 'border-gray-100'}`}>
            {day !== null && (
              <>
                <span className={`text-[11px] font-bold ${day === todayN ? 'text-indigo-600' : 'text-gray-400'}`}>{day}</span>
                <div className="mt-1 space-y-1">
                  {(byDay.get(day) ?? []).slice(0, 3).map(p => {
                    const sm = STATUS_META[p.status] ?? STATUS_META.DRAFT;
                    return (
                      <div key={p.id} className={`text-[9px] font-bold px-1 py-0.5 rounded truncate border ${sm.cls}`}
                        title={`${p.platform} · ${p.status}${p.caption ? ' — ' + p.caption : ''}`}>
                        {p.platform === 'facebook' ? '📘' : '📸'} {p.caption?.slice(0, 14) || p.format}
                      </div>
                    );
                  })}
                  {(byDay.get(day)?.length ?? 0) > 3 && (
                    <p className="text-[9px] text-gray-400 font-bold">+{byDay.get(day)!.length - 3}</p>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Composer ───────────────────────────────────────────────────────── */

function countHashtags(text: string): number {
  // # seguido de 1+ caracteres que não sejam espaço nem outro # (cobre acentos sem flag unicode)
  return (text.match(/#[^\s#]+/g) || []).length;
}

/* Moldura de mídia para o preview — imagem renderiza; vídeo mostra placeholder com play. */
function MediaThumb({ url, isVideo, className, rounded }: { url?: string; isVideo: boolean; className?: string; rounded?: string }) {
  const [errored, setErrored] = useState(false);
  const base = `bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center ${rounded ?? ''} ${className ?? ''}`;
  if (!url) {
    return <div className={base}><PhotoIcon className="h-8 w-8 text-gray-400" /></div>;
  }
  if (isVideo || errored) {
    return (
      <div className={`relative bg-gray-900 flex items-center justify-center ${rounded ?? ''} ${className ?? ''}`}>
        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
          <span className="text-gray-900 text-lg">▶</span>
        </div>
        <span className="absolute bottom-1.5 right-2 text-[9px] font-bold text-white/80 uppercase">{isVideo ? 'Vídeo' : 'Prévia'}</span>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" onError={() => setErrored(true)} className={`object-cover ${rounded ?? ''} ${className ?? ''}`} />;
}

function Composer({ clientId, igLast24h, onClose, onPublished }: { clientId: string; igLast24h: number; onClose: () => void; onPublished: () => void }) {
  const [platform, setPlatform]   = useState<'facebook' | 'instagram'>('facebook');
  const [postType, setPostType]   = useState<'feed' | 'video' | 'reel' | 'story'>('feed');
  const [storyKind, setStoryKind] = useState<'image' | 'video'>('image');
  const [caption, setCaption]     = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput]   = useState('');
  const [uploading, setUploading] = useState(false);
  const [scheduleOn, setScheduleOn] = useState(false);
  const [schedDate, setSchedDate] = useState('');   // ISO YYYY-MM-DD
  const [schedTime, setSchedTime] = useState('09:00');
  const [confirming, setConfirming] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError]         = useState('');

  const scheduledAt = scheduleOn && schedDate ? new Date(`${schedDate}T${schedTime || '09:00'}:00`).toISOString() : null;
  const isScheduling = !!scheduledAt && new Date(scheduledAt).getTime() > Date.now();

  const format = postType === 'feed'
    ? (mediaUrls.length > 1 ? 'carousel' : mediaUrls.length === 1 ? 'image' : 'text')
    : postType;
  const mediaIsVideo = postType === 'video' || postType === 'reel' || (postType === 'story' && storyKind === 'video');
  const isVertical   = postType === 'reel' || postType === 'story';
  const platformLabel = platform === 'facebook' ? 'Página do Facebook' : 'Instagram';
  const hashtags = countHashtags(caption);

  const POST_TYPES = [
    { value: 'feed',  label: 'Feed' },
    { value: 'video', label: 'Vídeo' },
    { value: 'reel',  label: 'Reels' },
    { value: 'story', label: 'Stories' },
  ] as const;

  // ── Validações por formato (badges check/warn) ──────────────────────────
  const igOverLimit = platform === 'instagram' && igLast24h >= IG_DAILY_LIMIT;
  const checks: { label: string; ok: boolean }[] = [];
  if (platform === 'instagram') {
    checks.push({ label: 'Mídia obrigatória (URL pública)', ok: mediaUrls.length >= 1 });
    if (postType === 'feed') checks.push({ label: 'Imagem em JPEG · ratio 4:5–1.91:1', ok: mediaUrls.length >= 1 });
    checks.push({ label: `Rate-limit ${igLast24h}/${IG_DAILY_LIMIT} (24h)`, ok: !igOverLimit });
  } else {
    checks.push({ label: 'Texto, link ou mídia', ok: caption.trim().length > 0 || mediaUrls.length > 0 });
  }
  if (format === 'carousel') checks.push({ label: 'Carrossel: 2–10 itens', ok: mediaUrls.length >= 2 && mediaUrls.length <= 10 });
  if (postType === 'reel')   checks.push({ label: 'Reels: 1 vídeo vertical 9:16', ok: mediaUrls.length === 1 });
  if (postType === 'video')  checks.push({ label: 'Vídeo: 1 arquivo', ok: mediaUrls.length === 1 });
  if (postType === 'story')  checks.push({ label: `Story: 1 ${storyKind === 'image' ? 'imagem' : 'vídeo'}`, ok: mediaUrls.length === 1 });
  checks.push({ label: `Legenda ${caption.length}/${CAPTION_MAX}`, ok: caption.length <= CAPTION_MAX });
  checks.push({ label: `Hashtags ${hashtags}/30`, ok: hashtags <= 30 });

  const canPublish = checks.every(c => c.ok) && (() => {
    if (postType !== 'feed') return mediaUrls.length >= 1;
    return platform === 'instagram' ? mediaUrls.length > 0 : (caption.trim().length > 0 || mediaUrls.length > 0);
  })();

  function addUrl() {
    const u = urlInput.trim();
    if (u && !mediaUrls.includes(u)) { setMediaUrls([...mediaUrls, u]); setUrlInput(''); }
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/admin/campanhas/organic/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro no upload');
        uploaded.push(data.url);
      }
      setMediaUrls(prev => [...prev, ...uploaded.filter(u => !prev.includes(u))]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }
  function addHashtag() {
    const tag = '#';
    setCaption(c => (c.endsWith(' ') || c.length === 0 ? c : c + ' ') + tag);
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
          platform, format,
          caption: caption.trim() || undefined,
          mediaUrls,
          mediaKind: postType === 'story' ? storyKind : undefined,
          scheduledAt,
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
  const firstMedia = mediaUrls[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 rounded-xl"><MegaphoneIcon className="h-4 w-4 text-emerald-600" /></div>
            <h2 className="text-sm font-black text-gray-900">Nova Publicação Orgânica</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><XMarkIcon className="h-5 w-5" /></button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0 overflow-y-auto">
          {/* ── Editor ── */}
          <div className="p-6 space-y-5">
            {/* Destino */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Destino</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPlatform('facebook')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    platform === 'facebook' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}>📘 Facebook</button>
                <button type="button" onClick={() => setPlatform('instagram')}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    platform === 'instagram' ? 'bg-pink-50 text-pink-700 border-pink-300 ring-2 ring-pink-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                  }`}>📸 Instagram</button>
              </div>
              {platform === 'instagram' && (
                <p className={`text-[11px] mt-1.5 font-medium ${igOverLimit ? 'text-red-600' : 'text-pink-600'}`}>
                  {igOverLimit
                    ? `Limite diário do Instagram atingido (${igLast24h}/${IG_DAILY_LIMIT}). Aguarde para publicar mais.`
                    : `Exige mídia (URL pública). Publicações hoje: ${igLast24h}/${IG_DAILY_LIMIT}.`}
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
                    }`}>{t.label}</button>
                ))}
              </div>
              {postType === 'story' && (
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mídia do story:</span>
                  {(['image', 'video'] as const).map(k => (
                    <button key={k} type="button" onClick={() => setStoryKind(k)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                        storyKind === k ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'bg-white text-gray-500 border-gray-200'
                      }`}>{k === 'image' ? 'Imagem' : 'Vídeo'}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Legenda */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Texto da publicação</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={addHashtag}
                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase">+ Hashtag</button>
                  <span className={`text-[10px] font-bold ${hashtags > 30 ? 'text-red-500' : 'text-gray-400'}`}>#{hashtags}/30</span>
                  <span className={`text-[10px] font-bold ${caption.length > CAPTION_MAX ? 'text-red-500' : 'text-gray-400'}`}>{caption.length}/{CAPTION_MAX}</span>
                </div>
              </div>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={4}
                maxLength={CAPTION_MAX} placeholder="Escreva a legenda do post..." className={inputCls} />
            </div>

            {/* Mídia — upload local OU URL */}
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                {mediaIsVideo ? 'Vídeo' : 'Imagens'}{postType === 'feed' && ' — opcional'}
              </label>

              {/* Drop zone */}
              <label
                className={`flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed cursor-pointer transition-all px-4 py-5 mb-3 ${
                  uploading
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/40'
                }`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files); }}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                  multiple={!mediaIsVideo}
                  className="sr-only"
                  onChange={e => handleFileUpload(e.target.files)}
                />
                {uploading ? (
                  <div className="flex items-center gap-2 text-indigo-600">
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                    <span className="text-xs font-black">Enviando para MinIO...</span>
                  </div>
                ) : (
                  <>
                    <PhotoIcon className="h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-xs font-black text-gray-600">Arraste ou clique para enviar</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {mediaIsVideo ? 'MP4, MOV, WebM' : 'JPEG, PNG, WebP, GIF'} · até 50 MB por arquivo
                    </p>
                  </>
                )}
              </label>

              {/* URL manual */}
              <div className="flex gap-2">
                <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                  placeholder="Ou cole uma URL pública (https://...)" className={inputCls} />
                <button onClick={addUrl} className="px-4 py-2.5 bg-gray-900 text-white text-xs font-black uppercase rounded-xl hover:bg-gray-700 shrink-0">Add</button>
              </div>

              {mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {mediaUrls.map((u, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg pl-2 pr-1 py-1">
                      <PhotoIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-[11px] text-gray-600 max-w-[160px] truncate" title={u}>
                        {u.startsWith('http://localhost:9000') ? `📦 ${u.split('/').pop()}` : u}
                      </span>
                      <button onClick={() => setMediaUrls(mediaUrls.filter(x => x !== u))} className="text-gray-400 hover:text-red-500">
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Validações */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-1.5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Validação para {platformLabel}</p>
              {checks.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                  {c.ok
                    ? <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    : <ExclamationTriangleIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                  <span className={c.ok ? 'text-gray-500' : 'text-amber-700 font-medium'}>{c.label}</span>
                </div>
              ))}
            </div>

            {/* Agendamento */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={scheduleOn} onChange={e => setScheduleOn(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agendar publicação</span>
              </label>
              {scheduleOn && (
                <div className="flex items-end gap-2 mt-2.5">
                  <div className="flex-1">
                    <span className="block text-[10px] font-bold text-gray-400 mb-1">Data</span>
                    <DateInputPtBR value={schedDate} onChange={setSchedDate} className={inputCls} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 mb-1">Hora</span>
                    <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                      className={`${inputCls} w-28`} />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />{error}
              </div>
            )}
          </div>

          {/* ── Preview ao vivo ── */}
          <div className="border-l border-gray-100 bg-gray-50 p-5 flex flex-col items-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 self-start">Pré-visualização</p>

            {platform === 'facebook' ? (
              <div className="w-full max-w-[280px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 p-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shrink-0" />
                  <div><p className="text-xs font-bold text-gray-900 leading-tight">Sua Página</p><p className="text-[10px] text-gray-400">agora · 🌎</p></div>
                </div>
                {caption && <p className="px-3 pb-2 text-xs text-gray-800 whitespace-pre-wrap break-words line-clamp-4">{caption}</p>}
                {(firstMedia || postType !== 'feed') && (
                  <MediaThumb url={firstMedia} isVideo={mediaIsVideo}
                    className={isVertical ? 'w-full aspect-[9/16]' : 'w-full aspect-square'} />
                )}
                <div className="flex justify-around py-2 text-[10px] font-bold text-gray-400 border-t border-gray-100 mt-0">
                  <span>👍 Curtir</span><span>💬 Comentar</span><span>↪ Compartilhar</span>
                </div>
              </div>
            ) : isVertical ? (
              /* IG Stories / Reels — moldura 9:16 */
              <div className="relative w-full max-w-[200px] aspect-[9/16] rounded-2xl overflow-hidden bg-black shadow-lg">
                <MediaThumb url={firstMedia} isVideo={mediaIsVideo} className="w-full h-full" />
                <div className="absolute top-2 left-2 right-2 flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-amber-500 ring-2 ring-white shrink-0" />
                  <span className="text-[10px] font-bold text-white drop-shadow">sua_conta</span>
                </div>
                {postType === 'reel' && caption && (
                  <p className="absolute bottom-3 left-3 right-8 text-[10px] text-white drop-shadow whitespace-pre-wrap line-clamp-3">{caption}</p>
                )}
              </div>
            ) : (
              /* IG Feed */
              <div className="w-full max-w-[280px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 p-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-gray-900">sua_conta</span>
                </div>
                <MediaThumb url={firstMedia} isVideo={mediaIsVideo} className="w-full aspect-square" />
                <div className="px-3 py-2 flex gap-3 text-base">♡ 💬 ➤</div>
                {caption && <p className="px-3 pb-3 text-xs text-gray-800 whitespace-pre-wrap break-words line-clamp-3"><strong>sua_conta</strong> {caption}</p>}
              </div>
            )}

            {mediaUrls.length > 1 && (
              <p className="text-[10px] text-gray-400 mt-2">+{mediaUrls.length - 1} mídia(s) no carrossel</p>
            )}
          </div>
        </div>

        {/* Footer — confirmação dupla */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white">
          {!confirming ? (
            <button onClick={() => setConfirming(true)} disabled={!canPublish}
              className="w-full py-3 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 active:scale-95 disabled:opacity-40 transition-all">
              {isScheduling ? 'Agendar publicação' : `Publicar em ${platformLabel}`}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-center text-gray-600 font-medium flex items-center justify-center gap-1.5">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                {isScheduling
                  ? <>Agendar publicação pública em <strong>{platformLabel}</strong> para <strong>{new Date(scheduledAt!).toLocaleString('pt-BR')}</strong>?</>
                  : <>Isto publicará conteúdo <strong>público</strong> em <strong>{platformLabel}</strong>. Confirmar?</>}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirming(false)} disabled={publishing}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-xs font-black uppercase rounded-xl hover:bg-gray-200 disabled:opacity-40">Cancelar</button>
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
