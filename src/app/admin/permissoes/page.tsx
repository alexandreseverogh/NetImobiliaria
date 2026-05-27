'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
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
  ClipboardDocumentListIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  CommandLineIcon
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

interface FeatureWithPermissions {
  id: number
  name: string
  category: string
  url: string
  permissions: Permission[]
}

interface PermissionCategory {
  name: string
  features: FeatureWithPermissions[]
  expanded: boolean
}

interface Role {
  id: number
  name: string
  description: string
  level: number
  is_active: boolean
  two_fa_required: boolean
  is_system_role: boolean
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

      // 🛡️ SEGURANÇA: Filtrar perfis Master para que jamais sejam exibidos/configurados na matriz
      const filteredRoles = (rolesData.roles || []).filter((r: Role) => r.is_system_role !== true)

      setPermissions(permissionsData.permissions || [])
      setRoles(filteredRoles)

      // Organizar permissões por categoria
      organizePermissionsByCategory(permissionsData.permissions || [])

      // Buscar permissões de todos os roles filtrados
      await fetchAllRolePermissions(filteredRoles)

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
    const featuresMap: Record<number, FeatureWithPermissions> = {}
    
    // Agrupar permissões por funcionalidade
    permissions.forEach(p => {
      if (!featuresMap[p.feature_id]) {
        featuresMap[p.feature_id] = {
          id: p.feature_id,
          name: p.feature_name,
          category: p.feature_category || 'Sem categoria',
          url: p.feature_url,
          permissions: []
        }
      }
      featuresMap[p.feature_id].permissions.push(p)
    })

    const categories: Record<string, FeatureWithPermissions[]> = {}
    Object.values(featuresMap).forEach(feature => {
      const category = feature.category
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(feature)
    })

    const categoriesArray: PermissionCategory[] = Object.entries(categories)
      .map(([name, features]) => ({
        name,
        features: features.sort((a, b) => a.name.localeCompare(b.name)),
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
      category.features.some(feature => 
        feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        feature.permissions.some(p => p.action.toLowerCase().includes(searchTerm.toLowerCase()))
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
            {/* Cabeçalho da Matriz com Legenda */}
            <div className="p-8 border-b border-blue-200 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-blue-900 flex items-center">
                    <ShieldCheckIcon className="h-6 w-6 mr-2 text-blue-600" />
                    Matriz de Governança
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Configure a granularidade de cada funcionalidade por perfil.
                  </p>
                </div>
                
                {/* LEGENDA DE AÇÕES */}
                <div className="flex items-center space-x-4 bg-white p-3 rounded-2xl border border-blue-100 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-gray-400 mr-2 border-r pr-4 border-gray-200">Legenda:</span>
                  <div className="flex items-center space-x-3 text-[10px] font-bold text-gray-600">
                    <div className="flex items-center"><EyeIcon className="h-3 w-3 mr-1 text-blue-500" /> Visualizar</div>
                    <div className="flex items-center"><PlusIcon className="h-3 w-3 mr-1 text-green-500" /> Criar</div>
                    <div className="flex items-center"><PencilSquareIcon className="h-3 w-3 mr-1 text-amber-500" /> Editar</div>
                    <div className="flex items-center"><TrashIcon className="h-3 w-3 mr-1 text-red-500" /> Excluir</div>
                    <div className="flex items-center"><CommandLineIcon className="h-3 w-3 mr-1 text-purple-500" /> Executar</div>
                  </div>
                </div>
              </div>
              
              {/* Cabeçalhos das Colunas - ALINHAMENTO FIXO 180px */}
              <div className="flex items-center">
                <div className="w-[320px] text-xs font-black uppercase tracking-widest text-blue-800">
                  Funcionalidade
                </div>
                <div className="flex items-stretch">
                  {selectedRoles.map((roleId, idx) => {
                    const role = roles.find(r => r.id === roleId)
                    return (
                      <Fragment key={roleId}>
                        {/* Divisor no Cabeçalho */}
                        {idx > 0 && <div className="w-[2px] bg-slate-900 self-stretch my-2 opacity-50" />}
                        
                        <div className="w-[180px] flex flex-col items-center">
                          <div className="w-12 h-12 bg-white border-2 border-blue-200 rounded-2xl shadow-sm flex items-center justify-center mb-2">
                             <span className="text-xl font-black text-blue-600">{role?.name?.charAt(0)}</span>
                          </div>
                          <span className="text-[10px] font-black uppercase text-blue-900 tracking-tighter text-center line-clamp-1 w-full px-2">
                            {role?.name}
                          </span>
                        </div>
                      </Fragment>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[60vh] custom-scrollbar">
              {filteredCategories.map(category => (
                <div key={category.name} className="border-b border-gray-100 last:border-b-0">
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="w-full px-8 py-4 bg-gray-50/50 hover:bg-gray-100/80 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                        <CogIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="text-base font-bold text-gray-800 uppercase tracking-tight">
                        {category.name}
                      </span>
                      <span className="text-[10px] font-black text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100">
                        {category.features.length} Funcionalidades
                      </span>
                    </div>
                    <div className={`transform transition-transform ${category.expanded ? 'rotate-180' : ''}`}>
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {category.expanded && (
                    <div className="divide-y divide-gray-50">
                      {category.features.map(feature => (
                        <div key={feature.id} className="px-8 py-4 bg-white hover:bg-blue-50/30 transition-colors group">
                            <div className="flex items-center">
                              {/* Nome da Funcionalidade - LARGURA FIXA 320px */}
                              <div className="w-[320px] pr-8">
                                <h4 className="font-bold text-gray-800 text-sm group-hover:text-blue-700 transition-colors">
                                  {feature.name}
                                </h4>
                                <div className="text-[9px] text-gray-400 mt-0.5 font-mono opacity-60">
                                  {feature.url}
                                </div>
                              </div>

                              {/* Colunas de Perfis - LARGURA FIXA 180px com Divisor Centralizado */}
                              <div className="flex items-stretch">
                                {selectedRoles.map((roleId, idx) => {
                                  const role = roles.find(r => r.id === roleId)
                                  const grantedPermissionIds = rolePermissions[roleId] || []
                                  
                                  return (
                                    <Fragment key={roleId}>
                                      {/* Linha Divisória Vertical entre Perfis */}
                                      {idx > 0 && <div className="w-[2px] bg-slate-900 self-stretch z-10" />}
                                      
                                      <div 
                                        className={`w-[180px] flex justify-center items-center gap-2 px-4 transition-all ${
                                          idx % 2 === 0 ? 'bg-gray-50/40' : 'bg-white'
                                        }`}
                                      >
                                        {/* Mapear ações para ícones robustos - SEMPRE EXIBIR OS 5 SLOTS */}
                                        {['read', 'create', 'update', 'delete', 'execute'].map(actionKey => {
                                          const p = feature.permissions.find(perm => perm.action.toLowerCase() === actionKey)
                                          
                                          // Se a permissão não existe no banco de dados para esta feature
                                          if (!p) {
                                            const ActionIcon = actionKey === 'read' ? EyeIcon :
                                                              actionKey === 'create' ? PlusIcon :
                                                              actionKey === 'update' ? PencilSquareIcon :
                                                              actionKey === 'delete' ? TrashIcon :
                                                              CommandLineIcon
                                            
                                            return (
                                              <div 
                                                key={actionKey} 
                                                className="p-1.5 rounded-lg border border-dashed border-gray-200 text-gray-200 cursor-not-allowed"
                                                title={`Ação '${actionKey}' não cadastrada para esta funcionalidade no sistema.`}
                                              >
                                                <ActionIcon className="h-3.5 w-3.5 opacity-20" />
                                              </div>
                                            )
                                          }

                                          const isGranted = grantedPermissionIds.includes(p.id)
                                          const ActionIcon = actionKey === 'read' ? EyeIcon :
                                                            actionKey === 'create' ? PlusIcon :
                                                            actionKey === 'update' ? PencilSquareIcon :
                                                            actionKey === 'delete' ? TrashIcon :
                                                            CommandLineIcon

                                          return (
                                            <button
                                              key={p.id}
                                              onClick={() => handlePermissionToggle(p.id, roleId)}
                                              className={`p-1.5 rounded-lg transition-all duration-200 border-2 ${
                                                isGranted
                                                  ? 'bg-blue-600 border-blue-700 text-white shadow-md shadow-blue-900/20 scale-110 z-10'
                                                  : 'bg-white border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:scale-105'
                                              }`}
                                              title={`${isGranted ? 'Remover' : 'Conceder'} ${actionKey} em ${feature.name}`}
                                            >
                                              <ActionIcon className="h-3.5 w-3.5" />
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </Fragment>
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
