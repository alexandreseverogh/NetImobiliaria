import { NextRequest, NextResponse } from 'next/server'
import { requireApiPermission } from '@/lib/auth/apiPermissions'
import pool from '@/lib/database/connection';

// PATCH - Toggle 2FA requirement for role
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const denied = await requireApiPermission(request as unknown as NextRequest, 'roles', 'UPDATE')
    if (denied) return denied
    const roleId = parseInt(params.id)
    const data = await request.json()
    const { two_fa_required } = data

    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, message: 'ID inválido' },
        { status: 400 }
      )
    }

    if (typeof two_fa_required !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Valor de 2FA deve ser booleano' },
        { status: 400 }
      )
    }

    // Verificar se role existe
    const existingRole = await pool.query(
      'SELECT id, name, requires_2fa, is_system_role FROM user_roles WHERE id = $1',
      [roleId]
    )

    if (existingRole.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    const currentRole = existingRole.rows[0]

    // Proteção: Perfis de Sistema (Master) devem manter 2FA obrigatório
    if (currentRole.is_system_role && !two_fa_required) {
      return NextResponse.json(
        { success: false, message: 'Perfis Master de plataforma exigem 2FA obrigatório por segurança' },
        { status: 400 }
      )
    }

    // Atualizar 2FA requirement
    const updateQuery = `
      UPDATE user_roles 
      SET requires_2fa = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `

    const result = await pool.query(updateQuery, [two_fa_required, roleId])

    // Log da alteração
    console.log(`🔐 2FA requirement ${two_fa_required ? 'habilitado' : 'desabilitado'} para perfil: ${currentRole.name}`)

    return NextResponse.json({
      success: true,
      message: `2FA ${two_fa_required ? 'habilitado' : 'desabilitado'} com sucesso`,
      role: result.rows[0]
    })
  } catch (error) {
    console.error('Erro ao alterar 2FA:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


