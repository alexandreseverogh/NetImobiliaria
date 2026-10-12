'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/useApi'
import DateInputPtBR from '@/components/ui/DateInputPtBR'
import {
  MagnifyingGlassIcon,
  ClockIcon,
  UserIcon,
  ChevronDoubleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline'
import TopFeaturesPieChart from './TopFeaturesPieChart'
import { ClientAvatarWithFallback } from '@/components/admin/ClientAvatar'

interface AccessLogRow {
  id: number
  accessed_at: string
  route: string
  feature_id: number | null
  feature_name: string | null
  feature_slug: string | null
  user_id: string | null
  user_nome: string | null
  user_email: string | null
  tenant_id: string | null
  tenant_name: string | null
  tenant_logo_url: string | null
}

interface TenantOption {
  id: string
  name: string
}

interface AdminOption {
  id: string
  nome: string
}

interface FeatureOption {
  feature_slug: string
  feature_name: string
}

const PAGE_SIZE = 20

export default function AccessLogTab() {
  const { get } = useApi()

  const [logs, setLogs] = useState<AccessLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [admins, setAdmins] = useState<AdminOption[]>([])
  const [features, setFeatures] = useState<FeatureOption[]>([])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [userId, setUserId] = useState('')
  const [featureSlug, setFeatureSlug] = useState('')

  const loadFilters = useCallback(async () => {
    try {
      const response = await get('/api/admin/master/access-logs/filters')
      if (response.ok) {
        const data = await response.json()
        setTenants(data.tenants || [])
        setAdmins(data.admins || [])
        setFeatures(data.features || [])
      }
    } catch (error) {
      console.error('Erro ao carregar filtros do log de acessos:', error)
    }
  }, [get])

  const loadLogs = useCallback(async (targetPage: number) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(targetPage),
        limit: String(PAGE_SIZE),
      })
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (tenantId) params.set('tenantId', tenantId)
      if (userId) params.set('userId', userId)
      if (featureSlug) params.set('featureSlug', featureSlug)

      const response = await get(`/api/admin/master/access-logs?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Erro ao carregar log de acessos:', error)
    } finally {
      setLoading(false)
    }
  }, [get, startDate, endDate, tenantId, userId, featureSlug])

  useEffect(() => {
    loadFilters()
  }, [loadFilters])

  useEffect(() => {
    setPage(1)
    loadLogs(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, tenantId, userId, featureSlug])

  const goToPage = (p: number) => {
    const clamped = Math.min(Math.max(1, p), totalPages)
    setPage(clamped)
    loadLogs(clamped)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center">
          <ClockIcon className="h-7 w-7 mr-3 text-blue-600" />
          Log de Acessos — Administradores das Empresas
        </h2>
        <p className="text-gray-500 mt-1 font-medium">
          Cada vez que um administrador de empresa abre uma tela da plataforma, 1 registro é gravado aqui.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
      <div>
      {/* Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-end mb-6">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Data Início</label>
          <DateInputPtBR
            value={startDate}
            onChange={setStartDate}
            className="w-full bg-gray-50 border-none rounded-lg text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Data Fim</label>
          <DateInputPtBR
            value={endDate}
            onChange={setEndDate}
            className="w-full bg-gray-50 border-none rounded-lg text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Empresa</label>
          <select
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-lg text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 py-2.5"
          >
            <option value="">Todas as Empresas</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Administrador</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-lg text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 py-2.5"
          >
            <option value="">Todos os Administradores</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>{a.nome}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Funcionalidade</label>
          <select
            value={featureSlug}
            onChange={(e) => setFeatureSlug(e.target.value)}
            className="w-full bg-gray-50 border-none rounded-lg text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 py-2.5"
          >
            <option value="">Todas as Funcionalidades</option>
            {features.map((f) => (
              <option key={f.feature_slug} value={f.feature_slug}>{f.feature_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center font-bold text-gray-400 animate-pulse">
            Carregando log de acessos...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center">
            <MagnifyingGlassIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 font-bold">Nenhum acesso encontrado para este filtro.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest">Empresa</th>
                <th className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest">Administrador</th>
                <th className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest">Data/Hora</th>
                <th className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest">Funcionalidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                      <ClientAvatarWithFallback
                        name={log.tenant_name || '—'}
                        logoUrl={log.tenant_logo_url}
                        isTenant
                        size="sm"
                      />
                      {log.tenant_name || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-2 text-gray-300" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{log.user_nome || 'N/A'}</p>
                        <p className="text-xs text-gray-400">{log.user_email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-gray-700">
                      {new Date(log.accessed_at).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">
                      {new Date(log.accessed_at).toLocaleTimeString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg font-black text-xs">
                      {log.feature_name || log.route}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {total > 0 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-xs font-bold text-gray-400">
            {total} registro(s) • página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={page <= 1}
              title="Primeira página"
              className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-black text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronDoubleLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              title="Página anterior"
              className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-black text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              title="Próxima página"
              className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-black text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={page >= totalPages}
              title="Última página"
              className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-black text-gray-600 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronDoubleRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      </div>

      <TopFeaturesPieChart
        startDate={startDate}
        endDate={endDate}
        tenantId={tenantId}
        userId={userId}
      />
      </div>
    </div>
  )
}
