'use client'

import React, { useState, useEffect } from 'react'
import { useImageUpload } from '@/hooks/useImageUpload'
import ImageUpload from './ImageUpload'
import ImageGallery from './ImageGallery'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

interface ImageManagerProps {
  imovelId: number
  className?: string
}

export default function ImageManager({ imovelId, className = '' }: ImageManagerProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [showUpload, setShowUpload] = useState(false)
  
  const {
    imagens,
    isLoading,
    error,
    uploadImages,
    deleteImage,
    reorderImages,
    setPrincipalImage,
    loadImages,
    clearError
  } = useImageUpload()

  // Carregar imagens ao montar o componente
  useEffect(() => {
    if (imovelId) {
      loadImages(imovelId)
    }
  }, [imovelId, loadImages])

  const handleImagesChange = (files: File[]) => {
    setSelectedFiles(files)
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    try {
      await uploadImages(imovelId, selectedFiles)
      setSelectedFiles([])
      setShowUpload(false)
    } catch (error) {
      // Erro já é tratado pelo hook
      console.error('Erro no upload:', error)
    }
  }

  const handleDelete = async (imagemId: number) => {
    try {
      await deleteImage(imovelId, imagemId)
    } catch (error) {
      console.error('Erro ao excluir:', error)
    }
  }

  const handleReorder = async (imagens: any[]) => {
    try {
      await reorderImages(imovelId, imagens)
    } catch (error) {
      console.error('Erro ao reordenar:', error)
    }
  }

  const handleSetPrincipal = async (imagemId: number) => {
    try {
      await setPrincipalImage(imovelId, imagemId)
    } catch (error) {
      console.error('Erro ao definir principal:', error)
    }
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Gerenciar Imagens</h2>
        
        <div className="flex gap-3">
          {!showUpload && (
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Adicionar Imagens
            </button>
          )}
          
          {showUpload && (
            <button
              onClick={() => setShowUpload(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Mensagens de erro/sucesso */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-red-700">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Área de Upload */}
      {showUpload && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <ImageUpload
            onImagesChange={handleImagesChange}
            maxImages={10}
            maxFileSize={10 * 1024 * 1024}
            className="mb-4"
          />
          
          {selectedFiles.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={isLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Enviar {selectedFiles.length} Imagem(ns)
                  </>
                )}
              </button>
              
              <button
                onClick={() => setSelectedFiles([])}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Limpar Seleção
              </button>
            </div>
          )}
        </div>
      )}

      {/* Galeria de Imagens */}
      <div className="bg-white rounded-lg border border-gray-200">
        {isLoading && imagens.length === 0 ? (
          <div className="p-12 text-center">
            <Loader2 className="mx-auto h-12 w-12 text-gray-400 animate-spin mb-4" />
            <p className="text-gray-500">Carregando imagens...</p>
          </div>
        ) : (
          <ImageGallery
            imagens={imagens as any}
            onReorder={handleReorder}
            onDelete={handleDelete}
            onSetPrincipal={handleSetPrincipal}
            editable={true}
          />
        )}
      </div>

      {/* Estatísticas */}
      {imagens.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between text-sm text-blue-700">
            <span>
              Total de imagens: <strong>{imagens.length}</strong>
            </span>
            <span>
              Imagem principal: <strong>{(imagens.find(img => img.principal) as any)?.nome_arquivo || 'Nenhuma'}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}







