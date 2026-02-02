import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
  database: process.env.DB_NAME!,
})

// POST - Clonar perfil
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const roleId = parseInt(params.id)
    
    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, message: 'ID inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || !description) {
      return NextResponse.json(
        { success: false, message: 'Nome e descrição são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o perfil original existe
    const originalRole = await pool.query(
      'SELECT * FROM user_roles WHERE id = $1',
      [roleId]
    )

    if (originalRole.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Perfil original não encontrado' },
        { status: 404 }
      )
    }

    const original = originalRole.rows[0]

    // Verificar se o nome já existe
    const existingRole = await pool.query(
      'SELECT id FROM user_roles WHERE name = $1',
      [name]
    )

    if (existingRole.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Já existe um perfil com este nome' },
        { status: 400 }
      )
    }

    // Proteção para Super Admin
    if (original.name === 'Super Admin') {
      return NextResponse.json(
        { success: false, message: 'Não é possível clonar o perfil Super Admin' },
        { status: 400 }
      )
    }

    // Iniciar transação
    await pool.query('BEGIN')

    try {
      // Criar o novo perfil clonado
      const newRoleResult = await pool.query(`
        INSERT INTO user_roles (name, description, level, is_active, two_fa_required)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        name,
        description,
        original.level,
        original.is_active,
        original.two_fa_required // Herda configuração 2FA
      ])

      const newRole = newRoleResult.rows[0]

      // Clonar todas as permissões do perfil original
      const permissionsResult = await pool.query(`
        SELECT permission_id, granted_by
        FROM role_permissions 
        WHERE role_id = $1
      `, [roleId])

      const permissions = permissionsResult.rows

      if (permissions.length > 0) {
        const insertValues = permissions.map((perm, index) => {
          const baseIndex = index * 3
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`
        }).join(', ')

        const insertQuery = `
          INSERT INTO role_permissions (role_id, permission_id, granted_by)
          VALUES ${insertValues}
        `

        const insertParams = permissions.flatMap(perm => [
          newRole.id,
          perm.permission_id,
          perm.granted_by
        ])

        await pool.query(insertQuery, insertParams)
      }

      // Commit da transação
      await pool.query('COMMIT')

      console.log(`🔄 Perfil clonado: ${original.name} → ${name} (ID: ${newRole.id})`)
      console.log(`📋 ${permissions.length} permissões herdadas`)
      console.log(`🔐 2FA herdado: ${original.two_fa_required ? 'Sim' : 'Não'}`)

      return NextResponse.json({
        success: true,
        message: 'Perfil clonado com sucesso',
        role: {
          id: newRole.id,
          name: newRole.name,
          description: newRole.description,
          level: newRole.level,
          is_active: newRole.is_active,
          two_fa_required: newRole.two_fa_required,
          permissions_count: permissions.length
        }
      })

    } catch (error) {
      // Rollback em caso de erro
      await pool.query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Erro ao clonar role:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    return NextResponse.json(
      {
        success: false,
        message: 'Erro interno do servidor ao clonar role',
        error: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    )
  }
}


