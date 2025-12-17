'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { HybridIconSelector as IconSelector } from './HybridIconSelector'
import { MenuItem } from '@/hooks/useSidebarItems'

interface MenuEditModalProps {
  item: MenuItem | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<MenuItem>) => Promise<void>
  onDelete: (item: MenuItem) => Promise<void>
  onCreateChild?: (parentId: number) => void
}

export function MenuEditModal({ item, isOpen, onClose, onSave, onDelete, onCreateChild }: MenuEditModalProps) {
  const [name, setName] = useState('')
  const [iconName, setIconName] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [showIconSelector, setShowIconSelector] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (item) {
      setName(item.name)
      setIconName(item.icon_name)
      setUrl(item.url || '')
      setDescription(item.description || '')
      setIsActive(item.is_active)
    }
  }, [item])

  const handleSave = async () => {
    if (!item) return
    
    setLoading(true)
    try {
      await onSave({
        ...item,
        name,
        icon_name: iconName,
        url: url || null,
        description: description || null,
        is_active: isActive
      })
      onClose()
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar item')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!item) return
    
    if (confirm(`Tem certeza que deseja excluir "${item.name}"?`)) {
      await onDelete(item)
      onClose()
    }
  }

  if (!isOpen || !item) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Editar Item da Sidebar
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ícone *
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ex: home, user, cog"
                required
              />
              <button
                type="button"
                onClick={() => setShowIconSelector(!showIconSelector)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Selecionar
              </button>
            </div>
            {showIconSelector && (
              <div className="mt-2">
                <IconSelector
                  selected={iconName}
                  onSelect={(icon) => {
                    setIconName(icon)
                    setShowIconSelector(false)
                  }}
                />
              </div>
            )}
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: /admin/usuarios"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Descrição do item"
            />
          </div>

          {/* Active/Inactive */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Item Ativo
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex space-x-2">
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={loading}
            >
              Excluir
            </button>
            {onCreateChild && (
              <button
                onClick={() => {
                  onCreateChild(item.id)
                  onClose()
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              >
                Adicionar Filho
              </button>
            )}
          </div>
          <div className="space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading || !name || !iconName}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}