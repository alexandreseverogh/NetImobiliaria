/**
 * Resolução de inbox por tenant. Hoje só existe o provider 'evolution' — a
 * inbox é criada lazy (na primeira mensagem) a partir das colunas Evolution
 * já existentes em public.tenants, sem exigir backfill/migração de dados.
 *
 * Ver docs/PLANO_MENSAGERIA.md seção 14.1 (abstração de provider de WhatsApp).
 */
import pool from '@/lib/database/connection'

const SCHEMA = 'mensageria'

/**
 * Cascata cliente → tenant (mesmo padrão de getNetworkServiceForTenant() no módulo de
 * campanhas): se o cliente tiver credenciais Evolution próprias (public.clientes),
 * resolve/cria uma inbox dedicada a ele; senão cai para a inbox padrão do tenant.
 * Ver docs/PLANO_MENSAGERIA.md seção 14.9 — gap corrigido: antes, uma única inbox por
 * tenant era usada para todos os clientes, ignorando client_id mesmo a coluna existindo.
 */
export async function resolveWhatsAppProvider(tenantId: string, clientId?: string | null): Promise<string> {
  if (clientId) {
    const { rows } = await pool.query(
      `SELECT whatsapp_provider FROM public.clientes WHERE uuid = $1 AND tenant_id = $2`,
      [clientId, tenantId],
    )
    if (rows[0]?.whatsapp_provider) return rows[0].whatsapp_provider
  }
  const { rows } = await pool.query(`SELECT whatsapp_provider FROM public.tenants WHERE id = $1`, [tenantId])
  return rows[0]?.whatsapp_provider || 'evolution'
}

async function resolveWhatsAppCloudInbox(tenantId: string, clientId: string | null | undefined): Promise<string | null> {
  const { rows: credRows } = await pool.query(
    `SELECT phone_number_id, access_token, display_phone_number
       FROM mensageria.whatsapp_cloud_credentials
      WHERE tenant_id = $1 AND is_active = true
        AND (client_id = $2::uuid OR client_id IS NULL)
      ORDER BY client_id NULLS LAST
      LIMIT 1`,
    [tenantId, clientId ?? null],
  )
  const cred = credRows[0]
  if (!cred) return null

  const config = JSON.stringify({
    phone_number_id: cred.phone_number_id,
    access_token: cred.access_token,
    number: cred.display_phone_number ?? null,
  })

  const { rows: existing } = await pool.query(
    `SELECT id FROM ${SCHEMA}.inboxes WHERE tenant_id = $1 AND client_id ${clientId ? '= $2' : 'IS NULL'} AND channel_type = 'whatsapp' LIMIT 1`,
    clientId ? [tenantId, clientId] : [tenantId],
  )
  if (existing[0]) {
    await pool.query(
      `UPDATE ${SCHEMA}.inboxes SET provider = 'whatsapp_cloud', config = $1::jsonb WHERE id = $2`,
      [config, existing[0].id],
    )
    return existing[0].id
  }

  const { rows: created } = await pool.query(
    `INSERT INTO ${SCHEMA}.inboxes (tenant_id, client_id, name, channel_type, provider, config)
     VALUES ($1, $2, 'WhatsApp (Cloud API)', 'whatsapp', 'whatsapp_cloud', $3::jsonb)
     RETURNING id`,
    [tenantId, clientId ?? null, config],
  )
  return created[0].id
}

export async function resolveWhatsAppInbox(tenantId: string, clientId?: string | null): Promise<string> {
  // Escolha explícita e excludente (seção 5.4b do plano) — nunca inferida pelo que está
  // configurado. Resolve ANTES de olhar as colunas Evolution, pra não cair no fallback de
  // sempre quando o escopo escolheu Cloud API mas ainda não terminou de configurar a credencial.
  const provider = await resolveWhatsAppProvider(tenantId, clientId)
  if (provider === 'whatsapp_cloud') {
    const cloudInboxId = await resolveWhatsAppCloudInbox(tenantId, clientId)
    if (cloudInboxId) return cloudInboxId
    // Escolheu Cloud API mas ainda não cadastrou a credencial (W0 sem W1 preenchido) — cai no
    // Evolution como rede de segurança, nunca retorna erro/quebra o fluxo de mensagem real.
  }

  if (clientId) {
    const { rows: clientRows } = await pool.query(
      `SELECT evolution_api_url, evolution_api_key, evolution_instance, numero_whatsapp
         FROM public.clientes WHERE uuid = $1 AND tenant_id = $2`,
      [clientId, tenantId],
    )
    const c = clientRows[0]
    if (c?.evolution_instance) {
      // `config` não tem NENHUM outro escritor além daqui (confirmado — não existe UI de
      // override por inbox) — é sempre um espelho de public.clientes/tenants, nunca uma
      // customização deliberada. Por isso a linha já existente é sempre re-sincronizada, não
      // só criada uma vez: sem isso, uma inbox criada ANTES de configurar as credenciais Evolution
      // do cliente/tenant (ex.: 1ª mensagem chegou antes do admin preencher o formulário) fica
      // travada pra sempre com config vazio, mesmo depois da credencial real ser configurada —
      // achado real testando reactivation com dado vivo, não hipotético.
      const config = JSON.stringify({
        api_url: c.evolution_api_url ?? null,
        api_key: c.evolution_api_key ?? null,
        instance: c.evolution_instance ?? null,
        number: c.numero_whatsapp ?? null,
      })
      const { rows: existingClientInbox } = await pool.query(
        `SELECT id FROM ${SCHEMA}.inboxes WHERE tenant_id = $1 AND client_id = $2 AND channel_type = 'whatsapp' LIMIT 1`,
        [tenantId, clientId],
      )
      if (existingClientInbox[0]) {
        await pool.query(`UPDATE ${SCHEMA}.inboxes SET config = $1::jsonb WHERE id = $2`, [config, existingClientInbox[0].id])
        return existingClientInbox[0].id
      }
      const { rows: created } = await pool.query(
        `INSERT INTO ${SCHEMA}.inboxes (tenant_id, client_id, name, channel_type, provider, config)
         VALUES ($1, $2, 'WhatsApp (cliente)', 'whatsapp', 'evolution', $3::jsonb)
         RETURNING id`,
        [tenantId, clientId, config],
      )
      return created[0].id
    }
    // Cliente sem número próprio configurado — cai para a inbox padrão do tenant abaixo.
  }

  const { rows: tenantRows } = await pool.query(
    `SELECT evolution_api_url, evolution_api_key, evolution_instance, numero_whatsapp
       FROM public.tenants WHERE id = $1`,
    [tenantId],
  )
  const t = tenantRows[0] || {}
  const tenantConfig = JSON.stringify({
    api_url: t.evolution_api_url ?? null,
    api_key: t.evolution_api_key ?? null,
    instance: t.evolution_instance ?? null,
    number: t.numero_whatsapp ?? null,
  })

  const { rows: existingTenantInbox } = await pool.query(
    `SELECT id FROM ${SCHEMA}.inboxes WHERE tenant_id = $1 AND client_id IS NULL AND channel_type = 'whatsapp' LIMIT 1`,
    [tenantId],
  )
  if (existingTenantInbox[0]) {
    // Mesmo raciocínio do bloco de cliente acima: re-sincroniza sempre, nunca confia num
    // snapshot que pode ter sido gravado antes da credencial real existir.
    await pool.query(`UPDATE ${SCHEMA}.inboxes SET config = $1::jsonb WHERE id = $2`, [tenantConfig, existingTenantInbox[0].id])
    return existingTenantInbox[0].id
  }

  const { rows: created } = await pool.query(
    `INSERT INTO ${SCHEMA}.inboxes (tenant_id, name, channel_type, provider, config)
     VALUES ($1, 'WhatsApp', 'whatsapp', 'evolution', $2::jsonb)
     RETURNING id`,
    [tenantId, tenantConfig],
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
 * Inbox do widget de chat público (M4.4) — visitante anônimo do site conversando direto com o
 * bot na página de um imóvel. Mesmo padrão de `resolveWebformInbox`: sem credenciais de envio
 * (o "envio" é a própria resposta HTTP pro widget), criada lazy na 1ª mensagem real.
 */
export async function resolveWebchatInbox(tenantId: string): Promise<string> {
  const { rows } = await pool.query(
    `SELECT id FROM ${SCHEMA}.inboxes WHERE tenant_id = $1 AND channel_type = 'webchat' LIMIT 1`,
    [tenantId],
  )
  if (rows[0]) return rows[0].id

  const { rows: created } = await pool.query(
    `INSERT INTO ${SCHEMA}.inboxes (tenant_id, name, channel_type, provider, config)
     VALUES ($1, 'Chat do Site', 'webchat', 'internal', '{}'::jsonb)
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
