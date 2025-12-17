import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

// GET /api/admin/categorias/[id] - Buscar categoria por ID
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
    const { searchParams } = new URL(request.url)
    const includeFeatures = searchParams.get('include_features') === 'true'

    // Buscar categoria
    const categoryQuery = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.icon,
        c.color,
        c.sort_order,
        c.is_active,
        c.created_at,
        c.updated_at,
        c.created_by,
        c.updated_by
      FROM system_categorias c
      WHERE c.id = $1
    `

    const result = await pool.query(categoryQuery, [categoryId])

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    const category = result.rows[0]

    // Se solicitado, incluir funcionalidades da categoria
    if (includeFeatures) {
      const featuresQuery = `
        SELECT 
          fc.sort_order as feature_sort_order,
          sf.id as feature_id,
          sf.name as feature_name,
          sf.category_id as feature_category_id,
          sf.url as feature_url,
          sf.description as feature_description,
          sf.is_active as feature_is_active
        FROM system_feature_categorias fc
        JOIN system_features sf ON fc.feature_id = sf.id
        WHERE fc.category_id = $1
        ORDER BY fc.sort_order ASC, sf.name ASC
      `
      
      const featuresResult = await pool.query(featuresQuery, [categoryId])
      const features = featuresResult.rows.map(feature => ({
        id: feature.feature_id,
        name: feature.feature_name,
        category_id: feature.feature_category_id,
        url: feature.feature_url,
        description: feature.feature_description,
        is_active: feature.feature_is_active,
        sort_order: feature.feature_sort_order
      }))

      category.features = features
      category.features_count = features.length
    }

    return NextResponse.json({
      success: true,
      data: category
    })

  } catch (error) {
    console.error('Erro ao buscar categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar categoria' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/categorias/[id] - Atualizar categoria específica
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
    const { 
      name, 
      slug, 
      description, 
      icon, 
      color, 
      sort_order,
      is_active 
    } = body

    // Verificar se categoria existe
    const existingCategory = await pool.query(
      'SELECT id FROM system_categorias WHERE id = $1',
      [categoryId]
    )

    if (existingCategory.rows.length === 0) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Extrair userId do token JWT (temporariamente usando ID fixo)
    const userId = '1' // TODO: Implementar extração do JWT

    // Se slug foi alterado, verificar se já existe
    if (slug) {
      const slugCheck = await pool.query(
        'SELECT id FROM system_categorias WHERE slug = $1 AND id != $2',
        [slug, categoryId]
      )

      if (slugCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Já existe uma categoria com este slug' },
          { status: 409 }
        )
      }
    }

    // Validar formato da cor se fornecida
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { error: 'Cor deve estar no formato hexadecimal (#000000)' },
        { status: 400 }
      )
    }

    // Construir query de atualização dinamicamente
    const updateFields = []
    const updateValues = []
    let paramCount = 0

    if (name !== undefined) {
      updateFields.push(`name = $${++paramCount}`)
      updateValues.push(name)
    }
    if (slug !== undefined) {
      updateFields.push(`slug = $${++paramCount}`)
      updateValues.push(slug)
    }
    if (description !== undefined) {
      updateFields.push(`description = $${++paramCount}`)
      updateValues.push(description)
    }
    if (icon !== undefined) {
      updateFields.push(`icon = $${++paramCount}`)
      updateValues.push(icon)
    }
    if (color !== undefined) {
      updateFields.push(`color = $${++paramCount}`)
      updateValues.push(color)
    }
    if (sort_order !== undefined) {
      updateFields.push(`sort_order = $${++paramCount}`)
      updateValues.push(sort_order)
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${++paramCount}`)
      updateValues.push(is_active)
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo para atualizar' },
        { status: 400 }
      )
    }

    updateFields.push(`updated_by = $${++paramCount}`)
    updateValues.push(userId)

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    updateValues.push(categoryId)

    const updateQuery = `
      UPDATE system_categorias 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING id, name, slug, description, icon, color, sort_order, is_active, created_at, updated_at
    `

    const result = await pool.query(updateQuery, updateValues)
    const updatedCategory = result.rows[0]

    return NextResponse.json({
      success: true,
      message: 'Categoria atualizada com sucesso',
      data: updatedCategory
    })

  } catch (error) {
    console.error('Erro ao atualizar categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar categoria' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/categorias/[id] - Excluir categoria específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão de excluir categorias
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const categoryId = params.id

    // Verificar se categoria existe
    const existingCategory = await pool.query(
      'SELECT id, name FROM system_categorias WHERE id = $1',
      [categoryId]
    )

    if (existingCategory.rows.length === 0) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se categoria tem funcionalidades associadas
    const featuresCount = await pool.query(
      'SELECT COUNT(*) as count FROM system_feature_categorias WHERE category_id = $1',
      [categoryId]
    )

    if (parseInt(featuresCount.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir categoria que possui funcionalidades associadas. Remova as associações primeiro.' },
        { status: 409 }
      )
    }

    // Excluir categoria
    await pool.query('DELETE FROM system_categorias WHERE id = $1', [categoryId])

    return NextResponse.json({
      success: true,
      message: 'Categoria excluída com sucesso'
    })

  } catch (error) {
    console.error('Erro ao excluir categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao excluir categoria' },
      { status: 500 }
    )
  }
}
