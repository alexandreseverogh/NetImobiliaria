/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'

interface Amenidade {
  id: string
  nome: string
  categoria_id: number
  categoria_nome: string
  ativo: boolean
  descricao?: string
  slug: string
}

export default function VisualizarAmenidadePage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [amenidade, setAmenidade] = useState<Amenidade | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Verificar se o slug é "nova" e redirecionar
    if (params.slug === 'nova') {
      console.log('🔍 Slug é "nova", redirecionando para /admin/amenidades/novo')
      router.replace('/admin/amenidades/novo')
      return
    }
    
    loadAmenidade()
  }, [params.slug, router])

  const loadAmenidade = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/amenidades/${params.slug}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setAmenidade(data.data)
        } else {
          setError('Erro ao carregar amenidade')
        }
      } else {
        setError('Amenidade não encontrada')
      }
    } catch (err) {
      setError('Erro ao carregar amenidade')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!amenidade) return
    
    if (!confirm(`Tem certeza que deseja excluir a amenidade "${amenidade.nome}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/amenidades/${amenidade.slug}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        router.push('/admin/amenidades')
      } else {
        setError('Erro ao excluir amenidade')
      }
    } catch (error) {
      console.error('Erro ao excluir:', error)
      setError('Erro ao excluir amenidade')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !amenidade) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-800">Erro: {error || 'Amenidade não encontrada'}</p>
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
              href="/admin/amenidades"
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{amenidade.nome}</h1>
              <p className="mt-2 text-sm text-gray-700">
                Visualizando detalhes da amenidade
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none flex space-x-3">
          <Link
            href={`/admin/amenidades/${amenidade.slug}/editar`}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Editar
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Excluir
          </button>
        </div>
      </div>

      {/* Detalhes */}
      <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Informações da Amenidade
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Nome</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{amenidade.nome}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Categoria</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{amenidade.categoria_nome}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                  amenidade.ativo
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {amenidade.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </dd>
            </div>
            {amenidade.descricao && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Descrição</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{amenidade.descricao}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}
