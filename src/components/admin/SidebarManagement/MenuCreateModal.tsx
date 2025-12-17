'use client'

import { useState, useEffect, useCallback } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { HybridIconSelector as IconSelector } from './HybridIconSelector'
import { MenuItem } from '@/hooks/useSidebarItems'
import { useApi } from '@/hooks/useApi'

interface MenuCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<MenuItem>) => Promise<void>
  isParent?: boolean
}

export function MenuCreateModal({ isOpen, onClose, onSave, isParent = true }: MenuCreateModalProps) {
  const { get } = useApi()
  const [name, setName] = useState('')
  const [iconName, setIconName] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [showIconSelector, setShowIconSelector] = useState(false)
  const [loading, setLoading] = useState(false)
  const [systemFeatures, setSystemFeatures] = useState<any[]>([])
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(null)

  // Carregar system_features quando o modal abrir
  const loadSystemFeatures = useCallback(async () => {
    try {
      const response = await get('/api/admin/system-features')
      const data = await response.json()
      if (data.success) {
        setSystemFeatures(data.features || [])
      }
    } catch (err) {
      console.error('Erro ao carregar funcionalidades:', err)
    }
  }, [get])

  useEffect(() => {
    if (isOpen && !isParent) {
      loadSystemFeatures()
    }
  }, [isOpen, isParent, loadSystemFeatures])

  const handleSave = async () => {
    // Validação de campos obrigatórios
    if (!name || !iconName) {
      alert('❌ Campos obrigatórios:\n\n• Nome\n• Ícone')
      return
    }
    
    // Validação adicional para submenus
    if (!isParent && !selectedFeatureId) {
      alert('❌ Para submenus, é obrigatório selecionar uma "Funcionalidade do Sistema"')
      return
    }
    
    setLoading(true)
    try {
      await onSave({
        name,
        icon_name: iconName,
        url: url || null,
        description: description || null,
        is_active: isActive,
        parent_id: isParent ? null : undefined, // Será definido quando criar filho
        order_index: 0, // Será calculado automaticamente
        feature_id: selectedFeatureId // Vincular à funcionalidade do sistema
      })
      onClose()
      // Reset form
      setName('')
      setIconName('')
      setUrl('')
      setDescription('')
      setIsActive(true)
      setSelectedFeatureId(null)
    } catch (err) {
      console.error('Erro ao salvar:', err)
      alert('Erro ao salvar item')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isParent ? 'Adicionar Menu Pai' : 'Adicionar Submenu'}
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
              placeholder="Ex: Painel Administrativo"
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
                placeholder="Ex: cog, home, user"
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
              placeholder="Ex: /admin/dashboard"
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
              placeholder="Descrição do menu"
            />
          </div>

          {/* System Feature Selection (only for children) */}
          {!isParent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Funcionalidade do Sistema *
              </label>
              <select
                value={selectedFeatureId || ''}
                onChange={(e) => setSelectedFeatureId(Number(e.target.value) || null)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 ${
                  !selectedFeatureId 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300 focus:border-blue-500'
                }`}
                required
              >
                <option value="">Selecione uma funcionalidade</option>
                {systemFeatures.map(feature => (
                  <option key={feature.id} value={feature.id}>
                    {feature.name} - {feature.url}
                  </option>
                ))}
              </select>
              {!selectedFeatureId && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  ⚠️ Este campo é obrigatório para submenus
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Vincule este item a uma funcionalidade existente do sistema
              </p>
            </div>
          )}

          {/* Active/Inactive */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              Menu Ativo
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 transition-all ${
              loading || !name || !iconName || (!isParent && !selectedFeatureId)
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 cursor-pointer'
            }`}
            disabled={loading || !name || !iconName || (!isParent && !selectedFeatureId)}
            title={
              loading 
                ? 'Salvando...' 
                : (!name || !iconName || (!isParent && !selectedFeatureId))
                  ? 'Preencha todos os campos obrigatórios (*)' 
                  : 'Clique para criar o menu'
            }
          >
            {loading ? 'Salvando...' : 'Criar Menu'}
          </button>
        </div>
      </div>
    </div>
  )
}
