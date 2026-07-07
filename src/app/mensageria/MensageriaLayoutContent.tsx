'use client'

import React, { useState, useEffect, useCallback, ReactNode, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import LoadingSpinner from '@/components/admin/LoadingSpinner'
import ErrorBoundary from '@/components/admin/ErrorBoundary'
import { useSidebarMenu, type SidebarMenuWithChildren } from '@/hooks/useSidebarMenu'
import { getAdminAuthHeaders } from '@/lib/auth/adminFetch'

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

  // Governança dinâmica de menu (mesmo padrão do CRM/Admin) — via system_features
  // (PLANO_MENSAGERIA.md seção 15). Administrador enxerga tudo que foi provisionado
  // ao tenant pelo caminho normal (banco).
  const { menuItems, theme, loading: menuLoading, error: menuError } = useSidebarMenu('mensageria')

  // Augmentação client-only (seção 17.4, Opção B confirmada) — líder de time
  // (mensageria.team_members.role='lead') não é um conceito que o sidebar genérico
  // da plataforma conhece, então "Painel do Gestor" é injetado aqui, só neste layout,
  // sem a função SQL global precisar saber que Mensageria existe. Administrador
  // (scope 'full') já vê o item pelo caminho normal — não injeta de novo.
  const [scopeLevel, setScopeLevel] = useState<'full' | 'team' | 'own' | null>(null)
  useEffect(() => {
    fetch('/api/admin/mensageria/my-scope', { headers: getAdminAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setScopeLevel(d.level ?? null))
      .catch(() => setScopeLevel(null))
  }, [])

  const augmentedMenuItems = useMemo<SidebarMenuWithChildren[]>(() => {
    // menuItems é tipado como SidebarMenuItem[] no hook, mas em runtime a resposta de
    // /api/admin/sidebar/menu já vem aninhada (categoria → children) — mesmo formato
    // que SidebarMenuWithChildren descreve. Cast local, não mexe no tipo do hook.
    const items = menuItems as unknown as SidebarMenuWithChildren[]
    if (scopeLevel !== 'team') return items
    const gestaoItem = { id: 'mensageria-gestao-lead', parent_id: null, name: 'Painel do Gestor', icon: 'ChartBarIcon', path: '/mensageria/gestao', order_index: 99, system_id: 'mensageria', is_active: true, roles_required: null, permission_required: null }
    return items.map((cat) => {
      if (cat.name !== 'Central de Mensagens') return cat
      const already = (cat.children || []).some((c) => c.path === '/mensageria/gestao')
      if (already) return cat
      return { ...cat, children: [...(cat.children || []), gestaoItem] }
    })
  }, [menuItems, scopeLevel])

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
            menuItems={augmentedMenuItems}
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
