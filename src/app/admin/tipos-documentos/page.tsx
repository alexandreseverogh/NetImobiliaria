'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import PermissionGuard from '@/components/admin/PermissionGuard'
import Pagination from '@/components/admin/Pagination'
import CreateTipoDocumentoModal from '@/components/admin/CreateTipoDocumentoModal'
import EditTipoDocumentoModal from '@/components/admin/EditTipoDocumentoModal'
import DeleteTipoDocumentoModal from '@/components/admin/DeleteTipoDocumentoModal'
import { formatDateBrazil } from '@/lib/utils/dateUtils'

interface TipoDocumento {
  id: number
  descricao: string
  consulta_imovel_internauta: boolean
  ativo: boolean
  created_at: string
  updated_at: string
}

interface PaginatedResponse {
  tiposDocumentos: TipoDocumento[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}

export default function TiposDocumentosPage() {
  const { get, post, put, delete: del } = useAuthenticatedFetch()
  const [tiposDocumentos, setTiposDocumentos] = useState<TipoDocumento[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTipoDocumento, setEditingTipoDocumento] = useState<TipoDocumento | null>(null)
  const [deletingTipoDocumento, setDeletingTipoDocumento] = useState<TipoDocumento | null>(null)
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)

  const fetchTiposDocumentos = useCallback(async () => {
    try {
      setLoading(true)
      console.log('🔄 FRONTEND: Buscando tipos de documentos...')
      
      // Sempre usar paginação
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''
      const url = `/api/admin/tipos-documentos?page=${currentPage}&limit=10${searchParam}`
      
      console.log('🔄 FRONTEND: URL da requisição:', url)
      const response = await get(url)
      console.log('🔄 FRONTEND: Resposta da API:', response.status, response.statusText)
      
      if (!response.ok) {
        console.error('❌ FRONTEND: Erro na API:', response.status, response.statusText)
        const errorData = await response.json()
        console.error('❌ FRONTEND: Dados do erro:', errorData)
        return
      }
      
      const data = await response.json()
      console.log('✅ FRONTEND: Dados recebidos:', data)
      
      if (data.success) {
        setTiposDocumentos(data.tiposDocumentos)
        setTotalPages(data.totalPages)
        setTotalItems(data.total)
        setHasNext(data.hasNext)
        setHasPrev(data.hasPrev)
        console.log('✅ FRONTEND: Paginação ativa - página', data.currentPage, 'de', data.totalPages)
        console.log('✅ FRONTEND: Tipos de documentos carregados:', data.tiposDocumentos.length)
      }
    } catch (error) {
      console.error('❌ FRONTEND: Erro ao buscar tipos de documentos:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, get, searchTerm])

  useEffect(() => {
    fetchTiposDocumentos()
  }, [fetchTiposDocumentos]) // Recarregar quando a página ou busca mudar

  const handleCreateTipoDocumento = () => {
    setShowCreateModal(true)
  }

  const handleEditTipoDocumento = (tipoDocumento: TipoDocumento) => {
    setEditingTipoDocumento(tipoDocumento)
  }

  const handleDeleteTipoDocumento = (tipoDocumento: TipoDocumento) => {
    setDeletingTipoDocumento(tipoDocumento)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1) // Reset para primeira página ao buscar
    // fetchTiposDocumentos() será chamado automaticamente pelo useEffect
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSuccess = () => {
    setShowCreateModal(false)
    setEditingTipoDocumento(null)
    setDeletingTipoDocumento(null)
    fetchTiposDocumentos()
  }

  const handleClose = () => {
    setShowCreateModal(false)
    setEditingTipoDocumento(null)
    setDeletingTipoDocumento(null)
  }

  // Calcular estatísticas
  const totalAtivos = tiposDocumentos.filter(td => td.ativo).length
  const totalVisiveisPublico = tiposDocumentos.filter(td => td.consulta_imovel_internauta).length

  // Debug logs
  console.log('🔍 RENDER: loading =', loading)
  console.log('🔍 RENDER: tiposDocumentos.length =', tiposDocumentos.length)
  console.log('🔍 RENDER: tiposDocumentos =', tiposDocumentos)

  const formatDate = (dateString: string) => {
    return formatDateBrazil(dateString)
  }

  return (
    <PermissionGuard resource="tipos-documentos" action="READ">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tipos de Documentos</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Gerencie os tipos de documentos disponíveis para imóveis
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <PermissionGuard resource="tipos-documentos" action="CREATE">
                  <button
                    onClick={handleCreateTipoDocumento}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Novo Tipo de Documento
                  </button>
                </PermissionGuard>
              </div>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Tipos</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalItems}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Ativos</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalAtivos}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <EyeIcon className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Visíveis ao Público</p>
                  <p className="text-2xl font-semibold text-gray-900">{totalVisiveisPublico}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Busca */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Buscar por descrição..."
                  />
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                Buscar
              </button>
            </form>
          </div>

          {/* Tabela */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Lista de Tipos de Documentos</h3>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Carregando...</span>
              </div>
            ) : tiposDocumentos.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum tipo de documento encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Tente ajustar os termos de busca.' : 'Comece criando um novo tipo de documento.'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          DESCRIÇÃO
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          VISÍVEL AO PÚBLICO
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          STATUS
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          CRIADO EM
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          AÇÕES
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tiposDocumentos.map((tipoDocumento) => (
                        <tr key={tipoDocumento.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {tipoDocumento.descricao}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              tipoDocumento.consulta_imovel_internauta
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {tipoDocumento.consulta_imovel_internauta ? 'Sim' : 'Não'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              tipoDocumento.ativo
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {tipoDocumento.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(tipoDocumento.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <PermissionGuard resource="tipos-documentos" action="UPDATE">
                                <button
                                  onClick={() => handleEditTipoDocumento(tipoDocumento)}
                                  className="text-blue-600 hover:text-blue-900 transition-colors"
                                  title="Editar"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                              </PermissionGuard>
                              <PermissionGuard resource="tipos-documentos" action="DELETE">
                                <button
                                  onClick={() => handleDeleteTipoDocumento(tipoDocumento)}
                                  className="text-red-600 hover:text-red-900 transition-colors"
                                  title="Excluir"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </PermissionGuard>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    hasNext={hasNext}
                    hasPrev={hasPrev}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Modais */}
        {showCreateModal && (
          <CreateTipoDocumentoModal
            onClose={handleClose}
            onSuccess={handleSuccess}
          />
        )}

        {editingTipoDocumento && (
          <EditTipoDocumentoModal
            tipoDocumento={editingTipoDocumento}
            onClose={handleClose}
            onSuccess={handleSuccess}
          />
        )}

        {deletingTipoDocumento && (
          <DeleteTipoDocumentoModal
            tipoDocumento={deletingTipoDocumento}
            onClose={handleClose}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </PermissionGuard>
  )
}