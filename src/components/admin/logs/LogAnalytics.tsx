'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChartBarIcon, ClockIcon, UserGroupIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface LogAnalyticsProps {
  logs: any[];
  stats: any;
}

interface TimeSeriesData {
  hour: string;
  logins: number;
  logouts: number;
  failures: number;
  twoFaUsed: number;
}

interface UserActivity {
  username: string;
  totalLogins: number;
  lastLogin: string;
  twoFaUsage: number;
  failureRate: number;
}

export default function LogAnalytics({ logs, stats }: LogAnalyticsProps) {
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const generateTimeSeriesData = useCallback(() => {
    const now = new Date();
    const last24Hours = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      return {
        hour: hour.getHours().toString().padStart(2, '0') + ':00',
        logins: 0,
        logouts: 0,
        failures: 0,
        twoFaUsed: 0
      };
    });

    logs.forEach(log => {
      const logTime = new Date(log.created_at);
      const hourIndex = 23 - Math.floor((now.getTime() - logTime.getTime()) / (60 * 60 * 1000));
      
      if (hourIndex >= 0 && hourIndex < 24) {
        const hourData = last24Hours[hourIndex];
        
        if (log.action === 'login' && log.success) {
          hourData.logins++;
        } else if (log.action === 'logout') {
          hourData.logouts++;
        } else if (!log.success) {
          hourData.failures++;
        }
        
        if (log.two_fa_used) {
          hourData.twoFaUsed++;
        }
      }
    });

    setTimeSeriesData(last24Hours);
  }, [logs]);

  const generateUserActivity = useCallback(() => {
    const userStats = logs.reduce((acc, log) => {
      if (!acc[log.username]) {
        acc[log.username] = {
          totalLogins: 0,
          successfulLogins: 0,
          twoFaUsed: 0,
          lastLogin: log.created_at
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

      return acc;
    }, {} as Record<string, any>);

    const userActivityEntries = Object.entries(userStats) as Array<[
      string,
      {
        totalLogins: number
        successfulLogins: number
        twoFaUsed: number
        lastLogin: string
      }
    ]>;

    const userActivityData = userActivityEntries.map(([username, data]) => ({
      username,
      totalLogins: data.totalLogins,
      lastLogin: data.lastLogin,
      twoFaUsage: data.twoFaUsed,
      failureRate: data.totalLogins > 0 ? ((data.totalLogins - data.successfulLogins) / data.totalLogins) * 100 : 0
    })).sort((a, b) => b.totalLogins - a.totalLogins);

    setUserActivity(userActivityData);
  }, [logs]);

  const generateAnalytics = useCallback(() => {
    generateTimeSeriesData();
    generateUserActivity();
  }, [generateTimeSeriesData, generateUserActivity]);

  useEffect(() => {
    generateAnalytics();
  }, [generateAnalytics]);

  const getTopUsers = () => userActivity.slice(0, 5);
  const getRecentActivity = () => logs.slice(0, 10);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Análise de Atividade
          </h3>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {isOpen ? 'Ocultar' : 'Mostrar'} Análise
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 space-y-6">
          {/* Resumo de 24h */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">Últimas 24h</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {timeSeriesData.reduce((sum, hour) => sum + hour.logins, 0)}
                  </p>
                  <p className="text-xs text-blue-600">logins</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <ShieldCheckIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">2FA Usado</p>
                  <p className="text-2xl font-bold text-green-900">
                    {timeSeriesData.reduce((sum, hour) => sum + hour.twoFaUsed, 0)}
                  </p>
                  <p className="text-xs text-green-600">vezes</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">Falhas</p>
                  <p className="text-2xl font-bold text-red-900">
                    {timeSeriesData.reduce((sum, hour) => sum + hour.failures, 0)}
                  </p>
                  <p className="text-xs text-red-600">tentativas</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center">
                <UserGroupIcon className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-800">Usuários Ativos</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {userActivity.length}
                  </p>
                  <p className="text-xs text-purple-600">únicos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de atividade por hora */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Atividade por Hora (Últimas 24h)</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                {(() => {
                  const maxLogins = Math.max(...timeSeriesData.map(h => h.logins), 0);
                  const maxTwoFa = Math.max(...timeSeriesData.map(h => h.twoFaUsed), 0);
                  const maxFailures = Math.max(...timeSeriesData.map(h => h.failures), 0);

                  return timeSeriesData.map((hour, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-16 text-sm text-gray-600">{hour.hour}</div>
                    <div className="flex-1 flex space-x-1">
                      <div 
                        className="bg-blue-500 h-4 rounded"
                        style={{
                          width: hour.logins > 0 && maxLogins > 0
                            ? `${Math.max(6, (hour.logins / maxLogins) * 100)}%`
                            : '0%'
                        }}
                        title={`${hour.logins} logins`}
                      />
                      <div 
                        className="bg-green-500 h-4 rounded"
                        style={{
                          width: hour.twoFaUsed > 0 && maxTwoFa > 0
                            ? `${Math.max(6, (hour.twoFaUsed / maxTwoFa) * 100)}%`
                            : '0%'
                        }}
                        title={`${hour.twoFaUsed} 2FA`}
                      />
                      <div 
                        className="bg-red-500 h-4 rounded"
                        style={{
                          width: hour.failures > 0 && maxFailures > 0
                            ? `${Math.max(6, (hour.failures / maxFailures) * 100)}%`
                            : '0%'
                        }}
                        title={`${hour.failures} falhas`}
                      />
                    </div>
                    <div className="w-20 text-xs text-gray-500 text-right">
                      {hour.logins + hour.twoFaUsed + hour.failures} total
                    </div>
                  </div>
                  ));
                })()}
              </div>
              <div className="flex items-center justify-center mt-4 space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                  <span className="text-xs text-gray-600">Logins</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
                  <span className="text-xs text-gray-600">2FA</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
                  <span className="text-xs text-gray-600">Falhas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top usuários */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Usuários Mais Ativos</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-3">
                {getTopUsers().map((user, index) => (
                  <div key={user.username} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{user.username}</p>
                        <p className="text-xs text-gray-500">
                          Último login: {new Date(user.lastLogin).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{user.totalLogins} logins</p>
                      <p className="text-xs text-gray-500">
                        {user.twoFaUsage} 2FA • {user.failureRate.toFixed(1)}% falhas
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Atividade recente */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">Atividade Recente</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                {getRecentActivity().map((log, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${
                        log.success ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium">{log.username}</span>
                      <span className="text-gray-500 ml-2">{log.action}</span>
                      {log.two_fa_used && (
                        <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                          2FA
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




