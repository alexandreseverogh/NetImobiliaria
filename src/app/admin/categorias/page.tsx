'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CogIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useApi } from '@/hooks/useApi'
import PermissionGuard from '@/components/admin/PermissionGuard'
import CategoryModal from '@/components/admin/categorias/CategoryModal'
import DeleteCategoryModal from '@/components/admin/categorias/DeleteCategoryModal'

interface Category {
  id: number
  name: string
  slug: string
  description: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  features?: any[]
}

export default function CategoriesPage() {
  const { get } = useApi()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const response = await get('/api/admin/categorias?include_features=true')
      
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Erro ao carregar categorias')
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
      setError('Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])


  const handleEditClick = (category: Category) => {
    setEditingCategory(category)
    setShowEditModal(true)
  }

  const handleDeleteClick = (category: Category) => {
    setDeletingCategory(category)
    setShowDeleteModal(true)
  }

  const handleDeleteSuccess = () => {
    setShowDeleteModal(false)
    setDeletingCategory(null)
    setSuccess('Categoria excluída com sucesso!')
    fetchCategories()
    
    // Limpar mensagem de sucesso após 3 segundos
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleDeleteError = (errorMessage: string) => {
    setError(errorMessage)
    
    // Limpar mensagem de erro após 5 segundos
    setTimeout(() => setError(null), 5000)
  }


  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      'CogIcon': CogIcon,
      'ShieldCheckIcon': ShieldCheckIcon,
    }
    
    const IconComponent = iconMap[iconName] || CogIcon
    return <IconComponent className="h-8 w-8" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando categorias...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <CogIcon className="h-8 w-8 text-blue-600 mr-3" />
                Gerenciar Categorias do Sistema
              </h1>
              <p className="mt-2 text-gray-600">
                Crie e gerencie categorias para organizar funcionalidades do sistema
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Nova Categoria
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erro</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Sucesso</h3>
                <div className="mt-2 text-sm text-green-700">{success}</div>
              </div>
            </div>
          </div>
        )}

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="flex items-center justify-center w-12 h-12 rounded-lg"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      <div style={{ color: category.color }}>
                        {getIconComponent(category.icon || 'CogIcon')}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                      <p className="text-sm text-gray-500">/{category.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditClick(category)}
                      className="p-2 text-gray-400 hover:text-blue-600"
                      title="Editar categoria"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(category)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Excluir categoria"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {category.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {category.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{category.features?.length || 0} funcionalidade(s)</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      category.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {category.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {categories.length === 0 && (
          <div className="text-center py-12">
            <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma categoria encontrada</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece criando uma nova categoria para organizar as funcionalidades.
            </p>
            <div className="mt-6">
              <PermissionGuard resource="system_categorias" action="CREATE">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Nova Categoria
                </button>
              </PermissionGuard>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CategoryModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false)
            fetchCategories()
          }}
        />
      )}

      {showEditModal && editingCategory && (
        <CategoryModal
          mode="edit"
          category={editingCategory}
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            setShowEditModal(false)
            setEditingCategory(null)
            fetchCategories()
          }}
        />
      )}

      {showDeleteModal && deletingCategory && (
        <DeleteCategoryModal
          category={deletingCategory}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteSuccess}
        />
      )}
    </div>
  )
}