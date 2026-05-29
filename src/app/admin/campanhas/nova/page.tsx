'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  XMarkIcon, RocketLaunchIcon, ArrowLeftIcon, FolderOpenIcon,
  BuildingOfficeIcon, UserCircleIcon, MagnifyingGlassIcon, ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import type { Creative, ClientWithCreativesPath } from '@/lib/marketing-api';
import { getClientCreativePaths } from '@/lib/marketing-api';
import { cn } from '@/lib/marketing-utils';
import { useAuth } from '@/hooks/useAuth';

const CampaignWizard = dynamic(
  () => import('@/components/marketing/CampaignWizard').then(m => m.CampaignWizard),
  { ssr: false },
);

/* ── helpers ─────────────────────────────────────────────── */
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
function isImage(name: string) {
  const dot = name.lastIndexOf('.');
  return dot !== -1 && IMAGE_EXTS.has(name.slice(dot).toLowerCase());
}

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */
export default function NovaCampanhaPage() {
  const router = useRouter();
  const { user } = useAuth();

  /* master detectado via is_system_role
   * Prioridade: user.is_system_role (do auth context, após /me ser corrigido)
   * Fallback:   localStorage admin-user-data (preenchido no login, sempre presente) */
  const isMaster = useMemo(() => {
    if (user?.is_system_role === true) return true;
    try {
      const stored = localStorage.getItem('admin-user-data');
      if (stored) return JSON.parse(stored).is_system_role === true;
    } catch { /* ignore parse errors */ }
    return false;
  }, [user?.is_system_role]);

  /* ── Phase 0: contexto ──────────────────────────────── */
  const [campaignFor, setCampaignFor]       = useState<'own' | 'client'>('own');
  const [clients, setClients]               = useState<ClientWithCreativesPath[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearch, setClientSearch]     = useState('');
  const [pathHint, setPathHint]             = useState('');
  const clientSearchRef = useRef<HTMLInputElement>(null);

  /* ── Phase 1: criativos ─────────────────────────────── */
  const [folderName, setFolderName]         = useState('');
  const [allImages, setAllImages]           = useState<Creative[]>([]);
  const [selected, setSelected]             = useState<Creative[]>([]);
  const [filter, setFilter]                 = useState('');
  const [loadingFolder, setLoadingFolder]   = useState(false);
  const [folderError, setFolderError]       = useState('');

  /* ── Phase 2: wizard ────────────────────────────────── */
  const [showWizard, setShowWizard] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const supportsPickerAPI =
    typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  /* load client list (only for tenants) */
  useEffect(() => {
    if (!isMaster) {
      getClientCreativePaths()
        .then(d => setClients(d.clients || []))
        .catch(() => setClients([]));
    }
  }, [isMaster]);

  /* update folder path hint when client changes */
  useEffect(() => {
    if (campaignFor === 'client' && selectedClientId) {
      const c = clients.find(c => c.id === selectedClientId);
      setPathHint(c?.creativesPath || '');
    } else {
      setPathHint('');
    }
    resetFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignFor, selectedClientId]);

  function resetFiles() {
    setAllImages([]); setFolderName(''); setSelected([]);
    setFolderError(''); setFilter('');
  }

  /* ── folder selection ───────────────────────────────── */
  async function handleSelectFolder() {
    setFolderError(''); setLoadingFolder(true);
    try {
      if (supportsPickerAPI) {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
        await readFromDirectoryHandle(dirHandle);
      } else {
        fileInputRef.current?.click();
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setFolderError('Não foi possível acessar a pasta. Tente novamente.');
      }
    } finally {
      setLoadingFolder(false);
    }
  }

  async function readFromDirectoryHandle(dirHandle: any) {
    const found: Creative[] = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && isImage(entry.name)) {
        const file: File = await entry.getFile();
        const blobUrl = URL.createObjectURL(file);
        found.push({
          name: entry.name,
          url:  blobUrl,
          path: blobUrl,   /* blob URL como path para envio à API */
          size: file.size,
          modifiedAt: new Date(file.lastModified).toISOString(),
        });
      }
    }
    found.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    setFolderName(dirHandle.name);
    setAllImages(found);
    setSelected([]);
    if (found.length === 0) {
      setFolderError('Nenhuma imagem encontrada. Verifique se a pasta contém arquivos JPG, PNG ou WebP.');
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files    = Array.from(e.target.files || []);
    const imgFiles = files.filter(f => isImage(f.name));
    const found: Creative[] = imgFiles.map(file => {
      const blobUrl = URL.createObjectURL(file);
      return { name: file.name, url: blobUrl, path: blobUrl, size: file.size,
        modifiedAt: new Date(file.lastModified).toISOString() };
    });
    found.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    const folder = files[0]?.webkitRelativePath?.split('/')[0] || 'Pasta selecionada';
    setFolderName(folder); setAllImages(found); setSelected([]);
    if (found.length === 0) setFolderError('Nenhuma imagem encontrada nesta pasta.');
    e.target.value = '';
  }

  /* ── image selection ────────────────────────────────── */
  function toggleSelect(image: Creative) {
    setSelected(prev => {
      if (prev.find(i => i.name === image.name)) return prev.filter(i => i.name !== image.name);
      if (prev.length >= 6) return prev;
      return [...prev, image];
    });
  }

  const filtered = allImages.filter(img =>
    img.name.toLowerCase().includes(filter.toLowerCase())
  );
  const selectedClient   = clients.find(c => c.id === selectedClientId);
  const effectiveClientId = campaignFor === 'client' ? (selectedClientId || null) : null;

  /* context validity: se "Para um cliente", precisa ter selecionado um */
  const contextReady = isMaster || campaignFor === 'own' || !!selectedClientId;

  function handleSuccess() {
    setShowWizard(false);
    router.push('/admin/campanhas/iniciativas');
  }

  /* ── Phase 2: show wizard ─────────────────────────── */
  if (showWizard) {
    return (
      <CampaignWizard
        selectedImages={selected}
        clientId={effectiveClientId}
        onClose={() => setShowWizard(false)}
        onSuccess={handleSuccess}
      />
    );
  }

  /* ── Phase 1: page ──────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Voltar
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-1">Campanhas</p>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Lançar Campanha</h1>
              <p className="text-gray-500 mt-1 text-sm font-medium">
                Selecione os criativos e configure sua campanha no Meta Ads
              </p>
            </div>

            {/* Phase indicator */}
            <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1 self-start">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">1</span>
                <span className="text-[11px] font-black uppercase tracking-wider">Criativos</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-400">
                <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400">2</span>
                <span className="text-[11px] font-black uppercase tracking-wider">Campanha</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Para quem? (only for tenants) ── */}
        {!isMaster && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-5">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
                Esta campanha é para
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setCampaignFor('own'); setSelectedClientId(''); setClientSearch(''); }}
                  className={cn(
                    'flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-black transition-all border',
                    campaignFor === 'own'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  )}
                >
                  <BuildingOfficeIcon className="h-4 w-4" />
                  Minha Empresa
                </button>
                <button
                  onClick={() => setCampaignFor('client')}
                  className={cn(
                    'flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-black transition-all border',
                    campaignFor === 'client'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  )}
                >
                  <UserCircleIcon className="h-4 w-4" />
                  Para um Cliente
                </button>
              </div>
            </div>

            {/* Client selector */}
            <AnimatePresence>
              {campaignFor === 'client' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {selectedClientId ? (
                    /* Selected client chip */
                    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                        {selectedClient?.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{selectedClient?.name}</p>
                        {selectedClient?.email && (
                          <p className="text-[11px] text-indigo-500 truncate">{selectedClient.email}</p>
                        )}
                      </div>
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500 shrink-0" />
                      <button
                        onClick={() => { setSelectedClientId(''); setClientSearch(''); setTimeout(() => clientSearchRef.current?.focus(), 50); }}
                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 ml-1"
                      >
                        Trocar
                      </button>
                    </div>
                  ) : (
                    /* Client search */
                    <>
                      <div className="relative mb-2">
                        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                          ref={clientSearchRef}
                          type="text"
                          placeholder="Digite o nome ou e-mail do cliente..."
                          value={clientSearch}
                          onChange={e => setClientSearch(e.target.value)}
                          className="w-full pl-10 pr-9 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                        {clientSearch && (
                          <button onClick={() => setClientSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {clientSearch.length > 0 && clientSearch.length < 3 && (
                        <p className="text-[10px] text-gray-400 font-medium px-1 mb-2">
                          Digite mais {3 - clientSearch.length} letra{3 - clientSearch.length !== 1 ? 's' : ''} para filtrar...
                        </p>
                      )}

                      {(() => {
                        const term = clientSearch.trim().toLowerCase();
                        const list = term.length >= 3
                          ? clients.filter(c =>
                              c.name.toLowerCase().includes(term) ||
                              (c.email || '').toLowerCase().includes(term))
                          : clients;
                        if (list.length === 0 && term.length >= 3) {
                          return <p className="text-xs text-gray-400 font-medium px-1 py-2">Nenhum cliente encontrado para "{clientSearch}"</p>;
                        }
                        if (list.length === 0) return null;
                        return (
                          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto divide-y divide-gray-100">
                            {list.map(c => (
                              <button
                                key={c.id}
                                onClick={() => { setSelectedClientId(c.id); setClientSearch(''); }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition-colors text-left group"
                              >
                                <div className="w-8 h-8 rounded-full bg-gray-200 group-hover:bg-indigo-200 flex items-center justify-center text-gray-600 group-hover:text-indigo-700 text-xs font-black shrink-0 transition-colors">
                                  {c.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                                  {c.email && <p className="text-[10px] text-gray-400 truncate">{c.email}</p>}
                                </div>
                                {c.creativesPath && (
                                  <FolderOpenIcon className="h-3.5 w-3.5 text-indigo-400 shrink-0" title="Pasta configurada" />
                                )}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Folder path hint for selected client */}
            <AnimatePresence>
              {pathHint && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                  <FolderOpenIcon className="h-4 w-4 text-indigo-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Pasta configurada nas Configurações do cliente</p>
                    <p className="text-xs font-medium text-indigo-700 truncate mt-0.5">{pathHint}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Section: Criativos ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">

          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                Fase 1 — Criativos
              </p>
              <p className="text-sm text-gray-500">
                {allImages.length === 0
                  ? 'Selecione uma pasta com as imagens para a campanha'
                  : `${allImages.length} imagem${allImages.length !== 1 ? 'ns' : ''} encontrada${allImages.length !== 1 ? 's' : ''} — selecione até 6`}
              </p>
            </div>
            {allImages.length > 0 && (
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-56 shadow-sm"
                />
              </div>
            )}
          </div>

          {/* Folder select button */}
          <div className="flex items-center gap-4 mb-5">
            <button
              onClick={handleSelectFolder}
              disabled={loadingFolder || (!contextReady)}
              className="flex items-center gap-2.5 px-6 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              {loadingFolder
                ? <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Lendo pasta...</>
                : <><FolderOpenIcon className="h-4 w-4" /> Selecionar Pasta</>}
            </button>

            {folderName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pasta:</span>
                <span className="font-bold">{folderName}</span>
                <span className="text-[10px] text-gray-400">({allImages.length} img)</span>
                <button onClick={resetFiles} className="text-gray-400 hover:text-gray-600 ml-1" title="Limpar">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {!supportsPickerAPI && (
              <p className="text-[10px] text-amber-600 font-bold">Use Chrome ou Edge para melhor experiência</p>
            )}
          </div>

          {folderError && (
            <p className="text-xs font-bold text-red-500 flex items-center gap-1.5 mb-4">
              <XMarkIcon className="h-3.5 w-3.5" /> {folderError}
            </p>
          )}

          {/* Empty state */}
          {allImages.length === 0 && !loadingFolder && !folderError && (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-14 text-center">
              <FolderOpenIcon className="h-14 w-14 text-gray-300 mx-auto mb-4" />
              <p className="text-sm font-black text-gray-700 mb-1.5">Selecione uma pasta de criativos</p>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                {!contextReady
                  ? 'Primeiro selecione o cliente acima, depois escolha a pasta'
                  : 'Clique em "Selecionar Pasta" para navegar até os criativos. Você também pode avançar sem imagens.'}
              </p>
            </div>
          )}

          {/* Image grid */}
          {allImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((image, i) => {
                const isSelected = selected.some(s => s.name === image.name);
                const isDisabled = !isSelected && selected.length >= 6;
                return (
                  <motion.div
                    key={image.name}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    onClick={() => !isDisabled && toggleSelect(image)}
                    className={cn(
                      'bg-white rounded-2xl border overflow-hidden cursor-pointer transition-all group shadow-sm',
                      isSelected
                        ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                        : 'border-gray-100 hover:border-indigo-200 hover:shadow-md',
                      isDisabled && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className={cn(
                        'absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-sm',
                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-white/70 bg-black/20'
                      )}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {isSelected && <div className="absolute inset-0 bg-indigo-600/10" />}
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-xs font-medium text-gray-900 truncate">{image.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{(image.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </motion.div>
                );
              })}
              {filtered.length === 0 && filter && (
                <div className="col-span-5 text-center py-12 text-sm text-gray-400 font-medium">
                  Nenhuma imagem corresponde a "{filter}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer action bar ── */}
        <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            {selected.length > 0 ? (
              <>
                {/* Thumbnails */}
                <div className="flex gap-1.5">
                  {selected.slice(0, 5).map(img => (
                    <div key={img.name} className="w-10 h-10 rounded-lg overflow-hidden border-2 border-indigo-200 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {selected.length > 5 && (
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-[10px] font-black text-indigo-600">
                      +{selected.length - 5}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {selected.length} criativo{selected.length !== 1 ? 's' : ''} selecionado{selected.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[11px] text-gray-400">Máximo 6</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">
                {allImages.length === 0
                  ? 'Você pode avançar sem imagens — criativo opcional'
                  : 'Clique nas imagens para selecionar até 6'}
              </p>
            )}
          </div>

          <button
            onClick={() => setShowWizard(true)}
            disabled={!contextReady}
            className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: contextReady ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : '#94a3b8' }}
          >
            <RocketLaunchIcon className="h-4 w-4" />
            Configurar Campanha
          </button>
        </div>

      </div>

      {/* Hidden file input (fallback para browsers sem showDirectoryPicker) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        // @ts-ignore — webkitdirectory não está no tipo padrão
        webkitdirectory=""
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
}
