'use client'

/**
 * ClientCampaignSettings
 * Seção de configurações de campanha (Meta) por cliente.
 * Reutilizável na página de visualização e na de edição.
 */
import { useState, useEffect } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { UpdateGuard } from '@/components/admin/PermissionGuard'

interface CampaignSettings {
  pageId: string; pixelId: string; instagramActorId: string; website: string
  fallback: {
    pageId: string; pixelId: string; instagramActorId: string
    website: string; adAccountId: string; credentialsActive: boolean
  }
}

function CampaignField({
  label, value, fallback, placeholder, badge, hint, onChange, saving,
}: {
  label: string; value: string; fallback: string; placeholder: string
  badge?: 'required' | 'conversions' | 'optional'
  hint?: string; onChange: (v: string) => void; saving: boolean
}) {
  const hasOwn      = value.trim() !== ''
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
    badge === 'required'  ? 'border-rose-300' : 'border-gray-200'

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
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={status === 'fallback' ? `Tenant: ${fallback}` : placeholder}
        disabled={saving}
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm font-medium text-gray-900
          placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400
          transition-all disabled:opacity-60 ${borderCls}`}
      />
      {hint && <p className="mt-1.5 text-[11px] text-gray-400">{hint}</p>}
      {status === 'fallback' && (
        <p className="mt-1 text-[11px] text-amber-600">
          Usando configuração do tenant. Preencha para sobrescrever para este cliente.
        </p>
      )}
    </div>
  )
}

export default function ClientCampaignSettings({ clientId }: { clientId: string }) {
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
      .catch(() => setError('Erro ao carregar configurações de campanha'))
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
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const update = (field: string) => (v: string) => setForm(f => ({ ...f, [field]: v }))

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  )

  const fb = data?.fallback
  const fields = [form.pageId, form.pixelId, form.website]
  const filled  = fields.filter(f => f.trim() !== '').length
  const pct     = Math.round((filled / fields.length) * 100)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1877f2 0%, #0e5fd8 40%, #6366f1 100%)' }}
      >
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200 mb-1">Identidade Meta</p>
            <p className="text-base font-black">Page ID · Pixel · Instagram · Site</p>
            <p className="text-xs text-blue-200 mt-1">
              Sobrescreve as configurações do tenant para este cliente.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-bold bg-white/20 rounded-full px-3 py-1">{filled}/{fields.length}</span>
            <div className="w-20 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
      </div>

      {/* Alerta */}
      {!form.pageId && !fb?.pageId && (
        <div className="flex gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Facebook Page ID não configurado</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Sem Page ID os criativos não podem ser criados no Meta para este cliente.
            </p>
          </div>
        </div>
      )}

      {/* Campos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CampaignField label="Facebook Page ID" badge="required"
          value={form.pageId} fallback={fb?.pageId || ''}
          placeholder="Ex: 105308234567890"
          hint="ID numérico da Página do Facebook deste cliente."
          onChange={update('pageId')} saving={saving} />
        <CampaignField label="Meta Pixel ID" badge="conversions"
          value={form.pixelId} fallback={fb?.pixelId || ''}
          placeholder="Ex: 876543210987654"
          hint="Pixel exclusivo do cliente para rastreamento."
          onChange={update('pixelId')} saving={saving} />
        <CampaignField label="Instagram Actor ID" badge="optional"
          value={form.instagramActorId} fallback={fb?.instagramActorId || ''}
          placeholder="Ex: 17841234567890"
          hint="Conta Instagram do cliente. Opcional."
          onChange={update('instagramActorId')} saving={saving} />
        <CampaignField label="Website / Site do Cliente"
          value={form.website} fallback={fb?.website || ''}
          placeholder="Ex: www.cliente.com.br"
          hint="Pré-preenche o Link da campanha no wizard."
          onChange={update('website')} saving={saving} />
      </div>

      {/* Info bar */}
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

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>
      )}
      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-bold">
          <CheckCircleIcon className="h-4 w-4" /> Configurações salvas!
        </div>
      )}

      <div className="flex justify-end">
        <UpdateGuard resource="clientes">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{ background: saving ? '#94a3b8' : '#1877f2' }}>
            {saving
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />Salvando…</>
              : 'Salvar Configurações Meta'}
          </button>
        </UpdateGuard>
      </div>
    </div>
  )
}
