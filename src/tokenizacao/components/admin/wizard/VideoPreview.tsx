/* eslint-disable */
'use client'

import React, { useState } from 'react'
import { ImovelVideo } from '@/lib/types/video'

interface VideoPreviewProps {
  video: ImovelVideo | null
  onReplace: () => void
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

  // Determinar se hÃ¡ vÃ­deo para exibir
  const hasVideo = video || (rascunho && rascunho.alteracoes && rascunho.alteracoes.video && rascunho.alteracoes.video.dados)
  const displayVideo = video || (rascunho && rascunho.alteracoes && rascunho.alteracoes.video && rascunho.alteracoes.video.dados)
  
  console.log('ðŸ” VideoPreview - Props recebidas:', { 
    video, 
    rascunho, 
    hasVideo, 
    displayVideo,
    rascunhoVideo: rascunho?.alteracoes?.video,
    rascunhoVideoDados: rascunho?.alteracoes?.video?.dados
  })
  
  console.log('ðŸ” VideoPreview - Detalhes do rascunho:', JSON.stringify(rascunho, null, 2))
  console.log('ðŸ” VideoPreview - hasVideo:', hasVideo)
  console.log('ðŸ” VideoPreview - displayVideo:', displayVideo)

  // Formatar tamanho do arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Formatar duraÃ§Ã£o
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Renderizar quando nÃ£o hÃ¡ vÃ­deo
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
            <p className="text-lg font-medium text-gray-900">Nenhum vÃ­deo adicionado</p>
            <p className="text-sm text-gray-500">FaÃ§a upload de um vÃ­deo para visualizar aqui</p>
          </div>
        </div>
      </div>
    )
  }

  // Renderizar vÃ­deo existente
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white relative group">
      {/* BotÃ£o X de remover no canto superior direito (igual Ã s imagens) */}
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
        disabled={disabled}
        title="Remover vÃ­deo"
      >
        Ã—
      </button>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">{displayVideo?.nome_arquivo || displayVideo?.nomeArquivo}</p>
            <p className="text-sm text-gray-500">
              {formatFileSize(displayVideo?.tamanho_bytes || displayVideo?.tamanhoBytes || 0)} â€¢ {formatDuration(displayVideo?.duracao_segundos || displayVideo?.duracaoSegundos || 0)} â€¢ {(displayVideo?.formato || 'mp4').toUpperCase()}
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
            onClick={onReplace}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            disabled={disabled}
          >
            Trocar
          </button>
        </div>
      </div>

      {/* Thumbnail do vÃ­deo (simulaÃ§Ã£o) */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        <div className="aspect-video flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10V9a2 2 0 012-2h2a2 2 0 012 2v1M9 10v4a2 2 0 002 2h2a2 2 0 002-2v-4" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Clique em "Preview" para assistir</p>
          </div>
        </div>
      </div>

      {/* Status do rascunho */}
      {rascunho && rascunho.video && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-700">
            âš ï¸ AlteraÃ§Ãµes em rascunho - clique em "Salvar AlteraÃ§Ãµes" para confirmar
          </p>
        </div>
      )}
    </div>
  )
}

