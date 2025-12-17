'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/useApi'
import { usePermissions } from '@/hooks/usePermissions'

interface AuditLog {
  id: string
  user_id: string | null
  user_id_int?: number | null
  user_type?: string | null
  public_user_uuid?: string | null
  action: string
  resource: string
  resource_id: string | null
  details: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
  username: string | null
  nome: string | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface AuditStats {
  total: number
  admin: number
  cliente: number
  proprietario: number
  indefinido: number
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
    action: '',
    search: ''
  })
  const [stats, setStats] = useState<AuditStats>({
    total: 0,
    admin: 0,
    cliente: 0,
    proprietario: 0,
    indefinido: 0
  })

  const { get } = useApi()
  const { hasPermission } = usePermissions()
  const canExecute = hasPermission('auditoria-logs-sistema', 'EXECUTE')

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...filters
      })

      const response = await get(`/api/admin/audit?${params}`)

      if (!response.ok) {
        console.error('❌ Erro na API:', response.status, response.statusText)
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setLogs(data.data.logs ?? [])
        setPagination((prev) => ({
          page: data.data.pagination?.page ?? page,
          limit: data.data.pagination?.limit ?? prev.limit,
          total: data.data.pagination?.total ?? prev.total,
          totalPages: data.data.pagination?.totalPages ?? prev.totalPages
        }))
        if (data.data.stats) {
          setStats({
            total: data.data.stats.total ?? 0,
            admin: data.data.stats.admin ?? 0,
            cliente: data.data.stats.cliente ?? 0,
            proprietario: data.data.stats.proprietario ?? 0,
            indefinido: data.data.stats.indefinido ?? 0
          })
        } else {
          setStats({
            total: 0,
            admin: 0,
            cliente: 0,
            proprietario: 0,
            indefinido: 0
          })
        }
      } else {
        console.error('❌ API retornou success=false:', data)
        setLogs([])
      }
    } catch (error) {
      console.error('❌ Erro ao carregar logs:', error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [filters, get, pagination.limit])

  const { startDate, endDate, userId, action, search } = filters

  useEffect(() => {
    if (!canExecute) {
      return
    }
    setPagination((prev) => ({
      ...prev,
      page: 1
    }))
    fetchLogs(1)
  }, [canExecute, fetchLogs])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
    setPagination(prev => ({
      ...prev,
      page: 1
    }))
  }

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      userId: '',
      action: '',
      search: ''
    })
    setPagination(prev => ({
      ...prev,
      page: 1
    }))
    fetchLogs(1)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const getActionColor = (action: string) => {
    const colors: { [key: string]: string } = {
      'CREATE': 'bg-green-100 text-green-800',
      'UPDATE': 'bg-blue-100 text-blue-800',
      'DELETE': 'bg-red-100 text-red-800',
      'LOGIN_SUCCESS': 'bg-green-100 text-green-800',
      'LOGIN_FAILED': 'bg-red-100 text-red-800',
      'LOGOUT': 'bg-gray-100 text-gray-800',
      '2FA_SUCCESS': 'bg-emerald-100 text-emerald-800',
      '2FA_FAILED': 'bg-rose-100 text-rose-800',
      'PURGE_LOGS_WITH_ARCHIVE': 'bg-orange-100 text-orange-800',
      'PURGE_LOGS': 'bg-yellow-100 text-yellow-800',
      'AUTO_PURGE_LOGS': 'bg-indigo-100 text-indigo-800',
      'PURGE_LOGS_TEST': 'bg-pink-100 text-pink-800'
    }
    return colors[action] || 'bg-gray-100 text-gray-800'
  }

  const getUserLabel = (log: AuditLog) => {
    if (log.nome) return log.nome
    if (log.username) return log.username
    if (log.public_user_uuid) return `Público (${log.public_user_uuid.slice(0, 8)}...)`

    const type = log.user_type?.toLowerCase()
    if (type === 'cliente') return 'Público (Cliente)'
    if (type === 'proprietario') return 'Público (Proprietário)'
    if (type === 'public' || type === 'público' || type === 'publico') return 'Público'

    return 'Sistema'
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages || newPage === pagination.page) {
      return
    }
    setPagination(prev => ({
      ...prev,
      page: newPage
    }))
    fetchLogs(newPage)
  }

  const normalizeDetails = (details: any) => {
    if (!details) return null
    if (typeof details === 'string') {
      try {
        return JSON.parse(details)
      } catch {
        return details
      }
    }
    return details
  }

  const renderDetailContent = (log: AuditLog) => {
    const details = normalizeDetails(log.details)
    if (!details) {
      return <span>-</span>
    }

    if (log.resource === 'imovel_status' && typeof details === 'object') {
      return (
        <div className="space-y-1">
          <p className="font-semibold text-gray-900">Novo Status Adicionado</p>
          {'description' in details && details.description ? (
            <p className="text-gray-700">{details.description}</p>
          ) : null}
          <div className="border-t border-gray-300 pt-1 mt-1 space-y-1">
            <p className="text-gray-600">
              <span className="font-medium">Status:</span>{' '}
              {'status_nome' in details ? details.status_nome || 'N/A' : 'N/A'}
            </p>
            {'imovel_codigo' in details && details.imovel_codigo ? (
              <p className="text-gray-600">
                <span className="font-medium">Código do Imóvel:</span> {details.imovel_codigo}
              </p>
            ) : null}
          </div>
          {'created_by_name' in details && details.created_by_name ? (
            <p className="text-gray-600 text-xs mt-2 border-t border-gray-300 pt-1">
              <span className="font-medium">Adicionado por:</span> {details.created_by_name}
            </p>
          ) : null}
          {'timestamp' in details && details.timestamp ? (
            <p className="text-gray-600 text-xs">
              <span className="font-medium">Data/Hora:</span>{' '}
              {new Date(details.timestamp as string).toLocaleString('pt-BR')}
            </p>
          ) : null}
        </div>
      )
    }

    if (typeof details === 'object') {
      return (
        <pre className="overflow-auto">
          {JSON.stringify(details, null, 2)}
        </pre>
      )
    }

    return <span>{String(details)}</span>
  }

  if (!hasPermission('auditoria-logs-sistema', 'EXECUTE')) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Acesso restrito</h1>
          <p className="text-gray-600">
            Você não possui permissão para visualizar os logs de auditoria do sistema.
          </p>
        </div>
      </div>
    )
  }

  const publicTotal = stats.cliente + stats.proprietario

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs de Auditoria</h1>
          <p className="text-gray-600">Monitore todas as ações registradas no sistema administrativo e público.</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ação</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as ações</option>
                <option value="CREATE">Criar</option>
                <option value="UPDATE">Atualizar</option>
                <option value="DELETE">Excluir</option>
                <option value="LOGIN_SUCCESS">Login Bem-sucedido</option>
                <option value="LOGIN_FAILED">Login Falhado</option>
                <option value="LOGOUT">Logout</option>
                <option value="2FA_SUCCESS">2FA Bem-sucedido</option>
                <option value="2FA_FAILED">2FA Falhado</option>
                <option value="PURGE_LOGS_WITH_ARCHIVE">Expurgo de Logs</option>
                <option value="PURGE_LOGS">Limpeza de Logs</option>
                <option value="AUTO_PURGE_LOGS">Limpeza Automática</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <input
                type="text"
                placeholder="Buscar por ação, recurso, usuário..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Logs</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Logs Administrativos</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.admin}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Logs Públicos</p>
                <p className="text-2xl font-semibold text-gray-900">{publicTotal}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 108 0 4 4 0 10-8 0zm10 0a4 4 0 108 0 4 4 0 10-8 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sem Identificação</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.indefinido}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Página Atual</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {pagination.totalPages > 0 ? `${pagination.page} de ${pagination.totalPages}` : '1 de 1'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Logs por Página</p>
                <p className="text-2xl font-semibold text-gray-900">{pagination.limit}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Logs de Auditoria</h2>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Carregando logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            Nenhum registro encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recurso</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalhes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.resource}
                      {log.resource_id && (
                        <span className="text-gray-500 ml-1">({log.resource_id})</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getUserLabel(log)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <details className="cursor-pointer">
                        <summary className="text-blue-600 hover:text-blue-800">Ver detalhes</summary>
                        <div className="mt-2 p-3 bg-gray-100 rounded text-xs max-w-sm">
                          {renderDetailContent(log)}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} registros
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
