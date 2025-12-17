'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { PieChartCard } from './PieChartCard'

interface ImovelDashboardsProps {
  filters: any
  refreshKey: number
}

export function ImovelDashboards({ filters, refreshKey }: ImovelDashboardsProps) {
  const { get } = useAuthenticatedFetch()
  
  const [tiposData, setTiposData] = useState<Array<{ name: string; value: number }>>([])
  const [finalidadesData, setFinalidadesData] = useState<Array<{ name: string; value: number }>>([])
  const [statusData, setStatusData] = useState<Array<{ name: string; value: number }>>([])
  const [estadosData, setEstadosData] = useState<Array<{ name: string; value: number }>>([])
  const [precosData, setPrecosData] = useState<Array<{ name: string; value: number }>>([])
  const [quartosData, setQuartosData] = useState<Array<{ name: string; value: number }>>([])
  const [areasData, setAreasData] = useState<Array<{ name: string; value: number }>>([])
  const [loading, setLoading] = useState(true)

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams()
    if (filters.startDate) params.append('start_date', filters.startDate)
    if (filters.endDate) params.append('end_date', filters.endDate)
    if (filters.tipoImovelId) params.append('tipo_id', filters.tipoImovelId)
    if (filters.finalidadeId) params.append('finalidade_id', filters.finalidadeId)
    if (filters.statusId) params.append('status_id', filters.statusId)
    if (filters.estadoId) params.append('estado_id', filters.estadoId)
    if (filters.cidadeId) params.append('cidade_id', filters.cidadeId)
    if (filters.bairro) params.append('bairro', filters.bairro)
    return params
  }, [filters])

  const loadTiposData = useCallback(async () => {
    try {
      const params = buildQueryParams()
      const res = await get(`/api/admin/dashboards/imoveis-por-tipo?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTiposData(data)
      }
    } catch (error) {
      console.error('Erro ao carregar tipos:', error)
      setTiposData([])
    }
  }, [buildQueryParams, get])

  const loadFinalidadesData = useCallback(async () => {
    try {
      const params = buildQueryParams()
      const res = await get(`/api/admin/dashboards/imoveis-por-finalidade?${params}`)
      if (res.ok) {
        const data = await res.json()
        setFinalidadesData(data)
      }
    } catch (error) {
      console.error('Erro ao carregar finalidades:', error)
      setFinalidadesData([])
    }
  }, [buildQueryParams, get])

  const loadStatusData = useCallback(async () => {
    try {
      const params = buildQueryParams()
      const res = await get(`/api/admin/dashboards/imoveis-por-status?${params}`)
      if (res.ok) {
        const data = await res.json()
        setStatusData(data)
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error)
      setStatusData([])
    }
  }, [buildQueryParams, get])

  const loadEstadosData = useCallback(async () => {
    try {
      const params = buildQueryParams()
      const res = await get(`/api/admin/dashboards/imoveis-por-estado?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEstadosData(data)
      }
    } catch (error) {
      console.error('Erro ao carregar estados:', error)
      setEstadosData([])
    }
  }, [buildQueryParams, get])

  const loadPrecosData = useCallback(async () => {
    try {
      const params = buildQueryParams()
      const res = await get(`/api/admin/dashboards/imoveis-por-faixa-preco?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPrecosData(data)
      }
    } catch (error) {
      console.error('Erro ao carregar faixas de preço:', error)
      setPrecosData([])
    }
  }, [buildQueryParams, get])

  const loadQuartosData = useCallback(async () => {
    try {
      const params = buildQueryParams()
      const res = await get(`/api/admin/dashboards/imoveis-por-quartos?${params}`)
      if (res.ok) {
        const data = await res.json()
        setQuartosData(data)
      }
    } catch (error) {
      console.error('Erro ao carregar quartos:', error)
      setQuartosData([])
    }
  }, [buildQueryParams, get])

  const loadAreasData = useCallback(async () => {
    try {
      const params = buildQueryParams()
      const res = await get(`/api/admin/dashboards/imoveis-por-area?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAreasData(data)
      }
    } catch (error) {
      console.error('Erro ao carregar áreas:', error)
      setAreasData([])
    }
  }, [buildQueryParams, get])

  const loadImovelData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadTiposData(),
        loadFinalidadesData(),
        loadStatusData(),
        loadEstadosData(),
        loadPrecosData(),
        loadQuartosData(),
        loadAreasData()
      ])
    } catch (error) {
      console.error('Erro ao carregar dados de imóveis:', error)
    } finally {
      setLoading(false)
    }
  }, [loadAreasData, loadEstadosData, loadFinalidadesData, loadPrecosData, loadQuartosData, loadStatusData, loadTiposData])

  useEffect(() => {
    loadImovelData()
  }, [loadImovelData, refreshKey])

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-lg p-6 border border-green-200">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-green-600 p-3 rounded-lg">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Imóveis</h2>
          <p className="text-sm text-gray-600">Análise detalhada do portfólio de imóveis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <PieChartCard
          title="Tipos de Imóveis"
          data={tiposData}
          loading={loading}
        />
        
        <PieChartCard
          title="Finalidades"
          data={finalidadesData}
          loading={loading}
        />
        
        <PieChartCard
          title="Status"
          data={statusData}
          loading={loading}
        />
        
        <PieChartCard
          title="Estados"
          data={estadosData}
          loading={loading}
        />
        
        <PieChartCard
          title="Faixas de Preço"
          data={precosData}
          loading={loading}
        />
        
        <PieChartCard
          title="Quantidade de Quartos"
          data={quartosData}
          loading={loading}
        />
        
        <PieChartCard
          title="Área Total (m²)"
          data={areasData}
          loading={loading}
        />
      </div>
    </div>
  )
}



