'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheckIcon,
  CogIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'
import TwoFactorValidationModal from '@/components/admin/TwoFactorValidationModal'
import BulkPermissionsModal from '@/components/admin/BulkPermissionsModal'
import { useTwoFactorValidation, requiresTwoFactor, getActionDescription } from '@/hooks/useTwoFactorValidation'
import { useAuth } from '@/hooks/useAuth'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface Permission {
  id: number
  action: string
  description: string
  feature_id: number
  feature_name: string
  feature_category: string
  feature_url: string
  requires_2fa?: boolean  // Novo: vem do banco de dados
}

interface PermissionCategory {
  name: string
  permissions: Permission[]
  expanded: boolean
}

interface Role {
  id: number
  name: string
  description: string
  level: number
  is_active: boolean
  two_fa_required: boolean
}

export default function PermissionsPage() {
  const { get, post, put, delete: del } = useAuthenticatedFetch()
  const router = useRouter()
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissionsByCategory, setPermissionsByCategory] = useState<PermissionCategory[]>([])
  const [selectedRoles, setSelectedRoles] = useState<number[]>([])
  const [rolePermissions, setRolePermissions] = useState<Record<number, number[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showInactive, setShowInactive] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  
  // Hook para validação 2FA
  const {
    isTwoFactorModalOpen,
    twoFactorAction,
    twoFactorDescription,
    isTwoFactorRequired,
    showTwoFactorModal,
    hideTwoFactorModal
  } = useTwoFactorValidation()

  // Carregar dados iniciais
  const fetchAllRolePermissions = useCallback(async (roles: Role[]) => {
    const rolePermissionsMap: Record<number, number[]> = {}
    
    // Buscar permissões de todos os roles em paralelo para melhor performance
    const permissionPromises = roles.map(async (role) => {
      try {
        const response = await get(`/api/admin/roles/${role.id}/permissions`)
        if (response.ok) {
          const data = await response.json()
          return {
            roleId: role.id,
            permissions: data.permissions?.map((p: any) => p.permission_id) || []
          }
        }
        return { roleId: role.id, permissions: [] }
      } catch (error) {
        console.error(`Erro ao buscar permissões do role ${role.id}:`, error)
        return { roleId: role.id, permissions: [] }
      }
    })
    
    try {
      const results = await Promise.all(permissionPromises)
      results.forEach(({ roleId, permissions }) => {
        rolePermissionsMap[roleId] = permissions
      })
      setRolePermissions(rolePermissionsMap)
    } catch (error) {
      console.error('Erro ao buscar permissões dos roles:', error)
      // Em caso de erro, inicializar com arrays vazios
      roles.forEach(role => {
        rolePermissionsMap[role.id] = []
      })
      setRolePermissions(rolePermissionsMap)
    }
  }, [get])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      // Buscar permissões e roles em paralelo
      const [permissionsResponse, rolesResponse] = await Promise.all([
        fetch('/api/admin/permissions'),
        fetch('/api/admin/roles')
      ])

      if (!permissionsResponse.ok || !rolesResponse.ok) {
        throw new Error('Erro ao carregar dados')
      }

      const permissionsData = await permissionsResponse.json()
      const rolesData = await rolesResponse.json()


      setPermissions(permissionsData.permissions || [])
      setRoles(rolesData.roles || [])

      // Organizar permissões por categoria
      organizePermissionsByCategory(permissionsData.permissions || [])

      // Buscar permissões de todos os roles
      await fetchAllRolePermissions(rolesData.roles || [])

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error)
      setError('Erro ao carregar dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [fetchAllRolePermissions])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const organizePermissionsByCategory = (permissions: Permission[]) => {
    const categories: Record<string, Permission[]> = {}
    
    permissions.forEach(permission => {
      const category = permission.feature_category || 'Sem categoria'
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(permission)
    })

    const categoriesArray: PermissionCategory[] = Object.entries(categories)
      .map(([name, permissions]) => ({
        name,
        permissions,
        expanded: true
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    setPermissionsByCategory(categoriesArray)
  }

  const handleRoleToggle = (roleId: number) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    )
  }

  const handlePermissionToggle = async (permissionId: number, roleId: number) => {
    try {
      const currentPermissions = rolePermissions[roleId] || []
      const hasPermission = currentPermissions.includes(permissionId)
      
      // Buscar informações da permissão e role
      const permission = permissions.find(p => p.id === permissionId)
      const role = roles.find(r => r.id === roleId)
      
      if (!permission || !role) {
        alert('Erro: permissão ou role não encontrado')
        return
      }

      // Verificar se requer 2FA (passando o role do usuário atual)
      const needsTwoFactor = requiresTwoFactor(permission.action, permission.feature_category, user?.role_name)
      
      if (needsTwoFactor) {
        const actionText = hasPermission ? 'Remover' : 'Conceder'
        const actionDescription = getActionDescription(permission.action, permission.feature_category, role.name)
        
        const twoFactorCode = await showTwoFactorModal({
          action: `${actionText} permissão: ${actionDescription}`,
          description: `Esta ação afeta a segurança do sistema e requer confirmação 2FA.`,
          isRequired: true
        })

        if (!twoFactorCode) {
          // Usuário cancelou ou falhou na validação 2FA
          return
        }
      }

      const newPermissions = hasPermission
        ? currentPermissions.filter(id => id !== permissionId)
        : [...currentPermissions, permissionId]

      // Atualizar estado local imediatamente
      setRolePermissions(prev => ({
        ...prev,
        [roleId]: newPermissions
      }))

      // Enviar para API
      const response = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissions: newPermissions.map(id => ({
            role_id: roleId,
            permission_id: id,
            granted: true
          }))
        })
      })

      if (!response.ok) {
        // Reverter em caso de erro
        setRolePermissions(prev => ({
          ...prev,
          [roleId]: currentPermissions
        }))
        throw new Error('Erro ao atualizar permissão')
      }

      // Log da ação com 2FA
      if (needsTwoFactor) {
        console.log(`🔐 Ação 2FA executada: ${hasPermission ? 'Removida' : 'Concedida'} permissão ${permission.action} para ${role.name}`)
      }

    } catch (error) {
      console.error('Erro ao atualizar permissão:', error)
      alert('Erro ao atualizar permissão. Tente novamente.')
    }
  }

  const toggleCategory = (categoryName: string) => {
    setPermissionsByCategory(prev => 
      prev.map(cat => 
        cat.name === categoryName 
          ? { ...cat, expanded: !cat.expanded }
          : cat
      )
    )
  }

  const filteredCategories = permissionsByCategory.filter(category => {
    const matchesCategory = selectedCategory === 'all' || category.name === selectedCategory
    const matchesSearch = searchTerm === '' || 
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.permissions.some(permission => 
        permission.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    return matchesCategory && matchesSearch
  })

  const categories = Array.from(new Set(permissions.map(p => p.feature_category).filter(c => c !== null && c !== undefined))).sort()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando permissões...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <XCircleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Erro</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ShieldCheckIcon className="h-8 w-8 text-blue-600 mr-3" />
                Configuração de Permissões
              </h1>
              <p className="mt-2 text-gray-600">
                Gerencie permissões de forma visual e intuitiva
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


        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Busca */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar permissões..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Categoria */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="all">Todas as categorias</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Sem categoria'}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Inativos */}
            <div className="flex items-center">
              <button
                onClick={() => setShowInactive(!showInactive)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  showInactive 
                    ? 'bg-gray-200 text-gray-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {showInactive ? (
                  <EyeIcon className="h-5 w-5" />
                ) : (
                  <EyeSlashIcon className="h-5 w-5" />
                )}
                <span>Inativos</span>
              </button>
              
              <button
                onClick={() => setShowBulkModal(true)}
                disabled={selectedRoles.length === 0}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ClipboardDocumentListIcon className="h-5 w-5" />
                <span>Operações em Lote</span>
              </button>
            </div>

            {/* Estatísticas */}
            <div className="text-sm text-gray-600 flex items-center">
              <span>{permissions.length} permissões</span>
              <span className="mx-2">•</span>
              <span>{roles.length} perfis</span>
            </div>
          </div>
        </div>

        {/* Seleção de Perfis */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg border border-blue-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <ShieldCheckIcon className="h-5 w-5 mr-2 text-blue-600" />
            Selecione os Perfis para Configurar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {roles.filter(role => role.is_active || showInactive).map(role => (
              <button
                key={role.id}
                onClick={() => handleRoleToggle(role.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                  selectedRoles.includes(role.id)
                    ? 'border-blue-500 bg-blue-100 text-blue-900 shadow-md'
                    : 'border-blue-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                } ${!role.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{role.name}</div>
                    <div className="text-sm text-gray-500">{role.description}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {role.two_fa_required && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        2FA
                      </span>
                    )}
                    {!role.is_active && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Inativo
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Matriz de Permissões */}
        {selectedRoles.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-lg border border-blue-200 overflow-hidden">
            <div className="p-6 border-b border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 flex items-center">
                <ShieldCheckIcon className="h-5 w-5 mr-2 text-blue-600" />
                Matriz de Permissões
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                {selectedRoles.length} perfil(s) selecionado(s)
              </p>
              
              {/* Cabeçalhos dos perfis */}
              <div className="mt-4 flex items-center">
                <div className="w-80 text-sm font-semibold text-blue-800">
                  Permissão
                </div>
                <div className="flex space-x-4">
                  {selectedRoles.map(roleId => {
                    const role = roles.find(r => r.id === roleId)
                    const isHighlighted = role?.name === 'Super Admin' || role?.name === 'Admin'
                    return (
                      <div key={roleId} className={`w-20 text-center p-3 rounded-lg shadow-md ${
                        isHighlighted 
                          ? 'bg-blue-200 border-2 border-blue-400 shadow-lg' 
                          : 'bg-white border-2 border-blue-200 shadow-md'
                      }`}>
                        <div className={`text-lg font-bold mb-1 ${
                          isHighlighted ? 'text-blue-800' : 'text-blue-700'
                        }`}>
                          {role?.name?.charAt(0)}
                        </div>
                        <div className={`text-xs leading-tight font-semibold ${
                          isHighlighted ? 'text-blue-700' : 'text-blue-600'
                        }`} title={role?.name}>
                          {role?.name}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {filteredCategories.map(category => (
                <div key={category.name} className="border-b border-gray-200 last:border-b-0">
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="w-full px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 flex items-center justify-between transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <CogIcon className="h-6 w-6 text-blue-600" />
                      <span className="text-lg font-semibold text-gray-900">
                        {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({category.permissions.length} permissões)
                      </span>
                    </div>
                    <div className={`transform transition-transform ${category.expanded ? 'rotate-180' : ''}`}>
                      <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {category.expanded && (
                    <div className="divide-y divide-blue-200">
                      {category.permissions.map(permission => (
                        <div key={permission.id} className="px-6 py-4 bg-white hover:bg-blue-50 transition-colors duration-200">
                            <div className="flex items-center">
                              <div className="w-80">
                                <div className="flex items-center space-x-3">
                                  <span className="font-semibold text-gray-900 text-base">
                                    {permission.action}
                                  </span>
                                  {permission.requires_2fa && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                      2FA
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 mt-1 font-medium">
                                  {permission.description}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {permission.feature_url}
                                </div>
                              </div>

                              <div className="flex space-x-4">
                                {selectedRoles.map(roleId => {
                                  const role = roles.find(r => r.id === roleId)
                                  const hasPermission = rolePermissions[roleId]?.includes(permission.id) || false
                                  
                                  return (
                                    <div key={roleId} className="w-20 flex justify-center">
                                      <button
                                        onClick={() => handlePermissionToggle(permission.id, roleId)}
                                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                          hasPermission
                                            ? 'border-green-600 bg-green-500 text-white shadow-lg hover:bg-green-600 hover:shadow-xl'
                                            : 'border-gray-300 bg-white text-gray-400 hover:border-gray-400 hover:bg-gray-50'
                                        }`}
                                        title={`${hasPermission ? 'Remover' : 'Adicionar'} permissão para ${role?.name}`}
                                      >
                                        {hasPermission ? (
                                          <CheckCircleIcon className="h-4 w-4" />
                                        ) : (
                                          <XCircleIcon className="h-4 w-4" />
                                        )}
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedRoles.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <ShieldCheckIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Selecione um Perfil
            </h3>
            <p className="text-gray-600">
              Selecione pelo menos um perfil acima para configurar suas permissões.
            </p>
          </div>
        )}

        {/* Modal de Validação 2FA */}
        <TwoFactorValidationModal
          isOpen={isTwoFactorModalOpen}
          onClose={hideTwoFactorModal}
          onSuccess={(code) => {
            // A função de sucesso é gerenciada pelo hook
            ;(window as any).handleTwoFactorSuccess?.(code)
          }}
          action={twoFactorAction}
          description={twoFactorDescription}
          isRequired={isTwoFactorRequired}
        />

        {/* Modal de Bulk Operations */}
        <BulkPermissionsModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          onSuccess={(message) => {
            alert(message)
            fetchData() // Recarregar dados
          }}
          selectedRoles={roles.filter(role => selectedRoles.includes(role.id))}
          availableRoles={roles}
          permissions={permissions}
        />
      </div>
    </div>
  )
}
