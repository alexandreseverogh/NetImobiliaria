'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { API_ENDPOINTS } from '@/lib/config/constants'
import PermissionGuard from '@/components/admin/PermissionGuard'
import CreateUserModal from '@/components/admin/CreateUserModal'
import EditUserModal from '@/components/admin/EditUserModal'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { formatCPF, validateCPF } from '@/lib/utils/formatters'
import Pagination from '@/components/admin/Pagination'

interface User {
  id: string
  username: string
  email: string
  nome: string
  telefone: string

  role_name?: string
  role_description?: string
  role_level?: number  // Nível hierárquico do perfil
  ativo: boolean
  isencao?: boolean
  is_plantonista?: boolean
  tipo_corretor?: 'Interno' | 'Externo' | null
  ultimo_login: string | null
  created_at: string
  two_factor_enabled?: boolean
  two_factor_method?: string
}

interface UserRole {
  id: number
  name: string
  description: string
  level: number
}

export default function UsuariosPage() {
  const searchParams = useSearchParams()
  const isPublicBroker = searchParams?.get('public_broker') === 'true'
  if (isPublicBroker) {
    return <PublicBrokerSignup />
  }

  return <UsuariosAdminInner />
}

function UsuariosAdminInner() {
  const { get, patch, delete: del } = useApi()
  const { user: loggedUser } = useAuth()  // Usuário logado
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userPermissions, setUserPermissions] = useState<any>(null)

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)
  const [totalItems, setTotalItems] = useState(0)

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [twoFactorFilter, setTwoFactorFilter] = useState<'all' | 'enabled' | 'disabled'>('all')

  const fetchUserPermissions = useCallback(async () => {
    try {
      const response = await get(API_ENDPOINTS.AUTH.ME)

      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Permissões do usuário logado:', data.user.permissoes)
        setUserPermissions(data.user.permissoes)
      } else {
        console.error('❌ Erro ao buscar permissões:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('❌ Erro ao buscar permissões:', error)
    }
  }, [get])

  const fetchUsers = useCallback(async (page = currentPage, currentFilters = { searchTerm, statusFilter, roleFilter }) => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })

      if (currentFilters.searchTerm) {
        queryParams.append('nome', currentFilters.searchTerm)
      }
      if (currentFilters.roleFilter !== 'all') {
        queryParams.append('role_name', currentFilters.roleFilter)
      }
      // Note: roleFilter and statusFilter could be added to backend findUsersPaginated if needed.
      // For now, let's stick to what we have in the backend or improve it.

      const response = await get(`${API_ENDPOINTS.USERS.LIST}?${queryParams}`)

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        setTotalPages(data.totalPages || 1)
        setTotalItems(data.total || 0)
        setHasNext(data.hasNext || false)
        setHasPrev(data.hasPrev || false)
        setCurrentPage(data.currentPage || 1)
      } else {
        const errorData = await response.json()
        console.error('Erro na API de usuários:', errorData)
        setUsers([])
      }
    } catch (error) {
      console.error('Erro ao buscar usuários:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [get, currentPage, searchTerm, roleFilter])

  const fetchRoles = useCallback(async () => {
    try {
      console.log('🔍 Buscando perfis em:', API_ENDPOINTS.USERS.ROLES)
      const response = await get(API_ENDPOINTS.USERS.ROLES)
      console.log('📡 Resposta da API de perfis:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        setRoles(data.roles || [])
      } else {
        const errorData = await response.json()
        console.error('❌ Erro na API de perfis:', errorData)
      }
    } catch (error) {
      console.error('❌ Erro ao buscar perfis:', error)
    }
  }, [get])

  useEffect(() => {
    fetchRoles()
    fetchUserPermissions()
  }, [fetchRoles, fetchUserPermissions])

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, roleFilter, statusFilter, twoFactorFilter])

  // Buscar usuários quando a página muda (ou filtros mudam, via reset acima)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(currentPage)
    }, 100)
    return () => clearTimeout(timer)
  }, [currentPage, searchTerm, roleFilter, fetchUsers])

  // Simplificar filteredUsers (usar users diretamente ou filtrar apenas localmente o que não foi pro backend)
  useEffect(() => {
    let filtered = [...users]

    // Filtro de status e 2FA ainda são locais por enquanto
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user =>
        statusFilter === 'active' ? user.ativo : !user.ativo
      )
    }

    if (twoFactorFilter !== 'all') {
      filtered = filtered.filter(user => {
        const has2FA = user.two_factor_enabled === true
        return twoFactorFilter === 'enabled' ? has2FA : !has2FA
      })
    }

    setFilteredUsers(filtered)
  }, [users, statusFilter, twoFactorFilter])

  const handleCreateUser = () => {
    setShowCreateForm(true)
  }

  const handleCreateSuccess = () => {
    fetchUsers() // Recarregar lista após criar usuário
  }

  const handleEditUser = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setEditingUser(user)
      setShowEditForm(true)
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    console.log('🔄 handleToggleStatus chamado:', { userId, currentStatus })

    try {
      console.log('📡 Enviando requisição PATCH para alterar status...')
      const response = await patch(`/api/admin/usuarios/${userId}/status`, { ativo: !currentStatus })

      console.log('🔥 Resposta recebida:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Status alterado com sucesso:', data)
        fetchUsers() // Recarregar lista
      } else {
        const errorData = await response.json()
        console.error('❌ Erro ao alterar status:', errorData)
        alert(`Erro ao alterar status: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('❌ Erro ao alterar status:', error)
      alert('Erro ao alterar status. Tente novamente.')
    }
  }

  // Verificar se pode gerenciar usuário (hierarquia)
  const canManageUser = (targetUser: User): boolean => {
    if (!loggedUser) {
      console.log('🔍 canManageUser - loggedUser é NULL')
      return false
    }

    const loggedLevel = loggedUser.role_level || 0
    const targetLevel = targetUser.role_level || 0

    console.log('🔍 canManageUser - Verificando:', {
      logged: { username: loggedUser.username, level: loggedLevel },
      target: { username: targetUser.username, level: targetLevel },
      canManage: loggedLevel > targetLevel
    })

    // Não pode gerenciar a si mesmo
    if (loggedUser.id === targetUser.id) {
      console.log('🚫 Não pode gerenciar a si mesmo')
      return false
    }

    // Não pode gerenciar nível igual ou superior
    if (loggedLevel <= targetLevel) {
      console.log('🚫 Nível insuficiente:', loggedLevel, '<=', targetLevel)
      return false
    }

    console.log('✅ Pode gerenciar!')
    return true
  }

  // Alias para melhor legibilidade
  const canDeleteUser = canManageUser
  const canEditUser = canManageUser

  const handleDeleteUser = async (userId: string, userName: string) => {
    console.log('🗑️ handleDeleteUser chamado:', { userId, userName })

    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"? Esta ação não pode ser desfeita.`)) {
      console.log('❌ Usuário cancelou a exclusão')
      return
    }

    try {
      console.log('📡 Enviando requisição DELETE para excluir usuário...')
      const response = await del(`/api/admin/usuarios/${userId}`)

      console.log('🔥 Resposta recebida:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Usuário excluído com sucesso:', data)
        fetchUsers() // Recarregar lista
        alert('Usuário excluído com sucesso!')
      } else {
        const error = await response.json()
        console.error('❌ Erro ao excluir usuário:', error)
        alert(`Erro ao excluir usuário: ${error.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('❌ Erro ao excluir usuário:', error)
      alert('Erro ao excluir usuário. Tente novamente.')
    }
  }

  const handleToggle2FA = async (userId: string, currentState: boolean, userName: string) => {
    const action = currentState ? 'desabilitar' : 'habilitar'

    if (!confirm(`Tem certeza que deseja ${action} 2FA para o usuário "${userName}"?`)) {
      return
    }

    try {
      const response = await patch(`/api/admin/usuarios/${userId}/2fa`, {
        enable: !currentState
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ 2FA alterado com sucesso:', data)
        alert(`2FA ${!currentState ? 'habilitado' : 'desabilitado'} com sucesso!`)
        fetchUsers() // Recarregar lista
      } else {
        const errorData = await response.json()
        console.error('❌ Erro ao alterar 2FA:', errorData)
        alert(`Erro ao alterar 2FA: ${errorData.message || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('❌ Erro ao alterar 2FA:', error)
      alert('Erro ao alterar 2FA. Tente novamente.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando usuários...</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-600 mt-2">
            Gerencie usuários, perfis e permissões do sistema
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Busca por texto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Nome, username, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtro por status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>

            {/* Filtro por perfil */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Perfil
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
            </div>

            {/* Filtro por 2FA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                2FA
              </label>
              <select
                value={twoFactorFilter}
                onChange={(e) => setTwoFactorFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="enabled">Ativado</option>
                <option value="disabled">Desativado</option>
              </select>
            </div>
          </div>

          {/* Botão para limpar filtros */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setRoleFilter('all')
                setTwoFactorFilter('all')
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-4">
            <PermissionGuard resource="usuarios" action="CREATE">
              <button
                onClick={handleCreateUser}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Novo Usuário</span>
              </button>
            </PermissionGuard>
          </div>

          <div className="text-sm text-gray-500">
            Mostrando: {filteredUsers.length} de {users.length} usuário(s)
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          <div className="overflow-visible custom-scrollbar">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[220px]">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[180px]">
                    Perfil/Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[130px]">
                    2FA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Último Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">
                              {user.nome?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {user.nome}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 truncate">{user.email}</div>
                      <div className="text-xs text-gray-500 truncate">{user.telefone}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 w-fit">
                          {user.role_name || 'Sem perfil'}
                        </span>
                        {user.role_name === 'Corretor' && (
                          <div className="flex flex-col gap-1 mt-1 border-t border-gray-100 pt-1">
                            {user.tipo_corretor && (
                              <span className="text-[10px] text-gray-600 font-medium">
                                Tipo: {user.tipo_corretor}
                              </span>
                            )}
                            <div className="flex flex-wrap gap-1">
                              <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded w-fit ${user.isencao ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-700'
                                }`}>
                                {user.isencao ? 'Isento' : 'Não isento'}
                              </span>
                              {user.is_plantonista && (
                                <span className="inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-600 uppercase">
                                  Plantonista
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.ativo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.two_factor_enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                          }`}>
                          {user.two_factor_enabled ? 'Obrigatório' : 'Não obrigatório'}
                        </span>
                        {user.two_factor_method && user.two_factor_method !== 'Desativado' && (
                          <div className="text-xs text-gray-500">
                            {user.two_factor_method}
                          </div>
                        )}
                        <button
                          onClick={() => handleToggle2FA(user.id, user.two_factor_enabled || false, user.nome)}
                          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${user.two_factor_enabled
                            ? 'text-green-700 bg-green-50 hover:bg-green-100'
                            : 'text-gray-700 bg-gray-50 hover:bg-gray-100'
                            }`}
                          title={user.two_factor_enabled ? 'Desabilitar 2FA' : 'Habilitar 2FA'}
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          {user.two_factor_enabled ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.ultimo_login
                        ? new Date(user.ultimo_login).toLocaleDateString('pt-BR')
                        : 'Nunca'
                      }
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-medium">
                      <div className="flex justify-end items-center gap-2">
                        {/* Botão Editar - Com verificação hierárquica */}
                        {canEditUser(user) ? (
                          <button
                            onClick={() => handleEditUser(user.id)}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center border border-indigo-100"
                            title="Editar usuário"
                          >
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                        ) : (
                          <span
                            className="text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-medium cursor-not-allowed flex items-center border border-gray-100"
                            title="Você não pode editar usuários de nível igual ou superior"
                          >
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Bloqueado
                          </span>
                        )}

                        {/* Botão Excluir - Com verificação hierárquica */}
                        {canDeleteUser(user) ? (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.nome)}
                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center border border-red-100"
                            title="Excluir usuário"
                          >
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Excluir
                          </button>
                        ) : (
                          null
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
                hasNext={hasNext}
                hasPrev={hasPrev}
              />
            </div>
          </div>
        )}

        {/* Estatísticas Simples */}
        {totalItems > 0 && (
          <div className="mt-6 flex justify-end text-sm text-gray-500">
            Total de {totalItems} usuários registrados
          </div>
        )}

        {/* Empty State */}
        {users.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum usuário encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comece criando o primeiro usuário do sistema.
            </p>
            <div className="mt-6">
              <PermissionGuard resource="usuarios" action="CREATE">
                <button
                  onClick={handleCreateUser}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Novo Usuário
                </button>
              </PermissionGuard>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Criação de Usuário */}
      <CreateUserModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={handleCreateSuccess}
        roles={roles}
      />

      {/* Modal de Edição de Usuário */}
      <EditUserModal
        isOpen={showEditForm}
        onClose={() => {
          setShowEditForm(false)
          setEditingUser(null)
        }}
        onSuccess={handleCreateSuccess}
        user={editingUser}
        roles={roles}
      />
    </div>
  )
}

function PublicBrokerSignup() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailChecking, setEmailChecking] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [cpfChecking, setCpfChecking] = useState(false)
  const [cpfAvailable, setCpfAvailable] = useState<boolean | null>(null)
  const [emailPendingValidation, setEmailPendingValidation] = useState(false)
  const [cpfPendingValidation, setCpfPendingValidation] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [cpfError, setCpfError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    nome: '',
    telefone: '',
    cpf: '',
    creci: ''
  })

  const [foto, setFoto] = useState<File | null>(null)

  const emailInputRef = useRef<HTMLInputElement | null>(null)
  const cpfInputRef = useRef<HTMLInputElement | null>(null)
  const confirmPasswordInputRef = useRef<HTMLInputElement | null>(null)
  const lastValidatedEmailRef = useRef<string>('')
  const lastValidatedCpfRef = useRef<string>('')
  const cpfAbortRef = useRef<AbortController | null>(null)
  const cpfExistsCacheRef = useRef<Map<string, boolean>>(new Map())
  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cpfDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fotoInputId = 'broker-foto-input'
  const SUPPRESS_GEOLOCATION_MODAL_KEY = 'suppress-geolocation-modal-once'

  const handleVoltar = () => {
    // Redirecionar para landpaging com flag para abrir o modal do corretor
    try {
      sessionStorage.setItem(SUPPRESS_GEOLOCATION_MODAL_KEY, 'true')
    } catch { }
    router.push('/landpaging?corretor_popup=true')
  }

  const onChange = (key: keyof typeof form, value: string) => {
    // IMPORTANTÍSSIMO: marcar validação pendente imediatamente
    if (key === 'email') {
      const emailNow = String(value || '').trim().toLowerCase()
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNow) && emailNow !== lastValidatedEmailRef.current) {
        setEmailPendingValidation(true)
      }
    }
    if (key === 'cpf') {
      const cpfDigits = String(value || '').replace(/\D/g, '')
      if (cpfDigits.length === 11 && validateCPF(cpfDigits) && cpfDigits !== lastValidatedCpfRef.current) {
        setCpfPendingValidation(true)
      }
    }

    setForm((p) => ({ ...p, [key]: value }))
  }

  const validate = () => {
    const errs: string[] = []
    if (!form.username.trim() || form.username.trim().length < 3) errs.push('Username deve ter pelo menos 3 caracteres')
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.push('Email inválido')
    if (emailAvailable === false) errs.push('Este e-mail já está cadastrado para outro usuário')
    if (emailPendingValidation || emailChecking) errs.push('Aguarde a validação do e-mail')
    if (!form.nome.trim()) errs.push('Nome é obrigatório')
    if (!form.telefone.trim()) errs.push('Telefone é obrigatório')
    if (form.telefone.trim() && !/^\(\d{2}\)\s\d{9}$/.test(form.telefone.trim())) {
      errs.push('Telefone deve estar no formato (99) 999999999')
    }
    if (!form.cpf.trim()) errs.push('CPF é obrigatório')
    if (form.cpf.trim() && !validateCPF(form.cpf)) errs.push('CPF inválido')
    if (cpfAvailable === false) errs.push('Este CPF já está cadastrado for outro usuário')
    if (cpfPendingValidation || cpfChecking) errs.push('Aguarde a validação do CPF')
    if (!form.creci.trim()) errs.push('CRECI é obrigatório')
    if (!form.password || form.password.length < 8) errs.push('Senha deve ter pelo menos 8 caracteres')
    if (!form.confirmPassword) errs.push('Confirmar senha é obrigatório')
    if (form.password !== form.confirmPassword) errs.push('Senhas não coincidem')
    if (!foto) errs.push('Foto é obrigatória')
    return errs
  }

  const validateCpfForBlur = (): string | null => {
    const cpfDigits = form.cpf.replace(/\D/g, '')
    if (!cpfDigits) return 'CPF é obrigatório'
    if (cpfDigits.length < 11) return 'CPF incompleto'
    if (!validateCPF(cpfDigits)) return 'CPF inválido'
    if (cpfPendingValidation || cpfChecking) return 'Verificando CPF...'
    if (cpfAvailable === false) return 'Este CPF já está cadastrado'
    return null
  }

  const validateEmailForBlur = (): string | null => {
    const email = form.email.trim()
    if (!email) return 'Email é obrigatório'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email inválido'
    if (emailPendingValidation || emailChecking) return 'Verificando e-mail...'
    if (emailAvailable === false) return 'Este e-mail já está cadastrado'
    return null
  }

  // Validação online (UX): senhas precisam ser iguais enquanto digita (igual cadastro de cliente)
  useEffect(() => {
    if (!form.confirmPassword) {
      setConfirmPasswordError(null)
      return
    }
    if (form.password !== form.confirmPassword) {
      setConfirmPasswordError('Senhas não coincidem')
    } else {
      setConfirmPasswordError(null)
    }
  }, [form.password, form.confirmPassword])

  // Validação online de e-mail (disponibilidade)
  useEffect(() => {
    const email = form.email.trim().toLowerCase()
    setEmailAvailable(null)
    setEmailChecking(false)
    setEmailError(null)

    if (emailDebounceRef.current) {
      clearTimeout(emailDebounceRef.current)
      emailDebounceRef.current = null
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailPendingValidation(false)
      return
    }

    // Cache: se já checamos esse e-mail nesta sessão
    if (email === lastValidatedEmailRef.current) {
      setEmailPendingValidation(false)
      return
    }

    // bloquear saída do campo enquanto valida online
    setEmailPendingValidation(true)
    emailDebounceRef.current = setTimeout(async () => {
      setEmailChecking(true)
      try {
        const res = await fetch(`/api/public/users/check-email?email=${encodeURIComponent(email)}`, {
          method: 'GET',
          cache: 'no-store'
        })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.success) {
          const available = Boolean(data.available)
          setEmailAvailable(available)
          lastValidatedEmailRef.current = email
        }
      } catch {
        setEmailAvailable(null)
      } finally {
        setEmailChecking(false)
        setEmailPendingValidation(false)
      }
    }, 400)

    return () => {
      if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current)
      emailDebounceRef.current = null
    }
  }, [form.email])

  // Validação online de CPF (disponibilidade)
  useEffect(() => {
    const cpfDigits = form.cpf.replace(/\D/g, '')
    setCpfAvailable(null)
    setCpfChecking(false)
    setCpfError(null)

    if (cpfDebounceRef.current) {
      clearTimeout(cpfDebounceRef.current)
      cpfDebounceRef.current = null
    }

    if (!cpfDigits || !validateCPF(cpfDigits)) {
      setCpfPendingValidation(false)
      return
    }

    // Cache: se já checamos esse CPF nesta sessão
    const cached = cpfExistsCacheRef.current.get(cpfDigits)
    if (cached !== undefined) {
      setCpfAvailable(!cached) // available = !exists
      setCpfChecking(false)
      setCpfPendingValidation(false)
      lastValidatedCpfRef.current = cpfDigits
      return
    }

    // Cancelar checagem anterior
    if (cpfAbortRef.current) {
      cpfAbortRef.current.abort()
    }
    const controller = new AbortController()
    cpfAbortRef.current = controller

    // bloquear saída do campo enquanto valida online
    setCpfPendingValidation(true)
    cpfDebounceRef.current = setTimeout(async () => {
      setCpfChecking(true)
      try {
        const res = await fetch(`/api/public/users/check-cpf?cpf=${encodeURIComponent(cpfDigits)}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        })
        const data = await res.json().catch(() => null)
        if (res.ok && data?.success) {
          const available = Boolean(data.available)
          setCpfAvailable(available)
          cpfExistsCacheRef.current.set(cpfDigits, !available)
          lastValidatedCpfRef.current = cpfDigits
        }
      } catch (error: any) {
        if (error?.name !== 'AbortError') {
          console.error('Erro ao verificar CPF:', error)
        }
      } finally {
        setCpfChecking(false)
        setCpfPendingValidation(false)
      }
    }, 200)

    return () => {
      if (cpfDebounceRef.current) clearTimeout(cpfDebounceRef.current)
      cpfDebounceRef.current = null
    }
  }, [form.cpf])

  const formatTelefone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11) // (DD) + 9 dígitos
    if (digits.length <= 2) return digits
    const ddd = digits.slice(0, 2)
    const rest = digits.slice(2)
    return `(${ddd}) ${rest}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const errs = validate()
    if (errs.length > 0) {
      setError(errs.join('\n'))
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.set('username', form.username.trim())
      fd.set('email', form.email.trim())
      fd.set('nome', form.nome.trim())
      fd.set('telefone', form.telefone.trim())
      fd.set('password', form.password)
      fd.set('cpf', form.cpf.replace(/\D/g, ''))
      fd.set('creci', form.creci.trim())
      if (foto) fd.set('foto', foto)

      const res = await fetch('/api/public/corretor/register', {
        method: 'POST',
        body: fd
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        const msg = data?.error || `Erro HTTP ${res.status}`
        const details = Array.isArray(data?.details) ? data.details.join('\n') : null
        throw new Error(details ? `${msg}\n${details}` : msg)
      }

      setDone(true)
    } catch (err: any) {
      setError(err?.message || 'Erro ao cadastrar corretor')
    } finally {
      setLoading(false)
    }
  }

  // Ao concluir, direcionar para o login de corretor (via parâmetro na landing page)
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(SUPPRESS_GEOLOCATION_MODAL_KEY, 'true')
      } catch { }
      window.location.href = '/landpaging?open_corretor_login=true'
    }, 2500)
    return () => clearTimeout(t)
  }, [done])

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <h1 className="text-2xl font-extrabold text-gray-900">Cadastro enviado</h1>
          <p className="mt-2 text-gray-600">
            Seu usuário de corretor foi criado. Você será redirecionado para a página inicial.
          </p>
          <a
            href="/landpaging"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            onClick={() => {
              try {
                sessionStorage.setItem(SUPPRESS_GEOLOCATION_MODAL_KEY, 'true')
              } catch { }
            }}
          >
            Voltar para a página inicial
          </a>
          <p className="mt-3 text-xs text-gray-500">
            Dica: para entrar como corretor, use o botão <strong>Sou Corretor</strong> na página inicial e clique em “logar”.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <button
              onClick={handleVoltar}
              className="inline-flex items-center px-4 py-2 bg-white border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Voltar
            </button>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Cadastro de Corretor</h1>
          <p className="mt-2 text-gray-600">
            Preencha seus dados. O <strong>CRECI</strong> será validado por nossa equipe.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/70 ring-1 ring-black/5 p-6 sm:p-8">
          {error && (
            <pre className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 mb-4">
              {error}
            </pre>
          )}

          {/* Campos dummy para reduzir autofill agressivo do navegador */}
          <input className="hidden" autoComplete="username" name="fake-username" />
          <input className="hidden" type="password" autoComplete="current-password" name="fake-password" />

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Usuário (username) *</label>
                <input
                  name="broker_username"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                  value={form.username}
                  onChange={(e) => onChange('username', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Email *</label>
                <input
                  name="broker_email"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                  value={form.email}
                  onChange={(e) => onChange('email', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      const msg = validateEmailForBlur()
                      setEmailError(msg)
                      if (msg || emailPendingValidation || emailChecking) {
                        e.preventDefault()
                        setTimeout(() => emailInputRef.current?.focus(), 0)
                      }
                    }
                  }}
                  onBlur={() => {
                    const msg = validateEmailForBlur()
                    setEmailError(msg)
                    if (msg || emailPendingValidation || emailChecking) {
                      setTimeout(() => emailInputRef.current?.focus(), 0)
                    }
                  }}
                  ref={emailInputRef}
                />
                {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
                {!emailChecking && !emailPendingValidation && emailAvailable === false && (
                  <p className="mt-1 text-sm text-red-600">Este e-mail já está cadastrado</p>
                )}
                {(emailChecking || emailPendingValidation) && (
                  <p className="mt-1 text-xs text-gray-500">Verificando e-mail...</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Nome *</label>
                <input
                  name="broker_nome"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                  value={form.nome}
                  onChange={(e) => onChange('nome', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Telefone *</label>
                <input
                  name="broker_telefone"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                  value={form.telefone}
                  onChange={(e) => onChange('telefone', formatTelefone(e.target.value))}
                  placeholder="(99) 999999999"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">CPF *</label>
                <input
                  name="broker_cpf"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                  value={form.cpf}
                  onChange={(e) => onChange('cpf', formatCPF(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                      const msg = validateCpfForBlur()
                      setCpfError(msg)
                      if (msg || cpfPendingValidation || cpfChecking) {
                        e.preventDefault()
                        setTimeout(() => cpfInputRef.current?.focus(), 0)
                      }
                    }
                  }}
                  onBlur={() => {
                    const msg = validateCpfForBlur()
                    setCpfError(msg)
                    if (msg || cpfPendingValidation || cpfChecking) {
                      // Reforçar: não permitir sair do campo CPF se inválido/duplicado
                      setTimeout(() => cpfInputRef.current?.focus(), 0)
                    }
                  }}
                  placeholder="000.000.000-00"
                  ref={cpfInputRef}
                />
                {cpfError && <p className="mt-1 text-sm text-red-600">{cpfError}</p>}
                {!cpfChecking && !cpfPendingValidation && cpfAvailable === false && (
                  <p className="mt-1 text-sm text-red-600">Este CPF já está cadastrado</p>
                )}
                {(cpfChecking || cpfPendingValidation) && <p className="mt-1 text-xs text-gray-500">Verificando CPF...</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">CRECI *</label>
                <input
                  name="broker_creci"
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                  value={form.creci}
                  onChange={(e) => onChange('creci', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">Foto *</label>
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <input
                  id={fotoInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => setFoto(e.target.files?.[0] || null)}
                />
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor={fotoInputId}
                    className="inline-flex w-fit items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 cursor-pointer"
                  >
                    Escolher foto
                  </label>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500">JPG/PNG/WEBP • até 2MB</div>
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {foto ? foto.name : 'Nenhum arquivo selecionado'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Senha / Confirmar senha (abaixo da foto) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Senha *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="broker_password"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300"
                    value={form.password}
                    onChange={(e) => onChange('password', e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-12 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Confirmar senha *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="broker_password_confirm"
                    autoComplete="new-password"
                    className={`w-full rounded-xl border px-4 py-3 pr-12 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 ${confirmPasswordError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    value={form.confirmPassword}
                    onChange={(e) => onChange('confirmPassword', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        const invalid = !form.confirmPassword || form.password !== form.confirmPassword
                        if (invalid) {
                          e.preventDefault()
                          setConfirmPasswordError(!form.confirmPassword ? 'Confirmar senha é obrigatório' : 'Senhas não coincidem')
                          setTimeout(() => confirmPasswordInputRef.current?.focus(), 0)
                        }
                      }
                    }}
                    onBlur={() => {
                      const invalid = !form.confirmPassword || form.password !== form.confirmPassword
                      if (invalid) {
                        setConfirmPasswordError(!form.confirmPassword ? 'Confirmar senha é obrigatório' : 'Senhas não coincidem')
                        setTimeout(() => confirmPasswordInputRef.current?.focus(), 0)
                      }
                    }}
                    ref={confirmPasswordInputRef}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-12 text-gray-500 hover:text-gray-700"
                    aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showConfirmPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPasswordError && <p className="mt-1 text-sm text-red-600">{confirmPasswordError}</p>}
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Criar conta de corretor'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
