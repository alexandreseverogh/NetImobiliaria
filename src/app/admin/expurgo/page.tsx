'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '@/hooks/useApi';
import {
  TrashIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { ExecuteGuard } from '@/components/admin/PermissionGuard';

interface PurgeStats {
  total_logs: number;
  oldest_log_date: string;
  newest_log_date: string;
  logs_older_than_90_days: number;
  logs_older_than_30_days: number;
  logs_older_than_7_days: number;
}

interface PurgePreview {
  retention_days: number;
  cutoff_date: string;
  would_be_deleted: number;
  oldest_to_delete: string;
  newest_to_delete: string;
}

export default function LogPurgePage() {
  const { get, post } = useApi();
  const [stats, setStats] = useState<PurgeStats | null>(null);
  const [preview, setPreview] = useState<PurgePreview | null>(null);
  const [retentionDays, setRetentionDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [purging, setPurging] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [previewDeletedCount, setPreviewDeletedCount] = useState<number>(0);
  const isFetchingStatsRef = useRef(false);

  const fetchStats = useCallback(async (force = false) => {
    try {
      if (isFetchingStatsRef.current && !force) return;
      
      isFetchingStatsRef.current = true;
      setLoading(true);
      
      const params = new URLSearchParams({
        page: '1',
        limit: '10000',
      });

      const response = await get(`/api/admin/logs?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        const logs = data.logs || [];
        const logsStats = data.stats || {};
        
        let oldestDate = new Date();
        let newestDate = new Date();
        
        if (logs.length > 0) {
          const dates = logs.map((log: any) => new Date(log.created_at)).filter((date: Date) => !isNaN(date.getTime()));
          
          if (dates.length > 0) {
            const minTime = Math.min(...dates.map((d: Date) => d.getTime()));
            const maxTime = Math.max(...dates.map((d: Date) => d.getTime()));
            
            oldestDate = new Date(minTime);
            newestDate = new Date(maxTime);
          }
        }
        
        const now = new Date();
        const logs90Days = logs.filter((log: any) => {
          const logDate = new Date(log.created_at);
          const diffTime = now.getTime() - logDate.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          return diffDays > 90;
        }).length;
        
        const logs30Days = logs.filter((log: any) => {
          const logDate = new Date(log.created_at);
          const diffTime = now.getTime() - logDate.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          return diffDays > 30;
        }).length;
        
        const logs7Days = logs.filter((log: any) => {
          const logDate = new Date(log.created_at);
          const diffTime = now.getTime() - logDate.getTime();
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          return diffDays > 7;
        }).length;
        
        const convertedStats = {
          total_logs: logsStats.total_logs || logs.length,
          oldest_log_date: oldestDate.toISOString(),
          newest_log_date: newestDate.toISOString(),
          logs_older_than_90_days: logs90Days,
          logs_older_than_30_days: logs30Days,
          logs_older_than_7_days: logs7Days
        };
        
        setStats(convertedStats);
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        
        const logsToDelete = logs.filter((log: any) => {
          const logDate = new Date(log.created_at);
          return logDate < cutoffDate;
        });
        
        const preview = {
          retention_days: retentionDays,
          cutoff_date: cutoffDate.toISOString(),
          would_be_deleted: logsToDelete.length,
          oldest_to_delete: logsToDelete.length > 0 ? logsToDelete[0].created_at : null,
          newest_to_delete: logsToDelete.length > 0 ? logsToDelete[logsToDelete.length - 1].created_at : null
        };
        
        setPreview(preview);
        setPreviewDeletedCount(logsToDelete.length);
      } else {
        setMessage({ type: 'error', text: `Erro ao carregar estatísticas: ${response.statusText || 'Erro desconhecido'}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Erro ao carregar estatísticas: ${error instanceof Error ? error.message : 'Erro desconhecido'}` });
    } finally {
      setLoading(false);
      isFetchingStatsRef.current = false;
    }
  }, [get, retentionDays]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStats();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [fetchStats, retentionDays]);

  const executePurge = async () => {
    if (!confirmPurge) {
      setMessage({ type: 'error', text: 'Confirme a operação antes de executar' });
      return;
    }

    try {
      setPurging(true);
      setMessage(null);
      
      const response = await post('/api/admin/expurgo', {
        retentionDays,
        confirmPurge: true
      });

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Expurgo executado com sucesso! ${previewDeletedCount} logs removidos.` 
        });
        setConfirmPurge(false);
        await fetchStats();
      } else {
        setMessage({ 
          type: 'error', 
          text: `Erro ao executar expurgo: ${response.statusText || 'Erro desconhecido'}` 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Erro ao executar expurgo: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      });
    } finally {
      setPurging(false);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((nowOnly.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffTime = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      if (diffHours === 0) return diffMinutes <= 1 ? 'Agora' : `${diffMinutes} min atrás`;
      return `${diffHours}h atrás`;
    } else if (diffDays === 1) return '1 dia atrás';
    return `${diffDays} dias atrás`;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expurgo de Logs Antigos</h1>
          <p className="text-gray-600">Gerenciar retenção e limpeza de logs de login</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {message.type === 'success' && <CheckCircleIcon className="h-5 w-5" />}
              {message.type === 'error' && <ExclamationTriangleIcon className="h-5 w-5" />}
              {message.type === 'info' && <ChartBarIcon className="h-5 w-5" />}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          </div>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Logs</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total_logs.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Log Mais Antigo</p>
                <p className="text-sm text-gray-900">{formatRelativeTime(stats.oldest_log_date)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Log Mais Recente</p>
                <p className="text-sm text-gray-900">{formatRelativeTime(stats.newest_log_date)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Configuração de Retenção</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="retentionDays" className="block text-sm font-medium text-gray-700 mb-2">
              Dias de Retenção
            </label>
            <input
              id="retentionDays"
              type="number"
              min="1"
              max="365"
              value={retentionDays}
              onChange={(e) => setRetentionDays(parseInt(e.target.value) || 90)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loading || purging}
            />
          </div>
          <button
            onClick={() => fetchStats(true)}
            disabled={loading || purging}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Carregando...' : 'Atualizar Prévia'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Prévia do Expurgo</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Logs a serem Removidos</p>
                <p className="text-2xl font-bold text-red-600">{preview.would_be_deleted.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Data de Corte</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(preview.cutoff_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            {preview.would_be_deleted > 0 && (
              <div className="border-t pt-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={confirmPurge}
                      onChange={(e) => setConfirmPurge(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Confirmo que desejo remover {preview.would_be_deleted.toLocaleString()} logs</span>
                  </label>
                </div>
                <ExecuteGuard resource="expurgo-historico-login-logout">
                  <button
                    onClick={executePurge}
                    disabled={!confirmPurge || purging}
                    className="mt-4 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span>{purging ? 'Executando...' : 'Executar Expurgo'}</span>
                  </button>
                </ExecuteGuard>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
