'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlassIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import Pagination from '@/components/admin/Pagination'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { formatDateBrazil } from '@/lib/utils/dateUtils'

interface Financiador {
  id: number
  nome: string
  headline: string
  valor_mensal: number
  ativo: boolean
  logo_base64?: string | null
  logo_tipo_mime?: string | null
  created_at: string
  updated_at: string
}

interface PaginatedResponse {
  financiadores: Financiador[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}

export default function FinanciadoresPage() {
  const { get } = useAuthenticatedFetch()
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<Financiador[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Financiador | null>(null)
  const [deleting, setDeleting] = useState(false)

  const itemsPerPage = 10

  const fetchItems = useCallback(
    async (page = currentPage, term = searchTerm) => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams({
          page: page.toString(),
          limit: itemsPerPage.toString(),
          search: term
        })

        const response = await get(`/api/admin/financiadores?${params}`)
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data.error || 'Erro ao carregar financiadores')
        }

        const data: PaginatedResponse = await response.json()
        setItems(data.financiadores || [])
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
      } catch (err) {
        console.error('Erro ao carregar financiadores:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar financiadores')
      } finally {
        setLoading(false)
      }
    },
    [currentPage, searchTerm, get]
  )

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Manter foco no input após busca
  useEffect(() => {
    if (searchInputRef.current) {
      const cursorPosition = searchInputRef.current.selectionStart
      searchInputRef.current.focus()
      if (cursorPosition !== null) {
        searchInputRef.current.setSelectionRange(cursorPosition, cursorPosition)
      }
    }
  }, [items])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchItems(1, searchTerm)
  }

  const handleDeleteClick = (fin: Financiador) => {
    setItemToDelete(fin)
    setShowDeleteModal(true)
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setItemToDelete(null)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/financiadores/${itemToDelete.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao excluir financiador')
      }
      await fetchItems()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir financiador')
    } finally {
      setDeleting(false)
      handleDeleteCancel()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financiadores</h1>
          <p className="mt-2 text-sm text-gray-700">
            Gerencie os patrocinadores de financiamento (logo HD, texto chamativo e valor mensal).
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => router.push('/admin/financiadores/novo')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Novo Financiador
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar financiadores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Buscar
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Headline</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor mensal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atualizado em</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((it) => {
                const src =
                  it.logo_base64 && it.logo_tipo_mime
                    ? `data:${it.logo_tipo_mime};base64,${it.logo_base64}`
                    : null
                return (
                  <tr key={it.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-20 h-12 rounded border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                        {src ? <img src={src} alt={it.nome} className="max-w-full max-h-full" /> : <span className="text-xs text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{it.nome}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2">{it.headline}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {Number(it.valor_mensal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          it.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {it.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateBrazil(it.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => router.push(`/admin/financiadores/${it.id}/editar`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteClick(it)} className="text-red-600 hover:text-red-900" title="Excluir">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {items.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhum financiador encontrado.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          hasNext={currentPage < totalPages}
          hasPrev={currentPage > 1}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmar Exclusão</h3>
              <p className="text-sm text-gray-500 mb-6">
                Tem certeza que deseja excluir o financiador &quot;{itemToDelete?.nome}&quot;? Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-center space-x-4">
                <button onClick={handleDeleteCancel} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


