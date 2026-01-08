/* eslint-disable */
'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  PhotoIcon, 
  XMarkIcon, 
  EyeIcon,
  TrashIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface ImagemCarregada {
  id?: number
  file: File
  preview: string
  nome_arquivo: string
  tamanho: number
  tipo: string
  isDuplicate?: boolean
}

interface ImageUploadAdvancedProps {
  maxImages?: number
  maxFileSize?: number
  onImagesChange?: (images: ImagemCarregada[]) => void
  className?: string
}

export default function ImageUploadAdvanced({ 
  maxImages = 10,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  onImagesChange,
  className = '' 
}: ImageUploadAdvancedProps) {
  const [images, setImages] = useState<ImagemCarregada[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // FunÃ§Ã£o para calcular hash do arquivo (simplificado)
  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // Verificar se arquivo jÃ¡ existe
  const checkDuplicate = async (newFile: File): Promise<boolean> => {
    const newHash = await calculateFileHash(newFile)
    
    for (const existingImage of images) {
      const existingHash = await calculateFileHash(existingImage.file)
      if (newHash === existingHash) {
        return true
      }
    }
    
    return false
  }

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)

    // Verificar limite de imagens
    if (images.length + acceptedFiles.length > maxImages) {
      setError(`MÃ¡ximo de ${maxImages} imagens permitido!`)
      return
    }

    // Processar arquivos aceitos
    const newImages: ImagemCarregada[] = []
    
    for (const file of acceptedFiles) {
      // Verificar duplicata
      const isDuplicate = await checkDuplicate(file)
      
      if (isDuplicate) {
        setError(`A imagem "${file.name}" jÃ¡ foi carregada anteriormente!`)
        continue
      }

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" nÃ£o Ã© uma imagem vÃ¡lida!`)
        continue
      }

      // Validar tamanho
      if (file.size > maxFileSize) {
        setError(`"${file.name}" Ã© muito grande (mÃ¡x: ${Math.round(maxFileSize / 1024 / 1024)}MB)!`)
        continue
      }

      // Criar preview
      const preview = URL.createObjectURL(file)
      
      newImages.push({
        file,
        preview,
        nome_arquivo: file.name,
        tamanho: file.size,
        tipo: file.type
      })
    }

    // Processar arquivos rejeitados
    if (rejectedFiles.length > 0) {
      const rejectedErrors = rejectedFiles.map(({ file, errors }) => {
        if (errors.some((e: any) => e.code === 'file-too-large')) {
          return `"${file.name}" Ã© muito grande (mÃ¡x: ${Math.round(maxFileSize / 1024 / 1024)}MB)`
        }
        if (errors.some((e: any) => e.code === 'file-invalid-type')) {
          return `"${file.name}" tem tipo invÃ¡lido`
        }
        return `"${file.name}" nÃ£o pÃ´de ser processado`
      })
      
      if (rejectedErrors.length > 0) {
        setError(rejectedErrors.join(', '))
      }
    }

    // Adicionar novas imagens
    if (newImages.length > 0) {
      const updatedImages = [...images, ...newImages]
      setImages(updatedImages)
      
      if (onImagesChange) {
        onImagesChange(updatedImages)
      }
    }

  }, [images, maxImages, maxFileSize, onImagesChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },
    maxSize: maxFileSize,
    multiple: true
  })

  const removeImage = (index: number) => {
    const imageToRemove = images[index]
    URL.revokeObjectURL(imageToRemove.preview) // Limpar memÃ³ria
    
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    
    if (onImagesChange) {
      onImagesChange(newImages)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const clearError = () => {
    setError(null)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Imagens do ImÃ³vel
          </h3>
          <p className="text-sm text-gray-600">
            FaÃ§a upload de atÃ© {maxImages} imagens de alta qualidade
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {images.length}/{maxImages} imagens
        </div>
      </div>

      {/* Ãrea de Upload */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} disabled={images.length >= maxImages} />
        
        <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        
        <div className="space-y-2">
          <p className="text-lg font-medium text-gray-900">
            {images.length >= maxImages 
              ? 'Limite de imagens atingido'
              : isDragActive 
                ? 'Solte as imagens aqui' 
                : 'Clique para selecionar ou arraste imagens'
            }
          </p>
          <p className="text-sm text-gray-600">
            Formatos aceitos: JPG, PNG, GIF, WebP
          </p>
          <p className="text-sm text-gray-500">
            Tamanho mÃ¡ximo: {Math.round(maxFileSize / 1024 / 1024)}MB por imagem
          </p>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Lista de Imagens */}
      {images.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-900">
            Imagens Selecionadas ({images.length})
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                className="relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Imagem */}
                <div className="aspect-square relative">
                  <img
                    src={image.preview}
                    alt={image.nome_arquivo}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay com aÃ§Ãµes */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 hover:opacity-100 flex space-x-2 transition-opacity">
                      <button
                        onClick={() => setShowPreview(image.preview)}
                        className="p-2 bg-white bg-opacity-90 rounded-full text-gray-700 hover:bg-opacity-100 transition-colors"
                        title="Visualizar imagem"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeImage(index)}
                        className="p-2 bg-red-500 bg-opacity-90 rounded-full text-white hover:bg-opacity-100 transition-colors"
                        title="Remover imagem"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* InformaÃ§Ãµes da imagem */}
                <div className="p-3">
                  <p className="text-xs font-medium text-gray-900 truncate" title={image.nome_arquivo}>
                    {image.nome_arquivo}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(image.tamanho)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setShowPreview(null)}
              className="absolute top-2 right-2 p-2 bg-white bg-opacity-90 rounded-full text-gray-700 hover:bg-opacity-100 transition-colors z-10"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
            <img
              src={showPreview}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}







