import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

// GET - Listar todas as funcionalidades
export async function GET(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const query = `
      SELECT 
        sf.id,
        sf.name,
        sf.description,
        sf.category_id,
        sc.name as category_name,
        sf.url,
        sf.is_active,
        sf."Crud_Execute",
        sf.created_at,
        sf.updated_at,
        COUNT(p.id) as permissions_count
      FROM system_features sf
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      LEFT JOIN permissions p ON sf.id = p.feature_id
      GROUP BY sf.id, sf.name, sf.description, sf.category_id, sc.name, sf.url, sf.is_active, sf."Crud_Execute", sf.created_at, sf.updated_at
      ORDER BY sf.name
    `

    const result = await pool.query(query)

    return NextResponse.json({
      success: true,
      features: result.rows
    })

  } catch (error) {
    console.error('Erro ao buscar funcionalidades:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar funcionalidades' },
      { status: 500 }
    )
  }
}

// POST - Criar nova funcionalidade
export async function POST(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const data = await request.json()
    const { 
      name, 
      description, 
      category_id, 
      url, 
      type = 'crud',
      assignToSuperAdmin = true,
      addToSidebar = true 
    } = data

    // Mapear tipo para Crud_Execute
    const crudExecute = type === 'crud' ? 'CRUD' : 'EXECUTE'

    // Validações
    if (!name || !description || !category_id || !url) {
      return NextResponse.json(
        { success: false, message: 'Nome, descrição, categoria e URL são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se nome já existe
    const existingFeature = await pool.query(
      'SELECT id FROM system_features WHERE name = $1',
      [name]
    )

    if (existingFeature.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Já existe uma funcionalidade com este nome' },
        { status: 409 }
      )
    }

    // Iniciar transação
    await pool.query('BEGIN')

    try {
      // 1. Criar funcionalidade com Crud_Execute
      const featureResult = await pool.query(`
        INSERT INTO system_features (name, description, category_id, url, "Crud_Execute", is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        RETURNING id
      `, [name, description, category_id, url, crudExecute])

      const featureId = featureResult.rows[0].id

      // 2. Criar permissões baseadas no Crud_Execute
      let permissionsToCreate: Array<{ action: string; description: string }> = []
      
      if (crudExecute === 'CRUD') {
        // CRUD: criar 4 permissões (create, read, update, delete) - MINÚSCULAS
        permissionsToCreate = [
          { action: 'create', description: `Criar ${name}` },
          { action: 'read', description: `Visualizar ${name}` },
          { action: 'update', description: `Editar ${name}` },
          { action: 'delete', description: `Excluir ${name}` }
        ]
      } else if (crudExecute === 'EXECUTE') {
        // EXECUTE: criar 1 permissão (execute) - MINÚSCULAS
        permissionsToCreate = [
          { action: 'execute', description: `Executar ${name}` }
        ]
      }

      let permissionsCreated = 0
      for (const actionData of permissionsToCreate) {
        await pool.query(`
          INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
        `, [featureId, actionData.action, actionData.description])
        permissionsCreated++
      }

      // 3. Atribuir ao Super Admin e Administrador automaticamente
      let assignedToSuperAdmin = false
      let assignedToAdministrador = false
      
      // Buscar roles Super Admin e Administrador
      const adminRoles = await pool.query(
        'SELECT id, name FROM user_roles WHERE name = ANY($1)',
        [['Super Admin', 'Administrador']]
      )

      // Buscar todas as permissões criadas para esta funcionalidade
      const permissions = await pool.query(
        'SELECT id FROM permissions WHERE feature_id = $1',
        [featureId]
      )

      // Atribuir permissões a ambos os roles
      for (const role of adminRoles.rows) {
        for (const permission of permissions.rows) {
          await pool.query(`
            INSERT INTO role_permissions (role_id, permission_id, granted_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (role_id, permission_id) DO NOTHING
          `, [role.id, permission.id])
        }
        
        if (role.name === 'Super Admin') {
          assignedToSuperAdmin = true
        } else if (role.name === 'Administrador') {
          assignedToAdministrador = true
        }
      }

      // Confirmar transação
      await pool.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: 'Funcionalidade criada com sucesso',
        feature: {
          id: featureId,
          name,
          description,
          category_id,
          url,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          permissionsCreated,
          assignedToSuperAdmin,
          assignedToAdministrador,
          addedToSidebar: addToSidebar,
        }
      })

    } catch (transactionError) {
      await pool.query('ROLLBACK')
      throw transactionError
    }

  } catch (error) {
    console.error('❌ Erro ao criar funcionalidade:', error)
    console.error('❌ Stack:', error instanceof Error ? error.stack : 'N/A')
    console.error('❌ Mensagem:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor ao criar funcionalidade' },
      { status: 500 }
    )
  }
}