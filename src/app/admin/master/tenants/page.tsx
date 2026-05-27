'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import { PlusIcon, BuildingOfficeIcon, GlobeAltIcon, Cog6ToothIcon, UsersIcon, CheckCircleIcon, PhotoIcon, Squares2X2Icon, PencilSquareIcon, IdentificationIcon, EyeIcon, EyeSlashIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'

import Link from 'next/link'

interface Tenant {
  id: string
  name: string
  slug: string
  logo: string | null
  logo_url: string | null
  status: string
  segment: string
  segment_id: string
  segment_name: string
  segment_color: string
  segment_icon: string
  created_at: string
  total_users: string
  cnpj_cpf: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  cep: string | null
  telefone: string | null
  admin_nome?: string
  admin_email?: string
  admin_username?: string
  active_modules: string[] | null
  calendario?: boolean
  google_email?: string | null
  duracao_visita?: number
  ai_config?: {
    groq_key?: string;
    gemini_key?: string;
    openai_key?: string;
  }
  primary_color?: string
  secondary_color?: string
}



interface Segment {
  id: string
  name: string
  slug: string
}

export default function MasterTenantsPage() {
  const { get, post, patch } = useApi()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [segments, setSegments] = useState<Segment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newTenant, setNewTenant] = useState({ 
    name: '', 
    slug: '', 
    segment_id: '', 
    logo: '',
    logo_mime_type: '',
    cnpj_cpf: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    telefone: '',
    email_contato: '',
    admin_nome: '',
    admin_username: '',
    admin_email: '',
    admin_password: '',
    selected_modules: [] as string[],
    ai_config: {
      groq_key: '',
      gemini_key: '',
      preferred_model: ''
    },
    primary_color: '#1A2B3C',
    secondary_color: '#F1F1F1',
    calendario: false,
    google_email: '',
    duracao_visita: 60
  })

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'geral' | 'modulos' | 'google_calendar'>('geral')
  const [newTab, setNewTab] = useState<'geral' | 'modulos' | 'google_calendar'>('geral')
  const [availableModules, setAvailableModules] = useState<any[]>([])
  const [tenantModules, setTenantModules] = useState<string[]>([]) // Array de IDs de módulos ativos
  const [tenantModulesLoaded, setTenantModulesLoaded] = useState(false)
  const [isModulesModified, setIsModulesModified] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [globalUsers, setGlobalUsers] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [userFound, setUserFound] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [tenantsRes, segmentsRes, modulesRes] = await Promise.all([
        get('/api/admin/master/tenants'),
        get('/api/admin/master/segments'),
        get('/api/admin/master/modules')
      ])
      
      if (tenantsRes.ok) {
        const data = await tenantsRes.json()
        setTenants(data.tenants)
        if (data.totalGlobalUsers !== undefined) {
          setGlobalUsers(data.totalGlobalUsers)
        }
      } else {
        const errData = await tenantsRes.json().catch(() => ({}))
        if (tenantsRes.status === 403) setError('Acesso Master Requerido')
        else setError(errData.error || 'Falha ao sincronizar unidades')
      }
      
      if (segmentsRes.ok) {
        const data = await segmentsRes.json()
        setSegments(data.segments)
        if (data.segments.length > 0 && !newTenant.segment_id) {
          setNewTenant(prev => ({ ...prev, segment_id: data.segments[0].id }))
        }
      }

      if (modulesRes.ok) {
        const data = await modulesRes.json()
        setAvailableModules(data.modules)
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      setError('Erro crítico de conexão master')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])


  const checkEmailExistence = async (email: string) => {
    if (!email || !email.includes('@')) return
    
    setIsCheckingEmail(true)
    try {
      const response = await get(`/api/admin/master/users/check?email=${email}`)
      const data = await response.json()
      
      if (data.found) {
        setNewTenant((prev: any) => ({
          ...prev,
          admin_nome: data.user.nome,
          admin_username: data.user.username
        }))
        setUserFound(true)
      } else {
        setUserFound(false)
      }
    } catch (err) {
      console.error('Erro ao verificar email:', err)
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const checkEmailForEdit = async (email: string) => {
    if (!email || !email.includes('@')) return
    
    setIsCheckingEmail(true)
    try {
      const response = await get(`/api/admin/master/users/check?email=${email}`)
      const data = await response.json()
      
      if (data.found) {
        setEditingTenant((prev: any) => ({
          ...prev,
          admin_nome: data.user.nome,
          admin_username: data.user.username
        }))
        setUserFound(true)
      } else {
        setUserFound(false)
      }
    } catch (err) {
      console.error('Erro ao verificar email:', err)
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await post('/api/admin/master/tenants', newTenant)
      if (response.ok) {
        setShowModal(false)
        setNewTenant({ 
          name: '', slug: '', segment_id: segments[0]?.id || '', logo: '', logo_mime_type: '',
          cnpj_cpf: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '', telefone: '', email_contato: '',
          admin_nome: '', admin_username: '', admin_email: '', admin_password: '',
          selected_modules: [],
          ai_config: { groq_key: '', gemini_key: '', preferred_model: '' },
          primary_color: '#1A2B3C',
          secondary_color: '#F1F1F1'
        })
        fetchData()
        alert('Empresa provisionada com sucesso!')
      } else {

        const err = await response.json()
        alert(err.error || 'Erro ao criar empresa')
      }
    } catch (error) {
      alert('Erro inesperado ao criar empresa')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('O arquivo é muito grande. O limite para logotipos é 1MB.')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setNewTenant({
          ...newTenant,
          logo: reader.result as string,
          logo_mime_type: file.type
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('Limite de 1MB excedido.')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        setEditingTenant({
          ...editingTenant,
          logo: reader.result as string,
          logo_mime_type: file.type
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const fetchTenantModules = async (tenantId: string) => {
    try {
      setTenantModulesLoaded(false)
      const res = await get(`/api/admin/master/tenants/${tenantId}/modules`)
      if (res.ok) {
        const data = await res.json()
        const activeIds = data.modules.filter((m: any) => m.is_enabled).map((m: any) => m.id)
        setTenantModules(activeIds)
        setTenantModulesLoaded(true)
      }
    } catch (err) {
      console.error('Erro ao buscar módulos do tenant:', err)
      setTenantModulesLoaded(false)
    }
  }

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { id, ...data } = editingTenant
      
      // 1. Atualizar dados básicos
      const response = await patch(`/api/admin/master/tenants/${id}`, data)

      // 2. Atualizar módulos atribuídos APENAS se o usuário explicitamente alterou a aba de módulos
      let modulesResponse = { ok: true, json: async () => ({}) } as any
      if (tenantModulesLoaded && isModulesModified) {
        modulesResponse = await post(`/api/admin/master/tenants/${id}/modules`, {
          moduleIds: tenantModules
        })
      }

      if (response.ok && modulesResponse.ok) {
        setShowEditModal(false)
        fetchData()
        alert('Configurações Master atualizadas com sucesso!')

      } else {
        const errData = !response.ok ? await response.json().catch(() => ({})) : await modulesResponse.json().catch(() => ({}));
        alert(errData.error || 'Erro ao sincronizar configurações');
      }
    } catch (error) {
      alert('Erro na conexão master')
    }
  }

  const toggleModule = (moduleId: string) => {
    setIsModulesModified(true)
    setTenantModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId) 
        : [...prev, moduleId]
    )
  }

  const openModules = (tenant: any) => {
    setEditingTenant({ ...tenant })
    setActiveTab('modulos')
    setIsModulesModified(false)
    fetchTenantModules(tenant.id)
    setShowEditModal(true)
  }

  const openEdit = (tenant: any) => {
    setEditingTenant({ ...tenant })
    setActiveTab('geral')
    setIsModulesModified(false)
    fetchTenantModules(tenant.id)
    setShowEditModal(true)
    // Reset check state
    setUserFound(false)
  }


  const stats = [
    { name: 'Total de Empresas', value: tenants.length, icon: BuildingOfficeIcon, color: 'text-blue-600' },
    { name: 'Usuários Globais', value: globalUsers || tenants.reduce((acc, t) => acc + parseInt(t.total_users || '0'), 0), icon: UsersIcon, color: 'text-purple-600' },
    { name: 'Sistemas Ativos', value: '3 Motores', icon: Squares2X2Icon, color: 'text-indigo-600' },
  ]

  if (loading) return <div className="p-8 text-center bg-gray-50 min-h-screen font-black text-gray-500 uppercase tracking-widest animate-pulse">Sincronizando Ecossistema...</div>

  return (
    <div className="p-10 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">
              Governança <span className="text-blue-600">Master</span>
            </h1>
            <p className="text-gray-500 mt-2 font-medium uppercase text-xs tracking-[0.2em]">Provisionamento Multi-Segmento de Alta Disponibilidade</p>
          </div>
          <div className="flex gap-4">
             <Link href="/admin/master/modules" className="flex items-center px-6 py-3 bg-white text-indigo-600 border border-indigo-100 rounded-xl font-black shadow-sm hover:bg-indigo-50 transition-all uppercase text-[10px] tracking-widest">
                <Squares2X2Icon className="h-4 w-4 mr-2" />
                Cadastro de Módulos
             </Link>
             <button
              onClick={() => {
                setNewTenant({
                  name: '', slug: '', segment_id: segments[0]?.id || '', logo: '', logo_mime_type: '',
                  cnpj_cpf: '', logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '', telefone: '', email_contato: '',
                  admin_nome: '', admin_username: '', admin_email: '', admin_password: '',
                  selected_modules: [],
                  ai_config: { groq_key: '', gemini_key: '', preferred_model: '' },
                  primary_color: '#1A2B3C',
                  secondary_color: '#F1F1F1',
                  calendario: false,
                  google_email: '',
                  duracao_visita: 60
                });
                setUserFound(false);
                setNewTab('geral');
                setShowModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
              <PlusIcon className="h-5 w-5" />
              Nova Empresa
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center">
              <div className={`p-4 rounded-xl bg-gray-50 mr-5`}>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{stat.name}</p>
                <p className="text-3xl font-black text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl mb-10 flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-red-500 p-2 rounded-lg mr-4">
                <Cog6ToothIcon className="h-6 w-6 text-white animate-spin" />
              </div>
              <div>
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Erro de Governança</p>
                <p className="text-xl font-black text-red-900 uppercase tracking-tighter">{error}</p>
              </div>
            </div>
            <button onClick={fetchData} className="px-6 py-2 bg-red-100 text-red-600 rounded-xl font-black text-[10px] uppercase hover:bg-red-200 transition-all">Reconectar</button>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Empresa / Identidade</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Nicho de Negócio</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuários</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Módulos</th>

                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tenants.length === 0 && !error ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                       <BuildingOfficeIcon className="h-12 w-12 text-gray-200 mb-4" />
                       <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nenhuma empresa registrada no cluster</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-start">
                        <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center mr-5 overflow-hidden border border-gray-100 shadow-sm p-1.5 shrink-0 group-hover:border-blue-200 transition-all">
                          {tenant.logo || tenant.logo_url ? (
                            <img src={tenant.logo || tenant.logo_url || ''} alt={tenant.name} className="max-h-full max-w-full object-contain" />
                          ) : (
                            <BuildingOfficeIcon className="h-7 w-7 text-gray-200" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="font-black text-blue-900 uppercase text-[13px] tracking-tight group-hover:text-blue-600 transition-colors">{tenant.name}</p>
                          <p className="text-[9px] text-gray-400 font-bold lowercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-full inline-block self-start opacity-75">/{tenant.slug}</p>
                          
                          {/* Administração Responsável */}
                          <div className="mt-3 flex flex-col gap-1 border-t border-gray-50 pt-2">
                             <div className="flex items-center gap-1.5">
                               <UsersIcon className="h-3 w-3 text-blue-500" />
                               <span className="text-[10px] font-black text-gray-700 uppercase tracking-tight">{tenant.admin_nome || 'Sem Responsável'}</span>
                             </div>
                             <div className="flex items-center gap-1.5 ml-0.5">
                               <GlobeAltIcon className="h-3 w-3 text-gray-300" />
                               <span className="text-[9px] font-bold text-gray-400 lowercase">{tenant.admin_email || 'n/a'}</span>
                             </div>
                             <div className="mt-1">
                                <span className="text-[8px] font-black font-mono text-blue-400 bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100/50">
                                  @{tenant.admin_username || '---'}
                                </span>
                             </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg border shadow-sm transition-all hover:scale-105" 
                             style={{ backgroundColor: `${tenant.segment_color}10`, borderColor: `${tenant.segment_color}40`, color: tenant.segment_color }}>
                          <Squares2X2Icon className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{tenant.segment_name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center text-gray-700 font-black text-[10px]">
                        <UsersIcon className="h-4 w-4 mr-2 text-gray-400" />
                        {tenant.total_users || 0} MEMBROS
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5 items-center justify-center">
                        {tenant.active_modules && tenant.active_modules.length > 0 ? (
                          tenant.active_modules.map((m: string, idx: number) => (
                            <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[8px] font-black uppercase tracking-widest border border-blue-100 whitespace-nowrap">
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] text-gray-300 font-bold uppercase italic tracking-widest">Nenhum</span>
                        )}
                      </div>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <div className="flex gap-2 justify-end">
                         <button
                           onClick={() => openModules(tenant)}
                           className="flex items-center justify-center px-4 py-3 bg-indigo-50 text-indigo-700 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-100 transition-all"
                         >
                           <Squares2X2Icon className="h-4 w-4 mr-2" />
                           Associar Módulos
                         </button>
                         <button
                           onClick={() => openEdit(tenant)}
                           className="px-4 py-3 bg-gray-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all"
                         >
                           <PencilSquareIcon className="h-4 w-4" />
                         </button>
                      </div>
                      <Link href={`/admin/master/tenants/${tenant.id}`} className="text-[8px] text-gray-400 font-black uppercase tracking-widest mt-1 block">Detalhes Avançados</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
            <div className="p-8 bg-blue-600 text-white flex justify-between items-center text-xs lg:text-base">
              <div>
                <h2 className="text-xl font-black uppercase tracking-widest">Provisionar Nova Unidade</h2>
                <div className="flex gap-3 mt-4">
                   <button type="button" onClick={() => setNewTab('geral')} 
                     className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newTab === 'geral' ? 'bg-white text-blue-700 shadow-md' : 'text-blue-100/70 hover:text-white hover:bg-white/10'}`}>
                     1. Dados Gerais
                   </button>
                   <button type="button" onClick={() => setNewTab('modulos')} 
                     className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newTab === 'modulos' ? 'bg-white text-blue-700 shadow-md' : 'text-blue-100/70 hover:text-white hover:bg-white/10'}`}>
                     2. Modularização
                   </button>
                   <button type="button" onClick={() => setNewTab('google_calendar')} 
                     className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${newTab === 'google_calendar' ? 'bg-white text-blue-700 shadow-md' : 'text-blue-100/70 hover:text-white hover:bg-white/10'}`}>
                     <CalendarDaysIcon className="h-3 w-3" />
                     3. Google Calendar
                   </button>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all font-black text-xs">FECHAR</button>
            </div>
            
            <form onSubmit={handleCreateTenant} className="flex-1 overflow-y-auto p-8 flex flex-col">
              {newTab === 'geral' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                  {/* Coluna 1: Básico */}
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Identidade & Segmento</h4>
                    <div className="space-y-4">
                      <input type="text" placeholder="Nome da Empresa (Razão Social)" value={newTenant.name} onChange={e => setNewTenant({...newTenant, name: e.target.value})}
                        className="w-full px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-bold text-xs focus:ring-2 focus:ring-blue-500 transition-all" required />
                      <input type="text" placeholder="CNPJ / CPF" value={newTenant.cnpj_cpf || ''} onChange={e => setNewTenant({...newTenant, cnpj_cpf: e.target.value})}
                        className="w-full px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-mono text-xs focus:ring-2 focus:ring-blue-500 transition-all" />
                      <div className="flex gap-4">
                        <input type="text" placeholder="Slug (ex: imobiliaria-x)" value={newTenant.slug} onChange={e => setNewTenant({...newTenant, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                          className="flex-1 px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-mono text-xs focus:ring-2 focus:ring-blue-500 transition-all lowercase" required />
                        <select value={newTenant.segment_id} onChange={e => setNewTenant({...newTenant, segment_id: e.target.value})}
                          className="w-40 px-4 py-4 rounded-xl bg-gray-50 border-gray-100 font-black text-[10px] uppercase cursor-pointer">
                          {segments.map(s => (
                            <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest border-l-4 border-green-600 pl-3">Contatos Diretos</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <input type="email" placeholder="E-mail de Contato" value={newTenant.email_contato || ''} onChange={e => setNewTenant({...newTenant, email_contato: e.target.value})}
                        className="w-full px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-bold text-[10px] focus:ring-2 focus:ring-blue-500 transition-all" />
                      <input type="text" placeholder="Telefone Principal" value={newTenant.telefone || ''} onChange={e => setNewTenant({...newTenant, telefone: e.target.value})}
                        className="w-full px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-bold text-[10px] focus:ring-2 focus:ring-blue-500 transition-all" />
                    </div>

                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-l-4 border-indigo-600 pl-3 mt-8">Engenharia de IA</h4>
                    <div className="space-y-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-gray-400 ml-1">Chave API Groq (Llama / Mixtral)</label>
                        <input type="password" placeholder="gsk_..." value={newTenant.ai_config?.groq_key || ''} 
                          onChange={e => setNewTenant({...newTenant, ai_config: { ...newTenant.ai_config, groq_key: e.target.value }})}
                          className="w-full px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500 transition-all" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-gray-400 ml-1">Chave API Google (Gemini)</label>
                        <input type="password" placeholder="AIzaSy..." value={newTenant.ai_config?.gemini_key || ''} 
                          onChange={e => setNewTenant({...newTenant, ai_config: { ...newTenant.ai_config, gemini_key: e.target.value }})}
                          className="w-full px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500 transition-all" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-gray-400 ml-1">Modelo de IA Preferido</label>
                        <input type="text" placeholder="Ex: llama-3.3-70b-versatile ou gemini-2.0-flash" value={newTenant.ai_config?.preferred_model || ''} 
                          onChange={e => setNewTenant({...newTenant, ai_config: { ...newTenant.ai_config, preferred_model: e.target.value }})}
                          className={`w-full px-5 py-4 rounded-xl font-mono text-xs focus:ring-2 transition-all ${
                            (newTenant.ai_config?.preferred_model || '').startsWith('gsk_') || (newTenant.ai_config?.preferred_model || '').startsWith('AIzaSy')
                              ? 'bg-red-50 border border-red-300 focus:ring-red-400'
                              : 'bg-gray-50 border-gray-100 focus:ring-indigo-500'
                          }`} />
                      </div>
                    </div>
                  </div>

                  {/* Coluna 2: Localização */}
                  <div className="space-y-6">
                     <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest border-l-4 border-red-600 pl-3">Sede Física</h4>
                     <div className="grid grid-cols-6 gap-3">
                        <input type="text" placeholder="Rua / Logradouro" value={newTenant.logradouro || ''} onChange={e => setNewTenant({...newTenant, logradouro: e.target.value})}
                          className="col-span-4 w-full px-4 py-3 rounded-xl bg-gray-50 font-bold text-[10px]" />
                        <input type="text" placeholder="Nº" value={newTenant.numero || ''} onChange={e => setNewTenant({...newTenant, numero: e.target.value})}
                          className="col-span-2 w-full px-4 py-3 rounded-xl bg-gray-50 font-bold text-[10px] text-center" />
                        <input type="text" placeholder="Bairro" value={newTenant.bairro || ''} onChange={e => setNewTenant({...newTenant, bairro: e.target.value})}
                          className="col-span-3 w-full px-4 py-3 rounded-xl bg-gray-50 font-bold text-[10px]" />
                        <input type="text" placeholder="CEP" value={newTenant.cep || ''} onChange={e => setNewTenant({...newTenant, cep: e.target.value})}
                          className="col-span-3 w-full px-4 py-3 rounded-xl bg-gray-50 font-mono text-[10px] text-center" />
                        <input type="text" placeholder="Cidade" value={newTenant.cidade || ''} onChange={e => setNewTenant({...newTenant, cidade: e.target.value})}
                          className="col-span-4 w-full px-4 py-3 rounded-xl bg-gray-50 font-bold text-[10px]" />
                        <input type="text" placeholder="UF" maxLength={2} value={newTenant.estado || ''} onChange={e => setNewTenant({...newTenant, estado: e.target.value.toUpperCase()})}
                          className="col-span-2 w-full px-4 py-3 rounded-xl bg-gray-50 font-black text-[10px] text-center uppercase" />
                     </div>
                    <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest border-l-4 border-purple-600 pl-3">Logo da Unidade</h4>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 relative cursor-pointer">
                      <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                        {newTenant.logo ? (
                          <img src={newTenant.logo} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <PhotoIcon className="h-6 w-6 text-gray-200" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-gray-700 uppercase">Escolher Logotipo</p>
                      </div>
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleFileChange} />
                    </div>

                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Cores da Marca (Branding)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Cor Primária</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={newTenant.primary_color} onChange={e => setNewTenant({...newTenant, primary_color: e.target.value})}
                            className="h-10 w-20 rounded-lg cursor-pointer bg-transparent border-none" />
                          <input type="text" value={newTenant.primary_color} onChange={e => setNewTenant({...newTenant, primary_color: e.target.value})}
                            className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border-gray-100 font-mono text-[10px] uppercase" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Cor Secundária</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={newTenant.secondary_color} onChange={e => setNewTenant({...newTenant, secondary_color: e.target.value})}
                            className="h-10 w-20 rounded-lg cursor-pointer bg-transparent border-none" />
                          <input type="text" value={newTenant.secondary_color} onChange={e => setNewTenant({...newTenant, secondary_color: e.target.value})}
                            className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border-gray-100 font-mono text-[10px] uppercase" />
                        </div>
                      </div>
                    </div>

                    {/* Seção Responsável */}
                    <div className="pt-6 border-t border-gray-100 flex flex-col gap-4">
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center">
                        <IdentificationIcon className="h-4 w-4 mr-2" />
                        Responsável pela Unidade
                      </h4>
                      <input type="email" placeholder="E-mail de Acesso" value={newTenant.admin_email} onChange={e => {setNewTenant({...newTenant, admin_email: e.target.value}); if (userFound) setUserFound(false)}}
                        onBlur={(e) => checkEmailExistence(e.target.value)} className="w-full px-5 py-4 rounded-xl bg-blue-50/30 border-blue-100 font-bold text-xs" required />
                      <input type="text" placeholder="Nome Completo" value={newTenant.admin_nome} onChange={e => setNewTenant({...newTenant, admin_nome: e.target.value})}
                        className="w-full px-5 py-4 rounded-xl bg-blue-50/30 border-blue-100 font-bold text-xs" required readOnly={userFound} />
                      <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Usuário" value={newTenant.admin_username} onChange={e => setNewTenant({...newTenant, admin_username: e.target.value})}
                          className="w-full px-5 py-4 rounded-xl bg-blue-50/30 border-blue-100 font-bold text-xs" required readOnly={userFound} />
                        <input type="password" placeholder="Senha" value={newTenant.admin_password} onChange={e => setNewTenant({...newTenant, admin_password: e.target.value})}
                          className="w-full px-5 py-4 rounded-xl bg-blue-50/30 border-blue-100 font-bold text-xs" required={!userFound} readOnly={userFound} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : newTab === 'google_calendar' ? (
                <div className="animate-fade-in space-y-8">
                  <div className="flex items-start gap-4 p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                    <div className="p-3 bg-emerald-600 rounded-2xl flex-shrink-0">
                      <CalendarDaysIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-900 uppercase tracking-widest mb-1">Integração Google Calendar</p>
                      <p className="text-[10px] text-emerald-700 font-medium leading-relaxed">
                        Configure o calendário corporativo desta unidade no momento do provisionamento.
                      </p>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl border-2 transition-all cursor-pointer"
                    style={{ borderColor: newTenant.calendario ? '#059669' : '#e5e7eb', backgroundColor: newTenant.calendario ? '#f0fdf4' : '#f9fafb' }}
                    onClick={() => setNewTenant({ ...newTenant, calendario: !newTenant.calendario })}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl transition-colors ${newTenant.calendario ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                          <CalendarDaysIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Módulo de Agendamentos</p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">Habilita o fluxo de agendamento de visitas</p>
                        </div>
                      </div>
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ newTenant.calendario ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${ newTenant.calendario ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                    </div>
                  </div>

                  {newTenant.calendario && (
                    <div className="space-y-6 animate-fade-in">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">E-mail Google da Empresa</label>
                        <div className="relative">
                          <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                          <input type="email" value={newTenant.google_email} onChange={e => setNewTenant({ ...newTenant, google_email: e.target.value })}
                            placeholder="empresa@gmail.com" className="w-full pl-11 pr-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Duração Padrão (minutos)</label>
                        <div className="flex items-center gap-3">
                          {[30, 45, 60, 90, 120].map(min => (
                            <button key={min} type="button" onClick={() => setNewTenant({ ...newTenant, duracao_visita: min })}
                              className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border-2 ${newTenant.duracao_visita === min ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                              {min}m
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="animate-fade-in space-y-6">
                  <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 mb-6">
                     <p className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-2">Seletor de Entitlements (Motores)</p>
                     <p className="text-[10px] text-indigo-600 font-medium leading-relaxed">Selecione quais grandes motores estarão ativos.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {availableModules.map((mod: any) => (
                      <label key={mod.id} className={`flex items-center p-4 rounded-2xl border-2 transition-all cursor-pointer group ${newTenant.selected_modules.includes(mod.id) ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-50 bg-gray-50/30 hover:border-gray-200'}`}>
                        <input type="checkbox" className="hidden" checked={newTenant.selected_modules.includes(mod.id)}
                          onChange={() => {
                            const current = newTenant.selected_modules;
                            if (current.includes(mod.id)) setNewTenant({...newTenant, selected_modules: current.filter(id => id !== mod.id)});
                            else setNewTenant({...newTenant, selected_modules: [...current, mod.id]});
                          }}
                        />
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center mr-3 transition-colors ${newTenant.selected_modules.includes(mod.id) ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                          <CheckCircleIcon className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-[10px] font-black uppercase tracking-tight ${newTenant.selected_modules.includes(mod.id) ? 'text-indigo-900' : 'text-gray-500'}`}>{mod.name}</span>
                          <span className="text-[8px] text-gray-400 font-medium">{mod.slug}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-8 border-t border-gray-100 flex justify-end gap-4">
                <button type="button" onClick={() => setShowModal(false)}
                   className="px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all">Abortar</button>
                <button type="submit"
                   className="px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all">Efetivar Provisionamento</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL: EDIÇÃO 360º DE UNIDADE (SISTEMA DE ABAS) */}
      {showEditModal && editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
            <div className="px-10 py-8 bg-gradient-to-r from-indigo-700 via-blue-700 to-slate-800 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter">{editingTenant.name}</h2>
                <div className="flex gap-3 mt-4">
                   <button type="button" onClick={() => setActiveTab('geral')} 
                     className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'geral' ? 'bg-white text-indigo-700 shadow-md' : 'text-blue-200/70 hover:text-white hover:bg-white/10'}`}>
                     1. Dados Gerais
                   </button>
                   <button type="button" onClick={() => setActiveTab('modulos')} 
                     className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'modulos' ? 'bg-white text-indigo-700 shadow-md' : 'text-blue-200/70 hover:text-white hover:bg-white/10'}`}>
                     2. Modularização
                   </button>
                   <button type="button" onClick={() => setActiveTab('google_calendar')} 
                     className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'google_calendar' ? 'bg-white text-emerald-700 shadow-md' : 'text-blue-200/70 hover:text-white hover:bg-white/10'}`}>
                     <CalendarDaysIcon className="h-3 w-3" />
                     3. Google Calendar
                   </button>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="bg-white/15 p-3 rounded-full hover:bg-white/25 transition-all font-black text-xs border border-white/20">FECHAR</button>
            </div>
            
            <form onSubmit={handleUpdateTenant} className="flex-1 overflow-y-auto p-10 flex flex-col">
              {activeTab === 'geral' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-fade-in">
                  <div className="space-y-8">
                     <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest border-l-4 border-indigo-500 pl-3">Identidade Institucional</h4>
                     <div className="space-y-4">
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Razão Social</label>
                        <input type="text" value={editingTenant.name || ''} onChange={e => setEditingTenant({...editingTenant, name: e.target.value})}
                          className="w-full px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-bold text-xs focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Digitie o nome da empresa" />
                        
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">CNPJ / CPF</label>
                        <input type="text" value={editingTenant.cnpj_cpf || ''} onChange={e => setEditingTenant({...editingTenant, cnpj_cpf: e.target.value})}
                          className="w-full px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-mono text-xs focus:ring-2 focus:ring-blue-500 transition-all" placeholder="00.000.000/0000-00" />
                        
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Segmento Master</label>
                        <select value={editingTenant.segment_id || ''} onChange={e => setEditingTenant({...editingTenant, segment_id: e.target.value})}
                          className="w-full px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-black text-xs focus:ring-2 focus:ring-blue-500 transition-all uppercase cursor-pointer">
                          {segments.map(s => (
                            <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                          ))}
                        </select>
                     </div>
                     <h4 className="text-[10px] font-black text-green-500 uppercase tracking-widest border-l-4 border-green-500 pl-3">Contatos Master</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">E-mail para Notificações</label>
                          <input type="email" value={editingTenant.email_contato || ''} onChange={e => setEditingTenant({...editingTenant, email_contato: e.target.value})}
                            className="w-full px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-bold text-[10px] focus:ring-2 focus:ring-blue-500 transition-all" placeholder="contato@empresa.com.br" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Telefone Principal</label>
                          <input type="text" value={editingTenant.telefone || ''} onChange={e => setEditingTenant({...editingTenant, telefone: e.target.value})}
                            className="w-full px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-bold text-[10px] focus:ring-2 focus:ring-blue-500 transition-all" placeholder="(00) 00000-0000" />
                        </div>

                        {/* Engenharia de IA no EDIT */}
                        <div className="col-span-2 pt-4 border-t border-gray-100">
                           <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4">Engenharia de IA</h4>
                           <div className="space-y-4">
                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-black text-gray-400 ml-1 uppercase">Chave API Groq (Llama / Mixtral)</label>
                                <input type="password" placeholder="gsk_..." value={editingTenant.ai_config?.groq_key || ''} 
                                  onChange={e => setEditingTenant({...editingTenant, ai_config: { ...editingTenant.ai_config, groq_key: e.target.value }})}
                                  className="w-full px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-mono text-[10px] focus:ring-2 focus:ring-indigo-500 transition-all" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-black text-gray-400 ml-1 uppercase">Chave API Google (Gemini)</label>
                                <input type="password" placeholder="AIzaSy..." value={editingTenant.ai_config?.gemini_key || ''} 
                                  onChange={e => setEditingTenant({...editingTenant, ai_config: { ...editingTenant.ai_config, gemini_key: e.target.value }})}
                                  className="w-full px-5 py-4 rounded-xl bg-gray-50 border-gray-100 font-mono text-[10px] focus:ring-2 focus:ring-indigo-500 transition-all" />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-black text-gray-400 ml-1 uppercase">Modelo de IA Preferido</label>
                                <input type="text" placeholder="Ex: llama-3.3-70b-versatile ou gemini-2.0-flash" value={editingTenant.ai_config?.preferred_model || ''} 
                                  onChange={e => setEditingTenant({...editingTenant, ai_config: { ...editingTenant.ai_config, preferred_model: e.target.value }})}
                                  className={`w-full px-5 py-4 rounded-xl font-mono text-[10px] focus:ring-2 transition-all ${
                                    (editingTenant.ai_config?.preferred_model || '').startsWith('gsk_') || (editingTenant.ai_config?.preferred_model || '').startsWith('AIzaSy')
                                      ? 'bg-red-50 border border-red-300 focus:ring-red-400'
                                      : 'bg-gray-50 border-gray-100 focus:ring-indigo-500'
                                  }`} />
                                {((editingTenant.ai_config?.preferred_model || '').startsWith('gsk_') || (editingTenant.ai_config?.preferred_model || '').startsWith('AIzaSy')) && (
                                  <p className="text-[9px] text-red-600 font-black ml-1">⚠️ Isso parece uma chave de API, não um nome de modelo. Insira aqui apenas o nome (ex: llama-3.3-70b-versatile).</p>
                                )}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="space-y-8">
                     <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest border-l-4 border-red-500 pl-3">Logística Física</h4>
                     <div className="grid grid-cols-6 gap-3">
                        <div className="col-span-4">
                          <label className="text-[9px] font-black text-gray-400 uppercase">Logradouro / Rua</label>
                          <input type="text" value={editingTenant.logradouro || ''} onChange={e => setEditingTenant({...editingTenant, logradouro: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 font-bold text-[10px]" placeholder="Av. Principal" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-black text-gray-400 uppercase">Nº</label>
                          <input type="text" value={editingTenant.numero || ''} onChange={e => setEditingTenant({...editingTenant, numero: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 font-bold text-[10px] text-center" placeholder="123" />
                        </div>
                        <div className="col-span-3">
                          <label className="text-[9px] font-black text-gray-400 uppercase">Bairro</label>
                          <input type="text" value={editingTenant.bairro || ''} onChange={e => setEditingTenant({...editingTenant, bairro: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 font-bold text-[10px]" placeholder="Centro" />
                        </div>
                        <div className="col-span-3">
                          <label className="text-[9px] font-black text-gray-400 uppercase">CEP</label>
                          <input type="text" value={editingTenant.cep || ''} onChange={e => setEditingTenant({...editingTenant, cep: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 font-mono text-[10px] text-center" placeholder="00000-000" />
                        </div>
                        <div className="col-span-4">
                          <label className="text-[9px] font-black text-gray-400 uppercase">Cidade</label>
                          <input type="text" value={editingTenant.cidade || ''} onChange={e => setEditingTenant({...editingTenant, cidade: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 font-bold text-[10px]" placeholder="São Paulo" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-black text-gray-400 uppercase">UF</label>
                          <input type="text" maxLength={2} value={editingTenant.estado || ''} onChange={e => setEditingTenant({...editingTenant, estado: e.target.value.toUpperCase()})}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 font-black text-[10px] text-center uppercase" placeholder="SP" />
                        </div>
                     </div>
                     <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-widest border-l-4 border-purple-500 pl-3">Identidade Visual</h4>
                     <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 relative cursor-pointer group">
                        <div className="h-14 w-14 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                          {editingTenant.logo || editingTenant.logo_url ? (
                            <img src={editingTenant.logo || editingTenant.logo_url || ''} className="max-h-full max-w-full object-contain" />
                          ) : (
                            <PhotoIcon className="h-6 w-6 text-gray-200" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] font-black text-gray-700 uppercase">Personalizar Logotipo</p>
                          <p className="text-[8px] text-gray-400 font-bold uppercase">PNG/JPG (1MB)</p>
                        </div>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleEditFileChange} />
                     </div>

                     <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Cores da Marca (Branding)</h4>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Cor Primária</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={editingTenant.primary_color || '#1A2B3C'} onChange={e => setEditingTenant({...editingTenant, primary_color: e.target.value})}
                              className="h-10 w-20 rounded-lg cursor-pointer bg-transparent border-none" />
                            <input type="text" value={editingTenant.primary_color || '#1A2B3C'} onChange={e => setEditingTenant({...editingTenant, primary_color: e.target.value})}
                              className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border-gray-100 font-mono text-[10px] uppercase" />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Cor Secundária</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={editingTenant.secondary_color || '#F1F1F1'} onChange={e => setEditingTenant({...editingTenant, secondary_color: e.target.value})}
                              className="h-10 w-20 rounded-lg cursor-pointer bg-transparent border-none" />
                            <input type="text" value={editingTenant.secondary_color || '#F1F1F1'} onChange={e => setEditingTenant({...editingTenant, secondary_color: e.target.value})}
                              className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border-gray-100 font-mono text-[10px] uppercase" />
                          </div>
                        </div>
                     </div>

                     {/* Seção: Responsável pela Unidade (Contexto Master) */}
                     <div className="pt-6 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center">
                            <IdentificationIcon className="h-4 w-4 mr-2" />
                            Responsável pela Unidade (Onboarding)
                          </h4>
                          {userFound && (
                            <span className="bg-green-100 text-green-700 text-[8px] font-black px-2 py-1 rounded-full uppercase">Identidade Verificada</span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                           {/* EMAIL PRIMEIRO EM EDIÇÃO TAMBÉM */}
                           <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 relative">
                              <p className="text-[8px] font-black text-blue-400 uppercase mb-2">E-Mail de Acesso</p>
                              <input 
                                type="email" 
                                value={editingTenant.admin_email || ''} 
                                onChange={e => {
                                  setEditingTenant({...editingTenant, admin_email: e.target.value})
                                  if (userFound) setUserFound(false)
                                }}
                                onBlur={e => checkEmailForEdit(e.target.value)}
                                className="w-full bg-transparent border-none p-0 font-black text-[10px] text-blue-900 focus:ring-0" 
                                placeholder="admin@email.com" 
                              />
                              {isCheckingEmail && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                  <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                                </div>
                              )}
                           </div>

                           <div className={`p-4 rounded-2xl border transition-all ${userFound ? 'bg-gray-100 border-transparent opacity-60' : 'bg-blue-50/50 border-blue-100'}`}>
                             <p className="text-[8px] font-black text-blue-400 uppercase mb-2">Nome Completo</p>
                             <input 
                               type="text" 
                               value={editingTenant.admin_nome || ''} 
                               onChange={e => setEditingTenant({...editingTenant, admin_nome: e.target.value})}
                               readOnly={userFound}
                               className={`w-full bg-transparent border-none p-0 font-black text-[10px] focus:ring-0 ${userFound ? 'text-gray-500' : 'text-blue-900'}`} 
                               placeholder="Nome do Admin" 
                             />
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div className={`p-4 rounded-2xl border transition-all ${userFound ? 'bg-gray-100 border-transparent opacity-60' : 'bg-blue-50/50 border-blue-100'}`}>
                                 <p className="text-[8px] font-black text-blue-400 uppercase mb-2">Usuário (Login)</p>
                                 <input 
                                   type="text" 
                                   value={editingTenant.admin_username || ''} 
                                   onChange={e => setEditingTenant({...editingTenant, admin_username: e.target.value})}
                                   readOnly={userFound}
                                   className={`w-full bg-transparent border-none p-0 font-black text-[10px] focus:ring-0 ${userFound ? 'text-gray-500' : 'text-blue-900'}`} 
                                   placeholder="usuario_admin" 
                                 />
                              </div>
                              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 relative">
                                <p className="text-[8px] font-black text-blue-400 uppercase mb-2">Resetar Senha (Opcional)</p>
                                <input type={showEditPassword ? "text" : "password"} value={editingTenant.admin_password || ''} 
                                  onChange={e => setEditingTenant({...editingTenant, admin_password: e.target.value})}
                                  className="w-full bg-transparent border-none p-0 font-black text-[10px] text-blue-900 focus:ring-0 pr-10" placeholder="••••••••" autoComplete="new-password" />
                                <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-4 top-[60%] -translate-y-1/2 text-blue-400 hover:text-blue-600">
                                  {showEditPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                                </button>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>
              ) : activeTab === 'google_calendar' ? (

                <div className="animate-fade-in space-y-8">
                  {/* Banner informativo */}
                  <div className="flex items-start gap-4 p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                    <div className="p-3 bg-emerald-600 rounded-2xl flex-shrink-0">
                      <CalendarDaysIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-900 uppercase tracking-widest mb-1">Integração Google Calendar</p>
                      <p className="text-[10px] text-emerald-700 font-medium leading-relaxed">
                        Configure o calendário corporativo desta unidade. Quando habilitado, o botão
                        "Agendar Visita" aparece no CRM Kanban e os corretores podem vincular
                        seus Google Calendars individuais.
                      </p>
                    </div>
                  </div>

                  {/* Toggle: Habilitar módulo */}
                  <div className="p-6 rounded-3xl border-2 transition-all cursor-pointer"
                    style={{ borderColor: editingTenant?.calendario ? '#059669' : '#e5e7eb', backgroundColor: editingTenant?.calendario ? '#f0fdf4' : '#f9fafb' }}
                    onClick={() => setEditingTenant({ ...editingTenant, calendario: !editingTenant?.calendario })}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl transition-colors ${editingTenant?.calendario ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                          <CalendarDaysIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Módulo de Agendamentos</p>
                          <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                            Habilita o fluxo de agendamento de visitas com Google Calendar
                          </p>
                        </div>
                      </div>
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ editingTenant?.calendario ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${ editingTenant?.calendario ? 'translate-x-6' : 'translate-x-1'}`} />
                      </div>
                    </div>
                  </div>

                  {/* Campos — só aparece quando habilitado */}
                  {editingTenant?.calendario && (
                    <div className="space-y-6 animate-fade-in">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          E-mail Google da Empresa (calendário corporativo)
                        </label>
                        <div className="relative">
                          <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                          <input
                            type="email"
                            value={editingTenant?.google_email || ''}
                            onChange={e => setEditingTenant({ ...editingTenant, google_email: e.target.value })}
                            placeholder="empresa@gmail.com"
                            className="w-full pl-11 pr-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs focus:ring-2 focus:ring-emerald-500 transition-all"
                          />
                        </div>
                        <p className="text-[9px] text-gray-400 mt-2 font-medium">
                          Este e-mail Google precisa ter o calendário compartilhado com a Service Account.
                          Configure em Google Calendar → Configurações → Compartilhar este calendário.
                        </p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                          Duração Padrão das Visitas (minutos)
                        </label>
                        <div className="flex items-center gap-3">
                          {[30, 45, 60, 90, 120].map(min => (
                            <button
                              key={min}
                              type="button"
                              onClick={() => setEditingTenant({ ...editingTenant, duracao_visita: min })}
                              className={`flex-1 py-3 rounded-xl text-xs font-black transition-all border-2 ${
                                (editingTenant?.duracao_visita || 60) === min
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-500/20'
                                  : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-emerald-200'
                              }`}
                            >
                              {min}m
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-gray-400 mt-2 font-medium">
                          Define a duração de cada slot de visita exibida no calendário.
                        </p>
                      </div>

                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                        <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest mb-1">⚙️ Service Account</p>
                        <p className="text-[10px] text-amber-600 font-medium leading-relaxed">
                          Para o calendário corporativo funcionar, configure a variável <code className="bg-amber-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_KEY</code> no arquivo <code className="bg-amber-100 px-1 rounded">.env.local</code> com a chave JSON da sua Service Account do Google Cloud Console.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

              ) : (

                <div className="animate-fade-in space-y-6">
                  <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 mb-6">
                     <p className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-2">Seletor de Entitlements (Motores)</p>
                     <p className="text-[10px] text-indigo-600 font-medium leading-relaxed">Selecione quais grandes motores estarão ativos para esta unidade. Os módulos habilitados liberam automaticamente suas categorias e funcionalidades internas.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableModules.map((mod: any) => (
                      <div key={mod.id} onClick={() => toggleModule(mod.id)}
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex justify-between items-center group ${
                          tenantModules.includes(mod.id) ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100' : 'border-gray-100 bg-white hover:border-indigo-200'
                        }`}>
                        <div className="flex items-center">
                          <div className={`p-3 rounded-xl mr-4 ${tenantModules.includes(mod.id) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                             <Squares2X2Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{mod.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">IDENT: {mod.slug}</p>
                          </div>
                        </div>
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center border-2 ${tenantModules.includes(mod.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-200'}`}>
                           {tenantModules.includes(mod.id) && <CheckCircleIcon className="h-5 w-5 text-white" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto pt-10 border-t border-gray-100 flex justify-end gap-4">
                <button type="button" onClick={() => setShowEditModal(false)}
                   className="px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit"
                   className="px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 transition-all">Efetivar Configurações Master</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
