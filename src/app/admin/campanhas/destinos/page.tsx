'use client'

import { useEffect, useState } from 'react'
import {
  PlusIcon, LinkIcon, TrashIcon, PencilSquareIcon, XMarkIcon,
  ChartBarIcon, ClipboardDocumentIcon, CheckIcon, EyeIcon, EyeSlashIcon,
  CodeBracketIcon, ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline'
import { adminFetch } from '@/lib/auth/adminFetch'

type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select'
interface FieldDef { name: string; label: string; type: FieldType; required?: boolean; options?: string[] }
interface Destino {
  id: string
  name: string
  slug: string
  type: 'APP_FORM' | 'WHATSAPP' | 'EXTERNAL_URL'
  cta_type: string | null
  config: any
  is_active: boolean
}

const CTA_TYPES = [
  { value: 'WHATSAPP_MESSAGE', label: 'WhatsApp' },
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Comprar Agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'BOOK_TRAVEL', label: 'Reserve' },
  { value: 'GET_OFFER', label: 'Ver Oferta' },
]

const DEFAULT_FIELDS: FieldDef[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true },
  { name: 'email', label: 'E-mail', type: 'email', required: true },
  { name: 'telefone', label: 'Telefone / WhatsApp', type: 'tel', required: true },
]

export default function DestinosPage() {
  const [destinos, setDestinos] = useState<Destino[]>([])
  const [webhookKey, setWebhookKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Destino | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [metricsFor, setMetricsFor] = useState<Destino | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/api/admin/campanhas/destinos')
      const data = await res.json()
      setDestinos(data.destinos || [])
      setWebhookKey(data.webhook_key ?? null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const remove = async (d: Destino) => {
    if (!confirm(`Desativar o destino "${d.name}"?`)) return
    await adminFetch(`/api/admin/campanhas/destinos/${d.id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Destinos de CTA</h1>
          <p className="text-sm text-gray-500 mt-1">
            Formulários hospedados, WhatsApp e links — captura de dados e geração de leads no CRM.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
        >
          <PlusIcon className="w-4 h-4" /> Novo destino
        </button>
      </div>

      {webhookKey && <WebhookIntegrationPanel apiKey={webhookKey} />}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : destinos.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-gray-500">Nenhum destino ainda. Crie o primeiro para capturar leads.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destinos.map((d) => (
            <DestinoCard key={d.id} d={d}
              onEdit={() => { setEditing(d); setShowForm(true) }}
              onRemove={() => remove(d)}
              onMetrics={() => setMetricsFor(d)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <DestinoFormModal
          destino={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
      {metricsFor && (
        <MetricsModal destino={metricsFor} onClose={() => setMetricsFor(null)} />
      )}
    </div>
  )
}

function DestinoCard({ d, onEdit, onRemove, onMetrics }: { d: Destino; onEdit: () => void; onRemove: () => void; onMetrics: () => void }) {
  const [copied, setCopied] = useState(false)
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/l/${d.slug}` : `/l/${d.slug}`
  const typeLabel = d.type === 'APP_FORM' ? 'Formulário' : d.type === 'WHATSAPP' ? 'WhatsApp' : 'Link externo'

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{d.name}</h3>
          <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
            {typeLabel}
          </span>
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full ${d.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {d.is_active ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-2">
        <LinkIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate flex-1">{publicUrl}</span>
        <button
          onClick={() => { navigator.clipboard?.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          className="text-gray-400 hover:text-blue-600" aria-label="Copiar link"
        >
          {copied ? <CheckIcon className="w-4 h-4 text-emerald-600" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center gap-1 mt-1">
        <button onClick={onMetrics} className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700">
          <ChartBarIcon className="w-4 h-4" /> Métricas
        </button>
        <button onClick={onEdit} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Editar"><PencilSquareIcon className="w-4 h-4" /></button>
        <button onClick={onRemove} className="p-2 rounded-lg hover:bg-rose-50 text-rose-500" aria-label="Desativar"><TrashIcon className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

function DestinoFormModal({ destino, onClose, onSaved }: { destino: Destino | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!destino
  const [name, setName] = useState(destino?.name || '')
  const [type, setType] = useState<Destino['type']>(destino?.type || 'APP_FORM')
  const [ctaType, setCtaType] = useState(destino?.cta_type || 'LEARN_MORE')
  const [cfg, setCfg] = useState<any>(destino?.config || {
    title: '', description: '', submitLabel: 'Enviar',
    thankYouMessage: 'Recebemos seus dados. Em breve entraremos em contato!',
    accent: '#2563eb', fields: DEFAULT_FIELDS,
  })
  const [saving, setSaving] = useState(false)
  const fields: FieldDef[] = cfg.fields || DEFAULT_FIELDS

  const setField = (i: number, patch: Partial<FieldDef>) =>
    setCfg((c: any) => ({ ...c, fields: fields.map((f, idx) => idx === i ? { ...f, ...patch } : f) }))
  const addField = () =>
    setCfg((c: any) => ({ ...c, fields: [...fields, { name: `campo_${fields.length + 1}`, label: 'Novo campo', type: 'text' }] }))
  const removeField = (i: number) =>
    setCfg((c: any) => ({ ...c, fields: fields.filter((_, idx) => idx !== i) }))

  const save = async () => {
    if (!name.trim()) return alert('Informe o nome do destino')
    setSaving(true)
    try {
      const body = { name, type, cta_type: ctaType, config: cfg }
      if (isEdit) {
        await adminFetch(`/api/admin/campanhas/destinos/${destino!.id}`, { method: 'PUT', body: JSON.stringify(body) })
      } else {
        await adminFetch('/api/admin/campanhas/destinos', { method: 'POST', body: JSON.stringify(body) })
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={isEdit ? 'Editar destino' : 'Novo destino'}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Editar destino' : 'Novo destino'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Fechar"><XMarkIcon className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-4">
            <L label="Nome interno">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="Ex.: Captação Imóveis SP" />
            </L>
            <L label="Tipo de destino">
              <select value={type} onChange={(e) => setType(e.target.value as any)} className={inp}>
                <option value="APP_FORM">Formulário hospedado</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EXTERNAL_URL">Link externo</option>
              </select>
            </L>
            <L label="Botão (CTA) associado">
              <select value={ctaType} onChange={(e) => setCtaType(e.target.value)} className={inp}>
                {CTA_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </L>
            {type === 'APP_FORM' && (
              <L label="Cor de destaque">
                <input type="color" value={cfg.accent || '#2563eb'} onChange={(e) => setCfg({ ...cfg, accent: e.target.value })} className="h-10 w-full rounded-lg border border-gray-300" />
              </L>
            )}
          </div>

          {type === 'APP_FORM' && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <L label="Título da página"><input value={cfg.title || ''} onChange={(e) => setCfg({ ...cfg, title: e.target.value })} className={inp} /></L>
                <L label="Texto do botão"><input value={cfg.submitLabel || ''} onChange={(e) => setCfg({ ...cfg, submitLabel: e.target.value })} className={inp} /></L>
              </div>
              <L label="Descrição"><textarea rows={2} value={cfg.description || ''} onChange={(e) => setCfg({ ...cfg, description: e.target.value })} className={inp} /></L>
              <L label="Mensagem de agradecimento"><textarea rows={2} value={cfg.thankYouMessage || ''} onChange={(e) => setCfg({ ...cfg, thankYouMessage: e.target.value })} className={inp} /></L>

              {/* Construtor de campos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Campos do formulário</span>
                  <button onClick={addField} className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"><PlusIcon className="w-3.5 h-3.5" /> Adicionar</button>
                </div>
                <div className="space-y-2">
                  {fields.map((f, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input value={f.label} onChange={(e) => setField(i, { label: e.target.value })} placeholder="Rótulo" className={`${inp} col-span-4`} />
                      <input value={f.name} onChange={(e) => setField(i, { name: e.target.value.replace(/\s+/g, '_').toLowerCase() })} placeholder="chave" className={`${inp} col-span-3`} />
                      <select value={f.type} onChange={(e) => setField(i, { type: e.target.value as FieldType })} className={`${inp} col-span-3`}>
                        <option value="text">Texto</option><option value="email">E-mail</option><option value="tel">Telefone</option>
                        <option value="textarea">Texto longo</option><option value="select">Seleção</option>
                      </select>
                      <label className="col-span-1 flex items-center justify-center text-xs text-gray-500">
                        <input type="checkbox" checked={!!f.required} onChange={(e) => setField(i, { required: e.target.checked })} title="Obrigatório" />
                      </label>
                      <button onClick={() => removeField(i)} className="col-span-1 text-rose-500 hover:text-rose-600" aria-label="Remover campo"><TrashIcon className="w-4 h-4 mx-auto" /></button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === 'WHATSAPP' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <L label="Número (DDI+DDD)"><input value={cfg.phoneNumber || ''} onChange={(e) => setCfg({ ...cfg, phoneNumber: e.target.value })} placeholder="5581999999999" className={inp} /></L>
              <L label="Mensagem introdutória"><input value={cfg.introMessage || ''} onChange={(e) => setCfg({ ...cfg, introMessage: e.target.value })} placeholder="Olá! Vi o anúncio e quero saber mais." className={inp} /></L>
            </div>
          )}

          {type === 'EXTERNAL_URL' && (
            <L label="URL de destino"><input value={cfg.url || ''} onChange={(e) => setCfg({ ...cfg, url: e.target.value })} placeholder="https://site-do-cliente.com.br/landing" className={inp} /></L>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Salvando…' : 'Salvar destino'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MetricsModal({ destino, onClose }: { destino: Destino; onClose: () => void }) {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    adminFetch(`/api/admin/campanhas/destinos/${destino.id}/submissions`).then(r => r.json()).then(setData)
  }, [destino.id])
  const m = data?.metrics
  const subs = data?.submissions || []

  return (
    <div role="dialog" aria-modal="true" aria-label="Métricas do destino"
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Métricas — {destino.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Fechar"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Stat label="Visualizações" value={m?.views ?? '—'} />
            <Stat label="Submissões" value={m?.submits ?? '—'} />
            <Stat label="Conversão" value={m ? `${m.conversionRate}%` : '—'} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 pr-4">Nome</th><th className="py-2 pr-4">Contato</th><th className="py-2 pr-4">Lead CRM</th><th className="py-2">Quando</th>
              </tr></thead>
              <tbody>
                {subs.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400">Sem submissões ainda.</td></tr>
                ) : subs.map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800">{s.name || '—'}</td>
                    <td className="py-2 pr-4 text-gray-600">{s.email || s.phone || '—'}</td>
                    <td className="py-2 pr-4">{s.lead_uuid ? <span className="text-emerald-600">✓ gerado</span> : <span className="text-gray-400">—</span>}</td>
                    <td className="py-2 text-gray-500">{new Date(s.created_at).toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function WebhookIntegrationPanel({ apiKey }: { apiKey: string }) {
  const [open, setOpen] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedEx, setCopiedEx] = useState(false)

  const endpoint = typeof window !== 'undefined'
    ? `${window.location.origin}/api/public/cta/ingest`
    : '/api/public/cta/ingest'

  const examplePayload = JSON.stringify({
    name: 'João Silva',
    email: 'joao@email.com',
    phone: '5581999990000',
    utm_source: 'facebook',
    utm_medium: 'cpc',
    utm_campaign: 'imoveis-sp-jul',
    destination_slug: 'meu-destino-opcional',
  }, null, 2)

  const copy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/60">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          <CodeBracketIcon className="w-5 h-5 text-indigo-600" />
          <div>
            <span className="text-sm font-semibold text-indigo-900">Integração via Webhook (Mecanismo C)</span>
            <p className="text-xs text-indigo-600 mt-0.5">Receba leads de formulários externos — Typeform, RD Station, n8n, Make, Zapier…</p>
          </div>
        </div>
        {open
          ? <ChevronUpIcon className="w-4 h-4 text-indigo-500 shrink-0" />
          : <ChevronDownIcon className="w-4 h-4 text-indigo-500 shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Endpoint */}
          <div>
            <span className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Endpoint</span>
            <div className="mt-1.5 flex items-center gap-2 bg-white rounded-lg border border-indigo-200 px-3 py-2 text-xs font-mono text-gray-800">
              <span className="text-indigo-500 font-semibold">POST</span>
              <span className="flex-1 break-all">{endpoint}</span>
            </div>
          </div>

          {/* API Key */}
          <div>
            <span className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Sua API Key</span>
            <div className="mt-1.5 flex items-center gap-2 bg-white rounded-lg border border-indigo-200 px-3 py-2">
              <span className="flex-1 font-mono text-xs text-gray-800 break-all">
                {showKey ? apiKey : '•'.repeat(Math.min(apiKey.length, 36))}
              </span>
              <button onClick={() => setShowKey(v => !v)} className="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Mostrar/ocultar chave">
                {showKey ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
              <button onClick={() => copy(apiKey, setCopiedKey)} className="text-gray-400 hover:text-indigo-600 shrink-0" aria-label="Copiar chave">
                {copiedKey ? <CheckIcon className="w-4 h-4 text-emerald-600" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-indigo-600">
              Envie no header <code className="bg-indigo-100 px-1 rounded">Authorization: Bearer {'{sua_api_key}'}</code>,
              como query <code className="bg-indigo-100 px-1 rounded">?token={'{sua_api_key}'}</code>
              ou no body como <code className="bg-indigo-100 px-1 rounded">"api_key"</code>.
            </p>
          </div>

          {/* Exemplo */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Exemplo de payload</span>
              <button onClick={() => copy(examplePayload, setCopiedEx)} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800">
                {copiedEx ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600" /> : <ClipboardDocumentIcon className="w-3.5 h-3.5" />}
                {copiedEx ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <pre className="bg-gray-900 text-gray-100 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed">{examplePayload}</pre>
          </div>

          {/* Dicas de integração */}
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { name: 'Typeform', tip: 'Webhooks → Add webhook → cole a URL + header Authorization' },
              { name: 'n8n / Make', tip: 'HTTP Request node → POST → Body (JSON) + Auth header' },
              { name: 'RD Station', tip: 'Integrações → Webhook → configure campos name/email/phone' },
            ].map(({ name, tip }) => (
              <div key={name} className="bg-white rounded-xl border border-indigo-100 px-3 py-2.5">
                <span className="text-xs font-semibold text-gray-800">{name}</span>
                <p className="text-xs text-gray-500 mt-0.5">{tip}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-indigo-600">
            O campo <code className="bg-indigo-100 px-1 rounded">destination_slug</code> é opcional — quando informado, vincula o lead ao cliente correto do destino.
          </p>
        </div>
      )}
    </div>
  )
}

const inp = 'w-full h-10 px-3 rounded-lg border border-gray-300 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>{children}</label>
}
function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 text-center">
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
