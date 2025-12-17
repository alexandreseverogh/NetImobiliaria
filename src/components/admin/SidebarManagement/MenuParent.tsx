'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import DynamicIcon from '@/components/common/DynamicIcon'
import { MenuEditModal } from './MenuEditModal'
import { type MenuItem } from '@/hooks/useSidebarItems'

interface MenuParentProps {
  menu: MenuItem
  isSelected?: boolean
  onSelect?: () => void
  onReload: () => Promise<void>
}

export function MenuParent({ menu, isSelected, onSelect, onReload }: MenuParentProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditModalOpen(true)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Tem certeza que deseja excluir "${menu.name}" e todos os seus subitens?`)) {
      // TODO: Implementar delete
      console.log('Delete:', menu.id)
    }
  }

  const handleToggleActive = (e: React.MouseEvent) => {
    e.stopPropagation()
    // TODO: Implementar toggle active
    console.log('Toggle active:', menu.id)
  }

  return (
    <>
      <div
        className={`
          border rounded-lg cursor-pointer transition-colors
          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}
        `}
        onClick={onSelect}
      >
        {/* Header do Menu Pai */}
        <div className="flex items-center px-4 py-3">
          {/* Expand/Collapse */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleToggleExpand()
            }}
            className="mr-2"
          >
            {menu.children && menu.children.length > 0 ? (
              isExpanded ? (
                <ChevronDownIcon className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-5 w-5 text-gray-500" />
              )
            ) : (
              <div className="w-5" />
            )}
          </button>

          {/* Ícone */}
          <DynamicIcon iconName={menu.icon_name} className="h-5 w-5 text-gray-500 mr-3" />

          {/* Nome */}
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">{menu.name}</div>
            {menu.description && (
              <div className="text-xs text-gray-500 mt-1">{menu.description}</div>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            {/* Status Ativo/Inativo */}
            <button
              type="button"
              onClick={handleToggleActive}
              className="p-1 rounded hover:bg-gray-200"
              title={menu.is_active ? 'Desativar' : 'Ativar'}
            >
              {menu.is_active ? (
                <EyeIcon className="h-4 w-4 text-green-600" />
              ) : (
                <EyeSlashIcon className="h-4 w-4 text-red-600" />
              )}
            </button>

            {/* Editar */}
            <button
              type="button"
              onClick={handleEdit}
              className="p-1 rounded hover:bg-gray-200"
              title="Editar"
            >
              <PencilIcon className="h-4 w-4 text-gray-600" />
            </button>

            {/* Excluir */}
            <button
              type="button"
              onClick={handleDelete}
              className="p-1 rounded hover:bg-red-100"
              title="Excluir"
            >
              <TrashIcon className="h-4 w-4 text-red-600" />
            </button>
          </div>
        </div>

        {/* Subitens */}
        {isExpanded && menu.children && menu.children.length > 0 && (
          <div className="border-t bg-gray-50">
            {menu.children.map(child => (
              <div key={child.id} className="flex items-center px-12 py-2 hover:bg-gray-100">
                <DynamicIcon iconName={child.icon_name} className="h-4 w-4 text-gray-500 mr-2" />
                <span className="text-sm text-gray-700">{child.name}</span>
                {child.url && <span className="ml-2 text-xs text-gray-500">{child.url}</span>}
              </div>
            ))}

            {/* Botão para adicionar subitem */}
            <div className="px-12 py-2">
              <button className="text-xs text-blue-600 hover:text-blue-700">
                + Adicionar Subitem
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Edição */}
       {isEditModalOpen && (
         <MenuEditModal
          item={menu}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={async (data) => {
            console.log('Save:', data)
            await onReload()
            setIsEditModalOpen(false)
          }}
          onDelete={async (item) => {
            console.warn('Delete não implementado no MenuParent para item', item.id)
          }}
        />
       )}
    </>
  )
}

