/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'

interface LoadedImage {
  id: string
  url: string
  nome: string
  descricao: string
  ordem: number
  principal: boolean
  dataUpload: string
  tamanho: number
  tipo: string
}

interface UploadedFile {
  id: string
  file: File
  preview: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

interface ImagePrincipalSelectorProps {
  loadedImages: LoadedImage[]
  selectedImages: UploadedFile[]
  selectedPrincipalId?: string
  onPrincipalChange: (imageId: string) => void
  mode: 'create' | 'edit'
}

export default function ImagePrincipalSelector({
  loadedImages,
  selectedImages,
  selectedPrincipalId,
  onPrincipalChange,
  mode
}: ImagePrincipalSelectorProps) {
  const [localPrincipalId, setLocalPrincipalId] = useState<string>(selectedPrincipalId || '')

  // Atualizar estado local quando prop muda
  useEffect(() => {
    setLocalPrincipalId(selectedPrincipalId || '')
  }, [selectedPrincipalId])

  // Encontrar imagem principal atual
  const currentPrincipal = loadedImages.find(img => img.principal)

  // Combinar todas as imagens disponÃ­veis e ordenar por ordem/posiÃ§Ã£o
  const allImages = [
    ...loadedImages.map(img => ({
      id: img.id,
      url: img.url,
      nome: img.nome,
      tipo: img.tipo,
      principal: img.principal,
      ordem: img.ordem
    })),
    ...selectedImages.filter(img => img.status === 'completed').map((img, index) => ({
      id: img.id,
      url: img.preview,
      nome: img.file.name,
      tipo: img.file.type,
      principal: false,
      ordem: loadedImages.length + index + 1
    }))
  ].sort((a, b) => a.ordem - b.ordem)

  const handleChange = (position: string) => {
    const selectedImage = allImages[parseInt(position) - 1]
    if (selectedImage) {
      setLocalPrincipalId(selectedImage.id)
      onPrincipalChange(selectedImage.id)
    }
  }

  // Encontrar a posiÃ§Ã£o atual da imagem principal selecionada
  const getCurrentPosition = () => {
    if (!localPrincipalId) return ''
    const index = allImages.findIndex(img => img.id === localPrincipalId)
    return index >= 0 ? (index + 1).toString() : ''
  }

  // Se nÃ£o hÃ¡ imagens, nÃ£o exibir o seletor
  if (allImages.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imagem Principal
        </label>
        
        <div className="flex items-center space-x-3">
          <select
            value={getCurrentPosition()}
            onChange={(e) => handleChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">
              {allImages.length > 0 
                ? "Selecione a posiÃ§Ã£o da imagem principal" 
                : "Nenhuma imagem disponÃ­vel"
              }
            </option>
            {allImages.map((image, index) => (
              <option key={image.id} value={(index + 1).toString()}>
                PosiÃ§Ã£o {index + 1} - {image.nome} {image.principal ? '(Principal Atual)' : ''}
              </option>
            ))}
          </select>
          
          {localPrincipalId && (
            <div className="flex-shrink-0">
              <img
                src={allImages.find(img => img.id === localPrincipalId)?.url}
                alt="Preview"
                className="w-16 h-16 object-cover rounded border border-gray-300"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/64x64?text=Erro'
                }}
              />
            </div>
          )}
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          {allImages.length > 0 ? (
            <>
              {allImages.length} imagem{allImages.length > 1 ? 'ns' : ''} disponÃ­vel{allImages.length > 1 ? 'is' : ''} (posiÃ§Ãµes 1 a {allImages.length}).
              {currentPrincipal && !localPrincipalId && (
                <span className="text-blue-600 ml-1">
                  Imagem principal atual: PosiÃ§Ã£o {allImages.findIndex(img => img.id === currentPrincipal.id) + 1}
                </span>
              )}
            </>
          ) : (
            'Adicione pelo menos uma imagem para definir a principal.'
          )}
        </div>
      </div>
    </div>
  )
}

