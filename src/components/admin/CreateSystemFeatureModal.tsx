'use client'

import { useState, useEffect, useCallback } from 'react'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'

interface CreateSystemFeatureModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

interface CreateFeatureData {
  name: string
  description: string
  category_id: number | null
  url: string
  type: 'crud' | 'single'
  assignToSuperAdmin: boolean
  addToSidebar: boolean
}

interface Category {
  id: number
  name: string
  slug: string
  color: string
}

export default function CreateSystemFeatureModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onError 
}: CreateSystemFeatureModalProps) {
  const [formData, setFormData] = useState<CreateFeatureData>({
    name: '',
    description: '',
    category_id: null,
    url: '',
    type: 'crud',
    assignToSuperAdmin: true,
    addToSidebar: true
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🔍 DEBUG - Formulário submetido:', formData)
    
    if (!formData.name.trim() || !formData.description.trim() || 
        !formData.category_id || !formData.url.trim()) {
      console.log('❌ DEBUG - Campos obrigatórios não preenchidos')
      onError('Por favor, preencha todos os campos obrigatórios')
      return
    }

    console.log('✅ DEBUG - Validação passou, iniciando criação...')
    setLoading(true)
    
    try {
      const token = localStorage.getItem('auth-token')
      console.log('🔍 DEBUG - Token encontrado:', token ? 'SIM' : 'NÃO')
      
      console.log('🔍 DEBUG - Enviando requisição para API...')
      const response = await fetch('/api/admin/system-features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      console.log('🔍 DEBUG - Resposta recebida:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ DEBUG - Dados recebidos:', data)
        onSuccess(`Funcionalidade "${formData.name}" criada com sucesso! ${data.permissionsCreated} permissões geradas.`)
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          category_id: null,
          url: '',
          type: 'crud',
          assignToSuperAdmin: true,
          addToSidebar: true
        })
        
        onClose()
      } else {
        const errorData = await response.json()
        console.log('❌ DEBUG - Erro da API:', errorData)
        onError(errorData.message || 'Erro ao criar funcionalidade')
      }
    } catch (error) {
      console.error('❌ DEBUG - Erro ao criar funcionalidade:', error)
      onError('Erro ao criar funcionalidade')
    } finally {
      console.log('🔍 DEBUG - Finalizando processo...')
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        description: '',
        category_id: null,
        url: '',
        type: 'crud',
        assignToSuperAdmin: true,
        addToSidebar: true
      })
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <PlusIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              Criar Nova Funcionalidade
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
                placeholder="Ex: Produtos"
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
              <p className="text-xs text-gray-500 mt-1">
                Selecione uma categoria existente
              </p>
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
              placeholder="Ex: Gestão de produtos da loja"
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
              placeholder="Ex: /admin/produtos"
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
                  name="type"
                  value="crud"
                  checked={formData.type === 'crud'}
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'crud' | 'single'})}
                  className="mt-1 mr-3"
                  disabled={loading}
                />
                <div>
                  <span className="font-medium text-gray-900">CRUD</span>
                  <p className="text-sm text-gray-600">
                    Criará 4 permissões: CREATE, READ, UPDATE, DELETE
                  </p>
                </div>
              </label>
              <label className="flex items-start">
                <input
                  type="radio"
                  name="type"
                  value="single"
                  checked={formData.type === 'single'}
                  onChange={(e) => setFormData({...formData, type: e.target.value as 'crud' | 'single'})}
                  className="mt-1 mr-3"
                  disabled={loading}
                />
                <div>
                  <span className="font-medium text-gray-900">EXECUTE</span>
                  <p className="text-sm text-gray-600">
                    Criará 1 permissão: EXECUTE
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Opções */}
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.assignToSuperAdmin}
                onChange={(e) => setFormData({...formData, assignToSuperAdmin: e.target.checked})}
                className="mr-3"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">
                Atribuir ao Super Admin automaticamente
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.addToSidebar}
                onChange={(e) => setFormData({...formData, addToSidebar: e.target.checked})}
                className="mr-3"
                disabled={loading}
              />
              <span className="text-sm text-gray-700">
                Adicionar à sidebar automaticamente
              </span>
            </label>
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
              onClick={() => console.log('🔍 DEBUG - Botão clicado!')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Criando...
                </>
              ) : (
                <>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Criar Funcionalidade
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
