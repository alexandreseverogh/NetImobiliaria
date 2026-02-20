'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExclamationTriangleIcon, ShieldExclamationIcon, EyeIcon } from '@heroicons/react/24/outline';

interface SecurityAlert {
  id: string;
  type: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  count: number;
  lastOccurrence: string;
  resolved: boolean;
}

interface SecurityAlertsProps {
  logs: any[];
}

export default function SecurityAlerts({ logs }: SecurityAlertsProps) {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const generateAlerts = useCallback(() => {
    const newAlerts: SecurityAlert[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Analisar logs das últimas 24 horas
    const recentLogs = logs.filter(log => 
      new Date(log.created_at) >= oneDayAgo
    );

    // 1. Múltiplas falhas de login do mesmo IP
    const failedLoginsByIP = recentLogs
      .filter(log => log.action === 'login_failed' || (log.action === 'login' && !log.success))
      .reduce((acc, log) => {
        const ip = log.ip_address;
        if (!ip) {
          return acc;
        }
        if (!acc[ip]) acc[ip] = [];
        acc[ip].push(log);
        return acc;
      }, {} as Record<string, any[]>);

    (Object.entries(failedLoginsByIP) as Array<[string, any[]]>).forEach(([ip, failedLogs]) => {
      if (failedLogs.length >= 5) {
        newAlerts.push({
          id: `multiple-failures-${ip}`,
          type: failedLogs.length >= 10 ? 'high' : 'medium',
          title: 'Múltiplas falhas de login',
          description: `${failedLogs.length} tentativas falhadas do IP ${ip}`,
          count: failedLogs.length,
          lastOccurrence: failedLogs[failedLogs.length - 1].created_at,
          resolved: false
        });
      }
    });

    // 2. Múltiplas falhas de 2FA do mesmo usuário
    const failed2FAByUser = recentLogs
      .filter(log => log.action === '2fa_failed')
      .reduce((acc, log) => {
        const username = log.username;
        if (!username) {
          return acc;
        }
        if (!acc[username]) acc[username] = [];
        acc[username].push(log);
        return acc;
      }, {} as Record<string, any[]>);

    (Object.entries(failed2FAByUser) as Array<[string, any[]]>).forEach(([username, failedLogs]) => {
      if (failedLogs.length >= 3) {
        newAlerts.push({
          id: `multiple-2fa-failures-${username}`,
          type: 'high',
          title: 'Múltiplas falhas de 2FA',
          description: `${failedLogs.length} códigos 2FA incorretos para ${username}`,
          count: failedLogs.length,
          lastOccurrence: failedLogs[failedLogs.length - 1].created_at,
          resolved: false
        });
      }
    });

    // 3. Atividade suspeita (muitos logins em pouco tempo)
    const loginsByUser = recentLogs
      .filter(log => log.action === 'login' && log.success)
      .reduce((acc, log) => {
        const username = log.username;
        if (!username) {
          return acc;
        }
        if (!acc[username]) acc[username] = [];
        acc[username].push(log);
        return acc;
      }, {} as Record<string, any[]>);

    (Object.entries(loginsByUser) as Array<[string, any[]]>).forEach(([username, loginLogs]) => {
      if (loginLogs.length >= 10) {
        newAlerts.push({
          id: `suspicious-activity-${username}`,
          type: 'medium',
          title: 'Atividade suspeita',
          description: `${loginLogs.length} logins em 24h para ${username}`,
          count: loginLogs.length,
          lastOccurrence: loginLogs[loginLogs.length - 1].created_at,
          resolved: false
        });
      }
    });

    // 4. IPs diferentes para o mesmo usuário
    const userIPs = recentLogs
      .filter(log => log.action === 'login' && log.success)
      .reduce((acc, log) => {
        const username = log.username;
        const ip = log.ip_address;
        if (!username || !ip) {
          return acc;
        }
        if (!acc[username]) acc[username] = new Set<string>();
        acc[username].add(ip);
        return acc;
      }, {} as Record<string, Set<string>>);

    (Object.entries(userIPs) as Array<[string, Set<string>]>).forEach(([username, ips]) => {
      if (ips.size >= 3) {
        newAlerts.push({
          id: `multiple-ips-${username}`,
          type: 'low',
          title: 'Múltiplos IPs',
          description: `${ips.size} IPs diferentes para ${username}`,
          count: ips.size,
          lastOccurrence: recentLogs.find(log => log.username === username)?.created_at || '',
          resolved: false
        });
      }
    });

    setAlerts(newAlerts);
  }, [logs]);

  useEffect(() => {
    generateAlerts();
  }, [generateAlerts]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'high':
        return <ShieldExclamationIcon className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <EyeIcon className="h-5 w-5 text-blue-500" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const highPriorityAlerts = alerts.filter(alert => alert.type === 'high');
  const mediumPriorityAlerts = alerts.filter(alert => alert.type === 'medium');
  const lowPriorityAlerts = alerts.filter(alert => alert.type === 'low');

  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <ShieldExclamationIcon className="h-5 w-5 text-green-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Nenhum alerta de segurança
            </h3>
            <p className="text-sm text-green-700">
              Não foram detectadas atividades suspeitas nas últimas 24 horas.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Alertas de Segurança
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {alerts.length}
            </span>
          </h3>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {isOpen ? 'Ocultar' : 'Mostrar'} Detalhes
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-3">
          {/* High Priority Alerts */}
          {highPriorityAlerts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-800 mb-2">Alta Prioridade</h4>
              {highPriorityAlerts.map((alert) => (
                <div key={alert.id} className={`border rounded-lg p-3 ${getAlertColor(alert.type)}`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <h5 className="text-sm font-medium text-gray-900">{alert.title}</h5>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Última ocorrência: {new Date(alert.lastOccurrence).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {alert.count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Medium Priority Alerts */}
          {mediumPriorityAlerts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-2">Média Prioridade</h4>
              {mediumPriorityAlerts.map((alert) => (
                <div key={alert.id} className={`border rounded-lg p-3 ${getAlertColor(alert.type)}`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <h5 className="text-sm font-medium text-gray-900">{alert.title}</h5>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Última ocorrência: {new Date(alert.lastOccurrence).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        {alert.count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Low Priority Alerts */}
          {lowPriorityAlerts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-2">Baixa Prioridade</h4>
              {lowPriorityAlerts.map((alert) => (
                <div key={alert.id} className={`border rounded-lg p-3 ${getAlertColor(alert.type)}`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="ml-3 flex-1">
                      <h5 className="text-sm font-medium text-gray-900">{alert.title}</h5>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Última ocorrência: {new Date(alert.lastOccurrence).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {alert.count}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}




