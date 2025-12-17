'use client'

import { useState, useEffect, useCallback } from 'react'
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline'

interface SystemFeature {
  id: number
  name: string
  description: string
  category: string
  category_id?: number
  url: string
  is_active: boolean
  permissions_count: number
  crud_execute?: string
  created_at: string
  updated_at: string
}

interface Category {
  id: number
  name: string
  slug: string
  color: string
}

interface EditSystemFeatureModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
  feature: SystemFeature | null
}

export default function EditSystemFeatureModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onError,
  feature 
}: EditSystemFeatureModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: null as number | null,
    url: '',
    is_active: true,
    crud_execute: 'CRUD' as string
  })
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(false)

  // Buscar categorias quando o modal abrir
  const fetchCategories = useCallback(async () => {
    try {
      setLoadingCategories(true)
      console.log('🔍 DEBUG - Iniciando busca de categorias...')
      const token = localStorage.getItem('auth-token')
      console.log('🔍 DEBUG - Token encontrado:', token ? 'SIM' : 'NÃO')
      
      const response = await fetch('/api/admin/categorias', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('🔍 DEBUG - Response status:', response.status)
      console.log('🔍 DEBUG - Response ok:', response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 DEBUG - Dados recebidos:', data)
        console.log('🔍 DEBUG - Categorias encontradas:', data.categories?.length || 0)
        setCategories(data.categories || [])
      } else {
        const errorData = await response.json()
        console.error('❌ Erro ao buscar categorias:', errorData)
        onError('Erro ao carregar categorias')
      }
    } catch (error) {
      console.error('❌ Erro ao buscar categorias:', error)
      onError('Erro ao carregar categorias')
    } finally {
      setLoadingCategories(false)
    }
  }, [onError])

  useEffect(() => {
    if (isOpen) {
      fetchCategories()
    }
  }, [isOpen, fetchCategories])

  // Update form data when feature changes
  useEffect(() => {
    if (feature) {
      setFormData({
        name: feature.name,
        description: feature.description,
        category_id: feature.category_id || null,
        url: feature.url,
        is_active: feature.is_active,
        crud_execute: feature.crud_execute || 'CRUD'
      })
    }
  }, [feature])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!feature) return

    if (!formData.name.trim() || !formData.description.trim() || 
        !formData.category_id || !formData.url.trim()) {
      onError('Por favor, preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)
    
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/admin/system-features/${feature.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id,
          url: formData.url,
          is_active: formData.is_active,
          crud_execute: formData.crud_execute
        })
      })

      if (response.ok) {
        onSuccess(`Funcionalidade "${formData.name}" atualizada com sucesso!`)
        onClose()
      } else {
        const errorData = await response.json()
        onError(errorData.message || 'Erro ao atualizar funcionalidade')
      }
    } catch (error) {
      console.error('Erro ao atualizar funcionalidade:', error)
      onError('Erro ao atualizar funcionalidade')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
    }
  }

  if (!isOpen || !feature) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <PencilIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              Editar Funcionalidade
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome e Categoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Funcionalidade *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria *
              </label>
              <select
                required
                value={formData.category_id || ''}
                onChange={(e) => setFormData({...formData, category_id: e.target.value ? parseInt(e.target.value) : null})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading || loadingCategories}
              >
                <option value="">
                  {loadingCategories ? 'Carregando categorias...' : 'Selecione uma categoria'}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição *
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL *
            </label>
            <input
              type="text"
              required
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          {/* Tipo de Funcionalidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Funcionalidade
            </label>
            <div className="space-y-3">
              <label className="flex items-start">
                <input
                  type="radio"
                  name="crud_execute"
                  value="CRUD"
                  checked={formData.crud_execute === 'CRUD'}
                  onChange={(e) => setFormData({...formData, crud_execute: e.target.value})}
                  className="mt-1 mr-3"
                  disabled={loading}
                />
                <div>
                  <span className="font-medium text-gray-900">CRUD</span>
                  <p className="text-sm text-gray-600">
                    Funcionalidade com operações completas (CREATE, READ, UPDATE, DELETE)
                  </p>
                </div>
              </label>
              <label className="flex items-start">
                <input
                  type="radio"
                  name="crud_execute"
                  value="EXECUTE"
                  checked={formData.crud_execute === 'EXECUTE'}
                  onChange={(e) => setFormData({...formData, crud_execute: e.target.value})}
                  className="mt-1 mr-3"
                  disabled={loading}
                />
                <div>
                  <span className="font-medium text-gray-900">EXECUTE</span>
                  <p className="text-sm text-gray-600">
                    Funcionalidade de execução única (EXECUTE)
                  </p>
                </div>
              </label>
            </div>
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Atenção:</strong> Alterar o tipo da funcionalidade pode afetar as permissões existentes. 
                Recomenda-se verificar as permissões após a alteração.
              </p>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="mr-3"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">
                Funcionalidade ativa
              </span>
            </label>
          </div>

          {/* Informações adicionais */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Informações da Funcionalidade</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">ID:</span>
                <span className="ml-2 font-medium">{feature.id}</span>
              </div>
              <div>
                <span className="text-gray-600">Permissões:</span>
                <span className="ml-2 font-medium">{feature.permissions_count}</span>
              </div>
              <div>
                <span className="text-gray-600">Criado em:</span>
                <span className="ml-2 font-medium">
                  {new Date(feature.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Atualizado em:</span>
                <span className="ml-2 font-medium">
                  {new Date(feature.updated_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
