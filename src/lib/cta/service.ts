/**
 * Serviço de Destinos de CTA + captura de interações/submissões.
 * Tabelas em campanhasmarketingdigital."Cta*" — acesso via pool (SQL raw),
 * pois o Prisma client não reflete estas tabelas novas.
 */
import pool from '@/lib/database/connection'

const SCHEMA = 'campanhasmarketingdigital'

export type CtaDestinationType = 'APP_FORM' | 'EXTERNAL_URL' | 'WHATSAPP'

export interface CtaFieldDef {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select'
  required?: boolean
  options?: string[]
}

export interface CtaFormConfig {
  title?: string
  description?: string
  submitLabel?: string
  thankYouMessage?: string
  redirectUrl?: string
  accent?: string            // cor de destaque por cliente (branding)
  fields?: CtaFieldDef[]
  // WHATSAPP
  phoneNumber?: string
  introMessage?: string
  // EXTERNAL_URL
  url?: string
}

export interface CtaDestination {
  id: string
  tenant_id: string
  client_id: string | null
  name: string
  slug: string
  type: CtaDestinationType
  cta_type: string | null
  config: CtaFormConfig
  is_active: boolean
}

export async function getDestinationBySlug(slug: string): Promise<CtaDestination | null> {
  const { rows } = await pool.query(
    `SELECT id, tenant_id, client_id, name, slug, type, cta_type, config, is_active
       FROM ${SCHEMA}."CtaDestination"
      WHERE slug = $1 AND is_active = true
      LIMIT 1`,
    [slug],
  )
  return (rows[0] as CtaDestination) || null
}

export interface ResolvedCtaRef {
  clientId: string | null
  campaignId: string | null
  adId: string | null
  destinationId: string | null
  ctaType: string | null
  /** nome legível pra usar como utm_campaign de exibição — nome real da campanha ou do mecanismo */
  campaignName: string | null
}

/**
 * Resolve um ref extraído de "[ref:xxx]" (embutido na mensagem de WhatsApp) pra sua origem real.
 * Unifica os dois sistemas de atribuição que existiam paralelos e desconectados — ver
 * docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §9.3:
 *
 *   1. Ad.trackingId — campanha REAL lançada por esta plataforma (Sistema A, o wizard de
 *      campanhas). Já é o mesmo identificador usado por /api/r/[trackingId] pro redirect —
 *      reaproveitado aqui como o ref, sem precisar criar um CtaDestination por anúncio.
 *   2. CtaDestination.slug — mecanismo de CTA criado manualmente em /admin/campanhas/mecanismos,
 *      pra campanhas geridas fora da plataforma (Sistema B, o que já funcionava ponta a ponta).
 *
 * Tenta (1) primeiro porque carrega atribuição mais rica (campaignId + adId reais); cai pra (2)
 * se não achar. Retorna null se o ref não corresponder a nada (mensagem sem CTA reconhecível).
 */
export async function resolveCtaRef(ref: string, tenantId: string): Promise<ResolvedCtaRef | null> {
  const adRows = await pool.query(
    `SELECT a.id AS ad_id, a."ctaType" AS cta_type, c.id AS campaign_id, c.name AS campaign_name, c.client_id AS client_id
       FROM ${SCHEMA}."Ad" a
       JOIN ${SCHEMA}."AdSet" s ON s.id = a."adSetId"
       JOIN ${SCHEMA}."Campaign" c ON c.id = s."campaignId"
      WHERE a."trackingId" = $1 AND c.tenant_id = $2::uuid
      LIMIT 1`,
    [ref, tenantId],
  )
  if (adRows.rows[0]) {
    const r = adRows.rows[0]
    return {
      clientId: r.client_id ?? null,
      campaignId: r.campaign_id,
      adId: r.ad_id,
      destinationId: null,
      // CTA real do anúncio (não mais hardcoded 'WHATSAPP_MESSAGE') — desde a generalização
      // de /api/r/{trackingId} pra qualquer CTA (não só WhatsApp), um Ad com trackingId pode
      // ter ctaType=LEARN_MORE/SIGN_UP/etc. apontando pra formulário hospedado ou site próprio
      // do cliente. Hardcoded aqui fazia leadEvents.ts excluir esses leads reais (mesmo filtro
      // que existe pra não contar 2x o eco de uma resposta real de WhatsApp).
      ctaType: r.cta_type ?? 'WHATSAPP_MESSAGE',
      campaignName: r.campaign_name ?? null,
    }
  }

  const dest = await getDestinationBySlug(ref)
  if (dest && dest.tenant_id === tenantId) {
    return {
      clientId: dest.client_id,
      campaignId: null,
      adId: null,
      destinationId: dest.id,
      ctaType: dest.cta_type,
      campaignName: dest.name,
    }
  }

  return null
}

export interface InteractionInput {
  tenantId: string
  clientId?: string | null
  destinationId?: string | null
  campaignId?: string | null
  adId?: string | null
  ctaType?: string | null
  eventType: 'VIEW' | 'SUBMIT' | 'WHATSAPP_CLICK' | 'REDIRECT'
  utm?: { source?: string; medium?: string; campaign?: string; content?: string }
  ip?: string | null
  userAgent?: string | null
  referrer?: string | null
}

export async function logInteraction(i: InteractionInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO ${SCHEMA}."CtaInteraction"
       (tenant_id, client_id, destination_id, campaign_id, ad_id, cta_type, event_type,
        utm_source, utm_medium, utm_campaign, utm_content, ip_address, user_agent, referrer)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`,
    [
      i.tenantId, i.clientId ?? null, i.destinationId ?? null, i.campaignId ?? null,
      i.adId ?? null, i.ctaType ?? null, i.eventType,
      i.utm?.source ?? null, i.utm?.medium ?? null, i.utm?.campaign ?? null, i.utm?.content ?? null,
      i.ip ?? null, i.userAgent ?? null, i.referrer ?? null,
    ],
  )
  return rows[0].id
}

export interface SubmissionInput {
  tenantId: string
  clientId?: string | null
  destinationId?: string | null
  interactionId?: string | null
  campaignId?: string | null
  ctaType?: string | null
  payload: Record<string, any>
  name?: string | null
  email?: string | null
  phone?: string | null
  utm?: { source?: string; medium?: string; campaign?: string; content?: string }
}

export async function insertSubmission(s: SubmissionInput): Promise<string> {
  const { rows } = await pool.query(
    `INSERT INTO ${SCHEMA}."CtaSubmission"
       (tenant_id, client_id, destination_id, interaction_id, campaign_id, cta_type,
        payload, name, email, phone, utm_source, utm_medium, utm_campaign, utm_content)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$14)
     RETURNING id`,
    [
      s.tenantId, s.clientId ?? null, s.destinationId ?? null, s.interactionId ?? null,
      s.campaignId ?? null, s.ctaType ?? null, JSON.stringify(s.payload ?? {}),
      s.name ?? null, s.email ?? null, s.phone ?? null,
      s.utm?.source ?? null, s.utm?.medium ?? null, s.utm?.campaign ?? null, s.utm?.content ?? null,
    ],
  )
  return rows[0].id
}

export async function linkSubmissionLead(submissionId: string, leadUuid: string): Promise<void> {
  await pool.query(
    `UPDATE ${SCHEMA}."CtaSubmission" SET lead_uuid = $1 WHERE id = $2`,
    [leadUuid, submissionId],
  )
}

/**
 * Heurística para extrair nome/email/telefone de um payload de form arbitrário,
 * usando o tipo e o nome dos campos definidos no destino.
 */
export function normalizeContact(
  payload: Record<string, any>,
  fields: CtaFieldDef[] = [],
): { name: string | null; email: string | null; phone: string | null } {
  let name: string | null = null
  let email: string | null = null
  let phone: string | null = null

  const val = (k: string) => {
    const v = payload?.[k]
    return v != null && String(v).trim() !== '' ? String(v).trim() : null
  }

  for (const f of fields) {
    const n = (f.name || '').toLowerCase()
    if (!email && (f.type === 'email' || /e-?mail/.test(n))) email = val(f.name)
    else if (!phone && (f.type === 'tel' || /tel|phone|whats|celular|fone/.test(n))) phone = val(f.name)
    else if (!name && /nome|name/.test(n)) name = val(f.name)
  }

  // Fallback: varre o payload por chaves comuns caso os fields não tenham marcado
  if (!email) for (const k of Object.keys(payload)) if (/e-?mail/i.test(k)) { email = val(k); break }
  if (!phone) for (const k of Object.keys(payload)) if (/tel|phone|whats|celular|fone/i.test(k)) { phone = val(k); break }
  if (!name) for (const k of Object.keys(payload)) if (/nome|name/i.test(k)) { name = val(k); break }

  return { name, email, phone }
}
