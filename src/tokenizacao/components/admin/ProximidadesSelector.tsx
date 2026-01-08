/* eslint-disable */
'use client'

import { useState, useEffect } from 'react'
import { ProximidadeRelacionada } from '@/lib/types/admin'

interface CategoriaProximidade {
  id: number
  nome: string
  descricao?: string
  icone?: string
  cor: string
  ordem: number
  ativo: boolean
  created_at: string
  updated_at: string
}

interface Proximidade {
  id: number
  categoria_id?: number
  nome: string
  descricao?: string
  icone?: string
  popular: boolean
  ordem: number
  ativo: boolean
  created_at: string
  updated_at: string
  categoria_nome?: string
}

interface ProximidadesSelectorProps {
  proximidades: ProximidadeRelacionada[]
  onChange: (proximidades: ProximidadeRelacionada[]) => void
}

export default function ProximidadesSelector({ proximidades, onChange }: ProximidadesSelectorProps) {
  const [categorias, setCategorias] = useState<CategoriaProximidade[]>([])
  const [proximidadesData, setProximidadesData] = useState<Proximidade[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProximidades, setSelectedProximidades] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState<string>('')

  // Carregar categorias e proximidades
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Carregar categorias
        const categoriasResponse = await fetch('/api/admin/categorias-proximidades')
        const categoriasData = await categoriasResponse.json()
        
        // Carregar proximidades
        const proximidadesResponse = await fetch('/api/admin/proximidades')
        const proximidadesData = await proximidadesResponse.json()
        
        if (categoriasData.success && categoriasData.data) {
          setCategorias(categoriasData.data)
        }
        
        if (proximidadesData.success && proximidadesData.data) {
          setProximidadesData(proximidadesData.data)
        }
        
        // Marcar proximidades jÃ¡ selecionadas
        const selected = new Set(proximidades.map(p => p.nome || p.tipo))
        setSelectedProximidades(selected)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [proximidades])

  const handleProximidadeToggle = (proximidadeNome: string) => {
    const newSelected = new Set(selectedProximidades)
    
    if (newSelected.has(proximidadeNome)) {
      newSelected.delete(proximidadeNome)
    } else {
      newSelected.add(proximidadeNome)
    }
    
    setSelectedProximidades(newSelected)
    
    // Converter para o formato ProximidadeRelacionada
    const proximidadesSelecionadas: ProximidadeRelacionada[] = Array.from(newSelected).map(nome => ({
      proximidadeId: Math.random().toString(36).substr(2, 9),
      tipo: 'OUTROS' as any,
      nome: nome,
      distancia: 'PROXIMO' as any,
      tempoCaminhada: 'DEZ_MIN' as any,
      destaque: false,
      observacoes: ''
    }))
    
    onChange(proximidadesSelecionadas)
  }

  const handleObservacoesChange = (proximidadeNome: string, observacoes: string) => {
    const proximidadesAtualizadas = proximidades.map(proximidade => 
      (proximidade.nome || proximidade.tipo) === proximidadeNome 
        ? { ...proximidade, observacoes }
        : proximidade
    )
    onChange(proximidadesAtualizadas)
  }

  const handleDestaqueChange = (proximidadeNome: string, destaque: boolean) => {
    const proximidadesAtualizadas = proximidades.map(proximidade => 
      (proximidade.nome || proximidade.tipo) === proximidadeNome 
        ? { ...proximidade, destaque }
        : proximidade
    )
    onChange(proximidadesAtualizadas)
  }

  const handleDistanciaChange = (proximidadeNome: string, distancia: any) => {
    const proximidadesAtualizadas = proximidades.map(proximidade => 
      (proximidade.nome || proximidade.tipo) === proximidadeNome 
        ? { ...proximidade, distancia }
        : proximidade
    )
    onChange(proximidadesAtualizadas)
  }

  const handleTempoCaminhadaChange = (proximidadeNome: string, tempoCaminhada: any) => {
    const proximidadesAtualizadas = proximidades.map(proximidade => 
      (proximidade.nome || proximidade.tipo) === proximidadeNome 
        ? { ...proximidade, tempoCaminhada }
        : proximidade
    )
    onChange(proximidadesAtualizadas)
  }

  // Agrupar proximidades por categoria
  const proximidadesPorCategoria = categorias.reduce((acc, categoria) => {
    const proximidadesDaCategoria = proximidadesData.filter(proximidade => 
      proximidade.categoria_id === categoria.id && proximidade.ativo
    )
    
    if (proximidadesDaCategoria.length > 0) {
      acc[categoria.nome] = proximidadesDaCategoria.map(p => p.nome)
    }
    
    return acc
  }, {} as { [categoria: string]: string[] })

  // Filtrar proximidades baseado na busca e categoria
  const filteredCategorias = Object.entries(proximidadesPorCategoria).filter(([categoria, items]) => {
    if (selectedCategoria && categoria !== selectedCategoria) return false
    
    // Validar se items Ã© um array antes de usar filter
    if (!Array.isArray(items)) return false
    
    const filteredItems = items.filter(item => 
      item.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    return filteredItems.length > 0
  })

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900">Proximidades do ImÃ³vel</h3>
        <p className="text-sm text-gray-600 mt-1">
          Selecione os pontos de interesse prÃ³ximos ao imÃ³vel
        </p>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar proximidade
          </label>
          <input
            type="text"
            placeholder="Ex: shopping, farmÃ¡cia, praia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filtrar por categoria
          </label>
          <select
            value={selectedCategoria}
            onChange={(e) => setSelectedCategoria(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as categorias</option>
            {categorias.map(categoria => (
              <option key={categoria.id} value={categoria.nome}>{categoria.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de proximidades por categoria */}
      <div className="space-y-6">
        {filteredCategorias.map(([categoria, items]) => (
          <div key={categoria} className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
              {getCategoriaIcon(categoria)} {categoria}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((proximidade) => {
                const isSelected = selectedProximidades.has(proximidade)
                const proximidadeData = proximidades.find(p => (p.nome || p.tipo) === proximidade)
                
                return (
                  <div key={proximidade} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id={proximidade}
                      checked={isSelected}
                      onChange={() => handleProximidadeToggle(proximidade)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <label 
                        htmlFor={proximidade}
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        {proximidade}
                      </label>
                      
                      {isSelected && (
                        <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-md">
                          {/* DistÃ¢ncia */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              DistÃ¢ncia
                            </label>
                            <select
                              value={proximidadeData?.distancia || 'PROXIMO'}
                              onChange={(e) => handleDistanciaChange(proximidade, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="MUITO_PROXIMO">Muito prÃ³ximo (0-500m)</option>
                              <option value="PROXIMO">PrÃ³ximo (500m-1km)</option>
                              <option value="MEDIO">MÃ©dio (1km-2km)</option>
                              <option value="LONGE">Longe (2km+)</option>
                            </select>
                          </div>

                          {/* Tempo de caminhada */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Tempo de caminhada
                            </label>
                            <select
                              value={proximidadeData?.tempoCaminhada || 'DEZ_MIN'}
                              onChange={(e) => handleTempoCaminhadaChange(proximidade, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="CINCO_MIN">5 minutos</option>
                              <option value="DEZ_MIN">10 minutos</option>
                              <option value="QUINZE_MIN">15 minutos</option>
                              <option value="VINTE_MIN">20 minutos</option>
                              <option value="MAIS_VINTE">20+ minutos</option>
                            </select>
                          </div>

                          {/* ObservaÃ§Ãµes */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              ObservaÃ§Ãµes especÃ­ficas
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Shopping Recife, 24h"
                              value={proximidadeData?.observacoes || ''}
                              onChange={(e) => handleObservacoesChange(proximidade, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          {/* Destaque */}
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={proximidadeData?.destaque || false}
                              onChange={(e) => handleDestaqueChange(proximidade, e.target.checked)}
                              className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-600">Destacar como diferencial</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Dica */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              <strong>Dica:</strong> Selecione as proximidades disponÃ­veis e configure distÃ¢ncia, tempo de caminhada e observaÃ§Ãµes especÃ­ficas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// FunÃ§Ã£o para retornar Ã­cones por categoria
function getCategoriaIcon(categoria: string): JSX.Element {
  const icons: { [key: string]: string } = {
    'ComÃ©rcio & Shopping': 'ðŸ›ï¸',
    'AlimentaÃ§Ã£o': 'ðŸ½ï¸',
    'SaÃºde & Bem-estar': 'ðŸ¥',
    'EducaÃ§Ã£o': 'ðŸ“š',
    'Transporte': 'ðŸšŒ',
    'Lazer & Cultura': 'ðŸŽ­',
    'ServiÃ§os': 'ðŸ› ï¸'
  }
  
  return <span className="text-xl mr-2">{icons[categoria] || 'ðŸ“'}</span>
}



