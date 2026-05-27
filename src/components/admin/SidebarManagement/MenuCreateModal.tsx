'use client'

import { useState, useEffect, useCallback } from 'react'
import { XMarkIcon, PlusIcon, SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { HybridIconSelector as IconSelector } from './HybridIconSelector'
import { MenuItem } from '@/hooks/useSidebarItems'
import { useApi } from '@/hooks/useApi'

interface MenuCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<MenuItem>) => Promise<void>
  isParent?: boolean
  features?: any[]
  categories?: any[]
}

export function MenuCreateModal({ 
  isOpen, 
  onClose, 
  onSave, 
  isParent = true,
  features = [],
  categories = [] 
}: MenuCreateModalProps) {
  const [name, setName] = useState('')
  const [iconName, setIconName] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [showIconSelector, setShowIconSelector] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedFeatureId, setSelectedFeatureId] = useState<number | null>(null)
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([])
  const [allModules, setAllModules] = useState<any[]>([])

  useEffect(() => {
    if (!isOpen) {
      setName('')
      setIconName('')
      setUrl('')
      setDescription('')
      setSelectedFeatureId(null)
      setSelectedModuleIds([])
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      const fetchModules = async () => {
        try {
          const response = await fetch('/api/admin/modules/list')
          const data = await response.json()
          if (data.success) {
            setAllModules(data.modules)
          }
        } catch (err) {
          console.error('Erro ao carregar módulos:', err)
        }
      }
      fetchModules()
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!name || !iconName) return
    
    setLoading(true)
    try {
      await onSave({
        name,
        icon_name: iconName,
        url: isParent ? null : (url || null),
        description: description || null,
        is_active: isActive,
        parent_id: isParent ? null : undefined,
        order_index: 0,
        feature_id: isParent ? null : selectedFeatureId,
        // @ts-ignore
        module_ids: selectedModuleIds
      })
      onClose()
      setName('')
      setIconName('')
      setUrl('')
      setDescription('')
      setSelectedFeatureId(null)
      setSelectedCategoryId(null)
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />

        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white p-8 text-left align-middle shadow-2xl transition-all border border-gray-100">
          {/* Header Master */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                <PlusIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  {isParent ? 'Novo Grupo Master' : 'Nova Funcionalidade'}
                </h2>
                <p className="text-sm text-gray-400 font-medium">Expanda a arquitetura da sua plataforma</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-300 hover:text-gray-900 hover:bg-gray-50 transition-all"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Identificação</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold transition-all"
                  placeholder="Nome do menu"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Ícone</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={iconName}
                    readOnly
                    onClick={() => setShowIconSelector(!showIconSelector)}
                    className="flex-1 h-12 px-4 bg-gray-50 border-transparent rounded-xl cursor-pointer hover:bg-gray-100 transition-all font-mono text-blue-600"
                    placeholder="Clique para selecionar"
                  />
                </div>
              </div>
            </div>



            {/* SELETOR DE MÓDULOS (MULTI-MÓDULO) */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                Destinos de Exibição (Módulos)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 italic">
                {allModules.map((mod) => {
                  const isSelected = selectedModuleIds.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedModuleIds(prev => prev.filter(id => id !== mod.id));
                        } else {
                          setSelectedModuleIds(prev => [...prev, mod.id]);
                        }
                      }}
                      className={`flex items-center p-3 rounded-xl border-2 transition-all ${
                        isSelected 
                        ? 'border-blue-600 bg-white text-blue-900 shadow-md' 
                        : 'border-transparent bg-white/50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md border-2 mr-2 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-200'
                      }`}>
                         {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className="text-[10px] font-black truncate">{mod.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {showIconSelector && (
              <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 max-h-64 overflow-y-auto custom-scrollbar shadow-inner">
                <IconSelector
                  selected={iconName}
                  onSelect={(icon) => {
                    setIconName(icon)
                    setShowIconSelector(false)
                  }}
                />
              </div>
            )}

            {!isParent && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center">
                  Vincular Funcionalidade do Sistema
                  <SparklesIcon className="h-3 w-3 ml-2 text-blue-500" />
                </label>
                <select
                  value={selectedFeatureId || ''}
                  onChange={(e) => {
                    const featureId = Number(e.target.value) || null
                    setSelectedFeatureId(featureId)
                    
                    if (featureId) {
                      const feature = features.find(f => f.id === featureId)
                      if (feature && (feature.url || feature.slug)) {
                        setUrl(feature.url || `/${feature.slug}`)
                      }
                    }
                  }}
                  className="w-full h-12 px-4 bg-blue-50/30 border border-blue-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 font-bold text-blue-900 transition-all cursor-pointer"
                >
                  <option value="">Selecione para ativar a Hierarquia de Ferro</option>
                  {features.map(feature => (
                    <option key={feature.id} value={feature.id}>
                      {feature.name} ({feature.url || feature.slug})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-4">
              <div className={`space-y-2 ${isParent ? 'opacity-50 grayscale' : ''}`}>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                  URL da Aplicação {isParent && '(Desativado para Grupos)'}
                </label>
                <input
                  type="text"
                  value={isParent ? '' : url}
                  disabled={isParent}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                  placeholder={isParent ? "Grupos não possuem link direto" : "/admin/..."}
                />
              </div>

              <div className="p-1 bg-gray-50 rounded-2xl">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 bg-transparent border-none focus:ring-0 text-sm text-gray-600 placeholder:text-gray-300 italic"
                  rows={2}
                  placeholder="Breve descrição da finalidade deste menu..."
                />
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-gray-900 transition-all"
            >
              Descartar
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !name || !iconName}
              className={`flex items-center px-8 py-3 rounded-2xl text-sm font-black shadow-xl transition-all ${
                loading || !name || !iconName
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
              }`}
            >
              {loading ? (
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlusIcon className="h-4 w-4 mr-2" />
              )}
              {isParent ? 'Criar Grupo Master' : 'Criar Funcionalidade'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
