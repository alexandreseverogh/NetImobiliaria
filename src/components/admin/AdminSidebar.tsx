'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminUser } from '@/lib/types/admin'
import PermissionGuard from './PermissionGuard'
import DynamicIcon from '@/components/common/DynamicIcon'
import { useSidebarMenu, type SidebarMenuWithChildren } from '@/hooks/useSidebarMenu'
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface AdminSidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
  user: AdminUser
  onLogout: () => Promise<void>
}

export default function AdminSidebar({ open, setOpen, user, onLogout }: AdminSidebarProps) {
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<number[]>([])

  // Carregar menu dinamicamente do banco
  const { menuItems, loading, error } = useSidebarMenu()

  // Verificação de segurança para evitar erros
  if (!user || !user.nome) {
    return (
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:flex-shrink-0">
        <div className="flex flex-col flex-grow bg-white pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-semibold text-gray-900">Net Imobiliária</h1>
          </div>
          <div className="flex-1 px-2 py-4">
            <p className="text-sm text-gray-500">Carregando usuário...</p>
          </div>
        </div>
      </div>
    )
  }

  const isActive = (href: string | null) => {
    if (!href) return false
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  const toggleMenu = (menuId: number) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    )
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await onLogout()
    } catch (error) {
      console.error('Erro no logout:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const renderMenuItem = (item: SidebarMenuWithChildren, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedMenus.includes(item.id)
    const isActiveItem = item.url ? isActive(item.url) : false

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleMenu(item.id)}
            className={`group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md ${
              isActiveItem
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            style={{ paddingLeft: `${8 + level * 16}px` }}
          >
            <DynamicIcon
              iconName={item.icon_name}
              className={`mr-3 h-5 w-5 flex-shrink-0 ${
                isActiveItem ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
              }`}
            />
            {item.name}
            {isExpanded ? (
              <ChevronDownIcon className="ml-auto h-4 w-4" />
            ) : (
              <ChevronRightIcon className="ml-auto h-4 w-4" />
            )}
          </button>
          
          {isExpanded && (
            <div className="ml-4 space-y-1">
              {item.children!.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    // Item sem filhos - link direto
    if (item.resource === null) {
      // Item sem resource (sempre visível)
      if (!item.url) {
        // Item sem URL - renderizar como span
        return (
          <span
            key={item.id}
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-400 cursor-default`}
          >
            <DynamicIcon
              iconName={item.icon_name}
              className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400"
            />
            {item.name}
          </span>
        )
      }
      
      return (
        <Link
          key={item.id}
          href={item.url}
          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
            isActiveItem
              ? 'bg-blue-100 text-blue-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          onClick={() => setOpen(false)}
        >
          <DynamicIcon
            iconName={item.icon_name}
            className={`mr-3 h-5 w-5 flex-shrink-0 ${
              isActiveItem ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
            }`}
          />
          {item.name}
        </Link>
      )
    }

    // Item protegido por permissão
    if (item.permission_required && item.permission_action) {
      if (!item.url) {
        // Item sem URL - renderizar como span dentro do guard
        return (
          <PermissionGuard key={item.id} resource={item.resource! as any} action={item.permission_action as any}>
            <span className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-400 cursor-default">
              <DynamicIcon
                iconName={item.icon_name}
                className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400"
              />
              {item.name}
            </span>
          </PermissionGuard>
        )
      }
      
      return (
        <PermissionGuard key={item.id} resource={item.resource! as any} action={item.permission_action as any}>
          <Link
            href={item.url}
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              isActiveItem
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            onClick={() => setOpen(false)}
          >
            <DynamicIcon
              iconName={item.icon_name}
              className={`mr-3 h-5 w-5 flex-shrink-0 ${
                isActiveItem ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
              }`}
            />
            {item.name}
          </Link>
        </PermissionGuard>
      )
    }

    // Item com resource mas sem permissão específica
    if (!item.url) {
      // Item sem URL - renderizar como span
      return (
        <span
          key={item.id}
          className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-400 cursor-default"
        >
          <DynamicIcon
            iconName={item.icon_name}
            className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400"
          />
          {item.name}
        </span>
      )
    }
    
    return (
      <Link
        key={item.id}
        href={item.url}
        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
          isActiveItem
            ? 'bg-blue-100 text-blue-900'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`}
        onClick={() => setOpen(false)}
      >
        <DynamicIcon
          iconName={item.icon_name}
          className={`mr-3 h-5 w-5 flex-shrink-0 ${
            isActiveItem ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
          }`}
        />
        {item.name}
      </Link>
    )
  }

  // Estado de loading
  if (loading) {
    return (
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:flex-shrink-0">
        <div className="flex flex-col flex-grow bg-white pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-semibold text-gray-900">Net Imobiliária</h1>
          </div>
          <div className="flex-1 px-2 py-4">
            <p className="text-sm text-gray-500">Carregando menu...</p>
          </div>
        </div>
      </div>
    )
  }

  // Estado de erro
  if (error) {
    console.error('Erro ao carregar menu:', error)
    return (
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:flex-shrink-0">
        <div className="flex flex-col flex-grow bg-white pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-semibold text-gray-900">Net Imobiliária</h1>
          </div>
          <div className="flex-1 px-2 py-4">
            <p className="text-sm text-red-600">Erro ao carregar menu</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          type="button"
          className="text-gray-500 hover:text-gray-600"
          onClick={() => setOpen(true)}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar for mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
            <div className="flex h-16 items-center justify-between px-4">
              <h1 className="text-lg font-semibold text-gray-900">Admin</h1>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-600"
                onClick={() => setOpen(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
              {menuItems.map((item, index) => (
                <div key={item.id}>
                  {renderMenuItem(item)}
                  {/* Separador leve entre grupos */}
                  {index < menuItems.length - 1 && (
                    <div className="my-2 border-t border-gray-100"></div>
                  )}
                </div>
              ))}
            </nav>
            {/* User info and logout at bottom */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4">
              <div className="flex items-center mb-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user.nome?.charAt(0) || user.username?.charAt(0) || 'A'}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user.nome || user.username}</p>
                  <p className="text-xs text-gray-500">Perfil: {user.role_name || 'N/A'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-2"></div>
                    Saindo...
                  </>
                ) : (
                  'Sair'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:flex-shrink-0">
        <div className="flex flex-col flex-grow bg-white pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-semibold text-gray-900">Net Imobiliária</h1>
          </div>
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {menuItems.map((item, index) => (
              <div key={item.id}>
                {renderMenuItem(item)}
                {/* Separador leve entre grupos */}
                {index < menuItems.length - 1 && (
                  <div className="my-2 border-t border-gray-100"></div>
                )}
              </div>
            ))}
          </nav>
          
          {/* User info and logout at bottom */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user.nome?.charAt(0) || user.username?.charAt(0) || 'A'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user.nome || user.username}</p>
                <p className="text-xs text-gray-500">Perfil: {user.role_name || 'N/A'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700 mr-2"></div>
                  Saindo...
                </>
              ) : (
                'Sair'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}