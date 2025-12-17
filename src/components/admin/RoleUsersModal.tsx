'use client'

import { useState, useEffect, useCallback } from 'react'
import { XMarkIcon, UserIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline'

interface User {
  id: string
  username: string
  nome: string
  email: string
  telefone: string
  ativo: boolean
  ultimo_login: string | null
  created_at: string
  assigned_at: string
  assigned_by: string | null
  assigned_by_username: string | null
}

interface Role {
  id: number
  name: string
  description: string
}

interface RoleUsersModalProps {
  isOpen: boolean
  onClose: () => void
  role: Role | null
}

export default function RoleUsersModal({ 
  isOpen, 
  onClose, 
  role 
}: RoleUsersModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRoleUsers = useCallback(async () => {
    if (!role) return

    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('auth-token')
      if (!token) {
        throw new Error('Token de autenticação não encontrado. Faça login novamente.')
      }

      const response = await fetch(`/api/admin/roles/${role.id}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Erro na API:', response.status, errorData)
        
        if (response.status === 401) {
          throw new Error('Sessão expirada. Faça login novamente.')
        } else if (response.status === 403) {
          throw new Error('Acesso negado. Você não tem permissão para visualizar usuários.')
        } else {
          throw new Error(errorData.message || errorData.error || 'Erro ao carregar usuários')
        }
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Erro ao carregar usuários do perfil:', error)
      setError(error instanceof Error ? error.message : 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => {
    if (isOpen && role) {
      fetchRoleUsers()
    }
  }, [isOpen, role, fetchRoleUsers])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Agora mesmo'
    if (diffInHours < 24) return `${diffInHours}h atrás`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d atrás`
    
    return date.toLocaleDateString('pt-BR')
  }

  if (!isOpen || !role) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <UserIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Usuários do Perfil: {role.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {role.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando usuários...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-red-500 text-6xl mb-4">⚠️</div>
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={fetchRoleUsers}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="p-6 bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <UserIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total de Usuários</p>
                        <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <UserIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Usuários Ativos</p>
                        <p className="text-2xl font-bold text-green-600">
                          {users.filter(u => u.ativo).length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <UserIcon className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total de Usuários</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {users.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Users List */}
              <div className="flex-1 overflow-y-auto">
                {users.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-medium">Nenhum usuário encontrado</p>
                      <p className="text-gray-400 mt-2">Este perfil ainda não possui usuários atribuídos.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-gray-900">{user.nome}</h3>
                                <span className="text-sm text-gray-600">(@{user.username})</span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  user.ativo 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {user.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                  <p><strong>Email:</strong> {user.email}</p>
                                  <p><strong>Telefone:</strong> {user.telefone || 'Não informado'}</p>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <CalendarIcon className="h-4 w-4" />
                                    <span><strong>Criado:</strong> {formatDate(user.created_at)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <ClockIcon className="h-4 w-4" />
                                    <span><strong>Último login:</strong> {formatRelativeDate(user.ultimo_login || user.created_at)}</span>
                                  </div>
                                  {user.assigned_by_username && (
                                    <div className="flex items-center gap-2">
                                      <UserIcon className="h-4 w-4" />
                                      <span><strong>Atribuído por:</strong> {user.assigned_by_username}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
