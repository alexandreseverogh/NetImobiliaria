'use client'

import React, { useState, useEffect, useMemo, useCallback, ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import LoadingSpinner from '@/components/admin/LoadingSpinner'
import ErrorBoundary from '@/components/admin/ErrorBoundary'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSidebarMenu } from '@/hooks/useSidebarMenu'

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
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
