'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { UpdateGuard, DeleteGuard } from '@/components/admin/PermissionGuard'

interface Proprietario {
  id?: number
  uuid: string
  nome: string
  cpf?: string
  cnpj?: string
  telefone: string
  email: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  estado_fk?: string
  cidade_fk?: string
  cep?: string
  corretor_fk?: string | null
  corretor_nome?: string | null
  origem_cadastro?: string
  created_at: string
  created_by?: string
  updated_at: string
  updated_by?: string
}

export default function VisualizarProprietarioPage() {
  const { get, delete: del } = useAuthenticatedFetch()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const mineCorretor = (searchParams?.get('mine_corretor') || '').toLowerCase() === 'true'
  const proprietarioUuid = Array.isArray(params.id) ? params.id[0] : params.id
  const { user } = useAuth()
  const [proprietario, setProprietario] = useState<Proprietario | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleFecharCorretorFlow = () => {
    try {
      const returnUrl = sessionStorage.getItem('corretor_return_url') || '/landpaging'
      const url = new URL(returnUrl, window.location.origin)
      url.searchParams.set('corretor_home', 'true')
      window.location.href = url.pathname + url.search
    } catch {
      window.location.href = '/landpaging?corretor_home=true'
    }
  }

  useEffect(() => {
    const fetchProprietario = async () => {
      try {
        setLoading(true)
        if (!proprietarioUuid) {
          throw new Error('Identificador inválido.')
        }

        const response = await get(`/api/admin/proprietarios/${proprietarioUuid}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Proprietário não encontrado')
          }
          throw new Error('Erro ao carregar proprietário')
        }

        const data = await response.json()
        setProprietario(data)
      } catch (err) {
        console.error('Erro ao carregar proprietário:', err)
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      } finally {
        setLoading(false)
      }
    }

    if (proprietarioUuid) {
      fetchProprietario()
    }
  }, [proprietarioUuid, get])

  const handleDelete = async () => {
    if (!proprietario) return

    const corretorLabel =
      proprietario.corretor_fk
        ? `\nCorretor: ${proprietario.corretor_nome || 'Corretor não encontrado'}`
        : '\nCorretor: Sem Corretor Associado'
    if (!confirm(`Tem certeza que deseja excluir o proprietário?\n\nNome: ${proprietario.nome}${corretorLabel}`)) {
      return
    }

    try {
      const response = await del(`/api/admin/proprietarios/${proprietario.uuid}`)

      if (!response.ok) {
        throw new Error('Erro ao excluir proprietário')
      }

      router.push('/admin/proprietarios')
    } catch (err) {
      console.error('Erro ao excluir proprietário:', err)
      alert('Erro ao excluir proprietário')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando proprietário...</p>
        </div>
      </div>
    )
  }

  if (error || !proprietario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro</h1>
          <p className="text-gray-600 mb-6">{error || 'Proprietário não encontrado'}</p>
          <button
            onClick={() => router.push('/admin/proprietarios')}
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
                onClick={() =>
                  router.push(mineCorretor ? '/admin/proprietarios?mine_corretor=true' : '/admin/proprietarios')
                }
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Visualizar Proprietário</h1>
                <p className="text-gray-600">Detalhes do proprietário selecionado</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {mineCorretor && (
                <button
                  onClick={handleFecharCorretorFlow}
                  className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Fechar
                </button>
              )}
              <UpdateGuard resource="proprietarios">
                <button
                  onClick={() => router.push(`/admin/proprietarios/${proprietario.uuid}/editar`)}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Editar
                </button>
              </UpdateGuard>
              <DeleteGuard resource="proprietarios">
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Excluir
                </button>
              </DeleteGuard>
            </div>
          </div>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header do Card */}
          <div className="bg-slate-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">{proprietario.nome}</h2>
            <p className="text-gray-200">UUID: {proprietario.uuid}</p>
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
                    <p className="text-gray-900 font-medium">{proprietario.nome}</p>
                  </div>

                  {proprietario.cnpj ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">CNPJ</label>
                      <p className="text-gray-900 font-medium">{proprietario.cnpj}</p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">CPF</label>
                      <p className="text-gray-900 font-medium">{proprietario.cpf}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Telefone</label>
                    <p className="text-gray-900 font-medium">{proprietario.telefone}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">E-mail</label>
                    <p className="text-gray-900 font-medium">{proprietario.email}</p>
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
                    <p className="text-gray-900 font-medium">{proprietario.endereco || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Número</label>
                    <p className="text-gray-900 font-medium">{proprietario.numero || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Complemento</label>
                    <p className="text-gray-900 font-medium">{proprietario.complemento || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Bairro</label>
                    <p className="text-gray-900 font-medium">{proprietario.bairro || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Estado</label>
                    <p className="text-gray-900 font-medium">{proprietario.estado_fk || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Cidade</label>
                    <p className="text-gray-900 font-medium">{proprietario.cidade_fk || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">CEP</label>
                    <p className="text-gray-900 font-medium">{proprietario.cep || 'Não informado'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500">Corretor</label>
                    <p className="text-gray-900 font-medium">
                      {proprietario.corretor_fk ? (proprietario.corretor_nome || 'Corretor não encontrado') : 'Sem Corretor Associado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Informações do Sistema */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Sistema</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Origem do Cadastro</label>
                  <p className="text-gray-900 font-medium">
                    {proprietario.origem_cadastro === 'Publico' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        🌐 Site Público
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        🖥️ Plataforma Admin
                      </span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Data de Criação</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(proprietario.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Criado por</label>
                  <p className="text-gray-900 font-medium">{proprietario.created_by || 'Sistema'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Última Atualização</label>
                  <p className="text-gray-900 font-medium">
                    {new Date(proprietario.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Atualizado por</label>
                  <p className="text-gray-900 font-medium">{proprietario.updated_by || 'Sistema'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}






