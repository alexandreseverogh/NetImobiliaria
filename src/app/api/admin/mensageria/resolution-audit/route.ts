import { hasMensageriaModule } from '@/lib/crm/leadTimeline'
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { resolveMensageriaScope, isTenantAdminFromPayload, scopeToSql } from '@/lib/mensageria/visibilityScope'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'
import { resolveBenchmarks } from '@/lib/intelligence/benchmarkResolver'

export const dynamic = 'force-dynamic'

const AUDIT_KEYS = ['audit_fast_resolve_min', 'audit_reopen_days', 'audit_long_silence_hours'] as const

interface Thresholds {
  fastResolveMin: number
  reopenDays: number
  longSilenceHours: number
}

/**
 * GET /api/admin/mensageria/resolution-audit?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 *
 * Auditoria de conversas RESOLVIDAS (decisão do administrador: verificar se o atendente
 * "fingiu" que resolveu). Só leitura: nunca reabre nem altera conversa.
 *
 * Para cada conversa resolvida no período, calcula quatro sinais. O sistema sinaliza; quem
 * confere o conteúdo é o administrador, abrindo a conversa completa.
 *   - sem_resposta:       nenhuma mensagem nossa, pública, na conversa inteira.
 *   - resolucao_rapida:   resolvida em menos de N min após mensagem do cliente sem resposta nossa.
 *   - longo_silencio:     resolvida N h ou mais após mensagem do cliente sem resposta nossa.
 *   - reincidencia:       o mesmo contato abriu outra conversa em menos de N dias após a resolução.
 *
 * Os limiares N vêm do segmento do cliente da conversa (ou do tenant), na mesma cascata
 * cliente → tenant → segmento dos demais parâmetros. Nada fixo no código.
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!payload.is_system_role && !(await hasMensageriaModule(payload.tenantId))) {
    return NextResponse.json({ error: 'Módulo Mensageria não contratado' }, { status: 403 })
  }

  const sp = new URL(request.url).searchParams
  const dateFrom = sp.get('dateFrom')
  const dateTo = sp.get('dateTo')

  const scope = await resolveMensageriaScope(payload.tenantId, payload.userId, isTenantAdminFromPayload(payload))
  const args: any[] = [payload.tenantId]
  const scoped = scopeToSql(scope, args)
  const where: string[] = [
    'c.tenant_id = $1',
    `c.status = 'resolved'`,
    'c.resolved_at IS NOT NULL',
  ]
  if (scoped.clause) where.push(scoped.clause)
  if (dateFrom) { args.push(dateFrom); where.push(`(c.resolved_at AT TIME ZONE 'America/Sao_Paulo')::date >= $${args.length}::date`) }
  if (dateTo) { args.push(dateTo); where.push(`(c.resolved_at AT TIME ZONE 'America/Sao_Paulo')::date <= $${args.length}::date`) }

  const { rows } = await pool.query(
    `SELECT c.id, c.client_id, c.created_at, c.resolved_at, c.assignee_id, u.nome AS assignee_name,
            ct.id AS contact_id, ct.name AS contact_name, ct.phone AS contact_phone,
            ib.channel_type,
            res.resolver_id, ru.nome AS resolver_name,
            (SELECT max(m.created_at) FROM mensageria.messages m
              WHERE m.conversation_id = c.id AND m.direction = 'inbound' AND m.created_at <= c.resolved_at) AS last_in,
            (SELECT max(m.created_at) FROM mensageria.messages m
              WHERE m.conversation_id = c.id AND m.direction = 'outbound' AND m.is_private = false
                AND m.created_at <= c.resolved_at) AS last_out,
            (SELECT count(*)::int FROM mensageria.messages m
              WHERE m.conversation_id = c.id AND m.direction = 'outbound' AND m.is_private = false) AS outbound_total,
            (SELECT count(*)::int FROM mensageria.messages m
              WHERE m.conversation_id = c.id AND m.direction = 'inbound') AS inbound_total,
            (SELECT min(c2.created_at) FROM mensageria.conversations c2
              WHERE c2.tenant_id = c.tenant_id AND c2.contact_id = c.contact_id
                AND c2.id <> c.id AND c2.created_at > c.resolved_at) AS next_created
       FROM mensageria.conversations c
       JOIN mensageria.contacts ct ON ct.id = c.contact_id
       JOIN mensageria.inboxes ib ON ib.id = c.inbox_id
       LEFT JOIN public.users u ON u.id = c.assignee_id
       LEFT JOIN LATERAL (
         SELECT ce.actor_id AS resolver_id
           FROM mensageria.conversation_events ce
          WHERE ce.conversation_id = c.id AND ce.event_type = 'status_changed'
            AND ce.payload->>'status' = 'resolved'
          ORDER BY ce.created_at DESC
          LIMIT 1
       ) res ON true
       LEFT JOIN public.users ru ON ru.id = res.resolver_id
      WHERE ${where.join(' AND ')}
      ORDER BY c.resolved_at DESC
      LIMIT 500`,
    args,
  )

  // Limiares por conversa: cascata do cliente da conversa (ou do tenant). Cache por cliente.
  const thresholdCache = new Map<string, Thresholds>()
  const tenantId: string = payload.tenantId
  async function thresholdsFor(clientId: string | null): Promise<Thresholds> {
    const key = clientId ?? '__tenant__'
    const hit = thresholdCache.get(key)
    if (hit) return hit
    const seg = await resolveSegment(tenantId, clientId)
    const map = await resolveBenchmarks([...AUDIT_KEYS], tenantId, seg?.id ?? null, clientId)
    const t: Thresholds = {
      fastResolveMin: map.audit_fast_resolve_min,
      reopenDays: map.audit_reopen_days,
      longSilenceHours: map.audit_long_silence_hours,
    }
    thresholdCache.set(key, t)
    return t
  }

  const items = []
  for (const r of rows) {
    const t = await thresholdsFor(r.client_id ?? null)
    const resolvedAt = new Date(r.resolved_at).getTime()
    const lastIn = r.last_in ? new Date(r.last_in).getTime() : null
    const lastOut = r.last_out ? new Date(r.last_out).getTime() : null
    // Bola estava com a gente no momento da resolução: o cliente falou por último e não tivemos resposta.
    const bolaNosNaResolucao = lastIn !== null && (lastOut === null || lastOut < lastIn)
    const minutosDesdeCliente = bolaNosNaResolucao ? (resolvedAt - lastIn!) / 60000 : null
    const horasDesdeCliente = minutosDesdeCliente !== null ? minutosDesdeCliente / 60 : null

    const flags = {
      semResposta: Number(r.outbound_total) === 0,
      resolucaoRapida: minutosDesdeCliente !== null && minutosDesdeCliente < t.fastResolveMin,
      longoSilencio: horasDesdeCliente !== null && horasDesdeCliente >= t.longSilenceHours,
      reincidencia: r.next_created
        ? (new Date(r.next_created).getTime() - resolvedAt) / 86400000 < t.reopenDays
        : false,
    }
    const score = Object.values(flags).filter(Boolean).length

    items.push({
      id: r.id,
      contactName: r.contact_name,
      contactPhone: r.contact_phone,
      channelType: r.channel_type,
      assigneeName: r.assignee_name,
      resolverId: r.resolver_id,
      resolverName: r.resolver_name,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
      inboundTotal: Number(r.inbound_total),
      outboundTotal: Number(r.outbound_total),
      minutosDesdeCliente: minutosDesdeCliente !== null ? Math.round(minutosDesdeCliente) : null,
      thresholds: t,
      flags,
      score,
    })
  }

  // Mais suspeitas primeiro; empate: resolvidas mais recentemente.
  items.sort((a, b) => b.score - a.score || new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime())

  return NextResponse.json({ items, total: items.length, suspeitas: items.filter((i) => i.score > 0).length })
}
