'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CogIcon,
  EyeIcon,
  LockClosedIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import { useApi } from '@/hooks/useApi'
import CreateRoleModal from '@/components/admin/CreateRoleModal'
import EditRoleModal from '@/components/admin/EditRoleModal'
import RolePermissionsModal from '@/components/admin/RolePermissionsModal'
import CloneRoleModal from '@/components/admin/CloneRoleModal'
import RoleUsersModal from '@/components/admin/RoleUsersModal'

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
}

export default function RolesPage() {
  const router = useRouter()
  const { get, patch, delete: del } = useApi()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [showUsersModal, setShowUsersModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Carregar roles
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true)
      const response = await get('/api/admin/roles')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar roles')
      }
      
      const data = await response.json()
      setRoles(data.roles || [])
    } catch (error) {
      console.error('Erro ao carregar roles:', error)
      setError('Erro ao carregar roles')
    } finally {
      setLoading(false)
    }
  }, [get])

  // Carregar permissões
  const fetchPermissions = useCallback(async () => {
    try {
      const response = await get('/api/admin/permissions')
      
      if (!response.ok) {
        throw new Error('Erro ao carregar permissões')
      }
      
      const data = await response.json()
      setPermissions(data.permissions || [])
    } catch (error) {
      console.error('Erro ao carregar permissões:', error)
    }
  }, [get])

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [fetchRoles, fetchPermissions])

  // Filtrar roles
  const filteredRoles = roles.filter(role => {
    const matchesFilter = filter === 'all' || 
      (filter === 'active' && role.is_active) ||
      (filter === 'inactive' && !role.is_active) ||
      (filter === '2fa' && role.two_fa_required)
    
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  // Garantir que o scroll horizontal inicie à esquerda
  useEffect(() => {
    const scrollContainer = document.querySelector('.overflow-x-auto')
    if (scrollContainer) {
      scrollContainer.scrollLeft = 0
    }
  }, [filteredRoles])

  // Funções de ação
  const handleCreateRole = () => {
    setSelectedRole(null)
    setShowCreateModal(true)
  }

  const handleEditRole = (role: Role) => {
    setSelectedRole(role)
    setShowEditModal(true)
  }

  const handleModalSuccess = () => {
    fetchRoles()
  }

  const handleManagePermissions = (role: Role) => {
    setSelectedRole(role)
    setShowPermissionsModal(true)
  }

  const handleCloneRole = (role: Role) => {
    setSelectedRole(role)
    setShowCloneModal(true)
  }

  const handleViewUsers = (role: Role) => {
    setSelectedRole(role)
    setShowUsersModal(true)
  }

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm('Tem certeza que deseja excluir este perfil?')) {
      return
    }

    try {
      const response = await del(`/api/admin/roles/${roleId}`)
      const result = await response.json()

      if (!response.ok) {
        // Extrair mensagem de erro da resposta
        const errorMessage = result.message || 'Erro ao excluir perfil'
        throw new Error(errorMessage)
      }

      // Recarregar lista
      fetchRoles()
      
      // Mostrar mensagem de sucesso se disponível
      if (result.message) {
        alert(result.message)
      }
    } catch (error) {
      console.error('Erro ao excluir perfil:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir perfil'
      alert(errorMessage)
    }
  }

  const handleToggle2FA = async (role: Role) => {
    try {
      const response = await patch(`/api/admin/roles/${role.id}/toggle-2fa`, {
        two_fa_required: !role.two_fa_required
      })

      if (!response.ok) {
        throw new Error('Erro ao alterar configuração 2FA')
      }

      // Recarregar lista
      fetchRoles()
    } catch (error) {
      console.error('Erro ao alterar 2FA:', error)
      alert('Erro ao alterar configuração 2FA')
    }
  }

  const handleToggleActive = async (role: Role) => {
    const action = role.is_active ? 'desativar' : 'ativar'
    const confirmMessage = `Tem certeza que deseja ${action} o perfil "${role.name}"?\n\n${
      !role.is_active 
        ? 'Este perfil será ativado e usuários poderão ser atribuídos a ele.'
        : 'Este perfil será desativado e usuários não poderão mais ser atribuídos a ele.'
    }`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const response = await patch(`/api/admin/roles/${role.id}/toggle-active`, {
        is_active: !role.is_active
      })

      if (!response.ok) {
        throw new Error('Erro ao alterar status do perfil')
      }

      // Recarregar lista
      fetchRoles()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      alert('Erro ao alterar status do perfil')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <UserGroupIcon className="h-8 w-8 text-blue-600" />
                Gestão de Perfis
              </h1>
              <p className="mt-2 text-gray-600">
                Gerencie perfis de usuário, permissões e configurações de 2FA
              </p>
            </div>
            <button
              onClick={handleCreateRole}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Novo Perfil
            </button>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar perfis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
                <option value="2fa">Com 2FA</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Roles */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Perfis ({filteredRoles.length})
            </h2>
          </div>

          {error && (
            <div className="px-6 py-4 bg-red-50 border-b border-red-200">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {filteredRoles.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum perfil encontrado
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filter !== 'all' 
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Comece criando um novo perfil.'
                }
              </p>
              {!searchTerm && filter === 'all' && (
                <button
                  onClick={handleCreateRole}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"
                >
                  <PlusIcon className="h-5 w-5" />
                  Criar Primeiro Perfil
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ scrollBehavior: 'smooth' }}>
              <table className="w-full divide-y divide-gray-200" style={{ minWidth: '800px' }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Perfil
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nível
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuários
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      2FA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRoles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {role.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {role.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Nível {role.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => handleViewUsers(role)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                          title="Visualizar usuários deste perfil"
                        >
                          {role.user_count} usuários
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(role)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            role.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {role.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggle2FA(role)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            role.two_fa_required
                              ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          <ShieldCheckIcon className="h-3 w-3 mr-1" />
                          {role.two_fa_required ? 'Obrigatório' : 'Não Obrigatório'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewUsers(role)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Visualizar Usuários"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleManagePermissions(role)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Gerenciar Permissões"
                          >
                            <CogIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleCloneRole(role)}
                            className="text-green-600 hover:text-green-900"
                            title="Clonar Perfil"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditRole(role)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Editar"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modais */}
        <CreateRoleModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleModalSuccess}
        />

        <EditRoleModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleModalSuccess}
          role={selectedRole}
        />

        <RolePermissionsModal
          isOpen={showPermissionsModal}
          onClose={() => setShowPermissionsModal(false)}
          onSuccess={handleModalSuccess}
          role={selectedRole}
        />

        <CloneRoleModal
          isOpen={showCloneModal}
          onClose={() => setShowCloneModal(false)}
          onSuccess={handleModalSuccess}
          originalRole={selectedRole}
        />

        <RoleUsersModal
          isOpen={showUsersModal}
          onClose={() => setShowUsersModal(false)}
          role={selectedRole}
        />
      </div>
    </div>
  )
}
