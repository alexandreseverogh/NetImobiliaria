"use client";
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Creative, type ClientWithCreativesPath, getClientCreativePaths } from '@/lib/marketing-api';
import { cn } from '@/lib/marketing-utils';
import dynamic from 'next/dynamic';
import {
  MagnifyingGlassIcon, PhotoIcon, RocketLaunchIcon, XMarkIcon,
  FolderOpenIcon, BuildingOfficeIcon, UserCircleIcon, ChevronDownIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { CreateGuard } from '@/components/admin/PermissionGuard';

const CampaignWizard = dynamic(
  () => import('@/components/marketing/CampaignWizard').then(mod => mod.CampaignWizard),
  { ssr: false }
);

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

function isImage(name: string) {
  const dot = name.lastIndexOf('.');
  return dot !== -1 && IMAGE_EXTS.has(name.slice(dot).toLowerCase());
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function CreativesPage() { return <CreativesPageInner />; }

function CreativesPageInner() {
  // Fonte de importação
  const [importMode, setImportMode]             = useState<'own' | 'client'>('own');
  const [clients, setClients]                   = useState<ClientWithCreativesPath[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [pathHint, setPathHint]                 = useState('');

  // Arquivos locais
  const [folderName, setFolderName] = useState('');
  const [images, setImages]         = useState<Creative[]>([]);

  // UI
  const [selected, setSelected]     = useState<Creative[]>([]);
  const [loading, setLoading]       = useState(false);
  const [filter, setFilter]         = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [error, setError]           = useState('');

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const supportsPickerAPI = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // Carrega lista de clientes do tenant
  useEffect(() => {
    getClientCreativePaths()
      .then(d => setClients(d.clients || []))
      .catch(() => setClients([]));
  }, []);

  // Atualiza hint de caminho ao mudar fonte / cliente
  useEffect(() => {
    if (importMode === 'client') {
      const c = clients.find(c => c.id === selectedClientId);
      setPathHint(c?.creativesPath || '');
    } else {
      setPathHint('');
    }
    resetFiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importMode, selectedClientId]);

  function resetFiles() {
    setImages([]);
    setFolderName('');
    setSelected([]);
    setError('');
    setFilter('');
  }

  // ── Seleção via File System Access API (Chrome/Edge) ──────────────────────

  async function handleSelectFolder() {
    setError('');
    setLoading(true);
    try {
      if (supportsPickerAPI) {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
        await readFromDirectoryHandle(dirHandle);
      } else {
        fileInputRef.current?.click();
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        setError('Não foi possível acessar a pasta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function readFromDirectoryHandle(dirHandle: any) {
    const found: Creative[] = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && isImage(entry.name)) {
        const file: File = await entry.getFile();
        found.push({
          name:       entry.name,
          url:        URL.createObjectURL(file),
          path:       entry.name,
          size:       file.size,
          modifiedAt: new Date(file.lastModified).toISOString(),
        });
      }
    }
    found.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    setFolderName(dirHandle.name);
    setImages(found);
    setSelected([]);
    if (found.length === 0) {
      setError('Nenhuma imagem encontrada. Verifique se a pasta contém arquivos JPG, PNG ou WebP.');
    }
  }

  // ── Fallback: <input webkitdirectory> (Firefox / Safari) ─────────────────

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files    = Array.from(e.target.files || []);
    const imgFiles = files.filter(f => isImage(f.name));

    const found: Creative[] = imgFiles.map(file => ({
      name:       file.name,
      url:        URL.createObjectURL(file),
      path:       file.name,
      size:       file.size,
      modifiedAt: new Date(file.lastModified).toISOString(),
    }));
    found.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));

    const folder = files[0]?.webkitRelativePath?.split('/')[0] || 'Pasta selecionada';
    setFolderName(folder);
    setImages(found);
    setSelected([]);
    if (found.length === 0) {
      setError('Nenhuma imagem encontrada nesta pasta.');
    }
    e.target.value = ''; // permite re-selecionar a mesma pasta
  }

  // ── Seleção de imagens ────────────────────────────────────────────────────

  function toggleSelect(image: Creative) {
    setSelected(prev => {
      if (prev.find(i => i.name === image.name)) return prev.filter(i => i.name !== image.name);
      if (prev.length >= 6) return prev;
      return [...prev, image];
    });
  }

  const filtered = images.filter(img =>
    img.name.toLowerCase().includes(filter.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Campanhas</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Criativos</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">
              Selecione até 6 imagens da sua pasta local para lançar uma campanha
            </p>
          </div>
          {images.length > 0 && (
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-64 shadow-sm"
              />
            </div>
          )}
        </div>

        {/* ── Seletor de fonte ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-5">

          {/* Minha empresa / Cliente */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Importar criativos de
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setImportMode('own')}
                className={cn(
                  'flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-black transition-all border',
                  importMode === 'own'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                )}
              >
                <BuildingOfficeIcon className="h-4 w-4" />
                Minha Empresa
              </button>
              <button
                onClick={() => setImportMode('client')}
                className={cn(
                  'flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-black transition-all border',
                  importMode === 'client'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                )}
              >
                <UserCircleIcon className="h-4 w-4" />
                Cliente
              </button>
            </div>
          </div>

          {/* Dropdown de cliente */}
          <AnimatePresence>
            {importMode === 'client' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Selecionar cliente
                </label>
                <div className="relative">
                  <select
                    value={selectedClientId}
                    onChange={e => setSelectedClientId(e.target.value)}
                    className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  >
                    <option value="">— Selecione um cliente —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hint do caminho configurado */}
          <AnimatePresence>
            {pathHint && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3"
              >
                <FolderOpenIcon className="h-4 w-4 text-indigo-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Pasta configurada em Configurações</p>
                  <p className="text-xs font-medium text-indigo-700 truncate mt-0.5">{pathHint}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Botão selecionar pasta */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectFolder}
              disabled={loading || (importMode === 'client' && !selectedClientId)}
              className="flex items-center gap-2.5 px-6 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            >
              {loading
                ? <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Lendo pasta...</>
                : <><FolderOpenIcon className="h-4 w-4" /> Selecionar Pasta</>
              }
            </button>

            {folderName && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pasta:</span>
                <span className="font-bold">{folderName}</span>
                <span className="text-[10px] text-gray-400">({images.length} imagem{images.length !== 1 ? 'ns' : ''})</span>
                <button
                  onClick={resetFiles}
                  className="text-gray-400 hover:text-gray-600 ml-1"
                  title="Limpar"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {!supportsPickerAPI && (
              <p className="text-[10px] text-amber-600 font-bold">
                Use Chrome ou Edge para melhor experiência com seleção de pasta
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs font-bold text-red-500 flex items-center gap-1.5">
              <XMarkIcon className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </div>

        {/* Input de fallback (oculto) */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          // @ts-ignore
          webkitdirectory=""
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* ── Barra de seleção ── */}
        <AnimatePresence>
          {selected.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-white rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-500/10 p-4 mb-6 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-indigo-600">{selected.length}</span>
                  <span className="text-sm text-gray-400 font-medium">/ 6 selecionados</span>
                </div>
                <div className="flex gap-2">
                  {selected.map(img => (
                    <div key={img.name} className="w-11 h-11 rounded-xl overflow-hidden border-2 border-indigo-200 shadow-sm">
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={() => setSelected([])}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
                >
                  <XMarkIcon className="h-3.5 w-3.5" /> Limpar
                </button>
                <CreateGuard resource="importacao-criativos">
                  <button
                    onClick={() => setShowWizard(true)}
                    className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <RocketLaunchIcon className="h-3.5 w-3.5" /> Lançar Campanha
                  </button>
                </CreateGuard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Grid de imagens ── */}
        {images.length === 0 && !loading && !error && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FolderOpenIcon className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-black text-gray-900 mb-1">Nenhuma pasta selecionada</p>
            <p className="text-xs text-gray-400">
              {importMode === 'client' && !selectedClientId
                ? 'Selecione um cliente e depois escolha a pasta de criativos'
                : 'Clique em "Selecionar Pasta" para navegar até os criativos'}
            </p>
          </div>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((image, i) => {
              const isSelected = selected.some(s => s.name === image.name);
              const isDisabled = !isSelected && selected.length >= 6;
              return (
                <motion.div
                  key={image.name}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => !isDisabled && toggleSelect(image)}
                  className={cn(
                    'bg-white rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 group shadow-sm',
                    isSelected
                      ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/30'
                      : 'border-gray-100 hover:border-indigo-200 hover:shadow-md',
                    isDisabled && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className={cn(
                      'absolute top-3 right-3 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shadow-md',
                      isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-white/70 bg-black/20'
                    )}>
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {isSelected && <div className="absolute inset-0 bg-indigo-600/10" />}
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium text-gray-900 truncate">{image.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{(image.size / 1024).toFixed(0)} KB</p>
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && filter && (
              <div className="col-span-3 text-center py-16 text-sm text-gray-400 font-medium">
                Nenhuma imagem corresponde a "{filter}"
              </div>
            )}
          </div>
        )}

        {/* CampaignWizard */}
        {showWizard && (
          <CampaignWizard
            selectedImages={selected}
            onClose={() => setShowWizard(false)}
            onSuccess={() => { setShowWizard(false); setSelected([]); }}
          />
        )}
      </div>
    </div>
  );
}

export default CreativesPageInner;
