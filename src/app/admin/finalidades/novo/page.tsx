'use client'

import { useState } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

interface FinalidadeForm {
  nome: string
  descricao: string
  tipo_destaque: string
  alugar_landpaging: boolean
  vender_landpaging: boolean
}

export default function NovaFinalidadePage() {
  const { get, post, put, delete: del } = useAuthenticatedFetch()
  const router = useRouter()
  const [formData, setFormData] = useState<FinalidadeForm>({
    nome: '',
    descricao: '',
    tipo_destaque: '  ', // Default: sem destaque
    alugar_landpaging: false,
    vender_landpaging: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: keyof FinalidadeForm, value: string) => {
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

    setLoading(true)
    setError(null)

    try {
      const response = await post('/api/admin/finalidades', formData)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar finalidade')
      }

      const result = await response.json()
      console.log('Finalidade criada com sucesso:', result)
      
      // Redirecionar para a lista
      router.push('/admin/finalidades')
    } catch (error) {
      console.error('Erro ao criar finalidade:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/admin/finalidades')
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
            <h1 className="text-2xl font-bold text-gray-900">Nova Finalidade</h1>
            <p className="mt-1 text-sm text-gray-700">
              Adicione uma nova finalidade para imóveis
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
                placeholder="Ex: Venda, Aluguel, Temporada"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Nome único para identificar a finalidade
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
                placeholder="Descrição opcional da finalidade"
              />
              <p className="mt-1 text-xs text-gray-500">
                Descrição opcional para explicar melhor a finalidade
              </p>
            </div>

            {/* Tipo de Destaque */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo de Destaque
              </label>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="destaque-venda"
                    name="tipo_destaque"
                    value="DV"
                    checked={formData.tipo_destaque === 'DV'}
                    onChange={(e) => handleInputChange('tipo_destaque', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="destaque-venda" className="ml-3 text-sm text-gray-700">
                    Destaque Venda
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="destaque-aluguel"
                    name="tipo_destaque"
                    value="DA"
                    checked={formData.tipo_destaque === 'DA'}
                    onChange={(e) => handleInputChange('tipo_destaque', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="destaque-aluguel" className="ml-3 text-sm text-gray-700">
                    Destaque Aluguel
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="sem-destaque"
                    name="tipo_destaque"
                    value="  "
                    checked={formData.tipo_destaque === '  '}
                    onChange={(e) => handleInputChange('tipo_destaque', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <label htmlFor="sem-destaque" className="ml-3 text-sm text-gray-700">
                    Sem Destaque
                  </label>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Define se a finalidade terá destaque especial para venda ou aluguel
              </p>
            </div>

            {/* Exibição na Landing Page */}
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Exibição na Landing Page Pública
              </label>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="alugar_landpaging"
                    checked={formData.alugar_landpaging}
                    onChange={(e) => handleInputChange('alugar_landpaging', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="alugar_landpaging" className="ml-3 text-sm text-gray-700">
                    Exibir na landing page para Aluguel
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="vender_landpaging"
                    checked={formData.vender_landpaging}
                    onChange={(e) => handleInputChange('vender_landpaging', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="vender_landpaging" className="ml-3 text-sm text-gray-700">
                    Exibir na landing page para Venda
                  </label>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Define se a finalidade deve aparecer na landing page pública para aluguel ou venda
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
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Criando...' : 'Criar Finalidade'}
              </button>
            </div>
          </form>
        </div>
      </div>
  )
}


