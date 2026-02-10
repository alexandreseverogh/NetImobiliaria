'use client'

import React, { useState, useEffect, useMemo, useCallback, ReactNode } from 'react'
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
  children: ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isLoginPage = pathname === '/admin/login'
  // Harden: tolerate trailing slashes / nested (Next can vary) and ensure public broker signup doesn't get redirected
  const publicBrokerByWindow =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('public_broker') === 'true'

  const isPublicBrokerSignup =
    (pathname === '/admin/usuarios' || pathname?.startsWith('/admin/usuarios/')) &&
    (searchParams?.get('public_broker') === 'true' || publicBrokerByWindow)

  // Verificar se deve ocultar sidebar via query param
  const hideSidebar = searchParams?.get('noSidebar') === 'true' || searchParams?.get('from_corretor') === 'true'

  // Tratamento de erro para falhas de autenticação
  const handleAuthError = useCallback((error: Error) => {
    console.error('Erro de autenticação:', error)
    // Aqui poderia implementar logging para auditoria
  }, [])

  // IMPORTANTE: para páginas públicas dentro de /admin (ex.: cadastro público de corretor),
  // NUNCA executar hooks/guards de sessão do admin (eles redirecionam para /admin/login).
  if (isLoginPage || isPublicBrokerSignup) {
    return (
      <ErrorBoundary onError={handleAuthError}>
        {children}
      </ErrorBoundary>
    )
  }

  return (
    <AdminLayoutPrivateContent hideSidebar={hideSidebar} onError={handleAuthError}>
      {children}
    </AdminLayoutPrivateContent>
  )
}

function AdminLayoutPrivateContent({
  children,
  hideSidebar,
  onError,
}: {
  children: ReactNode
  hideSidebar: boolean
  onError: (error: Error) => void
}) {
  const { user, loading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  // Sistema de aviso de sessão (somente admin privado)
  const { showWarning, timeRemaining, renewSession, logout: sessionLogout, dismissWarning } = useSessionWarning({
    warningMinutes: 5,
    onSessionExpired: () => {
      logout()
      router.push('/admin/login')
    },
    onWarningShown: () => {
      console.log('Aviso de sessão expirando mostrado')
    }
  })

  // ✅ Redirecionar para login em useEffect (não durante render)
  useEffect(() => {
    if (!loading && !user) {
      // Verificar se há token no localStorage
      const adminToken = typeof window !== 'undefined' ? localStorage.getItem('admin-auth-token') : null
      const adminUserData = typeof window !== 'undefined' ? localStorage.getItem('admin-user-data') : null

      // Verificar também token público (para proprietários)
      const publicToken = typeof window !== 'undefined' ? localStorage.getItem('public-auth-token') : null
      const publicUserData = typeof window !== 'undefined' ? localStorage.getItem('public-user-data') : null

      // Se não há usuário admin mas há usuário público (proprietário), permitir acesso
      if (!adminToken && !adminUserData && publicToken && publicUserData) {
        try {
          const userData = JSON.parse(publicUserData)
          // Permitir apenas proprietários acessarem
          if (userData.userType === 'proprietario') {
            console.log('✅ Proprietário detectado, permitindo acesso ao admin')
            return // Não redirecionar para login
          }
        } catch (e) {
          console.error('Erro ao parsear dados do usuário público:', e)
        }
      }

      if (!adminToken && !adminUserData && !publicToken) {
        // Se não há usuário nem token, redirecionar para login
        window.location.href = '/admin/login'
      }
    }
  }, [loading, user])

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const containerClasses = useMemo(() => 'min-h-screen bg-gray-100', [])
  const gridClasses = useMemo(() => 'grid grid-cols-1 lg:grid-cols-[256px_1fr]', [])

  // Se estiver carregando, mostrar loading
  if (loading) {
    return <LoadingSpinner message="Carregando..." />
  }

  // Se não há usuário e não está na página de login, mostrar loading enquanto redireciona
  if (!user) {
    // Verificar se há token no localStorage (para desenvolvimento)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin-auth-token')
      const userData = localStorage.getItem('admin-user-data')
      const publicToken = localStorage.getItem('public-auth-token')
      const publicUserData = localStorage.getItem('public-user-data')

      if (token && userData) {
        // Se há token e dados do usuário, usar eles
        const parsedUser = JSON.parse(userData)

        return (
          <ErrorBoundary onError={onError}>
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

      // Se há token público de proprietário, renderizar layout
      if (publicToken && publicUserData) {
        try {
          const parsedPublicUser = JSON.parse(publicUserData)

          if (parsedPublicUser.userType === 'proprietario') {
            console.log('✅ Renderizando layout para proprietário')

            return (
              <ErrorBoundary onError={onError}>
                <div className={containerClasses}>
                  <AdminHeader
                    user={{
                      id: parsedPublicUser.uuid,
                      nome: parsedPublicUser.nome,
                      email: parsedPublicUser.email,
                      username: parsedPublicUser.email,
                      role_name: 'Proprietário',
                      permissoes: {},
                      status: 'ATIVO'
                    }}
                    onLogout={() => {
                      localStorage.removeItem('public-auth-token')
                      localStorage.removeItem('public-user-data')
                      window.location.href = '/landpaging'
                    }}
                    onMenuClick={handleMenuClick}
                  />
                  {/* Proprietários não têm sidebar - apenas conteúdo principal */}
                  <main className="w-full min-w-0 p-6" role="main" aria-label="Conteúdo principal">
                    {children}
                  </main>
                </div>
              </ErrorBoundary>
            )
          }
        } catch (e) {
          console.error('Erro ao parsear dados do usuário público:', e)
        }
      }
    }

    // Mostrar loading enquanto redireciona (o redirect acontece no useEffect acima)
    return <LoadingSpinner message="Redirecionando para login..." />
  }

  // Usuário autenticado - mostrar layout completo
  return (
    <ErrorBoundary onError={onError}>
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
