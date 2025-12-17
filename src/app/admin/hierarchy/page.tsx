'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserGroupIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import RoleHierarchyVisualization from '@/components/admin/RoleHierarchyVisualization'

interface User {
  id: number
  name: string
  email: string
  role: string
}

export default function HierarchyPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMatrix, setShowMatrix] = useState(false)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      // Em desenvolvimento, usar usuário mockado
      // TODO: Implementar autenticação real
      setCurrentUser({
        id: 1,
        name: 'Super Admin',
        email: 'admin@example.com',
        role: 'Super Admin'
      })
    } catch (error) {
      console.error('Erro ao buscar usuário atual:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando hierarquia...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <ShieldCheckIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Erro</h3>
            <p className="text-red-700 mb-4">Não foi possível carregar informações do usuário</p>
            <button
              onClick={() => router.back()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Voltar
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
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <UserGroupIcon className="h-8 w-8 text-blue-600 mr-3" />
                  Hierarquia de Perfis
                </h1>
                <p className="mt-2 text-gray-600">
                  Visualize e entenda a estrutura hierárquica dos perfis do sistema
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowMatrix(!showMatrix)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  showMatrix 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showMatrix ? 'Ocultar Matriz' : 'Mostrar Matriz'}
              </button>
            </div>
          </div>
        </div>

        {/* Informações do Usuário Atual */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center space-x-3">
            <InformationCircleIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">
                Seu Perfil: {currentUser.role}
              </h3>
              <p className="text-blue-700 text-sm">
                Você está visualizando a hierarquia de perfis com as permissões do seu nível atual.
              </p>
            </div>
          </div>
        </div>

        {/* Visualização da Hierarquia */}
        <RoleHierarchyVisualization
          currentUserRole={currentUser.role}
          showMatrix={showMatrix}
          onRoleSelect={(roleName) => {
            console.log(`Role selecionado: ${roleName}`)
            // Aqui você pode implementar ações específicas quando um role é selecionado
          }}
        />

        {/* Informações Adicionais */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Como funciona a Hierarquia
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Níveis de Acesso</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <span className="text-lg">👑</span>
                  <span><strong>Super Admin (100):</strong> Controle total do sistema</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-lg">🛡️</span>
                  <span><strong>Administrador (80):</strong> Gestão de usuários e configurações</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-lg">🔧</span>
                  <span><strong>Corretor (60):</strong> Operações comerciais</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-lg">👤</span>
                  <span><strong>Usuário (20):</strong> Acesso básico</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Regras de Hierarquia</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Perfis só podem gerenciar perfis de nível inferior</li>
                <li>• Super Admin nunca pode ser excluído ou modificado</li>
                <li>• Cada perfil herda permissões dos níveis superiores</li>
                <li>• Alterações críticas requerem validação 2FA</li>
                <li>• Matriz de permissões é aplicada automaticamente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


