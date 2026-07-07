'use client'

import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import LoadingSpinner from '@/components/admin/LoadingSpinner'
import ErrorBoundary from '@/components/admin/ErrorBoundary'
import { useSidebarMenu } from '@/hooks/useSidebarMenu'

export default function MensageriaLayoutContent({
  children,
}: {
  children: ReactNode
}) {
  const { user, loading: authLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin-auth-token')
      if (token) {
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
    } finally {
      ;['admin-auth-token', 'admin-user-data', 'admin-last-auth-user'].forEach((k) => localStorage.removeItem(k))
      window.location.href = '/admin/login'
    }
  }, [])

  // Governança dinâmica de menu (mesmo padrão do CRM/Admin) — system_features
  // ainda não provisionadas para 'mensageria' (fase M6), então menuItems chega
  // vazio por ora; a página funciona normalmente via URL direta.
  const { menuItems, theme, loading: menuLoading, error: menuError } = useSidebarMenu('mensageria')

  // Design system do módulo é navy/âmbar (DESIGN.md) — sempre dark, independente do tenant.
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      const token = localStorage.getItem('admin-auth-token')
      if (!token) window.location.href = `/admin/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
    }
  }, [authLoading, user])

  const handleMenuClick = useCallback(() => setSidebarOpen(true), [])
  const handleSidebarClose = useCallback(() => setSidebarOpen(false), [])

  const containerClasses = useMemo(() => 'min-h-screen bg-[#020c1b] text-white', [])
  // AdminSidebar renderiza com lg:w-80 (320px, sticky) — a grade precisa reservar
  // exatamente essa largura, senão o sticky sidebar sobrepõe o conteúdo de <main>.
  const gridClasses = useMemo(() => 'grid grid-cols-1 lg:grid-cols-[320px_1fr] bg-[#020c1b]', [])

  if (authLoading || !user) {
    return <LoadingSpinner message="Carregando Mensageria..." />
  }

  return (
    <ErrorBoundary onError={(error) => console.error('Erro no Mensageria Layout:', error)}>
      <div className={containerClasses}>
        <AdminHeader
          user={user}
          onLogout={handleLogout}
          onMenuClick={handleMenuClick}
          title="Mensageria"
          systemId="mensageria"
          theme={{ ...theme, mode: 'dark' }}
        />

        <div className={gridClasses}>
          <AdminSidebar
            open={sidebarOpen}
            setOpen={handleSidebarClose}
            user={user}
            onLogout={handleLogout}
            systemId="mensageria"
            theme={{ ...theme, mode: 'dark' }}
            menuItems={menuItems}
            loading={menuLoading}
            error={menuError}
          />

          <main className="w-full min-w-0" role="main" aria-label="Conteúdo principal">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
