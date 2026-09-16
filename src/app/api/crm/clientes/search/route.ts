import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

/**
 * BUSCA/LISTAGEM DE CLIENTES DO TENANT (CRM)
 * Sem `q`: lista todos os clientes do tenant, ordem alfabética (dropdown populado).
 * Com `q` (mínimo 3 caracteres): filtra por nome/email/telefone/cpf, mesma ordenação.
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

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const isMaster = currentUser.is_system_role === true

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()

    if (q.length > 0 && q.length < 3) {
      return NextResponse.json({ success: true, clientes: [] })
    }

    const params: any[] = []
    let where = 'WHERE 1=1'
    if (!isMaster) { params.push(currentUser.tenantId); where += ` AND tenant_id = $${params.length}` }
    if (q.length >= 3) { params.push(`%${q}%`); where += ` AND (nome ILIKE $${params.length} OR email ILIKE $${params.length} OR telefone ILIKE $${params.length} OR cpf ILIKE $${params.length})` }

    const query = `
      SELECT uuid, nome, email, telefone, cpf
      FROM clientes
      ${where}
      ORDER BY nome ASC
      LIMIT ${q.length >= 3 ? 20 : 500}
    `
    const { rows } = await pool.query(query, params)

    return NextResponse.json({ success: true, clientes: rows })

  } catch (error: any) {
    console.error('[CRM_CLIENTES_SEARCH]', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar clientes.' }, { status: 500 })
  }
}
