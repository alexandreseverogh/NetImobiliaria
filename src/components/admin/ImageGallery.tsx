'use client'

import React, { useState } from 'react'
import { X, Trash2, Move, Eye, Star } from 'lucide-react'
import SafeImage from '@/components/common/SafeImage'

interface Imagem {
  id: number
  nome_arquivo: string
  url: string
  descricao?: string
  ordem: number
  principal: boolean
  ativo: boolean
  created_at: string
}

interface ImageGalleryProps {
  imagens: Imagem[]
  onReorder?: (imagens: Imagem[]) => void
  onDelete?: (imagemId: number) => void
  onSetPrincipal?: (imagemId: number) => void
  editable?: boolean
  className?: string
}

export default function ImageGallery({
  imagens,
  onReorder,
  onDelete,
  onSetPrincipal,
  editable = true,
  className = ''
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<Imagem | null>(null)
  const [draggedImage, setDraggedImage] = useState<Imagem | null>(null)

  const handleDragStart = (e: React.DragEvent, imagem: Imagem) => {
    if (!editable) return
    setDraggedImage(imagem)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!editable) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetImagem: Imagem) => {
    if (!editable || !draggedImage || !onReorder) return
    e.preventDefault()

    const newImagens = [...imagens]
    const draggedIndex = newImagens.findIndex(img => img.id === draggedImage.id)
    const targetIndex = newImagens.findIndex(img => img.id === targetImagem.id)

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remover imagem arrastada
      newImagens.splice(draggedIndex, 1)
      // Inserir na nova posição
      newImagens.splice(targetIndex, 0, draggedImage)
      // Atualizar ordens
      newImagens.forEach((img, index) => {
        img.ordem = index
      })
      
      onReorder(newImagens)
    }

    setDraggedImage(null)
  }

  const handleDelete = (imagem: Imagem) => {
    if (onDelete && confirm(`Tem certeza que deseja excluir a imagem "${imagem.nome_arquivo}"?`)) {
      onDelete(imagem.id)
    }
  }

  const handleSetPrincipal = (imagem: Imagem) => {
    if (onSetPrincipal) {
      onSetPrincipal(imagem.id)
    }
  }



  if (imagens.length === 0) {
    return (
      <div className={`text-center py-12 text-gray-500 ${className}`}>
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Eye className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-lg font-medium">Nenhuma imagem encontrada</p>
        <p className="text-sm">Faça upload de imagens para começar</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Título e contador */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">
          Galeria de Imagens ({imagens.length})
        </h3>
        {editable && (
          <p className="text-sm text-gray-500">
            Arraste para reordenar • Clique para visualizar
          </p>
        )}
      </div>

      {/* Grid de imagens */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {imagens.map((imagem, index) => (
          <div
            key={imagem.id}
            draggable={editable}
            onDragStart={(e) => handleDragStart(e, imagem)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, imagem)}
            className={`
              relative group cursor-pointer transition-all duration-200
              ${draggedImage?.id === imagem.id ? 'opacity-50 scale-95' : ''}
              ${imagem.principal ? 'ring-2 ring-blue-500' : ''}
            `}
          >
            {/* Imagem */}
            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
              <SafeImage
                src={imagem.url}
                alt={imagem.descricao || imagem.nome_arquivo}
                fill
                className="object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                onClick={() => setSelectedImage(imagem)}
                unoptimized
              />
              
              {/* Overlay com ações */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <button
                    onClick={() => setSelectedImage(imagem)}
                    className="bg-white text-gray-700 p-2 rounded-full hover:bg-gray-50 transition-colors"
                    title="Visualizar imagem"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  {editable && (
                    <>
                      <button
                        onClick={() => handleSetPrincipal(imagem)}
                        className={`p-2 rounded-full transition-colors ${
                          imagem.principal 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                        title={imagem.principal ? 'Imagem principal' : 'Definir como principal'}
                      >
                        <Star className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(imagem)}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                        title="Excluir imagem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Indicadores */}
              {imagem.principal && (
                <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  Principal
                </div>
              )}
              
              {editable && (
                <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  {index + 1}
                </div>
              )}
            </div>

            {/* Informações da imagem */}
            <div className="mt-2 text-xs text-gray-500">
              <p className="font-medium truncate">{imagem.nome_arquivo}</p>
              {imagem.ordem !== undefined && <p>Ordem: {imagem.ordem + 1}</p>}
            </div>

            {/* Ícone de arrastar */}
            {editable && (
              <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Move className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal de visualização */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full w-full">
            {/* Botão fechar */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-colors z-10"
              aria-label="Fechar visualização"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Imagem */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <SafeImage
                src={selectedImage.url}
                alt={selectedImage.descricao || selectedImage.nome_arquivo}
                fill
                className="object-contain rounded-lg"
                unoptimized
              />
            </div>

            {/* Informações da imagem */}
            <div className="mt-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">{selectedImage.nome_arquivo}</h3>
              {selectedImage.descricao && (
                <p className="text-sm text-gray-300 mb-2">{selectedImage.descricao}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <span>Ordem: {selectedImage.ordem + 1}</span>
                {selectedImage.principal && (
                  <span className="text-blue-400">⭐ Imagem Principal</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}






