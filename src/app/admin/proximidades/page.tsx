'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Pagination from '@/components/admin/Pagination'
import { usePageFocus } from '@/hooks/usePageFocus'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { CreateGuard, UpdateGuard, DeleteGuard } from '@/components/admin/PermissionGuard'

interface Proximidade {
  id: number
  nome: string
  descricao: string
  status: string
  categoria_id: number
  categoria_nome: string
  slug: string
}

interface PaginatedResponse {
  proximidades: Proximidade[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}

export default function ProximidadesPage() {
  const { get, post, put, delete: del } = useAuthenticatedFetch()
  const router = useRouter()
  const [proximidades, setProximidades] = useState<Proximidade[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  
  // Estados de paginação - inicializar com sessionStorage
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedPage = sessionStorage.getItem('proximidades_currentPage')
      return savedPage ? parseInt(savedPage) : 1
    }
    return 1
  })
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)

  const fetchProximidades = useCallback(async () => {
    try {
      setLoading(true)
      const categoriaParam = selectedCategory ? `&categoria=${encodeURIComponent(selectedCategory)}` : ''
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''
      
      // Usando hook centralizado
      const response = await get(`/api/admin/proximidades?page=${currentPage}&limit=10${categoriaParam}${searchParam}`)
      
      if (response.ok) {
        const data: PaginatedResponse = await response.json()
        setProximidades(data.proximidades)
        setTotalPages(data.totalPages)
        setTotalItems(data.total)
        setHasNext(data.hasNext)
        setHasPrev(data.hasPrev)
      } else {
        console.error('Erro na resposta da API:', response.status)
        setProximidades([])
      }
    } catch (error) {
      console.error('Erro ao buscar proximidades:', error)
      setProximidades([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, selectedCategory, searchTerm, get])

  const fetchCategories = useCallback(async () => {
    try {
      // Usando hook centralizado
      const response = await get('/api/admin/categorias-proximidades')
      
      if (response.ok) {
        const data = await response.json()
        const categoryNames = data.map((cat: any) => cat.nome)
        setCategories(categoryNames)
      } else {
        console.error('Erro ao buscar categorias:', response.status)
        setCategories([])
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
      setCategories([])
    }
  }, [get])

  useEffect(() => {
    fetchProximidades()
  }, [fetchProximidades])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Recarregar dados quando a categoria ou busca mudar - resetar para primeira página
  useEffect(() => {
    // Reset para primeira página ao filtrar
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('proximidades_currentPage', '1')
    }
    setCurrentPage(1)
    // fetchProximidades será chamado automaticamente pelo useEffect acima quando currentPage mudar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchTerm]) // Removido currentPage das dependências para evitar loop

  // Usar o hook personalizado para recarregar dados quando a página receber foco
  usePageFocus(fetchProximidades)

  // Função para mudar de página - salvar no sessionStorage
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('proximidades_currentPage', page.toString())
    }
    // A busca será feita automaticamente pelo useEffect
  }

  // Usar diretamente os dados da API (filtros aplicados no backend)
  const filteredProximidades = proximidades

  const handleView = (slug: string) => {
    router.push(`/admin/proximidades/${slug}`)
  }

  const handleEdit = (slug: string) => {
    // Salvar página atual antes de navegar para edição
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('proximidades_currentPage', currentPage.toString())
    }
    router.push(`/admin/proximidades/${slug}/editar`)
  }

  const handleDelete = async (proximidade: Proximidade) => {
    if (confirm('Tem certeza que deseja excluir esta proximidade?')) {
      try {
        console.log('🗑️ Excluindo proximidade:', proximidade.slug)
        const response = await del(`/api/admin/proximidades/${proximidade.slug}`)
        
        if (response.ok) {
          const result = await response.json()
          console.log('✅ Proximidade excluída:', result)
          alert('Proximidade excluída com sucesso!')
          // Recarregar a lista
          fetchProximidades()
        } else {
          const errorData = await response.json()
          console.error('❌ Erro ao excluir:', errorData)
          alert(errorData.message || 'Erro ao excluir proximidade')
        }
      } catch (error) {
        console.error('❌ Erro ao excluir proximidade:', error)
        alert('Erro ao excluir proximidade')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Proximidades</h1>
              <p className="text-gray-600 mt-2">Gerencie as proximidades disponíveis</p>
            </div>
            <CreateGuard resource="proximidades">
              <button
                onClick={() => router.push('/admin/proximidades/nova')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Nova Proximidade
              </button>
            </CreateGuard>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nome..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('')
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Proximidades */}
        <div className="bg-white rounded-lg shadow">
          {filteredProximidades.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Nenhuma proximidade encontrada.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoria
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProximidades.map((proximidade) => (
                      <tr key={proximidade.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {proximidade.nome}
                            </div>
                            <div className="text-sm text-gray-500">
                              {proximidade.descricao}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {proximidade.categoria_nome}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            proximidade.status === 'Ativo' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {proximidade.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleView(proximidade.slug)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Visualizar"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <UpdateGuard resource="proximidades">
                              <button
                                onClick={() => handleEdit(proximidade.slug)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="Editar"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                            </UpdateGuard>
                            <DeleteGuard resource="proximidades">
                              <button
                                onClick={() => handleDelete(proximidade)}
                                className="text-red-600 hover:text-red-900"
                                title="Excluir"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </DeleteGuard>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    hasNext={hasNext}
                    hasPrev={hasPrev}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}