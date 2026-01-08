/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, UserPlusIcon, UserMinusIcon } from '@heroicons/react/24/outline'

interface User {
  id: string
  username: string
  nome: string
  email: string
  role_name?: string
  role_id?: number
}

interface Perfil {
  id: number
  name: string
  description: string
}

interface ManagePerfilUsersModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  perfil: Perfil
}

export default function ManagePerfilUsersModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  perfil 
}: ManagePerfilUsersModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen, perfil.id])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/usuarios')
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Erro ao buscar usuÃ¡rios:', error)
      alert('Erro ao buscar usuÃ¡rios')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignUser = async (userId: string) => {
    try {
      setAssigning(userId)
      
      const response = await fetch(`/api/admin/usuarios/${userId}/assign-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roleId: perfil.id }),
      })

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      // Atualizar lista de usuÃ¡rios
      await fetchUsers()
      onSuccess()
    } catch (error) {
      console.error('Erro ao atribuir perfil:', error)
      alert('Erro ao atribuir perfil ao usuÃ¡rio')
    } finally {
      setAssigning(null)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    try {
      setRemoving(userId)
      
      const response = await fetch(`/api/admin/usuarios/${userId}/remove-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roleId: perfil.id }),
      })

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      // Atualizar lista de usuÃ¡rios
      await fetchUsers()
      onSuccess()
    } catch (error) {
      console.error('Erro ao remover perfil:', error)
      alert('Erro ao remover perfil do usuÃ¡rio')
    } finally {
      setRemoving(null)
    }
  }

  const usersWithPerfil = users.filter(user => user.role_id === perfil.id)
  const usersWithoutPerfil = users.filter(user => user.role_id !== perfil.id)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 w-full max-w-4xl">
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Gerenciar UsuÃ¡rios - {perfil.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {perfil.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* UsuÃ¡rios com este perfil */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">
                  UsuÃ¡rios com este perfil ({usersWithPerfil.length})
                </h4>
                {usersWithPerfil.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhum usuÃ¡rio atribuÃ­do a este perfil</p>
                ) : (
                  <div className="space-y-2">
                    {usersWithPerfil.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{user.nome}</p>
                          <p className="text-sm text-gray-600">@{user.username} â€¢ {user.email}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveUser(user.id)}
                          disabled={removing === user.id}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {removing === user.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-1"></div>
                          ) : (
                            <UserMinusIcon className="h-4 w-4 mr-1" />
                          )}
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* UsuÃ¡rios sem este perfil */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-3">
                  UsuÃ¡rios disponÃ­veis ({usersWithoutPerfil.length})
                </h4>
                {usersWithoutPerfil.length === 0 ? (
                  <p className="text-gray-500 text-sm">Todos os usuÃ¡rios jÃ¡ tÃªm perfis atribuÃ­dos</p>
                ) : (
                  <div className="space-y-2">
                    {usersWithoutPerfil.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{user.nome}</p>
                          <p className="text-sm text-gray-600">@{user.username} â€¢ {user.email}</p>
                          {user.role_name && (
                            <p className="text-xs text-blue-600">Perfil atual: {user.role_name}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleAssignUser(user.id)}
                          disabled={assigning === user.id}
                          className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-xs font-medium rounded text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {assigning === user.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-1"></div>
                          ) : (
                            <UserPlusIcon className="h-4 w-4 mr-1" />
                          )}
                          Atribuir
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}







