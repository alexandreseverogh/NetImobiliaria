'use client'

import { useEffect, useState } from 'react'
import {
  LinkIcon, SignalIcon, MegaphoneIcon, ClipboardDocumentIcon, CheckIcon,
  ArrowPathIcon, PlusIcon, TrashIcon, EyeIcon, EyeSlashIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline'
import { adminFetch } from '@/lib/auth/adminFetch'

type Tab = 'B' | 'C' | 'D' | 'WA'

export default function MecanismosPage() {
  const [tab, setTab] = useState<Tab>('B')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <SignalIcon className="w-6 h-6 text-gray-700" />
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Mecanismos de Captura</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Configure como leads externos chegam ao CRM — links rastreados, API, webhook, Meta Lead Ads ou WhatsApp.
      </p>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-200">
        {([
          { key: 'B',  icon: LinkIcon,                       label: 'B · Link Rastreado' },
          { key: 'C',  icon: SignalIcon,                     label: 'C · API / Webhook' },
          { key: 'D',  icon: MegaphoneIcon,                 label: 'D · Meta Lead Ads' },
          { key: 'WA', icon: ChatBubbleLeftEllipsisIcon,   label: 'E · WhatsApp (Evolution)' },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
              tab === key
                ? 'border-blue-600 text-blue-700 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'B'  && <TabB />}
      {tab === 'C'  && <TabC />}
      {tab === 'D'  && <TabD />}
      {tab === 'WA' && <TabWA />}
    </div>
  )
}

/* ── Tab B: Link Rastreado ─────────────────────────────────────────── */

function TabB() {
  const [destinos, setDestinos] = useState<any[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    adminFetch('/api/admin/campanhas/destinos')
      .then(r => r.json())
      .then(d => setDestinos(d.destinos || []))
      .catch(() => {})
  }, [])

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="space-y-6">
      <InfoBox icon={LinkIcon} color="blue">
        O <strong>Link Rastreado</strong> é a URL <code className="text-xs bg-blue-100 px-1 rounded">/l/{'{slug}'}</code> do
        destino. Ao ser acessado, registra a visita/clique automaticamente (com UTMs) e redireciona.
        Funciona para qualquer tipo de destino: formulário, WhatsApp ou URL externa.
      </InfoBox>

      <Card title="Formato do link">
        <div className="space-y-2 text-sm text-gray-700">
          <p className="font-semibold mb-1">Com UTM parameters:</p>
          <code className="block bg-gray-100 rounded-lg px-3 py-2 text-xs break-all">
            {baseUrl}/l/<span className="text-blue-600">{'{slug}'}</span>?utm_source=meta&utm_medium=cpc&utm_campaign=<span className="text-green-600">{'{nome_campanha}'}</span>
          </code>
          <p className="text-gray-400 text-xs mt-1">
            Os parâmetros UTM são capturados no Analytics de Captura automaticamente.
          </p>
        </div>
      </Card>

      <Card title="Links dos seus destinos ativos">
        {destinos.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">Nenhum destino ativo. Crie um em Destinos de CTA.</p>
        )}
        <div className="divide-y divide-gray-100">
          {destinos.map((d: any) => {
            const link = `${baseUrl}/l/${d.slug}`
            const id = d.id
            return (
              <div key={id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                  <p className="text-xs text-gray-400 truncate">{link}</p>
                </div>
                <TypeBadge type={d.type} />
                <button
                  onClick={() => copy(link, id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
                >
                  {copied === id
                    ? <><CheckIcon className="w-3.5 h-3.5 text-green-600" /> Copiado</>
                    : <><ClipboardDocumentIcon className="w-3.5 h-3.5" /> Copiar</>
                  }
                </button>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="Como usar no Meta Ads">
        <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
          <li>Crie uma campanha no Meta Ads com objetivo <strong>Tráfego</strong> ou <strong>Conversões</strong>.</li>
          <li>No campo <strong>URL de Destino</strong>, cole o link rastreado com UTMs.</li>
          <li>Todas as visitas aparecem no <strong>Analytics de Captura</strong> com origem, campanha e horário.</li>
          <li>Para capturar o lead, use um destino do tipo <strong>Formulário</strong> — o visitante preenche e vira lead no CRM.</li>
        </ol>
      </Card>
    </div>
  )
}

/* ── Tab C: API / Webhook ─────────────────────────────────────────── */

function TabC() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    adminFetch('/api/admin/campanhas/apikey')
      .then(r => r.json())
      .then(d => setApiKey(d.api_key))
      .catch(() => {})
  }, [])

  const regenerate = async () => {
    if (!confirm('Isso invalida a chave atual. Confirmar?')) return
    setRegenerating(true)
    const d = await adminFetch('/api/admin/campanhas/apikey', { method: 'POST' }).then(r => r.json())
    setApiKey(d.api_key)
    setRegenerating(false)
  }

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const endpoint = `${baseUrl}/api/public/cta/ingest`
  const maskedKey = apiKey ? apiKey.slice(0, 8) + '••••••••••••••••••••' : '—'

  const curlExample = `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${apiKey ?? 'SUA_API_KEY'}",
    "destination_slug": "meu-destino",
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "11999998888",
    "utm_source": "google"
  }'`

  const jsSnippet = `<!-- Colar antes de </body> no seu site externo -->
<script>
(function(){
  const KEY  = '${apiKey ?? 'SUA_API_KEY'}';
  const SLUG = 'meu-destino';  // slug do destino no CTA
  const URL  = '${endpoint}';

  document.querySelectorAll('form[data-cta]').forEach(function(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      const data = { api_key: KEY, destination_slug: SLUG };
      new FormData(form).forEach((v,k) => { data[k] = v; });
      fetch(URL, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(data)
      }).then(() => form.submit());
    });
  });
})();
</script>`

  return (
    <div className="space-y-6">
      <InfoBox icon={SignalIcon} color="indigo">
        Envie leads de <strong>qualquer sistema externo</strong> diretamente para o CRM via HTTP POST.
        Use a API Key abaixo para autenticar. Também disponível um snippet JS para capturar formulários
        de sites externos sem back-end.
      </InfoBox>

      {/* API Key */}
      <Card title="Sua API Key">
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm font-mono break-all">
            {showKey ? apiKey ?? '—' : maskedKey}
          </code>
          <button onClick={() => setShowKey(v => !v)} className="p-2 rounded-lg hover:bg-gray-100">
            {showKey ? <EyeSlashIcon className="w-4 h-4 text-gray-500" /> : <EyeIcon className="w-4 h-4 text-gray-500" />}
          </button>
          <button onClick={() => copy(apiKey ?? '', 'key')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700">
            {copied === 'key' ? <><CheckIcon className="w-3.5 h-3.5 text-green-600" />Copiado</> : <><ClipboardDocumentIcon className="w-3.5 h-3.5" />Copiar</>}
          </button>
          <button onClick={regenerate} disabled={regenerating} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-700">
            <ArrowPathIcon className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} /> Regenerar
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Guarde em local seguro. Não expor no front-end público.</p>
      </Card>

      {/* Endpoint */}
      <Card title="Endpoint">
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm break-all">
            POST {endpoint}
          </code>
          <button onClick={() => copy(endpoint, 'ep')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700">
            {copied === 'ep' ? <><CheckIcon className="w-3.5 h-3.5 text-green-600" />Copiado</> : <><ClipboardDocumentIcon className="w-3.5 h-3.5" />Copiar</>}
          </button>
        </div>
        <div className="mt-3 text-sm text-gray-600 space-y-1">
          <p className="font-semibold text-xs text-gray-500 uppercase tracking-wide">Campos aceitos</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-700">
            {[
              ['api_key', 'obrigatório'],
              ['destination_slug', 'opcional'],
              ['name', 'nome do lead'],
              ['email', 'e-mail'],
              ['phone', 'telefone/WhatsApp'],
              ['utm_source / utm_medium / utm_campaign', 'rastreamento'],
            ].map(([f, d]) => (
              <div key={f}>
                <code className="bg-gray-100 px-1 rounded text-blue-700">{f}</code>
                <span className="text-gray-400"> — {d}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* cURL */}
      <Card title="Exemplo cURL">
        <CodeBlock code={curlExample} id="curl" copied={copied} onCopy={copy} />
      </Card>

      {/* JS Snippet */}
      <Card title="Snippet JavaScript (sites externos)">
        <p className="text-xs text-gray-500 mb-2">
          Adicione <code className="bg-gray-100 px-1 rounded">data-cta</code> no seu formulário HTML e cole o snippet:
        </p>
        <CodeBlock code={jsSnippet} id="snippet" copied={copied} onCopy={copy} />
      </Card>
    </div>
  )
}

/* ── Tab D: Meta Lead Ads ─────────────────────────────────────────── */

function TabD() {
  const [config, setConfig] = useState<{
    meta_verify_token: string | null
    meta_app_secret_set: boolean
    meta_page_map: Array<{ page_id: string; destination_slug: string }>
  }>({ meta_verify_token: null, meta_app_secret_set: false, meta_page_map: [] })
  const [appSecret, setAppSecret] = useState('')
  const [pageMap, setPageMap] = useState<Array<{ page_id: string; destination_slug: string }>>([])
  const [destinos, setDestinos] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    Promise.all([
      adminFetch('/api/admin/campanhas/meta-config').then(r => r.json()),
      adminFetch('/api/admin/campanhas/destinos').then(r => r.json()),
    ]).then(([mc, dest]) => {
      setConfig(mc)
      setPageMap(mc.meta_page_map || [])
      setDestinos(dest.destinos || [])
    }).catch(() => {})
  }, [])

  const webhookUrl = config.meta_verify_token
    ? `${baseUrl}/api/public/meta-leads/webhook?token=${config.meta_verify_token}`
    : null

  const generateToken = async () => {
    const d = await adminFetch('/api/admin/campanhas/meta-config', {
      method: 'POST', body: JSON.stringify({ generate_token: true })
    }).then(r => r.json())
    setConfig(prev => ({ ...prev, meta_verify_token: d.meta_verify_token }))
  }

  const save = async () => {
    setSaving(true)
    await adminFetch('/api/admin/campanhas/meta-config', {
      method: 'POST',
      body: JSON.stringify({
        meta_app_secret: appSecret || undefined,
        meta_page_map: pageMap,
      })
    }).then(r => r.json()).then(d => {
      setConfig(prev => ({ ...prev, meta_app_secret_set: d.meta_app_secret_set, meta_page_map: d.meta_page_map }))
    }).catch(() => {})
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="space-y-6">
      <InfoBox icon={MegaphoneIcon} color="rose">
        <strong>Meta Lead Ads</strong> envia leads diretamente pelo webhook do Meta — sem que o usuário
        saia do Facebook/Instagram. Configure abaixo e cole a URL de webhook no painel do Meta for Developers.
      </InfoBox>

      {/* Webhook URL */}
      <Card title="URL do Webhook (cole no Meta for Developers)">
        {!config.meta_verify_token ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">Nenhum token gerado ainda.</p>
            <button onClick={generateToken} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">
              Gerar token
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-xs break-all">{webhookUrl}</code>
              <button onClick={() => copy(webhookUrl!, 'wh')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200">
                {copied === 'wh' ? <><CheckIcon className="w-3.5 h-3.5 text-green-600" />Copiado</> : <><ClipboardDocumentIcon className="w-3.5 h-3.5" />Copiar</>}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Verify Token (preencha no Meta): <code className="bg-gray-100 px-1 rounded">{config.meta_verify_token}</code>
            </p>
          </div>
        )}
      </Card>

      {/* App Secret */}
      <Card title="App Secret (verificação de assinatura)">
        <div className="space-y-2">
          <input
            type="password"
            placeholder={config.meta_app_secret_set ? '••••••• (configurado — deixe em branco para não alterar)' : 'Cole o App Secret do seu Meta App'}
            value={appSecret}
            onChange={e => setAppSecret(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <p className="text-xs text-gray-400">
            Encontrado em Meta for Developers → Seu App → Configurações → Básico → App Secret.
            Usado para validar a assinatura X-Hub-Signature-256 de cada webhook.
          </p>
        </div>
      </Card>

      {/* Page → Destination Map */}
      <Card title="Mapeamento Page ID → Destino CTA">
        <p className="text-xs text-gray-500 mb-3">
          Cada Page ID do Facebook que usar Lead Ads deve ser mapeado para um destino de CTA.
          O lead chegará no CRM associado a esse destino.
        </p>
        <div className="space-y-2 mb-3">
          {pageMap.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                placeholder="Page ID (ex: 123456789)"
                value={row.page_id}
                onChange={e => setPageMap(pm => pm.map((r, j) => j === i ? { ...r, page_id: e.target.value } : r))}
                className="w-44 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              />
              <span className="text-gray-400 text-sm">→</span>
              <select
                value={row.destination_slug}
                onChange={e => setPageMap(pm => pm.map((r, j) => j === i ? { ...r, destination_slug: e.target.value } : r))}
                className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecionar destino...</option>
                {destinos.map((d: any) => <option key={d.id} value={d.slug}>{d.name}</option>)}
              </select>
              <button onClick={() => setPageMap(pm => pm.filter((_, j) => j !== i))} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setPageMap(pm => [...pm, { page_id: '', destination_slug: '' }])}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <PlusIcon className="w-4 h-4" /> Adicionar mapeamento
        </button>
      </Card>

      <Card title="Passos para configurar no Meta for Developers">
        <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
          <li>Acesse <strong>developers.facebook.com</strong> → seu App → <strong>Webhooks</strong>.</li>
          <li>Clique em <strong>Adicionar assinatura</strong> → selecione <strong>Page</strong> → campo <strong>leadgen</strong>.</li>
          <li>Cole a <strong>URL do Webhook</strong> acima e o <strong>Verify Token</strong>.</li>
          <li>Clique em <strong>Verificar e salvar</strong>. O sistema responderá automaticamente ao hub.challenge.</li>
          <li>Inscreva sua <strong>Página</strong> do Facebook no webhook (Menu Webhooks → Page → Adicionar assinatura).</li>
          <li>Salve o <strong>App Secret</strong> aqui para validar assinaturas e evitar payloads falsos.</li>
        </ol>
      </Card>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : saved ? <CheckIcon className="w-4 h-4" /> : null}
          {saved ? 'Salvo!' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  )
}

/* ── Tab WA: WhatsApp / Evolution API ─────────────────────────────── */

function TabWA() {
  const [config, setConfig] = useState<{
    evolution_api_url: string | null
    evolution_instance: string | null
    numero_whatsapp: string | null
    evolution_webhook_secret: string | null
    webhook_url: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSecret, setShowSecret] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    adminFetch('/api/admin/campanhas/evolution-config')
      .then(r => r.json())
      .then(data => { setConfig(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const regenerate = async () => {
    setRegenerating(true)
    try {
      const res = await adminFetch('/api/admin/campanhas/evolution-config', { method: 'POST' })
      const data = await res.json()
      setConfig(prev => prev ? { ...prev, evolution_webhook_secret: data.evolution_webhook_secret, webhook_url: data.webhook_url } : prev)
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Carregando…</p>

  const webhookUrl = config?.webhook_url ?? '(secret não gerado — clique em Regenerar)'

  const snippetEvolution = `// No painel da Evolution API → Instâncias → {instância} → Webhook
// Cole a URL abaixo no campo "Webhook URL":
${webhookUrl}

// Eventos a ativar: MESSAGES_UPSERT (obrigatório)
// Método: POST  |  Headers: nenhum adicional necessário`

  const snippetRef = `// A URL de WhatsApp gerada em Destinos de CTA já embute o rastreamento:
// https://wa.me/5511999998888?text=Olá%21+Vi+o+anúncio.+[ref:meu-cta-slug]
//
// Quando o usuário envia essa mensagem, o webhook recebe o texto,
// extrai [ref:meu-cta-slug] e cria automaticamente um lead no CRM
// vinculado ao destino e segmento corretos.`

  return (
    <div className="space-y-4">
      <InfoBox icon={ChatBubbleLeftEllipsisIcon} color="indigo">
        O WhatsApp Business do tenant é operado via <strong>Evolution API</strong>. Configure abaixo para que mensagens recebidas
        criem leads automaticamente no CRM quando contiverem a tag <code className="font-mono text-xs bg-indigo-100 px-1 rounded">[ref:slug]</code>.
      </InfoBox>

      {/* Instância conectada */}
      <Card title="Instância Evolution conectada">
        <div className="space-y-2 text-sm">
          {[
            { label: 'API URL',   value: config?.evolution_api_url },
            { label: 'Instância', value: config?.evolution_instance },
            { label: 'Número WA', value: config?.numero_whatsapp },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between border-b border-gray-100 pb-1 last:border-0 last:pb-0">
              <span className="text-gray-500 w-24 shrink-0">{label}</span>
              <span className="font-mono text-gray-800 text-xs truncate">{value || <span className="text-gray-400 italic">não configurado</span>}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Para alterar a instância conectada, acesse <strong>Configurações → Integrações → Evolution API</strong>.
        </p>
      </Card>

      {/* Webhook URL */}
      <Card title="URL do Webhook (cole na Evolution API)">
        <p className="text-xs text-gray-500 mb-3">
          Cole esta URL no campo <strong>Webhook URL</strong> da sua instância na Evolution API. O token autentica o tenant automaticamente.
        </p>
        <div className="flex gap-2 items-center">
          <code className="flex-1 text-xs font-mono bg-gray-100 rounded-lg px-3 py-2 break-all text-gray-800">
            {webhookUrl}
          </code>
          <button
            onClick={() => copy(webhookUrl, 'webhook_url')}
            className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium"
          >
            {copied === 'webhook_url' ? <><CheckIcon className="w-3 h-3 text-green-400" />Copiado</> : <><ClipboardDocumentIcon className="w-3 h-3" />Copiar</>}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <span className="text-xs text-gray-500 w-28 shrink-0">Token secreto</span>
          <code className="flex-1 text-xs font-mono bg-gray-100 rounded-lg px-3 py-1.5 text-gray-800">
            {showSecret
              ? (config?.evolution_webhook_secret ?? '—')
              : '••••••••••••••••••••••••••••••••'}
          </code>
          <button onClick={() => setShowSecret(s => !s)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700">
            {showSecret ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-medium disabled:opacity-50"
          >
            {regenerating ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <ArrowPathIcon className="w-3 h-3" />}
            Regenerar
          </button>
        </div>
        <p className="text-xs text-rose-500 mt-1">
          Regenerar invalida a URL anterior — atualize-a na Evolution API imediatamente.
        </p>
      </Card>

      {/* Passo a passo */}
      <Card title="Como configurar na Evolution API">
        <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
          <li>Acesse o painel da Evolution API → <strong>Instâncias</strong> → selecione sua instância.</li>
          <li>Vá em <strong>Configurações → Webhook</strong>.</li>
          <li>Cole a <strong>URL do Webhook</strong> acima no campo <em>Webhook URL</em>.</li>
          <li>Ative o evento <strong>MESSAGES_UPSERT</strong> (mensagens recebidas).</li>
          <li>Salve. O sistema passará a criar leads automaticamente para mensagens com <code className="text-xs font-mono bg-gray-100 px-1 rounded">[ref:slug]</code>.</li>
        </ol>
      </Card>

      {/* Snippet configuração */}
      <Card title="Snippet de configuração">
        <CodeBlock code={snippetEvolution} id="snip_evo" copied={copied} onCopy={copy} />
      </Card>

      {/* Como funciona o [ref:slug] */}
      <Card title="Como o rastreamento [ref:slug] funciona">
        <p className="text-sm text-gray-600 mb-3">
          Quando você cria um Destino de CTA do tipo <strong>WhatsApp</strong>, a URL gerada em <code className="text-xs font-mono bg-gray-100 px-1 rounded">/l/&#123;slug&#125;</code> já embute automaticamente o rastreamento na mensagem pré-preenchida do WhatsApp. Nenhuma configuração adicional é necessária.
        </p>
        <CodeBlock code={snippetRef} id="snip_ref" copied={copied} onCopy={copy} />
        <p className="text-xs text-gray-500 mt-3">
          Mensagens sem <code className="text-xs font-mono bg-gray-100 px-1 rounded">[ref:]</code> também criam leads, mas com origem <em>whatsapp_organico</em> e sem vínculo a um destino específico.
        </p>
      </Card>
    </div>
  )
}

/* ── Helpers de UI ────────────────────────────────────────────────── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</p>
      {children}
    </div>
  )
}

function InfoBox({ icon: Icon, color, children }: { icon: any; color: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-200',
  }
  return (
    <div className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${map[color] || map.blue}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" />
      <p>{children}</p>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    APP_FORM: 'bg-green-100 text-green-700',
    WHATSAPP: 'bg-emerald-100 text-emerald-700',
    EXTERNAL_URL: 'bg-blue-100 text-blue-700',
  }
  const labels: Record<string, string> = {
    APP_FORM: 'Form', WHATSAPP: 'WA', EXTERNAL_URL: 'URL',
  }
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${map[type] || 'bg-gray-100 text-gray-600'}`}>
      {labels[type] || type}
    </span>
  )
}

function CodeBlock({
  code, id, copied, onCopy
}: { code: string; id: string; copied: string | null; onCopy: (t: string, id: string) => void }) {
  return (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        onClick={() => onCopy(code, id)}
        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium"
      >
        {copied === id ? <><CheckIcon className="w-3 h-3 text-green-400" />Copiado</> : <><ClipboardDocumentIcon className="w-3 h-3" />Copiar</>}
      </button>
    </div>
  )
}
