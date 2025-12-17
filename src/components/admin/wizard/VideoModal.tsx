'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ImovelVideo } from '@/lib/types/video'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface VideoModalProps {
  video: ImovelVideo | null
  isOpen: boolean
  onClose: () => void
  selectedVideo?: any // Para vídeos não salvos
  rascunho?: any // Para vídeos no modo rascunho
}

export default function VideoModal({ video, isOpen, onClose, selectedVideo, rascunho }: VideoModalProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { fetch: authFetch } = useAuthenticatedFetch()

  // Carregar vídeo quando modal abrir
  const loadVideo = useCallback(async () => {
    const videoFromRascunho = rascunho?.alteracoes?.video?.dados
    
    console.log('🔍 VideoModal - loadVideo chamada:', {
      hasVideo: !!video,
      hasSelectedVideo: !!selectedVideo,
      hasVideoFromRascunho: !!videoFromRascunho,
      video: video,
      selectedVideo: selectedVideo,
      videoFromRascunho: videoFromRascunho,
      rascunhoCompleto: JSON.stringify(rascunho, null, 2)
    })
    
    if (!video && !selectedVideo && !videoFromRascunho) {
      console.log('❌ VideoModal - Nenhum vídeo encontrado')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let url: string | null = null

      // Prioridade: selectedVideo > video > rascunho
      if (selectedVideo && selectedVideo.arquivo) {
        console.log('🔍 VideoModal - Usando arquivo original do selectedVideo')
        url = URL.createObjectURL(selectedVideo.arquivo)
      } else if (video && (video as any).video) {
        console.log('🔍 VideoModal - Usando vídeo salvo do banco')
        console.log('🔍 VideoModal - video.video tipo:', typeof video.video)
        console.log('🔍 VideoModal - video.video é Buffer:', Buffer.isBuffer(video.video))
        console.log('🔍 VideoModal - video.tipo_mime:', video.tipo_mime)
        console.log('🔍 VideoModal - video completo:', video)
        
        // Verificar se video.video é um Buffer válido
        if (Buffer.isBuffer(video.video)) {
          console.log('🔍 VideoModal - video.video é Buffer válido, criando Blob')
          const blob = new Blob([video.video as any], { type: video.tipo_mime || 'video/mp4' })
          url = URL.createObjectURL(blob)
        } else if (video.video && typeof video.video === 'object' && 'type' in video.video && 'data' in video.video) {
          const videoObj = video.video as { type: string; data: number[] }
          if (videoObj.type === 'Buffer' && Array.isArray(videoObj.data)) {
            console.log('🔍 VideoModal - video.video é Buffer serializado, convertendo')
            const bufferData = Buffer.from(videoObj.data)
            const blob = new Blob([bufferData as any], { type: video.tipo_mime || 'video/mp4' })
            url = URL.createObjectURL(blob)
          } else {
            console.log('🔍 VideoModal - video.video objeto inválido:', videoObj)
            throw new Error('video.video não é um Buffer válido')
          }
        } else if (video.video && typeof video.video === 'string') {
          console.log('🔍 VideoModal - video.video é string base64, convertendo')
          // Se for base64, converter para Buffer
          const bufferData = Buffer.from(video.video, 'base64')
          const blob = new Blob([bufferData as any], { type: video.tipo_mime || 'video/mp4' })
          url = URL.createObjectURL(blob)
        } else {
          console.log('🔍 VideoModal - video.video tipo não reconhecido:', typeof video.video)
          console.log('🔍 VideoModal - video.video estrutura:', video.video)
          throw new Error(`video.video não é um Buffer válido. Tipo: ${typeof video.video}`)
        }
      } else if (video && (video as any).url) {
        console.log('🔍 VideoModal - Usando URL direta do vídeo')
        url = (video as any).url
      } else if (videoFromRascunho && (videoFromRascunho.videoBuffer || videoFromRascunho.arquivo)) {
        console.log('🔍 VideoModal - Usando vídeo do rascunho')
        
        // Verificar se videoBuffer é um Buffer real, objeto serializado ou base64
        let bufferData = videoFromRascunho.videoBuffer || videoFromRascunho.arquivo
        const mimeType = videoFromRascunho.tipoMime || videoFromRascunho.tipo_mime || 'video/mp4'

        if (bufferData && typeof bufferData === 'object' && bufferData.type === 'Buffer' && Array.isArray(bufferData.data)) {
          console.log('🔍 VideoModal - Convertendo Buffer serializado para Buffer real')
          bufferData = Buffer.from(bufferData.data)
        } else if (typeof bufferData === 'string') {
          console.log('🔍 VideoModal - Convertendo string base64 do rascunho')
          bufferData = Buffer.from(bufferData, 'base64')
        } else if (!Buffer.isBuffer(bufferData)) {
          console.log('🔍 VideoModal - videoBuffer não é um Buffer válido:', typeof bufferData)
          throw new Error('videoBuffer inválido')
        }
        
        const blob = new Blob([bufferData], { type: mimeType })
        url = URL.createObjectURL(blob)
      } else if (video) {
        console.log('🔍 VideoModal - Metadados sem buffer ou url direta, buscando vídeo via API')
        const imovelTargetId =
          (video as any).imovel_id ??
          (video as any).imovelId ??
          rascunho?.imovelId ??
          rascunho?.imovel_id
        if (!imovelTargetId) {
          throw new Error('ID do imóvel não disponível para buscar vídeo')
        }
        console.log('🔍 VideoModal - Buscando preview na API para imóvel:', imovelTargetId)
        const response = await authFetch(`/api/admin/imoveis/${imovelTargetId}/video/preview`, {
          method: 'GET',
          headers: {
            Accept: 'video/*'
          }
        })
        if (!response.ok) {
          throw new Error(`Falha ao buscar o vídeo no servidor (status ${response.status})`)
        }
        const blob = await response.blob()
        if (blob.size === 0) {
          throw new Error('Vídeo retornado do servidor está vazio')
        }
        url = URL.createObjectURL(blob)
      }

      if (!url) {
        throw new Error('Nenhuma fonte de vídeo disponível')
      }

      setVideoUrl(url)
    } catch (err) {
      console.error('❌ Erro ao carregar vídeo:', err)
      setError('Erro ao carregar vídeo')
    } finally {
      setIsLoading(false)
    }
  }, [authFetch, rascunho, selectedVideo, video])

  useEffect(() => {
    const hasVideo = video || selectedVideo || (rascunho?.alteracoes?.video?.dados)
    if (isOpen && hasVideo) {
      loadVideo()
    } else {
      setVideoUrl(null)
      setError(null)
    }
  }, [isOpen, loadVideo, video, selectedVideo, rascunho])

  // Limpar URL quando modal fechar
  useEffect(() => {
    if (!isOpen && videoUrl) {
      URL.revokeObjectURL(videoUrl)
      setVideoUrl(null)
    }
  }, [isOpen, videoUrl])

  // Handler para fechar modal
  const handleClose = useCallback(() => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
    }
    onClose()
  }, [videoUrl, onClose])

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
  }, [isOpen, handleClose])

  // Não renderizar se modal não estiver aberto
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {(selectedVideo?.nomeArquivo || video?.nome_arquivo || rascunho?.alteracoes?.video?.dados?.nomeArquivo) || 'Preview do Vídeo'}
            </h3>
            {(selectedVideo || video || rascunho?.alteracoes?.video?.dados) && (
              <p className="text-sm text-gray-500">
                {selectedVideo ? 
                  `${(selectedVideo.tamanhoBytes / (1024 * 1024)).toFixed(2)} MB • ${selectedVideo.duracaoSegundos}s • ${selectedVideo.formato.toUpperCase()}` :
                  video ?
                  `${(video.tamanho_bytes / (1024 * 1024)).toFixed(2)} MB • ${video.duracao_segundos}s • ${video.formato.toUpperCase()}` :
                  rascunho?.alteracoes?.video?.dados ?
                  `${((rascunho.alteracoes.video.dados.tamanhoBytes || 0) / (1024 * 1024)).toFixed(2)} MB • ${rascunho.alteracoes.video.dados.duracaoSegundos || 0}s • ${(rascunho.alteracoes.video.dados.formato || 'mp4').toUpperCase()}` :
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
                <p className="text-gray-600">Carregando vídeo...</p>
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
                <p className="text-red-600 font-medium">Erro ao carregar vídeo</p>
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
                onError={() => setError('Erro ao reproduzir vídeo')}
              >
                Seu navegador não suporta a reprodução de vídeo.
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
                <p className="text-gray-600">Nenhum vídeo disponível</p>
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