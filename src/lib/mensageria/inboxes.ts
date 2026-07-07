/**
 * Resolução de inbox por tenant. Hoje só existe o provider 'evolution' — a
 * inbox é criada lazy (na primeira mensagem) a partir das colunas Evolution
 * já existentes em public.tenants, sem exigir backfill/migração de dados.
 *
 * Ver docs/PLANO_MENSAGERIA.md seção 14.1 (abstração de provider de WhatsApp).
 */
import pool from '@/lib/database/connection'

const SCHEMA = 'mensageria'

export async function resolveWhatsAppInbox(tenantId: string): Promise<string> {
  const { rows } = await pool.query(
    `SELECT id FROM ${SCHEMA}.inboxes WHERE tenant_id = $1 AND channel_type = 'whatsapp' LIMIT 1`,
    [tenantId],
  )
  if (rows[0]) return rows[0].id

  const { rows: tenantRows } = await pool.query(
    `SELECT evolution_api_url, evolution_api_key, evolution_instance, numero_whatsapp
       FROM public.tenants WHERE id = $1`,
    [tenantId],
  )
  const t = tenantRows[0] || {}

  const { rows: created } = await pool.query(
    `INSERT INTO ${SCHEMA}.inboxes (tenant_id, name, channel_type, provider, config)
     VALUES ($1, 'WhatsApp', 'whatsapp', 'evolution', $2::jsonb)
     RETURNING id`,
    [
      tenantId,
      JSON.stringify({
        api_url: t.evolution_api_url ?? null,
        api_key: t.evolution_api_key ?? null,
        instance: t.evolution_instance ?? null,
        number: t.numero_whatsapp ?? null,
      }),
    ],
  )
  return created[0].id
}

/**
 * Inbox de formulários (CTA APP_FORM). Não tem credenciais de envio — é canal
 * inbound-only; a resposta ao contato acontece por outro canal (WhatsApp/e-mail manual).
 */
export async function resolveWebformInbox(tenantId: string): Promise<string> {
  const { rows } = await pool.query(
    `SELECT id FROM ${SCHEMA}.inboxes WHERE tenant_id = $1 AND channel_type = 'webform' LIMIT 1`,
    [tenantId],
  )
  if (rows[0]) return rows[0].id

  const { rows: created } = await pool.query(
    `INSERT INTO ${SCHEMA}.inboxes (tenant_id, name, channel_type, provider, config)
     VALUES ($1, 'Formulários do Site', 'webform', 'internal', '{}'::jsonb)
     RETURNING id`,
    [tenantId],
  )
  return created[0].id
}

/**
 * Inbox de conversas iniciadas manualmente por um atendente (não veio de canal externo).
 */
export async function resolveManualInbox(tenantId: string): Promise<string> {
  const { rows } = await pool.query(
    `SELECT id FROM ${SCHEMA}.inboxes WHERE tenant_id = $1 AND channel_type = 'manual' LIMIT 1`,
    [tenantId],
  )
  if (rows[0]) return rows[0].id

  const { rows: created } = await pool.query(
    `INSERT INTO ${SCHEMA}.inboxes (tenant_id, name, channel_type, provider, config)
     VALUES ($1, 'Conversas Manuais', 'manual', 'internal', '{}'::jsonb)
     RETURNING id`,
    [tenantId],
  )
  return created[0].id
}
