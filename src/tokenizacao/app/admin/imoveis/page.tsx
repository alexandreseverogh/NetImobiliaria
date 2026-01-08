/* eslint-disable */
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Imovel } from '@/lib/database/imoveis'
import { usePageFocus } from '@/hooks/usePageFocus'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'
import ImovelGrid from '@/components/admin/ImovelGrid'

export default function ImoveisPage() {'  '
  const router = useRouter()
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    codigo: '',
    bairro: '',
    estado: '',
    municipio: '',
    tipo: '',
    finalidade: '',
    status: ''
  })
  const [appliedFilters, setAppliedFilters] = useState({
    codigo: '',
    bairro: '',
    estado: '',
    municipio: '',
    tipo: '',
    finalidade: '',
    status: ''
  })
  const [tipos, setTipos] = useState<Array<{id: string, nome: string}>>([])
  const [finalidades, setFinalidades] = useState<Array<{id: string, nome: string}>>([])
  const [statusOptions, setStatusOptions] = useState<Array<{id: string, nome: string}>>([])
  
  // Usar hook centralizado para estados e municÃ­pios
  const { estados, municipios, loadMunicipios, clearMunicipios, getEstadoNome, getCidadeNome } = useEstadosCidades()

  // Carregar dados dos filtros
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        // Carregar tipos de imÃ³veis
        const tiposResponse = await fetch('/api/admin/imoveis/tipos')
        if (tiposResponse.ok) {
          const tiposData = await tiposResponse.json()
          setTipos(tiposData || [])
        }

        // Carregar finalidades
        const finalidadesResponse = await fetch('/api/admin/imoveis/finalidades')
        if (finalidadesResponse.ok) {
          const finalidadesData = await finalidadesResponse.json()
          setFinalidades(finalidadesData || [])
        }

        // Estados jÃ¡ sÃ£o carregados pelo hook useEstadosCidades

        // Carregar status
        const statusResponse = await fetch('/api/admin/status-imovel')
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          setStatusOptions(statusData || [])
        }
      } catch (err) {
        console.error('Erro ao carregar dados dos filtros:', err)
      }
    }

    loadFilterData()
  }, [])

  // Carregar municÃ­pios quando estado mudar usando o hook
  useEffect(() => {
    loadMunicipios(filters.estado)
  }, [filters.estado, loadMunicipios])

  const fetchImoveis = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Construir query string com filtros aplicados
      const queryParams = new URLSearchParams()
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value)
        }
      })

      const response = await fetch(`/api/admin/imoveis?${queryParams.toString()}`)
      if (!response.ok) {
        throw new Error('Erro ao carregar imÃ³veis')
      }
      const data = await response.json()
      console.log('ðŸ” PÃ¡gina de ImÃ³veis - Dados recebidos da API:', data)
      console.log('ðŸ” PÃ¡gina de ImÃ³veis - Quantidade de imÃ³veis:', data.data?.length || 0)
      console.log('ðŸ” PÃ¡gina de ImÃ³veis - IDs dos imÃ³veis:', data.data?.map((imovel: any) => imovel.id))
      setImoveis(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [appliedFilters])

  useEffect(() => {
    fetchImoveis()
  }, [fetchImoveis])

  // Usar o hook personalizado para recarregar dados quando a pÃ¡gina receber foco
  usePageFocus(fetchImoveis)

  const handleFilterChange = (field: string, value: string) => {
    console.log('ðŸ” Filter change:', field, '=', value)
    setFilters(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleApplyFilters = () => {
    // Limpar municÃ­pios para nova consulta
    clearMunicipios()
    
    setAppliedFilters(filters)
  }

  const handleClearFilters = () => {
    const emptyFilters = {
      codigo: '',
      bairro: '',
      estado: '',
      municipio: '',
      tipo: '',
      finalidade: '',
      status: ''
    }
    setFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
  }


  const filteredImoveis = imoveis

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pt-4">
        <div className="relative flex items-center justify-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Cadastro de ImÃ³veis</h1>
          <div className="absolute right-0">
            <Link
              href="/admin/imoveis/novo"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Novo ImÃ³vel
            </Link>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">Filtros</h2>
        <div className="grid grid-cols-7 gap-4">
          {/* CÃ³digo */}
          <div>
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              CÃ³digo
            </label>
            <input
              type="number"
              value={filters.codigo}
              onChange={(e) => {
                // Permitir apenas nÃºmeros
                const value = e.target.value.replace(/[^0-9]/g, '')
                handleFilterChange('codigo', value)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite o cÃ³digo"
              min="1"
            />
          </div>

          {/* Bairro */}
          <div>
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Bairro
            </label>
            <input
              type="text"
              value={filters.bairro}
              onChange={(e) => handleFilterChange('bairro', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Digite o bairro"
            />
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Estado
            </label>
            <select
              value={filters.estado}
              onChange={(e) => handleFilterChange('estado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o estado</option>
              {estados.map(estado => (
                <option key={estado.id} value={estado.id}>
                  {estado.sigla} - {estado.nome}
                </option>
              ))}
            </select>
          </div>

          {/* MunicÃ­pio */}
          <div>
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Cidade
            </label>
            <select
              value={filters.municipio}
              onChange={(e) => handleFilterChange('municipio', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* Tipo */}
          <div>
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Tipo
            </label>
            <select
              value={filters.tipo}
              onChange={(e) => handleFilterChange('tipo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o tipo</option>
              {tipos.map(tipo => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Finalidade */}
          <div>
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Finalidade
            </label>
            <select
              value={filters.finalidade}
              onChange={(e) => handleFilterChange('finalidade', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione a finalidade</option>
              {finalidades.map(finalidade => (
                <option key={finalidade.id} value={finalidade.id}>
                  {finalidade.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-bold text-gray-700 text-center mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione o status</option>
              {statusOptions.map(status => (
                <option key={status.id} value={status.id}>
                  {status.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* BotÃµes de AÃ§Ã£o dos Filtros */}
        <div className="flex justify-center space-x-4 mt-4">
          <button
            onClick={handleApplyFilters}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Aplicar Filtros</span>
          </button>
          
          <button
            onClick={handleClearFilters}
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Limpar Filtros</span>
          </button>
        </div>
      </div>

      {/* Grid de ImÃ³veis */}
      <ImovelGrid 
        imoveis={filteredImoveis}
        loading={loading}
        error={error}
        onRetry={fetchImoveis}
      />

    </div>
  )
}
