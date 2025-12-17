import { useState, useCallback } from 'react'
import { Imagem } from '@/lib/types/admin'

interface UseImageUploadReturn {
  imagens: Imagem[]
  isLoading: boolean
  error: string | null
  uploadImages: (imovelId: number, files: File[]) => Promise<void>
  deleteImage: (imovelId: number, imagemId: number) => Promise<void>
  reorderImages: (imovelId: number, imagens: Imagem[]) => Promise<void>
  setPrincipalImage: (imovelId: number, imagemId: number) => Promise<void>
  loadImages: (imovelId: number) => Promise<void>
  clearError: () => void
}

export function useImageUpload(): UseImageUploadReturn {
  const [imagens, setImagens] = useState<Imagem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const loadImages = useCallback(async (imovelId: number) => {
    try {
      console.log('🔍 useImageUpload loadImages - Carregando imagens para imóvel:', imovelId)
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/imoveis/${imovelId}/imagens`)
      console.log('🔍 useImageUpload loadImages - Resposta da API:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ useImageUpload loadImages - Erro na resposta:', errorData)
        throw new Error(errorData.error || 'Erro ao carregar imagens')
      }

      const data = await response.json()
      console.log('🔍 useImageUpload loadImages - Dados recebidos:', data)
      const imagensDoBanco = data.data || []
      console.log('🔍 useImageUpload loadImages - Imagens do banco:', imagensDoBanco.length)
      
      // Converter dados do banco para o formato da interface Imagem
      const imagensFormatadas = imagensDoBanco
        .map((img: any) => ({
          id: img.id.toString(),
          url: `data:${img.tipo_mime};base64,${img.imagem.toString('base64')}`,
          nome: `imagem_${img.id}`,
          descricao: '',
          ordem: img.ordem,
          principal: img.principal,
          dataUpload: img.created_at,
          tamanho: img.tamanho_bytes,
          tipo: img.tipo_mime
        }))
        .sort((a, b) => {
          // Ordenar por ordem primeiro, depois por ID
          if (a.ordem !== b.ordem) {
            return a.ordem - b.ordem
          }
          return parseInt(a.id) - parseInt(b.id)
        })
      
      console.log('🔍 useImageUpload loadImages - Imagens formatadas:', imagensFormatadas.length)
      console.log('🔍 useImageUpload loadImages - Ordem das imagens:', imagensFormatadas.map(img => ({ id: img.id, ordem: img.ordem })))
      setImagens(imagensFormatadas)
      console.log('✅ useImageUpload loadImages - Imagens carregadas com sucesso')
    } catch (err) {
      console.error('❌ useImageUpload loadImages - Erro:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const uploadImages = useCallback(async (imovelId: number, files: File[]) => {
    try {
      setIsLoading(true)
      setError(null)

      const formData = new FormData()
      files.forEach(file => {
        formData.append('images', file)
      })

      const response = await fetch(`/api/admin/imoveis/${imovelId}/imagens`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao fazer upload das imagens')
      }

      const data = await response.json()
      
      // Recarregar imagens para obter os IDs gerados
      await loadImages(imovelId)
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [loadImages])

  const deleteImage = useCallback(async (imovelId: number, imagemId: number) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/imoveis/${imovelId}/imagens?id=${imagemId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao excluir imagem')
      }

      // Remover imagem da lista local
      setImagens(prev => prev.filter(img => img.id !== imagemId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reorderImages = useCallback(async (imovelId: number, imagens: Imagem[]) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/imoveis/${imovelId}/imagens`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imagens: imagens.map((img, index) => ({ id: img.id, ordem: index })) })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao reordenar imagens')
      }

      // Atualizar lista local
      setImagens(imagens)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const setPrincipalImage = useCallback(async (imovelId: number, imagemId: number) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/imoveis/${imovelId}/imagens`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imagemId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao definir imagem principal')
      }

      // Atualizar lista local
      setImagens(prev => prev.map(img => ({
        ...img,
        principal: img.id === imagemId
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    imagens,
    isLoading,
    error,
    uploadImages,
    deleteImage,
    reorderImages,
    setPrincipalImage,
    loadImages,
    clearError
  }
}






