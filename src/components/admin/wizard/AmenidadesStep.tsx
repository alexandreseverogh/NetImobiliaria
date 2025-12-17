'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Imovel } from '@/lib/types/admin'
import { API_ENDPOINTS } from '@/lib/config/constants'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import IconRenderer from '../IconRenderer'

interface Amenidade {
  id: number
  nome: string
  descricao?: string
  categoria_id: number
  categoria_nome: string
  ativo: boolean
}

interface CategoriaAmenidade {
  id: number
  nome: string
  descricao?: string
  icone?: string
  cor: string
  ativo: boolean
}

interface AmenidadesStepProps {
  data: Partial<Imovel>
  onUpdate: (data: Partial<Imovel>) => void
  mode: 'create' | 'edit'
}

export default function AmenidadesStep({ data, onUpdate, mode }: AmenidadesStepProps) {
  const { get } = useAuthenticatedFetch()
  const [categorias, setCategorias] = useState<CategoriaAmenidade[]>([])
  const [amenidades, setAmenidades] = useState<Amenidade[]>([])
  const hasLoadedDataRef = useRef(false)
  const extractAmenidadeId = (amenidade: unknown): number | null => {
    if (!amenidade || typeof amenidade !== 'object') return null
    const candidate =
      (amenidade as { amenidadeId?: string | number }).amenidadeId ??
      (amenidade as { amenidade_id?: string | number }).amenidade_id ??
      (amenidade as { id?: string | number }).id

    if (candidate === undefined || candidate === null) return null
    const parsed = typeof candidate === 'number' ? candidate : parseInt(candidate, 10)
    return Number.isNaN(parsed) ? null : parsed
  }

  const [selectedAmenidades, setSelectedAmenidades] = useState<number[]>(
    () =>
      (data.amenidades?.map(extractAmenidadeId).filter((id): id is number => id !== null) ?? [])
  )
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const isInitialLoad = useRef(true)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Scroll para o topo quando o componente é montado
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Atualizar amenidades selecionadas quando data prop mudar (modo de edição)
  useEffect(() => {
    console.log('🔍 AmenidadesStep - data.amenidades recebido:', data.amenidades)
    console.log('🔍 AmenidadesStep - data.amenidades length:', data.amenidades?.length)
    console.log('🔍 AmenidadesStep - data.amenidades type:', typeof data.amenidades)
    
    if (data.amenidades && data.amenidades.length > 0) {
      console.log('🔍 AmenidadesStep - Atualizando amenidades selecionadas:', data.amenidades)

      const amenidadeIds = data.amenidades
        .map(extractAmenidadeId)
        .filter((id): id is number => id !== null)

      console.log('🔍 AmenidadesStep - IDs extraídos:', amenidadeIds)
      setSelectedAmenidades(amenidadeIds)
      isInitialLoad.current = false
    } else {
      console.log('🔍 AmenidadesStep - Nenhuma amenidade encontrada ou array vazio')
      setSelectedAmenidades([])
      isInitialLoad.current = false
    }
  }, [data.amenidades])

  // Função para atualizar dados do pai com debounce
  const updateParentData = useCallback((newSelectedAmenidades: number[]) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      if (amenidades.length > 0 && !loading && !isInitialLoad.current) {
        // Enviar apenas os IDs, como as proximidades fazem
        const amenidadesPayload = amenidades
          .filter(a => newSelectedAmenidades.includes(a.id))
          .map(amenidade => ({
            amenidadeId: amenidade.id.toString()
          }))

        onUpdate({
          amenidades: amenidadesPayload as unknown as Imovel['amenidades']
        })
      }
    }, 100) // Debounce de 100ms
  }, [amenidades, loading, onUpdate])

  // Cleanup do timeout quando componente desmontar
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      
      console.log('🔍 AmenidadesStep - Iniciando carregamento de dados...')
      console.log('🔍 AmenidadesStep - URL Categorias:', API_ENDPOINTS.AMENITIES.CATEGORIES)
      console.log('🔍 AmenidadesStep - URL Amenidades:', API_ENDPOINTS.AMENITIES.LIST)
      
      // Carregar categorias
      const categoriasResponse = await get(API_ENDPOINTS.AMENITIES.CATEGORIES)
      console.log('🔍 AmenidadesStep - Resposta categorias status:', categoriasResponse.status)
      console.log('🔍 AmenidadesStep - Resposta categorias ok:', categoriasResponse.ok)
      
      if (categoriasResponse.ok) {
        const categoriasData = await categoriasResponse.json()
        console.log('🔍 AmenidadesStep - Categorias recebidas (raw):', categoriasData)
        console.log('🔍 AmenidadesStep - É array?', Array.isArray(categoriasData))
        
        const categoriasAtivas = Array.isArray(categoriasData) 
          ? categoriasData.filter((c: any) => c.ativo === true)
          : categoriasData.data?.filter((c: any) => c.ativo === true) || []
        
        console.log('🔍 AmenidadesStep - Categorias ativas filtradas:', categoriasAtivas.length)
        setCategorias(categoriasAtivas)
      } else {
        console.error('❌ AmenidadesStep - Erro ao carregar categorias:', categoriasResponse.status, categoriasResponse.statusText)
        setCategorias([])
        setAmenidades([])
        return
      }

      // Carregar amenidades
      const amenidadesResponse = await get(API_ENDPOINTS.AMENITIES.LIST)
      console.log('🔍 AmenidadesStep - Resposta amenidades status:', amenidadesResponse.status)
      
      if (amenidadesResponse.ok) {
        const amenidadesData = await amenidadesResponse.json()
        console.log('🔍 AmenidadesStep - Amenidades recebidas (raw):', amenidadesData)
        
        const amenidadesAtivas = Array.isArray(amenidadesData)
          ? amenidadesData.filter((a: any) => a.ativo === true)
          : amenidadesData.data?.filter((a: any) => a.ativo === true) || []
        
        console.log('🔍 AmenidadesStep - Amenidades ativas filtradas:', amenidadesAtivas.length)
        setAmenidades(amenidadesAtivas)
      } else {
        console.error('❌ AmenidadesStep - Erro ao carregar amenidades:', amenidadesResponse.status, amenidadesResponse.statusText)
        setCategorias([])
        setAmenidades([])
        return
      }
    } catch (error) {
      console.error('❌ AmenidadesStep - Erro ao carregar dados:', error)
      setCategorias([])
      setAmenidades([])
    } finally {
      setLoading(false)
    }
  }, [get])

  // Carregar dados quando componente montar
  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (
      mode === 'edit' &&
      !hasLoadedDataRef.current &&
      !loading &&
      categorias.length === 0 &&
      amenidades.length === 0 &&
      data.amenidades &&
      data.amenidades.length > 0
    ) {
      console.log('🔍 AmenidadesStep - Nenhuma categoria da API, mas dados do imóvel possuem amenidades. Gerando categorias sintéticas.')

      const categoriaMap = new Map<number, CategoriaAmenidade>()
      const amenidadesSinteticas: Amenidade[] = []

      data.amenidades.forEach((item: any) => {
        if (!item) return

        const amenidadeIdRaw =
          item?.amenidadeId ??
          item?.amenidade_id ??
          item?.id ??
          null

        if (amenidadeIdRaw === null || amenidadeIdRaw === undefined) return

        const amenidadeId = typeof amenidadeIdRaw === 'number'
          ? amenidadeIdRaw
          : parseInt(amenidadeIdRaw, 10)

        if (Number.isNaN(amenidadeId)) return

        const categoriaNome = item?.categoria_nome ?? 'Sem Categoria'
        const categoriaId = item?.categoria_id ?? amenidadeId * -1

        if (!categoriaMap.has(categoriaId)) {
          categoriaMap.set(categoriaId, {
            id: categoriaId,
            nome: categoriaNome,
            descricao: '',
            icone: undefined,
            cor: '#2563eb',
            ativo: true,
          })
        }

        amenidadesSinteticas.push({
          id: amenidadeId,
          nome: item?.nome ?? item?.amenidade_nome ?? `Amenidade ${amenidadeId}`,
          descricao: item?.descricao ?? '',
          categoria_id: categoriaId,
          categoria_nome: categoriaNome,
          ativo: true,
        })
      })

      if (amenidadesSinteticas.length > 0) {
        hasLoadedDataRef.current = true
        const categoriasSinteticas = Array.from(categoriaMap.values())
        console.log('✅ AmenidadesStep - Categorias sintéticas geradas:', categoriasSinteticas.length)
        console.log('✅ AmenidadesStep - Amenidades sintéticas geradas:', amenidadesSinteticas.length)
        setCategorias(categoriasSinteticas)
        setAmenidades(amenidadesSinteticas)
      }
    }
  }, [mode, loading, categorias.length, amenidades.length, data.amenidades])

  const handleAmenidadeToggle = useCallback((amenidadeId: number) => {
    setSelectedAmenidades(prev => {
      const newSelection = prev.includes(amenidadeId)
        ? prev.filter(id => id !== amenidadeId)
        : [...prev, amenidadeId]
      
      // Atualizar dados do pai com debounce
      updateParentData(newSelection)
      
      return newSelection
    })
  }, [updateParentData])

  const handleSelectAllInCategory = useCallback((categoriaId: number) => {
    const amenidadesInCategory = amenidades
      .filter(a => a.categoria_id === categoriaId)
      .map(a => a.id)
    
    const allSelected = amenidadesInCategory.every(id => selectedAmenidades.includes(id))
    
    setSelectedAmenidades(prev => {
      const newSelection = allSelected
        ? prev.filter(id => !amenidadesInCategory.includes(id)) // Desmarcar todas
        : Array.from(new Set([...prev, ...amenidadesInCategory])) // Marcar todas
      
      // Atualizar dados do pai com debounce
      updateParentData(newSelection)
      
      return newSelection
    })
  }, [amenidades, selectedAmenidades, updateParentData])

  const filteredAmenidades = amenidades.filter(amenidade => {
    if (!searchTerm) return true
    return amenidade.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
           amenidade.categoria_nome.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const getAmenidadesByCategoria = (categoriaId: number) => {
    return filteredAmenidades.filter(a => a.categoria_id === categoriaId)
  }

  const getCategoriaStats = (categoriaId: number) => {
    const amenidadesInCategory = amenidades.filter(a => a.categoria_id === categoriaId)
    const selectedInCategory = amenidadesInCategory.filter(a => selectedAmenidades.includes(a.id))
    return {
      total: amenidadesInCategory.length,
      selected: selectedInCategory.length
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Amenidades do Imóvel</h2>
        <p className="text-gray-600">
          Selecione as amenidades disponíveis no imóvel. Você pode marcar categorias inteiras ou amenidades individuais.
        </p>
      </div>

      {/* Busca */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
          Buscar Amenidades
        </label>
        <input
          type="text"
          id="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Digite o nome da amenidade ou categoria..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Resumo */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">
              Amenidades selecionadas: {selectedAmenidades.length}
            </p>
            <p className="text-sm text-blue-700">
              {categorias.length} categorias disponíveis
            </p>
          </div>
          {selectedAmenidades.length > 0 && (
            <button
              onClick={() => {
                setSelectedAmenidades([])
                updateParentData([])
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Limpar todas
            </button>
          )}
        </div>
      </div>

      {/* Lista de Categorias e Amenidades */}
      <div className="space-y-6">
        {categorias.map((categoria) => {
          const amenidadesInCategory = getAmenidadesByCategoria(categoria.id)
          const stats = getCategoriaStats(categoria.id)
          
          if (amenidadesInCategory.length === 0) return null

          return (
            <div key={categoria.id} className="border border-gray-400 rounded-lg">
              {/* Cabeçalho da Categoria */}
              <div 
                className="px-4 py-3 border-b border-gray-400"
                style={{ backgroundColor: `${categoria.cor}15` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {categoria.icone && (
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${categoria.cor}40` }}>
                        <IconRenderer iconName={categoria.icone} className="w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {categoria.nome}
                      </h3>
                      {categoria.descricao && (
                        <p className="text-sm text-gray-600">{categoria.descricao}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">
                      {stats.selected}/{stats.total} selecionadas
                    </span>
                    <button
                      onClick={() => handleSelectAllInCategory(categoria.id)}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 transform hover:scale-105 ${
                        stats.selected === stats.total
                          ? 'bg-green-500 text-white hover:bg-green-600 shadow-green-200'
                          : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-200'
                      }`}
                      style={{
                        boxShadow: stats.selected === stats.total 
                          ? `0 4px 14px 0 ${categoria.cor}40` 
                          : `0 4px 14px 0 ${categoria.cor}40`
                      }}
                    >
                      {stats.selected === stats.total ? '✓ Desmarcar Todas' : '✓ Marcar Todas'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Amenidades */}
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {amenidadesInCategory.map((amenidade) => (
                    <label
                      key={amenidade.id}
                      className="flex items-start space-x-3 p-3 rounded-lg border border-gray-400 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAmenidades.includes(amenidade.id)}
                        onChange={() => handleAmenidadeToggle(amenidade.id)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {amenidade.nome}
                        </p>
                        {amenidade.descricao && (
                          <p className="text-xs text-gray-500 mt-1">
                            {amenidade.descricao}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mensagem quando não há amenidades */}
      {categorias.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma categoria de amenidades encontrada
          </h3>
          <p className="text-gray-600">
            Cadastre categorias de amenidades primeiro para poder selecionar amenidades.
          </p>
        </div>
      )}

      {/* Mensagem quando busca não retorna resultados */}
      {searchTerm && filteredAmenidades.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma amenidade encontrada
          </h3>
          <p className="text-gray-600">
            Tente ajustar o termo de busca.
          </p>
        </div>
      )}
    </div>
  )
}





