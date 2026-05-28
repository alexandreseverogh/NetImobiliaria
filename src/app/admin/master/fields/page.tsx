'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import { 
  SquaresPlusIcon, 
  TagIcon, 
  AdjustmentsHorizontalIcon,
  ArchiveBoxIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { CreateGuard, DeleteGuard } from '@/components/admin/PermissionGuard'

export default function FieldBuilderPage() {
  const { get, post } = useApi()
  const [segment, setSegment] = useState('imobiliaria')
  const [entity, setEntity] = useState('lead')
  const [fields, setFields] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [simulationValues, setSimulationValues] = useState<Record<string, string>>({})
  
  const [newField, setNewField] = useState({
    entity_name: 'lead',
    segment: 'imobiliaria',
    field_name: '',
    label: '',
    field_type: 'text',
    options: [] as {label: string, value: string}[]
  })

  const fetchFields = async () => {
    try {
      setLoading(true)
      const response = await get(`/api/admin/master/fields?segment=${segment}&entity=${entity}`)
      if (response.ok) {
        const data = await response.json()
        setFields(data.fields)
      }
    } catch (error) {
      console.error('Erro ao buscar campos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFields()
    setNewField(prev => ({ ...prev, segment, entity_name: entity }))
  }, [segment, entity])

  const handleCreateField = async () => {
    if (!newField.field_name || !newField.label) return alert('Campos obrigatórios faltando')
    
    try {
      const response = await post('/api/admin/master/fields', newField)
      if (response.ok) {
        setShowModal(false)
        setNewField({
          entity_name: 'lead',
          segment,
          field_name: '',
          label: '',
          field_type: 'text',
          options: []
        })
        fetchFields()
      }
    } catch (error) {
      alert('Erro ao criar campo')
    }
  }

  const addOption = () => {
    setNewField({
      ...newField,
      options: [...newField.options, { label: '', value: '' }]
    })
  }

  const updateOption = (index: number, key: 'label' | 'value', val: string) => {
    const newOptions = [...newField.options]
    newOptions[index][key] = val
    setNewField({ ...newField, options: newOptions })
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen pb-24">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center">
              <SquaresPlusIcon className="h-10 w-10 text-indigo-600 mr-4" />
              Construtor de Campos (Field Builder)
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-2 ml-14">
              Engenharia de Metadados Multissegmento
            </p>
          </div>
          
          <div className="flex gap-4">
            <select 
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="px-6 py-3 bg-indigo-50 border border-indigo-100 rounded-xl font-black text-indigo-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 uppercase text-xs"
            >
              <option value="lead">Entidade: Leads</option>
              <option value="property">Entidade: Imóveis</option>
            </select>

            <select 
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              <option value="imobiliaria">Segmento: Imobiliária</option>
              <option value="saude">Segmento: Saúde</option>
              <option value="geral">Segmento: Geral</option>
            </select>
            
            <CreateGuard resource="field-builder">
              <button
                onClick={() => setShowModal(true)}
                className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" /> Novo Campo
              </button>
            </CreateGuard>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Lista de Campos Definidos */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6 flex justify-between items-center">
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">
                {entity === 'lead' ? 'Campos de Prospect (Leads)' : 'Atributos de Inventário (Imóveis)'} - {segment}
              </h3>
              <span className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500">{fields.length} CAMPOS</span>
            </div>

            {loading ? (
              <div className="p-20 text-center font-bold text-slate-400 italic">Sincronizando metadados...</div>
            ) : fields.length === 0 ? (
              <div className="p-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <ArchiveBoxIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-bold">Nenhum campo definido para {entity} neste segmento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((field) => (
                  <div key={field.id} className="bg-white p-6 rounded-2xl border border-slate-100 hover:border-indigo-300 transition-all shadow-sm group">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-2 rounded-lg text-xs font-black uppercase tracking-tighter ${
                        field.field_type === 'select' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {field.field_type}
                      </div>
                      <DeleteGuard resource="field-builder">
                        <button className="text-slate-300 hover:text-red-500 transition-colors">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </DeleteGuard>
                    </div>
                    <h4 className="font-black text-slate-900 text-lg mb-1">{field.label}</h4>
                    <p className="text-xs font-mono text-slate-400 font-bold mb-4">{field.field_name}</p>
                    
                    {field.options && (
                      <div className="flex flex-wrap gap-2">
                        {field.options.map((opt: any, i: number) => (
                          <span key={i} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold text-slate-600">
                            {opt.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Simulador de UI */}
          <div>
            <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl sticky top-8">
              <h3 className="text-white font-black text-lg mb-6 flex items-center">
                <EyeIcon className="h-6 w-6 mr-2 text-indigo-400" />
                Simulador de UI
              </h3>
              <p className="text-slate-400 text-xs font-medium mb-8 leading-relaxed">
                Veja como os campos customizados serão renderizados para o usuário final no formulário de Leads.
              </p>
              
              <div className="space-y-6">
                {fields.map((field) => (
                  <div key={field.id} className="animate-in fade-in slide-in-from-right-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      {field.label} {field.is_required && <span className="text-red-400">*</span>}
                    </label>
                    {field.field_type === 'select' ? (
                      <select 
                        onChange={(e) => setSimulationValues({...simulationValues, [field.field_name]: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-all shadow-inner"
                      >
                        <option value="">Selecione uma opção...</option>
                        {field.options?.map((opt: any, i: number) => (
                          <option key={i} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type={field.field_type} 
                        onChange={(e) => setSimulationValues({...simulationValues, [field.field_name]: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none placeholder-slate-600 focus:border-indigo-500 transition-all shadow-inner"
                        placeholder={`Digite ${field.label.toLowerCase()}...`}
                      />
                    )}
                    {simulationValues[field.field_name] && (
                      <div className="mt-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-tighter">
                          Valor Simulado: 
                          <span className="text-white ml-1">
                            {simulationValues[field.field_name]}
                            {field.field_type === 'select' && field.options?.find((o: any) => o.value === simulationValues[field.field_name]) && (
                              <span className="text-indigo-300/50 ml-2 italic">
                                ({field.options.find((o: any) => o.value === simulationValues[field.field_name]).label})
                              </span>
                            )}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                {fields.length === 0 && (
                  <div className="py-10 text-center border border-dashed border-slate-700 rounded-2xl">
                    <p className="text-slate-600 text-[10px] font-black uppercase">Nenhum campo para simular</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Modal: Novo Campo */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                <h3 className="text-xl font-black text-slate-900 flex items-center">
                  <AdjustmentsHorizontalIcon className="h-6 w-6 mr-2 text-indigo-600" />
                  Novo Campo Customizado
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <TrashIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Nome Visual (Label)</label>
                  <input 
                    type="text" 
                    value={newField.label}
                    onChange={e => setNewField({...newField, label: e.target.value})}
                    placeholder="Ex: Convênio Médico"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold" 
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Chave Técnica (Field Name)</label>
                  <input 
                    type="text" 
                    value={newField.field_name}
                    onChange={e => setNewField({...newField, field_name: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                    placeholder="ex: convenio_medico"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs font-bold" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Use apenas letras minúsculas e underscores.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Tipo de Dado</label>
                    <select 
                      value={newField.field_type}
                      onChange={e => setNewField({...newField, field_type: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 font-bold outline-none ring-offset-2 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="text">Texto</option>
                      <option value="number">Número</option>
                      <option value="date">Data</option>
                      <option value="boolean">Verdadeiro/Falso</option>
                      <option value="select">Seleção (Dropdown)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Obrigatório?</label>
                    <div className="flex items-center mt-3">
                      <input type="checkbox" className="h-5 w-5 text-indigo-600 rounded" />
                      <span className="ml-2 text-sm font-bold text-slate-600">Sim, campo obrigatório</span>
                    </div>
                  </div>
                </div>

                {newField.field_type === 'select' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Opções do Dropdown</h4>
                      <button 
                        onClick={addOption}
                        className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 transition-all"
                      >
                        + ADICIONAR OPÇÃO
                      </button>
                    </div>
                    {newField.options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Label (Ex: Unimed)" 
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs" 
                          value={opt.label}
                          onChange={e => updateOption(i, 'label', e.target.value)}
                        />
                        <input 
                          type="text" 
                          placeholder="Valor (Ex: unimed)" 
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono" 
                          value={opt.value}
                          onChange={e => updateOption(i, 'value', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-100 transition-all uppercase text-xs"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateField}
                  className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all uppercase text-xs shadow-lg shadow-indigo-200"
                >
                  Criar Campo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
