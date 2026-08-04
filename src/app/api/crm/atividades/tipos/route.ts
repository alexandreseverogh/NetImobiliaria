import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

/**
 * CATÁLOGO DE TIPOS DE ATIVIDADE (CRM)
 * Por tenant (client_id NULL) ou por cliente específico do tenant.
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

// LISTAR TIPOS — escopados por tenant; ?client_id=X inclui também os específicos daquele cliente
export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const isMaster = currentUser.is_system_role === true

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')

    const tenantId = isMaster ? (searchParams.get('tenant_id') || currentUser.tenantId) : currentUser.tenantId
    if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })

    const { rows } = clientId
      ? await pool.query(
          `SELECT * FROM tipos_atividade
            WHERE tenant_id = $1 AND ativo = true AND (client_id IS NULL OR client_id = $2)
            ORDER BY client_id NULLS FIRST, ordem ASC`,
          [tenantId, clientId],
        )
      : await pool.query(
          `SELECT * FROM tipos_atividade WHERE tenant_id = $1 AND ativo = true AND client_id IS NULL ORDER BY ordem ASC`,
          [tenantId],
        )

    return NextResponse.json({ success: true, tipos: rows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// CRIAR/ATUALIZAR TIPO
export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser?.tenantId && !currentUser?.is_system_role) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const isMaster = currentUser.is_system_role === true

    const body = await request.json()
    const { id, nome, icone, cor, ordem, client_id } = body
    if (!nome || !nome.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const tenantId = isMaster ? (body.tenant_id || currentUser.tenantId) : currentUser.tenantId
    if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })

    if (id) {
      const query = `
        UPDATE tipos_atividade
        SET nome = $1, icone = $2, cor = $3, ordem = $4, client_id = $5, updated_at = NOW()
        WHERE id = $6 AND tenant_id = $7
        RETURNING *
      `
      const { rows } = await pool.query(query, [nome.trim(), icone || null, cor || '#3B82F6', ordem ?? 0, client_id || null, id, tenantId])
      if (rows.length === 0) return NextResponse.json({ error: 'Atividade não encontrada ou sem permissão.' }, { status: 404 })
      return NextResponse.json({ success: true, tipo: rows[0] })
    } else {
      const query = `
        INSERT INTO tipos_atividade (tenant_id, client_id, nome, icone, cor, ordem)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `
      try {
        const { rows } = await pool.query(query, [tenantId, client_id || null, nome.trim(), icone || null, cor || '#3B82F6', ordem ?? 0])
        return NextResponse.json({ success: true, tipo: rows[0] })
      } catch (e: any) {
        if (e.code === '23505') {
          return NextResponse.json({ error: 'Já existe uma atividade com esse nome nesse escopo.' }, { status: 409 })
        }
        throw e
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DESATIVAR TIPO (soft — mesmo padrão de is_active usado no resto da plataforma)
// Bloqueado se algum lead ainda tiver uma atividade ativa registrada com esse tipo —
// evita esconder do catálogo um tipo que ainda está em uso real.
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

    const tenantId = isMaster ? (searchParams.get('tenant_id') || currentUser.tenantId) : currentUser.tenantId

    const usageRes = await pool.query(
      `SELECT count(*)::int AS n FROM atividades_lead WHERE tipo_atividade_id = $1 AND deleted_at IS NULL`,
      [id],
    )
    const usageCount = usageRes.rows[0]?.n || 0
    if (usageCount > 0) {
      return NextResponse.json(
        { error: `Esta atividade está registrada em ${usageCount} lead(s) — não pode ser excluída enquanto houver leads associados a ela.` },
        { status: 409 },
      )
    }

    const { rows } = await pool.query(
      `UPDATE tipos_atividade SET ativo = false, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [id, tenantId],
    )
    if (rows.length === 0) return NextResponse.json({ error: 'Atividade não encontrada ou sem permissão.' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
