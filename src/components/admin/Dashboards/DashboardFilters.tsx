'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { useEstadosCidades } from '@/hooks/useEstadosCidades'
import EstadoSelect from '@/components/shared/EstadoSelect'

interface DashboardFiltersProps {
  filters: {
    startDate: string
    endDate: string
    tipoImovelId: string
    finalidadeId: string
    statusId: string
    estadoId: string
    cidadeId: string
    bairro: string
  }
  onFilterChange: (filters: any) => void
  onApply: () => void
  onClear: () => void
}

export function DashboardFilters({ filters, onFilterChange, onApply, onClear }: DashboardFiltersProps) {
  const { get } = useAuthenticatedFetch()
  
  const [tiposImoveis, setTiposImoveis] = useState<any[]>([])
  const [finalidades, setFinalidades] = useState<any[]>([])
  const [statusImoveis, setStatusImoveis] = useState<any[]>([])
  
  // Usar hook centralizado para estados e cidades
  const { estados, municipios, loadMunicipios } = useEstadosCidades()

  const loadFilterOptions = useCallback(async () => {
    try {
      // Carregar tipos de imóveis (API correta)
      const tiposRes = await get('/api/admin/imoveis/tipos')
      if (tiposRes.ok) {
        const tiposData = await tiposRes.json()
        setTiposImoveis(tiposData || [])
      }

      // Carregar finalidades (API correta)
      const finalidadesRes = await get('/api/admin/imoveis/finalidades')
      if (finalidadesRes.ok) {
        const finalidadesData = await finalidadesRes.json()
        setFinalidades(finalidadesData || [])
      }

      // Carregar status
      const statusRes = await get('/api/admin/status-imovel')
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setStatusImoveis(statusData || [])
      }
    } catch (error) {
      console.error('Erro ao carregar opções de filtro:', error)
    }
  }, [get])

  useEffect(() => {
    loadFilterOptions()
  }, [loadFilterOptions])

  useEffect(() => {
    if (filters.estadoId) {
      loadMunicipios(filters.estadoId)
    }
  }, [filters.estadoId, loadMunicipios])

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Filtros</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Data Inicial */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Inicial
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange({ startDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Data Final */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Final
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange({ endDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Tipo de Imóvel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Imóvel
          </label>
          <select
            value={filters.tipoImovelId}
            onChange={(e) => onFilterChange({ tipoImovelId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos</option>
            {tiposImoveis.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Finalidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Finalidade
          </label>
          <select
            value={filters.finalidadeId}
            onChange={(e) => onFilterChange({ finalidadeId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todas</option>
            {finalidades.map((finalidade) => (
              <option key={finalidade.id} value={finalidade.id}>
                {finalidade.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filters.statusId}
            onChange={(e) => onFilterChange({ statusId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos</option>
            {statusImoveis.map((status) => (
              <option key={status.id} value={status.id}>
                {status.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estado
          </label>
          <EstadoSelect
            value={filters.estadoId}
            onChange={(estadoId) => onFilterChange({ estadoId, cidadeId: '' })}
            placeholder="Todos"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            format="nome-sigla"
            showAllOption={true}
            allOptionLabel="Todos"
          />
        </div>

        {/* Cidade */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cidade
          </label>
          <select
            value={filters.cidadeId}
            onChange={(e) => onFilterChange({ cidadeId: e.target.value })}
            disabled={!filters.estadoId}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Todas</option>
            {municipios.map((cidade) => (
              <option key={cidade.id} value={cidade.id}>
                {cidade.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Bairro */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bairro
          </label>
          <input
            type="text"
            value={filters.bairro}
            onChange={(e) => onFilterChange({ bairro: e.target.value })}
            placeholder="Digite o bairro..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Botões */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={onApply}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Aplicar Filtros
        </button>
        <button
          onClick={onClear}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
        >
          Limpar Filtros
        </button>
      </div>
    </div>
  )
}

