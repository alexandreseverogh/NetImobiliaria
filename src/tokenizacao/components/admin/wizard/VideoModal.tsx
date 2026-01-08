/* eslint-disable */
'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ImovelVideo } from '@/lib/types/video'

interface VideoModalProps {
  video: ImovelVideo | null
  isOpen: boolean
  onClose: () => void
  selectedVideo?: any // Para vÃ­deos nÃ£o salvos
  rascunho?: any // Para vÃ­deos no modo rascunho
}

export default function VideoModal({ video, isOpen, onClose, selectedVideo, rascunho }: VideoModalProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Carregar vÃ­deo quando modal abrir
  useEffect(() => {
    const hasVideo = video || selectedVideo || (rascunho?.alteracoes?.video?.dados)
    if (isOpen && hasVideo) {
      loadVideo()
    } else {
      setVideoUrl(null)
      setError(null)
    }
  }, [isOpen, video, selectedVideo, rascunho])

  // Limpar URL quando modal fechar
  useEffect(() => {
    if (!isOpen && videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }
  }, [isOpen, videoUrl])

  // FunÃ§Ã£o para carregar vÃ­deo
  const loadVideo = async () => {
    const videoFromRascunho = rascunho?.alteracoes?.video?.dados
    
    console.log('ðŸ” VideoModal - loadVideo chamada:', {
      hasVideo: !!video,
      hasSelectedVideo: !!selectedVideo,
      hasVideoFromRascunho: !!videoFromRascunho,
      video: video,
      selectedVideo: selectedVideo,
      videoFromRascunho: videoFromRascunho,
      rascunhoCompleto: JSON.stringify(rascunho, null, 2)
    })
    
    if (!video && !selectedVideo && !videoFromRascunho) {
      console.log('âŒ VideoModal - Nenhum vÃ­deo encontrado')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let url: string

      // Prioridade: selectedVideo > video > rascunho
      if (selectedVideo && selectedVideo.arquivo) {
        console.log('ðŸ” VideoModal - Usando arquivo original do selectedVideo')
        url = URL.createObjectURL(selectedVideo.arquivo)
      } else if (video && video.video) {
        console.log('ðŸ” VideoModal - Usando vÃ­deo salvo do banco')
        const blob = new Blob([video.video], { type: video.tipo_mime })
        url = URL.createObjectURL(blob)
      } else if (videoFromRascunho && videoFromRascunho.videoBuffer) {
        console.log('ðŸ” VideoModal - Usando vÃ­deo do rascunho')
        
        // Verificar se videoBuffer Ã© um Buffer real ou objeto serializado
        let bufferData = videoFromRascunho.videoBuffer
        
        if (bufferData && typeof bufferData === 'object' && bufferData.type === 'Buffer' && Array.isArray(bufferData.data)) {
          console.log('ðŸ” VideoModal - Convertendo Buffer serializado para Buffer real')
          bufferData = Buffer.from(bufferData.data)
        } else if (!Buffer.isBuffer(bufferData)) {
          console.log('ðŸ” VideoModal - videoBuffer nÃ£o Ã© um Buffer vÃ¡lido:', typeof bufferData)
          throw new Error('videoBuffer invÃ¡lido')
        }
        
        const blob = new Blob([bufferData], { type: videoFromRascunho.tipoMime })
        url = URL.createObjectURL(blob)
      } else {
        throw new Error('Nenhum vÃ­deo disponÃ­vel')
      }

      setVideoUrl(url)
    } catch (err) {
      console.error('âŒ Erro ao carregar vÃ­deo:', err)
      setError('Erro ao carregar vÃ­deo')
    } finally {
      setIsLoading(false)
    }
  }

  // Handler para fechar modal
  const handleClose = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
    }
    onClose()
  }

  // Handler para tecla ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // NÃ£o renderizar se modal nÃ£o estiver aberto
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {(selectedVideo?.nomeArquivo || video?.nome_arquivo || rascunho?.alteracoes?.video?.dados?.nomeArquivo) || 'Preview do VÃ­deo'}
            </h3>
            {(selectedVideo || video || rascunho?.alteracoes?.video?.dados) && (
              <p className="text-sm text-gray-500">
                {selectedVideo ? 
                  `${(selectedVideo.tamanhoBytes / (1024 * 1024)).toFixed(2)} MB â€¢ ${selectedVideo.duracaoSegundos}s â€¢ ${selectedVideo.formato.toUpperCase()}` :
                  video ?
                  `${(video.tamanho_bytes / (1024 * 1024)).toFixed(2)} MB â€¢ ${video.duracao_segundos}s â€¢ ${video.formato.toUpperCase()}` :
                  rascunho?.alteracoes?.video?.dados ?
                  `${((rascunho.alteracoes.video.dados.tamanhoBytes || 0) / (1024 * 1024)).toFixed(2)} MB â€¢ ${rascunho.alteracoes.video.dados.duracaoSegundos || 0}s â€¢ ${(rascunho.alteracoes.video.dados.formato || 'mp4').toUpperCase()}` :
                  ''
                }
              </p>
            )}
          </div>
          
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando vÃ­deo...</p>
              </div>
            </div>
          ) : error ? (
            <div className="aspect-video bg-red-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-600 font-medium">Erro ao carregar vÃ­deo</p>
                <p className="text-red-500 text-sm mt-1">{error}</p>
              </div>
            </div>
          ) : videoUrl ? (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                className="w-full h-full"
                preload="metadata"
                onError={() => setError('Erro ao reproduzir vÃ­deo')}
              >
                Seu navegador nÃ£o suporta a reproduÃ§Ã£o de vÃ­deo.
              </video>
            </div>
          ) : (
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-600">Nenhum vÃ­deo disponÃ­vel</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

