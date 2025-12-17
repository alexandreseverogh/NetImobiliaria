import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { auditLogger } from '@/lib/utils/auditLogger'
import pool from '@/lib/database/connection'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    // 🛡️ Extrair usuário logado do token
    const token = request.cookies.get('accessToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token não fornecido' },
        { status: 401 }
      )
    }

    const { verifyTokenNode } = await import('@/lib/auth/jwt-node')
    const decoded = verifyTokenNode(token)
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const loggedUserId = decoded.userId

    const userId = params.id
    const { roleId } = await request.json()

    if (!roleId) {
      return NextResponse.json(
        { error: 'ID do perfil é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o usuário existe
    const userCheck = await pool.query('SELECT id, username FROM users WHERE id = $1', [userId])
    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // 🛡️ VERIFICAÇÃO HIERÁRQUICA OBRIGATÓRIA
    const { canManageUser } = await import('@/lib/database/users')
    const hierarchyCheck = await canManageUser(loggedUserId, userId)
    
    if (!hierarchyCheck.allowed) {
      console.log('🚫 Bloqueado por hierarquia:', hierarchyCheck.reason)
      return NextResponse.json(
        { error: hierarchyCheck.reason },
        { status: 403 }
      )
    }

    console.log('✅ Verificação hierárquica passou - pode atribuir perfil')

    // Verificar se o perfil existe e se requer 2FA
    const roleCheck = await pool.query('SELECT id, name, level, requires_2fa FROM user_roles WHERE id = $1 AND is_active = true', [roleId])
    if (roleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Perfil não encontrado ou inativo' },
        { status: 404 }
      )
    }

    const role = roleCheck.rows[0]
    
    // 🛡️ Buscar nível do usuário logado
    const { getUserWithRole } = await import('@/lib/database/users')
    const loggedUser = await getUserWithRole(loggedUserId)
    const loggedLevel = loggedUser?.role_level || 0
    const targetRoleLevel = role.level || 0
    
    // Regra adicional: Não pode atribuir perfil de nível igual ou superior ao seu
    if (loggedLevel <= targetRoleLevel) {
      return NextResponse.json(
        { error: 'Você não pode atribuir perfis de nível igual ou superior ao seu' },
        { status: 403 }
      )
    }

    // Remover perfil atual do usuário (se houver)
    await pool.query('DELETE FROM user_role_assignments WHERE user_id = $1::uuid', [userId])

    // Atribuir novo perfil
    await pool.query(
      'INSERT INTO user_role_assignments (user_id, role_id, assigned_by) VALUES ($1::uuid, $2, $3::uuid)',
      [userId, roleId, decoded.userId]
    )

    // Se o perfil requer 2FA, habilitar automaticamente
    if (role.requires_2fa) {
      await pool.query(
        'UPDATE users SET two_fa_enabled = true WHERE id = $1',
        [userId]
      )
    }

    // Log de auditoria
    auditLogger.log(
      'USER_ROLE_ASSIGNED',
      `Usuário ${decoded.username} atribuiu perfil ${roleCheck.rows[0].name} ao usuário ${userCheck.rows[0].username}`,
      true,
      decoded.userId,
      decoded.username,
      request.ip || 'unknown'
    )

    return NextResponse.json({
      success: true,
      message: 'Perfil atribuído com sucesso'
    })

  } catch (error) {
    console.error('Erro ao atribuir perfil:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}






