'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

interface StatusImovelForm {
  nome: string
  cor: string
  descricao: string
  ativo: boolean
  consulta_imovel_internauta: boolean
}

export default function EditarStatusImovelPage({ searchParams }: { searchParams: { page?: string } }) {
  const { get, put } = useAuthenticatedFetch()
  const router = useRouter()
  const params = useParams()
  const statusImovelId = params.id as string
  const currentPage = searchParams.page || '1'
  
  const [formData, setFormData] = useState<StatusImovelForm>({
    nome: '',
    cor: '#3B82F6',
    descricao: '',
    ativo: true,
    consulta_imovel_internauta: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatusImovel = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await get(`/api/admin/status-imovel/${statusImovelId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Status de imóvel não encontrado')
        }
        throw new Error('Erro ao carregar status de imóvel')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao carregar status de imóvel')
      }
      
      setFormData({
        nome: data.data.nome || '',
        cor: data.data.cor || '#3B82F6',
        descricao: data.data.descricao || '',
        ativo: data.data.ativo !== undefined ? data.data.ativo : true,
        consulta_imovel_internauta: data.data.consulta_imovel_internauta !== undefined ? data.data.consulta_imovel_internauta : true
      })
    } catch (error) {
      console.error('Erro ao carregar status de imóvel:', error)
      setError('Erro ao carregar dados do status de imóvel')
    } finally {
      setLoading(false)
    }
  }, [get, statusImovelId])

  useEffect(() => {
    if (statusImovelId) {
      loadStatusImovel()
    }
  }, [statusImovelId, loadStatusImovel])

  const handleInputChange = (field: keyof StatusImovelForm, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      setError('Nome é obrigatório')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await put(`/api/admin/status-imovel/${statusImovelId}`, formData)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar status de imóvel')
      }

      const result = await response.json()
      console.log('Status de imóvel atualizado com sucesso:', result)
      
      // Redirecionar para a lista preservando a página
      router.push(`/admin/status-imovel?page=${currentPage}`)
    } catch (error) {
      console.error('Erro ao atualizar status de imóvel:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push(`/admin/status-imovel?page=${currentPage}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !formData.nome) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Erro: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleCancel}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Status de Imóvel</h1>
            <p className="mt-1 text-sm text-gray-700">
              Edite as informações do status de imóvel
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {/* Nome */}
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                Nome *
              </label>
              <input
                type="text"
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: Disponível, Vendido, Alugado"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Nome único para identificar o status
              </p>
            </div>

            {/* Cor */}
            <div>
              <label htmlFor="cor" className="block text-sm font-medium text-gray-700 mb-2">
                Cor
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  id="cor"
                  value={formData.cor}
                  onChange={(e) => handleInputChange('cor', e.target.value)}
                  className="h-10 w-16 border border-gray-300 rounded-md cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.cor}
                  onChange={(e) => handleInputChange('cor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#3B82F6"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Cor que será exibida para este status
              </p>
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição
              </label>
              <textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descrição opcional do status"
              />
              <p className="mt-1 text-xs text-gray-500">
                Descrição opcional para explicar melhor o status
              </p>
            </div>

            {/* Consulta Imóvel Internauta */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.consulta_imovel_internauta}
                  onChange={(e) => handleInputChange('consulta_imovel_internauta', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Consulta imóvel internauta
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Este status será exibido para consulta de imóveis pelos internautas
              </p>
            </div>


            {/* Status */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.ativo}
                  onChange={(e) => handleInputChange('ativo', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Status ativo
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Status inativos não aparecerão nos formulários
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
  )
}
