'use client'

import React, { useState, useRef, useCallback } from 'react'
import { ImovelVideo } from '@/lib/types/video'
import { VideoUploadData } from '@/lib/types/video'

interface VideoPreviewProps {
  video: ImovelVideo | null
  onReplace: (videoData: VideoUploadData) => void
  onRemove: () => void
  onPreview: () => void
  mode: 'create' | 'edit'
  rascunho?: any
  disabled?: boolean
}

export default function VideoPreview({
  video,
  onReplace,
  onRemove,
  onPreview,
  mode,
  rascunho,
  disabled = false
}: VideoPreviewProps) {
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Determinar se há vídeo para exibir
  const hasVideo = video || (rascunho && rascunho.alteracoes && rascunho.alteracoes.video && rascunho.alteracoes.video.dados)
  const displayVideo = video || (rascunho && rascunho.alteracoes && rascunho.alteracoes.video && rascunho.alteracoes.video.dados)
  
  console.log('🔍 VideoPreview - Props recebidas:', { 
    video, 
    rascunho, 
    hasVideo, 
    displayVideo,
    rascunhoVideo: rascunho?.alteracoes?.video,
    rascunhoVideoDados: rascunho?.alteracoes?.video?.dados
  })
  
  console.log('🔍 VideoPreview - Detalhes do rascunho:', JSON.stringify(rascunho, null, 2))
  console.log('🔍 VideoPreview - hasVideo:', hasVideo)
  console.log('🔍 VideoPreview - displayVideo:', displayVideo)

  // Processar arquivo selecionado para substituição
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🔍 VideoPreview - handleFileChange disparado!')
    const file = event.target.files?.[0]
    console.log('🔍 VideoPreview - Arquivo selecionado:', file)
    if (!file) {
      console.log('🔍 VideoPreview - Nenhum arquivo selecionado')
      return
    }

    try {
      setIsLoading(true)
      console.log('🔍 VideoPreview - Processando arquivo:', file.name, file.type, file.size)
      
      // Determinar formato e resolucao (simulação)
      const formato = file.name.split('.').pop()?.toLowerCase() || 'mp4'
      const resolucao = '1920x1080' // Em produção, extrair do arquivo

      // Criar objeto de dados do vídeo
      const videoData: VideoUploadData = {
        arquivo: file,
        nomeArquivo: file.name,
        tipoMime: file.type,
        tamanhoBytes: file.size,
        duracaoSegundos: 30, // Simulação - em produção usar ffprobe
        resolucao: resolucao,
        formato: formato
      }

      console.log('🔍 VideoPreview - Vídeo selecionado para substituição:', videoData)
      
      // Chamar callback com dados do vídeo
      onReplace(videoData)
      
      // Limpar input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('❌ Erro ao processar vídeo:', error)
    } finally {
      setIsLoading(false)
    }
  }, [onReplace])

  // Abrir seletor de arquivo
  const handleReplaceClick = useCallback(() => {
    console.log('🔍 VideoPreview - Botão Trocar clicado!')
    console.log('🔍 VideoPreview - fileInputRef.current:', fileInputRef.current)
    fileInputRef.current?.click()
  }, [])

  // Formatar tamanho do arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Formatar duração
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Renderizar quando não há vídeo
  if (!hasVideo) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-medium text-gray-900">Nenhum vídeo adicionado</p>
            <p className="text-sm text-gray-500">Faça upload de um vídeo para visualizar aqui</p>
          </div>
        </div>
      </div>
    )
  }

  // Renderizar vídeo existente
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white relative group">
      {/* Botão X de remover no canto superior direito (igual às imagens) */}
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        disabled={disabled}
        title="Remover vídeo"
      >
        ×
      </button>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {displayVideo?.nome_arquivo || displayVideo?.nomeArquivo || 'Vídeo (metadados ausentes)'}
            </p>
            <p className="text-sm text-gray-500">
              {formatFileSize(displayVideo?.tamanho_bytes || displayVideo?.tamanhoBytes || 0)} • {formatDuration(displayVideo?.duracao_segundos || displayVideo?.duracaoSegundos || 0)} • {(displayVideo?.formato || 'mp4').toUpperCase()}
            </p>
            {(displayVideo?.resolucao) && (
              <p className="text-xs text-gray-400">{displayVideo.resolucao}</p>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onPreview}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center space-x-1"
            disabled={disabled}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1M9 10v4a2 2 0 002 2h2a2 2 0 002-2v-4" />
            </svg>
            <span>Preview</span>
          </button>
          
          <button
            type="button"
            onClick={(e) => {
              console.log('🔍 VideoPreview - Botão Trocar clicado! Evento:', e)
              console.log('🔍 VideoPreview - disabled:', disabled)
              console.log('🔍 VideoPreview - fileInputRef.current:', fileInputRef.current)
              handleReplaceClick()
            }}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            disabled={disabled}
            style={{ pointerEvents: 'auto' }}
          >
            Trocar
          </button>
        </div>
      </div>

      {/* Thumbnail do vídeo (simulação) */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        <div className="aspect-video flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1M9 10v4a2 2 0 002 2h2a2 2 0 002-2v-4" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Clique em &quot;Preview&quot; para assistir</p>
          </div>
        </div>
      </div>

      {/* Status do rascunho */}
      {rascunho && rascunho.video && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-700">
            ⚠️ Alterações em rascunho - clique em &quot;Salvar Alterações&quot; para confirmar
          </p>
        </div>
      )}
      
      {/* Input hidden para substituição de vídeo */}
      <input
        ref={(ref) => {
          ;(fileInputRef as React.MutableRefObject<HTMLInputElement | null>).current = ref
          console.log('🔍 VideoPreview - Input criado:', ref)
          if (ref) {
            console.log('🔍 VideoPreview - Input disponível no DOM')
          }
        }}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Selecionar vídeo para substituição"
      />
    </div>
  )
}