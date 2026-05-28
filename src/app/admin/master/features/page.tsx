'use client'

import { useState, useEffect, useMemo } from 'react'
import { CreateGuard, UpdateGuard, DeleteGuard } from '@/components/admin/PermissionGuard'
import {
  PuzzlePieceIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XCircleIcon,
  CircleStackIcon,
  RectangleGroupIcon,
  CheckCircleIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
  BoltIcon
} from '@heroicons/react/24/outline'
import IconPickerModal from '@/components/ui/IconPickerModal'
import DynamicIcon from '@/components/common/DynamicIcon'

interface Feature {
  id: number
  name: string
  slug: string
  description: string
  is_active: boolean
  is_default_tenant_admin_feature: boolean
  category_id: number
  category_name: string
  sort_order: number
  module_ids: string[] // Array de IDs de módulos
  module_names: string // String concatenada de nomes de módulos
  url?: string
  icon?: string // Novo campo de ícone
  semantic_mapping?: any[] // Novo campo de mapeamento semântico
}

interface SystemTag {
  id: number
  tag_key: string
  display_name: string
}

interface Category {
  id: number
  name: string
  module_id?: string
  module_name?: string
}

interface Module {
  id: string
  name: string
}

export default function MasterFeaturesPage() {
  const [features, setFeatures] = useState<Feature[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [availableTags, setAvailableTags] = useState<SystemTag[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('')
  
  const [showModal, setShowModal] = useState(false)
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null)
  
  // Estado para o Módulo selecionado no modal (Apenas para filtrar as categorias visuais)
  const [selectedModuleInModal, setSelectedModuleInModal] = useState('')
  
  // Estado para controle do modal de ícones
  const [showIconPicker, setShowIconPicker] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    category_id: 0,
    is_active: true,
    is_default_tenant_admin_feature: false,
    sort_order: 0,
    module_ids: [] as string[],
    icon: '',
    url: '',
    semantic_mapping: [] as any[]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/master/features')
      const data = await res.json()
      setFeatures(data.features || [])
      setModules(data.availableModules || [])
      setCategories(data.availableCategories || [])
      setAvailableTags(data.availableTags || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredFeatures = useMemo(() => {
    return features.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           f.slug.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesModule = selectedModuleFilter === '' || f.module_ids.includes(selectedModuleFilter);
      return matchesSearch && matchesModule
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [features, searchTerm, selectedModuleFilter])

  const availableCategoriesForModule = useMemo(() => {
    return categories.filter(c => c.module_id === selectedModuleInModal)
  }, [categories, selectedModuleInModal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const method = editingFeature ? 'PATCH' : 'POST'
    const url = editingFeature ? `/api/admin/master/features?id=${editingFeature.id}` : '/api/admin/master/features'
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (res.ok) {
        setShowModal(false)
        setEditingFeature(null)
        fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const openEdit = (feat: Feature) => {
    setEditingFeature(feat)
    // Inicializa o seletor de categorias com o módulo da primeira categoria ou o primeiro módulo associado
    const initialModId = feat.module_ids?.[0] || modules[0]?.id || '';
    setSelectedModuleInModal(initialModId);
    
    setFormData({
      name: feat.name,
      slug: feat.slug,
      description: feat.description || '',
      category_id: feat.category_id,
      is_active: feat.is_active,
      is_default_tenant_admin_feature: feat.is_default_tenant_admin_feature || false,
      sort_order: feat.sort_order || 0,
      module_ids: feat.module_ids || [],
      icon: feat.icon || '',
      url: feat.url || '',
      semantic_mapping: feat.semantic_mapping || []
    })
    setShowModal(true)
  }

  const toggleModuleInFeature = (mid: string) => {
    setFormData(prev => {
        const currentlySelected = prev.module_ids.includes(mid)
        if (currentlySelected) {
            return { ...prev, module_ids: prev.module_ids.filter(id => id !== mid) }
        } else {
            return { ...prev, module_ids: [...prev.module_ids, mid] }
        }
    })
  }

  const handleDelete = async (id: number) => {
    if (!confirm('EXTREMA ATENÇÃO: Deseja realmente excluir esta funcionalidade? Se ela estiver vinculada a algum item da sidebar ou provisionamento de empresas, esses vínculos serão perdidos.')) return;
    
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/master/features?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Erro ao excluir funcionalidade.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center animate-pulse font-black text-gray-400 italic">ACIONANDO GOVERNANÇA...</div>

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center italic">
              <BoltIcon className="h-8 w-8 mr-3 text-emerald-600" />
              Governança de Motores (Features V2)
            </h1>
            <p className="text-gray-500 mt-2 font-medium uppercase text-[10px] tracking-[0.2em]">Configuração Multi-Módulo (N:N) - Arquitetura de Portfólio Agnóstico</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisar feature ou slug..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
                />
             </div>
             
             <select 
                value={selectedModuleFilter}
                onChange={(e) => setSelectedModuleFilter(e.target.value)}
                className="bg-white border-none rounded-2xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-emerald-500 text-sm font-black uppercase tracking-tight"
             >
                <option value="">FILTRAR POR MOTOR</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
             </select>

            <CreateGuard resource="funcionalidades-sistema">
              <button
                onClick={() => {
                  setEditingFeature(null)
                  setSelectedModuleInModal(modules[0]?.id || '')
                  setFormData({
                     name: '',
                     slug: '',
                     description: '',
                     category_id: categories[0]?.id || 0,
                     is_active: true,
                     is_default_tenant_admin_feature: false,
                     sort_order: 0,
                     module_ids: [],
                     icon: '',
                     url: '',
                     semantic_mapping: []
                  })
                  setShowModal(true)
                }}
                className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95 uppercase text-[10px] tracking-widest ml-auto"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Nova Funcionalidade
              </button>
            </CreateGuard>
          </div>
        </div>

        {/* LISTAGEM MASTER V2 */}
        <div className="bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 overflow-hidden border border-gray-100">
          <div className="overflow-x-auto overflow-y-auto max-h-[70vh] custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white border-b border-gray-800">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] w-1/4">Funcionalidade</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] w-1/6">Categoria</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] w-1/5 text-center">Slug de Permissão</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] w-1/5 text-center">URL de Acesso</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] w-1/4">Motores Habilitadores</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] w-[150px] text-right pr-12">Gestão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredFeatures.map((feat) => (
                  <tr key={feat.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <div className="flex items-center">
                          <DynamicIcon iconName={feat.icon || ''} className="h-4 w-4 text-emerald-500 mr-2" />
                          <span className="font-black text-gray-900 uppercase text-xs tracking-tight">{feat.name}</span>
                          {feat.is_active ? 
                           <span className="h-1.5 w-1.5 bg-green-500 rounded-full ml-2 shadow-sm" /> : 
                           <span className="h-1.5 w-1.5 bg-gray-300 rounded-full ml-2" />
                          }
                        </div>
                        {feat.is_default_tenant_admin_feature && (
                          <span className="text-[8px] text-emerald-600 font-black uppercase mt-0.5 tracking-tighter">Padrão Admin</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="bg-blue-50 text-blue-700 text-[9px] font-black px-3 py-1 rounded-lg border border-blue-100 uppercase tracking-widest shadow-sm">
                        {feat.category_name || 'Sem Categoria'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <code className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        {feat.slug}
                      </code>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        {feat.url || '---'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-wrap gap-2">
                       {(feat.module_names || '').split(', ').filter(Boolean).map((mname, i) => (
                          <span key={i} className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-gray-200 ${
                            mname.includes('CRM') ? 'bg-orange-50 text-orange-600' : 
                            mname.includes('Admin') ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-500'
                          }`}>
                            {mname}
                          </span>
                       ))}
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right pr-12">
                      <div className="flex justify-end space-x-2">
                        <UpdateGuard resource="funcionalidades-sistema">
                          <button onClick={() => openEdit(feat)} className="p-3 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all hover:scale-110" title="Editar Feature">
                            <PencilSquareIcon className="h-5 w-5" />
                          </button>
                        </UpdateGuard>
                        <DeleteGuard resource="funcionalidades-sistema">
                          <button onClick={() => handleDelete(feat.id)} className="p-3 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all hover:scale-110" title="Excluir Feature">
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </DeleteGuard>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DE ASSOCIAÇÃO MULTI-MÓDULO V2 */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-end transition-all">
            <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-left p-10 overflow-hidden">
              <div className="flex justify-between items-center mb-10 shrink-0">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                    {editingFeature ? 'Upgrade de Feature' : 'Cadastrar Motores'}
                  </h2>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Sincronização entre produtos e funcionalidades</p>
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-900">
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto space-y-8 pr-4 custom-scrollbar">
                    
                    {/* DADOS BÁSICOS */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Nome Comercial</label>
                            <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Slug de Segurança</label>
                            <input
                            required
                            type="text"
                            value={formData.slug}
                            onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s/g, '-')})}
                            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-xs"
                            />
                        </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Descrição Técnica</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                rows={2}
                                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 font-medium text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">URL de Acesso (Frontend)</label>
                            <input
                                type="text"
                                value={formData.url}
                                onChange={(e) => setFormData({...formData, url: e.target.value})}
                                placeholder="Ex: /admin/parametros/imoveis"
                                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Ícone</label>
                            <div className="flex items-center space-x-4">
                                <div className="h-14 w-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                                    <DynamicIcon iconName={formData.icon || ''} className="h-6 w-6 text-emerald-600" />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowIconPicker(true)}
                                    className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                                >
                                    {formData.icon ? 'Alterar Ícone' : 'Escolher Ícone'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* CONFIGURAÇÕES DE PROVISIONAMENTO (CONTROLE DE KIT BÁSICO ADMIN) */}
                    <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 space-y-4">
                        <label className="flex items-center cursor-pointer group">
                           <div className="relative">
                              <input 
                                type="checkbox"
                                checked={formData.is_default_tenant_admin_feature}
                                onChange={(e) => setFormData({...formData, is_default_tenant_admin_feature: e.target.checked})}
                                className="sr-only"
                              />
                              <div className={`w-12 h-6 rounded-full transition-colors ${formData.is_default_tenant_admin_feature ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.is_default_tenant_admin_feature ? 'translate-x-6' : ''}`}></div>
                           </div>
                           <div className="ml-4">
                              <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest block">Provisionamento Automático</span>
                              <span className="text-[9px] text-blue-600/70 font-medium">Habilitar esta funcionalidade por padrão para todo novo Administrador homologado</span>
                           </div>
                        </label>
                    </div>


                    {/* SELEÇÃO DE MOTORES (MULTIPLE MODULES) CC MASTER */}
                    <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl">
                        <div className="flex items-center space-x-3">
                            <PuzzlePieceIcon className="h-6 w-6 text-emerald-400" />
                            <h3 className="text-xs font-black uppercase tracking-widest">Motores que Habilitam</h3>
                        </div>
                        <p className="text-[10px] font-medium text-gray-400 leading-relaxed italic">
                            Marque todos os módulos que, se habilitados para a empresa, darão acesso a esta funcionalidade na sidebar.
                        </p>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {modules.map(mod => (
                                <div 
                                    key={mod.id} 
                                    onClick={() => toggleModuleInFeature(mod.id)}
                                    className={`flex items-center justify-between p-4 rounded-3xl cursor-pointer transition-all border-2 ${
                                        formData.module_ids.includes(mod.id) ? 'bg-emerald-600/20 border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-gray-800/50 border-transparent hover:bg-gray-800'
                                    }`}
                                >
                                    <span className="text-xs font-black uppercase tracking-tight">{mod.name}</span>
                                    <div className={`h-5 w-5 rounded-lg flex items-center justify-center transition-all ${
                                        formData.module_ids.includes(mod.id) ? 'bg-emerald-500 text-white' : 'bg-gray-700 border border-gray-600'
                                    }`}>
                                        {formData.module_ids.includes(mod.id) && <CheckCircleIcon className="h-4 w-4" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* HIERARQUIA VISUAL (CATEGORIA) */}
                    <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 space-y-6">
                        <div className="flex flex-col">
                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center">
                                <RectangleGroupIcon className="h-4 w-4 mr-2" />
                                Hierarquia de Exibição (Sidebar)
                            </label>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[9px] font-black text-emerald-800/50 uppercase ml-1">Contexto Visual</span>
                                    <select 
                                        value={selectedModuleInModal}
                                        onChange={(e) => setSelectedModuleInModal(e.target.value)}
                                        className="w-full bg-white border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 font-black uppercase text-[10px] tracking-tight mt-2 shadow-sm"
                                    >
                                        <option value="">FILTRAR CATEGORIAS...</option>
                                        {modules.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-emerald-800/50 uppercase ml-1">Categoria de Destino</span>
                                    <select 
                                        required
                                        value={formData.category_id}
                                        onChange={(e) => setFormData({...formData, category_id: parseInt(e.target.value)})}
                                        className="w-full bg-white border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 font-bold text-sm mt-2 shadow-sm italic text-gray-700"
                                    >
                                        <option value="">Selecione uma categoria...</option>
                                        {availableCategoriesForModule.length > 0 ? (
                                          availableCategoriesForModule.map(c => (
                                            <option key={c.id} value={c.id}>
                                              {c.module_name ? `${c.module_name.toUpperCase()} > ` : ''}{c.name}
                                            </option>
                                          ))
                                        ) : (
                                          categories.map(c => (
                                            <option key={c.id} value={c.id}>
                                              {c.module_name ? `${c.module_name.toUpperCase()} > ` : ''}{c.name}
                                            </option>
                                          ))
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black text-emerald-800/50 uppercase ml-1">Ordem na Sidebar</span>
                                    <input 
                                        type="number"
                                        value={formData.sort_order}
                                        onChange={(e) => setFormData({...formData, sort_order: parseInt(e.target.value) || 0})}
                                        className="w-full bg-white border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 font-bold text-sm mt-2 shadow-sm text-gray-700"
                                        min="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MAPEAMENTO SEMÂNTICO (GOVERNANÇA DE CAMPOS) */}
                    <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 space-y-6">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center">
                                <CircleStackIcon className="h-4 w-4 mr-2" />
                                Mapeamento Semântico de Campos (Zero Hardcoding)
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData(prev => ({
                                        ...prev,
                                        semantic_mapping: [
                                            ...prev.semantic_mapping,
                                            { field: '', tag: '', label: '', required: false }
                                        ]
                                    }))
                                }}
                                className="px-3 py-1 bg-indigo-600 text-white text-[9px] font-black rounded-lg hover:bg-indigo-700 transition-all uppercase tracking-widest"
                            >
                                + Adicionar Campo
                            </button>
                        </div>

                        {formData.semantic_mapping.length === 0 ? (
                            <div className="text-center py-6 bg-white/50 rounded-2xl border border-dashed border-indigo-200">
                                <p className="text-[10px] text-indigo-400 font-bold italic">Nenhum mapeamento configurado. Adicione campos para governança dinâmica.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {formData.semantic_mapping.map((mapping, idx) => (
                                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-indigo-100 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">ID do Campo (HTML/Logic)</label>
                                                <input 
                                                    type="text"
                                                    value={mapping.field}
                                                    onChange={(e) => {
                                                        const newMapping = [...formData.semantic_mapping]
                                                        newMapping[idx].field = e.target.value
                                                        setFormData({...formData, semantic_mapping: newMapping})
                                                    }}
                                                    placeholder="ex: corretor_fk"
                                                    className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Tag do Sistema (Dicionário)</label>
                                                 <select 
                                                    value={mapping.tag}
                                                    onChange={(e) => {
                                                        const newMapping = [...formData.semantic_mapping]
                                                        newMapping[idx].tag = e.target.value
                                                        setFormData({...formData, semantic_mapping: newMapping})
                                                    }}
                                                    className="w-full bg-slate-50 border-none rounded-xl px-3 py-3 text-xs font-black uppercase text-slate-600 focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="">-- SELECIONE O CONTRATO --</option>
                                                    {availableTags.map(tag => (
                                                        <option key={tag.id} value={tag.tag_key}>{tag.display_name} ({tag.tag_key})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">Rótulo (Label de Exibição)</label>
                                                <input 
                                                    type="text"
                                                    value={mapping.label}
                                                    onChange={(e) => {
                                                        const newMapping = [...formData.semantic_mapping]
                                                        newMapping[idx].label = e.target.value
                                                        setFormData({...formData, semantic_mapping: newMapping})
                                                    }}
                                                    placeholder="ex: Selecione o Corretor"
                                                    className="w-full bg-slate-50 border-none rounded-xl px-3 py-2 text-xs font-bold text-slate-700"
                                                />
                                            </div>
                                            <div className="flex items-center space-x-2 mt-4">
                                                <input 
                                                    type="checkbox"
                                                    checked={mapping.required}
                                                    onChange={(e) => {
                                                        const newMapping = [...formData.semantic_mapping]
                                                        newMapping[idx].required = e.target.checked
                                                        setFormData({...formData, semantic_mapping: newMapping})
                                                    }}
                                                    className="rounded border-slate-200 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-[9px] font-black text-slate-500 uppercase">Obrigatório</span>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            semantic_mapping: prev.semantic_mapping.filter((_, i) => i !== idx)
                                                        }))
                                                    }}
                                                    className="ml-4 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* BOTÃO DE AÇÃO MASTER */}
                <div className="pt-8 bg-white shrink-0">
                  <button
                    type="submit"
                    className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black shadow-2xl shadow-gray-900/40 hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all uppercase text-xs tracking-[0.4em]"
                  >
                    {editingFeature ? 'Salvar Configuração Master' : 'Inicializar Feature no Sistema'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <IconPickerModal 
        isOpen={showIconPicker} 
        onClose={() => setShowIconPicker(false)} 
        onSelect={(iconName) => setFormData(prev => ({ ...prev, icon: iconName }))} 
        currentIcon={formData.icon}
      />
    </div>
  )
}
