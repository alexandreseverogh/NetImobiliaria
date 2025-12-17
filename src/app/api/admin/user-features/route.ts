import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database/connection'
import { checkApiPermission } from '@/lib/middleware/permissionMiddleware'

export async function GET(request: NextRequest) {
  try {
    // Verificar permissão
    const permissionResponse = await checkApiPermission(request)
    if (permissionResponse) {
      return permissionResponse // Retorna erro se houver
    }

    // Obter userId do token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.replace('Bearer ', '') 
      : request.cookies.get('accessToken')?.value
    
    if (!token) {
      return NextResponse.json(
        { error: 'Token não encontrado' },
        { status: 401 }
      )
    }

    const { verifyToken } = await import('@/lib/auth/jwt')
    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const userId = decoded.userId

    // Query para obter funcionalidades que o usuário tem permissão
    // Verificar se coluna is_active existe em role_permissions
    const checkColumnQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'role_permissions' 
        AND column_name = 'is_active'
      ) as column_exists
    `
    const columnCheck = await pool.query(checkColumnQuery)
    const hasIsActiveColumn = columnCheck.rows[0]?.column_exists || false

    const query = hasIsActiveColumn
      ? `
      SELECT DISTINCT
        sf.id,
        sf.name,
        sf.description,
        sf.category_id,
        sf.url,
        sf.is_active,
        sc.name as category_name,
        sc.slug as category_slug,
        sc.icon as category_icon,
        sc.color as category_color,
        sc.sort_order as category_sort_order
      FROM system_features sf
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      JOIN permissions p ON sf.id = p.feature_id
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_role_assignments ura ON rp.role_id = ura.role_id
      WHERE ura.user_id = $1
        AND sf.is_active = true
        AND rp.is_active = true
        AND ura.is_active = true
      ORDER BY 
        COALESCE(sc.sort_order, 999),
        sc.name,
        sf.name
    `
      : `
      SELECT DISTINCT
        sf.id,
        sf.name,
        sf.description,
        sf.category_id,
        sf.url,
        sf.is_active,
        sc.name as category_name,
        sc.slug as category_slug,
        sc.icon as category_icon,
        sc.color as category_color,
        sc.sort_order as category_sort_order
      FROM system_features sf
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      JOIN permissions p ON sf.id = p.feature_id
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_role_assignments ura ON rp.role_id = ura.role_id
      WHERE ura.user_id = $1
        AND sf.is_active = true
        AND ura.is_active = true
      ORDER BY 
        COALESCE(sc.sort_order, 999),
        sc.name,
        sf.name
    `

    const result = await pool.query(query, [userId])

    // Agrupar funcionalidades por categoria
    const featuresByCategory = result.rows.reduce((acc, feature) => {
      const categoryId = feature.category_id || 'sem-categoria'
      
      if (!acc[categoryId]) {
        acc[categoryId] = {
          category: feature.category_id ? {
            id: feature.category_id,
            name: feature.category_name,
            slug: feature.category_slug,
            icon: feature.category_icon,
            color: feature.category_color,
            sort_order: feature.category_sort_order
          } : null,
          features: []
        }
      }

      acc[categoryId].features.push({
        id: feature.id,
        name: feature.name,
        description: feature.description,
        category_id: feature.category_id,
        url: feature.url,
        is_active: feature.is_active
      })

      return acc
    }, {} as any)

    return NextResponse.json(Object.values(featuresByCategory))

  } catch (error) {
    console.error('Erro ao obter funcionalidades do usuário:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
