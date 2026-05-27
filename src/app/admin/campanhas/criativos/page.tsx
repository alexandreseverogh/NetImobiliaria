"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCreatives, type Creative } from '@/lib/marketing-api';
import { cn } from '@/lib/marketing-utils';
import dynamic from 'next/dynamic';
import { MagnifyingGlassIcon, PhotoIcon, RocketLaunchIcon, XMarkIcon } from '@heroicons/react/24/outline';

const CampaignWizard = dynamic(
  () => import('@/components/marketing/CampaignWizard').then(mod => mod.CampaignWizard),
  { ssr: false }
);

export function CreativesPage() {
  const [images, setImages]       = useState<Creative[]>([]);
  const [selected, setSelected]   = useState<Creative[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => { loadCreatives(); }, []);

  async function loadCreatives() {
    try {
      setLoading(true);
      const data = await getCreatives();
      setImages(data.images || []);
      if (data.images?.length === 0) {
        setError('Nenhum criativo encontrado. Configure a pasta de criativos em Configurações.');
      }
    } catch {
      setError('Erro ao carregar criativos. Verifique se o servidor está rodando.');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(image: Creative) {
    setSelected(prev => {
      const exists = prev.find(i => i.name === image.name);
      if (exists) return prev.filter(i => i.name !== image.name);
      if (prev.length >= 6) return prev;
      return [...prev, image];
    });
  }

  const filtered = images.filter(img =>
    img.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-2">Campanhas</p>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Criativos</h1>
            <p className="text-gray-500 mt-1 text-sm font-medium">Selecione até 6 imagens para lançar uma campanha</p>
          </div>
          {/* Search */}
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
        </div>

        {/* Selection bar */}
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
                <button onClick={() => setSelected([])}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-gray-200 active:scale-95 transition-all">
                  <XMarkIcon className="h-3.5 w-3.5" /> Limpar
                </button>
                <button onClick={() => setShowWizard(true)}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-500/20">
                  <RocketLaunchIcon className="h-3.5 w-3.5" /> Lançar Campanha
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 aspect-square animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <PhotoIcon className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-black text-gray-900 mb-1">Sem criativos</p>
            <p className="text-xs text-gray-400">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((image, i) => {
              const isSelected = selected.some(s => s.name === image.name);
              const isDisabled = !isSelected && selected.length >= 6;
              return (
                <motion.div
                  key={image.name}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04 }}
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
                    {/* Selection indicator */}
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
          </div>
        )}

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

export default CreativesPage;
