'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeftIcon, PencilIcon, TrashIcon,
  MegaphoneIcon, UserIcon, CheckCircleIcon,
  ExclamationTriangleIcon, GlobeAltIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { UpdateGuard, DeleteGuard } from '@/components/admin/PermissionGuard'

// ─── tipos ────────────────────────────────────────────────────────────────────
interface Cliente {
  uuid: string; nome: string; cpf: string; telefone: string; email: string
  endereco?: string; numero?: string; complemento?: string; bairro?: string
  estado_fk?: string; cidade_fk?: string; cep?: string; origem_cadastro?: string
  created_at: string; created_by?: string; updated_at: string; updated_by?: string
}

interface CampaignSettings {
  pageId: string; pixelId: string; instagramActorId: string; website: string
  fallback: {
    pageId: string; pixelId: string; instagramActorId: string
    website: string; adAccountId: string; credentialsActive: boolean
  }
}

// ─── sub-componente: campo com indicador de origem ────────────────────────────
function CampaignField({
  label, value, fallback, placeholder, badge, hint,
  onChange, saving,
}: {
  label: string; value: string; fallback: string; placeholder: string
  badge?: 'required' | 'conversions' | 'optional'
  hint?: string; onChange: (v: string) => void; saving: boolean
}) {
  const hasOwn     = value.trim() !== ''
  const hasFallback = fallback.trim() !== ''
  const status = hasOwn ? 'own' : hasFallback ? 'fallback' : 'empty'

  const badgeMap: Record<string, { label: string; cls: string }> = {
    required:    { label: 'OBRIGATÓRIO', cls: 'bg-rose-100 text-rose-700 border border-rose-200' },
    conversions: { label: 'CONVERSÕES',  cls: 'bg-violet-100 text-violet-700 border border-violet-200' },
    optional:    { label: 'OPCIONAL',    cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
  }

  const borderCls =
    status === 'own'      ? 'border-emerald-400 ring-1 ring-emerald-200' :
    status === 'fallback' ? 'border-amber-300' :
    badge === 'required'  ? 'border-rose-300' :
    'border-gray-200'

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeMap[badge].cls}`}>
              {badgeMap[badge].label}
            </span>
          )}
          {status === 'own' && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
              <CheckCircleIcon className="h-3 w-3" /> próprio
            </span>
          )}
          {status === 'fallback' && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600">
              <ExclamationTriangleIcon className="h-3 w-3" /> usando tenant
            </span>
          )}
        </div>
      </div>

      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={status === 'fallback' ? `Tenant: ${fallback}` : placeholder}
        disabled={saving}
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm font-medium text-gray-900
          placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400
          transition-all disabled:opacity-60 ${borderCls}`}
      />

      {hint && <p className="mt-1.5 text-[11px] text-gray-400">{hint}</p>}

      {status === 'fallback' && (
        <p className="mt-1 text-[11px] text-amber-600">
          Usando configuração do tenant. Preencha para sobrescrever especificamente para este cliente.
        </p>
      )}
    </div>
  )
}

// ─── aba campanha ──────────────────────────────────────────────────────────────
function CampaignTab({ clientId }: { clientId: string }) {
  const { get, put } = useAuthenticatedFetch()
  const [data, setData]       = useState<CampaignSettings | null>(null)
  const [form, setForm]       = useState({ pageId: '', pixelId: '', instagramActorId: '', website: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    get(`/api/admin/clientes/${clientId}/campaign-settings`)
      .then(r => r.json())
      .then((d: CampaignSettings) => {
        setData(d)
        setForm({ pageId: d.pageId, pixelId: d.pixelId, instagramActorId: d.instagramActorId, website: d.website })
      })
      .catch(() => setError('Erro ao carregar configurações'))
      .finally(() => setLoading(false))
  }, [clientId])

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await put(`/api/admin/clientes/${clientId}/campaign-settings`, form)
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao salvar')
      const updated = await res.json()
      setForm(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const update = (field: string) => (v: string) => setForm(f => ({ ...f, [field]: v }))

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  )

  const fb = data?.fallback

  // Completude
  const fields = [form.pageId, form.pixelId, form.website]
  const filled  = fields.filter(f => f.trim() !== '').length
  const pct     = Math.round((filled / fields.length) * 100)

  return (
    <div className="space-y-6">
      {/* Header Meta */}
      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1877f2 0%, #0e5fd8 40%, #6366f1 100%)' }}
      >
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 mb-1">Identidade Meta</p>
              <p className="text-lg font-black">Page ID · Pixel · Instagram · Site</p>
              <p className="text-sm text-blue-200 mt-1">
                Sobrescreve as configurações do tenant especificamente para este cliente.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-bold bg-white/20 rounded-full px-3 py-1">
                {filled}/{fields.length} preenchidos
              </span>
              <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </div>
        {/* decoração */}
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute -right-2 top-8 h-16 w-16 rounded-full bg-white/5" />
      </div>

      {/* Alerta page_id vazio */}
      {!form.pageId && !fb?.pageId && (
        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Facebook Page ID não configurado</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Sem o Page ID os criativos não podem ser criados no Meta para este cliente.
              Se o tenant tiver um Page ID configurado, ele será usado como fallback.
            </p>
          </div>
        </div>
      )}

      {/* Campos 2 colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <CampaignField
          label="Facebook Page ID"
          badge="required"
          value={form.pageId}
          fallback={fb?.pageId || ''}
          placeholder="Ex: 105308234567890"
          hint="ID numérico da Página do Facebook deste cliente."
          onChange={update('pageId')}
          saving={saving}
        />
        <CampaignField
          label="Meta Pixel ID"
          badge="conversions"
          value={form.pixelId}
          fallback={fb?.pixelId || ''}
          placeholder="Ex: 876543210987654"
          hint="Pixel exclusivo do cliente para rastreamento de conversões."
          onChange={update('pixelId')}
          saving={saving}
        />
        <CampaignField
          label="Instagram Actor ID"
          badge="optional"
          value={form.instagramActorId}
          fallback={fb?.instagramActorId || ''}
          placeholder="Ex: 17841234567890"
          hint="Conta Instagram vinculada. Opcional — para criativos no Instagram."
          onChange={update('instagramActorId')}
          saving={saving}
        />
        <CampaignField
          label="Website / Site do Cliente"
          value={form.website}
          fallback={fb?.website || ''}
          placeholder="Ex: www.imobiliaria-cliente.com.br"
          hint="Pré-preenche o Link da campanha no wizard."
          onChange={update('website')}
          saving={saving}
        />
      </div>

      {/* Info bar tenant */}
      {fb && (
        <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500">
          <span className="font-medium text-gray-700">Fallback do tenant:</span>
          {fb.adAccountId && <span>Ad Account: <code className="font-mono text-gray-700">act_{fb.adAccountId}</code></span>}
          <span className={`flex items-center gap-1 font-medium ${fb.credentialsActive ? 'text-emerald-600' : 'text-gray-400'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${fb.credentialsActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            {fb.credentialsActive ? 'Credenciais ativas' : 'Sem credenciais'}
          </span>
          {fb.pageId && <span>Page ID tenant: <code className="font-mono">{fb.pageId}</code></span>}
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-bold">
          <CheckCircleIcon className="h-4 w-4" />
          Configurações salvas com sucesso!
        </div>
      )}

      {/* Botão salvar */}
      <div className="flex justify-end">
        <UpdateGuard resource="clientes">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white
              transition-all disabled:opacity-60"
            style={{ background: saving ? '#94a3b8' : '#1877f2' }}
          >
            {saving ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Salvando…</>
            ) : 'Salvar Configurações de Campanha'}
          </button>
        </UpdateGuard>
      </div>
    </div>
  )
}

// ─── página principal ──────────────────────────────────────────────────────────
type Tab = 'dados' | 'campanha'

export default function VisualizarClientePage() {
  const { get, delete: del } = useAuthenticatedFetch()
  const router  = useRouter()
  const params  = useParams()
  const { user } = useAuth()

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [tab, setTab]         = useState<Tab>('dados')

  useEffect(() => {
    if (!params.id) return
    get(`/api/admin/clientes/${params.id}`)
      .then(r => {
        if (!r.ok) throw new Error(r.status === 404 ? 'Cliente não encontrado' : 'Erro ao carregar cliente')
        return r.json()
      })
      .then(setCliente)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [params.id])

  const handleDelete = async () => {
    if (!cliente || !confirm(`Excluir o cliente "${cliente.nome}"?`)) return
    try {
      const r = await del(`/api/admin/clientes/${cliente.uuid}`)
      if (!r.ok) throw new Error('Erro ao excluir')
      router.push('/admin/clientes')
    } catch { alert('Erro ao excluir cliente') }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  )
  if (error || !cliente) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center">
      <div>
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Erro</h1>
        <p className="text-gray-600 mb-6">{error || 'Cliente não encontrado'}</p>
        <button onClick={() => router.push('/admin/clientes')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <ArrowLeftIcon className="h-4 w-4 mr-2" /> Voltar
        </button>
      </div>
    </div>
  )

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dados',    label: 'Dados do Cliente',    icon: UserIcon },
    { id: 'campanha', label: 'Configurações Meta',  icon: MegaphoneIcon },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/admin/clientes')}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-gray-900">{cliente.nome}</h1>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{cliente.uuid}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <UpdateGuard resource="clientes">
                <button onClick={() => router.push(`/admin/clientes/${cliente.uuid}/editar`)}
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
                  <PencilIcon className="h-4 w-4 mr-2" /> Editar
                </button>
              </UpdateGuard>
              <DeleteGuard resource="clientes">
                <button onClick={handleDelete}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors">
                  <TrashIcon className="h-4 w-4 mr-2" /> Excluir
                </button>
              </DeleteGuard>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-2xl p-1 shadow-sm mb-6">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all
                  ${active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}>
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Conteúdo das tabs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          {/* ── ABA: DADOS ── */}
          {tab === 'dados' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Informações Pessoais */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-2 uppercase tracking-wide">
                  Informações Pessoais
                </h3>
                {[
                  ['Nome Completo',    cliente.nome],
                  ['CPF',             cliente.cpf],
                  ['Telefone',        cliente.telefone],
                  ['E-mail',          cliente.email],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-gray-900">{val}</p>
                  </div>
                ))}
              </div>

              {/* Endereço */}
              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-2 uppercase tracking-wide">
                  Endereço
                </h3>
                {[
                  ['Endereço',   cliente.endereco],
                  ['Número',     cliente.numero],
                  ['Complemento',cliente.complemento],
                  ['Bairro',     cliente.bairro],
                  ['Estado',     cliente.estado_fk],
                  ['Cidade',     cliente.cidade_fk],
                  ['CEP',        cliente.cep],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-gray-900">{val || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Sistema */}
              <div className="md:col-span-2 pt-4 border-t border-gray-100 space-y-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Sistema</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Origem</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold
                      ${cliente.origem_cadastro === 'Publico' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {cliente.origem_cadastro === 'Publico' ? '🌐 Site Público' : '🖥️ Plataforma'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Criado em</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(cliente.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Criado por</p>
                    <p className="text-sm font-medium text-gray-900">{cliente.created_by || 'Sistema'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Atualizado em</p>
                    <p className="text-sm font-medium text-gray-900">{new Date(cliente.updated_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ABA: CAMPANHA ── */}
          {tab === 'campanha' && <CampaignTab clientId={cliente.uuid} />}
        </div>
      </div>
    </div>
  )
}
