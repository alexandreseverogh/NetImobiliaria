/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import PermissionGuard from '@/components/admin/PermissionGuard'

interface FinalidadeForm {
  nome: string
  descricao: string
  ativo: boolean
}

export default function EditarFinalidadePage() {
  const router = useRouter()
  const params = useParams()
  const finalidadeId = params.id as string
  
  const [formData, setFormData] = useState<FinalidadeForm>({
    nome: '',
    descricao: '',
    ativo: true
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (finalidadeId) {
      loadFinalidade()
    }
  }, [finalidadeId])

  const loadFinalidade = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/admin/finalidades/${finalidadeId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Finalidade não encontrada')
        }
        throw new Error('Erro ao carregar finalidade')
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao carregar finalidade')
      }
      
      setFormData({
        nome: data.data.nome || '',
        descricao: data.data.descricao || '',
        ativo: data.data.ativo !== undefined ? data.data.ativo : true
      })
    } catch (error) {
      console.error('Erro ao carregar finalidade:', error)
      setError('Erro ao carregar dados da finalidade')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FinalidadeForm, value: string | boolean) => {
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
      const response = await fetch(`/api/admin/finalidades/${finalidadeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar finalidade')
      }

      const result = await response.json()
      console.log('Finalidade atualizada com sucesso:', result)
      
      // Redirecionar para a lista
      router.push('/admin/finalidades')
    } catch (error) {
      console.error('Erro ao atualizar finalidade:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/admin/finalidades')
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
    <PermissionGuard resource="finalidades" action="WRITE">
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
            <h1 className="text-2xl font-bold text-gray-900">Editar Finalidade</h1>
            <p className="mt-1 text-sm text-gray-700">
              Edite as informações da finalidade
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
                  Finalidade ativa
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Finalidades inativas não aparecerão nos formulários
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
    </PermissionGuard>
  )
}


