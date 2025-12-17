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

interface LogsTabsWrapperProps {
  children: React.ReactNode;
}

const tabs = [
  {
    id: 'login-logs',
    name: 'Logs de Login',
    icon: DocumentTextIcon,
    href: '/admin/login-logs'
  },
  {
    id: 'audit-logs',
    name: 'Auditoria de Logins',
    icon: ShieldCheckIcon,
    href: '/admin/audit'
  },
  {
    id: 'analytics',
    name: 'Análise de Logs',
    icon: ChartBarIcon,
    href: '/admin/login-logs/analytics'
  },
  {
    id: 'reports',
    name: 'Relatórios de Logs',
    icon: DocumentTextIcon,
    href: '/admin/login-logs/reports'
  },
  {
    id: 'config',
    name: 'Configurações de Logs',
    icon: CogIcon,
    href: '/admin/login-logs/config'
  },
  {
    id: 'purge',
    name: 'Expurgo de Logs',
    icon: TrashIcon,
    href: '/admin/login-logs/purge'
  }
];

function getActiveTab(pathname: string): string {
  if (pathname === '/admin/login-logs') {
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
  if (pathname.includes('/purge')) {
    return 'purge';
  }
  return 'login-logs';
}

export default function LogsTabsWrapper({ children }: LogsTabsWrapperProps) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('login-logs');

  useEffect(() => {
    setActiveTab(getActiveTab(pathname));
  }, [pathname]);

  return (
    <div className="space-y-6">
      {/* Tabs Navigation - Mantém sempre visível */}
      <div className="bg-white rounded-lg shadow border-b border-gray-200 sticky top-0 z-10">
        <nav className="flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
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
