import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { resolveMensageriaScope, isTenantAdminFromPayload, scopeToSql } from '@/lib/mensageria/visibilityScope'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mensageria/analytics
 * Dashboards de tendência/histórico (PLANO_MENSAGERIA.md seção 9) — complementar ao Painel
 * do Gestor (seção 17, que é a fila operacional AO VIVO). Aqui a unidade é agregado por
 * período, não conversa a conversa.
 *
 * Query params: dateFrom/dateTo (YYYY-MM-DD, default últimos 30 dias) · teamId · assigneeId
 *               · channelType · clientId
 *
 * Sempre passa por resolveMensageriaScope() (seção 16.5) — atendente vê só o próprio
 * recorte, líder vê o(s) time(s), admin vê tudo. Mesmo resolver do Painel do Gestor.
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
  const sp = new URL(request.url).searchParams
  const teamId = sp.get('teamId')
  const assigneeId = sp.get('assigneeId')
  const channelType = sp.get('channelType')
  const clientId = sp.get('clientId')

  // Default = dia do sistema (hoje/hoje), não os últimos 30 dias — a tela só amplia o
  // período quando o usuário explicitamente preenche os filtros de data.
  const defaultToday = new Date().toISOString().slice(0, 10)
  const dateFrom = sp.get('dateFrom') || defaultToday
  const dateTo = sp.get('dateTo') || defaultToday

  // Período anterior de mesmo tamanho, para o delta de volume (seção 9 — "nunca número nu")
  const fromDate = new Date(`${dateFrom}T00:00:00Z`)
  const toDate = new Date(`${dateTo}T00:00:00Z`)
  const periodDays = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1)
  const prevTo = new Date(fromDate.getTime() - 86400000).toISOString().slice(0, 10)
  const prevFrom = new Date(fromDate.getTime() - periodDays * 86400000).toISOString().slice(0, 10)

  const where: string[] = ['c.tenant_id = $1']
  const args: any[] = [payload.tenantId]

  const scope = await resolveMensageriaScope(payload.tenantId, payload.userId, isTenantAdminFromPayload(payload))
  const scoped = scopeToSql(scope, args)
  if (scoped.clause) where.push(scoped.clause)

  if (teamId) { args.push(teamId); where.push(`c.team_id = $${args.length}`) }
  if (assigneeId) { args.push(assigneeId); where.push(`c.assignee_id = $${args.length}`) }
  if (channelType) { args.push(channelType); where.push(`ib.channel_type = $${args.length}`) }
  if (clientId) { args.push(clientId); where.push(`c.client_id = $${args.length}`) }

  const baseWhereSql = where.join(' AND ')
  const baseFrom = `FROM mensageria.conversations c
     JOIN mensageria.contacts ct ON ct.id = c.contact_id
     JOIN mensageria.inboxes ib ON ib.id = c.inbox_id
     LEFT JOIN public.users u ON u.id = c.assignee_id
     LEFT JOIN mensageria.teams tm ON tm.id = c.team_id
     LEFT JOIN mensageria.conversation_sla cs ON cs.conversation_id = c.id`

  // Cada query recebe seu PRÓPRIO array de parâmetros (nunca compartilha `args` global) —
  // Postgres exige que todo $N passado no array seja referenciado no texto DAQUELA query
  // específica; um parâmetro "sobrando" sem aparecer no SQL quebra com "could not determine
  // data type of parameter $N" mesmo que os índices batam matematicamente.
  const withPeriod = (from: string, to: string) => {
    const a = [...args, from, to]
    const fromIdx = a.length - 1
    const toIdx = a.length
    const clause = `c.created_at >= $${fromIdx}::date AND c.created_at < ($${toIdx}::date + interval '1 day')`
    return { args: a, clause }
  }

  const period = withPeriod(dateFrom, dateTo)
  const prevPeriod = withPeriod(prevFrom, prevTo)

  // Mesma proteção de "cada query com seu próprio array" (acima), mas filtrando pela data da
  // MENSAGEM (m.created_at), não da conversa — o pico de horário é sobre quando as pessoas
  // mandam mensagem, não quando a conversa nasceu.
  const messagesArgs = [...args, dateFrom, dateTo]
  const messagesFromIdx = messagesArgs.length - 1
  const messagesToIdx = messagesArgs.length
  const messagesPeriodClause = `m.created_at >= $${messagesFromIdx}::date AND m.created_at < ($${messagesToIdx}::date + interval '1 day')`

  const [kpiRows, prevKpiRows, canalRows, tendenciaRows, heatmapRows, rankingRows, leaderboardRows, hourlyRows] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE ${period.clause})::int AS novas,
         COUNT(*) FILTER (WHERE c.resolved_at >= $${args.length + 1}::date AND c.resolved_at < ($${args.length + 2}::date + interval '1 day'))::int AS resolvidas,
         COUNT(*) FILTER (WHERE c.status IN ('open','pending'))::int AS abertas,
         COUNT(*) FILTER (WHERE c.status IN ('open','pending') AND c.assignee_id IS NULL)::int AS backlog_nao_atribuido,
         COUNT(*) FILTER (WHERE cs.first_response_breached OR cs.resolution_breached)::int AS sla_estourado,
         COUNT(*) FILTER (WHERE c.resolved_at IS NOT NULL AND ${period.clause})::int AS resolvidas_no_periodo_para_bot,
         COUNT(*) FILTER (WHERE c.resolved_at IS NOT NULL AND c.handled_by_bot AND ${period.clause})::int AS resolvidas_bot,
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.first_response_at - c.created_at)))
           FILTER (WHERE c.first_response_at IS NOT NULL AND ${period.clause}) AS mediana_primeira_resposta_seg,
         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)))
           FILTER (WHERE c.resolved_at IS NOT NULL AND ${period.clause}) AS mediana_resolucao_seg
       ${baseFrom} WHERE ${baseWhereSql}`,
      period.args,
    ),
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE ${prevPeriod.clause})::int AS novas
       ${baseFrom} WHERE ${baseWhereSql}`,
      prevPeriod.args,
    ),
    pool.query(
      `SELECT ib.channel_type, COUNT(*)::int AS n
       ${baseFrom} WHERE ${baseWhereSql} AND ${period.clause}
       GROUP BY ib.channel_type`,
      period.args,
    ),
    pool.query(
      `SELECT
         to_char(date_trunc('day', c.created_at), 'YYYY-MM-DD') AS dia,
         COUNT(*)::int AS novas,
         COUNT(*) FILTER (WHERE c.resolved_at IS NOT NULL AND date_trunc('day', c.resolved_at) = date_trunc('day', c.created_at))::int AS resolvidas_mesmo_dia
       ${baseFrom} WHERE ${baseWhereSql} AND ${period.clause}
       GROUP BY 1 ORDER BY 1`,
      period.args,
    ),
    pool.query(
      `SELECT
         EXTRACT(DOW FROM c.created_at AT TIME ZONE 'America/Sao_Paulo')::int AS dow,
         EXTRACT(HOUR FROM c.created_at AT TIME ZONE 'America/Sao_Paulo')::int AS hour,
         COUNT(*)::int AS n
       ${baseFrom} WHERE ${baseWhereSql} AND ${period.clause}
       GROUP BY 1, 2`,
      period.args,
    ),
    pool.query(
      `SELECT u.id, u.nome,
         COUNT(*)::int AS volume,
         AVG(EXTRACT(EPOCH FROM (c.first_response_at - c.created_at))) FILTER (WHERE c.first_response_at IS NOT NULL) AS tempo_medio_seg
       ${baseFrom} WHERE ${baseWhereSql} AND ${period.clause} AND c.assignee_id IS NOT NULL
       GROUP BY u.id, u.nome ORDER BY volume DESC LIMIT 20`,
      period.args,
    ),
    pool.query(
      `SELECT tm.id, tm.name,
         COUNT(*)::int AS volume,
         AVG(EXTRACT(EPOCH FROM (c.first_response_at - c.created_at))) FILTER (WHERE c.first_response_at IS NOT NULL) AS tempo_medio_seg
       ${baseFrom} WHERE ${baseWhereSql} AND ${period.clause} AND c.team_id IS NOT NULL
       GROUP BY tm.id, tm.name ORDER BY volume DESC LIMIT 20`,
      period.args,
    ),
    // Mensagens de demanda por faixa horária, somando todos os dias do período — pico de
    // horário pra dimensionar capacidade de resposta do bot/atendentes humanos. Conta:
    // (a) qualquer mensagem inbound (WhatsApp/formulário/chatbot — o cliente digitou algo)
    // (b) só a 1ª mensagem de cada conversa MANUAL — nesse canal a mensagem é sempre
    //     outbound (o atendente registrando o contato), então ELA é o evento de demanda;
    //     mensagens seguintes na mesma conversa (notas do atendente) não contam de novo,
    //     senão o atendente atualizando uma conversa várias vezes infla o pico artificialmente.
    pool.query(
      `WITH first_manual_message AS (
         SELECT DISTINCT ON (m2.conversation_id) m2.id
           FROM mensageria.messages m2
           JOIN mensageria.conversations c2 ON c2.id = m2.conversation_id
           JOIN mensageria.inboxes ib2 ON ib2.id = c2.inbox_id
          WHERE ib2.channel_type = 'manual'
          ORDER BY m2.conversation_id, m2.created_at ASC
       )
       SELECT EXTRACT(HOUR FROM m.created_at AT TIME ZONE 'America/Sao_Paulo')::int AS hr, COUNT(*)::int AS n
         FROM mensageria.messages m
         JOIN mensageria.conversations c ON c.id = m.conversation_id
         JOIN mensageria.contacts ct ON ct.id = c.contact_id
         JOIN mensageria.inboxes ib ON ib.id = c.inbox_id
        WHERE ${baseWhereSql} AND ${messagesPeriodClause}
          AND (m.direction = 'inbound' OR m.id IN (SELECT id FROM first_manual_message))
        GROUP BY 1`,
      messagesArgs,
    ),
  ])

  const k = kpiRows.rows[0] || {}
  const prevNovas = prevKpiRows.rows[0]?.novas ?? 0
  const novas = k.novas ?? 0
  const deltaNovasPct = prevNovas > 0 ? Math.round(((novas - prevNovas) / prevNovas) * 1000) / 10 : null

  const canalTotal = canalRows.rows.reduce((s, r) => s + r.n, 0)

  const mensagensPorHora = Array.from({ length: 24 }, (_, hr) => ({
    hr,
    label: `${String(hr).padStart(2, '0')}:00h – ${String(hr).padStart(2, '0')}:59h`,
    n: hourlyRows.rows.find((r) => Number(r.hr) === hr)?.n ?? 0,
  }))

  return NextResponse.json({
    period: { dateFrom, dateTo, prevFrom, prevTo },
    kpis: {
      novas,
      resolvidas: k.resolvidas ?? 0,
      abertas: k.abertas ?? 0,
      deltaNovasPct,
      backlogNaoAtribuido: k.backlog_nao_atribuido ?? 0,
      slaEstourado: k.sla_estourado ?? 0,
      medianaPrimeiraRespostaSeg: k.mediana_primeira_resposta_seg != null ? Math.round(Number(k.mediana_primeira_resposta_seg)) : null,
      medianaResolucaoSeg: k.mediana_resolucao_seg != null ? Math.round(Number(k.mediana_resolucao_seg)) : null,
      taxaResolucaoBotPct: k.resolvidas_no_periodo_para_bot > 0
        ? Math.round((k.resolvidas_bot / k.resolvidas_no_periodo_para_bot) * 1000) / 10
        : 0,
    },
    porCanal: canalRows.rows.map((r) => ({
      channelType: r.channel_type,
      count: r.n,
      pct: canalTotal > 0 ? Math.round((r.n / canalTotal) * 1000) / 10 : 0,
    })),
    tendenciaDiaria: tendenciaRows.rows.map((r) => ({ date: r.dia, novas: r.novas, resolvidas: r.resolvidas_mesmo_dia })),
    heatmap: heatmapRows.rows.map((r) => ({ dow: r.dow, hour: r.hour, n: r.n })),
    mensagensPorHora,
    rankingAtendentes: rankingRows.rows.map((r) => ({
      userId: r.id, name: r.nome, volume: r.volume,
      tempoMedioSeg: r.tempo_medio_seg != null ? Math.round(Number(r.tempo_medio_seg)) : null,
    })),
    leaderboardTimes: leaderboardRows.rows.map((r) => ({
      teamId: r.id, name: r.name, volume: r.volume,
      tempoMedioSeg: r.tempo_medio_seg != null ? Math.round(Number(r.tempo_medio_seg)) : null,
    })),
    funil: {
      total: novas,
      humano: novas - (k.resolvidas_bot ?? 0), // handled_by_bot ainda não existe operacionalmente (M4) — hoje = novas
      resolvidas: k.resolvidas ?? 0,
    },
  })
  } catch (err: any) {
    console.error('[mensageria/analytics] erro:', err)
    return NextResponse.json({ error: 'Erro ao calcular analytics' }, { status: 500 })
  }
}
