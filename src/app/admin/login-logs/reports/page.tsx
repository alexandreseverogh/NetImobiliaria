'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import PermissionGuard from '@/components/admin/PermissionGuard';
import ExportReports from '@/components/admin/logs/ExportReports';
import AdvancedFilters from '@/components/admin/logs/AdvancedFilters';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

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
}

export default function LogReportsPage() {
  const { get } = useApi();
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_logs: 0,
    total_logins: 0,
    total_logouts: 0,
    total_failed: 0,
    total_2fa_used: 0,
    total_failures: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<any>({});
  const [selectedReport, setSelectedReport] = useState<'summary' | 'detailed' | 'security'>('summary');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      // Buscar logs para relatórios
      const params = new URLSearchParams({
        page: '1',
        limit: '10000', // Buscar todos os logs
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const response = await get(`/api/admin/login-logs?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
        setStats(prev => data.stats || prev);
        setError(null);
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
      setError('Erro ao carregar logs para relatórios');
    } finally {
      setLoading(false);
    }
  }, [filters, get]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const generateSummaryReport = () => {
    const activeUsers = (stats as any).unique_users_in_logs || 0;
    const totalUsers = (stats as any).total_users_registered || 0;
    const successRate = stats.total_logs > 0 
      ? ((stats.total_logs - stats.total_failures) / stats.total_logs * 100).toFixed(1)
      : 0;
    const twoFaRate = stats.total_logs > 0 
      ? (stats.total_2fa_used / stats.total_logs * 100).toFixed(1)
      : 0;
    const failureRate = stats.total_logs > 0 
      ? (stats.total_failures / stats.total_logs * 100).toFixed(1)
      : 0;

    return {
      activeUsers,
      totalUsers,
      successRate,
      twoFaRate,
      failureRate,
      period: filters.start_date && filters.end_date 
        ? `${filters.start_date} até ${filters.end_date}`
        : 'Todos os períodos'
    };
  };

  const generateDetailedReport = () => {
    const userStats = logs.reduce((acc, log) => {
      if (!acc[log.username]) {
        acc[log.username] = {
          totalLogins: 0,
          successfulLogins: 0,
          twoFaUsed: 0,
          lastLogin: log.created_at,
          ipAddresses: new Set()
        };
      }

      if (log.action === 'login') {
        acc[log.username].totalLogins++;
        if (log.success) {
          acc[log.username].successfulLogins++;
        }
        if (new Date(log.created_at) > new Date(acc[log.username].lastLogin)) {
          acc[log.username].lastLogin = log.created_at;
        }
      }

      if (log.two_fa_used) {
        acc[log.username].twoFaUsed++;
      }

      acc[log.username].ipAddresses.add(log.ip_address);

      return acc;
    }, {} as Record<string, any>);

    return Object.entries(userStats).map(([username, data]) => ({
      username,
      totalLogins: data.totalLogins,
      successfulLogins: data.successfulLogins,
      successRate: data.totalLogins > 0 ? (data.successfulLogins / data.totalLogins * 100).toFixed(1) : 0,
      twoFaUsed: data.twoFaUsed,
      twoFaRate: data.totalLogins > 0 ? (data.twoFaUsed / data.totalLogins * 100).toFixed(1) : 0,
      lastLogin: data.lastLogin,
      uniqueIPs: data.ipAddresses.size
    })).sort((a, b) => b.totalLogins - a.totalLogins);
  };

  const generateSecurityReport = () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentLogs = logs.filter(log => new Date(log.created_at) >= oneDayAgo);
    const weeklyLogs = logs.filter(log => new Date(log.created_at) >= oneWeekAgo);

    // Análise de IPs suspeitos
    const ipStats = recentLogs.reduce((acc, log) => {
      if (!acc[log.ip_address]) {
        acc[log.ip_address] = {
          totalAttempts: 0,
          failedAttempts: 0,
          uniqueUsers: new Set(),
          lastSeen: log.created_at
        };
      }
      acc[log.ip_address].totalAttempts++;
      if (!log.success) {
        acc[log.ip_address].failedAttempts++;
      }
      acc[log.ip_address].uniqueUsers.add(log.username);
      if (new Date(log.created_at) > new Date(acc[log.ip_address].lastSeen)) {
        acc[log.ip_address].lastSeen = log.created_at;
      }
      return acc;
    }, {} as Record<string, any>);

    const suspiciousIPs = Object.entries(ipStats)
      .filter(([_, data]) => data.failedAttempts >= 3 || data.uniqueUsers.size >= 3)
      .map(([ip, data]) => ({
        ip,
        totalAttempts: data.totalAttempts,
        failedAttempts: data.failedAttempts,
        failureRate: (data.failedAttempts / data.totalAttempts * 100).toFixed(1),
        uniqueUsers: data.uniqueUsers.size,
        lastSeen: data.lastSeen
      }))
      .sort((a, b) => b.failedAttempts - a.failedAttempts);

    return {
      suspiciousIPs,
      totalRecentLogs: recentLogs.length,
      totalWeeklyLogs: weeklyLogs.length,
      recentFailures: recentLogs.filter(log => !log.success).length,
      weeklyFailures: weeklyLogs.filter(log => !log.success).length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <DocumentTextIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erro ao carregar dados</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const summaryReport = generateSummaryReport();
  const detailedReport = generateDetailedReport();
  const securityReport = generateSecurityReport();

  return (
    <PermissionGuard resource="relatorios-logs" action="EXECUTE">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <DocumentTextIcon className="h-6 w-6 mr-2" />
              Relatórios de Logs
            </h1>
            <p className="text-gray-600">Geração e exportação de relatórios detalhados</p>
          </div>
        </div>

        {/* Filtros Avançados */}
        <AdvancedFilters 
          onFiltersChange={handleFiltersChange}
          initialFilters={filters}
        />

        {/* Seleção de Relatório */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Tipo de Relatório</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedReport('summary')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  selectedReport === 'summary'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center">
                  <ChartBarIcon className="h-6 w-6" />
                  <div className="ml-3">
                    <div className="font-medium">Resumo Executivo</div>
                    <div className="text-sm text-gray-500">Métricas gerais e KPIs</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedReport('detailed')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  selectedReport === 'detailed'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center">
                  <DocumentTextIcon className="h-6 w-6" />
                  <div className="ml-3">
                    <div className="font-medium">Detalhado por Usuário</div>
                    <div className="text-sm text-gray-500">Análise individual de usuários</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedReport('security')}
                className={`p-4 border rounded-lg text-left transition-colors ${
                  selectedReport === 'security'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center">
                  <CalendarIcon className="h-6 w-6" />
                  <div className="ml-3">
                    <div className="font-medium">Relatório de Segurança</div>
                    <div className="text-sm text-gray-500">Análise de ameaças e riscos</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo do Relatório */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedReport === 'summary' && 'Resumo Executivo'}
                {selectedReport === 'detailed' && 'Relatório Detalhado por Usuário'}
                {selectedReport === 'security' && 'Relatório de Segurança'}
              </h3>
              <div className="text-sm text-gray-500">
                {logs.length} registros • {summaryReport.period}
              </div>
            </div>
          </div>
          <div className="p-4">
            {selectedReport === 'summary' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">{summaryReport.activeUsers}</div>
                    <div className="text-sm text-blue-700">Usuários Ativos</div>
                    <div className="text-xs text-blue-600">de {summaryReport.totalUsers} cadastrados</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-900">{summaryReport.successRate}%</div>
                    <div className="text-sm text-green-700">Taxa de Sucesso</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-900">{summaryReport.twoFaRate}%</div>
                    <div className="text-sm text-purple-700">Uso de 2FA</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-900">{summaryReport.failureRate}%</div>
                    <div className="text-sm text-red-700">Taxa de Falha</div>
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'detailed' && (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Logins</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taxa Sucesso</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">2FA Usado</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IPs Únicos</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Login</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {detailedReport.map((user, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {user.username}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.totalLogins}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              parseFloat(String(user.successRate)) >= 90 
                                ? 'bg-green-100 text-green-800'
                                : parseFloat(String(user.successRate)) >= 70
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.successRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.twoFaUsed} ({user.twoFaRate}%)
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.uniqueIPs}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.lastLogin).toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedReport === 'security' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-900">{securityReport.totalRecentLogs}</div>
                    <div className="text-sm text-blue-700">Logs (24h)</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-900">{securityReport.recentFailures}</div>
                    <div className="text-sm text-red-700">Falhas (24h)</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-900">{securityReport.suspiciousIPs.length}</div>
                    <div className="text-sm text-orange-700">IPs Suspeitos</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-900">{securityReport.totalWeeklyLogs}</div>
                    <div className="text-sm text-purple-700">Logs (7 dias)</div>
                  </div>
                </div>

                {securityReport.suspiciousIPs.length > 0 && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">IPs Suspeitos</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tentativas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Falhas</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taxa Falha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuários</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última Atividade</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {securityReport.suspiciousIPs.map((ip, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {ip.ip}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {ip.totalAttempts}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {ip.failedAttempts}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  parseFloat(ip.failureRate) >= 50 
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {ip.failureRate}%
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {ip.uniqueUsers}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(ip.lastSeen).toLocaleString('pt-BR')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Exportação */}
        <ExportReports logs={logs} stats={stats} />
      </div>
    </PermissionGuard>
  );
}
