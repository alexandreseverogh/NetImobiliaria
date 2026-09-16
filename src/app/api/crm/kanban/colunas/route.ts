import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

/**
 * CRM KANBAN COLUMNS CRUD API
 * Permite flexibilidade total na gestão do funil de vendas.
 */

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

// LISTAR COLUNAS (ORDENADAS) — escopadas por tenant
export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const isMaster = currentUser.is_system_role === true

    const { rows } = isMaster
      ? await pool.query(`SELECT * FROM kanban_colunas WHERE ativa = true ORDER BY ordem ASC`)
      : await pool.query(
          `SELECT * FROM kanban_colunas WHERE ativa = true AND tenant_id = $1 ORDER BY ordem ASC`,
          [currentUser.tenantId],
        )
    return NextResponse.json({ success: true, colunas: rows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// CRIAR/ATUALIZAR COLUNA — escopadas por tenant
export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser?.tenantId && !currentUser?.is_system_role) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const isMaster = currentUser.is_system_role === true

    const body = await request.json()
    const { id, nome, titulo_exibicao, ordem, cor, icone, descricao, sla_hours } = body
    // is_ganho/is_perda: significado de ciclo de vida (Ganho/Perda) explícito e independente
    // do `nome` (livre pro tenant renomear) — ver migration-2026-08-07-kanban-etapa-ganho-perda.sql.
    const isGanho = body.is_ganho === true
    const isPerda = body.is_perda === true
    if (isGanho && isPerda) {
      return NextResponse.json({ error: 'Uma etapa não pode ser Ganho e Perda ao mesmo tempo.' }, { status: 400 })
    }
    // Exigir valor estimado numa etapa que já é Ganho é redundante — o Ganho já pede o valor
    // REAL de fechamento (via kanban/move). Numa etapa de Perda também não faz sentido — o
    // negócio morreu, não há mais pipeline aberto pra estimar. A UI já desabilita as duas
    // combinações, servidor reforça normalizando pra false em vez de confiar só no cliente.
    const requerValorEstimado = body.requer_valor_estimado === true && !isGanho && !isPerda

    if (id) {
      // UPDATE — nunca em coluna de outro tenant
      const query = `
        UPDATE kanban_colunas
        SET
          nome = $1,
          titulo_exibicao = $2,
          ordem = $3,
          cor = $4,
          icone = $5,
          descricao = $6,
          sla_hours = $7,
          is_ganho = $8,
          is_perda = $9,
          requer_valor_estimado = $10,
          updated_at = NOW()
        WHERE id = $11 ${!isMaster ? 'AND tenant_id = $12' : ''}
        RETURNING *
      `
      const params = !isMaster
        ? [nome, titulo_exibicao, ordem, cor, icone, descricao, sla_hours || 24, isGanho, isPerda, requerValorEstimado, id, currentUser.tenantId]
        : [nome, titulo_exibicao, ordem, cor, icone, descricao, sla_hours || 24, isGanho, isPerda, requerValorEstimado, id]
      const { rows } = await pool.query(query, params)
      if (rows.length === 0) return NextResponse.json({ error: 'Coluna não encontrada ou sem permissão.' }, { status: 404 })
      return NextResponse.json({ success: true, coluna: rows[0] })
    } else {
      // INSERT — sempre com o tenant de quem está criando
      const query = `
        INSERT INTO kanban_colunas (nome, titulo_exibicao, ordem, cor, icone, descricao, sla_hours, tenant_id, is_ganho, is_perda, requer_valor_estimado)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `
      const { rows } = await pool.query(query, [nome, titulo_exibicao, ordem, cor, icone, descricao, sla_hours || 24, currentUser.tenantId, isGanho, isPerda, requerValorEstimado])
      return NextResponse.json({ success: true, coluna: rows[0] })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// REMOVER/DESATIVAR COLUNA — escopadas por tenant
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser?.tenantId && !currentUser?.is_system_role) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const isMaster = currentUser.is_system_role === true

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 })

    const colCheck = await pool.query(
      `SELECT id FROM kanban_colunas WHERE id = $1 ${!isMaster ? 'AND tenant_id = $2' : ''}`,
      !isMaster ? [id, currentUser.tenantId] : [id],
    )
    if (colCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Coluna não encontrada ou sem permissão.' }, { status: 404 })
    }

    // Verificação de segurança: Não excluir se houver leads na coluna
    const checkLeads = await pool.query('SELECT count(*) FROM leads_kanban WHERE coluna_id = $1', [id])
    if (parseInt(checkLeads.rows[0].count) > 0) {
      return NextResponse.json({ error: 'Existem leads nesta coluna. Realoque-os antes de excluir.' }, { status: 400 })
    }

    await pool.query('DELETE FROM kanban_colunas WHERE id = $1', [id])
    return NextResponse.json({ success: true, message: 'Coluna removida com sucesso.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
