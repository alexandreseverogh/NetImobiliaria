'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import PermissionGuard from '@/components/admin/PermissionGuard';
import {
  CogIcon,
  ShieldCheckIcon,
  ClockIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface RetentionConfig {
  defaultRetentionDays: number;
  criticalLogsRetentionDays: number;
  autoPurgeEnabled: boolean;
  autoPurgeSchedule: string;
  archiveEnabled: boolean;
  alertThresholds: {
    failureRate: number;
    suspiciousActivity: number;
    multipleIPs: number;
  };
}

export default function LogConfigPage() {
  const { get, post } = useApi();
  const [config, setConfig] = useState<RetentionConfig>({
    defaultRetentionDays: 90,
    criticalLogsRetentionDays: 365,
    autoPurgeEnabled: true,
    autoPurgeSchedule: 'daily',
    archiveEnabled: true,
    alertThresholds: {
      failureRate: 10,
      suspiciousActivity: 5,
      multipleIPs: 3
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      // Em uma implementação real, buscar configurações do banco de dados
      // Por enquanto, usar configurações padrão
      setConfig({
        defaultRetentionDays: 90,
        criticalLogsRetentionDays: 365,
        autoPurgeEnabled: true,
        autoPurgeSchedule: 'daily',
        archiveEnabled: true,
        alertThresholds: {
          failureRate: 10,
          suspiciousActivity: 5,
          multipleIPs: 3
        }
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      // Em uma implementação real, salvar no banco de dados
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
    } finally {
      setSaving(false);
    }
  };

  const testPurge = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await post('/api/admin/login-logs/purge', {
        retentionDays: 1, // Teste com 1 dia
        confirmPurge: true,
        testMode: true
      });
      
      if (response.ok) {
        setMessage({ type: 'info', text: 'Teste de expurgo executado com sucesso!' });
      } else {
        setMessage({ type: 'error', text: 'Erro ao executar teste de expurgo' });
      }
    } catch (error) {
      console.error('Erro no teste de expurgo:', error);
      setMessage({ type: 'error', text: 'Erro ao executar teste de expurgo' });
    } finally {
      setSaving(false);
    }
  };

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleThresholdChange = (key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      alertThresholds: {
        ...prev.alertThresholds,
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <PermissionGuard resource="configuracoes-logs" action="EXECUTE">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <CogIcon className="h-6 w-6 mr-2" />
              Configurações de Logs
            </h1>
            <p className="text-gray-600">Gerenciar retenção, expurgo e alertas de segurança</p>
          </div>
        </div>

        {/* Mensagens */}
        {message && (
          <div className={`rounded-lg p-4 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex">
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  message.type === 'success' ? 'text-green-800' :
                  message.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Configurações de Retenção */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              Configurações de Retenção
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retenção Padrão (dias)
                </label>
                <input
                  type="number"
                  value={config.defaultRetentionDays}
                  onChange={(e) => handleConfigChange('defaultRetentionDays', parseInt(e.target.value))}
                  min="1"
                  max="3650"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Logs normais serão mantidos por este período
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retenção de Logs Críticos (dias)
                </label>
                <input
                  type="number"
                  value={config.criticalLogsRetentionDays}
                  onChange={(e) => handleConfigChange('criticalLogsRetentionDays', parseInt(e.target.value))}
                  min="1"
                  max="3650"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Logs de falhas e atividades suspeitas
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="archiveEnabled"
                checked={config.archiveEnabled}
                onChange={(e) => handleConfigChange('archiveEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="archiveEnabled" className="ml-2 block text-sm text-gray-900">
                Arquivar logs antes do expurgo
              </label>
            </div>
          </div>
        </div>

        {/* Configurações de Expurgo Automático */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <TrashIcon className="h-5 w-5 mr-2" />
              Expurgo Automático
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoPurgeEnabled"
                checked={config.autoPurgeEnabled}
                onChange={(e) => handleConfigChange('autoPurgeEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="autoPurgeEnabled" className="ml-2 block text-sm text-gray-900">
                Habilitar expurgo automático
              </label>
            </div>

            {config.autoPurgeEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequência do Expurgo
                </label>
                <select
                  value={config.autoPurgeSchedule}
                  onChange={(e) => handleConfigChange('autoPurgeSchedule', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Aviso Importante</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    O expurgo automático remove permanentemente os logs antigos. 
                    Certifique-se de que o arquivamento está habilitado para manter um backup.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={testPurge}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? 'Testando...' : 'Testar Expurgo'}
              </button>
            </div>
          </div>
        </div>

        {/* Configurações de Alertas */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ShieldCheckIcon className="h-5 w-5 mr-2" />
              Alertas de Segurança
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Taxa de Falha (%) - Alerta
                </label>
                <input
                  type="number"
                  value={config.alertThresholds.failureRate}
                  onChange={(e) => handleThresholdChange('failureRate', parseInt(e.target.value))}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alerta quando taxa de falha exceder este valor
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Atividade Suspeita - Alerta
                </label>
                <input
                  type="number"
                  value={config.alertThresholds.suspiciousActivity}
                  onChange={(e) => handleThresholdChange('suspiciousActivity', parseInt(e.target.value))}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alerta após N tentativas falhadas do mesmo IP
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Múltiplos IPs - Alerta
                </label>
                <input
                  type="number"
                  value={config.alertThresholds.multipleIPs}
                  onChange={(e) => handleThresholdChange('multipleIPs', parseInt(e.target.value))}
                  min="1"
                  max="20"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Alerta quando usuário usar N IPs diferentes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={loadConfig}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </PermissionGuard>
  );
}
