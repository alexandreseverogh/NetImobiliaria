'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  TrashIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { usePermissions } from '@/hooks/usePermissions';

interface LogsTabsWrapperProps {
  children: React.ReactNode;
}

const tabs = [
  {
    id: 'login-logs',
    name: 'Logs de Login',
    icon: DocumentTextIcon,
    href: '/admin/logs',
    resource: 'monitoramento-auditoria-login-logout-2fa'
  },
  {
    id: 'audit-logs',
    name: 'Auditoria do Sistema',
    icon: ShieldCheckIcon,
    href: '/admin/audit',
    resource: 'auditoria-logs-sistema'
  },
  {
    id: 'analytics',
    name: 'Análise de Logs',
    icon: ChartBarIcon,
    href: '/admin/logs/analytics',
    resource: 'analise-logs'
  },
  {
    id: 'reports',
    name: 'Relatórios de Logs',
    icon: DocumentTextIcon,
    href: '/admin/logs/reports',
    resource: 'relatorios-logs'
  },
  {
    id: 'config',
    name: 'Configurações de Logs',
    icon: CogIcon,
    href: '/admin/logs/config',
    resource: 'configuracoes-logs'
  },
  {
    id: 'purge',
    name: 'Expurgo de Logs',
    icon: TrashIcon,
    href: '/admin/expurgo',
    resource: 'expurgo-historico-login-logout'
  }
];

function getActiveTab(pathname: string): string {
  if (pathname === '/admin/logs') {
    return 'login-logs';
  }
  if (pathname === '/admin/audit') {
    return 'audit-logs';
  }
  if (pathname.includes('/analytics')) {
    return 'analytics';
  }
  if (pathname.includes('/reports')) {
    return 'reports';
  }
  if (pathname.includes('/config')) {
    return 'config';
  }
  if (pathname.includes('/purge') || pathname === '/admin/expurgo') {
    return 'purge';
  }
  return 'login-logs';
}

export default function LogsTabsWrapper({ children }: LogsTabsWrapperProps) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('login-logs');
  const { hasPermission } = usePermissions();

  useEffect(() => {
    setActiveTab(getActiveTab(pathname));
  }, [pathname]);

  // Filtrar abas baseadas em permissões e provisões (Soberania do Master + Cargo do Usuário)
  const allowedTabs = tabs.filter(tab => hasPermission(tab.resource, 'EXECUTE'));

  return (
    <div className="space-y-6">
      {/* Tabs Navigation - Mantém sempre visível */}
      <div className="bg-white rounded-lg shadow border-b border-gray-200 sticky top-0 z-10">
        <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
          {allowedTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon
                  className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Conteúdo da página */}
      {children}
    </div>
  );
}
