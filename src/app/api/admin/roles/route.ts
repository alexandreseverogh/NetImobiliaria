import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { validateHierarchyOperation } from '@/services/hierarchyService'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

// GET - Listar todos os roles
export async function GET(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }
    const query = `
      SELECT 
        r.id,
        r.name,
        r.description,
        r.level,
        r.is_active,
        r.requires_2fa,
        r.is_system_role,
        r.created_at,
        r.updated_at,
        COUNT(ura.user_id) as user_count
      FROM user_roles r
      LEFT JOIN user_role_assignments ura ON r.id = ura.role_id
      GROUP BY r.id
      ORDER BY r.level ASC, r.name ASC
    `
    
    const result = await pool.query(query)
    
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
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const data = await request.json()
    const { name, description, level, two_fa_required = false, is_active = true } = data
    
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

    // Verificar se nome já existe
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

    // TODO: Validação de hierarquia - obter role do usuário logado
    // Por enquanto, permitir criação para desenvolvimento
    const validation = validateHierarchyOperation('create', 'Super Admin', 'Novo Role', level)
    if (!validation.allowed) {
      return NextResponse.json(
        { success: false, message: validation.reason },
        { status: 403 }
      )
    }

    // Inserir novo role
    const insertQuery = `
      INSERT INTO user_roles (name, description, level, requires_2fa, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `

    const result = await pool.query(insertQuery, [
      name,
      description,
      level,
      requires_2fa,
      is_active
    ])

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