import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { verifyToken } from '@/lib/auth/jwt'

// GET /api/admin/categorias/[id]/features - Listar funcionalidades de uma categoria
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão de listar categorias
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const categoryId = params.id

    // Verificar se categoria existe
    const categoryExists = await pool.query(
      'SELECT id, name FROM system_categorias WHERE id = $1',
      [categoryId]
    )

    if (categoryExists.rows.length === 0) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Buscar funcionalidades da categoria
    const featuresQuery = `
      SELECT 
        fc.id as association_id,
        fc.sort_order,
        fc.created_at as associated_at,
        sf.id as feature_id,
        sf.name as feature_name,
        sf.category_id as feature_category_id,
        sf.url as feature_url,
        sf.description as feature_description,
        sf.is_active as feature_is_active,
        u.username as associated_by_username
      FROM system_feature_categorias fc
      JOIN system_features sf ON fc.feature_id = sf.id
      LEFT JOIN users u ON fc.created_by = u.id
      WHERE fc.category_id = $1
      ORDER BY fc.sort_order ASC, sf.name ASC
    `

    const result = await pool.query(featuresQuery, [categoryId])
    const features = result.rows

    // Buscar funcionalidades disponíveis (não associadas a esta categoria)
    const availableFeaturesQuery = `
      SELECT 
        sf.id,
        sf.name,
        sf.category,
        sf.url,
        sf.description,
        sf.is_active
      FROM system_features sf
      WHERE sf.id NOT IN (
        SELECT feature_id 
        FROM system_feature_categorias 
        WHERE category_id = $1
      )
      AND sf.is_active = true
      ORDER BY sf.name ASC
    `

    const availableResult = await pool.query(availableFeaturesQuery, [categoryId])
    const availableFeatures = availableResult.rows

    return NextResponse.json({
      success: true,
      data: {
        category: categoryExists.rows[0],
        features: features,
        available_features: availableFeatures,
        total: features.length
      }
    })

  } catch (error) {
    console.error('Erro ao listar funcionalidades da categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao listar funcionalidades da categoria' },
      { status: 500 }
    )
  }
}

// POST /api/admin/categorias/[id]/features - Adicionar funcionalidade à categoria
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão de editar categorias
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const categoryId = params.id
    const body = await request.json()
    const { feature_ids, sort_order } = body

    if (!feature_ids || !Array.isArray(feature_ids) || feature_ids.length === 0) {
      return NextResponse.json(
        { error: 'Lista de IDs de funcionalidades é obrigatória' },
        { status: 400 }
      )
    }

    // Verificar se categoria existe
    const categoryExists = await pool.query(
      'SELECT id, name FROM system_categorias WHERE id = $1',
      [categoryId]
    )

    if (categoryExists.rows.length === 0) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Extrair userId do token JWT
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : request.cookies.get('accessToken')?.value

    const decoded = bearerToken ? await verifyToken(bearerToken) : null
    const userId = decoded?.userId

    if (!userId) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      )
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Verificar se funcionalidades existem
      const featuresCheck = await client.query(
        'SELECT id FROM system_features WHERE id = ANY($1)',
        [feature_ids]
      )

      if (featuresCheck.rows.length !== feature_ids.length) {
        await client.query('ROLLBACK')
        return NextResponse.json(
          { error: 'Uma ou mais funcionalidades não foram encontradas' },
          { status: 404 }
        )
      }

      // Inserir associações
      const insertedAssociations = []
      for (let i = 0; i < feature_ids.length; i++) {
        const featureId = feature_ids[i]
        const currentSortOrder = sort_order !== undefined ? sort_order + i : i + 1

        const insertQuery = `
          INSERT INTO system_feature_categorias (category_id, feature_id, sort_order, created_by)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (category_id, feature_id) DO UPDATE
          SET sort_order = EXCLUDED.sort_order,
              created_at = CURRENT_TIMESTAMP
          RETURNING id, category_id, feature_id, sort_order
        `

        const result = await client.query(insertQuery, [
          categoryId, featureId, currentSortOrder, userId
        ])

        insertedAssociations.push(result.rows[0])
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: `${feature_ids.length} funcionalidade(s) adicionada(s) à categoria com sucesso`,
        data: insertedAssociations
      }, { status: 201 })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Erro ao adicionar funcionalidades à categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao adicionar funcionalidades à categoria' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/categorias/[id]/features - Remover funcionalidade da categoria
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão de editar categorias
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const categoryId = params.id
    const { searchParams } = new URL(request.url)
    const featureId = searchParams.get('feature_id')

    if (!featureId) {
      return NextResponse.json(
        { error: 'ID da funcionalidade é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se categoria existe
    const categoryExists = await pool.query(
      'SELECT id, name FROM system_categorias WHERE id = $1',
      [categoryId]
    )

    if (categoryExists.rows.length === 0) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se associação existe
    const associationExists = await pool.query(
      'SELECT id FROM system_feature_categorias WHERE category_id = $1 AND feature_id = $2',
      [categoryId, featureId]
    )

    if (associationExists.rows.length === 0) {
      return NextResponse.json(
        { error: 'Funcionalidade não está associada a esta categoria' },
        { status: 404 }
      )
    }

    // Remover associação
    await pool.query(
      'DELETE FROM system_feature_categorias WHERE category_id = $1 AND feature_id = $2',
      [categoryId, featureId]
    )

    return NextResponse.json({
      success: true,
      message: 'Funcionalidade removida da categoria com sucesso'
    })

  } catch (error) {
    console.error('Erro ao remover funcionalidade da categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao remover funcionalidade da categoria' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/categorias/[id]/features - Reordenar funcionalidades da categoria
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão de editar categorias
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const categoryId = params.id
    const body = await request.json()
    const { feature_orders } = body

    if (!feature_orders || !Array.isArray(feature_orders)) {
      return NextResponse.json(
        { error: 'Lista de ordens de funcionalidades é obrigatória' },
        { status: 400 }
      )
    }

    // Verificar se categoria existe
    const categoryExists = await pool.query(
      'SELECT id, name FROM system_categorias WHERE id = $1',
      [categoryId]
    )

    if (categoryExists.rows.length === 0) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Atualizar ordens
      for (const item of feature_orders) {
        const { feature_id, sort_order } = item
        
        if (!feature_id || sort_order === undefined) {
          await client.query('ROLLBACK')
          return NextResponse.json(
            { error: 'Cada item deve ter feature_id e sort_order' },
            { status: 400 }
          )
        }

        await client.query(
          'UPDATE system_feature_categorias SET sort_order = $1 WHERE category_id = $2 AND feature_id = $3',
          [sort_order, categoryId, feature_id]
        )
      }

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: 'Funcionalidades reordenadas com sucesso'
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Erro ao reordenar funcionalidades da categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao reordenar funcionalidades da categoria' },
      { status: 500 }
    )
  }
}
