import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import jwt from 'jsonwebtoken'

// Interface para JWT com permissões
interface JWTPayloadWithPermissions {
  userId: string
  username: string
  email: string
  role_name: string
  role_level: number
  permissoes: {
    [key: string]: string
  }
}

// GET - Buscar usuários de um perfil específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 DEBUG - API /roles/[id]/users chamada')
    
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    console.log('🔍 DEBUG - Authorization header:', authHeader ? 'Presente' : 'Ausente')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ DEBUG - Token não fornecido ou formato inválido')
      return NextResponse.json(
        { error: 'Token de acesso não fornecido' },
        { status: 401 }
      )
    }
    const token = authHeader.substring(7)

    try {
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
      const decoded = jwt.verify(token, jwtSecret) as JWTPayloadWithPermissions
      console.log('🔍 DEBUG - Token decodificado:', decoded ? 'Sucesso' : 'Falha')
      
      if (!decoded) {
        console.log('❌ DEBUG - Token inválido ou expirado')
        return NextResponse.json(
          { error: 'Token inválido ou expirado' },
          { status: 401 }
        )
      }
    } catch (jwtError) {
      const jwtMessage = jwtError instanceof Error ? jwtError.message : String(jwtError)
      console.log('❌ DEBUG - Erro ao verificar JWT:', jwtMessage)
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    // TEMPORÁRIO: Permitir acesso para todos os usuários logados
    console.log('✅ DEBUG - Acesso permitido temporariamente')

    const roleId = parseInt(params.id)

    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, message: 'ID do perfil inválido' },
        { status: 400 }
      )
    }

    // Verificar se o perfil existe
    console.log('🔍 DEBUG - Verificando perfil ID:', roleId)
    const roleExists = await pool.query(
      'SELECT id, name, description FROM user_roles WHERE id = $1',
      [roleId]
    )
    console.log('🔍 DEBUG - Resultado da consulta do perfil:', roleExists.rows)

    if (roleExists.rows.length === 0) {
      console.log('❌ DEBUG - Perfil não encontrado')
      return NextResponse.json(
        { success: false, message: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    const role = roleExists.rows[0]
    console.log('✅ DEBUG - Perfil encontrado:', role)

    // Buscar usuários deste perfil
    console.log('🔍 DEBUG - Buscando usuários do perfil...')
    const usersQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.nome,
        u.telefone,
        u.ativo,
        u.ultimo_login,
        u.created_at,
        ura.assigned_at,
        ura.assigned_by,
        assigned_by_user.username as assigned_by_username
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN users assigned_by_user ON ura.assigned_by = assigned_by_user.id
      WHERE ura.role_id = $1
      ORDER BY u.nome
    `

    console.log('🔍 DEBUG - Executando query:', usersQuery)
    console.log('🔍 DEBUG - Com parâmetro:', roleId)
    
    const usersResult = await pool.query(usersQuery, [roleId])
    console.log('🔍 DEBUG - Resultado da consulta de usuários:', usersResult.rows.length, 'usuários encontrados')

    return NextResponse.json({
      success: true,
      role: {
        id: role.id,
        name: role.name,
        description: role.description
      },
      users: usersResult.rows,
      total: usersResult.rows.length
    })

  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ DEBUG - Stack trace:', error.stack)
      console.error('❌ DEBUG - Mensagem do erro:', error.message)
    } else {
      console.error('❌ DEBUG - Erro desconhecido:', error)
    }
    return NextResponse.json(
      {
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
