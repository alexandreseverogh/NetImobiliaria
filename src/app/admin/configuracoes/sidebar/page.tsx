'use client'

import { useState, useEffect } from 'react'
import { useSidebarItems } from '@/hooks/useSidebarItems'
import { MenuTreeManager } from '@/components/admin/SidebarManagement/MenuTreeManager'
import { SidebarPreview } from '@/components/admin/SidebarManagement/SidebarPreview'
import PermissionGuard from '@/components/admin/PermissionGuard'
import { sidebarEventManager } from '@/lib/events/sidebarEvents'

export default function SidebarManagementPage() {
  const { menus, loading, reload } = useSidebarItems()
  const [refreshKey, setRefreshKey] = useState(0)

  // Escutar mudanças na sidebar para atualizar a página
  useEffect(() => {
    const unsubscribe = sidebarEventManager.subscribe(async () => {
      console.log('SidebarManagementPage: Evento recebido, recarregando dados...')
      await reload()
      setRefreshKey(prev => prev + 1)
    })

    return () => {
      unsubscribe()
    }
  }, [reload])

  // TEMPORÁRIO: Remover PermissionGuard para testar
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Sidebar</h1>
          <p className="mt-2 text-sm text-gray-600">
            Configure os menus e submenus da sidebar administrativa
          </p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1-2: Árvore de Menus (66%) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-gray-500">Carregando...</div>
                </div>
              ) : (
                <MenuTreeManager />
              )}
            </div>
          </div>

          {/* Coluna 3: Preview (33%) */}
          <div className="lg:col-span-1" key={refreshKey}>
            <SidebarPreview menus={menus} />
          </div>
        </div>
      </div>
    </div>
  )
}

