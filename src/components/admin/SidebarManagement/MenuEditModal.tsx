'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, TrashIcon, CheckCircleIcon, ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { HybridIconSelector as IconSelector } from './HybridIconSelector'
import { MenuItem } from '@/hooks/useSidebarItems'

interface MenuEditModalProps {
  item: MenuItem | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<MenuItem>) => Promise<void>
  onDelete: (item: MenuItem) => Promise<void>
  onCreateChild?: (parentId: number) => void
  features?: any[]
  categories?: any[]
}

export function MenuEditModal({ 
  item, 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  onCreateChild,
  features = [],
  categories = [] 
}: MenuEditModalProps) {
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
    if (item) {
      setName(item.name)
      setIconName(item.icon_name)
      setUrl(item.url || '')
      setDescription(item.description || '')
      setIsActive(item.is_active)
      setSelectedFeatureId(item.feature_id || null)
      // @ts-ignore
      setSelectedModuleIds(item.module_ids || [])
    }
  }, [item])

  useEffect(() => {
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
  }, [])

  const handleSave = async () => {
    if (!item) return
    
    // Se for um item raiz com filhos, forçar URL nula (é um agrupador)
    const isTrulyParent = item.parent_id === null && (item.children?.length ?? 0) > 0;
    
    setLoading(true)
    try {
      // Enviar apenas os campos necessários para evitar recursão de children
      await onSave({
        id: item.id,
        name,
        icon_name: iconName,
        url: url === '' ? null : url,
        description: description || null,
        is_active: isActive,
        feature_id: selectedFeatureId,
        parent_id: item.parent_id,
        // @ts-ignore
        module_ids: selectedModuleIds
      })
      onClose()
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !item) return null

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        {/* Backdrop Premium */}
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />

        {/* Modal Content */}
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-3xl bg-white p-8 text-left align-middle shadow-2xl transition-all border border-gray-100">
          {/* Header Master */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                Design de Interface
              </h2>
              <p className="text-sm text-gray-400 font-medium">Configure as propriedades Master da sidebar</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-300 hover:text-gray-900 hover:bg-gray-50 transition-all"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Grid de Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                  Nome do Menu
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold transition-all"
                  placeholder="Ex: Master Dashboard"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                  Ícone Representativo
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={iconName}
                    readOnly
                    onClick={() => setShowIconSelector(!showIconSelector)}
                    className="flex-1 h-12 px-4 bg-gray-50 border-transparent rounded-xl cursor-pointer hover:bg-gray-100 transition-all font-mono text-blue-600"
                    placeholder="home, cog, etc..."
                  />
                  <button
                    onClick={() => setShowIconSelector(!showIconSelector)}
                    className="px-4 h-12 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"
                  >
                    Mudar
                  </button>
                </div>
              </div>
            </div>

            {/* URL Master */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                Endpoint da Aplicação (URL) {item.parent_id === null && (item.children?.length ?? 0) > 0 && '(Item Agrupador)'}
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full h-12 px-4 bg-gray-50 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition-all"
                placeholder="/admin/master/..."
              />
            </div>



            {/* Módulos de Exibição (Governança Multi-Módulo) - 100% DINÂMICO */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 flex items-center">
                Módulos de Exibição (Governança)
                <SparklesIcon className="h-3 w-3 ml-2 text-purple-500" />
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
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
                      className={`flex items-center p-3 rounded-xl border-2 transition-all group ${
                        isSelected 
                        ? 'border-purple-600 bg-white text-purple-900 shadow-md' 
                        : 'border-transparent bg-white/50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 mr-3 flex items-center justify-center transition-all ${
                        isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-200 group-hover:border-gray-300'
                      }`}>
                        {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                      </div>
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-purple-900' : 'text-gray-500'}`}>
                        {mod.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 font-medium pl-1">
                Selecione todos os módulos onde este item deve ser renderizado na sidebar.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                Funcionalidade do Sistema
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
                <option value="">Nenhuma Funcionalidade Vinculada</option>
                {features.map(feature => (
                  <option key={feature.id} value={feature.id}>
                    {feature.name} ({feature.url || feature.slug})
                  </option>
                ))}
              </select>
            </div>

            {/* Icon Selector Panel */}
            {showIconSelector && (
              <div className="p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 max-h-64 overflow-y-auto custom-scrollbar">
                <IconSelector
                  selected={iconName}
                  onSelect={(icon) => {
                    setIconName(icon)
                    setShowIconSelector(false)
                  }}
                />
              </div>
            )}

            {/* Visibility Settings */}
            <div className="flex items-center p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
               <div className="flex-1">
                 <h4 className="text-sm font-bold text-blue-900">Visibilidade na Sidebar</h4>
                 <p className="text-xs text-blue-600 font-medium">Defina se este item será renderizado para os usuários finais</p>
               </div>
               <button
                 onClick={() => setIsActive(!isActive)}
                 className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
               >
                 <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
               </button>
            </div>
          </div>

          {/* Footer Premium */}
          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={() => onDelete(item)}
              className="flex items-center px-4 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-sm font-bold"
            >
              <TrashIcon className="h-5 w-5 mr-2" />
              Excluir Registro
            </button>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-gray-900 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center px-8 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black shadow-xl hover:bg-black transition-all disabled:bg-gray-200"
              >
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                )}
                Confirmar Master
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}