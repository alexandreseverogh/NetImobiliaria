import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
  database: process.env.DB_NAME || 'net_imobiliaria',
})

// GET - Buscar usuários de um perfil específico (versão simplificada)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 DEBUG SIMPLE - API chamada para role ID:', params.id)
    
    const roleId = parseInt(params.id)
    console.log('🔍 DEBUG SIMPLE - Role ID convertido:', roleId)

    if (isNaN(roleId)) {
      console.log('❌ DEBUG SIMPLE - ID inválido')
      return NextResponse.json(
        { success: false, message: 'ID do perfil inválido' },
        { status: 400 }
      )
    }

    // Testar conexão simples
    console.log('🔍 DEBUG SIMPLE - Testando conexão com banco...')
    const testResult = await pool.query('SELECT NOW() as current_time')
    console.log('✅ DEBUG SIMPLE - Conexão OK:', testResult.rows[0])

    // Verificar se o perfil existe
    console.log('🔍 DEBUG SIMPLE - Verificando perfil...')
    const roleExists = await pool.query(
      'SELECT id, name, description FROM user_roles WHERE id = $1',
      [roleId]
    )
    console.log('🔍 DEBUG SIMPLE - Perfil encontrado:', roleExists.rows.length > 0)

    if (roleExists.rows.length === 0) {
      console.log('❌ DEBUG SIMPLE - Perfil não encontrado')
      return NextResponse.json(
        { success: false, message: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    const role = roleExists.rows[0]
    console.log('✅ DEBUG SIMPLE - Perfil:', role.name)

    // Buscar usuários (query simplificada)
    console.log('🔍 DEBUG SIMPLE - Buscando usuários...')
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
        ura.is_primary
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      WHERE ura.role_id = $1
      ORDER BY u.nome
    `

    const usersResult = await pool.query(usersQuery, [roleId])
    console.log('✅ DEBUG SIMPLE - Usuários encontrados:', usersResult.rows.length)

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
      console.error('❌ DEBUG SIMPLE - Erro:', error.message)
      console.error('❌ DEBUG SIMPLE - Stack:', error.stack)
    } else {
      console.error('❌ DEBUG SIMPLE - Erro desconhecido:', error)
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor', 
        error: error instanceof Error ? error.message : undefined,
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}


