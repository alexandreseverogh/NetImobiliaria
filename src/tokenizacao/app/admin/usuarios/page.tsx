/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
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
  ativo: boolean
  ultimo_login: string | null
  created_at: string
}

interface UserRole {
  id: number
  name: string
  description: string
  level: number
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userPermissions, setUserPermissions] = useState<any>(null)


  useEffect(() => {
    fetchUsers()
    fetchRoles()
    fetchUserPermissions()
  }, [])

  const fetchUserPermissions = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.ME)
      if (response.ok) {
        const data = await response.json()
        console.log('ðŸ” PermissÃµes do usuÃ¡rio logado:', data.user.permissoes)
        setUserPermissions(data.user.permissoes)
        
        // Verificar se tem permissÃµes para usuÃ¡rios
        if (data.user.permissoes?.usuarios) {
          console.log(`âœ… UsuÃ¡rio tem permissÃ£o para usuÃ¡rios: ${data.user.permissoes.usuarios}`)
        } else {
          console.log('âŒ UsuÃ¡rio NÃƒO tem permissÃ£o para usuÃ¡rios')
        }
      } else {
        console.error('âŒ Erro ao buscar permissÃµes:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('âŒ Erro ao buscar permissÃµes:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS.LIST)
      if (response.ok) {
        const data = await response.json()
        console.log('UsuÃ¡rios carregados:', data.users)
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Erro ao buscar usuÃ¡rios:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.USERS.ROLES)
      if (response.ok) {
        const data = await response.json()
        console.log('Perfis carregados:', data.roles)
        setRoles(data.roles)
      }
    } catch (error) {
      console.error('Erro ao buscar perfis:', error)
    }
  }

  const handleCreateUser = () => {
    setShowCreateForm(true)
  }

  const handleCreateSuccess = () => {
    fetchUsers() // Recarregar lista apÃ³s criar usuÃ¡rio
  }

  const handleEditUser = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setEditingUser(user)
      setShowEditForm(true)
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    console.log('ðŸ”„ handleToggleStatus chamado:', { userId, currentStatus })
    
    try {
      console.log('ðŸ“¡ Enviando requisiÃ§Ã£o PATCH para alterar status...')
      const response = await fetch(`/api/admin/usuarios/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ativo: !currentStatus }),
      })

      console.log('ðŸ“¥ Resposta recebida:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('âœ… Status alterado com sucesso:', data)
        fetchUsers() // Recarregar lista
      } else {
        const errorData = await response.json()
        console.error('âŒ Erro ao alterar status:', errorData)
        alert(`Erro ao alterar status: ${errorData.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('âŒ Erro ao alterar status:', error)
      alert('Erro ao alterar status. Tente novamente.')
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    console.log('ðŸ—‘ï¸ handleDeleteUser chamado:', { userId, userName })
    
    if (!confirm(`Tem certeza que deseja excluir o usuÃ¡rio "${userName}"? Esta aÃ§Ã£o nÃ£o pode ser desfeita.`)) {
      console.log('âŒ UsuÃ¡rio cancelou a exclusÃ£o')
      return
    }

    try {
      console.log('ðŸ“¡ Enviando requisiÃ§Ã£o DELETE para excluir usuÃ¡rio...')
      const response = await fetch(`/api/admin/usuarios/${userId}`, {
        method: 'DELETE',
      })

      console.log('ðŸ“¥ Resposta recebida:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('âœ… UsuÃ¡rio excluÃ­do com sucesso:', data)
        fetchUsers() // Recarregar lista
        alert('UsuÃ¡rio excluÃ­do com sucesso!')
      } else {
        const error = await response.json()
        console.error('âŒ Erro ao excluir usuÃ¡rio:', error)
        alert(`Erro ao excluir usuÃ¡rio: ${error.error || 'Erro desconhecido'}`)
      }
    } catch (error) {
      console.error('âŒ Erro ao excluir usuÃ¡rio:', error)
      alert('Erro ao excluir usuÃ¡rio. Tente novamente.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando usuÃ¡rios...</div>
      </div>
    )
  }

  return (
    <div className="bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">GestÃ£o de UsuÃ¡rios</h1>
              <p className="text-gray-600 mt-2">
                Gerencie usuÃ¡rios, perfis e permissÃµes do sistema
              </p>
            </div>

            {/* Actions */}
            <div className="mb-6 flex justify-between items-center">
              <div className="flex space-x-4">
                <PermissionGuard resource="usuarios" action="WRITE">
                  <button
                    onClick={handleCreateUser}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Novo UsuÃ¡rio</span>
                  </button>
                </PermissionGuard>
              </div>

              <div className="text-sm text-gray-500">
                Total: {users.length} usuÃ¡rio(s)
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        UsuÃ¡rio
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
                        Ãšltimo Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        AÃ§Ãµes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
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
                        
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {user.ultimo_login 
                            ? new Date(user.ultimo_login).toLocaleDateString('pt-BR')
                            : 'Nunca'
                          }
                        </td>
                        
                        <td className="px-4 py-4 text-sm font-medium">
                          <div className="flex flex-wrap gap-1">
                            {/* BotÃ£o Editar */}
                            <PermissionGuard resource="usuarios" action="WRITE">
                              <button
                                onClick={() => handleEditUser(user.id)}
                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center"
                                title="Editar usuÃ¡rio"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar
                              </button>
                            </PermissionGuard>
                            


                            {/* BotÃ£o Excluir */}
                            <PermissionGuard resource="usuarios" action="DELETE">
                              <button
                                onClick={() => handleDeleteUser(user.id, user.nome)}
                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center"
                                title="Excluir usuÃ¡rio"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Excluir
                              </button>
                            </PermissionGuard>
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
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum usuÃ¡rio encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comece criando o primeiro usuÃ¡rio do sistema.
                </p>
                <div className="mt-6">
                  <PermissionGuard resource="usuarios" action="WRITE">
                    <button
                      onClick={handleCreateUser}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Novo UsuÃ¡rio
                    </button>
                  </PermissionGuard>
                </div>
              </div>
                         )}
      </div>

            {/* Modal de CriaÃ§Ã£o de UsuÃ¡rio */}
      <CreateUserModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={handleCreateSuccess}
        roles={roles}
      />

      {/* Modal de EdiÃ§Ã£o de UsuÃ¡rio */}
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

