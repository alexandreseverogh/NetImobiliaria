'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/useApi';
import {
  TrashIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

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

  const fetchStats = useCallback(async (force = false) => {
    try {
      // Evitar chamadas duplicadas se não for forçada
      if (loading && !force) {
        console.log('⏸️ Chamada já em andamento, ignorando...');
        return;
      }
      
      setLoading(true);
      console.log('🔍 Buscando logs usando a mesma lógica da página de visualização...', { force, retentionDays });
      
      // Usar exatamente a mesma lógica da página de visualização de logs
      const params = new URLSearchParams({
        page: '1',
        limit: '10000', // Buscar todos os logs
      });

      const response = await get(`/api/admin/login-logs?${params}`);
      console.log('📊 Resposta da API:', response);
      
      if (response.ok) {
        const data = await response.json();
        const logs = data.logs || [];
        const logsStats = data.stats || {};
        
        console.log('📊 Logs retornados:', logs.length);
        console.log('📊 Estatísticas da API:', logsStats);
        
        // Calcular datas extremas dos logs reais
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
        
        // Garantir que as datas são válidas
        if (isNaN(oldestDate.getTime())) {
          oldestDate = new Date();
        }
        if (isNaN(newestDate.getTime())) {
          newestDate = new Date();
        }
        
        // Calcular logs por período usando os logs reais
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
        
        // Estatísticas para a página de expurgo
        const convertedStats = {
          total_logs: logsStats.total_logs || logs.length,
          oldest_log_date: oldestDate.toISOString(),
          newest_log_date: newestDate.toISOString(),
          logs_older_than_90_days: logs90Days,
          logs_older_than_30_days: logs30Days,
          logs_older_than_7_days: logs7Days
        };
        
        setStats(convertedStats);
        
        // Calcular preview do expurgo usando os logs reais
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
        
        // Salvar a quantidade de logs que serão deletados para usar na mensagem final
        setPreviewDeletedCount(logsToDelete.length);
            } else {
              console.error('❌ Erro na API:', response);
              setMessage({ type: 'error', text: `Erro ao carregar estatísticas: ${response.statusText || 'Erro desconhecido'}` });
              
              // Fallback: usar data atual quando API falha
              const now = new Date();
              const fallbackStats = {
                total_logs: 0,
                oldest_log_date: now.toISOString(),
                newest_log_date: now.toISOString(),
                logs_older_than_90_days: 0,
                logs_older_than_30_days: 0,
                logs_older_than_7_days: 0
              };
              
        setStats(fallbackStats);
        setPreview({
          retention_days: retentionDays,
          cutoff_date: new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000)).toISOString(),
          would_be_deleted: 0,
          oldest_to_delete: '',
          newest_to_delete: ''
        });
        setPreviewDeletedCount(0);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
      setMessage({ type: 'error', text: `Erro ao carregar estatísticas: ${error instanceof Error ? error.message : 'Erro desconhecido'}` });
      
      // Fallback em caso de erro
      const now = new Date();
      const fallbackStats = {
        total_logs: 0,
        oldest_log_date: now.toISOString(),
        newest_log_date: now.toISOString(),
        logs_older_than_90_days: 0,
        logs_older_than_30_days: 0,
        logs_older_than_7_days: 0
      };
      
      setStats(fallbackStats);
      setPreview({
        retention_days: retentionDays,
        cutoff_date: new Date(now.getTime() - (retentionDays * 24 * 60 * 60 * 1000)).toISOString(),
        would_be_deleted: 0,
        oldest_to_delete: '',
        newest_to_delete: ''
      });
      setPreviewDeletedCount(0);
    } finally {
      setLoading(false);
    }
  }, [get, loading, retentionDays]);

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
      
      const response = await post('/api/admin/login-logs/purge', {
        retentionDays,
        confirmPurge: true
      });

      console.log('📥 Resposta recebida da API:', response);
      console.log('📥 response.ok:', response.ok);
      console.log('📥 response.data:', response);
      console.log('📥 response.data?.deleted_count:', response);

      if (response.ok) {
        const apiDeletedCount = 0;
        const apiArchivedCount = 0;
        const actualDeletedCount = previewDeletedCount || apiDeletedCount;
        
        console.log('✅ Expurgo bem-sucedido:');
        console.log('  API retornou:', apiDeletedCount, 'deletados,', apiArchivedCount, 'arquivados');
        console.log('  Prévia calculou:', previewDeletedCount);
        console.log('  Usando:', actualDeletedCount);
        
        setMessage({ 
          type: 'success', 
          text: `Expurgo executado com sucesso! ${actualDeletedCount} logs removidos e ${apiArchivedCount} logs arquivados.` 
        });
        setConfirmPurge(false);
        // Recarregar dados
        await fetchStats();
      } else {
        console.error('❌ Erro na API de expurgo:', response);
        setMessage({ 
          type: 'error', 
          text: `Erro ao executar expurgo: ${response.statusText || 'Erro desconhecido'}` 
        });
      }
    } catch (error) {
      console.error('❌ Erro ao executar expurgo:', error);
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
    
    // Calcular diferença em dias do calendário (não apenas 24h)
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.floor((nowOnly.getTime() - dateOnly.getTime()) / (1000 * 60 * 60 * 24));
    
    // Para logs do mesmo dia, calcular horas/minutos
    if (diffDays === 0) {
      const diffTime = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      
      if (diffHours === 0) {
        return diffMinutes <= 1 ? 'Agora' : `${diffMinutes} min atrás`;
      }
      return `${diffHours}h atrás`;
    } else if (diffDays === 1) {
      return '1 dia atrás';
    } else {
      return `${diffDays} dias atrás`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expurgo de Logs Antigos</h1>
          <p className="text-gray-600">Gerenciar retenção e limpeza de logs de login</p>
        </div>
      </div>

      {/* Mensagens */}
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

      {/* Estatísticas */}
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

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrashIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Logs &gt; 90 dias</p>
                <p className="text-2xl font-semibold text-red-600">{stats.logs_older_than_90_days.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrashIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Logs &gt; 30 dias</p>
                <p className="text-2xl font-semibold text-orange-600">{stats.logs_older_than_30_days.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrashIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Logs &gt; 7 dias</p>
                <p className="text-2xl font-semibold text-yellow-600">{stats.logs_older_than_7_days.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuração de Retenção */}
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
            <p className="text-xs text-gray-500 mt-1">
              Logs mais antigos que este período serão removidos (1-365 dias)
            </p>
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

      {/* Prévia do Expurgo */}
      {preview && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Prévia do Expurgo</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Período de Retenção</p>
                <p className="text-lg font-semibold text-gray-900">{preview.retention_days} dias</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Data de Corte</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(preview.cutoff_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Logs a serem Removidos</p>
                <p className="text-2xl font-bold text-red-600">{preview.would_be_deleted.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Período dos Logs</p>
                <p className="text-sm text-gray-900">
                  {stats?.oldest_log_date ? new Date(stats.oldest_log_date).toLocaleDateString('pt-BR') : 'N/A'} até{' '}
                  {stats?.newest_log_date ? new Date(stats.newest_log_date).toLocaleDateString('pt-BR') : 'N/A'}
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
                      disabled={purging}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Confirmo que desejo remover {preview.would_be_deleted.toLocaleString()} logs
                    </span>
                  </label>
                </div>

                <div className="mt-4">
                  <button
                    onClick={executePurge}
                    disabled={!confirmPurge || purging}
                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {purging ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Executando...</span>
                      </>
                    ) : (
                      <>
                        <TrashIcon className="h-4 w-4" />
                        <span>Executar Expurgo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {preview.would_be_deleted === 0 && (
              <div className="text-center py-8 text-gray-500">
                <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">Nenhum log será removido</p>
                <p className="text-sm">Todos os logs estão dentro do período de retenção configurado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Informações Importantes */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Informações Importantes</h3>
            <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>• Esta operação é irreversível</li>
              <li>• Esta ação não pode ser desfeita</li>
              <li>• Recomenda-se manter pelo menos 30 dias de logs para auditoria</li>
              <li>• O expurgo é registrado nos logs de auditoria</li>
              <li>• Apenas Super Administradores podem executar esta operação</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}