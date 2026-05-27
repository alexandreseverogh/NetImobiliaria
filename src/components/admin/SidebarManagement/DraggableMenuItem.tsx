'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MenuItem } from '@/hooks/useSidebarItems'
import DynamicIcon from '@/components/common/DynamicIcon'
import { 
  PencilSquareIcon, 
  TrashIcon, 
  PlusCircleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

interface DraggableMenuItemProps {
  item: MenuItem
  children?: React.ReactNode
  isPremium?: boolean
  onEdit?: (item: MenuItem) => void
  onDelete?: (item: MenuItem) => void
  onToggleActive?: (item: MenuItem) => void
  onAddChild?: (parentId: number) => void
}

export function DraggableMenuItem({ 
  item, 
  children, 
  isPremium = false,
  onEdit, 
  onDelete, 
  onToggleActive,
  onAddChild
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
    zIndex: isDragging ? 100 : 'auto',
  }

  if (isPremium) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative transition-all duration-300 ${isDragging ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className={`
          flex items-center justify-between p-4 mb-2 rounded-xl border
          ${isDragging 
            ? 'bg-blue-50 border-blue-200 shadow-2xl scale-105' 
            : 'bg-white/80 backdrop-blur-sm border-gray-100 hover:border-blue-200 hover:shadow-lg hover:bg-white'}
          transition-all duration-200 group
        `}>
          {/* Enhanced Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="p-2 cursor-grab active:cursor-grabbing text-gray-300 hover:text-blue-500 transition-colors"
          >
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="2" cy="2" r="1.5" fill="currentColor"/>
              <circle cx="2" cy="9" r="1.5" fill="currentColor"/>
              <circle cx="2" cy="16" r="1.5" fill="currentColor"/>
              <circle cx="10" cy="2" r="1.5" fill="currentColor"/>
              <circle cx="10" cy="9" r="1.5" fill="currentColor"/>
              <circle cx="10" cy="16" r="1.5" fill="currentColor"/>
            </svg>
          </div>

          <div className="flex-1 flex items-center space-x-4">
            <div className={`p-2 rounded-lg ${item.parent_id ? 'bg-gray-50' : 'bg-blue-50 text-blue-600'}`}>
              <DynamicIcon 
                iconName={item.icon_name} 
                className={`w-5 h-5 ${item.parent_id ? 'text-gray-500' : 'text-blue-600'}`} 
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-bold ${item.parent_id ? 'text-gray-700' : 'text-gray-900'}`}>
                  {item.name}
                </span>
                {!item.is_active && (
                  <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                    Inativo
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 font-medium truncate max-w-[200px]">
                {item.url || 'Agrupador'}
              </p>
            </div>
          </div>

          {/* Premium Actions Menu */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onAddChild && !item.parent_id && (
              <button
                onClick={() => onAddChild(item.id)}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                title="Adicionar Submenu"
              >
                <PlusCircleIcon className="h-4 w-4" />
              </button>
            )}
            
            <button
              onClick={() => onToggleActive?.(item)}
              className={`p-2 rounded-lg transition-all ${
                item.is_active 
                  ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50' 
                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
              }`}
              title={item.is_active ? 'Ocultar' : 'Exibir'}
            >
              {item.is_active ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
            </button>

            <button
              onClick={() => onEdit?.(item)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Ajustar Configurações"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => onDelete?.(item)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Remover"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        {children}
      </div>
    )
  }

  // Legacy fallback (simplificado)
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white border border-gray-200 rounded-lg p-4 mb-2 ${
        isDragging ? 'shadow-lg z-50' : 'hover:shadow-md'
      } transition-all duration-200`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
        </svg>
      </div>
      <div className="ml-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {item.name}
        </div>
        <button onClick={() => onEdit?.(item)} className="text-xs text-blue-600">Editar</button>
      </div>
      {children}
    </div>
  )
}
