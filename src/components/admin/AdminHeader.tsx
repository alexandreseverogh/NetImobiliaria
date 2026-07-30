'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { Menu, Transition } from '@headlessui/react'
import { ChevronDownIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { AdminUser } from '@/lib/types/admin'

interface AdminHeaderProps {
  user: AdminUser
  onLogout: () => void
  onMenuClick: () => void
  title?: string
  systemId?: string
  theme?: { mode: 'light' | 'dark'; primaryColor: string }
}

export default function AdminHeader({ user, onLogout, onMenuClick, title = 'Área Administrativa', systemId = 'admin', theme }: AdminHeaderProps) {
  const isDark = theme?.mode === 'dark'
  const headerBg = isDark ? 'bg-[#020617] border-white/5' : 'bg-white border-gray-200 shadow-sm'
  const titleColor = isDark ? 'text-white' : 'text-gray-900'

  const getLogo = () => {
    const tenant = user?.currentTenant

    // 🏢 USUÁRIO DE TENANT (EMPRESA) - PRIORIDADE 1
    if (tenant?.logo) {
      console.log(`🏢 Logo: Tenant detectado (${tenant.name}) - Exibindo logo da empresa`);
      return tenant.logo
    }

    // 🛡️ [GUARDIAN] REGRA DE NEGÓCIO: LOGO MASTER DA PLATAFORMA - PRIORIDADE 2
    const isMasterAdmin = (user as any)?.is_system_role === true;
    if (isMasterAdmin) {
      console.log('👑 Logo: Administrador Master detectado - Exibindo Artemis');
      return '/Assets/artemis4_light_b.png'
    }

    // 🔄 FALLBACK FINAL
    const isMasterArea = tenant?.name?.toUpperCase().includes('MASTER') ||
      tenant?.slug === 'master'

    if (isMasterArea) return '/Assets/artemis4_light_b.png'

    return '/Assets/artemis4_light_b.png' // Fallback definitivo
  }

  // Verificação de segurança para evitar erros
  if (!user || !user.nome) {
    return (
      <header className={`${headerBg} border-b`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-1 flex items-center space-x-3">
              <Link href="/admin">
                <img src={getLogo()} alt="Logo" className="h-16 w-auto cursor-pointer hover:opacity-80 transition-opacity" />
              </Link>
              <h1 className="text-lg font-semibold text-gray-900">
                {title}
              </h1>
            </div>
            <div className="text-sm text-gray-500">
              Carregando usuário...
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className={`${headerBg} border-b sticky top-0 z-30 transition-colors`}>
      {/* 🎨 Banner de Identidade Visual (Top Line) */}
      <div 
        className="h-1 w-full" 
        style={{ backgroundColor: theme?.primaryColor || '#2563eb' }} 
      />
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Botão de menu para mobile */}
          <div className="lg:hidden">
            <button
              type="button"
              className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-600'} focus:outline-none`}
              onClick={onMenuClick}
            >
              <span className="sr-only">Abrir sidebar</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Título da página */}
          <div className="flex-1 lg:flex-none flex items-center space-x-3">
            <Link href="/admin">
              {isDark ? (
                // Asset padrão tem fundo branco opaco — badge evita caixa branca
                // crua contra o header escuro (ex.: layout da Central de Mensagens).
                <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                  <img src={getLogo()} alt="Logo" className="h-9 w-auto object-contain" />
                </div>
              ) : (
                <img src={getLogo()} alt="Logo" className="h-16 w-auto cursor-pointer hover:opacity-80 transition-opacity" />
              )}
            </Link>
            <h1 className={`text-lg font-bold ${titleColor} tracking-tight`}>
              {title}
            </h1>
          </div>

          {/* Menu do usuário */}
          <div className="flex items-center space-x-4">
            {/* Notificações */}
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Ver notificações</span>
              <div className="relative">
                <div className="h-6 w-6">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M9 11h.01M9 8h.01" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></div>
              </div>
            </button>

            {/* Menu do usuário */}
            <Menu as="div" className="relative">
              <div>
                <Menu.Button className="flex items-center text-sm rounded-full focus:outline-none">
                  <span className="sr-only">Abrir menu do usuário</span>
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shadow-inner" 
                       style={{ backgroundColor: theme?.primaryColor || '#2563eb' }}>
                    <span className="text-white font-black italic text-sm">
                      {user.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <ChevronDownIcon className="ml-2 h-4 w-4 text-gray-400" />
                </Menu.Button>
              </div>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <Menu.Item>
                    {({ active }) => (
                      <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                        <p className="font-medium">{user.nome}</p>
                        <p className="text-gray-500 capitalize">Perfil: {user.role_name || 'N/A'}</p>
                      </div>
                    )}
                  </Menu.Item>

                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${active ? 'bg-gray-100' : ''
                          } flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                      >
                        <UserCircleIcon className="mr-3 h-4 w-4" />
                        Perfil
                      </button>
                    )}
                  </Menu.Item>

                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={onLogout}
                        className={`${active ? 'bg-gray-100' : ''
                          } flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                      >
                        <svg className="mr-3 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sair
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </header>
  )
}






