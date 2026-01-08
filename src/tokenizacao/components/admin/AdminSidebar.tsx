/* eslint-disable */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminUser } from '@/lib/types/admin'
import PermissionGuard from './PermissionGuard'
import {
  HomeIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  Bars3Icon,
  XMarkIcon,
  TagIcon,
  Squares2X2Icon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  HomeModernIcon
} from '@heroicons/react/24/outline'

interface AdminSidebarProps {
  open: boolean
  setOpen: (open: boolean) => void
  user: AdminUser
  onLogout: () => Promise<void>
}

interface MenuItem {
  name: string
  href?: string
  icon: any
  resource?: string | null
  roles: string[]
  children?: MenuItem[]
}

export default function AdminSidebar({ open, setOpen, user, onLogout }: AdminSidebarProps) {
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  // VerificaÃ§Ã£o de seguranÃ§a para evitar erros
  if (!user || !user.nome) {
    return (
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:flex-shrink-0">
        <div className="flex flex-col flex-grow bg-white pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-semibold text-gray-900">Net ImobiliÃ¡ria</h1>
          </div>
          <div className="flex-1 px-2 py-4">
            <p className="text-sm text-gray-500">Carregando usuÃ¡rio...</p>
          </div>
        </div>
      </div>
    )
  }

  // Estrutura de menu com submenus
  const getMenuStructure = (): MenuItem[] => {
    return [
      {
        name: 'Dashboard',
        href: '/admin',
        icon: HomeIcon,
        resource: null,
        roles: ['Super Admin', 'Administrador', 'Corretor', 'UsuÃ¡rio']
      },
      {
        name: 'Amenidades',
        icon: TagIcon,
        resource: 'amenidades',
        roles: ['Super Admin', 'Administrador'],
        children: [
          {
            name: 'Categorias',
            href: '/admin/categorias-amenidades',
            icon: Squares2X2Icon,
            resource: 'categorias-amenidades',
            roles: ['Super Admin', 'Administrador']
          },
          {
            name: 'Amenidades',
            href: '/admin/amenidades',
            icon: TagIcon,
            resource: 'amenidades',
            roles: ['Super Admin', 'Administrador']
          }
        ]
      },
      {
        name: 'Proximidades',
        icon: MapPinIcon,
        resource: 'proximidades',
        roles: ['Super Admin', 'Administrador'],
        children: [
          {
            name: 'Categorias',
            href: '/admin/categorias-proximidades',
            icon: Squares2X2Icon,
            resource: 'categorias-proximidades',
            roles: ['Super Admin', 'Administrador']
          },
          {
            name: 'Proximidades',
            href: '/admin/proximidades',
            icon: MapPinIcon,
            resource: 'proximidades',
            roles: ['Super Admin', 'Administrador']
          }
        ]
      },
      {
        name: 'Documentos',
        icon: DocumentTextIcon,
        resource: 'tipos-documentos',
        roles: ['Super Admin', 'Administrador'],
        children: [
          {
            name: 'Tipos de Documentos',
            href: '/admin/tipos-documentos',
            icon: DocumentTextIcon,
            resource: 'tipos-documentos',
            roles: ['Super Admin', 'Administrador']
          }
        ]
      },
      {
        name: 'ImÃ³veis',
        icon: BuildingOfficeIcon,
        resource: 'imoveis',
        roles: ['Super Admin', 'Administrador', 'Corretor'],
        children: [
          {
            name: 'Tipos',
            href: '/admin/tipos-imoveis',
            icon: CogIcon,
            resource: 'tipos-imoveis',
            roles: ['Super Admin', 'Administrador']
          },
          {
            name: 'Finalidades',
            href: '/admin/finalidades',
            icon: CogIcon,
            resource: 'finalidades',
            roles: ['Super Admin', 'Administrador']
          },
          {
            name: 'Status',
            href: '/admin/status-imovel',
            icon: CheckCircleIcon,
            resource: 'status-imovel',
            roles: ['Super Admin', 'Administrador']
          },
          {
            name: 'MudanÃ§a de Status',
            href: '/admin/mudancas-status',
            icon: ClipboardDocumentListIcon,
            resource: 'status-imovel',
            roles: ['Super Admin', 'Administrador']
          },
          {
            name: 'Cadastro',
            href: '/admin/imoveis',
            icon: BuildingOfficeIcon,
            resource: 'imoveis',
            roles: ['Super Admin', 'Administrador', 'Corretor']
          }
        ]
      },
      {
        name: 'Clientes',
        icon: UsersIcon,
        resource: 'clientes',
        roles: ['Super Admin', 'Administrador'],
        children: [
          {
            name: 'Cadastro',
            href: '/admin/clientes',
            icon: UsersIcon,
            resource: 'clientes',
            roles: ['Super Admin', 'Administrador']
          }
        ]
      },
      {
        name: 'ProprietÃ¡rios',
        icon: UserGroupIcon,
        resource: 'proprietarios',
        roles: ['Super Admin', 'Administrador'],
        children: [
          {
            name: 'Cadastro',
            href: '/admin/proprietarios',
            icon: UserGroupIcon,
            resource: 'proprietarios',
            roles: ['Super Admin', 'Administrador']
          }
        ]
      },
      {
        name: 'Dashboards',
        href: '/admin/dashboards',
        icon: ChartBarIcon,
        resource: 'dashboards',
        roles: ['Super Admin', 'Administrador', 'Corretor', 'UsuÃ¡rio']
      },
      {
        name: 'RelatÃ³rios',
        href: '/admin/relatorios',
        icon: DocumentTextIcon,
        resource: 'relatorios',
        roles: ['Super Admin', 'Administrador', 'Corretor', 'UsuÃ¡rio']
      }
    ]
  }

  // Filtrar menu baseado no perfil do usuÃ¡rio
  const getFilteredMenu = () => {
    const allItems = getMenuStructure()
    
    // Debug: verificar dados do usuÃ¡rio
    console.log('ðŸ” Debug Sidebar - Dados do usuÃ¡rio:', {
      user: user,
      role_name: user?.role_name,
      nome: user?.nome
    })
    
    const filterItems = (items: MenuItem[]): MenuItem[] => {
      return items.filter(item => {
        const hasRole = item.roles.includes(user.role_name || '')
        console.log(`ðŸ” Debug Sidebar - Item: ${item.name}, Roles: ${item.roles.join(', ')}, User Role: ${user.role_name}, Has Role: ${hasRole}`)
        if (!hasRole) return false
        
        // Se tem filhos, verificar se pelo menos um filho tem permissÃ£o
        if (item.children) {
          const filteredChildren = filterItems(item.children)
          return filteredChildren.length > 0
        }
        
        return true
      }).map(item => {
        if (item.children) {
          const filteredChildren = filterItems(item.children)
          return {
            ...item,
            children: filteredChildren
          }
        }
        return item
      })
    }
    
    return filterItems(allItems)
  }

  const menuItems = getFilteredMenu()

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }
    return pathname.startsWith(href)
  }

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuName) 
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
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

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedMenus.includes(item.name)
    const isActiveItem = item.href ? isActive(item.href) : false

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleMenu(item.name)}
            className={`group flex items-center w-full px-2 py-2 text-sm font-medium rounded-md ${
              isActiveItem
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            style={{ paddingLeft: `${8 + level * 16}px` }}
          >
            <item.icon
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
      // Dashboard sempre visÃ­vel
      return (
        <Link
          key={item.name}
          href={item.href!}
          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
            isActiveItem
              ? 'bg-blue-100 text-blue-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          onClick={() => setOpen(false)}
        >
          <item.icon
            className={`mr-3 h-5 w-5 flex-shrink-0 ${
              isActiveItem ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
            }`}
          />
          {item.name}
        </Link>
      )
    }

    // Item protegido por permissÃ£o
    return (
      <PermissionGuard key={item.name} resource={item.resource!} action="READ">
        <Link
          href={item.href!}
          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
            isActiveItem
              ? 'bg-blue-100 text-blue-900'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
          onClick={() => setOpen(false)}
        >
          <item.icon
            className={`mr-3 h-5 w-5 flex-shrink-0 ${
              isActiveItem ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
            }`}
          />
          {item.name}
        </Link>
      </PermissionGuard>
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
              {menuItems.map((item) => renderMenuItem(item))}
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
            <h1 className="text-xl font-semibold text-gray-900">Net ImobiliÃ¡ria</h1>
          </div>
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {menuItems.map((item, index) => (
              <div key={item.name}>
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
