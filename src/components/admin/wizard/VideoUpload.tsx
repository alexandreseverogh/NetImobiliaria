'use client'

import React, { useCallback, useState } from 'react'
import { VideoUploadData } from '@/lib/types/video'

interface VideoUploadProps {
  onVideoSelect: (videoData: VideoUploadData) => void
  onVideoRemove: () => void
  existingVideo?: any
  mode: 'create' | 'edit'
  disabled?: boolean
}

// Validações de vídeo conforme planejamento
const VIDEO_VALIDATIONS = {
  FORMATOS_ACEITOS: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  EXTENSOES_ACEITAS: ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'],
  TAMANHO_MAXIMO: 50 * 1024 * 1024, // 50MB
  DURACAO_MAXIMA: 66, // 60 segundos + 10% de tolerância
  RESOLUCAO_MAXIMA: { width: 1920, height: 1080 },
  TAMANHO_MINIMO: 1024, // 1KB - evitar arquivos vazios
}

// Função para estimar duração do vídeo baseada no tamanho e tipo
function estimateVideoDuration(fileSize: number, mimeType: string): number {
  // Estimativas baseadas em bitrates típicos por tipo de vídeo
  const bitrateEstimates: { [key: string]: number } = {
    'video/mp4': 2000000,    // 2 Mbps
    'video/webm': 1500000,   // 1.5 Mbps
    'video/ogg': 1200000,    // 1.2 Mbps
    'video/quicktime': 2500000, // 2.5 Mbps
    'video/avi': 3000000,    // 3 Mbps
    'video/mkv': 2500000,    // 2.5 Mbps
  }
  
  const bitrate = bitrateEstimates[mimeType] || 2000000 // Default: 2 Mbps
  const durationSeconds = (fileSize * 8) / bitrate // Converter bytes para bits
  
  return Math.round(durationSeconds)
}

export default function VideoUpload({
  onVideoSelect,
  onVideoRemove,
  existingVideo,
  mode,
  disabled = false
}: VideoUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Função para validar vídeo
  const validateVideo = useCallback((file: File): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    // Validar se arquivo existe
    if (!file) {
      errors.push('Nenhum arquivo selecionado')
      return { isValid: false, errors }
    }
    
    // Validar nome do arquivo
    if (!file.name || file.name.trim().length === 0) {
      errors.push('Nome do arquivo inválido')
    }
    
    // Validar tamanho mínimo
    if (file.size < VIDEO_VALIDATIONS.TAMANHO_MINIMO) {
      errors.push(`Arquivo muito pequeno. Mínimo: ${VIDEO_VALIDATIONS.TAMANHO_MINIMO} bytes`)
    }
    
    // Validar tamanho máximo
    if (file.size > VIDEO_VALIDATIONS.TAMANHO_MAXIMO) {
      errors.push(`Arquivo muito grande. Máximo: ${VIDEO_VALIDATIONS.TAMANHO_MAXIMO / (1024 * 1024)}MB`)
    }
    
    // Validar tipo MIME
    if (!file.type || !VIDEO_VALIDATIONS.FORMATOS_ACEITOS.includes(file.type)) {
      errors.push(`Formato não suportado. Use: ${VIDEO_VALIDATIONS.FORMATOS_ACEITOS.join(', ')}`)
    }
    
    // Validar extensão
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (!extension || !VIDEO_VALIDATIONS.EXTENSOES_ACEITAS.includes(extension)) {
      errors.push(`Extensão não suportada. Use: ${VIDEO_VALIDATIONS.EXTENSOES_ACEITAS.join(', ')}`)
    }
    
    // Validar nome do arquivo (evitar caracteres especiais)
    const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'))
    if (!fileNameWithoutExt || fileNameWithoutExt.length < 1) {
      errors.push('Nome do arquivo deve ter pelo menos 1 caractere')
    }
    
    // Validar duração estimada (simulação - em produção usar ffprobe)
    const estimatedDuration = estimateVideoDuration(file.size, file.type)
    if (estimatedDuration > VIDEO_VALIDATIONS.DURACAO_MAXIMA) {
      errors.push(`Vídeo muito longo. Máximo: ${VIDEO_VALIDATIONS.DURACAO_MAXIMA} segundos (estimado: ${estimatedDuration}s)`)
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }, [])

  // Função para processar arquivo selecionado
  const processVideoFile = useCallback(async (file: File) => {
    setError(null)
    setIsUploading(true)

    try {
      // Validar vídeo
      const validation = validateVideo(file)
      if (!validation.isValid) {
        setError(validation.errors.join(', '))
        return
      }

      // Determinar formato e resolução (simulação)
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

      // Chamar callback com dados do vídeo
      onVideoSelect(videoData)

    } catch (error) {
      console.error('❌ Erro ao processar vídeo:', error)
      setError('Erro ao processar arquivo de vídeo')
    } finally {
      setIsUploading(false)
    }
  }, [validateVideo, onVideoSelect])

  // Handlers para drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    const videoFile = files.find(file => file.type.startsWith('video/'))
    
    if (videoFile) {
      processVideoFile(videoFile)
    } else {
      setError('Por favor, selecione um arquivo de vídeo válido')
    }
  }, [disabled, processVideoFile])

  // Handler para seleção de arquivo
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processVideoFile(file)
    }
  }, [processVideoFile])

  // Handler para remoção
  const handleRemove = useCallback(() => {
    setError(null)
    onVideoRemove()
  }, [onVideoRemove])

  // Renderizar área de upload
  const renderUploadArea = () => (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragOver 
          ? 'border-blue-400 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && document.getElementById('video-upload')?.click()}
    >
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        
        <div>
          <p className="text-lg font-medium text-gray-900">
            {isUploading ? 'Processando vídeo...' : 'Arraste um vídeo aqui'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            ou clique para selecionar
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Formatos aceitos: MP4, WebM, OGG • Máximo: 50MB • Duração: 60s
          </p>
        </div>
      </div>
      
      <input
        id="video-upload"
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  )

  // Renderizar vídeo existente
  const renderExistingVideo = () => (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-gray-900">{existingVideo.nome_arquivo}</p>
            <p className="text-sm text-gray-500">
              {(existingVideo.tamanho_bytes / (1024 * 1024)).toFixed(2)} MB • {existingVideo.duracao_segundos}s
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => document.getElementById('video-upload')?.click()}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            disabled={disabled}
          >
            Trocar
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            disabled={disabled}
          >
            Remover
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {existingVideo ? renderExistingVideo() : renderUploadArea()}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {isUploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-sm text-blue-600">Processando vídeo...</p>
          </div>
        </div>
      )}
    </div>
  )
}