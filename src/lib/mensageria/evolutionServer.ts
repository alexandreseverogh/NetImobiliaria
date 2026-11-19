import axios from 'axios'
import pool from '@/lib/database/connection'
import { buildWebhookUrl, ensureWebhookSecret } from './evolutionWebhook'

/**
 * Servidores Evolution (configurados pelo Master) e criação de instância por tenant.
 *
 * A chave GLOBAL de administração fica só em public.evolution_servers e é usada apenas aqui,
 * no servidor. Ao criar a instância, o tenant recebe a URL do servidor e o TOKEN da própria
 * instância (que a Evolution devolve na criação). Esse token não dá controle sobre o servidor.
 */

export type EvolutionServer = { id: string; name: string; api_url: string; api_key: string }

export async function getDefaultEvolutionServer(): Promise<EvolutionServer | null> {
  const { rows } = await pool.query(
    `SELECT id, name, api_url, api_key FROM public.evolution_servers
      WHERE is_default = true AND is_active = true LIMIT 1`,
  )
  return rows[0] ?? null
}

/** Nome da instância do tenant: minúsculo, alfanumérico e hífen (regra da Evolution). */
export function instanceNameForTenant(tenantId: string): string {
  return `t-${tenantId.replace(/-/g, '').slice(0, 12).toLowerCase()}`
}

export type CreatedInstance = { instance: string; token: string; qrBase64: string | null }

/**
 * Cria a instância do tenant no servidor padrão (ou no servidor já vinculado), configura o
 * webhook e grava no tenant: servidor, URL, nome da instância, token e segredo do webhook.
 * Idempotente: se o tenant já tem instância, não recria.
 */
export async function createTenantInstance(tenantId: string): Promise<CreatedInstance> {
  const { rows: tRows } = await pool.query(
    `SELECT evolution_instance, evolution_server_id, evolution_webhook_secret
       FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
    [tenantId],
  )
  const t = tRows[0]
  if (!t) throw new Error('Empresa não encontrada')
  if (t.evolution_instance) throw new Error('Esta empresa já possui uma instância de WhatsApp')

  let server: EvolutionServer | null = null
  if (t.evolution_server_id) {
    const { rows } = await pool.query(
      `SELECT id, name, api_url, api_key FROM public.evolution_servers WHERE id = $1 AND is_active = true LIMIT 1`,
      [t.evolution_server_id],
    )
    server = rows[0] ?? null
  }
  if (!server) server = await getDefaultEvolutionServer()
  if (!server) throw new Error('Nenhum servidor de WhatsApp configurado. Peça ao administrador da plataforma.')

  // Segredo do webhook: gerado uma vez por tenant, nunca exibido.
  const secret = await ensureWebhookSecret(tenantId)

  const instanceName = instanceNameForTenant(tenantId)
  const webhookUrl = buildWebhookUrl(secret)

  let data: any
  try {
    const res = await axios.post(
      `${server.api_url}/instance/create`,
      {
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        webhook: {
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: ['MESSAGES_UPSERT', 'SEND_MESSAGE', 'CONNECTION_UPDATE'],
        },
      },
      { headers: { apikey: server.api_key, 'Content-Type': 'application/json' }, timeout: 20000 },
    )
    data = res.data
  } catch (err: any) {
    const msg = err.response?.data?.response?.message || err.response?.data?.message || err.message
    throw new Error(`Não foi possível criar a instância no servidor: ${msg}`)
  }

  const token: string = typeof data?.hash === 'string' ? data.hash : ''
  if (!token) throw new Error('A Evolution não devolveu o token da instância')

  // Grava só o que o tenant precisa: servidor, URL, nome e token da instância.
  await pool.query(
    `UPDATE public.tenants
        SET evolution_server_id = $1, evolution_api_url = $2,
            evolution_api_key = $3, evolution_instance = $4, updated_at = now()
      WHERE id = $5::uuid`,
    [server.id, server.api_url, token, instanceName, tenantId],
  )

  return { instance: instanceName, token, qrBase64: data?.qrcode?.base64 ?? null }
}
