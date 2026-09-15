'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

/**
 * Barra de abas horizontal, acima do conteúdo da página — a contraparte de navegação de um
 * "Grupo de Funcionalidades" (ver /admin/master/feature-groups). A sidebar vertical mostra só
 * 1 item clicável por grupo; ao entrar em qualquer aba dele, esta barra aparece com as
 * irmãs que o usuário atual pode ver (o servidor já filtrou por permissão/provisionamento —
 * `menuItems` é o MESMO payload que a sidebar vertical já carregou, sem fetch novo).
 *
 * Não renderiza nada quando a página atual não pertence a nenhum grupo, ou quando o grupo só
 * tem 1 aba visível pra este usuário (uma barra de 1 item não ajuda ninguém).
 */

interface TabItem {
  id: number
  name: string
  path: string
  icon?: string
}

interface GroupNode {
  id: string
  name: string
  path: string
  icon?: string
  isGroup?: boolean
  tabs?: TabItem[]
}

interface HorizontalTabsBarProps {
  menuItems: any[]
  theme?: { mode: 'light' | 'dark'; primaryColor?: string }
  /** Os 3 layouts (`AdminLayoutContent`/`CRMLayoutContent`/`MensageriaLayoutContent`) têm
   *  padding horizontal diferente no próprio `<main>` — quem tem `px-8` passa
   *  `"-mx-8 px-8"` aqui pra a barra ficar full-bleed até a borda; quem não tem padding
   *  nenhum (Mensageria) deixa o default vazio, já fica alinhado sozinho. */
  bleedClassName?: string
}

function findActiveGroup(menuItems: any[], pathname: string): GroupNode | null {
  for (const category of menuItems || []) {
    for (const child of category?.children || []) {
      if (!child?.isGroup || !Array.isArray(child.tabs)) continue
      const hasMatch = child.tabs.some((t: TabItem) => t.path === pathname)
      if (hasMatch) return child as GroupNode
    }
  }
  return null
}

export default function HorizontalTabsBar({ menuItems, theme, bleedClassName = '' }: HorizontalTabsBarProps) {
  const pathname = usePathname()
  const isDark = theme?.mode === 'dark'

  const group = useMemo(() => findActiveGroup(menuItems, pathname || ''), [menuItems, pathname])

  if (!group || !group.tabs || group.tabs.length < 2) return null

  return (
    <div
      className={`mb-6 border-b overflow-x-auto ${bleedClassName} ${
        isDark ? 'border-white/5 bg-white/[0.02]' : 'border-gray-200 bg-white'
      }`}
      role="tablist"
      aria-label={group.name}
    >
      <nav className="flex items-center gap-1 min-w-max">
        {group.tabs.map(tab => {
          const isActive = tab.path === pathname
          return (
            <Link
              key={tab.id}
              href={tab.path}
              role="tab"
              aria-selected={isActive}
              className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? isDark ? 'text-white' : 'text-blue-700'
                  : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab.name}
              {isActive && (
                <span
                  className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full"
                  style={{ backgroundColor: theme?.primaryColor || '#2563eb' }}
                />
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
