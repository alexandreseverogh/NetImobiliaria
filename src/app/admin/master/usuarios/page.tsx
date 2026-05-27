'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import { 
  UsersIcon, 
  MagnifyingGlassIcon, 
  IdentificationIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface MasterUser {
  id: string
  nome: string
  email: string
  username: string
  status_global: boolean
  total_tenants: string
  created_at: string
}

interface Membership {
  tenant_id: string
  tenant_name: string
  tenant_slug: string
  access_active: boolean
  joined_at: string
  role_name: string
}

export default function RaioXUsuariosPage() {
  const { get, patch } = useApi()
  const [users, setUsers] = useState<MasterUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<MasterUser | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await get('/api/admin/master/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Erro ao buscar usuários master:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMemberships = async (user: MasterUser) => {
    try {
      setLoadingDetails(true)
      setSelectedUser(user)
      const response = await get(`/api/admin/master/users/${user.id}/memberships`)
      if (response.ok) {
        const data = await response.json()
        setMemberships(data.memberships)
      }
    } catch (error) {
      console.error('Erro ao buscar vínculos:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const toggleMembership = async (membership: Membership) => {
    if (!selectedUser) return
    try {
      const response = await patch(`/api/admin/usuarios/${selectedUser.id}/tenant-status`, {
        tenantId: membership.tenant_id,
        isActive: !membership.access_active
      })
      if (response.ok) {
        // Atualizar lista local
        setMemberships(prev => prev.map(m => 
          m.tenant_id === membership.tenant_id ? {...m, access_active: !m.access_active} : m
        ))
      }
    } catch (error) {
      alert('Erro ao alterar status de acesso')
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <div className="p-8 text-center bg-gray-50 min-h-screen">Escaneando ecossistema de usuários...</div>

  return (
    <div className="flex bg-gray-50 min-h-screen overflow-hidden">
      {/* Listagem Lateral */}
      <div className={`flex-1 p-8 transition-all ${selectedUser ? 'max-w-2xl' : 'max-w-7xl mx-auto'}`}>
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
            <IdentificationIcon className="h-8 w-8 mr-3 text-blue-600" />
            Raio-X de Usuários (Ecossistema)
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Visão global e controle de vínculos em todas as unidades.</p>
        </div>

        <div className="relative mb-6">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
          />
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Usuário</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest text-center">Vínculos</th>
                <th className="px-6 py-4 text-xs font-black text-gray-500 uppercase tracking-widest">Status Global</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(user => (
                <tr 
                  key={user.id} 
                  onClick={() => fetchMemberships(user)}
                  className={`cursor-pointer transition-all ${selectedUser?.id === user.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-6 py-5">
                    <div>
                      <p className="font-bold text-gray-900">{user.nome}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-black text-xs">
                      {user.total_tenants} EMPRESAS
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {user.status_global ? (
                      <span className="flex items-center text-green-600 text-xs font-black uppercase">
                        <CheckCircleIcon className="h-4 w-4 mr-1" /> Ativo
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600 text-xs font-black uppercase">
                        <XCircleIcon className="h-4 w-4 mr-1" /> Suspenso
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <ChevronRightIcon className="h-5 w-5 text-gray-300 ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Painel de Detalhes (Raio-X) */}
      {selectedUser && (
        <div className="w-md bg-white border-l border-gray-200 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
          <div className="p-8 bg-blue-600 text-white relative">
            <button 
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-blue-200 hover:text-white"
            >
              <XCircleIcon className="h-8 w-8" />
            </button>
            <h2 className="text-2xl font-black mb-1">Visão de Vínculos</h2>
            <p className="text-blue-100 font-medium">{selectedUser.nome}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loadingDetails ? (
              <div className="text-center py-10 text-gray-400 font-bold">Escaneando silos de dados...</div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">Acessos por Empresa</p>
                {memberships.map(m => (
                  <div key={m.tenant_id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 relative group overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center mb-1">
                          <BuildingOffice2Icon className="h-4 w-4 mr-2 text-gray-400" />
                          <p className="font-black text-gray-900">{m.tenant_name}</p>
                        </div>
                        <p className="text-xs text-gray-500 font-mono">slug: {m.tenant_slug}</p>
                        <p className="text-xs text-blue-600 font-bold mt-2">Perfil: {m.role_name}</p>
                      </div>
                      <div className="text-right">
                        <button 
                          onClick={() => toggleMembership(m)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                            m.access_active 
                            ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' 
                            : 'bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700'
                          }`}
                        >
                          {m.access_active ? '✓ Liberado' : '✕ Suspenso'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {memberships.length === 0 && (
                  <div className="text-center py-10 bg-gray-100 rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 font-bold">
                    Nenhum vínculo ativo encontrado.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50">
             <button className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl hover:bg-black transition-all">
                Editar Cadastro Global
             </button>
          </div>
        </div>
      )}
    </div>
  )
}
