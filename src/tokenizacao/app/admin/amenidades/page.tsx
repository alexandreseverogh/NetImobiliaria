'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Pagination from '@/components/admin/Pagination'
import { usePageFocus } from '@/hooks/usePageFocus'

interface Amenidade {
  id: number
  nome: string
  descricao: string
  status: string
  categoria_id: number
  categoria_nome: string
  slug: string
}

interface PaginatedResponse {
  amenidades: Amenidade[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}

export default function AmenidadesPage() {
  const router = useRouter()
  const [amenidades, setAmenidades] = useState<Amenidade[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  
  // Estados de paginação - inicializar com sessionStorage
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedPage = sessionStorage.getItem('amenidades_currentPage')
      return savedPage ? parseInt(savedPage) : 1
    }
    return 1
  })
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)

  const fetchAmenidades = useCallback(async () => {
    try {
      const categoriaParam = selectedCategory ? `&categoria=${encodeURIComponent(selectedCategory)}` : ''
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''
      const response = await fetch(`/api/admin/amenidades?page=${currentPage}&limit=10${categoriaParam}${searchParam}`)
      if (response.ok) {
        const data: PaginatedResponse = await response.json()
        setAmenidades(data.amenidades)
        setTotalPages(data.totalPages)
        setTotalItems(data.total)
        setHasNext(data.hasNext)
        setHasPrev(data.hasPrev)
      } else {
        console.error('Erro na resposta da API:', response.status)
        setAmenidades([])
      }
    } catch (error) {
      console.error('Erro ao buscar amenidades:', error)
      setAmenidades([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, selectedCategory, searchTerm])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/categorias-amenidades')
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
  }, [])

  useEffect(() => {
    fetchAmenidades()
  }, [fetchAmenidades])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Recarregar dados quando a categoria ou busca mudar
  useEffect(() => {
    setCurrentPage(1) // Reset para primeira página ao filtrar
    fetchAmenidades()
  }, [selectedCategory, searchTerm])

  // Usar o hook personalizado para recarregar dados quando a página receber foco
  usePageFocus(fetchAmenidades)

  // Função para mudar de página - salvar no sessionStorage
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('amenidades_currentPage', page.toString())
    }
    // A busca será feita automaticamente pelo useEffect
  }

  // Usar diretamente os dados da API (filtros aplicados no backend)
  const filteredAmenidades = amenidades

  const handleView = (slug: string) => {
    router.push(`/admin/amenidades/${slug}`)
  }

  const handleEdit = (slug: string) => {
    // Salvar página atual antes de navegar para edição
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('amenidades_currentPage', currentPage.toString())
    }
    router.push(`/admin/amenidades/${slug}/editar`)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta amenidade?')) {
      try {
        const response = await fetch(`/api/admin/amenidades/${id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          // Recarregar a lista
          fetchAmenidades()
        } else {
          alert('Erro ao excluir amenidade')
        }
      } catch (error) {
        console.error('Erro ao excluir amenidade:', error)
        alert('Erro ao excluir amenidade')
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
              <h1 className="text-3xl font-bold text-gray-900">Amenidades</h1>
              <p className="text-gray-600 mt-2">Gerencie as amenidades disponíveis</p>
            </div>
            <button
              onClick={() => router.push('/admin/amenidades/nova')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Nova Amenidade
            </button>
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
                  placeholder="Nome ou descrição..."
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

        {/* Lista de Amenidades */}
        <div className="bg-white rounded-lg shadow">
          {filteredAmenidades.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Nenhuma amenidade encontrada.</p>
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
                    {filteredAmenidades.map((amenidade) => (
                      <tr key={amenidade.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {amenidade.nome}
                            </div>
                            <div className="text-sm text-gray-500">
                              {amenidade.descricao}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {amenidade.categoria_nome}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            amenidade.status === 'Ativo' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {amenidade.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleView(amenidade.slug)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Visualizar"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(amenidade.slug)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Editar"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(amenidade.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Excluir"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
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