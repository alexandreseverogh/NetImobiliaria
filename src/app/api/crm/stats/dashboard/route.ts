import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

function getCurrentUser(request: NextRequest): { userId: string, tenantId?: string, is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return null

    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      is_system_role: decoded.is_system_role === true
    }
  } catch (error) {
    return null
  }
}

/**
 * DASHBOARD STATS API
 * Alimenta o funil real de CRM (KanbanFunnelWidget em /crm) com a contagem por coluna
 * do Kanban. Só isso — o array `stats` antigo (Total Leads/CPLQ/Prontidão/"Taxa de Match
 * IPVE") era resíduo pré-"Caminho 1" (docs/CHECKPOINT.md, 2026-08-13): nunca lido pelo
 * consumidor real (só `leads_por_status` é usado), "CPLQ" era um "R$ 0,00" fixo, e "Taxa
 * de Match IPVE" era `Math.random() * 20 + 70` — um número sem nenhum dado real por trás,
 * com um "+4%" de variação também fixo. Removido por completo, não só desligado da UI.
 */

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!currentUser.tenantId) {
      return NextResponse.json({ error: 'Sessão sem contexto de tenant.' }, { status: 400 })
    }

    // Achado real (2026-09-29): Master tinha um bypass total do filtro de tenant aqui
    // (`!isMaster ? 'AND ... tenant_id = $1' : ''`) — em vez de operar no CONTEXTO do tenant
    // atualmente selecionado (como o resto da plataforma), o funil somava colunas/leads de
    // TODOS os tenants misturados. Master sempre tem `tenantId` real no JWT (próprio tenant
    // "Master Platform" por padrão, ou o tenant escolhido via /select-tenant) — usar esse
    // valor sempre, sem bypass, é estritamente mais correto: Master vê o funil do tenant que
    // de fato está no contexto da sessão, igual qualquer outro usuário.
    const params = [currentUser.tenantId]

    // Contagem por coluna do Kanban, só colunas ativas, na ordem real do funil.
    const statusQuery = `
      SELECT k.id, k.nome, k.titulo_exibicao, k.cor, k.ordem, count(lk.id)::int as total
      FROM kanban_colunas k
      LEFT JOIN leads_kanban lk ON k.id = lk.coluna_id AND lk.tenant_id = $1
      WHERE k.ativa = true AND k.tenant_id = $1
      GROUP BY k.id, k.nome, k.titulo_exibicao, k.cor, k.ordem
      ORDER BY k.ordem ASC
    `

    const statusRes = await pool.query(statusQuery, params)

    return NextResponse.json({
      success: true,
      leads_por_status: statusRes.rows
    })

  } catch (error: any) {
    console.error('ERRO API DASHBOARD:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
