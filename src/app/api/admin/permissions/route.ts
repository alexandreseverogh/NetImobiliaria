import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { requireApiPermission } from '@/lib/auth/apiPermissions'

// GET - Listar todas as permissões (com filtro de módulos - Entitlements)
export async function GET(request: NextRequest) {
  try {
    // 1. Extrair tenantId do token para filtragem modular
    let tenantId = null;
    const authHeader = request.headers.get('authorization');
    const cookie = request.cookies.get('admin_auth_token');
    const token = authHeader?.replace('Bearer ', '') || cookie?.value;

    if (token) {
      const payload = await verifyTokenNode(token) as any;
      tenantId = payload?.tenantId || null;
    }


    // 2. Query com filtro dinâmico de módulos habilitados
    const query = `
      SELECT 
        p.*,
        sf.name as feature_name,
        sc.name as feature_category,
        sf.description as feature_description
      FROM permissions p
      JOIN system_features sf ON p.feature_id = sf.id
      JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE sf.is_active = true
        AND (
          $1::uuid IS NULL -- Fallback se não houver contexto de tenant
          OR EXISTS (
            SELECT 1 FROM tenant_modules tm
            WHERE tm.module_id = sc.module_id
              AND tm.tenant_id = $1
              AND tm.is_enabled = true
          )
        )
      ORDER BY sc.name, sf.name, p.action
    `
    
    const result = await pool.query(query, [tenantId])
    
    // Agrupar permissões por categoria
    const permissionsByCategory = result.rows.reduce((acc, permission) => {
      const category = permission.feature_category || 'Outros'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(permission)
      return acc
    }, {} as Record<string, any[]>)
    
    return NextResponse.json({
      success: true,
      permissions: result.rows,
      permissionsByCategory
    })
  } catch (error) {
    console.error('Erro ao buscar permissões:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


// POST - Criar nova permissão
export async function POST(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'permissions', 'CREATE')
    if (denied) return denied

    const data = await request.json()
    const { feature_id, action, description } = data

    // Validações
    if (!feature_id || !action) {
      return NextResponse.json(
        { success: false, message: 'Feature ID e ação são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se feature existe
    const featureExists = await pool.query(
      'SELECT id FROM system_features WHERE id = $1 AND is_active = true',
      [feature_id]
    )

    if (featureExists.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Funcionalidade não encontrada' },
        { status: 400 }
      )
    }

    // Verificar se permissão já existe
    const existingPermission = await pool.query(
      'SELECT id FROM permissions WHERE feature_id = $1 AND action = $2',
      [feature_id, action]
    )

    if (existingPermission.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Permissão já existe para esta funcionalidade e ação' },
        { status: 400 }
      )
    }

    // Inserir nova permissão
    const insertQuery = `
      INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `

    const result = await pool.query(insertQuery, [
      feature_id,
      action,
      description || null
    ])

    return NextResponse.json({
      success: true,
      message: 'Permissão criada com sucesso',
      permission: result.rows[0]
    })
  } catch (error) {
    console.error('Erro ao criar permissão:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


