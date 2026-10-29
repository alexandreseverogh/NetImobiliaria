import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/**
 * Configuração de provider de WhatsApp (Evolution / Cloud API oficial) + credencial Cloud API,
 * por tenant OU por cliente (docs/PLANO_WHATSAPP_CLOUD_API_PROVIDER.md, achado #4).
 * `?clientId=` ausente = escopo do tenant; presente = escopo daquele cliente.
 *
 * Correção de arquitetura (seção 10 do plano) — o Meta App é por TENANT (reaproveita
 * `tenants.meta_app_id`/`meta_app_secret`, já usados por Meta Ads nesta base), nunca por
 * tenant+cliente: `app_secret`/`webhook_verify_token`/`config_id` só fazem sentido no escopo
 * do TENANT (sem `?clientId=`) — PUT com esses campos e `?clientId=` presente é rejeitado.
 * `phone_number_id`/`waba_id`/`access_token` (o que de fato varia por CLIENTE, resultado da
 * conexão Embedded Signup de cada um) continuam em `mensageria.whatsapp_cloud_credentials`,
 * escopados por (tenant, cliente opcional).
 *
 * GET  — estado atual: provider escolhido pro escopo (+ herdado do tenant quando aplicável),
 *        status do App do tenant (só no escopo tenant), credencial Cloud API já cadastrada
 *        pro escopo, e o uso do mês corrente (seção 2.3/2.4).
 * PUT  — define a escolha de provider pro escopo; no escopo tenant, também aceita
 *        `embeddedSignupConfigId`/`webhookVerifyToken`; em qualquer escopo, upsert dos campos
 *        de credencial por cliente (ausentes preservam o valor já salvo).
 */

async function requireScope(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return null
  const clientId = new URL(request.url).searchParams.get('clientId') || null
  if (clientId) {
    const { rows } = await pool.query(`SELECT 1 FROM public.clientes WHERE uuid = $1 AND tenant_id = $2`, [clientId, payload.tenantId])
    if (rows.length === 0) return null
  }
  return { tenantId: payload.tenantId as string, clientId }
}

export async function GET(request: NextRequest) {
  const scope = await requireScope(request)
  if (!scope) return NextResponse.json({ error: 'Não autenticado ou cliente inválido' }, { status: 401 })

  const { rows: tenantRows } = await pool.query(
    `SELECT whatsapp_provider,
            (meta_app_id IS NOT NULL AND meta_app_id <> '') AS has_meta_app,
            whatsapp_embedded_signup_config_id,
            (whatsapp_webhook_verify_token IS NOT NULL AND whatsapp_webhook_verify_token <> '') AS has_verify_token
       FROM public.tenants WHERE id = $1`,
    [scope.tenantId],
  )
  const tenantRow = tenantRows[0] || {}
  const tenantProvider: string = tenantRow.whatsapp_provider || 'evolution'

  let ownProvider: string | null = null
  if (scope.clientId) {
    const { rows } = await pool.query(`SELECT whatsapp_provider FROM public.clientes WHERE uuid = $1`, [scope.clientId])
    ownProvider = rows[0]?.whatsapp_provider || null
  }
  const effectiveProvider = scope.clientId ? (ownProvider || tenantProvider) : tenantProvider

  const { rows: credRows } = await pool.query(
    `SELECT phone_number_id, waba_id, display_phone_number, payment_method_confirmed, is_active
       FROM mensageria.whatsapp_cloud_credentials
      WHERE tenant_id = $1 AND client_id ${scope.clientId ? '= $2' : 'IS NULL'}
      LIMIT 1`,
    scope.clientId ? [scope.tenantId, scope.clientId] : [scope.tenantId],
  )
  const cred = credRows[0]

  let usage: { sentThisMonth: number } | null = null
  if (cred?.phone_number_id) {
    const yearMonth = new Date().toISOString().slice(0, 7)
    const { rows: usageRows } = await pool.query(
      `SELECT service_messages_sent FROM mensageria.whatsapp_cloud_usage_monthly WHERE phone_number_id = $1 AND year_month = $2`,
      [cred.phone_number_id, yearMonth],
    )
    usage = { sentThisMonth: usageRows[0]?.service_messages_sent || 0 }
  }

  return NextResponse.json({
    tenantProvider,
    ownProvider, // null = este cliente herda do tenant (só relevante quando scope.clientId presente)
    effectiveProvider,
    // Status do App do TENANT (seção 10) — só informativo aqui; só relevante no escopo tenant,
    // mas devolvido sempre pra UI poder avisar "o tenant ainda não configurou o App" mesmo
    // quando se está olhando o escopo de um cliente específico.
    tenantApp: {
      hasMetaApp: !!tenantRow.has_meta_app, // App Ads já existe (tenants.meta_app_id/secret) — reaproveitável
      embeddedSignupConfigId: tenantRow.whatsapp_embedded_signup_config_id || null,
      hasWebhookVerifyToken: !!tenantRow.has_verify_token,
    },
    credential: cred
      ? {
          phoneNumberId: cred.phone_number_id,
          wabaId: cred.waba_id,
          displayPhoneNumber: cred.display_phone_number,
          paymentMethodConfirmed: cred.payment_method_confirmed,
          isActive: cred.is_active,
          // access_token nunca volta pro cliente — só escrito, nunca lido de volta (mesma
          // disciplina de qualquer segredo nesta base).
          hasAccessToken: true,
        }
      : null,
    usage,
  })
}

const VALID_PROVIDERS = ['evolution', 'whatsapp_cloud']

export async function PUT(request: NextRequest) {
  const scope = await requireScope(request)
  if (!scope) return NextResponse.json({ error: 'Não autenticado ou cliente inválido' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const provider: string | undefined = body.provider
  const resetToTenant: boolean = body.resetToTenant === true

  if (scope.clientId && resetToTenant) {
    await pool.query(`UPDATE public.clientes SET whatsapp_provider = NULL WHERE uuid = $1`, [scope.clientId])
    return NextResponse.json({ success: true })
  }

  if (provider && !VALID_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: `provider inválido. Use um de: ${VALID_PROVIDERS.join(', ')}` }, { status: 400 })
  }

  // Campos só de escopo TENANT (App/webhook do App — seção 10) — nunca por cliente.
  const hasTenantAppFields = ['embeddedSignupConfigId', 'webhookVerifyToken'].some((k) => body[k] !== undefined)
  if (hasTenantAppFields && scope.clientId) {
    return NextResponse.json(
      { error: 'embeddedSignupConfigId/webhookVerifyToken são do App do tenant — só podem ser definidos sem ?clientId=.' },
      { status: 400 },
    )
  }

  if (provider) {
    if (scope.clientId) {
      await pool.query(`UPDATE public.clientes SET whatsapp_provider = $1 WHERE uuid = $2`, [provider, scope.clientId])
    } else {
      await pool.query(`UPDATE public.tenants SET whatsapp_provider = $1 WHERE id = $2`, [provider, scope.tenantId])
    }
  }

  if (hasTenantAppFields) {
    const configId: string | undefined = body.embeddedSignupConfigId?.trim()
    const verifyToken: string | undefined = body.webhookVerifyToken?.trim()
    await pool.query(
      `UPDATE public.tenants
          SET whatsapp_embedded_signup_config_id = COALESCE($1, whatsapp_embedded_signup_config_id),
              whatsapp_webhook_verify_token = COALESCE($2, whatsapp_webhook_verify_token)
        WHERE id = $3`,
      [configId || null, verifyToken || null, scope.tenantId],
    )
  }

  // Upsert dos campos de credencial que de fato variam por CLIENTE — só quando algum foi
  // enviado (permite trocar só o provider, ou só os campos do App, sem repetir a credencial).
  const hasCredFields = ['phoneNumberId', 'wabaId', 'accessToken', 'paymentMethodConfirmed'].some((k) => body[k] !== undefined)
  if (hasCredFields) {
    const { rows: existing } = await pool.query(
      `SELECT id, access_token
         FROM mensageria.whatsapp_cloud_credentials
        WHERE tenant_id = $1 AND client_id ${scope.clientId ? '= $2' : 'IS NULL'} LIMIT 1`,
      scope.clientId ? [scope.tenantId, scope.clientId] : [scope.tenantId],
    )
    const prev = existing[0]

    const phoneNumberId: string | undefined = body.phoneNumberId?.trim()
    const wabaId: string | undefined = body.wabaId?.trim()
    const displayPhoneNumber: string | null = body.displayPhoneNumber?.trim() || null
    const accessToken: string = body.accessToken?.trim() || prev?.access_token || ''
    const paymentMethodConfirmed: boolean = body.paymentMethodConfirmed === true

    if (!prev && (!phoneNumberId || !wabaId || !accessToken)) {
      return NextResponse.json(
        { error: 'Pra criar a credencial pela 1ª vez, informe phoneNumberId, wabaId e accessToken.' },
        { status: 400 },
      )
    }

    if (prev) {
      await pool.query(
        `UPDATE mensageria.whatsapp_cloud_credentials
            SET phone_number_id = COALESCE($1, phone_number_id),
                waba_id = COALESCE($2, waba_id),
                access_token = $3,
                display_phone_number = COALESCE($4, display_phone_number),
                payment_method_confirmed = $5
          WHERE id = $6`,
        [phoneNumberId || null, wabaId || null, accessToken, displayPhoneNumber, paymentMethodConfirmed, prev.id],
      )
    } else {
      await pool.query(
        `INSERT INTO mensageria.whatsapp_cloud_credentials
           (tenant_id, client_id, phone_number_id, waba_id, access_token, display_phone_number, payment_method_confirmed)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [scope.tenantId, scope.clientId, phoneNumberId, wabaId, accessToken, displayPhoneNumber, paymentMethodConfirmed],
      )
    }
  }

  return NextResponse.json({ success: true })
}
