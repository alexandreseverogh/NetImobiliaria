'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, closestCorners } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSidebarItems, type MenuItem } from '@/hooks/useSidebarItems'
import { DraggableMenuItem } from './DraggableMenuItem'
import { MenuEditModal } from './MenuEditModal'
import { MenuCreateModal } from './MenuCreateModal'
import { PlusIcon } from '@heroicons/react/24/outline'

interface MenuTreeManagerProps {
  onMenuSelect?: (menuId: number) => void
}

export function MenuTreeManager({ onMenuSelect }: MenuTreeManagerProps) {
  const { menus, loading, error, reload, updateItem, deleteItem, createItem } = useSidebarItems()
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [creatingItem, setCreatingItem] = useState<boolean>(false)
  const [creatingChildFor, setCreatingChildFor] = useState<number | null>(null)

  useEffect(() => {
    reload()
  }, [reload])

  const handleSelect = (menuId: number) => {
    setSelectedMenuId(menuId)
    if (onMenuSelect) {
      onMenuSelect(menuId)
    }
  }

  const handleCreateParent = () => {
    setCreatingItem(true)
  }

  const handleSaveNew = async (data: Partial<MenuItem>) => {
    await createItem(data)
    setCreatingItem(false)
  }

  const handleSaveChild = async (data: Partial<MenuItem>) => {
    await createItem({
      ...data,
      parent_id: creatingChildFor
    })
    setCreatingChildFor(null)
  }

  const handleCancelCreate = () => {
    setCreatingItem(false)
  }

  const handleCancelCreateChild = () => {
    setCreatingChildFor(null)
  }

  const handleCreateChild = (parentId: number) => {
    setCreatingChildFor(parentId)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      setActiveId(null)
      return
    }

    const activeItem = findItemById(active.id as number)
    const overItem = findItemById(over.id as number)

    if (!activeItem || !overItem) {
      setActiveId(null)
      return
    }

    // PROTEÇÃO: Se estiver arrastando um item Raiz (Pai) sobre um item Filho,
    // redirecionar o alvo para o Pai do Filho.
    // Isso evita que um Menu Pai entre acidentalmente dentro de outro Menu Pai
    // quando o usuário tenta apenas reordenar os Pais.
    let targetOverItem = overItem

    if (activeItem.parent_id === null && overItem.parent_id !== null) {
      const parentItem = findItemById(overItem.parent_id)
      if (parentItem) {
        targetOverItem = parentItem
      }
    }

    // Se está movendo para um pai diferente
    if (activeItem.parent_id !== targetOverItem.parent_id) {
      await updateItem(activeItem.id, {
        ...activeItem,
        parent_id: targetOverItem.parent_id,
        order_index: targetOverItem.order_index
      })
    } else {
      // Se está reordenando no mesmo pai
      const siblings = getSiblings(activeItem.parent_id)
      const oldIndex = siblings.findIndex(item => item.id === activeItem.id)
      const newIndex = siblings.findIndex(item => item.id === targetOverItem.id)

      if (oldIndex !== newIndex) {
        // Reordenar todos os itens
        const reorderedSiblings = [...siblings]
        const [movedItem] = reorderedSiblings.splice(oldIndex, 1)
        reorderedSiblings.splice(newIndex, 0, movedItem)

        // Atualizar ordem de todos os itens afetados
        for (let i = 0; i < reorderedSiblings.length; i++) {
          if (reorderedSiblings[i].order_index !== i + 1) {
            await updateItem(reorderedSiblings[i].id, {
              ...reorderedSiblings[i],
              order_index: i + 1
            })
          }
        }
      }
    }

    setActiveId(null)
    reload()
  }

  const findItemById = (id: number): MenuItem | null => {
    for (const menu of menus) {
      if (menu.id === id) return menu
      for (const child of menu.children || []) {
        if (child.id === id) return child
      }
    }
    return null
  }

  const getSiblings = (parentId: number | null): MenuItem[] => {
    if (parentId === null) {
      return menus.filter(menu => menu.parent_id === null)
    }

    const parent = menus.find(menu => menu.id === parentId)
    return parent?.children || []
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
  }

  const handleSave = async (data: Partial<MenuItem>) => {
    if (!editingItem) return
    await updateItem(editingItem.id, data)
    setEditingItem(null)
  }

  const handleModalClose = () => {
    setEditingItem(null)
  }

  const handleDelete = async (item: MenuItem) => {
    if (confirm(`Tem certeza que deseja excluir "${item.name}"?`)) {
      try {
        await deleteItem(item.id)
      } catch (err) {
        console.error('Erro ao excluir item:', err)
        alert('Erro ao excluir item')
      }
    }
  }

  const handleToggleActive = async (item: MenuItem) => {
    await updateItem(item.id, {
      ...item,
      is_active: !item.is_active
    })
    reload()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Carregando menus...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">{error}</div>
      </div>
    )
  }

  // Flatten all items for drag and drop
  const allItems = menus.reduce((acc, menu) => {
    acc.push(menu)
    if (menu.children) {
      acc.push(...menu.children)
    }
    return acc
  }, [] as MenuItem[])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Estrutura da Sidebar</h2>
        <button
          onClick={handleCreateParent}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Adicionar Menu Pai
        </button>
      </div>

      {/* Drag and Drop Context */}
      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={allItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {menus.map(menu => (
              <div key={menu.id}>
                <DraggableMenuItem
                  item={menu}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                >
                  {menu.children && menu.children.length > 0 && (
                    <div className="ml-4 space-y-2">
                      {menu.children.map(child => (
                        <DraggableMenuItem
                          key={child.id}
                          item={child}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onToggleActive={handleToggleActive}
                        />
                      ))}
                    </div>
                  )}
                </DraggableMenuItem>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Mensagem quando não há menus */}
      {menus.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Nenhum menu cadastrado</p>
          <button
            onClick={handleCreateParent}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Criar Primeiro Menu
          </button>
        </div>
      )}

      {/* Modal de Edição */}
      <MenuEditModal
        item={editingItem}
        isOpen={!!editingItem}
        onClose={handleModalClose}
        onSave={handleSave}
        onDelete={handleDelete}
        onCreateChild={handleCreateChild}
      />

      {/* Modal de Criação de Menu Pai */}
      <MenuCreateModal
        isOpen={creatingItem}
        onClose={handleCancelCreate}
        onSave={handleSaveNew}
        isParent={true}
      />

      {/* Modal de Criação de Filho */}
      <MenuCreateModal
        isOpen={!!creatingChildFor}
        onClose={handleCancelCreateChild}
        onSave={handleSaveChild}
        isParent={false}
      />
    </div>
  )
}

