'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import {
  PlusIcon,
  Squares2X2Icon,
  SwatchIcon,
  HashtagIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  CommandLineIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { CreateGuard, UpdateGuard } from '@/components/admin/PermissionGuard'
import { SegmentInterestsModal } from '@/components/admin/master/SegmentInterestsModal'

interface Segment {
  id: string
  name: string
  slug: string
  description: string
  icon: string
  color_theme: string
  is_active: boolean
  created_at: string
  module_ids: string[]
  module_names: string
  cpl_ideal:    number | null
  cpl_critical: number | null
  ctr_min:      number | null
}

interface Module {
  id: string
  name: string
  slug: string
}

export default function MasterSegmentsPage() {
  const { get, post, put } = useApi()
  const [segments, setSegments] = useState<Segment[]>([])
  const [availableModules, setAvailableModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null)
  const [interestsSegment, setInterestsSegment] = useState<Segment | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'box',
    color_theme: '#2563eb',
    is_active: true,
    module_ids: [] as string[],
    cpl_ideal:    '',
    cpl_critical: '',
    ctr_min:      '',
  })

  const fetchSegments = async () => {
    try {
      setLoading(true)
      const response = await get('/api/admin/master/segments')
      if (response.ok) {
        const data = await response.json()
        setSegments(data.segments)
        setAvailableModules(data.availableModules || [])
      }
    } catch (error) {
      console.error('Erro ao buscar segmentos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSegments()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = '/api/admin/master/segments'
      const response = editingSegment 
        ? await put(url, { ...formData, id: editingSegment.id })
        : await post(url, formData)

      if (response.ok) {
        setShowModal(false)
        setEditingSegment(null)
        setFormData({ name: '', slug: '', description: '', icon: 'box', color_theme: '#2563eb', is_active: true, module_ids: [], cpl_ideal: '', cpl_critical: '', ctr_min: '' })
        fetchSegments()
      } else {
        const err = await response.json()
        alert(err.error || 'Erro ao processar segmento')
      }
    } catch (error) {
      alert('Erro inesperado')
    }
  }

  const handleEdit = (segment: Segment) => {
    setEditingSegment(segment)
    setFormData({
      name:         segment.name,
      slug:         segment.slug,
      description:  segment.description || '',
      icon:         segment.icon || 'box',
      color_theme:  segment.color_theme || '#2563eb',
      is_active:    segment.is_active,
      module_ids:   segment.module_ids || [],
      cpl_ideal:    segment.cpl_ideal    != null ? String(segment.cpl_ideal)    : '',
      cpl_critical: segment.cpl_critical != null ? String(segment.cpl_critical) : '',
      ctr_min:      segment.ctr_min      != null ? String(segment.ctr_min)      : '',
    })
    setShowModal(true)
  }

  const toggleModule = (id: string) => {
    setFormData(prev => ({
      ...prev,
      module_ids: prev.module_ids.includes(id) 
        ? prev.module_ids.filter(mid => mid !== id)
        : [...prev.module_ids, id]
    }))
  }

  const stats = [
    { name: 'Total de Segmentos', value: segments.length, icon: Squares2X2Icon, color: 'text-blue-600' },
    { name: 'Nomes de Grife', value: segments.filter(s => s.is_active).length, icon: CheckCircleIcon, color: 'text-green-600' },
    { name: 'Temas Ativos', value: new Set(segments.map(s => s.color_theme)).size, icon: SwatchIcon, color: 'text-purple-600' },
  ]

  if (loading) return <div className="p-8 text-center bg-gray-50 min-h-screen">Sincronizando universos de negócio...</div>

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
              <Squares2X2Icon className="h-8 w-8 mr-3 text-indigo-600" />
              Gestão de Segmentos de Negócio
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Defina os nichos, identidades visuais e temas da plataforma.</p>
          </div>
          <CreateGuard resource="master-segments">
            <button
              onClick={() => {
                setEditingSegment(null)
                setFormData({ name: '', slug: '', description: '', icon: 'box', color_theme: '#2563eb', is_active: true, module_ids: [], cpl_ideal: '', cpl_critical: '', ctr_min: '' })
                setShowModal(true)
              }}
              className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Criar Novo Nicho
            </button>
          </CreateGuard>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center">
              <div className={`p-4 rounded-xl bg-gray-50 mr-5`}>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{stat.name}</p>
                <p className="text-3xl font-black text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Segments Table */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-8 py-5 text-sm font-bold text-gray-600 uppercase">Segmento / Identidade</th>
                <th className="px-8 py-5 text-sm font-bold text-gray-600 uppercase">Slug</th>
                <th className="px-8 py-5 text-sm font-bold text-gray-600 uppercase">Ecossistema (Motores)</th>
                <th className="px-8 py-5 text-sm font-bold text-gray-600 uppercase text-center">Cor do Tema</th>
                <th className="px-8 py-5 text-sm font-bold text-gray-600 uppercase text-center">Status</th>
                <th className="px-8 py-5 text-sm font-bold text-gray-600 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {segments.map((segment) => (
                <tr key={segment.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center">
                      <div 
                        className="h-12 w-12 rounded-xl flex items-center justify-center mr-4 border shadow-sm"
                        style={{ backgroundColor: `${segment.color_theme}15`, borderColor: `${segment.color_theme}40` }}
                      >
                        <Squares2X2Icon className="h-6 w-6" style={{ color: segment.color_theme }} />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{segment.name}</p>
                        <p className="text-xs text-gray-500 font-medium truncate max-w-[200px]">{segment.description || 'Sem descrição'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-mono font-bold text-gray-700">
                      /{segment.slug}
                    </span>
                  </td>
                   <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-2 max-w-[250px]">
                      {(segment.module_names || '').split(', ').filter(Boolean).map((mname, idx) => (
                        <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-indigo-100 italic">
                          {mname}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col items-center gap-1">
                      <div 
                        className="h-6 w-12 rounded-full border border-gray-200 shadow-inner"
                        style={{ backgroundColor: segment.color_theme }}
                      />
                      <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">{segment.color_theme}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest inline-flex items-center ${
                      segment.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {segment.is_active ? (
                        <><CheckCircleIcon className="h-3 w-3 mr-1" /> Ativo</>
                      ) : (
                        <><XCircleIcon className="h-3 w-3 mr-1" /> Inativo</>
                      )}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setInterestsSegment(segment)}
                        className="text-indigo-500 hover:text-indigo-700 transition-colors inline-flex items-center gap-1 text-sm font-semibold"
                        title="Gerenciar interesses Meta para este segmento"
                      >
                        <SparklesIcon className="h-4 w-4" />
                        Interesses Meta
                      </button>
                      <UpdateGuard resource="master-segments">
                        <button
                          onClick={() => handleEdit(segment)}
                          className="text-gray-500 font-semibold hover:text-gray-800 transition-colors inline-flex items-center text-sm"
                        >
                          <PencilSquareIcon className="h-4 w-4 mr-1" />
                          Editar
                        </button>
                      </UpdateGuard>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Segment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300">
            <div className="p-8 bg-indigo-600 text-white flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">{editingSegment ? 'Editar Segmento' : 'Novo Segmento'}</h2>
                <p className="text-indigo-100 font-medium">Configure a identidade do nicho.</p>
              </div>
              <div 
                className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30"
                style={{ backgroundColor: formData.color_theme }}
              >
                 <Squares2X2Icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Nome do Segmento</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium"
                    placeholder="Ex: Saúde Digital"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Slug</label>
                  <div className="relative">
                    <HashtagIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input 
                      required
                      disabled={!!editingSegment}
                      type="text" 
                      value={formData.slug}
                      onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold disabled:bg-gray-50 disabled:text-gray-400 text-sm"
                      placeholder="saude"
                    />
                  </div>
                </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Paleta de Identidade (Tema)</label>
                <div className="grid grid-cols-6 gap-3 mb-4">
                  {[
                    '#2563eb', '#7c3aed', '#db2777', '#dc2626', 
                    '#ea580c', '#d97706', '#059669', '#0891b2',
                    '#0f172a', '#4b5563', '#9333ea', '#1e1b4b'
                  ].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({...formData, color_theme: color})}
                      className={`h-10 w-10 rounded-full border-4 transition-all hover:scale-110 active:scale-90 shadow-sm ${
                        formData.color_theme === color ? 'border-indigo-400 scale-110 shadow-indigo-200' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <input 
                    type="color" 
                    value={formData.color_theme}
                    onChange={e => setFormData({...formData, color_theme: e.target.value})}
                    className="h-8 w-8 rounded-lg border-0 p-0 cursor-pointer overflow-hidden shadow-sm"
                  />
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cor Personalizada</p>
                    <input 
                      type="text" 
                      value={formData.color_theme}
                      onChange={e => setFormData({...formData, color_theme: e.target.value})}
                      className="w-full bg-transparent font-mono text-xs font-bold uppercase outline-none text-gray-700"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>

              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Ícone (Heroicon)</label>
                <div className="relative">
                  <CommandLineIcon className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={formData.icon}
                    onChange={e => setFormData({...formData, icon: e.target.value})}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    placeholder="activity, home, user..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Arquitetura de Motores (Provisionamento Base)</label>
                <div className="grid grid-cols-1 gap-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 max-h-48 overflow-y-auto custom-scrollbar">
                  {availableModules.map(mod => (
                    <label key={mod.id} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.module_ids.includes(mod.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-transparent hover:border-indigo-100'
                    }`}>
                      <span className="text-xs font-black uppercase tracking-tight">{mod.name}</span>
                      <input 
                        type="checkbox"
                        checked={formData.module_ids.includes(mod.id)}
                        onChange={() => toggleModule(mod.id)}
                        className="h-4 w-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 sr-only"
                      />
                      {formData.module_ids.includes(mod.id) && <CheckCircleIcon className="h-4 w-4" />}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Descrição</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm h-16"
                  placeholder="Descreva o propósito deste segmento..."
                />
              </div>

              {/* ── Benchmarks de Performance ── */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">
                  Benchmarks de Performance
                </label>
                <p className="text-[10px] text-gray-400 font-medium mb-3">
                  Limites usados para classificar o status CPL dos clientes deste segmento.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                      CPL Ideal (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cpl_ideal}
                      onChange={e => setFormData({ ...formData, cpl_ideal: e.target.value })}
                      placeholder="ex: 35"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                      CPL Crítico (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cpl_critical}
                      onChange={e => setFormData({ ...formData, cpl_critical: e.target.value })}
                      placeholder="ex: 80"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                      CTR Mínimo (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.ctr_min}
                      onChange={e => setFormData({ ...formData, ctr_min: e.target.value })}
                      placeholder="ex: 0.8"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                    />
                  </div>
                </div>
                {/* Visual legend */}
                <div className="flex items-center gap-3 mt-2.5 text-[10px] font-semibold">
                  <span className="flex items-center gap-1 text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    ≤ CPL Ideal → ok
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    Ideal &lt; CPL &lt; Crítico → atenção
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    ≥ CPL Crítico → crítico
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="h-5 w-5 text-indigo-600 rounded-lg focus:ring-indigo-500 border-gray-300 transition-all"
                />
                <label htmlFor="is_active" className="text-sm font-bold text-gray-700 cursor-pointer">Segmento Ativo</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all"
                >Cancelar</button>
                <button 
                  type="submit"
                  className="flex-[2] py-3 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all hover:scale-105"
                >Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interests Modal */}
      {interestsSegment && (
        <SegmentInterestsModal
          segment={interestsSegment}
          network="meta"
          onClose={() => setInterestsSegment(null)}
        />
      )}
    </div>
  )
}
