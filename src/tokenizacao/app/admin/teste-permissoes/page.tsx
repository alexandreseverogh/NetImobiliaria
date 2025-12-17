'use client'

import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { ReadGuard, WriteGuard, DeleteGuard, AdminGuard } from '@/components/admin/PermissionGuard'

export default function TestePermissoesPage() {
  const { user } = useAuth()
  const permissions = usePermissions()

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Teste de Sistema de Permissões
      </h1>

      {/* Informações do usuário */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Informações do Usuário</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Nome</p>
            <p className="text-sm text-gray-900">{user?.nome}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Cargo</p>
            <p className="text-sm text-gray-900">{user?.cargo}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Username</p>
            <p className="text-sm text-gray-900">{user?.username}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <p className="text-sm text-gray-900">{user?.status}</p>
          </div>
        </div>
      </div>

      {/* Permissões do usuário */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Permissões Atuais</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {user?.permissoes && Object.entries(user.permissoes).map(([resource, permission]) => (
            <div key={resource} className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 capitalize mb-2">{resource}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                permission === 'ADMIN' ? 'bg-red-100 text-red-800' :
                permission === 'DELETE' ? 'bg-orange-100 text-orange-800' :
                permission === 'WRITE' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              }`}>
                {permission}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Testes de permissões */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Testes de Permissões</h2>
        
        {/* Teste de leitura */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Permissão de Leitura</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadGuard resource="imoveis">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">✅ Pode ler imóveis</p>
                <p className="text-green-600 text-sm">Usuário tem permissão READ para imóveis</p>
              </div>
            </ReadGuard>
            
            <ReadGuard resource="usuarios">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">✅ Pode ler usuários</p>
                <p className="text-green-600 text-sm">Usuário tem permissão READ para usuários</p>
              </div>
            </ReadGuard>
          </div>
        </div>

        {/* Teste de escrita */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Permissão de Escrita</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WriteGuard resource="imoveis">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-medium">✏️ Pode escrever imóveis</p>
                <p className="text-blue-600 text-sm">Usuário tem permissão WRITE para imóveis</p>
              </div>
            </WriteGuard>
            
            <WriteGuard resource="usuarios">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-medium">✏️ Pode escrever usuários</p>
                <p className="text-blue-600 text-sm">Usuário tem permissão WRITE para usuários</p>
              </div>
            </WriteGuard>
          </div>
        </div>

        {/* Teste de administração */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Permissão de Administração</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminGuard resource="imoveis">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">👑 Administrador de imóveis</p>
                <p className="text-red-600 text-sm">Usuário tem permissão ADMIN para imóveis</p>
              </div>
            </AdminGuard>
            
            <AdminGuard resource="usuarios">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">👑 Administrador de usuários</p>
                <p className="text-red-600 text-sm">Usuário tem permissão ADMIN para usuários</p>
              </div>
            </AdminGuard>
          </div>
        </div>
      </div>

      {/* Botões de ação baseados em permissões */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Ações Baseadas em Permissões</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <WriteGuard resource="imoveis">
            <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
              Criar Novo Imóvel
            </button>
          </WriteGuard>
          
          <DeleteGuard resource="imoveis">
            <button className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors">
              Excluir Imóvel
            </button>
          </DeleteGuard>
          
          <AdminGuard resource="usuarios">
            <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors">
              Gerenciar Usuários
            </button>
          </AdminGuard>
        </div>
      </div>
    </div>
  )
}

