import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { requireApiPermission } from '@/lib/auth/apiPermissions'

// GET - Listar todos os roles
export async function GET(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }
    const token = request.cookies.get('admin_auth_token')?.value
    const decoded = token ? await import('@/lib/auth/jwt').then(m => m.verifyToken(token)) : null
    const tenantId = !decoded?.is_system_role ? decoded?.tenantId : undefined

    let query = ''
    let queryParams: any[] = []

    if (tenantId) {
      query = `
        SELECT 
          r.id, r.name, r.description, r.level, r.is_active, r.requires_2fa,
          r.is_system_role, r.created_at, r.updated_at, COUNT(ura.user_id) as user_count,
          MAX(rh.manager_role_id) as manager_role_id
        FROM user_roles r
        LEFT JOIN user_role_assignments ura ON r.id = ura.role_id
        LEFT JOIN role_hierarchies rh ON r.id = rh.subordinate_role_id
        WHERE (r.tenant_id = $1 OR r.is_system_role = true)
        AND r.is_system_role = false
        GROUP BY r.id
        ORDER BY r.level ASC, r.name ASC
      `
      queryParams = [tenantId]
    } else {
      query = `
        SELECT 
          r.id, r.name, r.description, r.level, r.is_active, r.requires_2fa,
          r.is_system_role, r.created_at, r.updated_at, COUNT(ura.user_id) as user_count,
          MAX(rh.manager_role_id) as manager_role_id
        FROM user_roles r
        LEFT JOIN user_role_assignments ura ON r.id = ura.role_id
        LEFT JOIN role_hierarchies rh ON r.id = rh.subordinate_role_id
        WHERE r.is_system_role = false
        GROUP BY r.id
        ORDER BY r.level ASC, r.name ASC
      `
    }
    
    const result = await pool.query(query, queryParams)
    
    // Mapear requires_2fa para two_fa_required para compatibilidade com frontend
    const roles = result.rows.map(row => ({
      ...row,
      two_fa_required: row.requires_2fa || false
    }))
    
    return NextResponse.json({
      success: true,
      roles
    })
  } catch (error) {
    console.error('Erro ao buscar roles:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo role
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão de criação server-side
    const denied = await requireApiPermission(request, 'roles', 'CREATE')
    if (denied) return denied

    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const data = await request.json()
    const { name, description, level, two_fa_required = false, is_active = true, manager_role_id } = data
    
    // Mapear two_fa_required para requires_2fa
    const requires_2fa = two_fa_required

    // Validações
    if (!name || !description || level === undefined) {
      return NextResponse.json(
        { success: false, message: 'Nome, descrição e nível são obrigatórios' },
        { status: 400 }
      )
    }

    if (level < 1 || level > 10) {
      return NextResponse.json(
        { success: false, message: 'Nível deve estar entre 1 e 10' },
        { status: 400 }
      )
    }

    // Validação de nome existente no escopo do tenant (ou global se for master)
    const token = request.cookies.get('admin_auth_token')?.value
    const decoded = token ? await import('@/lib/auth/jwt').then(m => m.verifyToken(token)) : null
    const tenantId = !decoded?.is_system_role ? decoded?.tenantId : undefined

    const existingRole = await pool.query(
      'SELECT id FROM user_roles WHERE name = $1 AND (tenant_id = $2 OR is_system_role = true)',
      [name, tenantId || null]
    )

    if (existingRole.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Já existe um perfil com este nome' },
        { status: 400 }
      )
    }

    // Inserir novo role associado ao tenant do criador
    const insertQuery = `
      INSERT INTO user_roles (name, description, level, requires_2fa, is_active, created_at, updated_at, tenant_id)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6)
      RETURNING *
    `

    const result = await pool.query(insertQuery, [
      name,
      description,
      level,
      requires_2fa,
      is_active,
      tenantId || null
    ])

    const newRoleId = result.rows[0].id

    // Associar ao gerente se manager_role_id for fornecido
    if (manager_role_id) {
      const hierarchyQuery = `
        INSERT INTO role_hierarchies (tenant_id, manager_role_id, subordinate_role_id)
        VALUES ($1, $2, $3)
      `
      await pool.query(hierarchyQuery, [tenantId || null, manager_role_id, newRoleId])
    }

    return NextResponse.json({
      success: true,
      message: 'Perfil criado com sucesso',
      role: result.rows[0]
    })
  } catch (error) {
    console.error('Erro ao criar role:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}