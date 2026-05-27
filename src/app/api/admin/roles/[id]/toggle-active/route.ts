import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { requireApiPermission } from '@/lib/auth/apiPermissions'

// PATCH - Toggle active status for role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const denied = await requireApiPermission(request, 'roles', 'UPDATE')
    if (denied) return denied

    const roleId = parseInt(params.id)
    const data = await request.json()
    const { is_active } = data

    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, message: 'ID inválido' },
        { status: 400 }
      )
    }

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Status deve ser booleano' },
        { status: 400 }
      )
    }

    // Verificar se role existe
    const existingRole = await pool.query(
      'SELECT id, name, is_active, is_system_role FROM user_roles WHERE id = $1',
      [roleId]
    )

    if (existingRole.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    const currentRole = existingRole.rows[0]

    // Proteção: Perfis de Sistema (Master) são vitais e não podem ser desativados
    if (currentRole.is_system_role && !is_active) {
      return NextResponse.json(
        { success: false, message: 'Perfis Master de plataforma são vitais e não podem ser desativados' },
        { status: 400 }
      )
    }

    // Atualizar status ativo
    const updateQuery = `
      UPDATE user_roles 
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `

    const result = await pool.query(updateQuery, [is_active, roleId])

    // Log da alteração
    console.log(`👤 Status ${is_active ? 'ativado' : 'desativado'} para perfil: ${currentRole.name}`)

    // Se desativando o perfil, notificar sobre usuários afetados
    if (!is_active) {
      const userCount = await pool.query(
        'SELECT COUNT(*) as count FROM user_role_assignments WHERE role_id = $1',
        [roleId]
      )
      
      const affectedUsers = parseInt(userCount.rows[0].count)
      if (affectedUsers > 0) {
        console.log(`⚠️ Perfil desativado: ${affectedUsers} usuário(s) afetado(s)`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Perfil ${is_active ? 'ativado' : 'desativado'} com sucesso`,
      role: result.rows[0]
    })
  } catch (error) {
    console.error('Erro ao alterar status:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


