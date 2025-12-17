'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { PieChartCard } from './PieChartCard'

interface SystemDashboardsProps {
  filters: any
  refreshKey: number
}

export function SystemDashboards({ filters, refreshKey }: SystemDashboardsProps) {
  const { get } = useAuthenticatedFetch()
  
  const [auditData, setAuditData] = useState<Array<{ name: string; value: number }>>([])
  const [loginProfilesData, setLoginProfilesData] = useState<Array<{ name: string; value: number }>>([])
  const [loading, setLoading] = useState(true)

  const loadAuditData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('start_date', filters.startDate)
      if (filters.endDate) params.append('end_date', filters.endDate)

      const res = await get(`/api/admin/dashboards/audit-actions?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAuditData(data)
      }
    } catch (error) {
      console.error('Erro ao carregar dados de auditoria:', error)
      setAuditData([])
    }
  }, [filters.endDate, filters.startDate, get])

  const loadLoginProfilesData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('start_date', filters.startDate)
      if (filters.endDate) params.append('end_date', filters.endDate)

      const res = await get(`/api/admin/dashboards/login-profiles?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLoginProfilesData(data)
      }
    } catch (error) {
      console.error('Erro ao carregar dados de login por perfil:', error)
      setLoginProfilesData([])
    }
  }, [filters.endDate, filters.startDate, get])

  const loadSystemData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadAuditData(),
        loadLoginProfilesData()
      ])
    } catch (error) {
      console.error('Erro ao carregar dados do sistema:', error)
    } finally {
      setLoading(false)
    }
  }, [loadAuditData, loadLoginProfilesData])

  useEffect(() => {
    loadSystemData()
  }, [loadSystemData, refreshKey])

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 mb-6 border border-blue-200 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600 p-3 rounded-lg">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sistema</h2>
          <p className="text-sm text-gray-600">Métricas de auditoria e acessos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PieChartCard
          title="Ações do Sistema (Audit)"
          data={auditData}
          loading={loading}
        />

        <PieChartCard
          title="Logins por Perfil de Usuário"
          data={loginProfilesData}
          loading={loading}
        />
      </div>
    </div>
  )
}



