'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import { 
  RocketLaunchIcon, 
  TagIcon, 
  CubeIcon, 
  FolderIcon, 
  SquaresPlusIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
  Bars3BottomLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  CircleStackIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export default function ProductCockpitPage() {
  const { get, post } = useApi()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ecosystem' | 'semantic'>('ecosystem')

  // Estado para Esquema do Banco
  const [dbSchema, setDbSchema] = useState<Record<string, any[]>>({})
  const [loadingSchema, setLoadingSchema] = useState(false)

  // Dados do Ecossistema
  const [segments, setSegments] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [segmentModules, setSegmentModules] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [features, setFeatures] = useState<any[]>([])

  // Dados do Dicionário Semântico
  const [semanticTags, setSemanticTags] = useState<any[]>([])
  const [showTagModal, setShowTagModal] = useState(false)
  const [isEditingTag, setIsEditingTag] = useState<any | null>(null)
  const [tagFormData, setTagFormData] = useState({
    tag_key: '',
    display_name: '',
    source_type: 'USER_ROLE',
    source_table: '',
    id_column: 'id',
    label_column: 'nome',
    description: ''
  })

  // Estado de Navegação (Seleção na Cascata)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)

  const fetchData = async () => {
    try {
      const response = await get('/api/admin/master/cockpit')
      if (response.ok) {
        const data = await response.json()
        setSegments(data.segments || [])
        setModules(data.modules || [])
        setSegmentModules(data.segmentModules || [])
        setCategories(data.categories || [])
        setFeatures(data.features || [])
        setSemanticTags(data.semanticTags || [])
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Falha ao carregar o ecossistema.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleToggle = async (action: string, sourceId: any, targetId: any, currentStatus: boolean) => {
    const isAssigned = !currentStatus;
    try {
      const response = await post('/api/admin/master/cockpit', { action, sourceId, targetId, isAssigned })
      if (response.ok) {
        fetchData();
        toast.success('Associação atualizada.');
      }
    } catch (error) {
      toast.error('Erro ao salvar.');
    }
  }

  const fetchDbSchema = async () => {
    if (Object.keys(dbSchema).length > 0) return;
    setLoadingSchema(true);
    try {
      const res = await get('/api/admin/master/db-schema');
      if (res.ok) {
        const data = await res.json();
        setDbSchema(data.schema || {});
      }
    } catch (error) {
      console.error('Erro ao carregar esquema:', error);
    } finally {
      setLoadingSchema(false);
    }
  }


  const handleDeleteTag = async (id: number, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o contrato '${name}'? Isso pode quebrar funcionalidades que o utilizam.`)) return;
    try {
      const response = await post('/api/admin/master/cockpit', { action: 'DELETE_TAG', id });
      if (response.ok) {
        toast.success('Contrato excluído.');
        fetchData();
      }
    } catch (error) {
      toast.error('Erro ao excluir.');
    }
  }

  const handleSaveTag = async () => {
    try {
      const action = isEditingTag ? 'UPDATE_TAG' : 'CREATE_TAG';
      const response = await post('/api/admin/master/cockpit', { 
        action, 
        tag: tagFormData, 
        id: isEditingTag?.id 
      });
      if (response.ok) {
        toast.success('Tag salva com sucesso!');
        setShowTagModal(false);
        fetchData();
      }
    } catch (error) {
      toast.error('Erro ao salvar tag.');
    }
  }

  // SUB-COMPONENTES DE RENDERIZAÇÃO
  const renderEcosystemTab = () => (
    <div className="flex-1 flex overflow-x-auto overflow-y-hidden space-x-6 custom-scrollbar pb-4 animate-in fade-in duration-500">
      {/* COLUNA 1: SEGMENTOS */}
      <div className="flex-shrink-0 w-80 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center text-slate-700 font-black uppercase text-[10px] tracking-widest">
            <TagIcon className="h-4 w-4 mr-2 text-indigo-500" /> Segmentos
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {segments.map(seg => (
            <button
              key={seg.id}
              onClick={() => { setSelectedSegment(seg.id); setSelectedModule(null); setSelectedCategory(null); }}
              className={`w-full text-left px-4 py-3 flex items-center justify-between rounded-xl transition-all ${
                selectedSegment === seg.id ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span className="font-bold text-xs uppercase">{seg.name}</span>
              <ChevronRightIcon className={`h-4 w-4 ${selectedSegment === seg.id ? 'text-white' : 'text-slate-300'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* COLUNA 2: MÓDULOS */}
      <div className={`flex-shrink-0 w-80 flex flex-col bg-white rounded-2xl shadow-sm border transition-all duration-300 ${selectedSegment ? 'border-indigo-200 opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
        <div className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
          <div className="flex items-center text-indigo-900 font-black uppercase text-[10px] tracking-widest">
            <CubeIcon className="h-4 w-4 mr-2 text-indigo-500" /> Módulos
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {modules.map(mod => {
            const isAssigned = segmentModules.some(sm => sm.segment_id === selectedSegment && sm.module_id === mod.id);
            const isSelected = selectedModule === mod.id;
            return (
              <div key={mod.id} className={`flex items-center justify-between p-3 rounded-xl border ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:bg-slate-50'}`}>
                <button onClick={() => { setSelectedModule(mod.id); setSelectedCategory(null); }} className="flex-1 text-left">
                  <div className="font-bold text-xs text-slate-800">{mod.name}</div>
                  <div className="text-[9px] font-mono text-slate-400">{mod.slug}</div>
                </button>
                <button 
                  onClick={() => handleToggle('TOGGLE_SEGMENT_MODULE', selectedSegment, mod.id, isAssigned)}
                  className={`h-5 w-9 rounded-full relative transition-colors ${isAssigned ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full transition-transform ${isAssigned ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* COLUNA 3: CATEGORIAS */}
      <div className={`flex-shrink-0 w-80 flex flex-col bg-white rounded-2xl shadow-sm border transition-all duration-300 ${selectedModule ? 'border-blue-200 opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
        <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
          <div className="flex items-center text-blue-900 font-black uppercase text-[10px] tracking-widest">
            <FolderIcon className="h-4 w-4 mr-2 text-blue-500" /> Categorias
          </div>
          <button onClick={() => setShowOrderModal(true)} className="p-1.5 hover:bg-white rounded-lg text-blue-600 transition-colors">
            <Bars3BottomLeftIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {categories.map(cat => {
            const isAssigned = cat.module_id === selectedModule;
            const isSelected = selectedCategory === cat.id;
            return (
              <div key={cat.id} className={`flex items-center justify-between p-3 rounded-xl border ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}>
                <button onClick={() => setSelectedCategory(cat.id)} className="flex-1 text-left">
                  <div className="font-bold text-xs text-slate-800">{cat.name}</div>
                  {cat.module_id && cat.module_id !== selectedModule && <span className="text-[8px] text-orange-500 font-black uppercase">⚠️ Outro</span>}
                </button>
                <button 
                  onClick={() => handleToggle('TOGGLE_MODULE_CATEGORY', selectedModule, cat.id, isAssigned)}
                  className={`h-5 w-9 rounded-full relative transition-colors ${isAssigned ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full transition-transform ${isAssigned ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* COLUNA 4: FEATURES */}
      <div className={`flex-shrink-0 w-80 flex flex-col bg-white rounded-2xl shadow-sm border transition-all duration-300 ${selectedCategory ? 'border-emerald-200 opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
        <div className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center text-emerald-900 font-black uppercase text-[10px] tracking-widest">
            <SquaresPlusIcon className="h-4 w-4 mr-2 text-emerald-500" /> Funcionalidades
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {features.map(feat => {
            const isAssigned = feat.category_id === selectedCategory;
            return (
              <div key={feat.id} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-slate-800 truncate">{feat.name}</div>
                  <div className="text-[9px] font-mono text-slate-400">{feat.slug}</div>
                </div>
                <button 
                  onClick={() => handleToggle('TOGGLE_CATEGORY_FEATURE', selectedCategory, feat.id, isAssigned)}
                  className={`h-5 w-9 rounded-full relative transition-colors ${isAssigned ? 'bg-emerald-500' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full transition-transform ${isAssigned ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const renderSemanticTab = () => (
    <div className="flex-1 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {semanticTags.map(tag => (
          <div key={tag.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:border-indigo-200 transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-3 text-[8px] font-black uppercase tracking-tighter ${tag.source_type === 'USER_ROLE' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
              {tag.source_type === 'USER_ROLE' ? 'Usuários/Perfis' : 'Tabela Genérica'}
            </div>
            <div className="flex items-center space-x-4 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <TagIcon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-slate-800 text-sm truncate uppercase">{tag.display_name}</h3>
                <code className="text-[10px] text-indigo-500 font-bold">{tag.tag_key}</code>
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <div className="flex items-center text-[10px] text-slate-500 font-bold">
                <CircleStackIcon className="h-3 w-3 mr-2" /> Fonte: {tag.source_table || 'N/A'}
              </div>
              <div className="flex items-center text-[10px] text-slate-500 font-bold">
                <Bars3BottomLeftIcon className="h-3 w-3 mr-2" /> Estrutura: {tag.id_column} → {tag.label_column}
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => {
                  setIsEditingTag(tag);
                  setTagFormData({ ...tag });
                  fetchDbSchema();
                  setShowTagModal(true);
                }}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              </button>
              <button 
                onClick={() => handleDeleteTag(tag.id, tag.display_name)}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Header Fixo */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 z-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center italic">
            <RocketLaunchIcon className="h-8 w-8 mr-3 text-indigo-600" />
            Master Product Cockpit
          </h1>
          <div className="flex items-center space-x-2">
             <Link href="/admin/master/segments" className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200">
               Segmentos
             </Link>
             <Link href="/admin/master/modules" className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200">
               Módulos
             </Link>
             <Link href="/admin/categorias" className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200">
               Categorias
             </Link>
             <Link href="/admin/master/features" className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all ml-2">
               Motores (Features)
             </Link>
          </div>
        </div>

        <div className="flex items-center space-x-8">
           <button 
             onClick={() => setActiveTab('ecosystem')}
             className={`text-[10px] font-black uppercase tracking-[0.2em] pb-2 border-b-2 transition-all ${activeTab === 'ecosystem' ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
           >
             Ecossistema (Cascata)
           </button>
           <button 
             onClick={() => setActiveTab('semantic')}
             className={`text-[10px] font-black uppercase tracking-[0.2em] pb-2 border-b-2 transition-all ${activeTab === 'semantic' ? 'text-indigo-600 border-indigo-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
           >
             Dicionário Semântico
           </button>
           <button 
             onClick={() => {
               setIsEditingTag(null);
               setTagFormData({ tag_key: '', display_name: '', source_type: 'USER_ROLE', source_table: '', id_column: 'id', label_column: 'nome', description: '' });
               fetchDbSchema();
               setShowTagModal(true);
             }}
             className="ml-auto text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center bg-indigo-50 px-4 py-2 rounded-xl transition-all"
           >
             <TagIcon className="h-4 w-4 mr-2" />
             NOVA TAG SISTÊMICA
           </button>
        </div>
      </div>

      {/* Área de Conteúdo */}
      <main className="flex-1 p-8 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center font-black text-slate-400 uppercase tracking-widest animate-pulse">
            Carregando Ecossistema...
          </div>
        ) : (
          activeTab === 'ecosystem' ? renderEcosystemTab() : renderSemanticTab()
        )}
      </main>

      {/* Modal de Tags */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 uppercase italic">Contrato Semântico</h3>
              <button onClick={() => setShowTagModal(false)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 rounded-full">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Chave Sistêmica (ID)</label>
                   <input 
                     type="text" 
                     value={tagFormData.tag_key} 
                     onChange={e => setTagFormData({...tagFormData, tag_key: e.target.value.toUpperCase()})} 
                     className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-xs font-bold" 
                     placeholder="EX: IMOB_CORRETOR" 
                   />
                 </div>
                 <div>
                   <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nome Amigável</label>
                   <input 
                     type="text" 
                     value={tagFormData.display_name} 
                     onChange={e => setTagFormData({...tagFormData, display_name: e.target.value})} 
                     className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-xs font-bold" 
                     placeholder="Corretor de Imóveis" 
                   />
                 </div>
              </div>

              {/* SELEÇÃO UNIVERSAL DE TABELA */}
              <div className="p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-4">
                 <div>
                   <label className="block text-[9px] font-black text-indigo-900 uppercase tracking-widest mb-2 px-1">Tabela de Origem dos Dados</label>
                   <select 
                     value={tagFormData.source_table} 
                     onChange={e => setTagFormData({
                       ...tagFormData, 
                       source_table: e.target.value, 
                       source_type: e.target.value === 'users' ? 'USER_ROLE' : 'TABLE',
                       id_column: e.target.value === 'users' ? 'id' : '',
                       label_column: e.target.value === 'users' ? 'nome' : ''
                     })} 
                     className="w-full bg-white border-none rounded-2xl px-5 py-3 text-xs font-black text-indigo-600 uppercase shadow-sm"
                   >
                     <option value="">-- SELECIONE UMA TABELA DO BANCO --</option>
                     {Object.keys(dbSchema).map(tableName => (
                       <option key={tableName} value={tableName}>{tableName.toUpperCase()}</option>
                     ))}
                   </select>
                 </div>

                 {tagFormData.source_table && (
                   <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-500">
                      <div>
                        <label className="block text-[8px] font-black text-indigo-900/50 uppercase tracking-widest mb-2 px-1">Coluna ID</label>
                        <select 
                          value={tagFormData.id_column} 
                          onChange={e => setTagFormData({...tagFormData, id_column: e.target.value})} 
                          className="w-full bg-white border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 shadow-sm"
                        >
                          <option value="">SELECIONE...</option>
                          {(dbSchema[tagFormData.source_table] || []).map(col => (
                            <option key={col.name} value={col.name}>{col.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[8px] font-black text-indigo-900/50 uppercase tracking-widest mb-2 px-1">Coluna Nome (Label)</label>
                        <select 
                          value={tagFormData.label_column} 
                          onChange={e => setTagFormData({...tagFormData, label_column: e.target.value})} 
                          className="w-full bg-white border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 shadow-sm"
                        >
                          <option value="">SELECIONE...</option>
                          {(dbSchema[tagFormData.source_table] || []).map(col => (
                            <option key={col.name} value={col.name}>{col.name}</option>
                          ))}
                        </select>
                      </div>
                   </div>
                 )}
              </div>

              <button 
                onClick={handleSaveTag} 
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-2xl hover:bg-black transition-all uppercase text-[10px] tracking-[0.4em] mt-8"
              >
                Salvar Contrato Semântico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
