'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { 
  ShieldCheckIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  LockOpenIcon
} from '@heroicons/react/24/outline'

interface Permission {
  id: number
  action: string
  description: string
  feature_id: number
  feature_name: string
  feature_category: string
  requires_2fa: boolean
}

interface PermissionCategory {
  name: string
  permissions: Permission[]
}

export default function Config2FAPermissionsPage() {
  const { get, put } = useAuthenticatedFetch()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedAction, setSelectedAction] = useState<string>('all')
  const [show2FAOnly, setShow2FAOnly] = useState(false)
  const [updating, setUpdating] = useState<number | null>(null)

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await get('/api/admin/permissions')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar permissões')
      }
      
      const data = await response.json()
      setPermissions(data.permissions || [])
    } catch (err) {
      console.error('❌ Erro ao carregar permissões:', err)
      setError('Erro ao carregar permissões')
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const toggle2FA = async (permissionId: number, currentValue: boolean) => {
    try {
      setUpdating(permissionId)
      
      const response = await put(`/api/admin/permissions/${permissionId}/2fa`, {
        requires_2fa: !currentValue
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar 2FA')
      }

      // Atualizar estado local
      setPermissions(prev => prev.map(p => 
        p.id === permissionId 
          ? { ...p, requires_2fa: !currentValue }
          : p
      ))

      console.log(`✅ 2FA ${!currentValue ? 'ativado' : 'desativado'}`)
    } catch (err) {
      console.error('❌ Erro ao atualizar 2FA:', err)
      alert(err instanceof Error ? err.message : 'Erro ao atualizar 2FA')
    } finally {
      setUpdating(null)
    }
  }

  // Filtrar permissões
  const filteredPermissions = permissions.filter(p => {
    const matchSearch = !searchTerm || 
      p.feature_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.action.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchCategory = selectedCategory === 'all' || p.feature_category === selectedCategory
    const matchAction = selectedAction === 'all' || p.action === selectedAction
    const match2FA = !show2FAOnly || p.requires_2fa
    
    return matchSearch && matchCategory && matchAction && match2FA
  })

  // Agrupar por categoria
  const groupedByCategory = filteredPermissions.reduce((acc, permission) => {
    const category = permission.feature_category || 'Outros'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  // Estatísticas
  const stats = {
    total: permissions.length,
    with2FA: permissions.filter(p => p.requires_2fa).length,
    without2FA: permissions.filter(p => !p.requires_2fa).length,
    percentage: permissions.length > 0 
      ? ((permissions.filter(p => p.requires_2fa).length / permissions.length) * 100).toFixed(1)
      : '0'
  }

  // Obter categorias e ações únicas
  const categorySet = new Set(
    permissions
      .map(p => p.feature_category)
      .filter((category): category is string => Boolean(category))
  )
  const actionSet = new Set(permissions.map(p => p.action))

  const categories = ['all', ...Array.from(categorySet)]
  const actions = ['all', ...Array.from(actionSet)]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Configuração de 2FA em Permissões
            </h1>
          </div>
          <p className="text-gray-600">
            Gerencie quais permissões requerem autenticação de dois fatores (2FA) para execução
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total de Permissões
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <LockClosedIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Com 2FA
                    </dt>
                    <dd className="text-lg font-medium text-red-600">
                      {stats.with2FA}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <LockOpenIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Sem 2FA
                    </dt>
                    <dd className="text-lg font-medium text-green-600">
                      {stats.without2FA}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Cobertura 2FA
                    </dt>
                    <dd className="text-lg font-medium text-yellow-600">
                      {stats.percentage}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <FunnelIcon className="h-5 w-5 mr-2 text-gray-500" />
            Filtros
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Busca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Buscar funcionalidade ou ação..."
                />
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'Todas as categorias' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ação
              </label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {actions.map(act => (
                  <option key={act} value={act}>
                    {act === 'all' ? 'Todas as ações' : act}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro 2FA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status 2FA
              </label>
              <label className="flex items-center space-x-3 px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={show2FAOnly}
                  onChange={(e) => setShow2FAOnly(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Apenas com 2FA</span>
              </label>
            </div>
          </div>
        </div>

        {/* Aviso */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Atenção:</strong> Ativar 2FA em uma permissão significa que usuários precisarão fornecer código de autenticação de dois fatores ao executar esta ação, independente de ter 2FA no login.
              </p>
            </div>
          </div>
        </div>

        {/* Lista de permissões por categoria */}
        <div className="space-y-4">
          {Object.keys(groupedByCategory).sort().map(category => (
            <div key={category} className="bg-white shadow rounded-lg overflow-hidden">
              {/* Header da categoria */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  {category}
                  <span className="ml-3 text-sm font-normal bg-blue-500 px-3 py-1 rounded-full">
                    {groupedByCategory[category].length} permissões
                  </span>
                  <span className="ml-2 text-sm font-normal bg-red-500 px-3 py-1 rounded-full">
                    {groupedByCategory[category].filter(p => p.requires_2fa).length} com 2FA
                  </span>
                </h3>
              </div>

              {/* Permissões */}
              <div className="divide-y divide-gray-200">
                {groupedByCategory[category].map(permission => (
                  <div 
                    key={permission.id} 
                    className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                      permission.requires_2fa ? 'bg-red-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Info da permissão */}
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {permission.action}
                          </span>
                          <h4 className="text-base font-semibold text-gray-900">
                            {permission.feature_name}
                          </h4>
                          {permission.requires_2fa && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <LockClosedIcon className="h-3 w-3 mr-1" />
                              2FA ATIVO
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {permission.description}
                        </p>
                      </div>

                      {/* Toggle 2FA */}
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => toggle2FA(permission.id, permission.requires_2fa)}
                          disabled={updating === permission.id}
                          className={`relative inline-flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
                            permission.requires_2fa
                              ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          } ${
                            updating === permission.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {updating === permission.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          ) : permission.requires_2fa ? (
                            <LockClosedIcon className="h-5 w-5 mr-2" />
                          ) : (
                            <LockOpenIcon className="h-5 w-5 mr-2" />
                          )}
                          {permission.requires_2fa ? 'DESATIVAR 2FA' : 'ATIVAR 2FA'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Mensagem vazia */}
        {filteredPermissions.length === 0 && (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma permissão encontrada</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tente ajustar os filtros de busca
            </p>
          </div>
        )}
      </div>
    </div>
  )
}



