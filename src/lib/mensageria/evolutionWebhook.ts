/**
 * Webhook de entrada da Evolution API — ponto ÚNICO de geração do segredo e da URL.
 *
 * Antes existiam dois caminhos (criação da instância com randomBytes e regeneração com
 * gen_random_uuid), com bases de URL diferentes (NEXTAUTH_URL x EVOLUTION_WEBHOOK_BASE_URL).
 * A URL mostrada na tela podia não ser a mesma gravada na Evolution. Agora todos passam aqui.
 */
import axios from 'axios'
import { randomBytes } from 'crypto'
import pool from '@/lib/database/connection'

export const WEBHOOK_EVENTS = ['MESSAGES_UPSERT', 'SEND_MESSAGE', 'CONNECTION_UPDATE'] as const

/** Base pública do webhook. Uma única variável, na ordem de preferência. */
export function webhookBaseUrl(): string {
  const base = process.env.EVOLUTION_WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''
  return base.replace(/\/$/, '')
}

/** URL completa do webhook para um segredo. */
export function buildWebhookUrl(secret: string): string {
  return `${webhookBaseUrl()}/api/public/evolution/webhook?token=${secret}`
}

/** Segredo do webhook: 32 caracteres hex aleatórios. Único formato usado na plataforma. */
export function newWebhookSecret(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Garante um segredo para o tenant (gera só se ainda não existe) e devolve-o.
 * Usado pela criação da instância.
 */
export async function ensureWebhookSecret(tenantId: string): Promise<string> {
  const { rows } = await pool.query(
    `SELECT evolution_webhook_secret FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
    [tenantId],
  )
  const existing = rows[0]?.evolution_webhook_secret as string | null | undefined
  if (existing) return existing
  const secret = newWebhookSecret()
  await pool.query(`UPDATE public.tenants SET evolution_webhook_secret = $1 WHERE id = $2::uuid`, [secret, tenantId])
  return secret
}

/**
 * Troca o segredo do tenant e aplica a URL nova na Evolution da instância.
 * Lança erro explícito se a Evolution não aceitar — nunca reporta "atualizado" sem ter atualizado.
 */
export async function rotateWebhookSecret(tenantId: string): Promise<{ secret: string; webhookUrl: string }> {
  const { rows: cfg } = await pool.query(
    `SELECT evolution_api_url, evolution_api_key, evolution_instance FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
    [tenantId],
  )
  const c = cfg[0]
  if (!c?.evolution_api_url || !c?.evolution_api_key || !c?.evolution_instance) {
    throw new Error('Este tenant ainda não tem uma instância de WhatsApp conectada.')
  }

  const secret = newWebhookSecret()
  const webhookUrl = buildWebhookUrl(secret)

  try {
    await axios.post(
      `${c.evolution_api_url}/webhook/set/${c.evolution_instance}`,
      {
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: false,
          events: [...WEBHOOK_EVENTS],
        },
      },
      { headers: { apikey: c.evolution_api_key, 'Content-Type': 'application/json' }, timeout: 15000 },
    )
  } catch (err: any) {
    const msg = err.response?.data?.response?.message || err.response?.data?.message || err.message
    throw new Error(`A Evolution não aceitou a nova URL do webhook: ${msg}. O segredo atual foi mantido.`)
  }

  // Só grava o segredo novo depois que a Evolution aceitou a URL nova.
  await pool.query(`UPDATE public.tenants SET evolution_webhook_secret = $1 WHERE id = $2::uuid`, [secret, tenantId])
  return { secret, webhookUrl }
}
