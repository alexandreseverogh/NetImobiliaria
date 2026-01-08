/* eslint-disable */
'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import LoadingSpinner from '@/components/admin/LoadingSpinner'
import ErrorBoundary from '@/components/admin/ErrorBoundary'
import { usePathname } from 'next/navigation'

export default function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Memoizar callbacks para evitar re-renders desnecessÃ¡rios
  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  // Memoizar se Ã© pÃ¡gina de login
  const isLoginPage = useMemo(() => pathname === '/admin/login', [pathname])

  // Memoizar classes CSS
  const containerClasses = useMemo(() => 
    'min-h-screen bg-gray-100',
    []
  )

  const gridClasses = useMemo(() => 
    'grid grid-cols-1 lg:grid-cols-[256px_1fr]',
    []
  )

  // Tratamento de erro para falhas de autenticaÃ§Ã£o
  const handleAuthError = useCallback((error: Error) => {
    console.error('Erro de autenticaÃ§Ã£o:', error)
    // Aqui poderia implementar logging para auditoria
  }, [])

  // Se estiver carregando, mostrar loading
  if (loading) {
    return <LoadingSpinner message="Carregando..." />
  }

  // Se estiver na pÃ¡gina de login, mostrar apenas o conteÃºdo (sem header/sidebar)
  if (isLoginPage) {
    return (
      <ErrorBoundary onError={handleAuthError}>
        {children}
      </ErrorBoundary>
    )
  }

  // Se nÃ£o hÃ¡ usuÃ¡rio e nÃ£o estÃ¡ na pÃ¡gina de login, mostrar loading
  if (!user) {
    return <LoadingSpinner message="Verificando autenticaÃ§Ã£o..." />
  }

  // UsuÃ¡rio autenticado - mostrar layout completo
  return (
    <ErrorBoundary onError={handleAuthError}>
      <div className={containerClasses}>
        {/* Header fixo no topo */}
        <AdminHeader 
          user={user} 
          onLogout={logout}
          onMenuClick={handleMenuClick}
        />
        
        {/* Container principal com grid - SEM espaÃ§amento em branco */}
        <div className={gridClasses}>
          {/* Sidebar - comeÃ§a IMEDIATAMENTE apÃ³s header */}
          <AdminSidebar 
            open={sidebarOpen} 
            setOpen={handleSidebarClose} 
            user={user} 
            onLogout={logout}
          />
          
          {/* ConteÃºdo principal - comeÃ§a IMEDIATAMENTE apÃ³s sidebar */}
          <main className="w-full min-w-0" role="main" aria-label="ConteÃºdo principal">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}

