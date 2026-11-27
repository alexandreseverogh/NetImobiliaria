'use client';
import React, { useEffect } from 'react';

/**
 * Player de vídeo para criativo em formato VIDEO — compartilhado entre toda tela que mostra
 * criativo lançado (hoje: "Criativos — feedback da Meta" do dashboard e "Consultar Campanhas").
 * `url: null` significa "é vídeo, mas o arquivo real ainda não foi guardado" (anúncio
 * importado antes deste recurso existir, ou falha best-effort no download da Meta) — mostra
 * um aviso honesto, nunca um player sem fonte.
 */
export interface VideoViewerState {
  name: string;
  url: string | null;
}

/** Detecta se uma URL já aponta direto pro arquivo de vídeo (não uma miniatura/imagem) —
 *  usado quando a fonte real (`Ad.videoUrl`) ainda não chegou mas a própria thumb já é o
 *  arquivo de vídeo (caso do criativo lançado pela plataforma: `CreativeAsset.storage_url`
 *  É o mp4, não uma miniatura separada). */
export function isVideoAssetUrl(url: string): boolean {
  return /\.(mp4|mov)(\?|$)/i.test(url);
}

export function VideoPlayerModal({
  viewer,
  onClose,
}: {
  viewer: VideoViewerState | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer, onClose]);

  if (!viewer) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center">
        <div className="flex w-full items-center justify-between gap-4 mb-3">
          <p className="text-sm font-black text-white truncate">{viewer.name}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
          >
            Fechar (Esc)
          </button>
        </div>
        {viewer.url ? (
          <video
            src={viewer.url}
            controls
            autoPlay
            className="max-h-[85vh] max-w-[90vw] rounded-xl bg-black"
          />
        ) : (
          <div className="max-w-md rounded-xl bg-white/5 border border-white/10 p-6 text-center">
            <p className="text-sm font-bold text-white">Vídeo original ainda não disponível</p>
            <p className="text-xs text-slate-300 mt-2">
              Este criativo foi sincronizado antes de o player de vídeo existir, ou o arquivo
              original não pôde ser baixado da Meta. Rode uma nova sincronização para tentar
              buscá-lo de novo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
