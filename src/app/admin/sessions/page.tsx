'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useApi } from '@/hooks/useApi'
import PermissionGuard from '@/components/admin/PermissionGuard'
import { 
  ClockIcon, 
  ComputerDesktopIcon, 
  UserIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface ActiveSession {
  id: number
  user_id: string
  username: string
  nome: string
  ip_address: string
  user_agent: string
  is_2fa_verified: boolean
  created_at: string
  expires_at: string
  time_remaining: string
}

export default function SessionsPage() {
  const { get, delete: del, post } = useApi()
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateFilter, setDateFilter] = useState('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedSessions, setSelectedSessions] = useState<number[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  const fetchSessions = useCallback(async () => {
    try {
      setRefreshing(true)
      
      // Validar período customizado
      if (dateFilter === 'custom' && (!startDate || !endDate)) {
        console.warn('⚠️ Período customizado selecionado mas datas não preenchidas')
        setLoading(false)
        setRefreshing(false)
        setSessions([])
        setTotal(0)
        return
      }
      
      // Construir URL com parâmetros de filtro
      const params = new URLSearchParams({
        date: dateFilter,
        page: page.toString(),
        limit: '50'
      })
      
      if (dateFilter === 'custom' && startDate && endDate) {
        params.append('startDate', startDate)
        params.append('endDate', endDate)
        console.log('📅 Aplicando filtro customizado:', { startDate, endDate })
      }
      
      const response = await get(`/api/admin/sessions?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      } else {
        console.error('Erro ao buscar sessões:', response.status)
      }
    } catch (error) {
      console.error('Erro ao buscar sessões:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [dateFilter, endDate, get, page, startDate])

  useEffect(() => {
    fetchSessions()
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(() => {
      fetchSessions()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchSessions])

  const handleRevokeSession = async (sessionId: number, username: string) => {
    // Primeira confirmação
    if (!confirm(`⚠️ ATENÇÃO: Você está prestes a revogar a sessão do usuário "${username}".\n\nO usuário será deslogado imediatamente.\n\nTem certeza que deseja continuar?`)) {
      return
    }

    // Segunda confirmação para maior segurança
    if (!confirm(`🚨 CONFIRMAÇÃO FINAL:\n\nRevogar sessão de "${username}"?\n\nEsta ação não pode ser desfeita!`)) {
      return
    }

    try {
      const response = await del(`/api/admin/sessions/${sessionId}`)
      
      if (response.ok) {
        const data = await response.json()
        // Remover sessão da lista
        setSessions(sessions.filter(s => s.id !== sessionId))
        alert(`✅ Sessão revogada com sucesso!\n\nUsuário: ${data.revokedUser?.nome || username}`)
      } else {
        const data = await response.json()
        alert(`❌ Erro ao revogar sessão: ${data.error}`)
      }
    } catch (error) {
      console.error('Erro ao revogar sessão:', error)
      alert('❌ Erro ao revogar sessão')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const getBrowserInfo = (userAgent: string) => {
    if (!userAgent || userAgent === 'Desconhecido') return 'Desconhecido'
    
    // Detectar navegador
    if (userAgent.includes('Chrome')) return 'Chrome'
    if (userAgent.includes('Firefox')) return 'Firefox'
    if (userAgent.includes('Safari')) return 'Safari'
    if (userAgent.includes('Edge')) return 'Edge'
    
    return 'Outro'
  }

  const handleSelectSession = (sessionId: number) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId) 
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    )
  }

  const activeSessions = useMemo(
    () => sessions.filter(session => !session.time_remaining.includes('Expirada')),
    [sessions]
  )

  const handleSelectAll = () => {
    const activeIds = activeSessions.map(s => s.id)
    if (selectedSessions.length === activeIds.length) {
      setSelectedSessions([])
    } else {
      setSelectedSessions(activeIds)
    }
  }

useEffect(() => {
  setSelectedSessions(prev =>
    prev.filter(id => activeSessions.some(session => session.id === id))
  )
}, [activeSessions])

  const handleBulkRevoke = async (type: 'selected' | 'all') => {
    if (type === 'selected' && selectedSessions.length === 0) {
      alert('Selecione pelo menos uma sessão para revogar')
      return
    }

    let confirmMessage = ''
    if (type === 'selected') {
      confirmMessage = `⚠️ ATENÇÃO: Você está prestes a revogar ${selectedSessions.length} sessão(ões) selecionada(s).\n\nOs usuários serão deslogados imediatamente.\n\nTem certeza que deseja continuar?`
    } else {
      confirmMessage = `🚨 ATENÇÃO CRÍTICA: Você está prestes a revogar TODAS as sessões ativas (${sessions.length}).\n\nTODOS os usuários serão deslogados imediatamente.\n\nEsta é uma ação muito perigosa!\n\nTem certeza que deseja continuar?`
    }

    if (!confirm(confirmMessage)) return

    // Segunda confirmação
    if (!confirm(`🚨 CONFIRMAÇÃO FINAL:\n\n${type === 'selected' ? 'Revogar sessões selecionadas' : 'Revogar TODAS as sessões'}?\n\nEsta ação não pode ser desfeita!`)) {
      return
    }

    try {
      const response = await post('/api/admin/sessions/bulk-revoke', {
        type,
        sessionIds: type === 'selected' ? selectedSessions : undefined
      })

      if (response.ok) {
        const data = await response.json()
        alert(`✅ ${data.message}\n\nRevogado por: ${data.revokedBy}`)
        
        // Limpar seleções e recarregar
        setSelectedSessions([])
        setShowBulkActions(false)
        fetchSessions()
      } else {
        const data = await response.json()
        alert(`❌ Erro na revogação em massa: ${data.error}`)
      }
    } catch (error) {
      console.error('Erro na revogação em massa:', error)
      alert('❌ Erro na revogação em massa')
    }
  }

  const isSessionExpired = (session: ActiveSession) =>
    session.time_remaining.includes('Expirada')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando sessões ativas...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Monitoramento de Sessões
          </h1>
          <p className="text-gray-600 mt-2">
            Monitore e gerencie sessões ativas dos usuários
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Sessões Ativas
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {activeSessions.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>


          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Última Atualização
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {refreshing ? 'Atualizando...' : 'Agora'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Hoje</option>
                <option value="week">Últimos 7 dias</option>
                <option value="month">Últimos 30 dias</option>
                <option value="custom">Período customizado</option>
              </select>
            </div>
            
            {dateFilter === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setPage(1)
                  fetchSessions()
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={fetchSessions}
              disabled={refreshing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <ClockIcon className="h-5 w-5" />
              <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
            </button>

            {activeSessions.length > 0 && (
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
              >
                <TrashIcon className="h-5 w-5" />
                <span>Revogação em Massa</span>
              </button>
            )}
          </div>

          <div className="text-sm text-gray-500">
            Atualização automática a cada 30 segundos
          </div>
        </div>

        {/* Bulk Actions */}
        {showBulkActions && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-orange-900 mb-4">⚠️ Revogação em Massa</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedSessions.length === activeSessions.length && activeSessions.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="text-sm font-medium text-gray-700">
                  Selecionar Todas ({activeSessions.length})
                </label>
              </div>
              
              <div className="text-sm text-gray-600">
                {selectedSessions.length} sessão(ões) selecionada(s)
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkRevoke('selected')}
                  disabled={selectedSessions.length === 0}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  Revogar Selecionadas
                </button>
                
                <button
                  onClick={() => handleBulkRevoke('all')}
                  className="bg-red-800 hover:bg-red-900 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  Revogar TODAS
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aviso quando período customizado não tem datas */}
        {dateFilter === 'custom' && (!startDate || !endDate) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Preencha as datas</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Para filtrar por período customizado, preencha a data inicial e final.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sessions Table */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {showBulkActions && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedSessions.length === activeSessions.length && activeSessions.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dispositivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conectado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expira em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                      {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={showBulkActions ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
                      {dateFilter === 'custom' && (!startDate || !endDate)
                        ? 'Preencha as datas para visualizar sessões'
                        : 'Nenhuma sessão ativa encontrada para o período selecionado'
                      }
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => {
                    const expired = isSessionExpired(session)
                    const isSelected = selectedSessions.includes(session.id)
                    return (
                    <tr key={session.id} className="hover:bg-gray-50">
                      {showBulkActions && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (!expired) {
                                handleSelectSession(session.id)
                              }
                            }}
                            disabled={expired}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {session.nome.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {session.nome}
                            </div>
                            <div className="text-sm text-gray-500">
                              @{session.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ComputerDesktopIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm text-gray-900">
                              {getBrowserInfo(session.user_agent)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {session.ip_address}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(session.created_at)}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-medium ${
                            expired ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {session.time_remaining}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRevokeSession(session.id, session.username)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors flex items-center ${
                              expired
                                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                : 'text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100'
                            }`}
                            title={expired ? 'Sessão já expirada' : 'Revogar sessão'}
                            disabled={expired}
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Revogar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{((page - 1) * 50) + 1}</span> até{' '}
                  <span className="font-medium">{Math.min(page * 50, total)}</span> de{' '}
                  <span className="font-medium">{total}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próximo
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
