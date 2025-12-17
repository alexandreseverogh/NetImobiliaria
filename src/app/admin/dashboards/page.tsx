'use client'

import { useState, useEffect } from 'react'
import PermissionGuard from '@/components/admin/PermissionGuard'
import { DashboardFilters } from '@/components/admin/Dashboards/DashboardFilters'
import { SystemDashboards } from '@/components/admin/Dashboards/SystemDashboards'
import { ImovelDashboards } from '@/components/admin/Dashboards/ImovelDashboards'
import { ClientesProprietariosDashboard } from '@/components/admin/Dashboards/ClientesProprietariosDashboard'

export interface DashboardFiltersType {
  startDate: string
  endDate: string
  tipoImovelId: string
  finalidadeId: string
  statusId: string
  estadoId: string
  cidadeId: string
  bairro: string
}

export default function DashboardsPage() {
  const [filters, setFilters] = useState<DashboardFiltersType>({
    startDate: '',
    endDate: '',
    tipoImovelId: '',
    finalidadeId: '',
    statusId: '',
    estadoId: '',
    cidadeId: '',
    bairro: ''
  })

  const [refreshKey, setRefreshKey] = useState(0)

  const handleFilterChange = (newFilters: Partial<DashboardFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleApplyFilters = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleClearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      tipoImovelId: '',
      finalidadeId: '',
      statusId: '',
      estadoId: '',
      cidadeId: '',
      bairro: ''
    })
    setRefreshKey(prev => prev + 1)
  }

  return (
    <PermissionGuard resource="dashboards" action="READ">
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Dashboards</h1>
          <p className="text-gray-600 mt-2">
            Análise completa do sistema e imóveis cadastrados
          </p>
        </div>

        {/* Filtros */}
        <DashboardFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
        />

        {/* Container Sistema */}
        <SystemDashboards filters={filters} refreshKey={refreshKey} />

        {/* Container Clientes/Proprietários */}
        <ClientesProprietariosDashboard refreshKey={refreshKey} />

        {/* Container Imóveis */}
        <ImovelDashboards filters={filters} refreshKey={refreshKey} />
      </div>
    </PermissionGuard>
  )
}



