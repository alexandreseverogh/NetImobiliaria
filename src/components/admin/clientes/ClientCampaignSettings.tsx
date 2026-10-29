'use client'

/**
 * ClientCampaignSettings
 * Seção de configurações de campanha (Meta) por cliente.
 * Reutilizável na página de visualização e na de edição.
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'
import { UpdateGuard } from '@/components/admin/PermissionGuard'
import { adminFetch } from '@/lib/auth/adminFetch'

interface CampaignSettings {
  clientName?: string
  pageId: string; pixelId: string; instagramActorId: string; website: string
  whatsappNumber: string; whatsappMessage: string; whatsappBusinessName: string
  fallback: {
    pageId: string; pixelId: string; instagramActorId: string
    website: string; adAccountId: string; credentialsActive: boolean
    whatsappNumber: string; whatsappMessage: string; whatsappBusinessName: string
  }
  /** Achado #3 (2026-10-27) — número EFETIVO (override do cliente, ou tenant) comparado contra
   * o que está de fato pareado com a Evolution na escala deste cliente. `null` = não dá pra
   * comparar (nenhum dos dois lados tem número configurado). */
  evolutionNumber: string
  numbersMatch: boolean | null
}

function CampaignField({
  label, value, fallback, placeholder, badge, hint, onChange, saving, multiline,
}: {
  label: string; value: string; fallback: string; placeholder: string
  badge?: 'required' | 'conversions' | 'optional'
  hint?: string; onChange: (v: string) => void; saving: boolean; multiline?: boolean
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

  const inputCls = `w-full px-3.5 py-2.5 rounded-xl border bg-white text-sm font-medium text-gray-900
          placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400
          transition-all disabled:opacity-60 ${borderCls}`

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
      {multiline ? (
        <textarea
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={status === 'fallback' ? `Tenant: ${fallback}` : placeholder}
          disabled={saving} rows={2}
          className={`${inputCls} resize-none`}
        />
      ) : (
        <input
          type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder={status === 'fallback' ? `Tenant: ${fallback}` : placeholder}
          disabled={saving}
          className={inputCls}
        />
      )}
      {hint && <p className="mt-1.5 text-[11px] text-gray-400">{hint}</p>}
      {status === 'fallback' && (
        <p className="mt-1 text-[11px] text-amber-600">
          Usando configuração do tenant. Preencha para sobrescrever para este cliente.
        </p>
      )}
    </div>
  )
}

/**
 * WhatsApp Cloud API (oficial) — credencial POR CLIENTE (phone_number_id/waba_id/access_token,
 * resultado da conexão Embedded Signup daquele cliente) + override de provider (Evolution ou
 * Cloud API) só pra ele. Movida pra cá em 2026-10-28
 * (docs/PLANO_WHATSAPP_CLOUD_API_PROVIDER.md §9/§10) — antes vivia em /mensageria/config, gated
 * por módulo (um tenant sem Mensageria contratada nunca alcançaria); esta ficha já é module-
 * independent (gated só por `tipo_cliente==='conta_gerenciada'`, igual o resto desta aba). O App
 * (Embedded Signup Config ID, Webhook Verify Token, App Secret) é do TENANT, configurado em
 * "Dados da Empresa" — aqui só o que de fato varia por cliente.
 */
function WhatsAppCloudApiSection({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenantProvider, setTenantProvider] = useState('evolution')
  const [ownProvider, setOwnProvider] = useState<string | null>(null)
  const [selected, setSelected] = useState('evolution')
  const [credential, setCredential] = useState<{ phoneNumberId: string; wabaId: string; displayPhoneNumber: string | null; paymentMethodConfirmed: boolean } | null>(null)
  const [usage, setUsage] = useState<{ sentThisMonth: number } | null>(null)
  const [form, setForm] = useState({ phoneNumberId: '', wabaId: '', accessToken: '', displayPhoneNumber: '' })
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await adminFetch(`/api/admin/mensageria/whatsapp-cloud?clientId=${clientId}`)
      const data = await res.json()
      if (!res.ok) { setMessage(data.error || 'Falha ao carregar.'); return }
      setTenantProvider(data.tenantProvider)
      setOwnProvider(data.ownProvider)
      setSelected(data.effectiveProvider)
      setCredential(data.credential)
      setUsage(data.usage)
      setPaymentConfirmed(data.credential?.paymentMethodConfirmed || false)
      setForm({
        phoneNumberId: data.credential?.phoneNumberId || '',
        wabaId: data.credential?.wabaId || '',
        accessToken: '',
        displayPhoneNumber: data.credential?.displayPhoneNumber || '',
      })
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId])

  async function save() {
    setSaving(true); setMessage(''); setSaved(false)
    try {
      const body: Record<string, unknown> = { provider: selected }
      if (selected === 'whatsapp_cloud') {
        body.paymentMethodConfirmed = paymentConfirmed
        if (form.phoneNumberId.trim()) body.phoneNumberId = form.phoneNumberId.trim()
        if (form.wabaId.trim()) body.wabaId = form.wabaId.trim()
        if (form.accessToken.trim()) body.accessToken = form.accessToken.trim()
        if (form.displayPhoneNumber.trim()) body.displayPhoneNumber = form.displayPhoneNumber.trim()
      }
      const res = await adminFetch(`/api/admin/mensageria/whatsapp-cloud?clientId=${clientId}`, { method: 'PUT', body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setMessage(data.error || 'Falha ao salvar.'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await load()
    } finally { setSaving(false) }
  }

  async function resetToTenant() {
    setSaving(true)
    try {
      const res = await adminFetch(`/api/admin/mensageria/whatsapp-cloud?clientId=${clientId}`, {
        method: 'PUT', body: JSON.stringify({ resetToTenant: true }),
      })
      if (res.ok) await load()
    } finally { setSaving(false) }
  }

  const usagePct = usage ? Math.round((usage.sentThisMonth / 1000) * 100) : 0

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1877f2 0%, #0e5fd8 40%, #25d366 100%)' }}
      >
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-100 mb-1">WhatsApp — recebimento</p>
          <p className="text-base font-black">Provider &amp; WhatsApp Cloud API (oficial)</p>
          <p className="text-xs text-blue-100 mt-1">
            Como esse cliente RECEBE mensagem — diferente do número de redirect acima, que é só o destino do clique no anúncio.
          </p>
        </div>
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
      </div>

      <p className="text-xs text-gray-500">
        {ownProvider
          ? <>Este cliente tem provider próprio.{' '}
              <button type="button" onClick={resetToTenant} disabled={saving} className="text-indigo-600 hover:underline font-bold disabled:opacity-40">
                Usar o do tenant ({tenantProvider === 'evolution' ? 'Evolution' : 'Cloud API'})
              </button>
            </>
          : <>Herdando do tenant: <strong className="text-gray-700">{tenantProvider === 'evolution' ? 'Evolution' : 'WhatsApp Cloud API'}</strong>.</>}
      </p>

      <div className="flex gap-2">
        {(['evolution', 'whatsapp_cloud'] as const).map(p => (
          <button key={p} type="button" onClick={() => setSelected(p)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide border transition-colors ${
              selected === p ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
            {p === 'evolution' ? 'Evolution (padrão)' : 'WhatsApp Cloud API (oficial)'}
          </button>
        ))}
      </div>

      {selected === 'whatsapp_cloud' && (
        <div className="space-y-4 pt-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-400">
            Conecte pelo Embedded Signup da própria Meta (App do tenant, já configurado em{' '}
            <a href="/admin/dados-empresa" className="text-indigo-600 hover:underline font-bold">Dados da Empresa</a>) e cole aqui os
            valores técnicos resultantes deste cliente — nunca cartão/cobrança. Campo vazio preserva o valor já salvo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CampaignField label="Phone Number ID" value={form.phoneNumberId} fallback=""
              placeholder="Ex: 109876543210" onChange={v => setForm(f => ({ ...f, phoneNumberId: v }))} saving={saving} />
            <CampaignField label="WABA ID" value={form.wabaId} fallback=""
              placeholder="Ex: 987654321098" onChange={v => setForm(f => ({ ...f, wabaId: v }))} saving={saving} />
            <CampaignField label="Access Token (system user)" value={form.accessToken} fallback=""
              placeholder={credential ? 'Já salvo — deixe vazio p/ manter' : 'Resultante do Embedded Signup'}
              onChange={v => setForm(f => ({ ...f, accessToken: v }))} saving={saving} />
            <CampaignField label="Número exibido (opcional)" value={form.displayPhoneNumber} fallback=""
              placeholder="+55 81 99999-0000" onChange={v => setForm(f => ({ ...f, displayPhoneNumber: v }))} saving={saving} />
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-500">
            <input type="checkbox" checked={paymentConfirmed} onChange={e => setPaymentConfirmed(e.target.checked)} />
            Já cadastrei cartão no Business Manager da Meta
          </label>

          {usage && (
            <p className={`text-xs ${usagePct >= 100 ? 'text-red-600' : usagePct >= 80 ? 'text-amber-600' : 'text-gray-400'}`}>
              {usage.sentThisMonth} / 1.000 mensagens de serviço gratuitas este mês
              {usagePct >= 100 ? ' — franquia esgotada, sinal de atendimento gerando movimento real.' : ''}
            </p>
          )}
        </div>
      )}

      {message && <p className="text-xs text-red-600">{message}</p>}
      {saved && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-bold">
          <CheckCircleIcon className="h-4 w-4" /> Salvo com sucesso!
        </div>
      )}

      <div className="flex justify-end">
        <UpdateGuard resource="clientes">
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 bg-indigo-600 hover:bg-indigo-700">
            {saving ? 'Salvando...' : 'Salvar Provider WhatsApp'}
          </button>
        </UpdateGuard>
      </div>
    </div>
  )
}

export default function ClientCampaignSettings({ clientId }: { clientId: string }) {
  const router = useRouter()
  const { get, put } = useAuthenticatedFetch()
  const [data, setData]       = useState<CampaignSettings | null>(null)
  const [form, setForm]       = useState({
    pageId: '', pixelId: '', instagramActorId: '', website: '',
    whatsappNumber: '', whatsappMessage: '', whatsappBusinessName: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    get(`/api/admin/clientes/${clientId}/campaign-settings`)
      .then(r => r.json())
      .then((d: CampaignSettings) => {
        setData(d)
        setForm({
          pageId:            d.pageId            ?? '',
          pixelId:           d.pixelId           ?? '',
          instagramActorId:  d.instagramActorId  ?? '',
          website:           d.website           ?? '',
          whatsappNumber:        d.whatsappNumber       ?? '',
          whatsappMessage:       d.whatsappMessage      ?? '',
          whatsappBusinessName:  d.whatsappBusinessName ?? '',
        })
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
      setForm({
        pageId:            updated.pageId            ?? '',
        pixelId:           updated.pixelId           ?? '',
        instagramActorId:  updated.instagramActorId  ?? '',
        website:           updated.website           ?? '',
        whatsappNumber:        updated.whatsappNumber       ?? '',
        whatsappMessage:       updated.whatsappMessage      ?? '',
        whatsappBusinessName:  updated.whatsappBusinessName ?? '',
      })
      // Recarrega pra refletir fallback/cross-validação com o estado real pós-save (ex.: se o
      // cliente acabou de apagar o override, a tela deve voltar a mostrar o número do tenant).
      get(`/api/admin/clientes/${clientId}/campaign-settings`)
        .then(r => r.json()).then((d: CampaignSettings) => setData(d)).catch(() => {})
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
  const fields = [form.pageId ?? '', form.pixelId ?? '', form.website ?? '']
  const filled  = fields.filter(f => f.trim() !== '').length
  const pct     = Math.round((filled / fields.length) * 100)

  return (
    <div className="space-y-5">
      {/* Barra de contexto: nome do cliente + saída rápida sem salvar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</p>
          <p className="text-lg font-black text-gray-900">{data?.clientName || '—'}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/clientes')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors flex-shrink-0"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Ir para a lista de Clientes
        </button>
      </div>

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

      {/* ── WhatsApp — número de redirect do CTA de anúncio ── */}
      <div
        className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)' }}
      >
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-100 mb-1">WhatsApp</p>
          <p className="text-base font-black">Número de destino dos leads deste cliente</p>
          <p className="text-xs text-emerald-100 mt-1">
            Para onde o clique no anúncio redireciona. Vazio = herda o número do tenant.
          </p>
        </div>
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CampaignField label="Número (DDI+DDD+Número)"
          value={form.whatsappNumber} fallback={fb?.whatsappNumber || ''}
          placeholder="5581999999999"
          hint="Número próprio deste cliente para onde os leads serão direcionados."
          onChange={update('whatsappNumber')} saving={saving} />
        <CampaignField label="Nome do Negócio"
          value={form.whatsappBusinessName} fallback={fb?.whatsappBusinessName || ''}
          placeholder="Ex: Imobiliária Premium"
          onChange={update('whatsappBusinessName')} saving={saving} />
        <div className="md:col-span-2">
          <CampaignField label="Mensagem Padrão" multiline
            value={form.whatsappMessage} fallback={fb?.whatsappMessage || ''}
            placeholder="Olá! Vi o anúncio e quero saber mais..."
            hint="Usada só quando o anúncio em si não tem um texto próprio."
            onChange={update('whatsappMessage')} saving={saving} />
        </div>
      </div>

      {/* Achado #3 (2026-10-27) — o número configurado aqui pode não ser o mesmo que está de
          fato pareado com a instância Evolution que recebe mensagem real na Mensageria deste
          cliente (ou do tenant, se este cliente não tiver instância própria). Sem isso, um lead
          que "responde" ao WhatsApp nunca chegaria na Mensageria — silenciosamente. */}
      {data?.numbersMatch === false && (
        <div className="flex gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              Este número não é o mesmo pareado com a Mensageria (Evolution)
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Número do redirect: <code className="font-mono">{form.whatsappNumber || fb?.whatsappNumber}</code> ·
              {' '}Número real da Evolution: <code className="font-mono">{data.evolutionNumber}</code>.
              Uma resposta a este clique não vai cair como conversa na Mensageria.
            </p>
          </div>
        </div>
      )}

      <WhatsAppCloudApiSection clientId={clientId} />

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
