'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'

interface Cliente {
  id: number
  nome: string
  cpf: string
  telefone: string
  email: string
  endereco?: string
  numero?: string
  bairro?: string
  estado_fk?: string
  cidade_fk?: string
  cep?: string
  created_at: string
  created_by?: string
  updated_at: string
  updated_by?: string
}

export default function VisualizarClientePage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCliente = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/admin/clientes/${params.id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Cliente não encontrado')
          }
          throw new Error('Erro ao carregar cliente')
        }
        
        const data = await response.json()
        setCliente(data)
      } catch (err) {
        console.error('Erro ao carregar cliente:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchCliente()
    }
  }, [params.id])

  const handleDelete = async () => {
    if (!cliente) return
    
    if (!confirm(`Tem certeza que deseja excluir o cliente "${cliente.nome}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/clientes/${cliente.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir cliente')
      }

      router.push('/admin/clientes')
    } catch (err) {
      console.error('Erro ao excluir cliente:', err)
      alert('Erro ao excluir cliente')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando cliente...</p>
        </div>
      </div>
    )
  }

  if (error || !cliente) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro</h1>
          <p className="text-gray-600 mb-6">{error || 'Cliente não encontrado'}</p>
          <button
            onClick={() => router.push('/admin/clientes')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Voltar para Lista
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/clientes')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Visualizar Cliente</h1>
                <p className="text-gray-600">Detalhes do cliente selecionado</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => router.push(`/admin/clientes/${cliente.id}/editar`)}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Editar
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Excluir
              </button>
            </div>
          </div>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header do Card */}
          <div className="bg-slate-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">{cliente.nome}</h2>
            <p className="text-gray-200">ID: {cliente.id}</p>
          </div>

          {/* Conteúdo */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informações Pessoais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Informações Pessoais
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nome Completo</label>
                    <p className="text-gray-900 font-medium">{cliente.nome}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">CPF</label>
                    <p className="text-gray-900 font-medium">{cliente.cpf}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Telefone</label>
                    <p className="text-gray-900 font-medium">{cliente.telefone}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">E-mail</label>
                    <p className="text-gray-900 font-medium">{cliente.email}</p>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Endereço
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Endereço</label>
                    <p className="text-gray-900 font-medium">{cliente.endereco || 'Não informado'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Número</label>
                    <p className="text-gray-900 font-medium">{cliente.numero || 'Não informado'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Bairro</label>
                    <p className="text-gray-900 font-medium">{cliente.bairro || 'Não informado'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Estado</label>
                    <p className="text-gray-900 font-medium">{cliente.estado_fk || 'Não informado'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Cidade</label>
                    <p className="text-gray-900 font-medium">{cliente.cidade_fk || 'Não informado'}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-500">CEP</label>
                    <p className="text-gray-900 font-medium">{cliente.cep || 'Não informado'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações do Sistema */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Sistema</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Data de Criação</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(cliente.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Criado por</label>
                  <p className="text-gray-900 font-medium">{cliente.created_by || 'Sistema'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Última Atualização</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(cliente.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Atualizado por</label>
                  <p className="text-gray-900 font-medium">{cliente.updated_by || 'Sistema'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

