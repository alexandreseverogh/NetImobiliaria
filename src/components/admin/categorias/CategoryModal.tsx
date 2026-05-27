'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { Category, CategoryFormData, CATEGORY_COLORS } from '@/types/categories'
import { useApi } from '@/hooks/useApi'
import IconPickerModal from '@/components/ui/IconPickerModal'
import DynamicIcon from '@/components/common/DynamicIcon'

interface CategoryModalProps {
  mode: 'create' | 'edit'
  category?: Category
  onClose: () => void
  onSave: () => void
}

export default function CategoryModal({ mode, category, onClose, onSave }: CategoryModalProps) {
  const { get, post, put } = useApi()
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    description: '',
    icon: 'CogIcon',
    color: '#6B7280',
    sort_order: 0,
    is_active: true,
    module_id: null
  })
  
  const [loading, setLoading] = useState(false)
  const [modules, setModules] = useState<{id: string, name: string, slug?: string}[]>([
    { id: '85fbb625-ce61-4122-af23-a5e305e5576a', name: 'Administrativo', slug: 'administrativo' },
    { id: 'f034078a-a46c-497d-93e1-cf6238b75e11', name: 'CRM de Vendas', slug: 'crm-vendas' }
  ])
  const [error, setError] = useState<string | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)
  
  const [showIconPicker, setShowIconPicker] = useState(false)

  // Log de estado para depuração
  useEffect(() => {
    console.log('Current modules state:', modules)
  }, [modules])

  // Carregar módulos e dados da categoria
  useEffect(() => {
    const fetchModules = async () => {
      try {
        console.log('Fetching modules for category association...')
        // Adicionar timestamp para evitar cache do navegador/Next.js
        const resp = await get(`/api/admin/modules/list?t=${Date.now()}`)
        const data = await resp.json()
        console.log('Modules data received from API:', data)
        if (data.success) {
          setModules(data.modules || [])
        }
      } catch (err) {
        console.error('Erro ao carregar módulos:', err)
      }
    }

    fetchModules()

    if (mode === 'edit' && category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        icon: category.icon || 'CogIcon',
        color: category.color,
        sort_order: category.sort_order,
        is_active: category.is_active,
        module_id: category.module_id || null
      })
    }
  }, [mode, category, get])

  // Gerar slug automaticamente baseado no nome
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .replace(/^-|-$/g, '') // Remove hífens do início e fim
  }

  // Validar slug
  const validateSlug = (slug: string) => {
    if (!slug) {
      setSlugError('Slug é obrigatório')
      return false
    }
    
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setSlugError('Slug deve conter apenas letras minúsculas, números e hífens')
      return false
    }
    
    if (slug.startsWith('-') || slug.endsWith('-')) {
      setSlugError('Slug não pode começar ou terminar com hífen')
      return false
    }
    
    setSlugError(null)
    return true
  }

  // Handlers
  const handleNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, name }))
    
    // Gerar slug automaticamente se estiver criando uma nova categoria
    if (mode === 'create') {
      const newSlug = generateSlug(name)
      setFormData(prev => ({ ...prev, slug: newSlug }))
    }
  }

  const handleSlugChange = (slug: string) => {
    setFormData(prev => ({ ...prev, slug }))
    validateSlug(slug)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateSlug(formData.slug)) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      let response
      
      if (mode === 'create') {
        response = await post('/api/admin/categorias', formData)
      } else {
        response = await put(`/api/admin/categorias/${category?.id}`, formData)
      }

      const result = await response.json()

      if (response.ok && result.success) {
        onSave()
      } else {
        setError(result.error || 'Erro ao salvar categoria')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {mode === 'create' ? 'Nova Categoria' : 'Editar Categoria'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nome da categoria"
              required
            />
          </div>

          {/* Módulo Pai */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vincular ao Módulo (Governança Master)
            </label>
            <select
              value={formData.module_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, module_id: e.target.value || null }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-indigo-700 bg-indigo-50"
            >
              <option value="">Sem vínculo (Apenas Super Admin)</option>
              {modules.map(mod => (
                <option key={mod.id} value={mod.id}>{mod.name}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-gray-400 leading-tight">
              Categorias vinculadas a um módulo serão visíveis para as empresas que assinarem esse módulo.
            </p>
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none ${
                slugError 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
              placeholder="slug-da-categoria"
              required
            />
            {slugError && (
              <p className="mt-1 text-sm text-red-600">{slugError}</p>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Descrição da categoria (opcional)"
            />
          </div>

          {/* Ícone e Cor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ícone
              </label>
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded border border-gray-300 flex items-center justify-center shrink-0">
                  <DynamicIcon iconName={formData.icon || ''} className="h-6 w-6 text-gray-600" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  className="px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 flex-1"
                >
                  {formData.icon ? 'Alterar' : 'Escolher Ícone'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <select
                  value={formData.color}
                  onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {CATEGORY_COLORS.map(color => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Ordem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ordem de Exibição
            </label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              min="0"
            />
          </div>

          {/* Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              Categoria ativa
            </label>
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : (mode === 'create' ? 'Criar' : 'Salvar')}
            </button>
          </div>
        </form>
      </div>

      <IconPickerModal 
        isOpen={showIconPicker} 
        onClose={() => setShowIconPicker(false)} 
        onSelect={(iconName) => setFormData(prev => ({ ...prev, icon: iconName }))} 
        currentIcon={formData.icon}
      />
    </div>
  )
}

