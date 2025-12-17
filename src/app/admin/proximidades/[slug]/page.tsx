'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import { UpdateGuard, DeleteGuard } from '@/components/admin/PermissionGuard'

interface Proximidade {
  id: string
  nome: string
  categoria_id: number
  categoria_nome: string
  ativo: boolean
  descricao?: string
  endereco?: string
  telefone?: string
  horario?: string
  slug: string
}

export default function VisualizarProximidadePage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [proximidade, setProximidade] = useState<Proximidade | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProximidade = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/proximidades/${params.slug}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setProximidade(data.data)
        } else {
          setError('Erro ao carregar proximidade')
        }
      } else {
        setError('Proximidade não encontrada')
      }
    } catch (err) {
      setError('Erro ao carregar proximidade')
    } finally {
      setLoading(false)
    }
  }, [params.slug])

  useEffect(() => {
    // Verificar se o slug é "nova" e redirecionar
    if (params.slug === 'nova') {
      console.log('🔍 Slug é "nova", redirecionando para /admin/proximidades/novo')
      router.replace('/admin/proximidades/novo')
      return
    }
    
    loadProximidade()
  }, [params.slug, router, loadProximidade])

  const handleDelete = async () => {
    if (!proximidade) return
    
    if (!confirm(`Tem certeza que deseja excluir a proximidade "${proximidade.nome}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/proximidades/${proximidade.slug}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        router.push('/admin/proximidades')
      } else {
        setError('Erro ao excluir proximidade')
      }
    } catch (error) {
      console.error('Erro ao excluir:', error)
      setError('Erro ao excluir proximidade')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !proximidade) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Erro: {error || 'Proximidade não encontrada'}</p>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/proximidades"
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{proximidade.nome}</h1>
              <p className="mt-2 text-sm text-gray-700">
                Visualizando detalhes da proximidade
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex space-x-3">
          <UpdateGuard resource="proximidades">
            <Link
              href={`/admin/proximidades/${proximidade.slug}/editar`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </UpdateGuard>
          <DeleteGuard resource="proximidades">
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Excluir
            </button>
          </DeleteGuard>
        </div>
      </div>

      {/* Detalhes */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Informações da Proximidade
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Nome</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{proximidade.nome}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Categoria</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{proximidade.categoria_nome}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                  proximidade.ativo
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {proximidade.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </dd>
            </div>
            {proximidade.descricao && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Descrição</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{proximidade.descricao}</dd>
              </div>
            )}
            {proximidade.endereco && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Endereço</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{proximidade.endereco}</dd>
              </div>
            )}
            {proximidade.telefone && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Telefone</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{proximidade.telefone}</dd>
              </div>
            )}
            {proximidade.horario && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Horário</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{proximidade.horario}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}
