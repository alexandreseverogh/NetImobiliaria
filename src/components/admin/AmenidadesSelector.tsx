'use client'

import { useState, useEffect } from 'react'
import { ImovelAmenidade } from '@/lib/types/admin'

interface CategoriaAmenidade {
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

interface Amenidade {
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

interface AmenidadesSelectorProps {
  value: ImovelAmenidade[]
  onChange: (amenidades: ImovelAmenidade[]) => void
}

export default function AmenidadesSelector({ value = [], onChange }: AmenidadesSelectorProps) {
  const [categorias, setCategorias] = useState<CategoriaAmenidade[]>([])
  const [amenidades, setAmenidades] = useState<Amenidade[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAmenidades, setSelectedAmenidades] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState<string>('')

  // Carregar categorias e amenidades
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Carregar categorias
        const categoriasResponse = await fetch('/api/admin/categorias-amenidades')
        const categoriasData = await categoriasResponse.json()
        
        // Carregar amenidades
        const amenidadesResponse = await fetch('/api/admin/amenidades')
        const amenidadesData = await amenidadesResponse.json()
        
        if (categoriasData.success && categoriasData.data) {
          setCategorias(categoriasData.data)
        }
        
        if (amenidadesData.success && amenidadesData.data) {
          setAmenidades(amenidadesData.data)
        }
        
        // Marcar amenidades já selecionadas
        const selected = new Set((value || []).map(a => a.amenidadeId))
        setSelectedAmenidades(selected)
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [value])

  const handleAmenidadeToggle = (amenidadeNome: string) => {
    const newSelected = new Set(selectedAmenidades)
    
    if (newSelected.has(amenidadeNome)) {
      newSelected.delete(amenidadeNome)
    } else {
      newSelected.add(amenidadeNome)
    }
    
    setSelectedAmenidades(newSelected)
    
    // Converter para o formato ImovelAmenidade
    const amenidadesSelecionadas: ImovelAmenidade[] = Array.from(newSelected).map(nome => ({
      amenidadeId: nome,
      destaque: false,
      amenidade: { 
        id: nome, 
        nome: nome, 
        ativo: true, 
        categoriaId: '1',
        categoria: { 
          id: '1', 
          nome: 'Geral', 
          ativo: true, 
          icone: 'home',
          ordem: 1,
          created_at: new Date(), 
          updated_at: new Date() 
        },
        icone: 'home',
        created_at: new Date(), 
        updated_at: new Date() 
      }
    }))
    
    onChange(amenidadesSelecionadas)
  }


  const handleDestaqueChange = (amenidadeNome: string, destaque: boolean) => {
    const amenidadesAtualizadas = (value || []).map(amenidade => 
      amenidade.amenidadeId === amenidadeNome 
        ? { ...amenidade, destaque }
        : amenidade
    )
    onChange(amenidadesAtualizadas)
  }

  // Agrupar amenidades por categoria
  const amenidadesPorCategoria = categorias.reduce((acc, categoria) => {
    const amenidadesDaCategoria = amenidades.filter(amenidade => 
      amenidade.categoria_id === categoria.id && amenidade.ativo
    )
    
    if (amenidadesDaCategoria.length > 0) {
      acc[categoria.nome] = amenidadesDaCategoria.map(a => a.nome)
    }
    
    return acc
  }, {} as { [categoria: string]: string[] })

  // Filtrar categorias baseado na busca e categoria selecionada
  const filteredCategorias = Object.entries(amenidadesPorCategoria).filter(([categoria, items]) => {
    if (selectedCategoria && categoria !== selectedCategoria) return false
    
    // Validar se items é um array antes de usar filter
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
        <h3 className="text-lg font-medium text-gray-900">Amenidades do Imóvel</h3>
        <p className="text-sm text-gray-600 mt-1">
          Selecione as amenidades disponíveis neste imóvel
        </p>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar amenidade
          </label>
          <input
            type="text"
            placeholder="Ex: piscina, academia, portaria..."
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

      <div className="space-y-6">
        {filteredCategorias.map(([categoria, amenidades]) => (
          <div key={categoria} className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
              {getCategoriaIcon(categoria)} {categoria}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {amenidades.map((amenidade) => {
                const isSelected = selectedAmenidades.has(amenidade)
                const amenidadeData = (value || []).find(a => a.amenidadeId === amenidade)
                
                return (
                  <div key={amenidade} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id={amenidade}
                      checked={isSelected}
                      onChange={() => handleAmenidadeToggle(amenidade)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <label 
                        htmlFor={amenidade}
                        className="text-sm font-medium text-gray-700 cursor-pointer"
                      >
                        {amenidade}
                      </label>
                      
                      {isSelected && (
                        <div className="mt-2 space-y-2">
                          <input
                            type="text"
                            placeholder="Observações específicas (opcional)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={amenidadeData?.destaque || false}
                              onChange={(e) => handleDestaqueChange(amenidade, e.target.checked)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-600">Destacar como diferencial</span>
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              <strong>Dica:</strong> Use os filtros para encontrar amenidades específicas ou por categoria. Selecione as amenidades disponíveis e adicione observações específicas para este imóvel.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Função para retornar ícones por categoria
function getCategoriaIcon(categoria: string): JSX.Element {
  const icons: { [key: string]: string } = {
    'Lazer & Entretenimento': '🎉',
    'Esporte & Saúde': '🏃‍♂️',
    'Segurança': '🛡️',
    'Conveniência & Serviços': '🛎️',
    'Verde & Sustentabilidade': '🌿',
    'Tecnologia & Conectividade': '📱',
    'Bem-estar & Relaxamento': '🧘‍♀️',
    'Públicos Especiais': '👥',
    'Estrutura & Arquitetura': '🏗️'
  }
  
  return <span className="text-xl mr-2">{icons[categoria] || '🏠'}</span>
}
