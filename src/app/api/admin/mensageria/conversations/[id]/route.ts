import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { checkResolutionBreach } from '@/lib/mensageria/sla'
import { resolveMensageriaScope, isTenantAdminFromPayload, scopeToSql } from '@/lib/mensageria/visibilityScope'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mensageria/conversations/[id]
 * Detalhe da conversa (coluna 3 — thread) + histórico de mensagens.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Visibilidade gerencial (seção 16) — fora do escopo retorna 404, não 403 (não confirma
  // nem a existência da conversa para quem não pode vê-la).
  const scope = await resolveMensageriaScope(payload.tenantId, payload.userId, isTenantAdminFromPayload(payload))
  const args: any[] = [params.id, payload.tenantId]
  const scoped = scopeToSql(scope, args)
  const scopeClause = scoped.clause ? ` AND ${scoped.clause}` : ''

  const { rows: convRows } = await pool.query(
    `SELECT c.id, c.status, c.priority, c.unread_count, c.assignee_id, c.handled_by_bot,
            c.first_response_at, c.resolved_at, c.created_at,
            ct.id AS contact_id, ct.name AS contact_name, ct.phone AS contact_phone,
            ct.email AS contact_email, ct.avatar_url AS contact_avatar_url, ct.lead_uuid,
            ib.id AS inbox_id, ib.channel_type, ib.name AS inbox_name,
            u.nome AS assignee_name,
            attr.campaign_id, attr.utm_source, attr.utm_medium, attr.utm_campaign, camp.name AS campaign_name
       FROM mensageria.conversations c
       JOIN mensageria.contacts ct ON ct.id = c.contact_id
       JOIN mensageria.inboxes ib ON ib.id = c.inbox_id
       LEFT JOIN public.users u ON u.id = c.assignee_id
       -- Atribuição de campanha (T3 — docs/TESTES_UNIFICACAO_LEADS_3_MODULOS.md): o dado já
       -- existe via ct.lead_uuid -> marketing_eventos, mas nenhuma tela de Mensageria mostrava
       -- isso. Pega o toque mais recente do lead (nem sempre é o que abriu ESTA conversa
       -- específica, mas é a melhor aproximação sem um vínculo direto conversa->evento).
       LEFT JOIN LATERAL (
         SELECT me.campaign_id, me.utm_source, me.utm_medium, me.utm_campaign
           FROM public.marketing_eventos me
          WHERE me.lead_uuid = ct.lead_uuid
          ORDER BY me.created_at DESC
          LIMIT 1
       ) attr ON ct.lead_uuid IS NOT NULL
       LEFT JOIN campanhasmarketingdigital."Campaign" camp ON camp.id = attr.campaign_id
      WHERE c.id = $1 AND c.tenant_id = $2${scopeClause}`,
    args,
  )
  const conv = convRows[0]
  if (!conv) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  const { rows: messages } = await pool.query(
    `SELECT id, direction, sender_type, sender_id, content, content_type, attachments,
            delivery_status, is_private, created_at
       FROM mensageria.messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC`,
    [params.id],
  )

  const { rows: labels } = await pool.query(
    `SELECT l.id, l.name, l.color
       FROM mensageria.conversation_labels cl
       JOIN mensageria.labels l ON l.id = cl.label_id
      WHERE cl.conversation_id = $1`,
    [params.id],
  )

  const { rows: slaRows } = await pool.query(
    `SELECT first_response_due, first_response_breached, resolution_due, resolution_breached
       FROM mensageria.conversation_sla WHERE conversation_id = $1`,
    [params.id],
  )
  const sla = slaRows[0] || null

  // Marca como lida ao abrir (zera unread_count)
  await pool.query(`UPDATE mensageria.conversations SET unread_count = 0 WHERE id = $1`, [params.id])

  return NextResponse.json({
    conversation: {
      id: conv.id,
      status: conv.status,
      priority: conv.priority,
      handledByBot: conv.handled_by_bot,
      firstResponseAt: conv.first_response_at,
      resolvedAt: conv.resolved_at,
      createdAt: conv.created_at,
      inbox: { id: conv.inbox_id, channelType: conv.channel_type, name: conv.inbox_name },
      assignee: conv.assignee_id ? { id: conv.assignee_id, name: conv.assignee_name } : null,
      contact: {
        id: conv.contact_id,
        name: conv.contact_name,
        phone: conv.contact_phone,
        email: conv.contact_email,
        avatarUrl: conv.contact_avatar_url,
        leadUuid: conv.lead_uuid,
        // null quando o lead não tem nenhum toque de marketing (ex.: WhatsApp 100% orgânico,
        // sem nenhuma campanha/CtaInteraction envolvida) — distingue de "não sabemos".
        attribution: conv.utm_source ? {
          campaignId: conv.campaign_id,
          campaignName: conv.campaign_name,
          utmSource: conv.utm_source,
          utmMedium: conv.utm_medium,
          utmCampaign: conv.utm_campaign,
        } : null,
      },
      labels,
      sla: sla ? {
        firstResponseDue: sla.first_response_due,
        firstResponseBreached: sla.first_response_breached,
        resolutionDue: sla.resolution_due,
        resolutionBreached: sla.resolution_breached,
      } : null,
    },
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      senderType: m.sender_type,
      senderId: m.sender_id,
      content: m.content,
      contentType: m.content_type,
      attachments: m.attachments,
      deliveryStatus: m.delivery_status,
      isPrivate: m.is_private,
      createdAt: m.created_at,
    })),
  })
}

/**
 * PATCH /api/admin/mensageria/conversations/[id]
 * Ações de topo da thread: atribuir, mudar status, prioridade (seção 8.1).
 * Body: { status?, priority?, assigneeId? }
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const sets: string[] = []
  const args: any[] = []

  if (body.status) { args.push(body.status); sets.push(`status = $${args.length}`) }
  if (body.priority !== undefined) { args.push(body.priority); sets.push(`priority = $${args.length}`) }
  if (body.assigneeId !== undefined) { args.push(body.assigneeId); sets.push(`assignee_id = $${args.length}`) }
  if (body.status === 'resolved') sets.push('resolved_at = now()')

  if (sets.length === 0) return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })

  // Visibilidade gerencial (seção 16) — atendente fora do escopo não consegue alterar
  // conversa alheia mesmo sabendo o id (defesa em profundidade, não só ocultação na lista).
  const scope = await resolveMensageriaScope(payload.tenantId, payload.userId, isTenantAdminFromPayload(payload))
  args.push(params.id, payload.tenantId)
  const idIdx = args.length - 1
  const tenantIdx = args.length
  // scopeToSql pode empurrar mais parâmetros — captura os índices de id/tenant ANTES,
  // senão $${args.length} abaixo apontaria pros parâmetros do escopo, não pro id/tenant.
  const scoped = scopeToSql(scope, args)
  const scopeClause = scoped.clause ? ` AND ${scoped.clause}` : ''

  const { rows } = await pool.query(
    `UPDATE mensageria.conversations AS c SET ${sets.join(', ')}
      WHERE c.id = $${idIdx} AND c.tenant_id = $${tenantIdx}${scopeClause}
      RETURNING id, status, priority, assignee_id`,
    args,
  )
  if (!rows[0]) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  if (body.status === 'resolved') await checkResolutionBreach(params.id).catch(() => {})

  await pool.query(
    `INSERT INTO mensageria.conversation_events (conversation_id, event_type, actor_id, payload)
     VALUES ($1, 'status_changed', $2, $3::jsonb)`,
    [params.id, payload.userId, JSON.stringify(body)],
  )

  return NextResponse.json({ success: true, conversation: rows[0] })
}
