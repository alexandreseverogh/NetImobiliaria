'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useApi } from '@/hooks/useApi'
import {
  BuildingOfficeIcon,
  MapPinIcon,
  PhoneIcon,
  ArrowLeftIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  CogIcon,
  MegaphoneIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

/* ─── Types ──────────────────────────────────────────────── */
interface MetaIdentity {
  pageId: string
  pixelId: string
  instagramActorId: string
  accessToken: string
  adAccountId: string
  credentialsActive: boolean
  website: string
  tenantName: string
}

const EMPTY_META: MetaIdentity = {
  pageId: '', pixelId: '', instagramActorId: '',
  accessToken: '', adAccountId: '', credentialsActive: false,
  website: '', tenantName: '',
}

/* ─── Field component ────────────────────────────────────── */
function Field({
  label, value, onChange, placeholder, hint, badge, type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  badge?: { text: string; color: string }
  type?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {label}
        </label>
        {badge && (
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badge.color}`}>
            {badge.text}
          </span>
        )}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
      />
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */
export default function TenantDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { get, patch, post } = useApi()

  const [activeTab, setActiveTab] = useState<'dados' | 'meta'>('dados')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [success, setSuccess]     = useState(false)
  const [tenant, setTenant]       = useState<any>(null)
  const [segments, setSegments]   = useState<any[]>([])
  const [features, setFeatures]   = useState<any[]>([])

  /* Meta identity */
  const [meta, setMeta]           = useState<MetaIdentity>(EMPTY_META)
  const [metaSaving, setMetaSaving] = useState(false)
  const [metaSaved,  setMetaSaved]  = useState(false)

  /* ── Load data ── */
  useEffect(() => { fetchData() }, [id])

  async function fetchData() {
    try {
      setLoading(true)
      const [tenantRes, segmentsRes, featuresRes, metaRes] = await Promise.all([
        get(`/api/admin/master/tenants/${id}`),
        get('/api/admin/master/segments'),
        get(`/api/admin/master/tenants/${id}/features`),
        get(`/api/admin/master/tenants/${id}/meta-identity`),
      ])

      if (tenantRes.ok) {
        const d = await tenantRes.json()
        setTenant(d.tenant)
      }
      if (segmentsRes.ok) {
        const d = await segmentsRes.json()
        setSegments(d.segments)
      }
      if (featuresRes.ok) {
        const d = await featuresRes.json()
        setFeatures(d.features)
      }
      if (metaRes.ok) {
        setMeta(await metaRes.json())
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  /* ── Save tenant data ── */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await patch(`/api/admin/master/tenants/${id}`, tenant)
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        alert('Erro ao salvar alterações')
      }
    } catch { alert('Erro inesperado') }
    finally { setSaving(false) }
  }

  /* ── Save Meta identity ── */
  async function handleSaveMeta() {
    setMetaSaving(true)
    try {
      const res = await fetch(`/api/admin/master/tenants/${id}/meta-identity`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          pageId:           meta.pageId,
          pixelId:          meta.pixelId,
          instagramActorId: meta.instagramActorId,
          website:          meta.website,
        }),
      })
      if (res.ok) {
        setMetaSaved(true)
        setTimeout(() => setMetaSaved(false), 3000)
      } else {
        alert('Erro ao salvar configurações Meta')
      }
    } catch { alert('Erro de conexão') }
    finally { setMetaSaving(false) }
  }

  /* ── Toggle feature ── */
  async function handleToggleFeature(featureId: string, currentStatus: boolean) {
    try {
      const res = await post(`/api/admin/master/tenants/${id}/features`, {
        featureId, isActive: !currentStatus,
      })
      if (res.ok) {
        setFeatures(features.map(f =>
          f.id === featureId ? { ...f, is_active: !currentStatus, has_override: true } : f
        ))
      }
    } catch { alert('Erro ao atualizar funcionalidade') }
  }

  /* ── Guards ── */
  if (loading) {
    return (
      <div className="p-12 text-center font-black text-gray-400 uppercase tracking-widest animate-pulse">
        Carregando...
      </div>
    )
  }
  if (!tenant) {
    return (
      <div className="p-12 text-center text-red-500 font-bold">Empresa não encontrada.</div>
    )
  }

  const groupedFeatures: Record<string, any[]> = {}
  features.forEach(f => {
    if (!groupedFeatures[f.category_name]) groupedFeatures[f.category_name] = []
    groupedFeatures[f.category_name].push(f)
  })

  /* ══════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════ */
  return (
    <div className="p-8 bg-gray-50 min-h-screen pb-24">
      <div className="max-w-6xl mx-auto">

        {/* ── Top bar ── */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-400 hover:text-gray-900 font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Voltar para Listagem
          </button>

          {/* Save button — visible only on "dados" tab */}
          {activeTab === 'dados' && (
            <div className="flex items-center gap-4">
              {success && (
                <span className="flex items-center text-green-600 font-bold text-xs uppercase tracking-widest">
                  <CheckCircleIcon className="h-4 w-4 mr-1" /> Salvo!
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 uppercase text-[10px] tracking-widest"
              >
                {saving ? 'Salvando...' : 'Salvar Dados'}
              </button>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('dados')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all border ${
              activeTab === 'dados'
                ? 'bg-white border-gray-200 text-gray-900 shadow-sm'
                : 'bg-transparent border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <BuildingOfficeIcon className="h-4 w-4" />
            Dados do Tenant
          </button>
          <button
            onClick={() => setActiveTab('meta')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all border ${
              activeTab === 'meta'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                : 'bg-transparent border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <MegaphoneIcon className="h-4 w-4" />
            Config. Meta
          </button>
        </div>

        {/* ════════════════════════════════════════════════
            TAB: Config. Meta
        ════════════════════════════════════════════════ */}
        {activeTab === 'meta' && (
          <div className="max-w-2xl">
            {/* Header */}
            <div className="rounded-2xl p-6 mb-6 text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">
                Identidade Meta
              </p>
              <h2 className="text-xl font-black">Page ID · Pixel · Instagram · Site</h2>
              <p className="text-sm opacity-70 mt-1">
                Credenciais Meta Ads deste tenant. Utilizadas no lançamento de campanhas.
              </p>
            </div>

            {/* Alert: page_id missing */}
            {!meta.pageId && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-700">Facebook Page ID não configurado</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Sem Page ID os criativos não podem ser criados no Meta para este tenant.
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <Field
                label="Facebook Page ID"
                value={meta.pageId}
                onChange={v => setMeta(m => ({ ...m, pageId: v }))}
                placeholder="Ex: 105308234567890"
                hint="ID numérico da Página do Facebook deste tenant."
                badge={{ text: 'Obrigatório', color: 'text-red-500 bg-red-50' }}
              />
              <Field
                label="Meta Pixel ID"
                value={meta.pixelId}
                onChange={v => setMeta(m => ({ ...m, pixelId: v }))}
                placeholder="Ex: 876543210987654"
                hint="Pixel exclusivo do tenant para rastreamento de conversões."
                badge={{ text: 'Conversões', color: 'text-violet-500 bg-violet-50' }}
              />
              <Field
                label="Instagram Actor ID"
                value={meta.instagramActorId}
                onChange={v => setMeta(m => ({ ...m, instagramActorId: v }))}
                placeholder="Ex: 17841234567890"
                hint="Conta Instagram vinculada. Opcional."
                badge={{ text: 'Opcional', color: 'text-gray-400 bg-gray-100' }}
              />
              <Field
                label="Website / Site do Tenant"
                value={meta.website}
                onChange={v => setMeta(m => ({ ...m, website: v }))}
                placeholder="Ex: www.imobiliaria.com.br"
                hint="Pré-preenche o Link da campanha no wizard."
              />

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                {metaSaved && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                    <CheckCircleIcon className="h-4 w-4" /> Salvo!
                  </span>
                )}
                <button
                  onClick={handleSaveMeta}
                  disabled={metaSaving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                >
                  {metaSaving ? 'Salvando...' : 'Salvar Configurações Meta'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: Dados do Tenant
        ════════════════════════════════════════════════ */}
        {activeTab === 'dados' && (
          <>
            {/* Entity Banner */}
            <div className="mb-10 flex items-center bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
              <div className="h-24 w-24 rounded-[1.8rem] bg-gray-50 shadow-inner flex items-center justify-center overflow-hidden border border-gray-100 mr-8">
                {tenant.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tenant.logo_url} className="h-full w-full object-cover" alt="" />
                ) : (
                  <BuildingOfficeIcon className="h-12 w-12 text-gray-200" />
                )}
              </div>
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">
                  {tenant.name}
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-lg border">
                    ID: {tenant.id}
                  </span>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-3 py-1 rounded-lg">
                    Status: {tenant.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* ── Coluna Esquerda ── */}
              <div className="lg:col-span-2 space-y-8">

                {/* Dados Gerais */}
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center uppercase tracking-tighter">
                    <BuildingOfficeIcon className="h-6 w-6 mr-3 text-blue-600" />
                    Dados Gerais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Razão Social / Nome Fantasia</label>
                      <input type="text" value={tenant.name || ''} onChange={e => setTenant({ ...tenant, name: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">CNPJ / CPF</label>
                      <input type="text" value={tenant.cnpj_cpf || ''} onChange={e => setTenant({ ...tenant, cnpj_cpf: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-mono font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Segmento</label>
                      <select value={tenant.segment_id || ''} onChange={e => setTenant({ ...tenant, segment_id: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-black text-[10px] uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer">
                        {segments.map(s => (
                          <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center uppercase tracking-tighter">
                    <MapPinIcon className="h-6 w-6 mr-3 text-red-600" />
                    Endereço
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Logradouro</label>
                      <input type="text" value={tenant.logradouro || ''} onChange={e => setTenant({ ...tenant, logradouro: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Número</label>
                      <input type="text" value={tenant.numero || ''} onChange={e => setTenant({ ...tenant, numero: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Complemento</label>
                      <input type="text" value={tenant.complemento || ''} onChange={e => setTenant({ ...tenant, complemento: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Bairro</label>
                      <input type="text" value={tenant.bairro || ''} onChange={e => setTenant({ ...tenant, bairro: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cidade</label>
                      <input type="text" value={tenant.cidade || ''} onChange={e => setTenant({ ...tenant, cidade: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">UF</label>
                      <input type="text" value={tenant.estado || ''} maxLength={2} onChange={e => setTenant({ ...tenant, estado: e.target.value.toUpperCase() })}
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs uppercase text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">CEP</label>
                      <input type="text" value={tenant.cep || ''} onChange={e => setTenant({ ...tenant, cep: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-mono font-bold text-xs uppercase text-center focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>

                {/* Módulos e Features */}
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                  <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center uppercase tracking-tighter">
                    <ShieldCheckIcon className="h-6 w-6 mr-3 text-indigo-600" />
                    Módulos e Funcionalidades
                  </h3>
                  <div className="space-y-10">
                    {Object.entries(groupedFeatures).map(([category, catFeatures]) => (
                      <div key={category} className="space-y-4">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">{category}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {catFeatures.map((f: any) => (
                            <div key={f.id} className="p-5 bg-gray-50 rounded-2xl flex items-center justify-between">
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
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${f.is_active ? 'bg-indigo-600' : 'bg-gray-300'}`}
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

              </div>{/* end col-span-2 */}

              {/* ── Coluna Direita ── */}
              <div className="space-y-8">

                {/* Contato */}
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                  <h3 className="text-md font-black text-gray-900 mb-6 flex items-center uppercase tracking-tighter">
                    <PhoneIcon className="h-5 w-5 mr-3 text-green-600" />
                    Contato
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">E-mail de Contato</label>
                      <input type="email" value={tenant.email_contato || ''} onChange={e => setTenant({ ...tenant, email_contato: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-[10px] uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Telefone Principal</label>
                      <input type="text" value={tenant.telefone || ''} onChange={e => setTenant({ ...tenant, telefone: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-[10px] uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>

                {/* IA Keys */}
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                  <h3 className="text-md font-black text-gray-900 mb-6 flex items-center uppercase tracking-tighter">
                    <CogIcon className="h-5 w-5 mr-3 text-indigo-600" />
                    Chaves de IA
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">GROQ API KEY</label>
                      <input type="password" value={tenant.ai_config?.groq_key || ''}
                        onChange={e => setTenant({ ...tenant, ai_config: { ...tenant.ai_config, groq_key: e.target.value } })}
                        placeholder="gsk_..."
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-mono text-[10px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">GEMINI API KEY</label>
                      <input type="password" value={tenant.ai_config?.gemini_key || ''}
                        onChange={e => setTenant({ ...tenant, ai_config: { ...tenant.ai_config, gemini_key: e.target.value } })}
                        placeholder="AIzaSy..."
                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-mono text-[10px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
                  <h3 className="text-md font-black text-gray-900 mb-6 flex items-center uppercase tracking-tighter">
                    <CloudArrowUpIcon className="h-5 w-5 mr-3 text-purple-600" />
                    Logomarca
                  </h3>
                  <input type="text" value={tenant.logo_url || ''} onChange={e => setTenant({ ...tenant, logo_url: e.target.value })}
                    placeholder="https://exemplo.com/logo.png"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 font-mono text-[10px] focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  {tenant.logo_url && (
                    <div className="mt-4 bg-gray-50 rounded-2xl p-4 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={tenant.logo_url} className="max-h-24 object-contain" alt="Logo preview" />
                    </div>
                  )}
                </div>

              </div>{/* end col-right */}

            </div>{/* end grid */}
          </>
        )}{/* end tab: dados */}

      </div>
    </div>
  )
}
