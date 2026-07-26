import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export const dynamic = 'force-dynamic'

const S = 'campanhasmarketingdigital'

/**
 * POST /api/public/google-leads/webhook
 *
 * Recebe leads do Lead Form Extension nativo do Google Ads (formulário preenchido dentro do
 * próprio anúncio, sem sair do Google — equivalente ao Formulário Instantâneo do Meta).
 * Configuração fica 100% do lado do Google Ads (o cliente configura URL + chave direto na tela
 * do Lead Form, aba "Exportar leads" > "Webhook integration") — não depende de Developer Token
 * nem de nenhuma chamada nossa à API do Google.
 *
 * Payload documentado em https://developers.google.com/google-ads/webhook/docs/implementation —
 * a doc oficial usa `google_key` no exemplo de produção e `Google_key` nos exemplos de teste
 * (inconsistência da própria documentação), por isso aceitamos os dois.
 *
 * Deliberadamente NÃO usa CtaInteraction/CtaSubmission (mecanismo de CTA/redirect — não se
 * aplica aqui, já que o formulário nunca sai da superfície do Google) nem conta como "Sinal de
 * Interesse (Meta)" (que é explicitamente só-Meta, ver leads/stats/route.ts) — tem sua própria
 * tabela de dedupe (GoogleLeadFormSubmission) e vira lead real via /api/crm/leads diretamente.
 */

interface GoogleUserColumnData {
  column_id: string
  column_name?: string
  string_value: string
}

interface GoogleLeadFormPayload {
  lead_id: string
  campaign_id: number | string
  form_id?: number | string
  gcl_id?: string
  google_key?: string
  Google_key?: string
  is_test?: boolean
  user_column_data?: GoogleUserColumnData[]
}

function pickField(cols: GoogleUserColumnData[], ids: string[]): string | null {
  for (const id of ids) {
    const hit = cols.find(c => c.column_id === id)
    if (hit?.string_value) return hit.string_value
  }
  return null
}

export async function POST(request: NextRequest) {
  let body: GoogleLeadFormPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'JSON inválido' }, { status: 400 })
  }

  const leadId = body.lead_id
  const campaignExternalId = body.campaign_id != null ? String(body.campaign_id) : null
  const googleKey = body.google_key ?? body.Google_key ?? null
  const isTest = body.is_test === true

  if (!leadId || !campaignExternalId) {
    return NextResponse.json({ message: 'lead_id e campaign_id são obrigatórios' }, { status: 400 })
  }

  // 1. Resolve tenant/campanha via Campaign.external_id (rede google) — payload do Google não
  // traz nenhum identificador de tenant nosso, só o campaign_id numérico dele.
  const campRes = await pool.query(
    `SELECT c.id AS campaign_id, c.tenant_id, c.client_id
       FROM ${S}."Campaign" c
       JOIN public.ad_networks n ON n.id = c."network_id"
      WHERE n.code = 'google' AND c.external_id = $1
      LIMIT 1`,
    [campaignExternalId],
  )
  const camp = campRes.rows[0]
  if (!camp) {
    // Campanha não rastreada nesta plataforma — nunca vamos conseguir processar; 200 evita
    // retry infinito do Google por algo que nunca vai se resolver reenviando.
    console.warn('[google-leads-webhook] campaign_id não encontrado:', campaignExternalId)
    return NextResponse.json({})
  }

  // 2. Valida a chave configurada pelo tenant (mesma que ele digitou na tela do Lead Form no
  // Google Ads) — 1 chave por tenant (não por formulário), reaproveitando o mesmo padrão de
  // armazenamento de credenciais de rede já usado pra Meta/Google (tenant_network_credentials).
  const keyRes = await pool.query(
    `SELECT tnc.credentials->>'lead_form_webhook_key' AS key
       FROM public.tenant_network_credentials tnc
       JOIN public.ad_networks n ON n.id = tnc.network_id
      WHERE tnc.tenant_id = $1::uuid AND n.code = 'google'
      LIMIT 1`,
    [camp.tenant_id],
  )
  const configuredKey = keyRes.rows[0]?.key
  if (!configuredKey || !googleKey || configuredKey !== googleKey) {
    console.warn('[google-leads-webhook] google_key inválida ou não configurada pro tenant', camp.tenant_id)
    return NextResponse.json({ message: 'chave inválida' }, { status: 401 })
  }

  // 3. Dedupe — Google não garante entrega exatamente-uma-vez do lead_id (documentado).
  const dedupeRes = await pool.query(
    `INSERT INTO ${S}."GoogleLeadFormSubmission" (id, tenant_id, campaign_id, is_test, raw_payload)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [leadId, camp.tenant_id, camp.campaign_id, isTest, JSON.stringify(body)],
  )
  if (dedupeRes.rows.length === 0) {
    return NextResponse.json({}) // já processado antes — reentrega, responde OK sem duplicar
  }

  // 4. Extrai identidade real do formulário (colunas padrão documentadas: FULL_NAME,
  // FIRST_NAME/LAST_NAME, EMAIL, PHONE_NUMBER).
  const cols = body.user_column_data ?? []
  const fullName = pickField(cols, ['FULL_NAME'])
  const firstLast = [pickField(cols, ['FIRST_NAME']), pickField(cols, ['LAST_NAME'])].filter(Boolean).join(' ')
  const name  = fullName ?? (firstLast || null)
  const email = pickField(cols, ['EMAIL'])
  const phone = pickField(cols, ['PHONE_NUMBER'])

  if (!email && !phone) {
    // Formulário sem nenhum campo de contato configurado — sem identidade, não vira lead.
    return NextResponse.json({})
  }

  // 5. Cria/enriquece o lead real no CRM — mesmo mecanismo de qualquer outro lead identificado
  // (mesmo padrão de /api/public/meta-leads/webhook). origem entra em marketing_eventos.plataforma,
  // não em leads_staging.
  try {
    const baseUrl = process.env.INTERNAL_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const crmRes = await fetch(`${baseUrl}/api/crm/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: camp.tenant_id,
        client_id: camp.client_id,
        campaign_id: camp.campaign_id,
        nome: name ?? 'Lead Google Ads',
        email,
        telefone: phone,
        utm_source: 'google',
        utm_medium: 'lead_form',
        utm_campaign: body.form_id ? String(body.form_id) : null,
        origem: isTest ? 'google_lead_form_test' : 'google_lead_form',
        payload_extra: { lead_id: leadId, gcl_id: body.gcl_id, is_test: isTest, form_id: body.form_id },
      }),
    })
    if (crmRes.ok) {
      const crmData = await crmRes.json()
      const leadUuid = crmData.lead_uuid ?? crmData.leadUuid ?? null
      if (leadUuid) {
        await pool.query(
          `UPDATE ${S}."GoogleLeadFormSubmission" SET lead_uuid = $1 WHERE id = $2`,
          [leadUuid, leadId],
        )
      }
    }
  } catch (err) {
    console.error('[google-leads-webhook] falha ao criar lead no CRM (submissão já salva, dedupe preservado):', err)
  }

  return NextResponse.json({})
}
