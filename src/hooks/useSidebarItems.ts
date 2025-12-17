'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useApi } from '@/hooks/useApi'
import { sidebarEventManager } from '@/lib/events/sidebarEvents'

export interface MenuItem {
  id: number
  parent_id: number | null
  name: string
  icon_name: string
  url: string | null
  resource: string | null
  order_index: number
  is_active: boolean
  roles_required: string[]
  permission_required: string | null
  permission_action: string | null
  description: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
  feature_id?: number | null
  children?: MenuItem[]
}

interface UseSidebarItemsReturn {
  menus: MenuItem[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  createItem: (data: Partial<MenuItem>) => Promise<void>
  updateItem: (id: number, data: Partial<MenuItem>) => Promise<void>
  deleteItem: (id: number) => Promise<void>
  toggleActive: (id: number) => Promise<void>
}

function findMenuItemById(items: MenuItem[], id: number): MenuItem | null {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children) {
      const found = findMenuItemById(item.children, id)
      if (found) return found
    }
  }
  return null
}

export function useSidebarItems(): UseSidebarItemsReturn {
  const { get, post, put, delete: del } = useApi()
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMounted = useRef(true)

  const buildHierarchy = (items: MenuItem[]): MenuItem[] => {
    const itemMap = new Map<number, MenuItem>()
    const rootItems: MenuItem[] = []

    // Primeiro, criar mapa de todos os itens
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] })
    })

    // Depois, construir hierarquia
    items.forEach(item => {
      const menuItem = itemMap.get(item.id)!
      if (item.parent_id === null) {
        rootItems.push(menuItem)
      } else {
        const parent = itemMap.get(item.parent_id)
        if (parent) {
          if (!parent.children) parent.children = []
          parent.children.push(menuItem)
        }
      }
    })

    // Ordenar recursivamente
    const sortItems = (items: MenuItem[]) => {
      items.sort((a, b) => a.order_index - b.order_index)
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          sortItems(item.children)
        }
      })
    }

    sortItems(rootItems)
    return rootItems
  }

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await get('/api/admin/sidebar/menu-items')
      const data = await response.json()
      
      if (response.ok && data.success && data.items) {
        const hierarchicalMenus = buildHierarchy(data.items)
        if (isMounted.current) {
          setMenus(hierarchicalMenus)
        }
      } else {
        if (isMounted.current) {
          setError(data.error || 'Erro ao carregar itens')
        }
      }
    } catch (err) {
      console.error('Erro ao carregar itens:', err)
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido')
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [get])

  const createItem = useCallback(async (data: Partial<MenuItem>) => {
    try {
      setError(null)
      
      const response = await post('/api/admin/sidebar/menu-items', {
        ...data,
        roles_required: JSON.stringify(data.roles_required || [])
      })
      
      if (response.ok) {
        await reload()
        // Notificar mudanças na sidebar
        sidebarEventManager.notify()
      }
    } catch (err) {
      console.error('Erro ao criar item:', err)
      setError(err instanceof Error ? err.message : 'Erro ao criar item')
      throw err
    }
  }, [post, reload])

  const updateItem = useCallback(async (id: number, data: Partial<MenuItem>) => {
    try {
      setError(null)
      
      const response = await put('/api/admin/sidebar/menu-items', {
        id,
        ...data,
        roles_required: data.roles_required ? JSON.stringify(data.roles_required) : undefined
      })
      
      if (response.ok) {
        console.log('useSidebarItems: Item atualizado, recarregando dados...')
        await reload()
        console.log('useSidebarItems: Notificando mudanças na sidebar...')
        // Notificar mudanças na sidebar
        sidebarEventManager.notify()
      }
    } catch (err) {
      console.error('Erro ao atualizar item:', err)
      setError(err instanceof Error ? err.message : 'Erro ao atualizar item')
      throw err
    }
  }, [put, reload])

  const deleteItem = useCallback(async (id: number) => {
    try {
      setError(null)
      
      const response = await del(`/api/admin/sidebar/menu-items/${id}`)
      
      if (response.ok) {
        await reload()
        // Notificar mudanças na sidebar
        sidebarEventManager.notify()
      }
    } catch (err) {
      console.error('Erro ao deletar item:', err)
      setError(err instanceof Error ? err.message : 'Erro ao deletar item')
      throw err
    }
  }, [del, reload])

  const toggleActive = useCallback(async (id: number) => {
    try {
      const item = findMenuItemById(menus, id)
      if (!item) return
      
      await updateItem(id, { is_active: !item.is_active })
      // Notificar mudanças na sidebar (já é chamado pelo updateItem)
    } catch (err) {
      console.error('Erro ao alterar status:', err)
    }
  }, [menus, updateItem])

  // Carregar dados ao montar
  useEffect(() => {
    isMounted.current = true
    reload()
    
    return () => {
      isMounted.current = false
    }
  }, [reload])

  useEffect(() => {
    const handler = async () => {
      await reload()
    }
    const unsubscribe = sidebarEventManager.subscribe(handler)
    return () => {
      unsubscribe()
    }
  }, [reload])

  return {
    menus,
    loading,
    error,
    reload,
    createItem,
    updateItem,
    deleteItem,
    toggleActive
  }
}
