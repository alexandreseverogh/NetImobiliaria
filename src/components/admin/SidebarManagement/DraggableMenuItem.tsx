'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MenuItem } from '@/hooks/useSidebarItems'
import DynamicIcon from '@/components/common/DynamicIcon'

interface DraggableMenuItemProps {
  item: MenuItem
  children?: React.ReactNode
  onEdit?: (item: MenuItem) => void
  onDelete?: (item: MenuItem) => void
  onToggleActive?: (item: MenuItem) => void
}

export function DraggableMenuItem({ 
  item, 
  children, 
  onEdit, 
  onDelete, 
  onToggleActive 
}: DraggableMenuItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white border border-gray-200 rounded-lg p-4 mb-2 ${
        isDragging ? 'shadow-lg z-50' : 'hover:shadow-md'
      } transition-all duration-200`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </div>

      {/* Item Content */}
      <div className="ml-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <DynamicIcon 
              iconName={item.icon_name} 
              className="w-5 h-5 text-gray-600" 
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {item.name}
            </h3>
            <p className="text-xs text-gray-500">
              {item.url || 'Sem URL'}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                item.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {item.is_active ? 'Ativo' : 'Inativo'}
              </span>
              <span className="text-xs text-gray-400">
                Ordem: {item.order_index}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggleActive?.(item)}
            className={`px-2 py-1 text-xs rounded ${
              item.is_active
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {item.is_active ? 'Desativar' : 'Ativar'}
          </button>
          
          <button
            onClick={() => onEdit?.(item)}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Editar
          </button>
          
          <button
            onClick={() => onDelete?.(item)}
            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Excluir
          </button>
        </div>
      </div>

      {/* Children */}
      {children && (
        <div className="mt-3 ml-8">
          {children}
        </div>
      )}
    </div>
  )
}
