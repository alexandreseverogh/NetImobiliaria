'use client'

/**
 * Portão de entrada de mensagens WhatsApp (Evolution API) — a URL+secret que precisa estar
 * colada no painel da Evolution API pra que mensagens recebidas virem lead no CRM E/OU
 * conversa na Mensageria (`processInboundWhatsAppMessage`, `src/lib/whatsapp/
 * inboundProcessor.ts`, sempre tenta as duas coisas, best-effort, independente de o tenant ter
 * um módulo ou outro contratado). Peça 3 do desacoplamento (docs/CHECKPOINT.md, 2026-09-02) —
 * a mais arriscada das 3: regenerar o secret INVALIDA a URL antiga imediatamente, derrubando o
 * fluxo de mensagens em produção até alguém colar a nova URL no painel da Evolution API.
 *
 * Extraído de `/admin/campanhas/mecanismos` (aba WhatsApp/Evolution) — as outras 3 abas dessa
 * página (Link Rastreado, API/Webhook, Meta Lead Ads) são mecanismos de atribuição de
 * campanha, genuinamente Campanhas-only; só esta aba governa algo que CRM/Mensageria também
 * dependem, então só ela virou componente compartilhado. O rastreamento `[ref:slug]`
 * (atribuição de campanha dentro da mensagem) é explicado só na versão de Campanhas — CRM/
 * Mensageria-only não têm Destino de CTA pra gerar esse link, então a explicação não se
 * aplica a eles; aqui o texto fala só do caminho que sempre existe (orgânico).
 */

import { useState, useEffect } from 'react'
import { adminFetch } from '@/lib/auth/adminFetch'
import { ChatBubbleLeftEllipsisIcon, ClipboardDocumentIcon, CheckIcon, ArrowPathIcon, EyeIcon, EyeSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface Props {
  /** Tema leve — mesmo padrão { isDark, textPrimary, textMuted, inputBg, ... } de useTheme(), já usado por PromptOverrideCard/LlmCascadeSection/AgentWhatsAppChannelSection. */
  t: any
}

interface EvolutionConfig {
  evolution_api_url: string | null
  evolution_instance: string | null
  numero_whatsapp: string | null
  evolution_webhook_secret: string | null
  webhook_url: string | null
}

export function WhatsAppWebhookSection({ t }: Props) {
  const [config, setConfig] = useState<EvolutionConfig | null>(null)
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
    if (!confirm(
      'Regenerar o token vai INVALIDAR a URL de webhook atual imediatamente — mensagens de ' +
      'WhatsApp param de virar lead/conversa até você colar a NOVA URL no painel da Evolution ' +
      'API. Confirma que já está pronto pra fazer essa troca agora?'
    )) return
    setRegenerating(true)
    try {
      const res = await adminFetch('/api/admin/campanhas/evolution-config', { method: 'POST' })
      const data = await res.json()
      setConfig(prev => prev ? { ...prev, evolution_webhook_secret: data.evolution_webhook_secret, webhook_url: data.webhook_url } : prev)
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className={`${t.isDark ? 'bg-blue-600/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'} border p-6 rounded-3xl flex items-center justify-center h-32`}>
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  const webhookUrl = config?.webhook_url ?? '(secret não gerado — clique em Regenerar)'
  const boxCls = `rounded-2xl p-4 ${t.isDark ? 'bg-white/5' : 'bg-gray-50'}`

  return (
    <div className={`${t.isDark ? 'bg-blue-600/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'} border p-6 rounded-3xl space-y-4`}>
      <h3 className={`text-base font-black italic tracking-tighter uppercase flex items-center ${t.textPrimary}`}>
        <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-blue-500 mr-2" />
        Portão de Entrada — WhatsApp (Evolution API)
      </h3>
      <p className={`text-xs font-medium -mt-2 ${t.textMuted}`}>
        Mensagens recebidas neste número viram lead no CRM e/ou conversa na Mensageria
        automaticamente, independente de qual módulo o tenant tem. 1 URL única por tenant.
      </p>

      <div className={boxCls}>
        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${t.textMuted}`}>Instância conectada</p>
        <div className="space-y-1.5 text-xs">
          {[
            { label: 'API URL', value: config?.evolution_api_url },
            { label: 'Instância', value: config?.evolution_instance },
            { label: 'Número WA', value: config?.numero_whatsapp },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className={t.textMuted}>{label}</span>
              <span className={`font-mono truncate ${t.textSecondary}`}>{value || <span className="italic opacity-60">não configurado</span>}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={boxCls}>
        <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${t.textMuted}`}>URL do Webhook (cole na Evolution API)</p>
        <div className="flex gap-2 items-center">
          <code className={`flex-1 text-xs font-mono rounded-lg px-3 py-2 break-all ${t.isDark ? 'bg-black/30 text-white/80' : 'bg-white text-gray-800 border border-gray-200'}`}>
            {webhookUrl}
          </code>
          <button onClick={() => copy(webhookUrl, 'webhook_url')}
            className={`shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium ${t.isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
            {copied === 'webhook_url' ? <><CheckIcon className="w-3 h-3 text-green-400" />Copiado</> : <><ClipboardDocumentIcon className="w-3 h-3" />Copiar</>}
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <span className={`text-xs w-24 shrink-0 ${t.textMuted}`}>Token secreto</span>
          <code className={`flex-1 text-xs font-mono rounded-lg px-3 py-1.5 ${t.isDark ? 'bg-black/30 text-white/80' : 'bg-white text-gray-800 border border-gray-200'}`}>
            {showSecret ? (config?.evolution_webhook_secret ?? '—') : '••••••••••••••••••••••••••••••••'}
          </code>
          <button onClick={() => setShowSecret(s => !s)} className={`p-1.5 rounded-lg ${t.isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-400 hover:text-gray-700'}`}>
            {showSecret ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          </button>
          <button onClick={regenerate} disabled={regenerating}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-400/40 text-rose-500 hover:bg-rose-500/10 text-xs font-medium disabled:opacity-50">
            {regenerating ? <ArrowPathIcon className="w-3 h-3 animate-spin" /> : <ArrowPathIcon className="w-3 h-3" />}
            Regenerar
          </button>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-rose-500 mt-2">
          <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Regenerar invalida a URL anterior na hora — mensagens param de entrar até você colar a
          nova URL na Evolution API.
        </p>
      </div>

      <ol className={`text-xs space-y-1.5 list-decimal list-inside ${t.textSecondary}`}>
        <li>Acesse o painel da Evolution API → Instâncias → selecione sua instância.</li>
        <li>Vá em Configurações → Webhook.</li>
        <li>Cole a URL do Webhook acima no campo Webhook URL.</li>
        <li>Ative o evento <strong>MESSAGES_UPSERT</strong> (mensagens recebidas).</li>
        <li>Salve — mensagens recebidas passam a criar lead/conversa automaticamente.</li>
      </ol>
    </div>
  )
}
