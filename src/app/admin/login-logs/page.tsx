'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import PermissionGuard from '@/components/admin/PermissionGuard';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CogIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';

// Importar novos componentes
import AdvancedFilters from '@/components/admin/logs/AdvancedFilters';
import SecurityAlerts from '@/components/admin/logs/SecurityAlerts';
import LogAnalytics from '@/components/admin/logs/LogAnalytics';
import ExportReports from '@/components/admin/logs/ExportReports';

interface LoginLog {
  id: number;
  user_id: string;
  username: string;
  action: string;
  ip_address: string;
  user_agent: string;
  two_fa_used: boolean;
  two_fa_method: string;
  success: boolean;
  failure_reason: string;
  session_id: string;
  created_at: string;
}

interface Stats {
  total_logs: number;
  total_logins: number;
  total_logouts: number;
  total_failed: number;
  total_2fa_used: number;
  total_failures: number;
  unique_users_in_logs: number;
  total_users_registered: number;
}

export default function LoginLogsPage() {
  const { get } = useApi();
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_logs: 0,
    total_logins: 0,
    total_logouts: 0,
    total_failed: 0,
    total_2fa_used: 0,
    total_failures: 0,
    unique_users_in_logs: 0,
    total_users_registered: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    username: '',
    action: '',
    two_fa_used: '',
    start_date: '',
    end_date: '',
    ip_address: ''
  });
  
  // Paginação
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      // Construir query string
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await get(`/api/admin/login-logs?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 DEBUG - Dados recebidos da API:', data.stats);
        setLogs(data.logs || []);
        setStats(prev => data.stats || prev);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }));
        setError(null);
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
      setError('Erro ao carregar logs de login');
    } finally {
      setLoading(false);
    }
  }, [filters, get, pagination.limit, pagination.page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset para primeira página
  };

  const clearFilters = () => {
    setFilters({
      username: '',
      action: '',
      two_fa_used: '',
      start_date: '',
      end_date: '',
      ip_address: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'logout':
        return <ArrowDownTrayIcon className="h-5 w-5 text-blue-500" />;
      case 'login_failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case '2fa_required':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case '2fa_success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case '2fa_failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'register':
        return <UserPlusIcon className="h-5 w-5 text-purple-500" />;
      case 'register_failed':
        return <XCircleIcon className="h-5 w-5 text-purple-700" />;
      default:
        return <EyeIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'login': 'Login',
      'logout': 'Logout',
      'login_failed': 'Login Falhou',
      '2fa_required': '2FA Obrigatório',
      '2fa_success': '2FA Sucesso',
      '2fa_failed': '2FA Falhou',
      'register': 'Cadastro Público',
      'register_failed': 'Cadastro Público Falhou'
    };
    return labels[action] || action;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const truncateUserAgent = (userAgent: string) => {
    return userAgent.length > 50 ? userAgent.substring(0, 50) + '...' : userAgent;
  };

  return (
    <PermissionGuard resource="monitoramento-auditoria-login-logout-2fa" action="EXECUTE">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logs de Login/Logout</h1>
            <p className="text-gray-600">Monitoramento e auditoria de tentativas de acesso</p>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.total_logs}</div>
            <div className="text-sm text-gray-600">Total de Logs</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.total_logins}</div>
            <div className="text-sm text-gray-600">Logins</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.total_logouts}</div>
            <div className="text-sm text-gray-600">Logouts</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">{stats.total_failed}</div>
            <div className="text-sm text-gray-600">Falhas</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">{stats.total_2fa_used}</div>
            <div className="text-sm text-gray-600">2FA Usado</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-orange-600">{stats.total_failures}</div>
            <div className="text-sm text-gray-600">Total Falhas</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-indigo-600">{stats.unique_users_in_logs || 0}</div>
            <div className="text-sm text-gray-600">Usuários Ativos</div>
            <div className="text-xs text-gray-500">de {stats.total_users_registered || 0} cadastrados</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpar Filtros
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuário
              </label>
              <input
                type="text"
                value={filters.username}
                onChange={(e) => handleFilterChange('username', e.target.value)}
                placeholder="Nome do usuário"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ação
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as ações</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="login_failed">Login Falhou</option>
                <option value="2fa_required">2FA Obrigatório</option>
                <option value="2fa_success">2FA Sucesso</option>
                <option value="2fa_failed">2FA Falhou</option>
                <option value="register">Cadastro Público</option>
                <option value="register_failed">Cadastro Público Falhou</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                2FA Usado
              </label>
              <select
                value={filters.two_fa_used}
                onChange={(e) => handleFilterChange('two_fa_used', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP Address
              </label>
              <input
                type="text"
                value={filters.ip_address}
                onChange={(e) => handleFilterChange('ip_address', e.target.value)}
                placeholder="192.168.1.100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Tabela de Logs */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-600">
              {error}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <EyeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ação
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        2FA
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User Agent
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getActionIcon(log.action)}
                            <span className="ml-2 text-sm font-medium text-gray-900">
                              {getActionLabel(log.action)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.ip_address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.two_fa_used ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              {log.two_fa_method || 'Sim'}
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              Não
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {log.success ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Sucesso
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Falha
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <span title={log.user_agent}>
                            {truncateUserAgent(log.user_agent)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Próximo
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando{' '}
                        <span className="font-medium">
                          {(pagination.page - 1) * pagination.limit + 1}
                        </span>{' '}
                        até{' '}
                        <span className="font-medium">
                          {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span>{' '}
                        de{' '}
                        <span className="font-medium">{pagination.total}</span>{' '}
                        resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          disabled={pagination.page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Anterior
                        </button>
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          disabled={pagination.page === pagination.totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Próximo
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* NOVOS COMPONENTES ADICIONADOS - SEM ALTERAR FUNCIONALIDADE EXISTENTE */}
          
          {/* Filtros Avançados */}
          <div className="mt-6">
            <AdvancedFilters 
              onFiltersChange={(newFilters) => {
                // Integrar com filtros existentes
                setFilters(prev => ({ ...prev, ...newFilters }));
              }}
              initialFilters={filters}
            />
          </div>

          {/* Alertas de Segurança */}
          <div className="mt-6">
            <SecurityAlerts logs={logs} />
          </div>

          {/* Análise de Atividade */}
          <div className="mt-6">
            <LogAnalytics logs={logs} stats={stats} />
          </div>

          {/* Exportação de Relatórios */}
          <div className="mt-6">
            <ExportReports logs={logs} stats={stats} />
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
