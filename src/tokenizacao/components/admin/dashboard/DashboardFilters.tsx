/* eslint-disable */
'use client'

import { useState, useEffect, useCallback } from 'react'

interface DashboardFiltersProps {
  onFiltersChange: (filters: {
    estado: string
    municipio: string
    tipo: string
    finalidade: string
    status: string
  }) => void
}

export default function DashboardFilters({ onFiltersChange }: DashboardFiltersProps) {
  const [filterEstado, setFilterEstado] = useState('')
  const [filterMunicipio, setFilterMunicipio] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterFinalidade, setFilterFinalidade] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  
  const [tiposImovel, setTiposImovel] = useState<any[]>([])
  const [finalidadesImovel, setFinalidadesImovel] = useState<any[]>([])
  const [statusImovel, setStatusImovel] = useState<any[]>([])
  const [municipiosData, setMunicipiosData] = useState<any>(null)

  const fetchFiltros = useCallback(async () => {
    try {
      const [tiposResponse, finalidadesResponse, statusResponse, municipiosResponse] = await Promise.all([
        fetch('/api/admin/tipos-imoveis', { credentials: 'include' }),
        fetch('/api/admin/finalidades', { credentials: 'include' }),
        fetch('/api/admin/status-imovel', { credentials: 'include' }),
        fetch('/api/admin/municipios', { credentials: 'include' })
      ])

      if (tiposResponse.ok) {
        const tiposData = await tiposResponse.json()
        setTiposImovel(tiposData || [])
      }

      if (finalidadesResponse.ok) {
        const finalidadesData = await finalidadesResponse.json()
        setFinalidadesImovel(finalidadesData.data || finalidadesData || [])
      }

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        setStatusImovel(statusData.data || statusData || [])
      }

      if (municipiosResponse.ok) {
        const municipiosData = await municipiosResponse.json()
        setMunicipiosData(municipiosData)
      }
    } catch (error) {
      console.error('Erro ao carregar filtros:', error)
    }
  }, [])

  useEffect(() => {
    fetchFiltros()
  }, [fetchFiltros])

  useEffect(() => {
    onFiltersChange({
      estado: filterEstado,
      municipio: filterMunicipio,
      tipo: filterTipo,
      finalidade: filterFinalidade,
      status: filterStatus
    })
  }, [filterEstado, filterMunicipio, filterTipo, filterFinalidade, filterStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  const estados = municipiosData ? municipiosData.estados?.sort((a: any, b: any) => a.nome.localeCompare(b.nome)) || [] : []
  const municipios = filterEstado && municipiosData 
    ? municipiosData.estados?.find((e: any) => e.sigla === filterEstado)?.municipios?.sort() || []
    : []

  const clearFilters = () => {
    setFilterEstado('')
    setFilterMunicipio('')
    setFilterTipo('')
    setFilterFinalidade('')
    setFilterStatus('')
  }

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filtros do Dashboard</h2>
        <button
          onClick={clearFilters}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Limpar Filtros
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estado
          </label>
          <select
            value={filterEstado}
            onChange={(e) => {
              setFilterEstado(e.target.value)
              setFilterMunicipio('')
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os estados</option>
            {estados.map((estado: any) => (
              <option key={estado.sigla} value={estado.sigla}>
                {estado.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            MunicÃ­pio
          </label>
          <select
            value={filterMunicipio}
            onChange={(e) => setFilterMunicipio(e.target.value)}
            disabled={!filterEstado}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Todos os municÃ­pios</option>
            {municipios.map((municipio: string) => (
              <option key={municipio} value={municipio}>
                {municipio}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo
          </label>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os tipos</option>
            {tiposImovel.map((tipo) => (
              <option key={tipo.id} value={tipo.nome}>
                {tipo.nome}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Finalidade
          </label>
          <select
            value={filterFinalidade}
            onChange={(e) => setFilterFinalidade(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas as finalidades</option>
            {finalidadesImovel.map((finalidade) => (
              <option key={finalidade.id} value={finalidade.nome}>
                {finalidade.nome}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os status</option>
            {statusImovel.map((status) => (
              <option key={status.id} value={status.nome}>
                {status.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

