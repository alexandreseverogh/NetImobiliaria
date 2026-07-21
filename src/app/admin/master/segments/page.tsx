'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import {
  PlusIcon,
  Squares2X2Icon,
  HashtagIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
  CommandLineIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  CircleStackIcon,
  BuildingOffice2Icon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { CreateGuard, UpdateGuard } from '@/components/admin/PermissionGuard'
import { SegmentInterestsModal } from '@/components/admin/master/SegmentInterestsModal'
import { SegmentAnglesModal } from '@/components/admin/master/SegmentAnglesModal'
import { SegmentBenchmarksModal } from '@/components/admin/master/SegmentBenchmarksModal'
import { SegmentDataEntitiesModal } from '@/components/admin/master/SegmentDataEntitiesModal'
import { SegmentTenantsModal } from '@/components/admin/master/SegmentTenantsModal'
import { SegmentDistributionModal } from '@/components/admin/master/SegmentDistributionModal'

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
  imagens_por_ia: boolean
  tenant_count:   number
  chatbot_max_turns_default: number
  distribution_role_name: string
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
  const [anglesSegment, setAnglesSegment] = useState<Segment | null>(null)
  const [benchmarksSegment, setBenchmarksSegment] = useState<Segment | null>(null)
  const [dataEntitiesSegment, setDataEntitiesSegment] = useState<Segment | null>(null)
  const [tenantsSegment, setTenantsSegment] = useState<Segment | null>(null)
  const [distributionSegment, setDistributionSegment] = useState<Segment | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'box',
    color_theme: '#2563eb',
    is_active: true,
    module_ids: [] as string[],
    imagens_por_ia: false,
    chatbot_max_turns_default: 6,
    distribution_role_name: 'Corretor',
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
        setFormData({ name: '', slug: '', description: '', icon: 'box', color_theme: '#2563eb', is_active: true, module_ids: [], imagens_por_ia: false, chatbot_max_turns_default: 6, distribution_role_name: 'Corretor' })
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
      name:           segment.name,
      slug:           segment.slug,
      description:    segment.description || '',
      icon:           segment.icon || 'box',
      color_theme:    segment.color_theme || '#2563eb',
      is_active:      segment.is_active,
      module_ids:     (segment.module_ids || []).filter(Boolean),
      imagens_por_ia: segment.imagens_por_ia ?? false,
      chatbot_max_turns_default: segment.chatbot_max_turns_default ?? 6,
      distribution_role_name: segment.distribution_role_name || 'Corretor',
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
  ]

  if (loading) return <div className="p-8 text-center bg-gray-50 min-h-screen">Sincronizando universos de negócio...</div>

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full">
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
                setFormData({ name: '', slug: '', description: '', icon: 'box', color_theme: '#2563eb', is_active: true, module_ids: [], imagens_por_ia: false, chatbot_max_turns_default: 6, distribution_role_name: 'Corretor' })
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        <div className="bg-white rounded-3xl shadow-xl overflow-x-auto border border-gray-100">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">Segmento / Identidade</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">Slug</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">Módulos</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wide text-center whitespace-nowrap">Tema</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wide text-center whitespace-nowrap">Status</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wide text-center whitespace-nowrap">IA Imagens</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wide text-center whitespace-nowrap">Empresas</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-600 uppercase tracking-wide text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {segments.map((segment) => (
                <tr key={segment.id} className="hover:bg-indigo-50/30 transition-colors">
                  {/* Segmento / Identidade */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center border shadow-sm"
                        style={{ backgroundColor: `${segment.color_theme}15`, borderColor: `${segment.color_theme}40` }}
                      >
                        <Squares2X2Icon className="h-5 w-5" style={{ color: segment.color_theme }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-gray-900 whitespace-nowrap">{segment.name}</p>
                        <p className="text-xs text-gray-500 font-medium truncate max-w-[220px]" title={segment.description || ''}>
                          {segment.description || 'Sem descrição'}
                        </p>
                      </div>
                    </div>
                  </td>
                  {/* Slug */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-mono font-bold text-gray-700">
                      /{segment.slug}
                    </span>
                  </td>
                  {/* Módulos */}
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {(segment.module_names || '').split(', ').filter(Boolean).map((mname, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold uppercase tracking-wide border border-indigo-100">
                          {mname}
                        </span>
                      ))}
                    </div>
                  </td>
                  {/* Tema */}
                  <td className="px-5 py-4">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="h-5 w-10 rounded-full border border-gray-200 shadow-inner"
                        style={{ backgroundColor: segment.color_theme }}
                      />
                      <span className="text-[10px] font-mono text-gray-400 font-bold uppercase">{segment.color_theme}</span>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide inline-flex items-center gap-1 ${
                      segment.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {segment.is_active ? (
                        <><CheckCircleIcon className="h-3 w-3" /> Ativo</>
                      ) : (
                        <><XCircleIcon className="h-3 w-3" /> Inativo</>
                      )}
                    </span>
                  </td>
                  {/* IA Imagens */}
                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    {segment.imagens_por_ia ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black bg-violet-100 text-violet-700 border border-violet-200">
                        <SparklesIcon className="h-3 w-3" />
                        Permitido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black bg-gray-100 text-gray-400 border border-gray-200">
                        <XCircleIcon className="h-3 w-3" />
                        Bloqueado
                      </span>
                    )}
                  </td>
                  {/* Empresas */}
                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    <span className="inline-flex items-center justify-center h-7 min-w-[1.75rem] px-2 rounded-full text-sm font-black bg-gray-100 text-gray-700">
                      {segment.tenant_count ?? 0}
                    </span>
                  </td>
                  {/* Ações */}
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => setTenantsSegment(segment)}
                        className="p-2 rounded-lg text-sky-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                        title="Empresas deste segmento"
                      >
                        <BuildingOffice2Icon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setAnglesSegment(segment)}
                        className="p-2 rounded-lg text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition-colors"
                        title="Ângulos & Demanda (IA)"
                      >
                        <SparklesIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setInterestsSegment(segment)}
                        className="p-2 rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                        title="Interesses Meta"
                      >
                        <HashtagIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setBenchmarksSegment(segment)}
                        className="p-2 rounded-lg text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                        title="Parâmetros do Agente (detecção + execução)"
                      >
                        <AdjustmentsHorizontalIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDataEntitiesSegment(segment)}
                        className="p-2 rounded-lg text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        title="Dados do Bot (tabelas/colunas que o bot pode consultar)"
                      >
                        <CircleStackIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDistributionSegment(segment)}
                        className="p-2 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                        title="Estratégias de Distribuição de Leads"
                      >
                        <UserGroupIcon className="h-4 w-4" />
                      </button>
                      <UpdateGuard resource="master-segments">
                        <button
                          onClick={() => handleEdit(segment)}
                          className="p-2 rounded-lg text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
                          title="Editar segmento"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
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

      {/* Segment Modal — 2 colunas, sem scroll */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl transform transition-all animate-in fade-in zoom-in duration-300">

            {/* ── Cabeçalho ── */}
            <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="text-xl font-black">{editingSegment ? 'Editar Segmento' : 'Novo Segmento'}</h2>
                <p className="text-indigo-100 text-sm font-medium">Configure a identidade do nicho.</p>
              </div>
              <div
                className="h-10 w-10 rounded-2xl flex items-center justify-center border-2 border-white/40 shadow-inner"
                style={{ backgroundColor: formData.color_theme }}
              >
                <Squares2X2Icon className="h-5 w-5 text-white drop-shadow" />
              </div>
            </div>

            {/* ── Formulário 2 colunas ── */}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-x-8 gap-y-5 px-8 pt-6 pb-5">

                {/* ╔══════════════ COLUNA ESQUERDA ══════════════╗ */}
                <div className="space-y-5">

                  {/* Nome */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Nome do Segmento</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                      placeholder="Ex: Saúde Digital"
                    />
                  </div>

                  {/* Slug + Ícone em linha */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Slug</label>
                      <div className="relative">
                        <HashtagIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          required
                          disabled={!!editingSegment}
                          type="text"
                          value={formData.slug}
                          onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                          className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold disabled:bg-gray-50 disabled:text-gray-400 text-sm"
                          placeholder="saude"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Ícone</label>
                      <div className="relative">
                        <CommandLineIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.icon}
                          onChange={e => setFormData({...formData, icon: e.target.value})}
                          className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                          placeholder="box, home..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Descrição</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm h-20 resize-none"
                      placeholder="Descreva o propósito deste segmento..."
                    />
                  </div>

                  {/* Ativo */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox" id="is_active"
                      checked={formData.is_active}
                      onChange={e => setFormData({...formData, is_active: e.target.checked})}
                      className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                    />
                    <label htmlFor="is_active" className="text-sm font-bold text-gray-700 cursor-pointer">Segmento Ativo</label>
                  </div>

                  {/* Imagens por IA */}
                  <div className="p-3.5 rounded-xl border border-dashed border-violet-200 bg-violet-50/50">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox" id="imagens_por_ia"
                        checked={formData.imagens_por_ia}
                        onChange={e => setFormData({...formData, imagens_por_ia: e.target.checked})}
                        className="h-4 w-4 mt-0.5 text-violet-600 rounded focus:ring-violet-500 border-gray-300"
                      />
                      <div>
                        <label htmlFor="imagens_por_ia" className="text-sm font-black text-violet-800 cursor-pointer flex items-center gap-1.5">
                          <SparklesIcon className="h-3.5 w-3.5" />
                          Permitir geração de imagens por IA
                        </label>
                        <p className="text-[10px] text-violet-600 mt-0.5 leading-relaxed">
                          Habilita o botão "Gerar com IA" na galeria de criativos. <strong>Não ativar</strong> para segmentos com produto físico real (imóveis, carros, etc.) onde imagens fictícias induzem o comprador em erro.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chatbot — padrão de transferência */}
                  <div className="p-3.5 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50">
                    <label htmlFor="chatbot_max_turns_default" className="text-sm font-black text-emerald-800 flex items-center gap-1.5 mb-1">
                      <CommandLineIcon className="h-3.5 w-3.5" />
                      Bot — transferir após N interações (padrão)
                    </label>
                    <p className="text-[10px] text-emerald-600 mb-2 leading-relaxed">
                      Valor sugerido quando um tenant deste segmento ainda não configurou o próprio
                      (em Mensageria → Config → Bot). Segmentos com conversa naturalmente mais longa
                      (ex.: imóveis, explorando vários bairros) merecem um valor maior.
                    </p>
                    <input
                      type="number" id="chatbot_max_turns_default" min={1} max={50}
                      value={formData.chatbot_max_turns_default}
                      onChange={e => setFormData({...formData, chatbot_max_turns_default: parseInt(e.target.value, 10) || 6})}
                      className="w-24 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-sm"
                    />
                  </div>

                  {/* Distribuição de Leads — cargo do vendedor (o resto — quais estratégias
                      rodam e em que ordem — fica no botão "Estratégias de Distribuição" da
                      lista de segmentos, mesmo padrão de Ângulos/Interesses/Benchmarks) */}
                  <div className="p-3.5 rounded-xl border border-dashed border-sky-200 bg-sky-50/50">
                    <label htmlFor="distribution_role_name" className="text-sm font-black text-sky-800 flex items-center gap-1.5 mb-1">
                      <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                      Distribuição de Leads — Cargo do Vendedor
                    </label>
                    <p className="text-[10px] text-sky-600 mb-2 leading-relaxed">
                      Nome do role usado pelo motor de roteamento pra filtrar quem pode receber
                      leads deste segmento. As etapas do roteamento em si (dono do ativo, área
                      geográfica, fila, plantonista) se configuram no botão "Estratégias de
                      Distribuição" da lista de segmentos.
                    </p>
                    <input
                      type="text" id="distribution_role_name"
                      value={formData.distribution_role_name}
                      onChange={e => setFormData({...formData, distribution_role_name: e.target.value})}
                      placeholder="Corretor"
                      className="w-48 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none transition-all font-medium text-sm"
                    />
                  </div>
                </div>
                {/* ╚══════════════ FIM COLUNA ESQUERDA ══════════════╝ */}

                {/* ╔══════════════ COLUNA DIREITA ══════════════╗ */}
                <div className="space-y-5">

                  {/* Paleta */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Paleta de Identidade</label>
                    <div className="grid grid-cols-6 gap-2 mb-2">
                      {[
                        '#2563eb','#7c3aed','#db2777','#dc2626',
                        '#ea580c','#d97706','#059669','#0891b2',
                        '#0f172a','#4b5563','#9333ea','#1e1b4b',
                      ].map(color => (
                        <button
                          key={color} type="button"
                          onClick={() => setFormData({...formData, color_theme: color})}
                          className={`h-9 w-9 rounded-full border-4 transition-all hover:scale-110 active:scale-90 shadow-sm ${
                            formData.color_theme === color ? 'border-indigo-400 scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <input type="color" value={formData.color_theme}
                        onChange={e => setFormData({...formData, color_theme: e.target.value})}
                        className="h-7 w-7 rounded-lg border-0 p-0 cursor-pointer overflow-hidden shadow-sm" />
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Personalizada</p>
                        <input type="text" value={formData.color_theme}
                          onChange={e => setFormData({...formData, color_theme: e.target.value})}
                          className="w-full bg-transparent font-mono text-xs font-bold uppercase outline-none text-gray-700"
                          maxLength={7} />
                      </div>
                    </div>
                  </div>

                  {/* Módulos — grid 2 colunas espaçoso; overflow ao crescer */}
                  <div>
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Motores (Módulos)</label>
                    <div className="grid grid-cols-2 gap-2.5 bg-gray-50 p-4 rounded-2xl border border-gray-100 max-h-60 overflow-y-auto custom-scrollbar">
                      {availableModules.map(mod => (
                        <label key={mod.id} className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl cursor-pointer transition-all select-none ${
                          formData.module_ids.includes(mod.id)
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-300'
                            : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-200'
                        }`}>
                          <input type="checkbox"
                            checked={formData.module_ids.includes(mod.id)}
                            onChange={() => toggleModule(mod.id)}
                            className="sr-only" />
                          {formData.module_ids.includes(mod.id)
                            ? <CheckCircleIcon className="h-4 w-4 shrink-0" />
                            : <div className="h-4 w-4 shrink-0 rounded border-2 border-gray-300" />}
                          <span className="text-xs font-black uppercase tracking-tight leading-tight">{mod.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5">Clique para ativar ou desativar módulos neste segmento.</p>
                  </div>
                </div>
                {/* ╚══════════════ FIM COLUNA DIREITA ══════════════╝ */}

              </div>

              {/* ── Botões ── */}
              <div className="flex gap-4 px-8 py-5 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all text-sm">
                  Cancelar
                </button>
                <button type="submit"
                  className="flex-[2] py-2.5 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all hover:scale-105 text-sm">
                  Salvar Alterações
                </button>
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

      {/* Ângulos & Demanda Modal (FASE 18.3) */}
      {anglesSegment && (
        <SegmentAnglesModal
          segment={anglesSegment}
          onClose={() => setAnglesSegment(null)}
        />
      )}

      {/* Parâmetros de Execução do Agente (FASE 16) */}
      {benchmarksSegment && (
        <SegmentBenchmarksModal
          segment={benchmarksSegment}
          onClose={() => setBenchmarksSegment(null)}
        />
      )}

      {/* Dados do Bot (M4.2, Ponto 3c) */}
      {dataEntitiesSegment && (
        <SegmentDataEntitiesModal
          segment={dataEntitiesSegment}
          onClose={() => setDataEntitiesSegment(null)}
        />
      )}

      {/* Empresas do segmento */}
      {tenantsSegment && (
        <SegmentTenantsModal
          segment={tenantsSegment}
          onClose={() => setTenantsSegment(null)}
        />
      )}

      {/* Estratégias de Distribuição de Leads */}
      {distributionSegment && (
        <SegmentDistributionModal
          segment={distributionSegment}
          onClose={() => setDistributionSegment(null)}
        />
      )}
    </div>
  )
}
