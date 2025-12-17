import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
  database: process.env.DB_NAME || 'net_imobiliaria',
})

// GET - Buscar permissões do role
export async function GET(
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

    // Verificar se role existe
    const roleExists = await pool.query(
      'SELECT id, name FROM user_roles WHERE id = $1',
      [roleId]
    )

    if (roleExists.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    const role = roleExists.rows[0]

    // Para Super Admin, retornar todas as permissões como concedidas
    if (role.name === 'Super Admin') {
      const allPermissionsQuery = `
        SELECT 
          p.id as permission_id,
          p.action,
          p.description,
          p.feature_id,
          p.requires_2fa,
          sf.name as feature_name,
          sc.name as feature_category
        FROM permissions p
        JOIN system_features sf ON p.feature_id = sf.id
        LEFT JOIN system_categorias sc ON sf.category_id = sc.id
        WHERE sf.is_active = true
        ORDER BY sc.name, sf.name, p.action
      `
      
      const allPermissionsResult = await pool.query(allPermissionsQuery)
      
      const permissions = allPermissionsResult.rows.map(permission => ({
        role_id: roleId,
        permission_id: permission.permission_id,
        action: permission.action,
        requires_2fa: permission.requires_2fa || false,
        granted: true
      }))

      return NextResponse.json({
        success: true,
        permissions,
        isSystemRole: true
      })
    }

    // Para outros roles, buscar permissões específicas
    const permissionsQuery = `
      SELECT 
        rp.role_id,
        rp.permission_id,
        rp.granted_by,
        rp.granted_at,
        p.action,
        p.description,
        p.feature_id,
        p.requires_2fa,
        sf.name as feature_name,
        sc.name as feature_category,
        sf.url as feature_url
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE rp.role_id = $1 AND sf.is_active = true
      ORDER BY sc.name, sf.name, p.action
    `

    const result = await pool.query(permissionsQuery, [roleId])
    
    const permissions = result.rows.map(row => ({
      role_id: row.role_id,
      permission_id: row.permission_id,
      action: row.action,
      requires_2fa: row.requires_2fa || false,
      granted: true // Se está na tabela, significa que foi concedida
    }))

    return NextResponse.json({
      success: true,
      permissions,
      isSystemRole: false
    })
  } catch (error) {
    console.error('Erro ao buscar permissões do role:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar permissões do role
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const roleId = parseInt(params.id)
    const data = await request.json()
    const { permissions } = data

    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, message: 'ID inválido' },
        { status: 400 }
      )
    }

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, message: 'Permissões devem ser um array' },
        { status: 400 }
      )
    }

    // Verificar se role existe
    const roleExists = await pool.query(
      'SELECT id, name FROM user_roles WHERE id = $1',
      [roleId]
    )

    if (roleExists.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    const role = roleExists.rows[0]

    // Para Super Admin, não permitir alterações
    if (role.name === 'Super Admin') {
      return NextResponse.json(
        { success: false, message: 'Permissões do Super Admin não podem ser alteradas' },
        { status: 400 }
      )
    }

    // Iniciar transação
    await pool.query('BEGIN')

    try {
      // Remover todas as permissões existentes do role
      await pool.query(
        'DELETE FROM role_permissions WHERE role_id = $1',
        [roleId]
      )

      // Inserir novas permissões (apenas as concedidas)
      const grantedPermissions = permissions.filter(perm => perm.granted)
      
      if (grantedPermissions.length > 0) {
        const insertValues = grantedPermissions.map((perm, index) => {
          const baseIndex = index * 3
          return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`
        }).join(', ')

        const insertQuery = `
          INSERT INTO role_permissions (role_id, permission_id, granted_by)
          VALUES ${insertValues}
        `

        const insertParams = grantedPermissions.flatMap(perm => [
          roleId,
          perm.permission_id,
          null // granted_by - pode ser null ou o ID do usuário que concedeu
        ])

        await pool.query(insertQuery, insertParams)
      }

      // Commit da transação
      await pool.query('COMMIT')

      // Log da alteração
      console.log(`🔐 Permissões atualizadas para perfil: ${role.name} (${permissions.length} permissões)`)

      return NextResponse.json({
        success: true,
        message: 'Permissões atualizadas com sucesso',
        permissionsCount: permissions.length
      })

    } catch (error) {
      // Rollback em caso de erro
      await pool.query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Erro ao atualizar permissões da role:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    return NextResponse.json(
      {
        success: false,
        message: 'Erro interno do servidor ao atualizar permissões',
        error: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
