'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Pagination from '@/components/admin/Pagination'
import { usePageFocus } from '@/hooks/usePageFocus'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'
import EstadoSelect from '@/components/shared/EstadoSelect'
import { useApi } from '@/hooks/useApi'
import { CreateGuard, UpdateGuard, DeleteGuard } from '@/components/admin/PermissionGuard'

interface Proprietario {
  uuid: string
  nome: string
  cpf: string
  telefone: string
  email: string
  endereco?: string
  numero?: string
  bairro?: string
  estado_fk?: number
  cidade_fk?: number
  cep?: string
  corretor_fk?: string | null
  corretor_nome?: string | null
  created_at: string
}

interface PaginatedResponse {
  proprietarios: Proprietario[]
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrev: boolean
}

export default function ProprietariosPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mineCorretor = (searchParams?.get('mine_corretor') || '').toLowerCase() === 'true'
  const { get, delete: del } = useApi()
  const [proprietarios, setProprietarios] = useState<Proprietario[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados dos filtros
  const [filters, setFilters] = useState({
    nome: '',
    cpf: '',
    estado: '',
    cidade: '',
    bairro: ''
  })
  
  const filtersRef = useRef(filters)

  // Estados para os dados dos filtros
  const { estados, municipios, loadMunicipios, clearMunicipios, getEstadoNome, getCidadeNome } = useEstadosCidades()
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  
  
  // Estados de paginação - inicializar com sessionStorage
  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedPage = sessionStorage.getItem('proprietarios_currentPage')
      return savedPage ? parseInt(savedPage) : 1
    }
    return 1
  })
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)


  // Carregar municípios quando estado mudar
  useEffect(() => {
    loadMunicipios(filters.estado)
  }, [filters.estado, loadMunicipios])

  const fetchProprietarios = useCallback(async (filtersToUse = filtersRef.current) => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      })

      if (mineCorretor) {
        queryParams.append('mine_corretor', 'true')
      }
      
      // Adicionar filtros à query
      if (filtersToUse.nome) queryParams.append('nome', filtersToUse.nome)
      if (filtersToUse.cpf) queryParams.append('cpf', filtersToUse.cpf)
      
      // Converter estado para nome usando o hook
      if (filtersToUse.estado) {
        const estadoNome = getEstadoNome(filtersToUse.estado)
        if (estadoNome) {
          queryParams.append('estado', estadoNome)
        }
      }
      
      // Converter cidade para nome usando o hook
      if (filtersToUse.cidade) {
        const cidadeNome = getCidadeNome(filtersToUse.cidade)
        if (cidadeNome) {
          queryParams.append('cidade', cidadeNome)
        }
      }
      
      if (filtersToUse.bairro) queryParams.append('bairro', filtersToUse.bairro)
      
      const response = await get(`/api/admin/proprietarios?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar proprietários')
      }
      
      const data: PaginatedResponse = await response.json()
      setProprietarios(data.proprietarios)
      setTotalPages(data.totalPages)
      setTotalItems(data.total)
      setHasNext(data.hasNext)
      setHasPrev(data.hasPrev)
      
      // Salvar página atual no sessionStorage
      sessionStorage.setItem('proprietarios_currentPage', currentPage.toString())
    } catch (error) {
      console.error('Erro ao buscar proprietários:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, getEstadoNome, getCidadeNome, get, mineCorretor])

  // Hook para recarregar quando a página ganha foco
  usePageFocus(fetchProprietarios)

  // Carregar proprietários quando a página carrega ou quando currentPage muda
  useEffect(() => {
    fetchProprietarios()
  }, [currentPage, fetchProprietarios])

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Reset cidade quando estado muda
    if (field === 'estado') {
      setFilters(prev => ({
        ...prev,
        estado: value,
        cidade: ''
      }))
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    
    // Limpar municípios para nova consulta
    clearMunicipios()
    
    // Usar callback para garantir que temos os filtros mais recentes
    setFilters(currentFilters => {
      fetchProprietarios(currentFilters)
      return currentFilters
    })
  }

  const handleClearFilters = () => {
    setFilters({
      nome: '',
      cpf: '',
      estado: '',
      cidade: '',
      bairro: ''
    })
    setCurrentPage(1)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleDelete = async (proprietario: Proprietario) => {
    const corretorLabel =
      proprietario.corretor_fk
        ? `\nCorretor: ${proprietario.corretor_nome || 'Corretor não encontrado'}`
        : '\nCorretor: Sem Corretor Associado'
    if (!confirm(`Tem certeza que deseja excluir este proprietário?\n\nNome: ${proprietario.nome}${corretorLabel}`)) {
      return
    }

    try {
      const response = await del(`/api/admin/proprietarios/${proprietario.uuid}`)

      if (!response.ok) {
        throw new Error('Erro ao excluir proprietário')
      }

      // Recarregar a lista
      fetchProprietarios()
    } catch (error) {
      console.error('Erro ao excluir proprietário:', error)
      alert('Erro ao excluir proprietário')
    }
  }

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

  const formatCPF = (cpf: string | undefined) => {
    if (!cpf) return 'Não informado'
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }

  const formatTelefone = (telefone: string | undefined) => {
    if (!telefone) return 'Não informado'
    const clean = telefone.replace(/\D/g, '')
    if (clean.length === 11) {
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    } else if (clean.length === 10) {
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }
    return telefone
  }

  const formatCEP = (cep: string | undefined) => {
    if (!cep) return 'Não informado'
    return cep.replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-md p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Proprietários</h1>
            <p className="mt-2 text-gray-600">Gerencie os proprietários da imobiliária</p>
          </div>
          <div className="flex items-center gap-3">
            {mineCorretor && (
              <button
                onClick={handleFecharCorretorFlow}
                className="inline-flex items-center px-6 py-3 text-base font-medium rounded-lg shadow-lg text-white bg-gray-700 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600 transition-all duration-200"
              >
                Fechar
              </button>
            )}
            <CreateGuard resource="proprietarios">
              <button
                onClick={() => router.push('/admin/proprietarios/novo')}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Novo Proprietário
              </button>
            </CreateGuard>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h3>
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome
            </label>
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={filters.nome}
              onChange={(e) => handleFilterChange('nome', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* CPF */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CPF
            </label>
            <input
              type="text"
              placeholder="000.000.000-00"
              value={filters.cpf}
              onChange={(e) => handleFilterChange('cpf', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <EstadoSelect
              value={filters.estado}
              onChange={(estadoId) => handleFilterChange('estado', estadoId)}
              placeholder="Selecione o estado"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              format="sigla-nome"
              showAllOption={true}
              allOptionLabel="Selecione o estado"
            />
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cidade
            </label>
            <select
              value={filters.cidade}
              onChange={(e) => handleFilterChange('cidade', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={!filters.estado}
            >
              <option value="">Selecione a cidade</option>
              {municipios.map(municipio => (
                <option key={municipio.id} value={municipio.nome}>
                  {municipio.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Bairro */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bairro
            </label>
            <input
              type="text"
              placeholder="Buscar por bairro..."
              value={filters.bairro}
              onChange={(e) => handleFilterChange('bairro', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </form>
        
        {/* Botões de ação dos filtros */}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
            Buscar
          </button>
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Lista de Proprietários - Grid Moderno */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {proprietarios.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum proprietário encontrado</h3>
            <p className="text-gray-500 mb-4">Tente ajustar os filtros ou adicionar um novo proprietário.</p>
            <CreateGuard resource="proprietarios">
              <button
                onClick={() => router.push('/admin/proprietarios/novo')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Novo Proprietário
              </button>
            </CreateGuard>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
            {proprietarios.map((proprietario) => (
              <div
                key={proprietario.uuid}
                className="bg-white border-2 border-gray-300 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 p-4"
              >
                {/* Header do Card */}
                <div className="bg-slate-700 rounded-lg p-3 -m-1 mb-4">
                  {/* Primeira linha: Nome completo */}
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {proprietario.nome}
                    </h3>
                  </div>
                  
                  {/* Segunda linha: ID + data à esquerda, botões à direita */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-200 font-medium">
                      UUID: {proprietario.uuid}{' • '}
                      {proprietario.created_at
                        ? new Date(proprietario.created_at).toLocaleDateString('pt-BR')
                        : 'Data não informada'}
                    </p>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() =>
                          router.push(
                            mineCorretor
                              ? `/admin/proprietarios/${proprietario.uuid}?mine_corretor=true`
                              : `/admin/proprietarios/${proprietario.uuid}`
                          )
                        }
                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        title="Visualizar"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <UpdateGuard resource="proprietarios">
                        <button
                          onClick={() => router.push(`/admin/proprietarios/${proprietario.uuid}/editar`)}
                          className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                          title="Editar"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </UpdateGuard>
                      <DeleteGuard resource="proprietarios">
                        <button
                          onClick={() => handleDelete(proprietario)}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </DeleteGuard>
                    </div>
                  </div>
                </div>

                {/* Informações do Proprietário */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">CPF:</span>
                    <span className="text-sm text-gray-900">{formatCPF(proprietario.cpf)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Telefone:</span>
                    <span className="text-sm text-gray-900">{formatTelefone(proprietario.telefone)}</span>
                  </div>
                  
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-gray-500">Email:</span>
                    <span className="text-sm text-gray-900 text-right max-w-[200px] truncate">{proprietario.email || 'Não informado'}</span>
                  </div>
                  
                  {proprietario.endereco && (
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium text-gray-500">Endereço:</span>
                      <span className="text-sm text-gray-900 text-right max-w-[200px]">
                        {proprietario.endereco}{proprietario.numero && `, ${proprietario.numero}`}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Estado:</span>
                    <span className="text-sm text-gray-900">{proprietario.estado_fk || 'Não informado'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Cidade:</span>
                    <span className="text-sm text-gray-900">{proprietario.cidade_fk || 'Não informado'}</span>
                  </div>
                  
                  {proprietario.bairro && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Bairro:</span>
                      <span className="text-sm text-gray-900">{proprietario.bairro}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">CEP:</span>
                    <span className="text-sm text-gray-900">{formatCEP(proprietario.cep)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Corretor:</span>
                    <span className="text-sm text-gray-900 text-right max-w-[200px] truncate">
                      {proprietario.corretor_fk ? (proprietario.corretor_nome || 'Corretor não encontrado') : 'Sem Corretor Associado'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              hasNext={hasNext}
              hasPrev={hasPrev}
            />
          </div>
        </div>
      )}
      
      {/* Estatísticas */}
      <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Estatísticas</h3>
            <p className="text-sm text-gray-500 mt-1">Resumo dos proprietários cadastrados</p>
          </div>
          <div className="flex items-center space-x-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{totalItems}</p>
              <p className="text-sm text-gray-500">Total de Proprietários</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{proprietarios.length}</p>
              <p className="text-sm text-gray-500">Nesta Página</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{totalPages}</p>
              <p className="text-sm text-gray-500">Páginas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}