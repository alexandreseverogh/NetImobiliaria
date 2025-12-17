'use client'

import { useState } from 'react'
import {
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { getHierarchyInfo, canManageRole, ROLE_HIERARCHY } from '@/services/hierarchyService'

interface RoleHierarchyVisualizationProps {
  currentUserRole: string
  onRoleSelect?: (roleName: string) => void
  showMatrix?: boolean
}

export default function RoleHierarchyVisualization({
  currentUserRole,
  onRoleSelect,
  showMatrix = false
}: RoleHierarchyVisualizationProps) {
  const [expandedRoles, setExpandedRoles] = useState<string[]>([currentUserRole])
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  const { levels, matrix } = getHierarchyInfo()

  const toggleRole = (roleName: string) => {
    setExpandedRoles(prev => 
      prev.includes(roleName) 
        ? prev.filter(r => r !== roleName)
        : [...prev, roleName]
    )
  }

  const handleRoleClick = (roleName: string) => {
    setSelectedRole(selectedRole === roleName ? null : roleName)
    onRoleSelect?.(roleName)
  }

  const getRoleColor = (level: number) => {
    if (level >= 100) return 'bg-red-100 text-red-800 border-red-200'
    if (level >= 80) return 'bg-orange-100 text-orange-800 border-orange-200'
    if (level >= 60) return 'bg-blue-100 text-blue-800 border-blue-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getRoleIcon = (level: number) => {
    if (level >= 100) return '👑'
    if (level >= 80) return '🛡️'
    if (level >= 60) return '🔧'
    return '👤'
  }

  return (
    <div className="space-y-6">
      {/* Hierarquia em Árvore */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-6">
          <UserGroupIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Hierarquia de Perfis
          </h3>
        </div>

        <div className="space-y-3">
          {levels.map((role) => {
            const isExpanded = expandedRoles.includes(role.name)
            const isSelected = selectedRole === role.name
            const canCurrentUserManage = canManageRole(currentUserRole, role.name)
            const isCurrentUser = role.name === currentUserRole

            return (
              <div key={role.name} className="border rounded-lg">
                <div
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  } ${isCurrentUser ? 'bg-green-50 border-green-200' : ''}`}
                  onClick={() => handleRoleClick(role.name)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getRoleIcon(role.level)}</span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            {role.name}
                          </span>
                          {isCurrentUser && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Você
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(role.level)}`}>
                            Nível {role.level}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Pode gerenciar: {role.canManage.length} perfil(s)
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {canCurrentUserManage && !isCurrentUser && (
                        <div className="flex items-center space-x-1 text-green-600">
                          <CheckCircleIcon className="h-4 w-4" />
                          <span className="text-xs">Pode gerenciar</span>
                        </div>
                      )}
                      {!canCurrentUserManage && !isCurrentUser && (
                        <div className="flex items-center space-x-1 text-red-600">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          <span className="text-xs">Sem permissão</span>
                        </div>
                      )}
                      {role.canManage.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRole(role.name)
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? (
                            <ChevronDownIcon className="h-5 w-5" />
                          ) : (
                            <ChevronRightIcon className="h-5 w-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subordinados */}
                {isExpanded && role.canManage.length > 0 && (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Pode gerenciar:
                      </h4>
                      {role.canManage.map((manageableRole) => {
                        const manageableRoleInfo = ROLE_HIERARCHY[manageableRole]
                        if (!manageableRoleInfo) return null

                        return (
                          <div
                            key={manageableRole}
                            className="flex items-center space-x-3 p-2 bg-white rounded border"
                          >
                            <span className="text-sm">{getRoleIcon(manageableRoleInfo.level)}</span>
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">
                                {manageableRole}
                              </span>
                              <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getRoleColor(manageableRoleInfo.level)}`}>
                                Nível {manageableRoleInfo.level}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Matriz de Permissões */}
      {showMatrix && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Matriz de Permissões
            </h3>
            <p className="text-sm text-gray-600">
              Quem pode gerenciar quem
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">
                    Gerencia ↓ / Alvo →
                  </th>
                  {Object.keys(ROLE_HIERARCHY).map(role => (
                    <th key={role} className="text-center py-2 px-3 font-medium text-gray-700 text-sm">
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(ROLE_HIERARCHY).map(manager => (
                  <tr key={manager} className="border-b">
                    <td className="py-2 px-3 font-medium text-gray-900">
                      {manager}
                    </td>
                    {Object.keys(ROLE_HIERARCHY).map(target => {
                      const canManage = matrix[manager][target]
                      const isCurrentUser = manager === currentUserRole
                      
                      return (
                        <td key={target} className="text-center py-2 px-3">
                          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                            canManage 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-400'
                          } ${isCurrentUser ? 'ring-2 ring-blue-500' : ''}`}>
                            {canManage ? (
                              <CheckCircleIcon className="h-4 w-4" />
                            ) : (
                              <ExclamationTriangleIcon className="h-4 w-4" />
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-3 w-3 text-green-800" />
                </div>
                <span>Pode gerenciar</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-3 w-3 text-gray-400" />
                </div>
                <span>Sem permissão</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 rounded-full ring-2 ring-blue-500"></div>
              <span>Seu perfil</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


