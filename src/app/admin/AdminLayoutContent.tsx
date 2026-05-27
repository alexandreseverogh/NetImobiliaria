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
import { useSidebarMenu } from '@/hooks/useSidebarMenu'

export default function AdminLayoutContent({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isLoginPage = pathname === '/admin/login'
  const isResetPage = pathname === '/admin/reset-password'
  
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

  // IMPORTANTE: para páginas públicas dentro de /admin (ex.: login, forgot, reset, cadastro público),
  // NUNCA executar hooks/guards de sessão do admin (eles redirecionam para /admin/login).
  if (isLoginPage || isResetPage || isPublicBrokerSignup) {
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
  const { user, loading: authLoading, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  // 🎨 Governança Dinâmica de Menu e Tema
  const { menuItems, theme, loading: menuLoading, error: menuError, reloadMenu } = useSidebarMenu('admin')
  const isDark = theme.mode === 'dark'

  // ✅ Sincronização de Tema com o DOM (Prever vazamento de classes dark/light)
  useEffect(() => {
    if (typeof window !== 'undefined') {
       if (isDark) {
         document.documentElement.classList.add('dark')
       } else {
         document.documentElement.classList.remove('dark')
       }

       // 🎨 Injeção de Variáveis CSS Dinâmicas (Governança de Branding)
       const root = document.documentElement;
       root.style.setProperty('--primary-color', theme.primaryColor || '#2563eb');
       root.style.setProperty('--secondary-color', theme.secondaryColor || '#64748b');
       
       console.log('🎨 [Layout] Branding sincronizado:', {
         primary: theme.primaryColor,
         secondary: theme.secondaryColor,
         tenant: theme.tenantName
       });
    }
  }, [isDark, theme])

  // ✅ RE-SINCRONIZAÇÃO NA NAVEGAÇÃO: 
  // Garante que ao "voltar" ou trocar de tenant, o menu e tema sejam re-checados
  const pathname = usePathname()
  useEffect(() => {
    reloadMenu()
  }, [pathname, reloadMenu])

  // Sistema de aviso de sessão (somente admin privado)
  const { showWarning, timeRemaining, renewSession, logout: sessionLogout, dismissWarning } = useSessionWarning({
    warningMinutes: 30,
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
    if (!authLoading && !user) {
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
  }, [authLoading, user])

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const containerClasses = useMemo(() => `min-h-screen ${isDark ? 'bg-[#020617] text-white' : 'bg-gray-100 text-gray-900'}`, [isDark])
  const gridClasses = useMemo(() => `grid grid-cols-1 lg:grid-cols-[320px_1fr] ${isDark ? 'bg-[#020617]' : 'bg-gray-100'}`, [isDark])

  // Se estiver carregando auth, mostrar loading
  if (authLoading) {
    return <LoadingSpinner message="Carregando..." />
  }

  // Se não há usuário e não está na página de login, mostrar loading enquanto redireciona
  if (!user) {
    // Tolerância Zero: Se não há usuário confirmado pelo useAuth, redirecionamos.
    // Não usamos atalhos de localStorage para evitar renderizar layouts com sessões inválidas.
    return <LoadingSpinner message="Verificando autenticação..." />
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
          theme={theme}
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
              theme={theme}
              menuItems={menuItems}
              loading={menuLoading}
              error={menuError}
            />
          )}

          {/* Conteúdo principal - ocupa toda largura se sidebar oculta */}
          <main className={`w-full min-w-0 px-8 ${hideSidebar ? '' : ''}`} role="main" aria-label="Conteúdo principal">
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
