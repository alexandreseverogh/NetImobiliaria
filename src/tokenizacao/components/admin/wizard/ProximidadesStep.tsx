'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Imovel } from '@/lib/types/admin'
import { API_ENDPOINTS } from '@/lib/config/constants'
import IconRenderer from '../IconRenderer'

interface Proximidade {
  id: number
  nome: string
  descricao?: string
  categoria_id: number
  categoria_nome: string
  ativo: boolean
}

interface CategoriaProximidade {
  id: number
  nome: string
  descricao?: string
  icone?: string
  cor: string
  ativo: boolean
}

// Interface local para proximidades selecionadas (compatível com o componente)
interface ProximidadeSelecionada {
  id: number
  nome: string
  categoria_nome: string
  distancia: string
  tempo_caminhada: string
  observacoes: string
}

interface ProximidadesStepProps {
  data: Partial<Imovel>
  onUpdate: (data: Partial<Imovel>) => void
  mode: 'create' | 'edit'
}

export default function ProximidadesStep({ data, onUpdate, mode }: ProximidadesStepProps) {
  const [categorias, setCategorias] = useState<CategoriaProximidade[]>([])
  const [proximidades, setProximidades] = useState<Proximidade[]>([])
  const [selectedProximidades, setSelectedProximidades] = useState<ProximidadeSelecionada[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const isInitialLoad = useRef(true)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  // Scroll para o topo quando o componente é montado
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Atualizar proximidades selecionadas quando data prop mudar (modo de edição)
  useEffect(() => {
    console.log('🔍 ProximidadesStep - data.proximidades recebido:', data.proximidades)
    console.log('🔍 ProximidadesStep - data.proximidades length:', data.proximidades?.length)
    console.log('🔍 ProximidadesStep - data.proximidades type:', typeof data.proximidades)
    
    if (data.proximidades && data.proximidades.length > 0) {
      console.log('🔍 ProximidadesStep - Atualizando proximidades selecionadas:', data.proximidades)
      
      // Converter dados da API para o formato esperado pelo componente
      const proximidadesConvertidas: ProximidadeSelecionada[] = data.proximidades.map((prox: any) => ({
        id: prox.id || prox.proximidade_id,
        nome: prox.proximidade_nome || prox.nome || 'Nome não encontrado',
        categoria_nome: prox.categoria_nome || 'Categoria não encontrada',
        distancia: prox.distancia_metros ? `${prox.distancia_metros}m` : (prox.distancia || ''),
        tempo_caminhada: prox.tempo_caminhada || '',
        observacoes: prox.observacoes || ''
      }))
      
      console.log('🔍 ProximidadesStep - Proximidades convertidas:', proximidadesConvertidas)
      setSelectedProximidades(proximidadesConvertidas)
      isInitialLoad.current = false
    } else {
      console.log('🔍 ProximidadesStep - Nenhuma proximidade encontrada ou array vazio')
      setSelectedProximidades([])
      isInitialLoad.current = false
    }
  }, [data.proximidades])

  // Função para atualizar dados do pai com debounce
  const updateParentData = useCallback((newSelectedProximidades: ProximidadeSelecionada[]) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      if (!isInitialLoad.current) {
        onUpdate({
          proximidades: newSelectedProximidades
        })
      }
    }, 100) // Debounce de 100ms
  }, [onUpdate])

  // Cleanup do timeout quando componente desmontar
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Carregar categorias
      const categoriasResponse = await fetch(API_ENDPOINTS.PROXIMITIES.CATEGORIES)
      if (categoriasResponse.ok) {
        const categoriasData = await categoriasResponse.json()
        const categoriasAtivas = Array.isArray(categoriasData) 
          ? categoriasData.filter((c: any) => c.ativo === true)
          : categoriasData.data?.filter((c: any) => c.ativo === true) || []
        setCategorias(categoriasAtivas)
      }

      // Carregar proximidades
      const proximidadesResponse = await fetch(API_ENDPOINTS.PROXIMITIES.LIST)
      if (proximidadesResponse.ok) {
        const proximidadesData = await proximidadesResponse.json()
        const proximidadesAtivas = Array.isArray(proximidadesData)
          ? proximidadesData.filter((p: any) => p.ativo === true)
          : proximidadesData.data?.filter((p: any) => p.ativo === true) || []
        setProximidades(proximidadesAtivas)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProximidadeToggle = useCallback((proximidade: Proximidade) => {
    const existingIndex = selectedProximidades.findIndex(p => p.id === proximidade.id)
    
    setSelectedProximidades(prev => {
      let newSelection: ProximidadeSelecionada[]
      
      if (existingIndex >= 0) {
        // Remover proximidade
        newSelection = prev.filter((_, index) => index !== existingIndex)
      } else {
        // Adicionar proximidade
        const novaProximidade: ProximidadeSelecionada = {
          id: proximidade.id,
          nome: proximidade.nome,
          categoria_nome: proximidade.categoria_nome,
          distancia: '',
          tempo_caminhada: '',
          observacoes: ''
        }
        newSelection = [...prev, novaProximidade]
      }
      
      // Atualizar dados do pai com debounce
      updateParentData(newSelection)
      
      return newSelection
    })
  }, [selectedProximidades, updateParentData])

  const handleProximidadeUpdate = useCallback((index: number, field: keyof ProximidadeSelecionada, value: string) => {
    setSelectedProximidades(prev => {
      const newSelection = prev.map((p, i) => 
        i === index ? { ...p, [field]: value } : p
      )
      
      // Atualizar dados do pai com debounce
      updateParentData(newSelection)
      
      return newSelection
    })
  }, [updateParentData])

  const handleSelectAllInCategory = useCallback((categoriaId: number) => {
    const proximidadesInCategory = proximidades
      .filter(p => p.categoria_id === categoriaId)
    
    const selectedIds = selectedProximidades.map(p => p.id)
    const allSelected = proximidadesInCategory.every(p => selectedIds.includes(p.id))
    
    setSelectedProximidades(prev => {
      let newSelection: ProximidadeSelecionada[]
      
      if (allSelected) {
        // Desmarcar todas da categoria
        newSelection = prev.filter(p => 
          !proximidadesInCategory.some(prox => prox.id === p.id)
        )
      } else {
        // Marcar todas da categoria
        const novasProximidades: ProximidadeSelecionada[] = proximidadesInCategory
          .filter(p => !selectedIds.includes(p.id))
          .map(p => ({
            id: p.id,
            nome: p.nome,
            categoria_nome: p.categoria_nome,
            distancia: '',
            tempo_caminhada: '',
            observacoes: ''
          }))
        newSelection = [...prev, ...novasProximidades]
      }
      
      // Atualizar dados do pai com debounce
      updateParentData(newSelection)
      
      return newSelection
    })
  }, [proximidades, selectedProximidades, updateParentData])

  const filteredProximidades = proximidades.filter(proximidade => {
    if (!searchTerm) return true
    return proximidade.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
           proximidade.categoria_nome.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const getProximidadesByCategoria = (categoriaId: number) => {
    return filteredProximidades.filter(p => p.categoria_id === categoriaId)
  }

  const getCategoriaStats = (categoriaId: number) => {
    const proximidadesInCategory = proximidades.filter(p => p.categoria_id === categoriaId)
    const selectedIds = selectedProximidades.map(p => p.id)
    const selectedInCategory = proximidadesInCategory.filter(p => selectedIds.includes(p.id))
    return {
      total: proximidadesInCategory.length,
      selected: selectedInCategory.length
    }
  }

  const isProximidadeSelected = (proximidadeId: number) => {
    return selectedProximidades.some(p => p.id === proximidadeId)
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Proximidades do Imóvel</h2>
        <p className="text-gray-600">
          Selecione os pontos de interesse próximos ao imóvel. Você pode adicionar informações sobre distância e observações.
        </p>
      </div>

      {/* Busca */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
          Buscar Proximidades
        </label>
        <input
          type="text"
          id="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Digite o nome da proximidade ou categoria..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Resumo */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">
              Proximidades selecionadas: {selectedProximidades.length}
            </p>
            <p className="text-sm text-blue-700">
              {categorias.length} categorias disponíveis
            </p>
          </div>
          {selectedProximidades.length > 0 && (
            <button
              onClick={() => {
                setSelectedProximidades([])
                updateParentData([])
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Limpar todas
            </button>
          )}
        </div>
      </div>

      {/* Lista de Categorias e Proximidades */}
      <div className="space-y-6">
        {categorias.map((categoria) => {
          const proximidadesInCategory = getProximidadesByCategoria(categoria.id)
          const stats = getCategoriaStats(categoria.id)
          
          if (proximidadesInCategory.length === 0) return null

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
                        <IconRenderer iconName={categoria.icone} className="w-8 h-8" style={{ color: categoria.cor }} />
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

              {/* Lista de Proximidades */}
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {proximidadesInCategory.map((proximidade) => (
                    <label
                      key={proximidade.id}
                      className="flex items-start space-x-3 p-3 rounded-lg border border-gray-400 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isProximidadeSelected(proximidade.id)}
                        onChange={() => handleProximidadeToggle(proximidade)}
                        className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {proximidade.nome}
                        </p>
                        {proximidade.descricao && (
                          <p className="text-xs text-gray-500 mt-1">
                            {proximidade.descricao}
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

      {/* Detalhes das Proximidades Selecionadas */}
      {selectedProximidades.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="border-t border-gray-400 pt-4 mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Detalhes das Proximidades Selecionadas
            </h3>
          </div>
          
          <div className="space-y-4">
            {selectedProximidades.map((proximidade, index) => (
              <div key={proximidade.id} className="bg-white rounded-lg p-4 border border-gray-400">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">
                    {proximidade.nome}
                  </h4>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {proximidade.categoria_nome}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Distância
                    </label>
                    <input
                      type="text"
                      value={proximidade.distancia}
                      onChange={(e) => handleProximidadeUpdate(index, 'distancia', e.target.value)}
                      placeholder="Ex: 500m, 2km, 5 min a pé"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tempo de Caminhada
                    </label>
                    <input
                      type="text"
                      value={proximidade.tempo_caminhada}
                      onChange={(e) => handleProximidadeUpdate(index, 'tempo_caminhada', e.target.value)}
                      placeholder="Ex: 10 min, 15 min"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Observações
                    </label>
                    <input
                      type="text"
                      value={proximidade.observacoes}
                      onChange={(e) => handleProximidadeUpdate(index, 'observacoes', e.target.value)}
                      placeholder="Informações adicionais..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagem quando não há proximidades */}
      {categorias.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma categoria de proximidades encontrada
          </h3>
          <p className="text-gray-600">
            Cadastre categorias de proximidades primeiro para poder selecionar proximidades.
          </p>
        </div>
      )}

      {/* Mensagem quando busca não retorna resultados */}
      {searchTerm && filteredProximidades.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma proximidade encontrada
          </h3>
          <p className="text-gray-600">
            Tente ajustar o termo de busca.
          </p>
        </div>
      )}
    </div>
  )
}





