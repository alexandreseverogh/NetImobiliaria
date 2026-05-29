'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  PhotoIcon, XMarkIcon, RocketLaunchIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import type { Creative } from '@/lib/marketing-api';

const CampaignWizard = dynamic(
  () => import('@/components/marketing/CampaignWizard').then(m => m.CampaignWizard),
  { ssr: false },
);

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
function isImage(name: string) {
  const dot = name.lastIndexOf('.');
  return dot !== -1 && IMAGE_EXTS.has(name.slice(dot).toLowerCase());
}

export default function NovaCampanhaPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<Creative[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [dragging, setDragging] = useState(false);

  /* ── upload helpers ─────────────────────────────────────────── */
  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: Creative[] = [];
    for (const file of Array.from(files)) {
      if (!isImage(file.name)) continue;
      const path = URL.createObjectURL(file);
      next.push({ name: file.name, path, size: file.size } as Creative);
    }
    setImages(prev => [...prev, ...next]);
  }

  function removeImage(idx: number) {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }

  /* ── drag & drop ────────────────────────────────────────────── */
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  /* ── wizard callback ────────────────────────────────────────── */
  function handleSuccess() {
    setShowWizard(false);
    router.push('/admin/campanhas/iniciativas');
  }

  /* ── render ─────────────────────────────────────────────────── */
  if (showWizard) {
    return (
      <CampaignWizard
        selectedImages={images}
        onClose={() => setShowWizard(false)}
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" /> Voltar
          </button>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-1">Campanhas</p>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Lançar Campanha</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">
            Adicione criativos (opcional) e configure sua campanha no Meta Ads
          </p>
        </div>

        {/* Upload area */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all mb-6
            ${dragging
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
            }`}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={e => addFiles(e.target.files)}
          />
          <PhotoIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-700">
            {dragging ? 'Solte as imagens aqui' : 'Clique ou arraste imagens'}
          </p>
          <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — opcional. Você também pode avançar sem imagens.</p>
        </div>

        {/* Preview grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
            {images.map((img, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden border border-gray-100 aspect-square bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.path} alt={img.name} className="w-full h-full object-cover" />
                <button
                  onClick={e => { e.stopPropagation(); removeImage(i); }}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info bar */}
        <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
          <div className="text-sm text-gray-600">
            {images.length === 0
              ? <span className="text-gray-400">Nenhum criativo selecionado — campanha sem imagem</span>
              : <span className="font-semibold text-gray-900">{images.length} criativo{images.length !== 1 ? 's' : ''} selecionado{images.length !== 1 ? 's' : ''}</span>
            }
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
          >
            <RocketLaunchIcon className="h-4 w-4" />
            Lançar Campanha
          </button>
        </div>

      </div>
    </div>
  );
}
