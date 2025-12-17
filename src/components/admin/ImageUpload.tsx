'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, Image as ImageIcon, AlertCircle } from 'lucide-react'
import SafeImage from '@/components/common/SafeImage'

interface ImageUploadProps {
  onImagesChange: (images: File[]) => void
  maxImages?: number
  maxFileSize?: number
  acceptedTypes?: string[]
  className?: string
}

export default function ImageUpload({
  onImagesChange,
  maxImages = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = ''
}: ImageUploadProps) {
  const [images, setImages] = useState<File[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Processar arquivos aceitos
    const newImages = [...images, ...acceptedFiles]
    
    if (newImages.length > maxImages) {
      setErrors([`Máximo de ${maxImages} imagens permitido`])
      return
    }

    setImages(newImages)
    onImagesChange(newImages)
    setErrors([])

    // Processar arquivos rejeitados
    if (rejectedFiles.length > 0) {
      const newErrors = rejectedFiles.map(({ file, errors }) => {
        if (errors.some((e: any) => e.code === 'file-too-large')) {
          return `${file.name} é muito grande (máx: ${Math.round(maxFileSize / 1024 / 1024)}MB)`
        }
        if (errors.some((e: any) => e.code === 'file-invalid-type')) {
          return `${file.name} tem tipo inválido`
        }
        return `${file.name} não pôde ser processado`
      })
      setErrors(newErrors)
    }
  }, [images, maxImages, maxFileSize, onImagesChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': acceptedTypes
    },
    maxSize: maxFileSize,
    multiple: true
  })

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    setImages(newImages)
    onImagesChange(newImages)
  }

  const getFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={className}>
      {/* Área de Upload */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} disabled={images.length >= maxImages} />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        
        {isDragActive ? (
          <p className="text-lg font-medium text-blue-600">
            Solte as imagens aqui...
          </p>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Arraste e solte imagens aqui
            </p>
            <p className="text-sm text-gray-500 mb-4">
              ou clique para selecionar arquivos
            </p>
            <p className="text-xs text-gray-400">
              PNG, JPG, WEBP até {Math.round(maxFileSize / 1024 / 1024)}MB
            </p>
          </div>
        )}
      </div>

      {/* Erros */}
      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          {errors.map((error, index) => (
            <div key={index} className="flex items-center text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Preview das Imagens */}
      {images.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Imagens Selecionadas ({images.length}/{maxImages})
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                  <SafeImage
                    src={URL.createObjectURL(image)}
                    alt={`Preview ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  
                  {/* Overlay com botão de remover */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                    <button
                      onClick={() => removeImage(index)}
                      className="opacity-0 group-hover:opacity-100 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-all duration-200"
                      title="Remover imagem"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Informações da imagem */}
                <div className="mt-2 text-xs text-gray-500">
                  <p className="font-medium truncate">{image.name}</p>
                  <p>{getFileSize(image.size)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dicas */}
      <div className="mt-4 text-sm text-gray-500">
        <p>• Primeira imagem será a imagem principal do imóvel</p>
        <p>• Você pode reordenar as imagens depois do upload</p>
        <p>• Imagens serão otimizadas automaticamente</p>
      </div>
    </div>
  )
}






