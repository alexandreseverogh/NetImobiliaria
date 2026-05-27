'use client'

import { XMarkIcon, MagnifyingGlassIcon, PlusIcon, TrashIcon, LinkIcon, LinkSlashIcon } from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/useApi'
import CreateSystemFeatureModal from '@/components/admin/CreateSystemFeatureModal'

interface Feature {
  id: number
  name: string
  url: string
  description?: string
  is_active: boolean
  category_id: number | null
  Crud_Execute?: string
}

interface Category {
  id: number
  name: string
  features?: Feature[]
}

interface CategoryFeaturesModalProps {
  category: Category
  onClose: () => void
  onUpdate?: () => void
}

export default function CategoryFeaturesModal({ category, onClose, onUpdate }: CategoryFeaturesModalProps) {
  const { get, put, del } = useApi()
  const [searchTerm, setSearchTerm] = useState('')
  const [allFeatures, setAllFeatures] = useState<Feature[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'linked' | 'available'>('linked')

  const fetchAllFeatures = useCallback(async () => {
    try {
      setLoading(true)
      const response = await get('/api/admin/system-features')
      if (response.ok) {
        const data = await response.json()
        setAllFeatures(data.features || [])
      }
    } catch (error) {
      console.error('Erro ao buscar todas as funcionalidades:', error)
    } finally {
      setLoading(false)
    }
  }, [get])

  useEffect(() => {
    fetchAllFeatures()
  }, [fetchAllFeatures])

  const handleToggleLink = async (feature: Feature, shouldLink: boolean) => {
    try {
      setProcessingId(feature.id)
      setMessage(null)
      
      const response = await put(`/api/admin/system-features/${feature.id}`, {
        name: feature.name,
        description: feature.description || '',
        url: feature.url,
        is_active: feature.is_active,
        category_id: shouldLink ? category.id : null,
        crud_execute: feature.Crud_Execute || 'CRUD'
      })

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Funcionalidade ${shouldLink ? 'vinculada' : 'desvinculada'} com sucesso!` 
        })
        await fetchAllFeatures()
        if (onUpdate) onUpdate()
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Erro ao processar alteração' })
      }
    } catch (error) {
      console.error('Erro ao alternar vínculo:', error)
      setMessage({ type: 'error', text: 'Erro de conexão com o servidor' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeleteFeature = async (feature: Feature) => {
    if (!confirm(`Tem certeza que deseja excluir permanentemente a funcionalidade "${feature.name}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    try {
      setProcessingId(feature.id)
      const response = await del(`/api/admin/system-features/${feature.id}`)

      if (response.ok) {
        setMessage({ type: 'success', text: 'Funcionalidade excluída permanentemente!' })
        await fetchAllFeatures()
        if (onUpdate) onUpdate()
      } else {
        const errorData = await response.json()
        setMessage({ type: 'error', text: errorData.error || 'Erro ao excluir funcionalidade' })
      }
    } catch (error) {
      console.error('Erro ao excluir:', error)
      setMessage({ type: 'error', text: 'Erro ao excluir funcionalidade' })
    } finally {
      setProcessingId(null)
    }
  }

  const linkedFeatures = allFeatures.filter(f => f.category_id === category.id)
  const availableFeatures = allFeatures.filter(f => f.category_id !== category.id)

  const displayFeatures = activeTab === 'linked' ? linkedFeatures : availableFeatures
  const filteredFeatures = displayFeatures.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.url.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
        <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-gray-50/80 px-8 py-6 flex items-center justify-between border-b border-gray-100 shrink-0">
            <div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
                Funcionalidades de {category.name}
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Gerencie os recursos vinculados a esta categoria
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                title="Nova Funcionalidade"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Feedback Message */}
          {message && (
            <div className={`px-8 py-3 text-xs font-bold text-center ${
              message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-100 shrink-0">
            <button
              onClick={() => setActiveTab('linked')}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'linked' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              Vinculadas ({linkedFeatures.length})
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'available' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-400 hover:bg-gray-50'
              }`}
            >
              Disponíveis ({availableFeatures.length})
            </button>
          </div>

          {/* Search */}
          <div className="px-8 py-4 bg-white border-b border-gray-50 shrink-0">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === 'linked' ? "Buscar nestas..." : "Buscar em todas as outras..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6 overflow-y-auto custom-scrollbar flex-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Carregando funcionalidades...</p>
              </div>
            ) : filteredFeatures.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {filteredFeatures.map((feature) => (
                  <div 
                    key={feature.id}
                    className="flex items-center justify-between p-4 bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-100 rounded-2xl transition-all group"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-black text-gray-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors truncate">
                        {feature.name}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400 font-bold truncate">
                        {feature.url}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      {processingId === feature.id ? (
                        <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <button
                            onClick={() => handleToggleLink(feature, activeTab === 'available')}
                            className={`p-2 rounded-lg transition-all ${
                              activeTab === 'linked' 
                                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' 
                                : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                            }`}
                            title={activeTab === 'linked' ? "Desvincular" : "Vincular a esta categoria"}
                          >
                            {activeTab === 'linked' ? <LinkSlashIcon className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteFeature(feature)}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                            title="Excluir Permanentemente"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-400 font-medium italic">Nenhuma funcionalidade encontrada.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50/80 px-8 py-4 flex justify-end border-t border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
            {filteredFeatures.length} funcionalidades exibidas
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreateSystemFeatureModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={(msg) => {
            setMessage({ type: 'success', text: msg })
            fetchAllFeatures()
            setShowCreateModal(false)
            if (onUpdate) onUpdate()
          }}
          onError={(msg) => setMessage({ type: 'error', text: msg })}
        />
      )}
    </>
  )
}

