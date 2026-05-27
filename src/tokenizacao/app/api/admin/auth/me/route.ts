/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { findUserById, getUserPermissions } from '@/lib/database/users'
import pool from '@/lib/database/connection'

// Forçar uso do Node.js runtime
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('accessToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    // Verificar token
    const decoded = verifyTokenNode(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token de autenticação inválido ou expirado' },
        { status: 401 }
      )
    }

    // Buscar dados do usuário com perfil
    const userQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.password,
        u.nome,
        u.telefone,
        u.ativo,
        u.ultimo_login,
        u.created_at,
        u.updated_at,
        ur.name as role_name,
        ur.description as role_description,
        ur.level as role_level,
        ur.is_system_role
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.id = $1
      ORDER BY ur.level DESC
      LIMIT 1
    `
    
    const userResult = await pool.query(userQuery, [decoded.userId])
    const user = userResult.rows[0]
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Buscar permissões reais
    const permissoes = await getUserPermissions(user.id)
    
    // Se for Perfil de Sistema (Master), dar todas as permissões
    const isSystemRole = user.is_system_role === true
    
    if (isSystemRole) {
      Object.keys(permissoes).forEach(key => {
        (permissoes as any)[key] = 'ADMIN'
      })
    }

    console.log('🛡️ API /auth/me: Permissões finais:', JSON.stringify(permissoes, null, 2))

    const userResponse = {
      id: user.id,
      username: user.username,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
      role_name: user.role_name,
      role_description: user.role_description,
      role_level: user.role_level || 0,
      is_system_role: isSystemRole,
      permissoes,
      status: user.ativo ? 'ATIVO' : 'INATIVO'
    }
    
    return NextResponse.json({
      success: true,
      user: userResponse
    })

  } catch (error) {
    console.error('Erro ao verificar usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
