import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { auditLogger } from '@/lib/utils/auditLogger'
import pool from '@/lib/database/connection'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de acesso não fornecido' },
        { status: 401 }
      )
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

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

    // Verificar se o perfil existe
    const roleCheck = await pool.query('SELECT id, name FROM user_roles WHERE id = $1 AND is_active = true', [roleId])
    if (roleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Perfil não encontrado ou inativo' },
        { status: 404 }
      )
    }

    // Remover perfil atual do usuário (se houver)
    await pool.query('DELETE FROM user_role_assignments WHERE user_id = $1', [userId])

    // Atribuir novo perfil
    await pool.query(
      'INSERT INTO user_role_assignments (user_id, role_id, assigned_by) VALUES ($1, $2, $3)',
      [userId, roleId, decoded.userId]
    )

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






