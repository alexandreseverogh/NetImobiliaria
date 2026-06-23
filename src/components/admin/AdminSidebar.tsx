'use client'

import { useState, useEffect } from 'react'
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
  systemId?: string
  theme?: { mode: 'light' | 'dark'; primaryColor: string; secondaryColor?: string; tenantName?: string }
  menuItems?: SidebarMenuWithChildren[]
  loading?: boolean
  error?: string | null
}

export default function AdminSidebar({ 
  open, 
  setOpen, 
  user, 
  onLogout, 
  systemId = 'admin', 
  theme,
  menuItems: propMenuItems,
  loading: propLoading,
  error: propError
}: AdminSidebarProps) {
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  
  // Usar dados do hook interno, mas permitir sobrescrita via props
  const hookData = useSidebarMenu(systemId)
  const menuItems = propMenuItems || hookData.menuItems
  const loading = propLoading !== undefined ? propLoading : hookData.loading
  const error = propError !== undefined ? propError : hookData.error
  const activeTheme = theme || hookData.theme

  const isDark = activeTheme.mode === 'dark'
  const sidebarBg = isDark ? 'bg-[#020617] border-r border-white/5' : 'bg-white border-r border-gray-200'

  // Auto-expandir a categoria que contém a rota ativa
  useEffect(() => {
    if (!menuItems?.length) return
    const activeParents: string[] = []
    const findActive = (items: any[]) => {
      for (const item of items) {
        if (item.children?.length) {
          const childActive = item.children.some(
            (c: any) => c.path && pathname.startsWith(c.path)
          )
          if (childActive) activeParents.push(String(item.id))
          findActive(item.children)
        }
      }
    }
    findActive(menuItems)
    if (activeParents.length) {
      setExpandedMenus(prev => {
        const next = [...prev]
        activeParents.forEach(id => { if (!next.includes(id)) next.push(id) })
        return next
      })
    }
  }, [menuItems, pathname])

  // Verificação de segurança para evitar erros
  if (!user || !user.nome) {
    return (
      <div className="hidden lg:flex lg:w-80 lg:flex-col lg:flex-shrink-0">
        <div className={`flex flex-col flex-grow ${sidebarBg} pt-8 pb-4 overflow-y-auto`}>
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

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    )
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      if (typeof window !== 'undefined') {
        const keysToRemove = [
          'auth-token',
          'user-data',
          'public-auth-token',
          'public-user-data',
          'admin-auth-token',
          'admin-user-data',
          'admin-last-auth-user'
        ]
        keysToRemove.forEach(k => localStorage.removeItem(k))
        window.dispatchEvent(new Event('admin-auth-changed'))
      }
      await onLogout()
    } catch (error) {
      console.error('Erro no logout:', error)
      window.location.href = '/admin/login'
    } finally {
      setIsLoggingOut(false)
    }
  }

  const renderMenuItem = (item: SidebarMenuWithChildren, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedMenus.includes(item.id)
    const isActiveItem = item.path ? isActive(item.path) : false

    if (!item.path) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleMenu(item.id)}
            className={`group flex items-center w-full px-2 py-2.5 text-sm font-black rounded-xl transition-all text-left ${isExpanded ? (isDark ? 'bg-white/5' : 'bg-gray-50') : ''} ${
              isDark ? 'text-gray-300/80 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            style={{ 
              paddingLeft: `${12 + level * 16}px`,
            }}
          >
            <div 
              className={`mr-3 p-1.5 rounded-lg transition-all duration-300`}
              style={{ color: isExpanded ? activeTheme.primaryColor : undefined }}
            >
              <DynamicIcon
                iconName={item.icon ?? ''}
                className={`h-5 w-5 flex-shrink-0 transition-colors ${isExpanded ? '' : 'text-gray-400 group-hover:text-gray-500'}`}
              />
            </div>
            <span className="flex-1 uppercase text-sm mt-0.5 font-black italic leading-tight">
              {item.name}
            </span>
            {hasChildren && (isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 mt-1" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 mt-1" />
            ))}
          </button>
          {isExpanded && hasChildren && (
            <div className="space-y-1 mt-1">
              {item.children!.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div key={item.id}>
        <div className="relative group">
          <Link
            href={item.path}
            onClick={(e) => {
              if (hasChildren && !item.path) {
                e.preventDefault();
                toggleMenu(item.id);
              }
            }}
            className={`group flex items-center px-2 py-2.5 text-sm font-black rounded-xl transition-all duration-300 uppercase italic ${
              isActiveItem
                ? 'text-white shadow-lg scale-[1.02]'
                : isDark ? 'text-gray-400 hover:bg-white/5 hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            style={{ 
              backgroundColor: isActiveItem ? activeTheme.primaryColor : undefined,
              paddingLeft: `${12 + level * 16}px`,
              boxShadow: isActiveItem ? `0 10px 15px -3px ${activeTheme.primaryColor}40` : undefined
            }}
          >
            <div 
              className={`mr-3 p-1.5 rounded-lg transition-all duration-300 ${isActiveItem ? 'bg-white/20' : ''}`}
              style={{ color: isActiveItem ? '#FFF' : activeTheme.primaryColor }}
            >
              <DynamicIcon
                iconName={item.icon ?? ''}
                className="h-5 w-5 flex-shrink-0"
              />
            </div>
            <span className="leading-tight flex-1">{item.name}</span>
            {!!item.badge_count && item.badge_count > 0 && (
              <span className="ml-2 flex-shrink-0 min-w-[1.25rem] h-5 px-1 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-black leading-none">
                {item.badge_count > 99 ? '99+' : item.badge_count}
              </span>
            )}
          </Link>

          {hasChildren && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMenu(item.id);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
            >
              {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" /> }
            </button>
          )}
        </div>

        {isExpanded && hasChildren && (
          <div className="space-y-1 mt-1">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="hidden lg:flex lg:w-80 lg:flex-col lg:flex-shrink-0">
        <div className={`flex flex-col flex-grow ${sidebarBg} pt-8 pb-4 overflow-y-auto`}>
          <div className="flex-1 px-2 py-4">
            <p className="text-sm text-gray-500">Carregando menu...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Sidebar */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600/75 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className={`fixed inset-y-0 left-0 flex w-72 flex-col ${sidebarBg} shadow-2xl transition-transform`}>
            <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100">
              <span className="text-xs font-black uppercase tracking-widest text-gray-400">Menu de Navegação</span>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-6 px-4">
               <div className="mb-8 px-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Unidade Logada</p>
                  <h3 className="text-lg font-black uppercase italic tracking-tighter text-gray-900 leading-none">
                    {activeTheme.tenantName}
                  </h3>
               </div>
               <nav className="space-y-1">
                 {menuItems.map(item => renderMenuItem(item))}
               </nav>
            </div>
            <div className="p-4 border-t border-gray-100">
              <button onClick={onLogout} className="w-full py-3 px-4 flex items-center text-red-600 font-black uppercase italic text-xs tracking-widest hover:bg-red-50 rounded-xl transition-all">
                <XMarkIcon className="h-4 w-4 mr-2" /> Sair do Sistema
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex lg:w-80 lg:flex-col lg:flex-shrink-0 h-screen sticky top-0 ${sidebarBg} overflow-hidden shadow-sm`}>
        <div className="px-6 py-10 flex items-center group cursor-pointer border-b border-gray-50">
          <div 
            className="flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center text-white font-black italic text-2xl shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
            style={{ 
              backgroundColor: activeTheme.primaryColor,
              boxShadow: `0 8px 20px -4px ${activeTheme.primaryColor}66`
            }}
          >
            {activeTheme.tenantName?.charAt(0).toUpperCase() || 'N'}
          </div>
          <div className="ml-4 overflow-hidden">
             <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-0.5">Unidade Logada</p>
             <h2 className="text-sm font-black uppercase italic tracking-tighter text-gray-900 truncate leading-tight group-hover:text-blue-600 transition-colors">
               {activeTheme.tenantName || 'Net Imobiliária'}
             </h2>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-8 space-y-6 custom-scrollbar">
          {menuItems.map(item => renderMenuItem(item))}
        </nav>

        <div className="p-6 border-t border-gray-50">
           <button 
             onClick={onLogout}
             className="w-full flex items-center justify-center px-4 py-4 rounded-2xl bg-gray-50 text-red-600 text-[10px] font-black uppercase tracking-[0.2em] italic hover:bg-red-50 hover:text-red-700 transition-all border border-transparent hover:border-red-100"
           >
             Encerrar Sessão
           </button>
        </div>
      </aside>
    </>
  )
}