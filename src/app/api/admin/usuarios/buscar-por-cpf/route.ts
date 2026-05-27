import { NextRequest, NextResponse } from 'next/server'
import { findUserByCpf } from '@/lib/database/users'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import pool from '@/lib/database/connection'
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt'

export async function GET(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const { searchParams } = new URL(request.url)
    const cpf = searchParams.get('cpf')

    if (!cpf) {
      return NextResponse.json(
        { error: 'CPF é obrigatório' },
        { status: 400 }
      )
    }

    const user = await findUserByCpf(cpf)

    if (!user) {
      return NextResponse.json(
        { found: false },
        { status: 404 }
      )
    }

    // Verificar se o usuário já pertence à unidade atual (ou tem perfil master global)
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    const isMasterAdmin = decoded?.is_system_role === true
    const tenantId = !isMasterAdmin ? decoded?.tenantId : undefined

    let alreadyInTenant = false
    if (tenantId) {
      const membership = await pool.query(
        'SELECT 1 FROM user_tenant_membership WHERE user_id = $1 AND tenant_id = $2',
        [user.id, tenantId]
      )
      alreadyInTenant = membership.rows.length > 0
    } else if (isMasterAdmin) {
      const roleAssignment = await pool.query(
        'SELECT 1 FROM user_role_assignments WHERE user_id = $1',
        [user.id]
      )
      alreadyInTenant = roleAssignment.rows.length > 0
    }

    // Retornar APENAS os dados públicos/básicos para auto-preenchimento
    return NextResponse.json({
      found: true,
      alreadyInTenant,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        username: user.username,
        telefone: user.telefone
      }
    })

  } catch (error) {
    console.error('Erro ao buscar usuário por CPF:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
