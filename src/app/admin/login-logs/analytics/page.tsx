'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import PermissionGuard from '@/components/admin/PermissionGuard';
import LogAnalytics from '@/components/admin/logs/LogAnalytics';
import SecurityAlerts from '@/components/admin/logs/SecurityAlerts';
import AdvancedFilters from '@/components/admin/logs/AdvancedFilters';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon
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
  unique_users_in_logs?: number;
  total_users_registered?: number;
}

export default function LogAnalyticsPage() {
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

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      // Buscar todos os logs para análise (sem paginação)
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
        console.log('🔍 DEBUG ANALYTICS - Dados recebidos da API:', data.stats);
        setLogs(data.logs || []);
        setStats(prev => data.stats || prev);
        setError(null);
      } else {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Erro ao buscar logs:', err);
      setError('Erro ao carregar logs para análise');
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
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erro ao carregar dados</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard resource="analise-logs" action="EXECUTE">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <ChartBarIcon className="h-6 w-6 mr-2" />
              Análise de Logs de Login/Logout
            </h1>
            <p className="text-gray-600">Dashboard avançado para análise de segurança e atividade</p>
          </div>
        </div>

        {/* Filtros Avançados */}
        <AdvancedFilters 
          onFiltersChange={handleFiltersChange}
          initialFilters={filters}
        />

        {/* Alertas de Segurança */}
        <SecurityAlerts logs={logs} />

        {/* Análise de Atividade */}
        <LogAnalytics logs={logs} stats={stats} />

        {/* Resumo Executivo */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Resumo Executivo</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <UserGroupIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">Usuários Ativos</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {stats.unique_users_in_logs || 0}
                    </p>
                    <p className="text-xs text-blue-600">
                      de {stats.total_users_registered || 0} cadastrados
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <ClockIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">Taxa de Sucesso</p>
                    <p className="text-2xl font-bold text-green-900">
                      {stats.total_logs > 0 
                        ? ((stats.total_logs - stats.total_failures) / stats.total_logs * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-800">Uso de 2FA</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {stats.total_logs > 0 
                        ? (stats.total_2fa_used / stats.total_logs * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-800">Taxa de Falha</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {stats.total_logs > 0 
                        ? (stats.total_failures / stats.total_logs * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Insights e Recomendações */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Insights e Recomendações</h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {stats.total_failures > stats.total_logs * 0.1 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800">Alta Taxa de Falhas</h4>
                      <p className="text-sm text-red-700 mt-1">
                        A taxa de falhas está acima de 10%. Considere revisar as políticas de senha e implementar medidas de segurança adicionais.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {stats.total_2fa_used < stats.total_logins * 0.5 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">Baixo Uso de 2FA</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Menos de 50% dos logins usam 2FA. Considere tornar o 2FA obrigatório para usuários administrativos.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {new Set(logs.map(log => log.ip_address)).size > 10 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <ClockIcon className="h-5 w-5 text-blue-400" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800">Alta Diversidade de IPs</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Usuários estão acessando de muitos IPs diferentes. Monitore atividades suspeitas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {stats.total_logs > 0 && stats.total_failures < stats.total_logs * 0.05 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <ChartBarIcon className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-green-800">Sistema Seguro</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Excelente! A taxa de falhas está abaixo de 5% e o sistema está funcionando de forma segura.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
