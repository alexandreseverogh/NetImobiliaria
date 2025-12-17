'use client'

import { useState, useEffect, useCallback } from 'react'
import { XMarkIcon, ShieldCheckIcon, CheckIcon, XMarkIcon as XIcon } from '@heroicons/react/24/outline'

interface Role {
  id: number
  name: string
  description: string
  level: number
  is_active: boolean
  two_fa_required: boolean
  created_at: string
  updated_at: string
  user_count: number
}

interface Permission {
  id: number
  name: string
  description: string
  category: string
  feature_id: number
  feature_name?: string
  feature_category?: string
}

interface RolePermission {
  role_id: number
  permission_id: number
  granted: boolean
}

interface RolePermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  role: Role | null
}

export default function RolePermissionsModal({ isOpen, onClose, onSuccess, role }: RolePermissionsModalProps) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  
  // Verificar se o usuário logado tem permissão para editar perfis do sistema
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Carregar dados do usuário logado
  useEffect(() => {
    const userData = localStorage.getItem('user-data')
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData))
      } catch (error) {
        console.error('Erro ao parsear dados do usuário:', error)
      }
    }
  }, [])

  // Carregar dados quando modal abrir
  // Buscar todas as permissões
  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/permissions')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar permissões')
      }
      
      const data = await response.json()
      setPermissions(data.permissions || [])
    } catch (error) {
      console.error('Erro ao carregar permissões:', error)
      setError('Erro ao carregar permissões')
    } finally {
      setLoading(false)
    }
  }, [])

  // Buscar permissões do role
  const fetchRolePermissions = useCallback(async () => {
    if (!role) return

    try {
      const response = await fetch(`/api/admin/roles/${role.id}/permissions`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar permissões do perfil')
      }
      
      const data = await response.json()
      setRolePermissions(data.permissions || [])
    } catch (error) {
      console.error('Erro ao carregar permissões do perfil:', error)
      setError('Erro ao carregar permissões do perfil')
    }
  }, [role])

  useEffect(() => {
    if (isOpen && role) {
      fetchPermissions()
      fetchRolePermissions()
      // Expandir todas as categorias por padrão
      setExpandedCategories(new Set())
    }
  }, [isOpen, role, fetchPermissions, fetchRolePermissions])

  // Toggle de categoria expandida
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Toggle de permissão
  const togglePermission = (permissionId: number) => {
    setRolePermissions(prev => {
      const existing = prev.find(rp => rp.permission_id === permissionId)
      if (existing) {
        return prev.map(rp => 
          rp.permission_id === permissionId 
            ? { ...rp, granted: !rp.granted }
            : rp
        )
      } else {
        return [...prev, { role_id: role!.id, permission_id: permissionId, granted: true }]
      }
    })
  }

  // Verificar se permissão está concedida
  const isPermissionGranted = (permissionId: number): boolean => {
    const rolePermission = rolePermissions.find(rp => rp.permission_id === permissionId)
    return rolePermission?.granted || false
  }

  // Agrupar permissões por categoria
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    const category = permission.feature_category || permission.category || 'Outros'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(permission)
    return acc
  }, {} as Record<string, Permission[]>)

  // Salvar permissões
  const handleSave = async () => {
    if (!role) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/roles/${role.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permissions: rolePermissions
        })
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        setError(data.message || 'Erro ao salvar permissões')
      }
    } catch (error) {
      console.error('Erro ao salvar permissões:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  // Selecionar todas as permissões de uma categoria
  const selectAllInCategory = (category: string) => {
    const categoryPermissions = permissionsByCategory[category] || []
    const allGranted = categoryPermissions.every(permission => isPermissionGranted(permission.id))
    
    setRolePermissions(prev => {
      const newPermissions = [...prev]
      
      categoryPermissions.forEach(permission => {
        const existingIndex = newPermissions.findIndex(rp => rp.permission_id === permission.id)
        if (existingIndex >= 0) {
          newPermissions[existingIndex] = { ...newPermissions[existingIndex], granted: !allGranted }
        } else {
          newPermissions.push({ role_id: role!.id, permission_id: permission.id, granted: true })
        }
      })
      
      return newPermissions
    })
  }

  if (!isOpen || !role) return null

  const totalPermissions = permissions.length
  const grantedPermissions = rolePermissions.filter(rp => rp.granted).length
  
  // Apenas Super Admin e Admin são perfis protegidos do sistema
  const isSystemRole = role ? ['Super Admin', 'Admin'].includes(role.name) : false
  const canEditSystemRoles = currentUser && ['Super Admin', 'Admin'].includes(currentUser.role_name)
  const isEditable = !isSystemRole || canEditSystemRoles

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Gerenciar Permissões
              </h3>
              <div className="mt-1">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  Perfil: {role.name}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  {grantedPermissions}/{totalPermissions} permissões concedidas
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Aviso para Perfis do Sistema */}
        {isSystemRole && !canEditSystemRoles && (
          <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-amber-500" />
              <div>
                <h5 className="font-medium text-amber-800">Perfil Protegido do Sistema</h5>
                <p className="text-sm text-amber-700 mt-1">
                  O perfil <strong>&quot;{role.name}&quot;</strong> é essencial para o funcionamento do sistema. 
                  Apenas usuários com perfil Super Admin ou Admin podem modificar suas permissões.
                </p>
                <p className="text-sm text-amber-600 mt-2">
                  💡 <strong>Dica:</strong> Se precisar de um perfil personalizado, use a opção &quot;Clonar Perfil&quot; para criar uma cópia editável.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Aviso para Super Admin/Admin editando perfis do sistema */}
        {isSystemRole && canEditSystemRoles && (
          <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
              <div>
                <h5 className="font-medium text-blue-800">Perfil do Sistema - Modo Administrador</h5>
                <p className="text-sm text-blue-700 mt-1">
                  Você está editando o perfil <strong>&quot;{role.name}&quot;</strong> com privilégios de administrador. 
                  ⚠️ <strong>Tenha cuidado:</strong> Modificações podem afetar o funcionamento do sistema.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Carregando permissões...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{totalPermissions}</div>
                    <div className="text-sm text-gray-500">Total</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{grantedPermissions}</div>
                    <div className="text-sm text-gray-500">Concedidas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">{totalPermissions - grantedPermissions}</div>
                    <div className="text-sm text-gray-500">Negadas</div>
                  </div>
                </div>
              </div>

              {/* Lista de permissões por categoria */}
              {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Cabeçalho da categoria */}
                  <div 
                    className="bg-gray-50 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleCategory(category)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center">
                          {expandedCategories.has(category) ? (
                            <XIcon className="h-4 w-4 text-gray-500" />
                          ) : (
                            <CheckIcon className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900">{category}</h4>
                        <span className="text-sm text-gray-500">
                          ({categoryPermissions.filter(p => isPermissionGranted(p.id)).length}/{categoryPermissions.length})
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (isEditable) {
                            selectAllInCategory(category)
                          }
                        }}
                        disabled={!isEditable}
                        className={`text-sm font-medium ${
                          isEditable 
                            ? 'text-purple-600 hover:text-purple-800' 
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {categoryPermissions.every(p => isPermissionGranted(p.id)) ? 'Desmarcar todas' : 'Marcar todas'}
                      </button>
                    </div>
                  </div>

                  {/* Lista de permissões */}
                  {expandedCategories.has(category) && (
                    <div className="divide-y divide-gray-200">
                      {categoryPermissions.map((permission) => (
                        <div key={permission.id} className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isPermissionGranted(permission.id)}
                                    onChange={() => togglePermission(permission.id)}
                                    className="sr-only peer"
                                    disabled={!isEditable}
                                  />
                                  <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600 ${!isEditable ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                                </label>
                                <div>
                                  <h5 className="font-medium text-gray-900">{permission.name}</h5>
                                  <p className="text-sm text-gray-500">{permission.description}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isPermissionGranted(permission.id) ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckIcon className="h-3 w-3 mr-1" />
                                  Concedida
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XIcon className="h-3 w-3 mr-1" />
                                  Negada
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {!isEditable ? (
              <span>
                🔒 Perfil protegido: Use &quot;Clonar Perfil&quot; para criar uma versão editável
              </span>
            ) : (
              <span>
                {isSystemRole ? '⚠️ Modo Administrador: Tenha cuidado com as alterações' : 'Clique nos toggles para conceder ou negar permissões'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isEditable}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-4 w-4" />
                  Salvar Permissões
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
