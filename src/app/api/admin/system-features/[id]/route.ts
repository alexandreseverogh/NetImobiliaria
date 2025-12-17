import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

// PUT - Atualizar funcionalidade
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão de atualizar funcionalidades
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const featureId = params.id
    const updateData = await request.json()
    const { name, description, category_id, url, is_active, crud_execute } = updateData

    // Validações
    if (!name || !description || !category_id || !url) {
      return NextResponse.json(
        { error: 'Nome, descrição, categoria e URL são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se funcionalidade existe
    const existingFeature = await pool.query(
      'SELECT id, name FROM system_features WHERE id = $1::integer',
      [featureId]
    )

    if (existingFeature.rows.length === 0) {
      return NextResponse.json(
        { error: 'Funcionalidade não encontrada' },
        { status: 404 }
      )
    }

    // Atualizar funcionalidade incluindo Crud_Execute
    const result = await pool.query(`
      UPDATE system_features 
      SET name = $1, description = $2, category_id = $3, url = $4, is_active = $5, "Crud_Execute" = $6, updated_at = NOW()
      WHERE id = $7::integer
      RETURNING *
    `, [name, description, category_id, url, is_active, crud_execute, featureId])

    const updatedFeature = result.rows[0]

    return NextResponse.json({
      success: true,
      message: 'Funcionalidade atualizada com sucesso',
      data: updatedFeature
    })

  } catch (error) {
    console.error('Erro ao atualizar funcionalidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar funcionalidade' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir funcionalidade
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão de excluir funcionalidades
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const featureId = params.id

    // Verificar se funcionalidade existe
    const existingFeature = await pool.query(
      'SELECT id, name FROM system_features WHERE id = $1::integer',
      [featureId]
    )

    if (existingFeature.rows.length === 0) {
      return NextResponse.json(
        { error: 'Funcionalidade não encontrada' },
        { status: 404 }
      )
    }

    const featureName = existingFeature.rows[0].name

    // Iniciar transação
    await pool.query('BEGIN')

    try {
      // 1. Remover permissões da funcionalidade das atribuições de roles
      await pool.query(`
        DELETE FROM role_permissions 
        WHERE permission_id IN (
          SELECT id FROM permissions WHERE feature_id = $1::integer
        )
      `, [featureId])

      // 2. Remover permissões da funcionalidade (tabela user_permissions não existe mais)
      // Comentado conforme correção anterior

      // 3. Remover permissões da funcionalidade
      await pool.query(
        'DELETE FROM permissions WHERE feature_id = $1::integer',
        [featureId]
      )

      // 4. Remover funcionalidade
      await pool.query(
        'DELETE FROM system_features WHERE id = $1::integer',
        [featureId]
      )

      // Confirmar transação
      await pool.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: `Funcionalidade "${featureName}" excluída com sucesso!`
      })

    } catch (transactionError) {
      await pool.query('ROLLBACK')
      throw transactionError
    }

  } catch (error) {
    console.error('Erro ao excluir funcionalidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor ao excluir funcionalidade' },
      { status: 500 }
    )
  }
}