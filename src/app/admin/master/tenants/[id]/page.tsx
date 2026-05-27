'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useApi } from '@/hooks/useApi'
import { 
  BuildingOfficeIcon, 
  MapPinIcon, 
  PhoneIcon, 
  GlobeAltIcon, 
  ArrowLeftIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  Squares2X2Icon,
  ShieldCheckIcon,
  CogIcon
} from '@heroicons/react/24/outline'

export default function TenantDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { get, patch, post } = useApi()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenant, setTenant] = useState<any>(null)
  const [segments, setSegments] = useState<any[]>([])
  const [features, setFeatures] = useState<any[]>([])
  const [success, setSuccess] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [tenantRes, segmentsRes, featuresRes] = await Promise.all([
        get(`/api/admin/master/tenants/${id}`),
        get('/api/admin/master/segments'),
        get(`/api/admin/master/tenants/${id}/features`)
      ])
      
      if (tenantRes.ok) {
        const data = await tenantRes.json()
        setTenant(data.tenant)
      }
      
      if (segmentsRes.ok) {
        const data = await segmentsRes.json()
        setSegments(data.segments)
      }

      if (featuresRes.ok) {
        const data = await featuresRes.json()
        setFeatures(data.features)
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const response = await patch(`/api/admin/master/tenants/${id}`, tenant)
      if (response.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        alert('Erro ao salvar alterações')
      }
    } catch (error) {
      alert('Erro inesperado')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFeature = async (featureId: string, currentStatus: boolean) => {
    try {
      const response = await post(`/api/admin/master/tenants/${id}/features`, {
        featureId,
        isActive: !currentStatus
      })
      if (response.ok) {
        // Atualizar lista localmente
        setFeatures(features.map(f => 
          f.id === featureId ? { ...f, is_active: !currentStatus, has_override: true } : f
        ))
      }
    } catch (error) {
      alert('Erro ao atualizar funcionalidade')
    }
  }

  if (loading) return <div className="p-12 text-center font-black text-gray-400 uppercase tracking-widest animate-pulse">Sincronizando Dossiê Master...</div>
  if (!tenant) return <div className="p-12 text-center text-red-500 font-bold">Empresa não encontrada.</div>

  // Agrupar features por categoria
  const groupedFeatures: Record<string, any[]> = {}
  features.forEach(f => {
    if (!groupedFeatures[f.category_name]) groupedFeatures[f.category_name] = []
    groupedFeatures[f.category_name].push(f)
  })

  return (
    <div className="p-8 bg-gray-50 min-h-screen pb-24 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-gray-900 font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Voltar para Listagem
          </button>
          
          <div className="flex items-center gap-4">
            {success && (
              <span className="flex items-center text-green-600 font-bold text-xs animate-in fade-in slide-in-from-right-4 uppercase tracking-widest">
                <CheckCircleIcon className="h-4 w-4 mr-1" /> Transmissão Concluída
              </span>
            )}
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 uppercase text-[10px] tracking-widest"
            >
              {saving ? 'Gravando...' : 'Atualizar Ecossistema'}
            </button>
          </div>
        </div>

        {/* Entity Banner */}
        <div className="mb-10 flex items-center bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
          <div className="h-24 w-24 rounded-[1.8rem] bg-gray-50 shadow-inner flex items-center justify-center overflow-hidden border border-gray-100 mr-8">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} className="h-full w-full object-cover" />
            ) : (
              <BuildingOfficeIcon className="h-12 w-12 text-gray-200" />
            )}
          </div>
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">{tenant.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-lg border">
                ID: {tenant.id}
              </span>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-3 py-1 rounded-lg">
                Status: {tenant.status === 'active' ? 'Operational' : 'Halted'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Coluna Esquerda: Dados e Configs */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Seção: Identidade Jurídica e Fiscal */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
              <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center uppercase tracking-tighter">
                <BuildingOfficeIcon className="h-6 w-6 mr-3 text-blue-600" />
                Vigilância Sanitária e Fiscal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Razão Social / Nome Fantasia</label>
                  <input type="text" value={tenant.name || ''} onChange={e => setTenant({...tenant, name: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">CNPJ / CPF</label>
                  <input type="text" value={tenant.cnpj_cpf || ''} onChange={e => setTenant({...tenant, cnpj_cpf: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-mono font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Segmento Operacional</label>
                   <select 
                     value={tenant.segment_id || ''}
                     onChange={e => setTenant({...tenant, segment_id: e.target.value})}
                     className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-black text-[10px] uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                   >
                     {segments.map(s => (
                       <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                     ))}
                   </select>
                </div>
              </div>
            </div>

            {/* Seção: Localização */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-black text-gray-900 flex items-center uppercase tracking-tighter">
                  <MapPinIcon className="h-6 w-6 mr-3 text-red-600" />
                  Infraestrutura Logística (Endereço)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Logradouro / Avenida</label>
                  <input type="text" value={tenant.logradouro || ''} onChange={e => setTenant({...tenant, logradouro: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Número</label>
                  <input type="text" value={tenant.numero || ''} onChange={e => setTenant({...tenant, numero: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Complemento</label>
                  <input type="text" value={tenant.complemento || ''} onChange={e => setTenant({...tenant, complemento: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="SALA, ANDAR..." />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Bairro</label>
                  <input type="text" value={tenant.bairro || ''} onChange={e => setTenant({...tenant, bairro: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cidade</label>
                  <input type="text" value={tenant.cidade || ''} onChange={e => setTenant({...tenant, cidade: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">UF</label>
                  <input type="text" value={tenant.estado || ''} maxLength={2} onChange={e => setTenant({...tenant, estado: e.target.value.toUpperCase()})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">CEP</label>
                  <input type="text" value={tenant.cep || ''} onChange={e => setTenant({...tenant, cep: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-mono font-bold text-xs uppercase text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* Seção: Governança de Recursos (OVERRIDES) */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
              <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center uppercase tracking-tighter">
                <ShieldCheckIcon className="h-6 w-6 mr-3 text-indigo-600" />
                Governança de Recursos e Módulos
              </h3>
              
              <div className="space-y-10">
                {Object.entries(groupedFeatures).map(([category, catFeatures]) => (
                  <div key={category} className="space-y-4">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] ml-1">{category}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {catFeatures.map((f: any) => (
                        <div key={f.id} className="group p-5 bg-gray-50 rounded-2xl border border-transparent hover:border-indigo-100 transition-all flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`p-3 rounded-xl mr-4 ${f.is_active ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-400'}`}>
                              <CogIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className={`text-xs font-black uppercase tracking-tight ${f.is_active ? 'text-gray-900' : 'text-gray-400'}`}>{f.name}</p>
                              {f.has_override && (
                                <span className="text-[8px] font-black italic text-orange-500 uppercase tracking-widest">Override Ativo</span>
                              )}
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => handleToggleFeature(f.id, f.is_active)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${f.is_active ? 'bg-indigo-600' : 'bg-gray-300'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${f.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Coluna Direita: Branding & Contato */}
          <div className="space-y-8">
            {/* Branding Section */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
               <h3 className="text-md font-black text-gray-900 mb-6 flex items-center uppercase tracking-tighter">
                <PhoneIcon className="h-5 w-5 mr-3 text-green-600" />
                Conectividade Digital
              </h3>
              <div className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">E-mail de Contato</label>
                   <input type="email" value={tenant.email_contato || ''} onChange={e => setTenant({...tenant, email_contato: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-[10px] uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Telefone Principal</label>
                   <input type="text" value={tenant.telefone || ''} onChange={e => setTenant({...tenant, telefone: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-[10px] uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* NOVO: AI Configuration Section */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
               <h3 className="text-md font-black text-gray-900 mb-6 flex items-center uppercase tracking-tighter">
                <CogIcon className="h-5 w-5 mr-3 text-indigo-600" />
                Engenharia de IA (Agnostic Keys)
              </h3>
              <div className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">GROQ_API_KEY (Llama / Mixtral)</label>
                   <input type="password" value={tenant.ai_config?.groq_key || ''} 
                    onChange={e => setTenant({...tenant, ai_config: { ...tenant.ai_config, groq_key: e.target.value }})}
                    placeholder="gsk_..."
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-mono text-[10px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
                <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">GEMINI_API_KEY (Google IA)</label>
                   <input type="password" value={tenant.ai_config?.gemini_key || ''} 
                    onChange={e => setTenant({...tenant, ai_config: { ...tenant.ai_config, gemini_key: e.target.value }})}
                    placeholder="AIzaSy..."
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-mono text-[10px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* Logo Section */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
               <h3 className="text-md font-black text-gray-900 mb-6 flex items-center uppercase tracking-tighter">
                <CloudArrowUpIcon className="h-5 w-5 mr-3 text-purple-600" />
                URL da Logomarca
              </h3>
              <div className="space-y-4">
                <input 
                  type="text" 
                  value={tenant.logo_url || ''} 
                  onChange={e => setTenant({...tenant, logo_url: e.target.value})}
                  placeholder="https://exemplo.com/logo.png"
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-mono text-[10px] focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                />
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Dica: Recomendamos logomarcas em fundo transparente (PNG ou SVG).</p>
              </div>
            </div>

            {/* QR/Logo Preview */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-10 rounded-[2.5rem] shadow-2xl text-white">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 opacity-60">Preview de Identidade Visual</p>
               <div className="bg-white rounded-[2.5rem] p-8 flex items-center justify-center shadow-inner aspect-square mb-6">
                 {tenant.logo_url ? (
                   <img src={tenant.logo_url} className="max-h-full max-w-full object-contain" />
                 ) : (
                   <BuildingOfficeIcon className="h-20 w-20 text-gray-100" />
                 )}
               </div>
               <div className="flex items-center justify-center gap-2">
                 <ShieldCheckIcon className="h-4 w-4 text-green-400" />
                 <p className="text-center text-[10px] font-bold uppercase opacity-80">Unidade Ativa e Regular</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


