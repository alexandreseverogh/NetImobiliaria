'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { API_ENDPOINTS } from '@/lib/config/constants'
import PermissionGuard from '@/components/admin/PermissionGuard'
import CreateUserModal from '@/components/admin/CreateUserModal'
import EditUserModal from '@/components/admin/EditUserModal'

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
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [twoFactorFilter, setTwoFactorFilter] = useState<'all' | 'enabled' | 'disabled'>('all')


  const fetchUserPermissions = useCallback(async () => {
    try {
      // Usando hook centralizado
      const response = await get(API_ENDPOINTS.AUTH.ME)
      
      if (response.ok) {
        const data = await response.json()
        console.log('🔐 Permissões do usuário logado:', data.user.permissoes)
        setUserPermissions(data.user.permissoes)
        
        // Verificar se tem permissões para usuários
        if (data.user.permissoes?.usuarios) {
          console.log(`✅ Usuário tem permissão para usuários: ${data.user.permissoes.usuarios}`)
        } else {
          console.log('❌ Usuário NÃO tem permissão para usuários')
        }
      } else {
        console.error('❌ Erro ao buscar permissões:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('❌ Erro ao buscar permissões:', error)
    }
  }, [get])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await get(API_ENDPOINTS.USERS.LIST)
      
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
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
  }, [get])

  const fetchRoles = useCallback(async () => {
    try {
      console.log('🔍 Buscando perfis em:', API_ENDPOINTS.USERS.ROLES)
      const response = await get(API_ENDPOINTS.USERS.ROLES)
      console.log('📡 Resposta da API de perfis:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Perfis carregados:', data.roles)
        console.log('📊 Quantidade de perfis:', data.roles?.length)
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
    fetchUsers()
    fetchRoles()
    fetchUserPermissions()
  }, [fetchUsers, fetchRoles, fetchUserPermissions])

  const applyFilters = useCallback(() => {
    let filtered = [...users]

    // Debug: Log dos dados 2FA
    console.log('🔍 DEBUG - Total de usuários:', users.length)
    console.log('🔍 DEBUG - Dados 2FA dos usuários:', users.map(u => ({
      username: u.username,
      nome: u.nome,
      two_factor_enabled: u.two_factor_enabled,
      two_factor_method: u.two_factor_method,
      role_name: u.role_name
    })))

    // Filtro por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(user => 
        user.nome.toLowerCase().includes(term) ||
        user.username.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        (user.role_name && user.role_name.toLowerCase().includes(term))
      )
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => 
        statusFilter === 'active' ? user.ativo : !user.ativo
      )
    }

    // Filtro por perfil
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => 
        user.role_name === roleFilter
      )
    }

    // Filtro por 2FA
    if (twoFactorFilter !== 'all') {
      console.log('🔍 DEBUG - Aplicando filtro 2FA:', twoFactorFilter)
      filtered = filtered.filter(user => {
        // 2FA está habilitado se o usuário tem 2FA ativado
        const has2FA = user.two_factor_enabled === true
        const shouldInclude = twoFactorFilter === 'enabled' ? has2FA : !has2FA
        console.log(`🔍 DEBUG - ${user.username}: has2FA=${has2FA}, method=${user.two_factor_method}, shouldInclude=${shouldInclude}`)
        return shouldInclude
      })
    }

    console.log('🔍 DEBUG - Usuários filtrados:', filtered.length)
    setFilteredUsers(filtered)
  }, [users, searchTerm, statusFilter, roleFilter, twoFactorFilter])

  // Aplicar filtros quando os dados ou filtros mudarem
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

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

      console.log('📥 Resposta recebida:', response.status, response.statusText)

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

      console.log('📥 Resposta recebida:', response.status, response.statusText)

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
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Perfil
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        2FA
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Último Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
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
                        
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900 truncate">{user.email}</div>
                          <div className="text-xs text-gray-500 truncate">{user.telefone}</div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.role_name || 'Sem perfil'}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.ativo 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.two_factor_enabled 
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
                            {/* Botão 2FA - sem PermissionGuard temporariamente */}
                            <button
                              onClick={() => handleToggle2FA(user.id, user.two_factor_enabled || false, user.nome)}
                              className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                                user.two_factor_enabled
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
                        
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {user.ultimo_login 
                            ? new Date(user.ultimo_login).toLocaleDateString('pt-BR')
                            : 'Nunca'
                          }
                        </td>
                        
                        <td className="px-4 py-4 text-sm font-medium">
                          <div className="flex flex-wrap gap-1">
                            {/* Botão Editar - Com verificação hierárquica */}
                            {canEditUser(user) ? (
                              <button
                                onClick={() => handleEditUser(user.id)}
                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center"
                                title="Editar usuário"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar
                              </button>
                            ) : (
                              <span
                                className="text-gray-400 bg-gray-100 px-2 py-1 rounded text-xs font-medium cursor-not-allowed flex items-center"
                                title="Você não pode editar usuários de nível igual ou superior"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Bloqueado
                              </span>
                            )}

                            {/* Botão Excluir - Com verificação hierárquica */}
                            {canDeleteUser(user) ? (
                              <button
                                onClick={() => handleDeleteUser(user.id, user.nome)}
                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center"
                                title="Excluir usuário"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Excluir
                              </button>
                            ) : (
                              <button
                                className="text-gray-400 bg-gray-100 px-2 py-1 rounded text-xs font-medium cursor-not-allowed flex items-center"
                                title="Você não pode excluir usuários de nível igual ou superior"
                                disabled
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Bloqueado
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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
