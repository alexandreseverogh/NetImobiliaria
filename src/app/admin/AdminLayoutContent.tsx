'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSessionWarning } from '@/hooks/useSessionWarning'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import LoadingSpinner from '@/components/admin/LoadingSpinner'
import ErrorBoundary from '@/components/admin/ErrorBoundary'
import SessionWarningModal from '@/components/SessionWarningModal'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isLoginPage = pathname === '/admin/login'
  
  // Verificar se deve ocultar sidebar via query param
  const hideSidebar = searchParams?.get('noSidebar') === 'true'

  // Sistema de aviso de sessão
  const {
    showWarning,
    timeRemaining,
    sessionData,
    renewSession,
    logout: sessionLogout,
    dismissWarning
  } = useSessionWarning({
    warningMinutes: 5, // Avisar 5 minutos antes
    onSessionExpired: () => {
      logout()
      router.push('/admin/login')
    },
    onWarningShown: () => {
      console.log('Aviso de sessão expirando mostrado')
    }
  })

  // Memoizar callbacks para evitar re-renders desnecessários
  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false)
  }, [])

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

  // Se não há usuário e não está na página de login, redirecionar para login
  if (!user) {
    // Verificar se há token no localStorage (para desenvolvimento)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth-token')
      const userData = localStorage.getItem('user-data')
      
      if (token && userData) {
        // Se há token e dados do usuário, usar eles
        const parsedUser = JSON.parse(userData)
        
        return (
          <ErrorBoundary onError={handleAuthError}>
            <div className={containerClasses}>
              <AdminHeader 
                user={parsedUser} 
                onLogout={logout}
                onMenuClick={handleMenuClick}
              />
              <div className={gridClasses}>
                <AdminSidebar 
                  open={sidebarOpen} 
                  setOpen={handleSidebarClose} 
                  user={parsedUser} 
                  onLogout={logout}
                />
                <main className="w-full min-w-0" role="main" aria-label="Conteúdo principal">
                  {children}
                </main>
              </div>
            </div>
          </ErrorBoundary>
        )
      }
    }
    
    // Se não há usuário nem token, redirecionar para login
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login'
    }
    
    return <LoadingSpinner message="Redirecionando para login..." />
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
        <div className={hideSidebar ? 'grid grid-cols-1' : gridClasses}>
          {/* Sidebar - oculta se noSidebar=true */}
          {!hideSidebar && (
            <AdminSidebar 
              open={sidebarOpen} 
              setOpen={handleSidebarClose} 
              user={user} 
              onLogout={logout}
            />
          )}
          
          {/* Conteúdo principal - ocupa toda largura se sidebar oculta */}
          <main className={`w-full min-w-0 ${hideSidebar ? '' : ''}`} role="main" aria-label="Conteúdo principal">
            {children}
          </main>
        </div>
      </div>

      {/* Modal de aviso de sessão expirando */}
      <SessionWarningModal
        isOpen={showWarning}
        timeRemaining={timeRemaining}
        onRenew={renewSession}
        onLogout={sessionLogout}
        onDismiss={dismissWarning}
        username={user?.nome}
      />
    </ErrorBoundary>
  )
}
