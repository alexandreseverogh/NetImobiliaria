import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { ingestMessage } from '@/lib/mensageria/ingest'
import { resolveManualInbox } from '@/lib/mensageria/inboxes'
import { resolveMensageriaScope, isTenantAdminFromPayload, scopeToSql } from '@/lib/mensageria/visibilityScope'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

const SORTABLE_COLUMNS: Record<string, string> = {
  lastMessageAt: 'c.last_message_at',
  firstResponseDurationSec: 'first_response_duration_sec',
  createdAt: 'c.created_at',
}

/**
 * GET /api/admin/mensageria/conversations
 * Lista conversas do tenant. Serve dois consumidores com o mesmo filtro base:
 * Caixa de Entrada (seção 8.1, paginação por `cursor`/scroll infinito) e Painel do
 * Gestor (seção 17.3, paginação numerada `page`/`pageSize` + KPIs + ordenação).
 *
 * Query params: status · inboxId · teamId · priority · labelId · assigneeId
 *               ('me'|<uuid>|'unassigned') · search (nome/telefone do contato) ·
 *               dateFrom/dateTo (YYYY-MM-DD, filtra por last_message_at) ·
 *               cursor (modo scroll infinito) OU page/pageSize (modo tabela) ·
 *               sortBy ('lastMessageAt'|'firstResponseDurationSec'|'createdAt') · sortDir ('asc'|'desc')
 *               includeKpis=1 — inclui agregados (emAberto, slaEstourado, tempoMedioSegundos)
 *
 * Sempre passa por resolveMensageriaScope() antes dos demais filtros (seção 17.3) —
 * um atendente batendo com teamId de outro time recebe resultado vazio, não erro.
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const sp = new URL(request.url).searchParams
  const status = sp.get('status')
  const inboxId = sp.get('inboxId')
  const channelType = sp.get('channelType')
  const teamId = sp.get('teamId')
  const priority = sp.get('priority')
  const labelId = sp.get('labelId')
  const assigneeId = sp.get('assigneeId')
  const search = sp.get('search')
  const dateFrom = sp.get('dateFrom')
  const dateTo = sp.get('dateTo')
  const cursor = sp.get('cursor')
  const page = sp.get('page') ? Math.max(1, parseInt(sp.get('page')!, 10) || 1) : null
  const pageSize = Math.min(200, Math.max(1, parseInt(sp.get('pageSize') || String(PAGE_SIZE), 10) || PAGE_SIZE))
  const sortBy = SORTABLE_COLUMNS[sp.get('sortBy') || ''] || 'c.last_message_at'
  const sortDir = sp.get('sortDir') === 'asc' ? 'ASC' : 'DESC'
  const includeKpis = sp.get('includeKpis') === '1'

  const where: string[] = ['c.tenant_id = $1']
  const args: any[] = [payload.tenantId]

  // Visibilidade gerencial (PLANO_MENSAGERIA.md seção 16, decisão confirmada 2026-07-07):
  // atendente só vê próprias + não atribuídas do time; líder vê seu(s) time(s); admin vê tudo.
  const scope = await resolveMensageriaScope(payload.tenantId, payload.userId, isTenantAdminFromPayload(payload))
  const scoped = scopeToSql(scope, args)
  if (scoped.clause) where.push(scoped.clause)

  if (status) { args.push(status); where.push(`c.status = $${args.length}`) }
  if (inboxId) { args.push(inboxId); where.push(`c.inbox_id = $${args.length}`) }
  if (channelType) { args.push(channelType); where.push(`ib.channel_type = $${args.length}`) }
  if (teamId) { args.push(teamId); where.push(`c.team_id = $${args.length}`) }
  if (priority) { args.push(priority); where.push(`c.priority = $${args.length}`) }
  if (labelId) { args.push(labelId); where.push(`EXISTS (SELECT 1 FROM mensageria.conversation_labels cl WHERE cl.conversation_id = c.id AND cl.label_id = $${args.length})`) }
  if (assigneeId === 'unassigned') where.push('c.assignee_id IS NULL')
  else if (assigneeId === 'me') { args.push(payload.userId); where.push(`c.assignee_id = $${args.length}`) }
  else if (assigneeId) { args.push(assigneeId); where.push(`c.assignee_id = $${args.length}`) }
  if (search) { args.push(`%${search}%`); where.push(`(ct.name ILIKE $${args.length} OR ct.phone ILIKE $${args.length})`) }
  if (dateFrom) { args.push(dateFrom); where.push(`c.last_message_at >= $${args.length}::date`) }
  if (dateTo) { args.push(dateTo); where.push(`c.last_message_at < ($${args.length}::date + interval '1 day')`) }

  // Contagem total do filtro (sem cursor/página) — usada no contador da pasta "Todas"
  // e no total de páginas do Painel do Gestor. JOIN inboxes é necessário mesmo aqui
  // porque channelType (filtro de canal do Painel do Gestor) referencia ib.channel_type.
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM mensageria.conversations c
       JOIN mensageria.contacts ct ON ct.id = c.contact_id
       JOIN mensageria.inboxes ib ON ib.id = c.inbox_id
      WHERE ${where.join(' AND ')}`,
    args,
  )
  const totalCount = countRows[0]?.total ?? 0

  let kpis: { emAberto: number; slaEstourado: number; tempoMedioSegundos: number | null } | null = null
  if (includeKpis) {
    const { rows: kpiRows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE c.status IN ('open','pending'))::int AS em_aberto,
         COUNT(*) FILTER (WHERE cs.first_response_breached OR cs.resolution_breached)::int AS sla_estourado,
         AVG(EXTRACT(EPOCH FROM (c.first_response_at - c.created_at))) FILTER (WHERE c.first_response_at IS NOT NULL) AS tempo_medio_segundos
         FROM mensageria.conversations c
         JOIN mensageria.contacts ct ON ct.id = c.contact_id
         JOIN mensageria.inboxes ib ON ib.id = c.inbox_id
         LEFT JOIN mensageria.conversation_sla cs ON cs.conversation_id = c.id
        WHERE ${where.join(' AND ')}`,
      args,
    )
    const k = kpiRows[0] || {}
    kpis = {
      emAberto: k.em_aberto ?? 0,
      slaEstourado: k.sla_estourado ?? 0,
      tempoMedioSegundos: k.tempo_medio_segundos != null ? Math.round(Number(k.tempo_medio_segundos)) : null,
    }
  }

  const listWhere = [...where]
  const listArgs = [...args]
  let limitOffsetClause = ''
  if (page !== null) {
    listArgs.push(pageSize, (page - 1) * pageSize)
    limitOffsetClause = `LIMIT $${listArgs.length - 1} OFFSET $${listArgs.length}`
  } else {
    if (cursor) { listArgs.push(cursor); listWhere.push(`c.last_message_at < $${listArgs.length}`) }
    limitOffsetClause = `LIMIT ${pageSize}`
  }

  const { rows } = await pool.query(
    `SELECT
       c.id, c.status, c.priority, c.unread_count, c.last_message_at, c.handled_by_bot,
       c.assignee_id, c.created_at, c.team_id,
       EXTRACT(EPOCH FROM (c.first_response_at - c.created_at)) AS first_response_duration_sec,
       ct.id AS contact_id, ct.name AS contact_name, ct.phone AS contact_phone,
       ct.avatar_url AS contact_avatar_url, ct.lead_uuid,
       ib.channel_type, ib.name AS inbox_name,
       u.nome AS assignee_name,
       tm.name AS team_name,
       (SELECT m.content FROM mensageria.messages m
          WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_preview
     FROM mensageria.conversations c
     JOIN mensageria.contacts ct ON ct.id = c.contact_id
     JOIN mensageria.inboxes ib ON ib.id = c.inbox_id
     LEFT JOIN public.users u ON u.id = c.assignee_id
     LEFT JOIN mensageria.teams tm ON tm.id = c.team_id
     WHERE ${listWhere.join(' AND ')}
     ORDER BY ${sortBy} ${sortDir} NULLS LAST
     ${limitOffsetClause}`,
    listArgs,
  )

  const nextCursor = page === null && rows.length === pageSize ? rows[rows.length - 1].last_message_at : null

  return NextResponse.json({
    conversations: rows.map((r) => ({
      id: r.id,
      status: r.status,
      priority: r.priority,
      unreadCount: r.unread_count,
      lastMessageAt: r.last_message_at,
      lastMessagePreview: r.last_message_preview,
      handledByBot: r.handled_by_bot,
      channelType: r.channel_type,
      inboxName: r.inbox_name,
      teamId: r.team_id,
      teamName: r.team_name,
      firstResponseDurationSec: r.first_response_duration_sec != null ? Math.round(Number(r.first_response_duration_sec)) : null,
      assignee: r.assignee_id ? { id: r.assignee_id, name: r.assignee_name } : null,
      contact: {
        id: r.contact_id,
        name: r.contact_name,
        phone: r.contact_phone,
        avatarUrl: r.contact_avatar_url,
        leadUuid: r.lead_uuid,
      },
      createdAt: r.created_at,
    })),
    nextCursor,
    totalCount,
    totalPages: page !== null ? Math.max(1, Math.ceil(totalCount / pageSize)) : null,
    kpis,
  })
}

/**
 * POST /api/admin/mensageria/conversations
 * Inicia uma conversa MANUAL — atendente registra um contato + interação que não
 * veio de um canal externo (ex.: ligação telefônica, atendimento presencial).
 * Body: { name?, phone?, email?, initialMessage?, clientId? }
 *
 * clientId (opcional) — quando o atendente seleciona um cliente já cadastrado no
 * combobox "Nome do Contato" (busca em public.clientes), a conversa nasce vinculada
 * a ele, herdando a segregação por cliente usada no resto da plataforma. Quando
 * ausente, a conversa fica no âmbito do próprio tenant (pessoa ainda não é cliente).
 */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { name, phone, email, initialMessage, clientId } = body

  if (!phone && !email) {
    return NextResponse.json({ error: 'Informe ao menos telefone ou e-mail do contato' }, { status: 400 })
  }

  let resolvedClientId: string | null = null
  if (clientId) {
    const { rows } = await pool.query(
      `SELECT uuid FROM public.clientes WHERE uuid = $1 AND tenant_id = $2`,
      [clientId, payload.tenantId],
    )
    resolvedClientId = rows[0]?.uuid ?? null
  }

  const inboxId = await resolveManualInbox(payload.tenantId)
  const result = await ingestMessage({
    tenantId: payload.tenantId,
    clientId: resolvedClientId,
    inboxId,
    contact: { name: name || null, phone: phone || null, email: email || null },
    direction: 'outbound',
    senderType: 'agent',
    senderId: payload.userId,
    content: initialMessage || 'Conversa registrada manualmente.',
  })

  return NextResponse.json({ success: true, conversationId: result.conversationId, contactId: result.contactId, clientId: resolvedClientId })
}
