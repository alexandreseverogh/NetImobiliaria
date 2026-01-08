/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { findUserById } from '@/lib/database/users'
import pool from '@/lib/database/connection'

// ForÃ§ar uso do Node.js runtime
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('accessToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticaÃ§Ã£o nÃ£o fornecido' },
        { status: 401 }
      )
    }

    // Verificar token
    const decoded = verifyTokenNode(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token de autenticaÃ§Ã£o invÃ¡lido ou expirado' },
        { status: 401 }
      )
    }

    // Buscar dados do usuÃ¡rio com perfil
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
        ur.description as role_description
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.id = $1
    `
    
    const userResult = await pool.query(userQuery, [decoded.userId])
    const user = userResult.rows[0]
    
    if (!user) {
      return NextResponse.json(
        { error: 'UsuÃ¡rio nÃ£o encontrado' },
        { status: 404 }
      )
    }

    // Para Super Admin, dar todas as permissÃµes sem depender de tabelas de permissÃµes
    const permissoes: Record<string, string> = {}
    
    // Se for Super Admin, dar todas as permissÃµes
    if (user.role_name === 'Super Admin') {
      permissoes['imoveis'] = 'ADMIN'
      permissoes['usuarios'] = 'ADMIN'
      permissoes['amenidades'] = 'ADMIN'
      permissoes['proximidades'] = 'ADMIN'
      permissoes['categorias-amenidades'] = 'ADMIN'
      permissoes['categorias-proximidades'] = 'ADMIN'
      permissoes['tipos-imoveis'] = 'ADMIN'
      permissoes['tipos-documentos'] = 'ADMIN'
      permissoes['status'] = 'ADMIN'
      permissoes['finalidades'] = 'ADMIN'
      permissoes['status-imovel'] = 'ADMIN'
      permissoes['clientes'] = 'ADMIN'
      permissoes['proprietarios'] = 'ADMIN'
      permissoes['relatorios'] = 'ADMIN'
      permissoes['sistema'] = 'ADMIN'
    }

    console.log('ðŸ” API /auth/me: PermissÃµes finais:', JSON.stringify(permissoes, null, 2))
    console.log('ðŸ” API /auth/me: tipos-documentos permission:', permissoes['tipos-documentos'])
    console.log('ðŸ” API /auth/me: user role:', user.role_name)

    const userResponse = {
      id: user.id,
      username: user.username,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
      role_name: user.role_name,
      role_description: user.role_description,
      permissoes,
      status: user.ativo ? 'ATIVO' : 'INATIVO'
    }
    
    return NextResponse.json({
      success: true,
      user: userResponse
    })

  } catch (error) {
    console.error('Erro ao verificar usuÃ¡rio:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


