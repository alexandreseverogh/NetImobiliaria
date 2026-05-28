'use client'

import { useState, useEffect } from 'react'
import { CreateGuard, UpdateGuard, DeleteGuard } from '@/components/admin/PermissionGuard'
import {
  CubeIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  XCircleIcon,
  Cog6ToothIcon,
  DevicePhoneMobileIcon,
  PresentationChartLineIcon,
  SquaresPlusIcon,
  RectangleStackIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import AuditGovernanceModal from '@/components/admin/master/modules/AuditGovernanceModal'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'

interface Module {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  is_active: boolean
  created_at: string
  category_count?: number
  features_count?: number
}

interface FeatureItem {
  id: number
  name: string
  slug: string
  category_name: string
  is_assigned: boolean
}

export default function MasterModulesPage() {
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)
  const [currentModuleForCategories, setCurrentModuleForCategories] = useState<Module | null>(null)
  const [moduleCategories, setModuleCategories] = useState<any[]>([])
  const [savingCategories, setSavingCategories] = useState(false)
  const [editingModule, setEditingModule] = useState<Module | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingModule, setViewingModule] = useState<Module | null>(null)
  const [showAuditModal, setShowAuditModal] = useState(false)

  // Features modal
  const [showFeaturesModal, setShowFeaturesModal] = useState(false)
  const [currentModuleForFeatures, setCurrentModuleForFeatures] = useState<Module | null>(null)
  const [moduleFeatures, setModuleFeatures] = useState<FeatureItem[]>([])
  const [savingFeatures, setSavingFeatures] = useState(false)
  const [featureSearch, setFeatureSearch] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'cube',
    is_active: true
  })

  // Ícones disponíveis para seleção (simplificado)
  const availableIcons = [
    { name: 'Padrão', id: 'cube', icon: CubeIcon },
    { name: 'Configurações', id: 'cog', icon: Cog6ToothIcon },
    { name: 'CRM/Usuários', id: 'users', icon: CheckCircleIcon },
    { name: 'Marketing', id: 'megaphone', icon: GlobeAltIcon },
    { name: 'BI/Gráficos', id: 'chart', icon: PresentationChartLineIcon },
    { name: 'Mobile', id: 'mobile', icon: DevicePhoneMobileIcon },
  ]

  useEffect(() => {
    fetchModules()
  }, [])

  const fetchModules = async () => {
    try {
      const res = await fetch('/api/admin/master/modules')
      const data = await res.json()
      setModules(data.modules || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = editingModule ? 'PUT' : 'POST'
    const url = editingModule ? `/api/admin/master/modules/${editingModule.id}` : '/api/admin/master/modules'
    
    try {
      setIsSaving(true)
      const token = localStorage.getItem('admin-auth-token') || localStorage.getItem('accessToken')
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      
      const result = await res.json()

      if (res.ok) {
        toast.success(editingModule ? 'Motor tunado com sucesso!' : 'Novo motor inicializado!')
        setShowModal(false)
        setEditingModule(null)
        setFormData({ name: '', slug: '', description: '', icon: 'cube', is_active: true })
        fetchModules()
      } else {
        toast.error(result.error || 'Falha na ignição do motor.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro de comunicação com a central.')
    } finally {
      setIsSaving(false)
    }
  }

  const openEdit = (mod: Module) => {
    setEditingModule(mod)
    setFormData({
      name: mod.name,
      slug: mod.slug,
      description: mod.description || '',
      icon: mod.icon || 'cube',
      is_active: mod.is_active
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este módulo? Categorias vinculadas podem ser afetadas.')) return
    
    try {
      const res = await fetch(`/api/admin/master/modules/${id}`, { method: 'DELETE' })
      if (res.ok) fetchModules()
    } catch (err) {
      console.error(err)
    }
  }

  const fetchModuleCategories = async (modId: string) => {
    try {
      const res = await fetch(`/api/admin/master/modules/${modId}/categories`)
      const data = await res.json()
      if (data.success) setModuleCategories(data.categories)
    } catch (err) {
      console.error(err)
    }
  }

  const openCategories = async (mod: Module) => {
    setCurrentModuleForCategories(mod)
    setModuleCategories([])
    setShowCategoriesModal(true)
    await fetchModuleCategories(mod.id)
  }

  const handleSaveCategories = async () => {
    if (!currentModuleForCategories) return
    setSavingCategories(true)
    try {
      const assignedIds = moduleCategories.filter(c => c.is_assigned).map(c => c.id)
      const res = await fetch(`/api/admin/master/modules/${currentModuleForCategories.id}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_ids: assignedIds })
      })
      if (res.ok) {
        toast.success('Arquitetura sincronizada!')
        setShowCategoriesModal(false)
        fetchModules() // Atualiza os contadores nos cards
      } else {
        toast.error('Erro ao salvar categorias.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSavingCategories(false)
    }
  }

  const toggleCategory = (categoryId: number) => {
    setModuleCategories(prev => prev.map(c => {
      if (c.id === categoryId) return { ...c, is_assigned: !c.is_assigned }
      return c
    }))
  }

  // ── Features modal ──────────────────────────────────────────
  const fetchModuleFeatures = async (modId: string) => {
    try {
      const res = await fetch(`/api/admin/master/modules/${modId}/features`)
      const data = await res.json()
      if (data.success) setModuleFeatures(data.features)
    } catch (err) {
      console.error(err)
    }
  }

  const openFeatures = async (mod: Module) => {
    setCurrentModuleForFeatures(mod)
    setModuleFeatures([])
    setFeatureSearch('')
    setShowFeaturesModal(true)
    await fetchModuleFeatures(mod.id)
  }

  const toggleFeature = (featureId: number) => {
    setModuleFeatures(prev =>
      prev.map(f => f.id === featureId ? { ...f, is_assigned: !f.is_assigned } : f)
    )
  }

  const handleSaveFeatures = async () => {
    if (!currentModuleForFeatures) return
    setSavingFeatures(true)
    try {
      const assignedIds = moduleFeatures.filter(f => f.is_assigned).map(f => f.id)
      const res = await fetch(`/api/admin/master/modules/${currentModuleForFeatures.id}/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_ids: assignedIds }),
      })
      if (res.ok) {
        toast.success('Funcionalidades sincronizadas!')
        setShowFeaturesModal(false)
        fetchModules()
      } else {
        toast.error('Erro ao salvar funcionalidades.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Erro de comunicação.')
    } finally {
      setSavingFeatures(false)
    }
  }

  // Agrupa features filtradas por category_name
  const groupedFeatures = (() => {
    const filtered = moduleFeatures.filter(f =>
      featureSearch === '' ||
      f.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
      f.slug.toLowerCase().includes(featureSearch.toLowerCase())
    )
    const map: Record<string, FeatureItem[]> = {}
    filtered.forEach(f => {
      const cat = f.category_name || 'Sem Categoria'
      if (!map[cat]) map[cat] = []
      map[cat].push(f)
    })
    return map
  })()

  const assignedCount = moduleFeatures.filter(f => f.is_assigned).length

  if (loading) return <div className="p-8 text-center animate-pulse font-black text-gray-400">CARREGANDO MOTORES...</div>

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
              <CubeIcon className="h-8 w-8 mr-3 text-indigo-600" />
              Gestão de Módulos (Motores)
            </h1>
            <p className="text-gray-500 mt-2 font-medium uppercase text-[10px] tracking-[0.2em]">Definição de Portfólio de Produtos e Arquitetura Modular</p>
          </div>
          <CreateGuard resource="master-modules">
            <button
              onClick={() => {
                setEditingModule(null)
                setFormData({ name: '', slug: '', description: '', icon: 'cube', is_active: true })
                setShowModal(true)
              }}
              className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 uppercase text-[10px] tracking-widest"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Novo Motor
            </button>
          </CreateGuard>
          <button
            onClick={() => setShowAuditModal(true)}
            className="flex items-center px-6 py-3 bg-gray-900 text-white rounded-xl font-black shadow-lg hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 uppercase text-[10px] tracking-widest ml-4"
          >
            <ShieldCheckIcon className="h-4 w-4 mr-2 text-indigo-400" />
            Governança de Auditoria
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((mod) => (
            <div key={mod.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl hover:shadow-2xl transition-all group border-b-4 border-b-indigo-500">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 rounded-2xl bg-indigo-50 group-hover:bg-indigo-600 transition-colors">
                  <CubeIcon className="h-8 w-8 text-indigo-600 group-hover:text-white" />
                </div>
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <UpdateGuard resource="master-modules">
                    <button onClick={() => openEdit(mod)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                  </UpdateGuard>
                  <DeleteGuard resource="master-modules">
                    <button onClick={() => handleDelete(mod.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </DeleteGuard>
                </div>
              </div>

              <h3 className="font-black text-gray-900 uppercase text-sm tracking-tight mb-2">{mod.name}</h3>
              <p className="text-xs text-gray-500 font-medium mb-6 line-clamp-2 h-8 leading-relaxed">
                {mod.description || 'Nenhuma descrição fornecida para este motor.'}
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span>IDENTIFICADOR</span>
                  <span className="text-indigo-600">{mod.slug}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span>CAPACIDADE</span>
                  <span className="text-gray-900">{mod.category_count || 0} CATEGORIA(S)</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-50">
                <button
                  onClick={() => openCategories(mod)}
                  className="flex items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-tighter"
                  title="Configurar Arquitetura 1:N (Categorias)"
                >
                  <SquaresPlusIcon className="h-4 w-4 mr-1" />
                  Arquitetura
                </button>
                <button
                  onClick={() => openFeatures(mod)}
                  className="flex items-center justify-center p-3 bg-violet-50 text-violet-600 rounded-xl hover:bg-violet-600 hover:text-white transition-all text-[9px] font-black uppercase tracking-tighter"
                  title="Gerenciar Funcionalidades vinculadas ao Módulo"
                >
                  <RectangleStackIcon className="h-4 w-4 mr-1" />
                  Features
                </button>
                <button
                  onClick={() => {
                    setViewingModule(mod)
                    setShowViewModal(true)
                    fetchModuleCategories(mod.id)
                  }}
                  className="flex items-center justify-center p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-200 transition-all text-[9px] font-black uppercase tracking-tighter"
                >
                  <PresentationChartLineIcon className="h-4 w-4 mr-1" />
                  Visualizar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal de Categories 1:N */}
        {showCategoriesModal && currentModuleForCategories && (
          <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-3xl">
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
                    Arquitetura do Motor: <span className="text-indigo-600">{currentModuleForCategories.name}</span>
                  </h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Associação de Categorias (Módulo detém Categorias)</p>
                </div>
                <button onClick={() => {
                  setShowCategoriesModal(false)
                  setModuleCategories([])
                }} className="text-gray-400 hover:text-gray-900 transition-colors">
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 p-8 custom-scrollbar bg-white">
                {moduleCategories.length === 0 ? (
                   <div className="text-center py-10 text-gray-400 font-black uppercase text-sm animate-pulse">Carregando mapa de categorias...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {moduleCategories.map(c => (
                      <label key={c.id} className={`relative flex items-start p-4 rounded-2xl border-2 cursor-pointer transition-all ${c.is_assigned ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200'}`}>
                        <input 
                          type="checkbox" 
                          checked={c.is_assigned} 
                          onChange={() => toggleCategory(c.id)} 
                          className="h-5 w-5 mt-0.5 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500" 
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs font-black uppercase tracking-tight ${c.is_assigned ? 'text-indigo-900' : 'text-gray-700'}`}>{c.name}</p>
                          </div>
                          <p className="text-[9px] font-mono mt-1 text-gray-500">
                            {c.features_count} Funcionalidades
                          </p>
                          {c.current_module_name && !c.is_assigned && (
                            <p className="text-[9px] text-red-500 font-bold mt-1">
                              * Pertence a: {c.current_module_name}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50 rounded-b-3xl">
                <button onClick={() => setShowCategoriesModal(false)} className="px-6 py-3 font-black text-xs text-gray-500 uppercase tracking-widest hover:bg-gray-200 rounded-xl transition-all">Cancelar</button>
                <button onClick={handleSaveCategories} disabled={savingCategories} className="px-8 py-3 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg">
                  {savingCategories ? 'Sincronizando...' : 'Gravar Template do Motor'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Funcionalidades */}
        {showFeaturesModal && currentModuleForFeatures && (
          <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-3xl">
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
                    Funcionalidades: <span className="text-violet-600">{currentModuleForFeatures.name}</span>
                  </h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                    {assignedCount} funcionalidade{assignedCount !== 1 ? 's' : ''} vinculada{assignedCount !== 1 ? 's' : ''} — aparecerão na tela de provisionamento
                  </p>
                </div>
                <button
                  onClick={() => { setShowFeaturesModal(false); setModuleFeatures([]) }}
                  className="text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>

              <div className="px-8 pt-6 pb-4 border-b border-gray-100 bg-white flex items-center gap-4">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={featureSearch}
                    onChange={e => setFeatureSearch(e.target.value)}
                    placeholder="Buscar funcionalidade por nome ou slug..."
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-violet-500 border-none outline-none"
                  />
                </div>
                <button
                  onClick={() => setModuleFeatures(prev => prev.map(f => ({ ...f, is_assigned: true })))}
                  className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-violet-600 bg-violet-50 rounded-xl hover:bg-violet-600 hover:text-white transition-all whitespace-nowrap"
                >
                  Selecionar Todas
                </button>
                <button
                  onClick={() => setModuleFeatures(prev => prev.map(f => ({ ...f, is_assigned: false })))}
                  className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all"
                >
                  Limpar
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 p-8 custom-scrollbar bg-white">
                {moduleFeatures.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 font-black uppercase text-sm animate-pulse">
                    Carregando funcionalidades...
                  </div>
                ) : Object.keys(groupedFeatures).length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nenhuma funcionalidade encontrada.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedFeatures).map(([categoryName, features]) => (
                      <div key={categoryName}>
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-violet-500 mb-3 px-1">{categoryName}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {features.map(f => (
                            <label
                              key={f.id}
                              className={`relative flex items-start p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                f.is_assigned
                                  ? 'border-violet-500 bg-violet-50'
                                  : 'border-gray-100 hover:border-violet-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={f.is_assigned}
                                onChange={() => toggleFeature(f.id)}
                                className="h-5 w-5 mt-0.5 rounded text-violet-600 border-gray-300 focus:ring-violet-500"
                              />
                              <div className="ml-3 flex-1 min-w-0">
                                <p className={`text-xs font-black uppercase tracking-tight truncate ${f.is_assigned ? 'text-violet-900' : 'text-gray-700'}`}>
                                  {f.name}
                                </p>
                                <p className="text-[9px] font-mono text-gray-400 mt-0.5 truncate">{f.slug}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-4 bg-gray-50 rounded-b-3xl">
                <button
                  onClick={() => { setShowFeaturesModal(false); setModuleFeatures([]) }}
                  className="px-6 py-3 font-black text-xs text-gray-500 uppercase tracking-widest hover:bg-gray-200 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveFeatures}
                  disabled={savingFeatures}
                  className="px-8 py-3 bg-violet-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all shadow-lg shadow-violet-500/30"
                >
                  {savingFeatures ? 'Sincronizando...' : 'Gravar Funcionalidades'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de CRUD */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-end transition-all">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-left p-8">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                  {editingModule ? 'Ajustar Motor' : 'Criar Novo Motor'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900">
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Nome Comercial</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                    placeholder="Ex: CRM Intelligence"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Slug (Identificador)</label>
                  <input
                    required
                    disabled={!!editingModule}
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s/g, '-')})}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-xs disabled:opacity-50"
                    placeholder="ex: crm-sales"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Descrição Técnica</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
                    placeholder="Descreva o que este motor libera na plataforma..."
                  />
                </div>

                <div className="flex items-center space-x-3 bg-gray-50 p-4 rounded-2xl">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                  />
                  <span className="text-xs font-black text-gray-700 uppercase tracking-tight">Motor Ativo para Provisionamento</span>
                </div>

                <div className="pt-10">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`w-full py-5 text-white rounded-2xl font-black shadow-xl transition-all uppercase text-xs tracking-[0.3em] ${
                      isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/40'
                    }`}
                  >
                    {isSaving ? 'Processando...' : (editingModule ? 'Salvar Configurações' : 'Inicializar Motor')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Modal de Visualização (Identico a Categorias) */}
        {showViewModal && viewingModule && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[60] flex justify-center items-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                    <CubeIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
                      Estrutura do Motor: <span className="text-indigo-600">{viewingModule.name}</span>
                    </h2>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">CATEGORIAS HABILITADAS</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingModule(null)
                    setModuleCategories([])
                  }} 
                  className="text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
                {moduleCategories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="font-black uppercase text-[10px] tracking-widest">Consultando Mapa...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {moduleCategories.filter(c => c.is_assigned).length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nenhuma categoria associada a este módulo.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {moduleCategories.filter(c => c.is_assigned).map((c: any) => (
                          <div key={c.id} className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                            <div className="flex items-center space-x-3">
                              <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                              <div>
                                <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{c.name}</p>
                                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-tighter">
                                  {c.features_count} Funcionalidades Internas
                                </p>
                              </div>
                            </div>
                            <span className="text-[8px] font-black text-indigo-600 bg-indigo-100 px-2 py-1 rounded-md uppercase tracking-widest">
                              Ativo
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-center">
                <button 
                  onClick={() => {
                    setShowViewModal(false)
                    setViewingModule(null)
                    setModuleCategories([])
                  }}
                  className="px-10 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal de Auditoria Dinâmica */}
        <AuditGovernanceModal 
          isOpen={showAuditModal} 
          onClose={() => setShowAuditModal(false)} 
        />
      </div>
    </div>
  )
}
