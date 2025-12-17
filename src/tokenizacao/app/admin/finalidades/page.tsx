'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Pagination from '@/components/admin/Pagination'
import PermissionGuard from '@/components/admin/PermissionGuard'
import { formatDateBrazil } from '@/lib/utils/dateUtils'

interface Finalidade {
  id: number
  nome: string
  descricao: string
  ativo: boolean
  created_at: string
  updated_at: string
}

interface PaginatedResponse {
  finalidades: Finalidade[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}

export default function FinalidadesPage() {
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [finalidades, setFinalidades] = useState<Finalidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [finalidadeToDelete, setFinalidadeToDelete] = useState<Finalidade | null>(null)
  const [deleting, setDeleting] = useState(false)

  const itemsPerPage = 10

  useEffect(() => {
    fetchFinalidades()
  }, [currentPage, searchTerm])

  // Manter foco no input após busca
  useEffect(() => {
    if (searchInputRef.current) {
      const cursorPosition = searchInputRef.current.selectionStart
      searchInputRef.current.focus()
      if (cursorPosition !== null) {
        searchInputRef.current.setSelectionRange(cursorPosition, cursorPosition)
      }
    }
  }, [finalidades])

  const fetchFinalidades = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm
      })

      const response = await fetch(`/api/admin/finalidades?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar finalidades')
      }

      const data: PaginatedResponse = await response.json()
      setFinalidades(data.finalidades || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Erro ao carregar finalidades:', err)
      setError('Erro ao carregar finalidades')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchFinalidades()
  }

  const handleDeleteClick = (finalidade: Finalidade) => {
    setFinalidadeToDelete(finalidade)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!finalidadeToDelete) return
    
    setDeleting(true)
    try {
      console.log('Tentando excluir finalidade com ID:', finalidadeToDelete.id)
      
      const response = await fetch(`/api/admin/finalidades/${finalidadeToDelete.id}`, {
        method: 'DELETE',
      })

      console.log('Resposta da API:', response.status, response.statusText)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Erro da API:', errorData)
        throw new Error(errorData.error || 'Erro ao excluir finalidade')
      }

      const result = await response.json()
      console.log('Resultado da exclusão:', result)

      // Recarregar a lista após exclusão
      fetchFinalidades()
      
      // Fechar modal
      setShowDeleteModal(false)
      setFinalidadeToDelete(null)
    } catch (error) {
      console.error('Erro completo:', error)
      setError(error instanceof Error ? error.message : 'Erro ao excluir finalidade')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setFinalidadeToDelete(null)
  }

  const handleToggleStatus = async (finalidade: Finalidade) => {
    try {
      const response = await fetch(`/api/admin/finalidades/${finalidade.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ativo: !finalidade.ativo
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar finalidade')
      }

      // Recarregar lista
      await fetchFinalidades()
    } catch (error) {
      console.error('Erro ao atualizar finalidade:', error)
      alert('Erro ao atualizar finalidade: ' + (error instanceof Error ? error.message : 'Erro desconhecido'))
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
    <PermissionGuard resource="imoveis" action="READ">
      <div className="space-y-6">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finalidades</h1>
            <p className="mt-2 text-sm text-gray-700">
              Gerencie as finalidades dos imóveis (Venda, Aluguel, etc.)
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => router.push('/admin/finalidades/novo')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Nova Finalidade
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-lg shadow">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar finalidades..."
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

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {finalidades.map((finalidade) => (
                  <tr key={finalidade.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {finalidade.nome.replace('_', ' e ')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {finalidade.descricao || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(finalidade)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          finalidade.ativo
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {finalidade.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateBrazil(finalidade.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => router.push(`/admin/finalidades/${finalidade.id}/editar`)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(finalidade)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {finalidades.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhuma finalidade encontrada.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={total}
            itemsPerPage={itemsPerPage}
          />
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Confirmar Exclusão
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Tem certeza que deseja excluir a finalidade "{finalidadeToDelete?.nome.replace('_', ' e ')}"?
                  Esta ação não pode ser desfeita.
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={handleDeleteCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
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
    </PermissionGuard>
  )
}
