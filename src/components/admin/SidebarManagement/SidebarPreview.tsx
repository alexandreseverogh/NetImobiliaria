'use client'

import DynamicIcon from '@/components/common/DynamicIcon'
import { type MenuItem } from '@/hooks/useSidebarItems'

interface SidebarPreviewProps {
  menus: MenuItem[]
}

export function SidebarPreview({ menus }: SidebarPreviewProps) {
  return (
    <div className="sticky top-4">
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Preview da Sidebar</h3>
        </div>

        <nav className="p-2 max-h-[600px] overflow-y-auto">
          {menus.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Nenhum menu para exibir
            </div>
          ) : (
            menus
              .filter(menu => menu.is_active)
              .map(menu => (
                <div key={menu.id} className="mb-1">
                  {/* Menu Pai */}
                  <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded">
                    <DynamicIcon iconName={menu.icon_name} className="w-5 h-5 mr-3 text-gray-500" />
                    <span>{menu.name}</span>
                  </div>

                  {/* Submenus */}
                  {menu.children && menu.children.length > 0 && (
                    <div className="ml-8 space-y-1 mt-1">
                      {menu.children
                        .filter(child => child.is_active)
                        .map(child => (
                          <a
                            key={child.id}
                            href={child.url || '#'}
                            className="flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                          >
                            <DynamicIcon iconName={child.icon_name} className="w-4 h-4 mr-2 text-gray-500" />
                            <span>{child.name}</span>
                          </a>
                        ))}
                    </div>
                  )}
                </div>
              ))
          )}
        </nav>
      </div>
    </div>
  )
}

