'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  PhotoIcon, SparklesIcon, ArrowPathIcon,
  FunnelIcon, ChartBarIcon, ExclamationTriangleIcon,
  CheckCircleIcon, ClockIcon, XMarkIcon, PaintBrushIcon,
} from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import { cn } from '@/lib/marketing-utils';
import ClientSelector, { useClientSelector } from '@/components/marketing/ClientSelector';

// ── Types ──────────────────────────────────────────────────────────────────────
interface CreativeAsset {
  id: string;
  original_name: string;
  storage_url: string;
  file_size: number | null;
  mime_type: string | null;
  campaign_id: string | null;
  ad_id: string | null;
  uploaded_at: string;
  analysis_status: 'pending' | 'running' | 'done' | 'failed' | null;
  hook_type: string | null;
  angle: string | null;
  emotional_tone: string | null;
  cta_style: string | null;
  has_people: boolean | null;
  has_property: boolean | null;
  has_text_overlay: boolean | null;
  is_ugc_style: boolean | null;
  is_corporate_style: boolean | null;
  scene_description: string | null;
  key_visual_elements: string[] | null;
  llm_confidence: number | null;
  error_message: string | null;
}

// ── Label maps ─────────────────────────────────────────────────────────────────
const HOOK_LABELS: Record<string, string> = {
  urgency: 'Urgência', curiosity: 'Curiosidade', social_proof: 'Prova Social',
  benefit: 'Benefício', story: 'História', problem: 'Problema', other: 'Outro',
  // variações que LLMs costumam retornar fora do enum
  investment: 'Investimento', price: 'Preço', lifestyle: 'Lifestyle',
  family: 'Família', luxury: 'Luxo', social: 'Social',
};
const ANGLE_LABELS: Record<string, string> = {
  investment: 'Investimento', lifestyle: 'Lifestyle', family: 'Família',
  price: 'Preço', urgency: 'Urgência', social: 'Social', luxury: 'Luxo', other: 'Outro',
};

const HOOK_COLORS: Record<string, string> = {
  urgency: 'bg-red-100 text-red-700', curiosity: 'bg-purple-100 text-purple-700',
  social_proof: 'bg-blue-100 text-blue-700', benefit: 'bg-green-100 text-green-700',
  story: 'bg-amber-100 text-amber-700', problem: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-100 text-gray-600',
};

const STATUS_ICON = {
  pending: <ClockIcon className="h-3.5 w-3.5 text-amber-500" />,
  running: <ArrowPathIcon className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
  done:    <CheckCircleIcon className="h-3.5 w-3.5 text-green-500" />,
  failed:  <ExclamationTriangleIcon className="h-3.5 w-3.5 text-red-500" />,
};

// ── FASE 6.5 types ─────────────────────────────────────────────────────────────
interface CreativeTemplate { id: string; name: string; style: string; formats: string[]; }
interface GenerationJob {
  id: string; status: string; outputUrls: string[];
  formats: string[]; errorMessage: string | null;
}

const FORMAT_LABELS: Record<string, string> = { '1:1': '1:1 — Feed', '4:5': '4:5 — Feed vertical', '9:16': '9:16 — Story/Reel' };

// ── GenerateModal ───────────────────────────────────────────────────────────────
function GenerateModal({
  asset, onClose, onApproved,
}: {
  asset: CreativeAsset;
  onClose: () => void;
  onApproved: () => void;
}) {
  const [templates, setTemplates] = useState<CreativeTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [formats, setFormats]       = useState<string[]>(['1:1']);
  const [headline, setHeadline]     = useState('');
  const [cta, setCta]               = useState('Quero Saber Mais');
  const [job, setJob]               = useState<GenerationJob | null>(null);
  const [screen, setScreen]         = useState<'config' | 'generating' | 'review'>('config');
  const [busy, setBusy]             = useState(false);
  const [selected, setSelected]     = useState<string[]>([]);
  const [approveErr, setApproveErr] = useState('');

  // Carrega templates ao abrir
  useEffect(() => {
    adminFetch(`/api/admin/campanhas/criativos/generate?sourceAssetId=${asset.id}`)
      .then(r => r.json())
      .then(d => {
        setTemplates(d.templates ?? []);
        if (d.templates?.length) setTemplateId(d.templates[0].id);
      })
      .catch(() => {});
  }, [asset.id]);

  // Polling enquanto gerando
  useEffect(() => {
    if (screen !== 'generating' || !job) return;
    const iv = setInterval(async () => {
      const r = await adminFetch(`/api/admin/campanhas/criativos/generate/${job.id}`);
      const d = await r.json();
      const j: GenerationJob = d.job;
      if (j.status === 'NEEDS_REVIEW') {
        setJob(j);
        setSelected(j.outputUrls);
        setScreen('review');
        clearInterval(iv);
      } else if (j.status === 'FAILED') {
        setJob(j);
        setScreen('review');
        clearInterval(iv);
      }
    }, 2500);
    return () => clearInterval(iv);
  }, [screen, job]);

  async function handleGenerate() {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/campanhas/criativos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceAssetId: asset.id,
          sourceUrl:     asset.storage_url,
          templateId:    templateId || null,
          concept:       { headline: headline.trim() || undefined, cta: cta.trim() || undefined },
          formats,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Erro ao iniciar geração');
      setJob(d.job);
      setScreen('generating');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!job) return;
    setBusy(true);
    setApproveErr('');
    try {
      const r = await adminFetch(`/api/admin/campanhas/criativos/generate/${job.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedUrls: selected }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Erro ao aprovar');
      onApproved();
      onClose();
    } catch (e: any) {
      setApproveErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!job) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/campanhas/criativos/generate/${job.id}/reject`, { method: 'POST' });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  function toggleFormat(f: string) {
    setFormats(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }
  function toggleSelected(url: string) {
    setSelected(prev => prev.includes(url) ? prev.filter(x => x !== url) : [...prev, url]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <PaintBrushIcon className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-black text-slate-900">Gerar variações</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {/* ── SCREEN: CONFIG ── */}
          {screen === 'config' && (
            <div className="space-y-5">
              <div className="flex gap-4">
                {/* Preview da imagem fonte */}
                <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.storage_url} alt={asset.original_name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-0.5">Imagem fonte</p>
                  <p className="text-[11px] text-slate-500 mb-2 truncate max-w-xs">{asset.original_name}</p>
                  <p className="text-[11px] text-slate-400">
                    O agente fará smart-crop para cada formato e aplicará headline + CTA em overlay.
                  </p>
                </div>
              </div>

              {/* Formatos */}
              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">Formatos a gerar</p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(FORMAT_LABELS).map(([f, label]) => (
                    <button key={f} onClick={() => toggleFormat(f)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                        formats.includes(f)
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300',
                      )}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template */}
              {templates.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">Template visual</p>
                  <div className="grid grid-cols-3 gap-2">
                    {templates.map(t => (
                      <button key={t.id} onClick={() => setTemplateId(t.id)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition-all',
                          templateId === t.id
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-slate-100 bg-white hover:border-indigo-200',
                        )}>
                        <p className="text-[11px] font-bold text-slate-800">{t.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{t.formats.join(' · ')}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Conceito */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Headline (opcional)</label>
                  <input
                    value={headline} onChange={e => setHeadline(e.target.value)}
                    placeholder="Ex: Apartamento dos seus sonhos..."
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CTA (opcional)</label>
                  <input
                    value={cta} onChange={e => setCta(e.target.value)}
                    placeholder="Ex: Quero Saber Mais"
                    className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-300"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={busy || formats.length === 0}
                className={cn(
                  'w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all',
                  busy || formats.length === 0
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200',
                )}>
                {busy ? 'Iniciando...' : `Gerar ${formats.length} variação(ões)`}
              </button>
            </div>
          )}

          {/* ── SCREEN: GENERATING ── */}
          {screen === 'generating' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-100" />
                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800">Gerando variações...</p>
                <p className="text-xs text-slate-400 mt-1">Smart-crop + overlay de texto em andamento</p>
              </div>
            </div>
          )}

          {/* ── SCREEN: REVIEW ── */}
          {screen === 'review' && job && (
            <div className="space-y-4">
              {job.status === 'FAILED' ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <p className="font-bold mb-1">Geração falhou</p>
                  <p className="text-xs">{job.errorMessage ?? 'Erro desconhecido'}</p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-700">
                    Selecione as variações para adicionar à biblioteca ({selected.length}/{job.outputUrls.length} selecionadas):
                  </p>
                  <div className={cn(
                    'grid gap-3',
                    job.outputUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3',
                  )}>
                    {job.outputUrls.map((url, i) => {
                      const isSel = selected.includes(url);
                      const fmt   = job.formats[i] ?? '?';
                      return (
                        <button key={url} onClick={() => toggleSelected(url)}
                          className={cn(
                            'relative rounded-xl overflow-hidden border-2 transition-all group',
                            isSel ? 'border-indigo-500 shadow-md shadow-indigo-100' : 'border-slate-200 opacity-60 hover:opacity-90',
                          )}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`Variação ${fmt}`} className="w-full object-cover max-h-48" />
                          <div className={cn(
                            'absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase text-white',
                            isSel ? 'bg-indigo-600' : 'bg-slate-500',
                          )}>
                            {fmt}
                          </div>
                          {isSel && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center shadow">
                              <CheckCircleIcon className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {approveErr && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{approveErr}</p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleReject} disabled={busy}
                      className="flex-1 py-2 rounded-xl text-sm font-bold text-slate-600 border border-slate-200 hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-50">
                      Rejeitar todas
                    </button>
                    <button
                      onClick={handleApprove} disabled={busy || selected.length === 0}
                      className={cn(
                        'flex-1 py-2 rounded-xl text-sm font-bold text-white transition-all',
                        busy || selected.length === 0
                          ? 'bg-slate-300 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200',
                      )}>
                      {busy ? 'Salvando...' : `Aprovar ${selected.length} variação(ões)`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Tag chip ───────────────────────────────────────────────────────────────────
function Tag({ label, color = 'bg-slate-100 text-slate-600' }: { label: string; color?: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${color}`}>
      {label}
    </span>
  );
}

// ── Asset card ─────────────────────────────────────────────────────────────────
function AssetCard({
  asset, onReanalyze, onGenerate,
}: {
  asset: CreativeAsset;
  onReanalyze: (id: string) => void;
  onGenerate:  (asset: CreativeAsset) => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const status = asset.analysis_status ?? 'pending';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group"
    >
      {/* Imagem */}
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden">
        {imgErr ? (
          <div className="w-full h-full flex items-center justify-center">
            <PhotoIcon className="h-10 w-10 text-slate-300" />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.storage_url}
            alt={asset.original_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgErr(true)}
          />
        )}

        {/* Status badge */}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
          {STATUS_ICON[status] ?? STATUS_ICON.pending}
          <span className="text-[9px] font-bold text-slate-600 capitalize">
            {status === 'done' ? 'Analisado' : status === 'running' ? 'Analisando...' : status === 'failed' ? 'Erro' : 'Pendente'}
          </span>
        </div>

        {/* UGC badge */}
        {asset.is_ugc_style && (
          <div className="absolute top-2 left-2 bg-violet-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shadow">
            UGC
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-800 truncate">{asset.original_name}</p>

        {/* Vinculado a campanha */}
        {asset.ad_id && (
          <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 rounded px-1.5 py-0.5 w-fit">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.1-1.1" />
            </svg>
            Vinculado à campanha
          </div>
        )}

        {/* Erro de análise */}
        {status === 'failed' && asset.error_message && (
          <p className="text-[9px] text-red-600 bg-red-50 rounded px-1.5 py-1 leading-relaxed line-clamp-3" title={asset.error_message}>
            {asset.error_message}
          </p>
        )}

        {/* Tags de análise */}
        {status === 'done' && (
          <div className="flex flex-wrap gap-1">
            {asset.hook_type && (
              <Tag
                label={`Hook: ${HOOK_LABELS[asset.hook_type] ?? asset.hook_type}`}
                color={HOOK_COLORS[asset.hook_type] ?? HOOK_COLORS.other}
              />
            )}
            {asset.angle && (
              <Tag label={ANGLE_LABELS[asset.angle] ?? asset.angle} color="bg-indigo-100 text-indigo-700" />
            )}
            {asset.has_people    && <Tag label="Pessoa"  color="bg-pink-100 text-pink-700" />}
            {asset.has_property  && <Tag label="Imóvel"  color="bg-teal-100 text-teal-700" />}
            {asset.has_text_overlay && <Tag label="Texto" color="bg-yellow-100 text-yellow-700" />}
          </div>
        )}

        {/* Scene description */}
        {status === 'done' && asset.scene_description && (
          <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
            {asset.scene_description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[9px] text-slate-400">
            {new Date(asset.uploaded_at).toLocaleDateString('pt-BR')}
          </span>
          {(status === 'pending' || status === 'failed') && (
            <button
              onClick={() => onReanalyze(asset.id)}
              className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
            >
              <SparklesIcon className="h-3 w-3" />
              {status === 'failed' ? 'Re-analisar' : 'Analisar'}
            </button>
          )}
          {status === 'done' && (
            <div className="flex items-center gap-2">
              {asset.llm_confidence != null && (
                <span className="text-[9px] text-slate-400">
                  {Math.round((asset.llm_confidence as number) * 100)}% conf.
                </span>
              )}
              <button
                onClick={() => onReanalyze(asset.id)}
                className="text-[9px] text-slate-300 hover:text-indigo-500 transition-colors"
                title="Re-analisar"
              >
                <ArrowPathIcon className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Gerar variações — visível para imagens (mime type image/*) */}
        {asset.mime_type?.startsWith('image/') && (
          <button
            onClick={() => onGenerate(asset)}
            className="w-full mt-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 border border-dashed border-indigo-200 hover:border-indigo-400 transition-all"
          >
            <PaintBrushIcon className="h-3 w-3" />
            Gerar variações
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function GaleriaCreativosPage() {
  const [assets, setAssets]         = useState<CreativeAsset[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Seletor Minha Empresa / Para um Cliente — padrão 'own'
  const { clients, loading: clientsLoading, clientFilter, setClientFilter } = useClientSelector('criativos');

  // Filtros
  const [filterHook,   setFilterHook]   = useState('');
  const [filterAngle,  setFilterAngle]  = useState('');
  const [filterUgc,    setFilterUgc]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  // FASE 6.5 — modal de geração de variações
  const [genAsset, setGenAsset] = useState<CreativeAsset | null>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60', offset: '0' });
      if (filterHook)             params.set('hookType',  filterHook);
      if (filterAngle)            params.set('angle',     filterAngle);
      if (filterUgc)              params.set('isUgc',     filterUgc);
      if (filterStatus)           params.set('status',    filterStatus);
      if (clientFilter !== 'all') params.set('clientId',  clientFilter);

      const res = await adminFetch(`/api/admin/campanhas/criativos/library?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterHook, filterAngle, filterUgc, filterStatus, clientFilter]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  async function handleReanalyze(assetId: string) {
    await adminFetch(`/api/admin/campanhas/criativos/${assetId}/analyze`, { method: 'POST' });
    setAssets(prev => prev.map(a =>
      a.id === assetId ? { ...a, analysis_status: 'running' } : a
    ));
    setTimeout(() => loadAssets(), 12000);
  }

  async function handleReanalyzeAll() {
    const targets = assets.filter(a => a.analysis_status !== 'running');
    if (!targets.length) return;
    setUploadMsg(`🔄 Re-analisando ${targets.length} criativo(s)...`);
    for (const a of targets) {
      await adminFetch(`/api/admin/campanhas/criativos/${a.id}/analyze`, { method: 'POST' });
    }
    setAssets(prev => prev.map(a => ({ ...a, analysis_status: 'running' as const })));
    setTimeout(() => { setUploadMsg(''); loadAssets(); }, 15000);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setUploadMsg(`Enviando ${files.length} arquivo(s)...`);
    let success = 0;
    const errors: string[] = [];

    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await adminFetch('/api/admin/campanhas/criativos/upload', { method: 'POST', body: fd });
        if (res.ok) {
          success++;
        } else {
          const errData = await res.json().catch(() => ({}));
          errors.push(`${file.name}: ${errData.error ?? res.status}`);
        }
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    if (errors.length) {
      setUploadMsg(`⚠️ ${success}/${files.length} enviados. Erros: ${errors.join(' | ')}`);
    } else {
      setUploadMsg(`✅ ${success}/${files.length} enviado(s). Análise em andamento...`);
    }
    setUploading(false);
    e.target.value = '';
    setTimeout(() => { setUploadMsg(''); loadAssets(); }, errors.length ? 8000 : 3000);
  }

  const statusCounts = assets.reduce((acc, a) => {
    const s = a.analysis_status ?? 'pending';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PhotoIcon className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-black text-slate-900">Galeria de Criativos</h1>
          </div>
          <p className="text-sm text-slate-500">
            Biblioteca inteligente com análise de IA — {total} criativo{total !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor Minha Empresa / Para um Cliente */}
          <ClientSelector
            value={clientFilter}
            onChange={setClientFilter}
            clients={clients}
            loading={clientsLoading}
            storageKey="criativos"
            variant="toggle"
          />
          <Link
            href="/admin/campanhas/criativos/padroes"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all"
          >
            <ChartBarIcon className="h-4 w-4" />
            Padrões Vencedores
          </Link>

          {assets.length > 0 && (
            <button
              onClick={handleReanalyzeAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 transition-all"
              title="Re-analisar todos os criativos"
            >
              <SparklesIcon className="h-4 w-4" />
              Re-analisar todos
            </button>
          )}

          <label className={cn(
            'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white cursor-pointer transition-all',
            uploading
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200',
          )}>
            <PhotoIcon className="h-4 w-4" />
            {uploading ? 'Enviando...' : 'Adicionar Criativos'}
            <input
              type="file" multiple accept="image/*" className="hidden"
              disabled={uploading} onChange={handleFileUpload}
            />
          </label>

          <button
            onClick={() => { setRefreshing(true); loadAssets(); }}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-50"
          >
            <ArrowPathIcon className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Upload feedback */}
      <AnimatePresence>
        {uploadMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm font-medium text-indigo-700 flex items-center gap-2"
          >
            <SparklesIcon className="h-4 w-4 flex-shrink-0" />
            {uploadMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status summary ── */}
      {assets.length > 0 && (
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {Object.entries(statusCounts).map(([s, n]) => (
            <div key={s} className="flex items-center gap-1.5 bg-white border border-slate-100 rounded-lg px-3 py-1.5 shadow-sm">
              {STATUS_ICON[s as keyof typeof STATUS_ICON] ?? STATUS_ICON.pending}
              <span className="text-xs font-semibold text-slate-700">{n}</span>
              <span className="text-[10px] text-slate-400">
                {s === 'done' ? 'analisados' : s === 'running' ? 'em análise' : s === 'failed' ? 'com erro' : 'pendentes'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <FunnelIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
        {[
          { val: filterHook, set: setFilterHook, label: 'Todos os Hooks', opts: HOOK_LABELS },
          { val: filterAngle, set: setFilterAngle, label: 'Todos os Ângulos', opts: ANGLE_LABELS },
        ].map(({ val, set, label, opts }) => (
          <select key={label} value={val} onChange={e => set(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400">
            <option value="">{label}</option>
            {Object.entries(opts).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        ))}

        <select value={filterUgc} onChange={e => setFilterUgc(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400">
          <option value="">UGC + Corporativo</option>
          <option value="true">Apenas UGC</option>
          <option value="false">Apenas Corporativo</option>
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400">
          <option value="">Todos os Status</option>
          <option value="done">Analisados</option>
          <option value="pending">Pendentes</option>
          <option value="failed">Com erro</option>
        </select>

        {(filterHook || filterAngle || filterUgc || filterStatus) && (
          <button
            onClick={() => { setFilterHook(''); setFilterAngle(''); setFilterUgc(''); setFilterStatus(''); }}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
            Limpar filtros
          </button>
        )}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100 animate-pulse">
              <div className="aspect-[4/3] bg-slate-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-3/4" />
                <div className="h-2 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <PhotoIcon className="h-8 w-8 text-indigo-400" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-2">Nenhum criativo na biblioteca</h3>
          <p className="text-sm text-slate-400 max-w-sm mb-6">
            Carregue criativos para iniciar a análise automática com IA. Eles também são salvos quando você lança campanhas.
          </p>
          <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-sm transition-all">
            <PhotoIcon className="h-4 w-4" />
            Adicionar primeiros criativos
            <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {assets.map(asset => (
            <AssetCard key={asset.id} asset={asset} onReanalyze={handleReanalyze} onGenerate={setGenAsset} />
          ))}
        </motion.div>
      )}

      {!loading && assets.length > 0 && assets.length < total && (
        <div className="mt-8 text-center">
          <button
            onClick={loadAssets}
            className="px-6 py-2 rounded-xl text-sm font-bold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-all"
          >
            Carregar mais ({total - assets.length} restantes)
          </button>
        </div>
      )}

      {/* FASE 6.5 — Modal de geração de variações */}
      <AnimatePresence>
        {genAsset && (
          <GenerateModal
            asset={genAsset}
            onClose={() => setGenAsset(null)}
            onApproved={() => { setGenAsset(null); loadAssets(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
