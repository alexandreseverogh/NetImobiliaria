'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  PhotoIcon, SparklesIcon, ArrowPathIcon,
  FunnelIcon, ChartBarIcon, ExclamationTriangleIcon,
  CheckCircleIcon, ClockIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { adminFetch } from '@/lib/auth/adminFetch';
import { cn } from '@/lib/marketing-utils';

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
}

// ── Label maps ─────────────────────────────────────────────────────────────────
const HOOK_LABELS: Record<string, string> = {
  urgency: 'Urgência', curiosity: 'Curiosidade', social_proof: 'Prova Social',
  benefit: 'Benefício', story: 'História', problem: 'Problema', other: 'Outro',
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

// ── Tag chip ───────────────────────────────────────────────────────────────────
function Tag({ label, color = 'bg-slate-100 text-slate-600' }: { label: string; color?: string }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${color}`}>
      {label}
    </span>
  );
}

// ── Asset card ─────────────────────────────────────────────────────────────────
function AssetCard({ asset, onReanalyze }: { asset: CreativeAsset; onReanalyze: (id: string) => void }) {
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
              Analisar
            </button>
          )}
          {asset.llm_confidence != null && status === 'done' && (
            <span className="text-[9px] text-slate-400">
              {Math.round((asset.llm_confidence as number) * 100)}% conf.
            </span>
          )}
        </div>
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

  // Filtros
  const [filterHook,   setFilterHook]   = useState('');
  const [filterAngle,  setFilterAngle]  = useState('');
  const [filterUgc,    setFilterUgc]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '60', offset: '0' });
      if (filterHook)   params.set('hookType', filterHook);
      if (filterAngle)  params.set('angle', filterAngle);
      if (filterUgc)    params.set('isUgc', filterUgc);
      if (filterStatus) params.set('status', filterStatus);

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
  }, [filterHook, filterAngle, filterUgc, filterStatus]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  async function handleReanalyze(assetId: string) {
    await adminFetch(`/api/admin/campanhas/criativos/${assetId}/analyze`, { method: 'POST' });
    setAssets(prev => prev.map(a =>
      a.id === assetId ? { ...a, analysis_status: 'running' } : a
    ));
    setTimeout(() => loadAssets(), 10000);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setUploadMsg(`Enviando ${files.length} arquivo(s)...`);
    let success = 0;

    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await adminFetch('/api/admin/campanhas/criativos/upload', { method: 'POST', body: fd });
        if (res.ok) success++;
      } catch { /* ignore */ }
    }

    setUploadMsg(`✅ ${success}/${files.length} enviado(s). Análise em andamento...`);
    setUploading(false);
    e.target.value = '';
    setTimeout(() => { setUploadMsg(''); loadAssets(); }, 3000);
  }

  const statusCounts = assets.reduce((acc, a) => {
    const s = a.analysis_status ?? 'pending';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PhotoIcon className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-black text-slate-900">Galeria de Criativos</h1>
          </div>
          <p className="text-sm text-slate-500">
            Biblioteca inteligente com análise de IA — {total} criativo{total !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/campanhas/criativos/padroes"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all"
          >
            <ChartBarIcon className="h-4 w-4" />
            Padrões Vencedores
          </Link>

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
            <AssetCard key={asset.id} asset={asset} onReanalyze={handleReanalyze} />
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
    </div>
  );
}
