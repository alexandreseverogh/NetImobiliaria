import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

// GET /api/admin/categorias - Listar todas as categorias
export async function GET(request: NextRequest) {
  try {
    // Verificar permissão de listar categorias
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const { searchParams } = new URL(request.url)
    const includeFeatures = searchParams.get('include_features') === 'true'
    const onlyActive = searchParams.get('only_active') !== 'false'

    let query = `
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
      WHERE 1=1
    `

    const queryParams: any[] = []
    let paramCount = 0

    if (onlyActive) {
      query += ` AND c.is_active = true`
    }

    query += ` ORDER BY c.sort_order ASC, c.name ASC`

    const result = await pool.query(query, queryParams)
    const categories = result.rows

    // Se solicitado, incluir funcionalidades de cada categoria
    if (includeFeatures && categories.length > 0) {
      const categoryIds = categories.map(c => c.id)
      const featuresQuery = `
        SELECT 
          fc.category_id,
          fc.sort_order as feature_sort_order,
          sf.id as feature_id,
          sf.name as feature_name,
          sf.category_id as feature_category_id,
          sf.url as feature_url,
          sf.description as feature_description,
          sf.is_active as feature_is_active
        FROM system_feature_categorias fc
        JOIN system_features sf ON fc.feature_id = sf.id
        WHERE fc.category_id = ANY($1)
        ORDER BY fc.sort_order ASC, sf.name ASC
      `
      
      const featuresResult = await pool.query(featuresQuery, [categoryIds])
      const features = featuresResult.rows

      // Agrupar funcionalidades por categoria
      const featuresByCategory = features.reduce((acc, feature) => {
        if (!acc[feature.category_id]) {
          acc[feature.category_id] = []
        }
        acc[feature.category_id].push({
          id: feature.feature_id,
          name: feature.feature_name,
          category_id: feature.feature_category_id,
          url: feature.feature_url,
          description: feature.feature_description,
          is_active: feature.feature_is_active,
          sort_order: feature.feature_sort_order
        })
        return acc
      }, {})

      // Adicionar funcionalidades às categorias
      categories.forEach(category => {
        category.features = featuresByCategory[category.id] || []
      })
    }

    return NextResponse.json({
      success: true,
      categories: categories,
      total: categories.length
    })

  } catch (error) {
    console.error('Erro ao listar categorias:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao listar categorias' },
      { status: 500 }
    )
  }
}

// POST /api/admin/categorias - Criar nova categoria
export async function POST(request: NextRequest) {
  try {
    // TEMPORÁRIO: Desabilitar verificação de permissão
    // const permissionCheck = await checkApiPermission(request)
    // if (permissionCheck) {
    //   return permissionCheck
    // }

    const body = await request.json()
    const { 
      name, 
      slug, 
      description, 
      icon, 
      color = '#6B7280', 
      sort_order = 0,
      is_active = true 
    } = body

    // Validações obrigatórias
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Nome e slug são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar formato do slug
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug deve conter apenas letras minúsculas, números e hífens' },
        { status: 400 }
      )
    }

    // Validar formato da cor
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { error: 'Cor deve estar no formato hexadecimal (#000000)' },
        { status: 400 }
      )
    }

    // TEMPORÁRIO: Usar userId fixo para teste
    const userId = 'cc8220f7-a3fd-40ed-8dbd-a22539328083' // ID do admin

    // Verificar se slug já existe
    const existingCategory = await pool.query(
      'SELECT id FROM system_categorias WHERE slug = $1',
      [slug]
    )

    if (existingCategory.rows.length > 0) {
      return NextResponse.json(
        { error: 'Já existe uma categoria com este slug' },
        { status: 409 }
      )
    }

    // Inserir nova categoria
    const insertQuery = `
      INSERT INTO system_categorias (
        name, slug, description, icon, color, sort_order, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, slug, description, icon, color, sort_order, is_active, created_at, updated_at
    `

    const result = await pool.query(insertQuery, [
      name, slug, description, icon, color, sort_order, is_active
    ])

    const newCategory = result.rows[0]

    return NextResponse.json({
      success: true,
      message: 'Categoria criada com sucesso',
      data: newCategory
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar categoria:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao criar categoria' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/categorias - Atualizar categoria
export async function PUT(request: NextRequest) {
  try {
    // Verificar permissão de editar categorias
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const body = await request.json()
    const { 
      id, 
      name, 
      slug, 
      description, 
      icon, 
      color, 
      sort_order,
      is_active 
    } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID da categoria é obrigatório' },
        { status: 400 }
      )
    }

    // Extrair userId do token JWT
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

    // Verificar se categoria existe
    const existingCategory = await pool.query(
      'SELECT id FROM system_categorias WHERE id = $1',
      [id]
    )

    if (existingCategory.rows.length === 0) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Se slug foi alterado, verificar se já existe
    if (slug) {
      const slugCheck = await pool.query(
        'SELECT id FROM system_categorias WHERE slug = $1 AND id != $2',
        [slug, id]
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

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    updateValues.push(id)

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

// DELETE /api/admin/categorias - Excluir categoria
export async function DELETE(request: NextRequest) {
  try {
    // Verificar permissão de excluir categorias
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID da categoria é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se categoria existe
    const existingCategory = await pool.query(
      'SELECT id, name FROM system_categorias WHERE id = $1',
      [id]
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
      [id]
    )

    if (parseInt(featuresCount.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir categoria que possui funcionalidades associadas. Remova as associações primeiro.' },
        { status: 409 }
      )
    }

    // Excluir categoria
    await pool.query('DELETE FROM system_categorias WHERE id = $1', [id])

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
