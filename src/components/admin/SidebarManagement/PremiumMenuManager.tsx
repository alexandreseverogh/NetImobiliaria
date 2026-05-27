'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent, 
  closestCorners, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core'
import { 
  SortableContext, 
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { useSidebarItems, type MenuItem } from '@/hooks/useSidebarItems'
import { DraggableMenuItem } from './DraggableMenuItem'
import { MenuEditModal } from './MenuEditModal'
import { MenuCreateModal } from './MenuCreateModal'
import { sidebarEventManager } from '@/lib/events/sidebarEvents'
import { 
  PlusIcon, 
  ArrowsUpDownIcon, 
  CheckIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

interface PremiumMenuManagerProps {
  onMenuSelect?: (menuId: number) => void
}

export function PremiumMenuManager({ onMenuSelect }: PremiumMenuManagerProps) {
  const { menus, loading, error, reload } = useSidebarItems()
  const [localMenus, setLocalMenus] = useState<MenuItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [creatingItem, setCreatingItem] = useState<boolean>(false)
  const [creatingChildFor, setCreatingChildFor] = useState<number | null>(null)
  const [availableCategories, setAvailableCategories] = useState<any[]>([])
  const [availableFeatures, setAvailableFeatures] = useState<any[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    if (menus) {
      setLocalMenus(menus)
    }
  }, [menus])

  const loadMasterData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/master/features', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin-auth-token')}`
        }
      })
      const data = await response.json()
      setAvailableFeatures(data.features || [])
      setAvailableCategories(data.availableCategories || [])
    } catch (err) {
      console.error('Erro ao carregar dados master:', err)
    }
  }, [])

  useEffect(() => {
    loadMasterData()
  }, [loadMasterData])

  const handleSaveBulk = async (menusToSave?: MenuItem[]) => {
    const listToProcess = menusToSave || localMenus;
    if (listToProcess.length === 0) return;

    try {
      setIsSaving(true)
      
      // Preparar dados para a nova API de reordenagem com recursividade
      const flattenedItems: any[] = []
      
      const flatten = (items: MenuItem[], parentId: number | null = null) => {
        items.forEach((item, index) => {
          flattenedItems.push({
            id: item.id,
            parent_id: parentId,
            order_index: index
          })
          if (item.children && item.children.length > 0) {
            flatten(item.children, item.id)
          }
        })
      }

      flatten(listToProcess)

      const token = localStorage.getItem('admin-auth-token') || localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/master/sidebar/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items: flattenedItems })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Sidebar sincronizada com o banco!')
        reload()
      } else {
        throw new Error(data.message)
      }
    } catch (err: any) {
      console.error('Erro ao salvar ordem:', err)
      toast.error('Erro de persistência: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const activeId = active.id as number
    const overId = over.id as number

    setLocalMenus((prev) => {
      // 1. Verificar se estamos movendo um item raiz
      const activeRootIndex = prev.findIndex(m => m.id === activeId)
      
      // Tentativa de achar o overRootIndex (direto ou através de um filho)
      let overRootIndex = prev.findIndex(m => m.id === overId)
      
      if (overRootIndex === -1) {
        // Se não achou na raiz, pode ser que o over seja um filho. 
        // Vamos achar o pai desse filho e assumir a posição dele
        overRootIndex = prev.findIndex(m => m.children?.some(c => c.id === overId))
      }

      if (activeRootIndex !== -1 && overRootIndex !== -1) {
        const next = arrayMove(prev, activeRootIndex, overRootIndex)
        sidebarEventManager.notify(next)
        // Salvar automaticamente após soltar
        handleSaveBulk(next)
        return next
      }

      // 2. Verificar se estamos movendo um filho dentro do mesmo pai (ou entre pais)
      // Procurar em qual pai o item ativo está
      let activeParentIdx = -1
      let activeChildIdx = -1
      
      prev.forEach((p, pIdx) => {
        const cIdx = p.children?.findIndex(c => c.id === activeId) ?? -1
        if (cIdx !== -1) {
          activeParentIdx = pIdx
          activeChildIdx = cIdx
        }
      })

      if (activeParentIdx !== -1) {
        // Encontrar o pai de destino
        let overParentIdx = prev.findIndex(m => m.id === overId) // Soltou direto no pai?
        let overChildIdx = -1
        
        if (overParentIdx === -1) {
           // Soltou em outro filho?
           prev.forEach((p, pIdx) => {
             const cIdx = p.children?.findIndex(c => c.id === overId) ?? -1
             if (cIdx !== -1) {
               overParentIdx = pIdx
               overChildIdx = cIdx
             }
           })
        }

        if (overParentIdx !== -1) {
          const newMenus = [...prev]
          const sourceParent = newMenus[activeParentIdx]
          const targetParent = newMenus[overParentIdx]
          
          if (!sourceParent.children) return prev
          
          const [movedItem] = sourceParent.children.splice(activeChildIdx, 1)
          
          if (!targetParent.children) targetParent.children = []
          
          if (overChildIdx !== -1) {
            targetParent.children.splice(overChildIdx, 0, movedItem)
          } else {
            targetParent.children.push(movedItem)
          }
          
          sidebarEventManager.notify(newMenus)
          // Salvar automaticamente após soltar
          handleSaveBulk(newMenus)
          return newMenus
        }
      }

      // Se moveu na raiz, o notify já foi chamado acima pelo next
      // Se chegamos aqui e algo mudou mas não persistiu:
      return prev
    })
  }

  const handleCreateItem = async (data: Partial<MenuItem>, parentId: number | null = null) => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/sidebar/menu-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin-auth-token')}`
        },
        body: JSON.stringify({
          ...data,
          parent_id: parentId
        })
      })

      const result = await response.json()
      if (result.success) {
        toast.success('Novo item criado com sucesso!')
        setCreatingItem(false)
        setCreatingChildFor(null)
        reload()
      } else {
        toast.error(result.message || 'Erro ao criar item')
      }
    } catch (err) {
      console.error('Erro ao criar item:', err)
      toast.error('Erro de conexão ao criar item')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateItem = async (data: Partial<MenuItem>) => {
    if (!editingItem) return
    
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/sidebar/menu-items', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin-auth-token')}`
        },
        body: JSON.stringify({ ...data, id: editingItem.id })
      })

      const result = await response.json()
      if (result.success) {
        toast.success('Alterações salvas com sucesso!')
        setEditingItem(null)
        reload()
      } else {
        toast.error(result.message || 'Erro ao atualizar item')
      }
    } catch (err: any) {
      console.error('Erro ao atualizar item:', err)
      toast.error(`Erro de conexão: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (menuItem: MenuItem) => {
    if (!confirm(`Deseja realmente excluir o menu "${menuItem.name}"?`)) return

    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/sidebar/menu-items', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin-auth-token')}`
        },
        body: JSON.stringify({ id: menuItem.id })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Menu removido com sucesso!')
        setEditingItem(null)
        reload()
      } else {
        toast.error(data.message || 'Erro ao excluir menu')
      }
    } catch (err: any) {
      console.error('Erro ao excluir:', err)
      toast.error(`Erro de conexão: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading && localMenus.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 font-medium animate-pulse">Sincronizando Hierarquia...</p>
      </div>
    )
  }

  if (error && localMenus.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4 text-center">
        <div className="p-3 bg-red-50 rounded-full">
          <ArrowsUpDownIcon className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <p className="text-red-800 font-bold">Erro ao carregar estrutura</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
        <button 
          onClick={() => reload()} 
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Premium Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-1 bg-blue-600 rounded-full"></div>
          <h2 className="text-lg font-bold text-gray-800">Estrutura Master</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => reload()}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Recarregar"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setCreatingItem(true)}
            className="flex items-center px-4 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 text-sm font-semibold transition-all"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Novo Grupo
          </button>

          <button
            onClick={() => handleSaveBulk()}
            disabled={isSaving}
            className={`flex items-center px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-all ${
              isSaving 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
            }`}
          >
            {isSaving ? (
              <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckIcon className="h-4 w-4 mr-2" />
            )}
            Salvar Ordem de Fábrica
          </button>
        </div>
      </div>

      {/* Editor Canvas */}
      <div className="bg-gray-50/50 p-6 rounded-2xl border-2 border-dashed border-gray-200 min-h-[500px]">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="max-w-3xl mx-auto space-y-4">
            <SortableContext items={localMenus.map(m => m.id)} strategy={verticalListSortingStrategy}>
              {localMenus.map((menu) => (
                <div key={menu.id} className="group">
                  <DraggableMenuItem
                    item={menu}
                    isPremium={true}
                    onEdit={() => setEditingItem(menu)}
                    onDelete={() => handleDelete(menu)}
                    onAddChild={() => setCreatingChildFor(menu.id)}
                  >
                    {menu.children && menu.children.length > 0 && (
                      <div className="ml-10 mt-2 space-y-2 border-l-2 border-gray-100 pl-4">
                        <SortableContext items={menu.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
                          {menu.children.map(child => (
                            <DraggableMenuItem
                              key={child.id}
                              item={child}
                              isPremium={true}
                              onEdit={() => setEditingItem(child)}
                              onDelete={() => handleDelete(child)}
                            />
                          ))}
                        </SortableContext>
                      </div>
                    )}
                  </DraggableMenuItem>
                </div>
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>

      {/* Modais */}
      <MenuEditModal
        item={editingItem}
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleUpdateItem}
        onDelete={handleDelete}
        categories={availableCategories}
        features={availableFeatures}
      />

      <MenuCreateModal
        isOpen={creatingItem}
        onClose={() => setCreatingItem(false)}
        onSave={(data) => handleCreateItem(data, null)}
        isParent={true}
        categories={availableCategories}
        features={availableFeatures}
      />

      <MenuCreateModal
        isOpen={!!creatingChildFor}
        onClose={() => setCreatingChildFor(null)}
        onSave={(data) => handleCreateItem(data, creatingChildFor)}
        isParent={false}
        categories={availableCategories}
        features={availableFeatures}
      />
    </div>
  )
}
