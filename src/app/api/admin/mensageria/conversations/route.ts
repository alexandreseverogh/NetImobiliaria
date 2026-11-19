import { hasMensageriaModule } from '@/lib/crm/leadTimeline'
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
  if (!payload.is_system_role && !(await hasMensageriaModule(payload.tenantId))) return NextResponse.json({ error: 'Módulo Mensageria não contratado' }, { status: 403 })

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
  const folder = sp.get('folder')
  // Pendentes: as mais antigas primeiro (a que está há mais tempo esperando é a mais urgente).
  const bolaFolder = folder === 'pending' || folder === 'waiting_client'
  const defaultSortBy = bolaFolder ? 'c.bola_desde' : 'c.last_message_at'
  const defaultSortDir = bolaFolder ? 'asc' : 'desc'
  const sortBy = SORTABLE_COLUMNS[sp.get('sortBy') || ''] || defaultSortBy
  const sortDir = (sp.get('sortDir') || defaultSortDir) === 'asc' ? 'ASC' : 'DESC'
  const includeKpis = sp.get('includeKpis') === '1'

  const where: string[] = ['c.tenant_id = $1']
  const args: any[] = [payload.tenantId]

  // Visibilidade gerencial (PLANO_MENSAGERIA.md seção 16, decisão confirmada 2026-07-07):
  // atendente só vê próprias + não atribuídas do time; líder vê seu(s) time(s); admin vê tudo.
  const scope = await resolveMensageriaScope(payload.tenantId, payload.userId, isTenantAdminFromPayload(payload))
  const scoped = scopeToSql(scope, args)
  if (scoped.clause) where.push(scoped.clause)

  // Pasta "Aguardando resposta" (folder=pending): conversas abertas com a bola conosco, de
  // qualquer data. Nunca é cortada pelo período — pendência de dias atrás não pode sumir.
  const isPendingFolder = folder === 'pending'
  // Contador da pasta: sempre calculado (mesmo escopo, sem data, sem os demais filtros da pasta),
  // para aparecer na lateral mesmo quando outra pasta está aberta. Usa cópia dos parâmetros
  // neste ponto — o Postgres rejeita parâmetros sobrando na query.
  const pendingCountArgs = [...args]
  const { rows: pendingRows } = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM mensageria.conversations c
      WHERE ${[...where, `c.status IN ('open','pending')`, `c.bola_com = 'nos'`].join(' AND ')}`,
    pendingCountArgs,
  )
  const pendingCount = pendingRows[0]?.total ?? 0
  // Pasta "Aguardando cliente" (folder=waiting_client): conversas abertas com a bola no cliente.
  // Mesmo escopo e regra de data da pasta acima. Contador próprio, para as duas pastas aparecerem juntas.
  const isWaitingClientFolder = folder === 'waiting_client'
  const waitingCountArgs = [...args]
  const { rows: waitingRows } = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM mensageria.conversations c
      WHERE ${[...where, `c.status IN ('open','pending')`, `c.bola_com = 'cliente'`].join(' AND ')}`,
    waitingCountArgs,
  )
  const waitingClientCount = waitingRows[0]?.total ?? 0
  if (isWaitingClientFolder) {
    where.push(`c.status IN ('open','pending')`, `c.bola_com = 'cliente'`)
  }

  // Pasta "Resolvidas" (folder=resolved): conversas resolvidas. Segue o período escolhido na tela.
  const isResolvedFolder = folder === 'resolved'
  const resolvedCountArgs = [...args]
  const { rows: resolvedRows } = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM mensageria.conversations c
      WHERE ${[...where, `c.status = 'resolved'`].join(' AND ')}`,
    resolvedCountArgs,
  )
  const resolvedCount = resolvedRows[0]?.total ?? 0
  if (isResolvedFolder) {
    where.push(`c.status = 'resolved'`)
  }
  // Conversa resolvida só aparece na pasta "Resolvidas". Nas demais pastas fica fora da lista,
  // a não ser que o filtro de status seja pedido explicitamente.
  if (!isResolvedFolder && !status) where.push(`c.status <> 'resolved'`)

  if (isPendingFolder) {
    where.push(`c.status IN ('open','pending')`, `c.bola_com = 'nos'`)
  }


  if (status) { args.push(status); where.push(`c.status = $${args.length}`) }
  if (inboxId) { args.push(inboxId); where.push(`c.inbox_id = $${args.length}`) }
  if (channelType) { args.push(channelType); where.push(`ib.channel_type = $${args.length}`) }
  if (teamId) { args.push(teamId); where.push(`c.team_id = $${args.length}`) }
  if (priority) { args.push(priority); where.push(`c.priority = $${args.length}`) }
  // labelId aceita uma lista separada por vírgula. Regra OU: a conversa passa se tiver QUALQUER
  // uma das etiquetas escolhidas (o filtro multi-select da tela é de "qualquer uma").
  if (labelId) {
    const ids = labelId.split(',').map((s) => s.trim()).filter(Boolean)
    if (ids.length > 0) {
      args.push(ids)
      where.push(`EXISTS (SELECT 1 FROM mensageria.conversation_labels cl WHERE cl.conversation_id = c.id AND cl.label_id = ANY($${args.length}::uuid[]))`)
    }
  }
  if (assigneeId === 'unassigned') where.push('c.assignee_id IS NULL')
  else if (assigneeId === 'me') { args.push(payload.userId); where.push(`c.assignee_id = $${args.length}`) }
  else if (assigneeId) { args.push(assigneeId); where.push(`c.assignee_id = $${args.length}`) }
  if (search) { args.push(`%${search}%`); where.push(`(ct.name ILIKE $${args.length} OR ct.phone ILIKE $${args.length})`) }
  // Período não se aplica à pasta de pendentes (ver acima).
  if (dateFrom && !bolaFolder) { args.push(dateFrom); where.push(`(c.last_message_at AT TIME ZONE 'America/Sao_Paulo')::date >= $${args.length}::date`) }
  if (dateTo && !bolaFolder) { args.push(dateTo); where.push(`(c.last_message_at AT TIME ZONE 'America/Sao_Paulo')::date <= $${args.length}::date`) }

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

  // Total da caixa sem o filtro de atribuição (Minhas / Não atribuídas).
  // Alimenta o contador de "Todas", que não deve mudar com a pasta selecionada.
  const allCountWhere: string[] = []
  const allCountArgs: unknown[] = []
  // Sempre limitado ao tenant da sessão (sem isso o contador somava conversas de outras empresas).
  allCountArgs.push(payload.tenantId)
  allCountWhere.push(`c.tenant_id = $${allCountArgs.length}`)
  if (labelId) {
    const ids = labelId.split(',').map((x) => x.trim()).filter(Boolean)
    if (ids.length > 0) {
      allCountArgs.push(ids)
      allCountWhere.push(`EXISTS (SELECT 1 FROM mensageria.conversation_labels cl WHERE cl.conversation_id = c.id AND cl.label_id = ANY($${allCountArgs.length}::uuid[]))`)
    }
  }
  if (search) {
    allCountArgs.push(`%${search}%`)
    allCountWhere.push(`(ct.name ILIKE $${allCountArgs.length} OR ct.phone ILIKE $${allCountArgs.length})`)
  }
  if (dateFrom) {
    allCountArgs.push(dateFrom)
    allCountWhere.push(`(c.last_message_at AT TIME ZONE 'America/Sao_Paulo')::date >= $${allCountArgs.length}::date`)
  }
  if (dateTo) {
    allCountArgs.push(dateTo)
    allCountWhere.push(`(c.last_message_at AT TIME ZONE 'America/Sao_Paulo')::date <= $${allCountArgs.length}::date`)
  }
  // Contador de "Todas": só conversas que não estão resolvidas, com a mesma visibilidade da lista.
  allCountWhere.push(`c.status <> 'resolved'`)
  const allScoped = scopeToSql(scope, allCountArgs)
  if (allScoped.clause) allCountWhere.push(allScoped.clause)
  const { rows: allRows } = await pool.query(
    `SELECT COUNT(*)::int AS total
       FROM mensageria.conversations c
       JOIN mensageria.contacts ct ON ct.id = c.contact_id
       JOIN mensageria.inboxes ib ON ib.id = c.inbox_id
      WHERE ${allCountWhere.length ? allCountWhere.join(' AND ') : 'TRUE'}`,
    allCountArgs,
  )
  const allCount = allRows[0]?.total ?? 0

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
       c.assignee_id, c.created_at, c.team_id, c.bola_com, c.bola_desde,
       sp.continuity_target_min AS sla_continuity_target_min,
       (sp.continuity_target_min IS NOT NULL AND c.bola_com = 'nos'
         AND c.bola_desde + make_interval(mins => sp.continuity_target_min) < now()) AS sla_continuity_expired,
       EXTRACT(EPOCH FROM (c.first_response_at - c.created_at)) AS first_response_duration_sec,
       ct.id AS contact_id, ct.name AS contact_name, ct.phone AS contact_phone,
       ct.avatar_url AS contact_avatar_url, ct.lead_uuid,
       ib.channel_type, ib.name AS inbox_name,
       u.nome AS assignee_name,
       tm.name AS team_name,
       (SELECT m.content FROM mensageria.messages m
          WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_preview,
       (SELECT COALESCE(json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color) ORDER BY l.name), '[]'::json)
          FROM mensageria.conversation_labels cl JOIN mensageria.labels l ON l.id = cl.label_id
         WHERE cl.conversation_id = c.id) AS labels
     FROM mensageria.conversations c
     JOIN mensageria.contacts ct ON ct.id = c.contact_id
     JOIN mensageria.inboxes ib ON ib.id = c.inbox_id
     LEFT JOIN public.users u ON u.id = c.assignee_id
     LEFT JOIN mensageria.teams tm ON tm.id = c.team_id
     LEFT JOIN mensageria.conversation_sla csl ON csl.conversation_id = c.id
     LEFT JOIN mensageria.sla_policies sp ON sp.id = csl.policy_id
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
      labels: r.labels ?? [],
      handledByBot: r.handled_by_bot,
      channelType: r.channel_type,
      inboxName: r.inbox_name,
      teamId: r.team_id,
      teamName: r.team_name,
      firstResponseDurationSec: r.first_response_duration_sec != null ? Math.round(Number(r.first_response_duration_sec)) : null,
      // Bola: 'nos' = aguardando nossa resposta; 'cliente' = aguardando o contato; null = resolvida.
      bolaCom: r.bola_com ?? null,
      bolaDesde: r.bola_desde ?? null,
      slaContinuityTargetMin: r.sla_continuity_target_min ?? null,
      slaContinuityExpired: r.sla_continuity_expired === true,
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
    allCount,
    pendingCount,
    waitingClientCount,
    resolvedCount,
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
  if (!payload.is_system_role && !(await hasMensageriaModule(payload.tenantId))) return NextResponse.json({ error: 'Módulo Mensageria não contratado' }, { status: 403 })

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
