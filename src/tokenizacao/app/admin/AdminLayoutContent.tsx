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

  // Memoizar callbacks para evitar re-renders desnecessários
  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  // Memoizar se é página de login
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

  // Tratamento de erro para falhas de autenticação
  const handleAuthError = useCallback((error: Error) => {
    console.error('Erro de autenticação:', error)
    // Aqui poderia implementar logging para auditoria
  }, [])

  // Se estiver carregando, mostrar loading
  if (loading) {
    return <LoadingSpinner message="Carregando..." />
  }

  // Se estiver na página de login, mostrar apenas o conteúdo (sem header/sidebar)
  if (isLoginPage) {
    return (
      <ErrorBoundary onError={handleAuthError}>
        {children}
      </ErrorBoundary>
    )
  }

  // Se não há usuário e não está na página de login, mostrar loading
  if (!user) {
    return <LoadingSpinner message="Verificando autenticação..." />
  }

  // Usuário autenticado - mostrar layout completo
  return (
    <ErrorBoundary onError={handleAuthError}>
      <div className={containerClasses}>
        {/* Header fixo no topo */}
        <AdminHeader 
          user={user} 
          onLogout={logout}
          onMenuClick={handleMenuClick}
        />
        
        {/* Container principal com grid - SEM espaçamento em branco */}
        <div className={gridClasses}>
          {/* Sidebar - começa IMEDIATAMENTE após header */}
          <AdminSidebar 
            open={sidebarOpen} 
            setOpen={handleSidebarClose} 
            user={user} 
            onLogout={logout}
          />
          
          {/* Conteúdo principal - começa IMEDIATAMENTE após sidebar */}
          <main className="w-full min-w-0" role="main" aria-label="Conteúdo principal">
            {children}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
