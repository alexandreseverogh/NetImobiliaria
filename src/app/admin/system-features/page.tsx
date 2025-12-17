'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CogIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { useApi } from '@/hooks/useApi'
import { usePermissions } from '@/hooks/usePermissions'
import PermissionGuard from '@/components/admin/PermissionGuard'
import CreateSystemFeatureModal from '@/components/admin/CreateSystemFeatureModal'
import EditSystemFeatureModal from '@/components/admin/EditSystemFeatureModal'
import DeleteSystemFeatureModal from '@/components/admin/DeleteSystemFeatureModal'

interface SystemFeature {
  id: number
  name: string
  description: string
  category: string
  category_id?: number
  category_name?: string
  category_slug?: string
  category_color?: string
  url: string
  is_active: boolean
  permissions_count: number
  crud_execute?: string
  created_at: string
  updated_at: string
}


export default function SystemFeaturesPage() {
  const router = useRouter()
  const { get } = useApi()
  const { hasPermission } = usePermissions()
  const [features, setFeatures] = useState<SystemFeature[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingFeature, setEditingFeature] = useState<SystemFeature | null>(null)
  const [deletingFeature, setDeletingFeature] = useState<SystemFeature | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estados para permissões (garantir renderização)
  const [canUpdate, setCanUpdate] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [canCreate, setCanCreate] = useState(false)

  // Atualizar estados de permissões
  useEffect(() => {
    setCanUpdate(hasPermission('funcionalidades-sistema', 'UPDATE'))
    setCanDelete(hasPermission('funcionalidades-sistema', 'DELETE'))
    setCanCreate(hasPermission('funcionalidades-sistema', 'CREATE'))
  }, [hasPermission])

  const fetchFeatures = useCallback(async () => {
    try {
      setLoading(true)
      const response = await get('/api/admin/system-features')
      
      if (response.ok) {
        const data = await response.json()
        setFeatures(data.features || [])
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Erro ao carregar funcionalidades')
      }
    } catch (error) {
      console.error('Erro ao buscar funcionalidades:', error)
      setError('Erro ao carregar funcionalidades')
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => {
    fetchFeatures()
  }, [fetchFeatures])

  const handleCreateSuccess = (message: string) => {
    setSuccess(message)
    setError(null)
    setShowCreateModal(false)
    fetchFeatures()
  }

  const handleCreateError = (message: string) => {
    setError(message)
    setSuccess(null)
  }

  const handleEditSuccess = (message: string) => {
    setSuccess(message)
    setError(null)
    setShowEditModal(false)
    setEditingFeature(null)
    fetchFeatures()
  }

  const handleEditError = (message: string) => {
    setError(message)
    setSuccess(null)
  }

  const handleDeleteSuccess = (message: string) => {
    setSuccess(message)
    setError(null)
    setShowDeleteModal(false)
    setDeletingFeature(null)
    fetchFeatures()
  }

  const handleDeleteError = (message: string) => {
    setError(message)
    setSuccess(null)
  }


  const handleEditClick = (feature: SystemFeature) => {
    setEditingFeature(feature)
    setShowEditModal(true)
  }

  const handleDeleteClick = (feature: SystemFeature) => {
    console.log('🔍 DEBUG - handleDeleteClick chamado com feature:', feature)
    setDeletingFeature(feature)
    setShowDeleteModal(true)
    console.log('🔍 DEBUG - Modal de exclusão aberto')
  }

  const getCategories = () => {
    const categories = Array.from(new Set(features.map(f => f.category))).sort()
    return categories
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando funcionalidades...</p>
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
                Gerenciar Funcionalidades do Sistema
              </h1>
              <p className="mt-2 text-gray-600">
                Crie e gerencie funcionalidades do sistema com permissões automáticas
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Voltar
            </button>
          </div>
        </div>

        {/* Mensagens de Sucesso/Erro */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="ml-3">
                <p className="text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <XCircleIcon className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="ml-3">
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}



        {/* Lista de Funcionalidades */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Funcionalidades Existentes ({features.length})
            </h3>
            <PermissionGuard resource="funcionalidades-sistema" action="CREATE">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Adicionar Funcionalidade
              </button>
            </PermissionGuard>
          </div>

          {features.length === 0 ? (
            <div className="p-12 text-center">
              <CogIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Sistema de Funcionalidades
              </h3>
              <p className="text-gray-600 mb-4">
                Execute o SQL para criar as tabelas e dados necessários, ou comece criando sua primeira funcionalidade.
              </p>
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Primeiro passo:</strong> Execute o arquivo <code>fix-system-features-corrected.sql</code> no pgAdmin4
                  </p>
                </div>
                <PermissionGuard resource="funcionalidades-sistema" action="CREATE">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center mx-auto"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Criar Primeira Funcionalidade
                  </button>
                </PermissionGuard>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                      Funcionalidade
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Tipo
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      URL
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Permissões
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {features.map((feature) => (
                    <tr key={feature.id} className="hover:bg-gray-50">
                      <td className="px-3 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {feature.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate">
                            {feature.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          feature.crud_execute === 'CRUD' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {feature.crud_execute || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs truncate block">
                          {feature.url}
                        </code>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {feature.permissions_count}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        {feature.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircleIcon className="h-3 w-3 mr-1" />
                            Inativa
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-1">
                          {canUpdate && (
                            <button
                              onClick={() => handleEditClick(feature)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteClick(feature)}
                              className="text-red-600 hover:text-red-900"
                              title="Excluir"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Informações sobre Categorias */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">💡 Categorias Existentes:</h4>
          <div className="flex flex-wrap gap-2">
            {getCategories().map((category, index) => (
              <span key={`category-${index}-${category}`} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {category}
              </span>
            ))}
          </div>
          <p className="text-sm text-blue-700 mt-2">
            Ao criar uma nova funcionalidade, se a categoria não existir, ela será criada automaticamente.
          </p>
        </div>

        {/* Modais */}
        <CreateSystemFeatureModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
          onError={handleCreateError}
        />

        <EditSystemFeatureModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEditSuccess}
          onError={handleEditError}
          feature={editingFeature}
        />

        <DeleteSystemFeatureModal
          isOpen={showDeleteModal}
          onClose={() => {
            console.log('🔍 DEBUG - Fechando modal de exclusão')
            setShowDeleteModal(false)
          }}
          onSuccess={handleDeleteSuccess}
          onError={handleDeleteError}
          feature={deletingFeature}
        />
      </div>
    </div>
  )
}
