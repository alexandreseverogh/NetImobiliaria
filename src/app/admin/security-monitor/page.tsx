'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface SecurityEvent {
  id: string
  timestamp: string
  type: 'login_attempt' | 'login_attempt_failed' | 'rate_limit_exceeded' | 'invalid_input' | 'suspicious_activity' | 'system_error' | 'resource_change' | 'resource_creation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message?: string
  description?: string
  ip_address?: string
  user_agent?: string
  endpoint?: string
  metadata?: Record<string, unknown>
  details?: Record<string, unknown>
  user_id?: number
  resolved?: boolean
}

interface SecurityStats {
  totalEvents?: number
  eventsByType?: Record<string, number>
  eventsBySeverity?: Record<string, number>
  recentAlerts?: number
  topIPs?: Array<{ ip: string; count: number }>
  topEndpoints?: Array<{ endpoint: string; count: number }>
}

export default function SecurityMonitorPage() {
  const { get } = useAuthenticatedFetch()
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedSeverity, setSelectedSeverity] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Definir filtro padrão para últimas 24h
  useEffect(() => {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    setStartDate(yesterday.toISOString().split('T')[0])
    setEndDate(now.toISOString().split('T')[0])
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      console.log('🔍 Buscando eventos de segurança...')
      
      // Construir parâmetros de query
      const queryParams = new URLSearchParams({
        type: 'events',
        limit: '100'
      })
      
      if (startDate) queryParams.append('startDate', startDate)
      if (endDate) queryParams.append('endDate', endDate)
      
      // Buscar eventos usando hook autenticado
      const eventsResponse = await get(`/api/admin/security-monitor?${queryParams}`)

      if (!eventsResponse.ok) {
        throw new Error('Erro ao buscar eventos de segurança')
      }

      const eventsData = await eventsResponse.json()
      console.log('📦 Eventos recebidos:', eventsData)
      setEvents(eventsData.data?.events || [])

      // Buscar estatísticas
      const statsParams = new URLSearchParams({
        type: 'stats'
      })

      if (startDate) statsParams.append('startDate', startDate)
      if (endDate) statsParams.append('endDate', endDate)
      if (selectedType !== 'all') statsParams.append('eventType', selectedType)
      if (selectedSeverity !== 'all') statsParams.append('severity', selectedSeverity)

      const statsResponse = await get(`/api/admin/security-monitor?${statsParams}`)

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        console.log('📊 Estatísticas recebidas:', statsData)
        setStats(statsData.data || statsData)
      }

    } catch (err) {
      console.error('❌ Erro ao carregar dados:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro inesperado ao carregar dados de segurança'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [endDate, get, startDate])

  useEffect(() => {
    fetchData()
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(() => {
      fetchData()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const filteredEvents = events.filter(event => {
    const typeMatch = selectedType === 'all' || event.type === selectedType
    const severityMatch = selectedSeverity === 'all' || event.severity === selectedSeverity
    return typeMatch && severityMatch
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'login_attempt': return '🔐'
      case 'login_attempt_failed': return '❌'
      case 'rate_limit_exceeded': return '⏱️'
      case 'invalid_input': return '⚠️'
      case 'suspicious_activity': return '🚨'
      case 'system_error': return '💥'
    case 'resource_change': return '🛠️'
    case 'resource_creation': return '🆕'
      default: return '📊'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR')
  }

  const resolveUsername = (event: SecurityEvent): string => {
    const metadataUsername = event.metadata && typeof (event.metadata as Record<string, unknown>).username === 'string'
      ? (event.metadata as Record<string, string>).username
      : undefined

    if (metadataUsername) {
      return metadataUsername
    }

    const detailsUsername = event.details && typeof (event.details as Record<string, unknown>).username === 'string'
      ? (event.details as Record<string, string>).username
      : undefined

    return detailsUsername ?? 'N/A'
  }

  console.log('🎨 Renderizando página:', { loading, error, eventsCount: events.length, hasStats: !!stats })

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <span className="text-2xl mr-3">🛡️</span>
              Monitoramento de Segurança
            </h1>
            <p className="mt-2 text-gray-600">
              Visualize eventos de segurança, alertas e estatísticas em tempo real
            </p>
          </div>

          {loading && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Carregando dados de segurança...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <span className="text-red-400 text-xl mr-3">❌</span>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Erro ao carregar dados</h3>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Estatísticas */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">📊</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total de Eventos</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.totalEvents || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">❌</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Logins com Falha</p>
                        <p className="text-2xl font-semibold text-red-600">{stats.eventsByType?.login_attempt_failed || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">🚫</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Rate Limit Excedido</p>
                        <p className="text-2xl font-semibold text-orange-600">{stats.eventsByType?.rate_limit_exceeded || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="text-2xl">⚠️</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Entradas Inválidas</p>
                        <p className="text-2xl font-semibold text-yellow-600">{stats.eventsByType?.invalid_input || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filtros */}
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Evento</label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Todos os Tipos</option>
                      <option value="login_attempt">Logins Bem-sucedidos</option>
                      <option value="login_attempt_failed">Logins com Falha</option>
                      <option value="rate_limit_exceeded">Rate Limit</option>
                      <option value="invalid_input">Entrada Inválida</option>
                      <option value="suspicious_activity">Atividade Suspeita</option>
                      <option value="resource_change">Alterações de Recurso</option>
                      <option value="resource_creation">Criação de Imóveis</option>
                      <option value="system_error">Erro de Sistema</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Severidade</label>
                    <select
                      value={selectedSeverity}
                      onChange={(e) => setSelectedSeverity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">Todas as Severidades</option>
                      <option value="critical">Crítico</option>
                      <option value="high">Alto</option>
                      <option value="medium">Médio</option>
                      <option value="low">Baixo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data Inicial</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data Final</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={fetchData}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      🔄 Atualizar
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setStartDate('')
                      setEndDate('')
                      setSelectedType('all')
                      setSelectedSeverity('all')
                    }}
                    className={`px-4 py-2 text-sm border rounded-md ${
                      !startDate && !endDate 
                        ? 'bg-blue-100 text-blue-800 border-blue-300' 
                        : 'text-gray-600 hover:text-gray-800 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Limpar Filtros
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date()
                      const yesterday = new Date(today)
                      yesterday.setDate(yesterday.getDate() - 1)
                      setStartDate(yesterday.toISOString().split('T')[0])
                      setEndDate(today.toISOString().split('T')[0])
                    }}
                    className={`px-4 py-2 text-sm border rounded-md ${
                      startDate && endDate && 
                      new Date(startDate).getTime() === new Date(new Date().getTime() - 24 * 60 * 60 * 1000).getTime()
                        ? 'bg-blue-100 text-blue-800 border-blue-300' 
                        : 'text-blue-600 hover:text-blue-800 border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    Últimas 24h
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date()
                      const weekAgo = new Date(today)
                      weekAgo.setDate(weekAgo.getDate() - 7)
                      setStartDate(weekAgo.toISOString().split('T')[0])
                      setEndDate(today.toISOString().split('T')[0])
                    }}
                    className={`px-4 py-2 text-sm border rounded-md ${
                      startDate && endDate && 
                      new Date(startDate).getTime() === new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).getTime()
                        ? 'bg-blue-100 text-blue-800 border-blue-300' 
                        : 'text-blue-600 hover:text-blue-800 border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    Última Semana
                  </button>
                </div>
              </div>

              {/* Lista de Eventos */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Eventos de Segurança ({filteredEvents.length})
                  </h3>
                </div>

                {filteredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl">✅</span>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum evento encontrado</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedType === 'all' && selectedSeverity === 'all' 
                        ? 'Sistema funcionando normalmente' 
                        : 'Nenhum evento corresponde aos filtros selecionados'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredEvents.map((event) => (
                      <div key={event.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <span className="text-2xl">{getTypeIcon(event.type)}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900">{event.description || event.message}</p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                                  {event.severity.toUpperCase()}
                                </span>
                              </div>
                              <div className="mt-1 text-sm text-gray-500">
                                <p>IP: {event.ip_address || 'N/A'} | Usuário: {resolveUsername(event)}</p>
                                <p>User Agent: {event.user_agent ? event.user_agent.substring(0, 50) + '...' : 'N/A'}</p>
                                {(event.metadata || event.details) && (
                                  <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                                    <p>Detalhes: {JSON.stringify(event.metadata || event.details).substring(0, 100)}...</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">{formatTimestamp(event.timestamp)}</p>
                            {event.resolved && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Resolvido
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
  )
}