'use client'

import React, { useState, useEffect, useMemo, useCallback, ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import LoadingSpinner from '@/components/admin/LoadingSpinner'
import ErrorBoundary from '@/components/admin/ErrorBoundary'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSidebarMenu } from '@/hooks/useSidebarMenu'
import { ClockIcon } from '@heroicons/react/24/outline'

interface CrmGateStatus {
  ready: boolean
  segmentName: string | null
}

export default function CRMLayoutContent({
  children,
}: {
  children: ReactNode
}) {
  const { user, loading: authLoading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Logout específico do CRM — redireciona para /login (e não /admin/login)
  const handleCrmLogout = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin-auth-token')
      if (token) {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => {})
      }
    } finally {
      // Limpar todos os tokens de sessão
      ;[
        'admin-auth-token', 'admin-user-data', 'admin-last-auth-user',
        'public-auth-token', 'public-user-data', 'public-last-auth-user',
        'auth-token', 'user-data'
      ].forEach(k => localStorage.removeItem(k))
      window.location.href = '/admin/login'
    }
  }, [])

  // 🎨 Governança Dinâmica de Menu e Tema para CRM
  const { menuItems, theme, loading: menuLoading, error: menuError } = useSidebarMenu('crm')
  const isDark = theme.mode === 'dark'

  // Gate: o CRM só opera com qualificação por IA configurada pelo segmento do tenant
  // (system_segments.crm_ia_ativa, ver docs/CHECKPOINT.md). Master sempre bypassa (o
  // próprio endpoint já resolve isso). /crm/config/ia fica sempre acessível — é a tela
  // onde o tenant acompanha o status e cadastra suas próprias regras enquanto aguarda.
  const [crmStatus, setCrmStatus] = useState<CrmGateStatus | null>(null)
  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch('/api/crm/segment-status')
      .then(r => r.json())
      .then(data => { if (!cancelled) setCrmStatus({ ready: !!data.ready, segmentName: data.segmentName ?? null }) })
      .catch(() => { if (!cancelled) setCrmStatus({ ready: true, segmentName: null } as CrmGateStatus) })
    return () => { cancelled = true }
  }, [user])

  const isConfigIaRoute = pathname?.startsWith('/crm/config/ia')
  const crmBlocked = !!crmStatus && !crmStatus.ready && !isConfigIaRoute

  // Aplica a classe 'dark' no <html> para que o useTheme funcione em todas as páginas filhas
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  // Redirecionar para login se não estiver autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      const token = localStorage.getItem('admin-auth-token')
      const userData = localStorage.getItem('admin-user-data')
      
      if (!token || !userData) {
        window.location.href = `/admin/login?callbackUrl=${encodeURIComponent(pathname)}`
      }
    }
  }, [authLoading, user])

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const containerClasses = useMemo(() => `min-h-screen ${isDark ? 'bg-[#020617] text-white' : 'bg-gray-100 text-gray-900'}`, [isDark])
  const gridClasses = useMemo(() => `grid grid-cols-1 lg:grid-cols-[320px_1fr] ${isDark ? 'bg-[#020617]' : 'bg-gray-100'}`, [isDark])

  if (authLoading || !user) {
    return <LoadingSpinner message="Carregando CRM..." />
  }

  return (
    <ErrorBoundary onError={(error) => console.error('Erro no CRM Layout:', error)}>
      <div className={containerClasses}>
        <AdminHeader
          user={user}
          onLogout={handleCrmLogout}
          onMenuClick={handleMenuClick}
          title="NET CRM"
          systemId="crm"
          theme={theme}
        />

        <div className={gridClasses}>
          <AdminSidebar
            open={sidebarOpen}
            setOpen={handleSidebarClose}
            user={user}
            onLogout={handleCrmLogout}
            systemId="crm"
            theme={theme}
            menuItems={menuItems}
            loading={menuLoading}
            error={menuError}
          />

          <main className="w-full min-w-0 px-8" role="main" aria-label="Conteúdo principal">
            {crmBlocked ? (
              <div className={`flex flex-col items-center justify-center text-center py-24 px-8 rounded-3xl border-2 border-dashed ${isDark ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-300 bg-amber-50'}`}>
                <ClockIcon className="h-12 w-12 text-amber-500 mb-4" />
                <h2 className={`text-xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  CRM aguardando configuração de IA
                </h2>
                <p className={`mt-3 max-w-md text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {crmStatus?.segmentName
                    ? `O segmento "${crmStatus.segmentName}" ainda não teve a qualificação por IA configurada pela equipe da plataforma.`
                    : 'Este tenant ainda não tem um segmento de negócio com IA configurada.'}
                  {' '}Leads continuam sendo capturados normalmente nesse meio tempo — só a gestão interna do CRM fica em espera.
                </p>
                <a href="/crm/config/ia" className="mt-6 px-6 py-3 bg-amber-500 text-white text-xs font-black uppercase rounded-2xl hover:bg-amber-400 transition-all">
                  Ver status da configuração
                </a>
              </div>
            ) : children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
