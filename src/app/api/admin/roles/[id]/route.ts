import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import pool from '@/lib/database/connection'
import { requireApiPermission } from '@/lib/auth/apiPermissions'

// GET - Buscar role específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const roleId = parseInt(params.id)

    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, message: 'ID inválido' },
        { status: 400 }
      )
    }

    const token = request.cookies.get('admin_auth_token')?.value || request.cookies.get('admin_auth_token')?.value
    const decoded = token ? await import('@/lib/auth/jwt').then(m => m.verifyToken(token)) : null
    const tenantId = !decoded?.is_system_role ? decoded?.tenantId : undefined

    let queryParams: any[] = [roleId]
    let tenantFilter = ''
    
    if (tenantId) {
      tenantFilter = 'AND (r.tenant_id = $2 OR r.tenant_id IS NULL)'
      queryParams.push(tenantId)
    }

    const query = `
      SELECT 
        r.*,
        COUNT(ura.user_id) as user_count
      FROM user_roles r
      LEFT JOIN user_role_assignments ura ON r.id = ura.role_id
      WHERE r.id = $1 ${tenantFilter}
      GROUP BY r.id
    `

    const result = await pool.query(query, queryParams)

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      role: result.rows[0]
    })
  } catch (error) {
    console.error('Erro ao buscar role:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar role
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão de edição server-side
    const denied = await requireApiPermission(request, 'roles', 'UPDATE')
    if (denied) return denied

    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }
    const roleId = parseInt(params.id)
    const data = await request.json()
    const { name, description, level, two_fa_required, is_active, manager_role_id } = data

    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, message: 'ID inválido' },
        { status: 400 }
      )
    }

    const token = request.cookies.get('admin_auth_token')?.value || request.cookies.get('admin_auth_token')?.value
    const decoded = token ? await import('@/lib/auth/jwt').then(m => m.verifyToken(token)) : null
    const tenantId = !decoded?.is_system_role ? decoded?.tenantId : undefined
    const isMasterAdmin = !!decoded?.is_system_role

    // Verificar se role existe e checar tenant
    const existingRole = await pool.query(
      'SELECT id, tenant_id, is_system_role FROM user_roles WHERE id = $1',
      [roleId]
    )

    if (existingRole.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    const roleTenantId = existingRole.rows[0].tenant_id
    const isSystemRole = existingRole.rows[0].is_system_role

    if (!isMasterAdmin) {
      if (isSystemRole || roleTenantId !== tenantId) {
        return NextResponse.json(
          { success: false, message: 'Acesso negado: Perfil global ou de outro tenant.' },
          { status: 403 }
        )
      }
    }

    // Validações
    if (name && name.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nome não pode ser vazio' },
        { status: 400 }
      )
    }

    if (level !== undefined && (level < 1 || level > 10)) {
      return NextResponse.json(
        { success: false, message: 'Nível deve estar entre 1 e 10' },
        { status: 400 }
      )
    }

    // Verificar se nome já existe (excluindo o role atual)
    if (name) {
      const nameExists = await pool.query(
        'SELECT id FROM user_roles WHERE name = $1 AND id != $2',
        [name, roleId]
      )

      if (nameExists.rows.length > 0) {
        return NextResponse.json(
          { success: false, message: 'Já existe um perfil com este nome' },
          { status: 400 }
        )
      }
    }

    // Construir query de atualização dinâmica
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`)
      values.push(name)
      paramIndex++
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`)
      values.push(description)
      paramIndex++
    }

    if (level !== undefined) {
      updates.push(`level = $${paramIndex}`)
      values.push(level)
      paramIndex++
    }

    if (two_fa_required !== undefined) {
      updates.push(`requires_2fa = $${paramIndex}`)
      values.push(two_fa_required)
      paramIndex++
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`)
      values.push(is_active)
      paramIndex++
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nenhum campo para atualizar' },
        { status: 400 }
      )
    }

    updates.push(`updated_at = NOW()`)
    values.push(roleId)

    const updateQuery = `
      UPDATE user_roles 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(updateQuery, values)

    // Atualização da hierarquia (se enviado)
    if (manager_role_id !== undefined) {
      if (manager_role_id === null) {
        // Remover gerente (passa a ser nível máximo)
        await pool.query('DELETE FROM role_hierarchies WHERE subordinate_role_id = $1', [roleId])
      } else {
        // Atualizar ou inserir novo gerente
        // Primeiro remove gerentes antigos
        await pool.query('DELETE FROM role_hierarchies WHERE subordinate_role_id = $1', [roleId])
        // Insere o novo
        // Necessário descobrir o tenant_id do role atual (ou usar da sessão do admin)
        const tenantQuery = await pool.query('SELECT tenant_id FROM user_roles WHERE id = $1', [roleId])
        const roleTenantId = tenantQuery.rows[0]?.tenant_id || null
        
        await pool.query(
          'INSERT INTO role_hierarchies (tenant_id, manager_role_id, subordinate_role_id) VALUES ($1, $2, $3)',
          [roleTenantId, manager_role_id, roleId]
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      role: result.rows[0]
    })
  } catch (error) {
    console.error('Erro ao atualizar role:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir role
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão de exclusão server-side
    const denied = await requireApiPermission(request, 'roles', 'DELETE')
    if (denied) return denied

    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const roleId = parseInt(params.id)

    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, message: 'ID inválido' },
        { status: 400 }
      )
    }

    const token = request.cookies.get('admin_auth_token')?.value || request.cookies.get('admin_auth_token')?.value
    const decoded = token ? await import('@/lib/auth/jwt').then(m => m.verifyToken(token)) : null
    const tenantId = !decoded?.is_system_role ? decoded?.tenantId : undefined
    const isMasterAdmin = !!decoded?.is_system_role

    // Verificar se role existe e checar tenant
    const existingRole = await pool.query(
      'SELECT id, name, is_system_role, tenant_id FROM user_roles WHERE id = $1',
      [roleId]
    )

    if (existingRole.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Perfil não encontrado' },
        { status: 404 }
      )
    }

    const roleTenantId = existingRole.rows[0].tenant_id
    const isSystemRole = existingRole.rows[0].is_system_role

    if (!isMasterAdmin) {
      if (isSystemRole || roleTenantId !== tenantId) {
        return NextResponse.json(
          { success: false, message: 'Acesso negado: Perfil global ou de outro tenant.' },
          { status: 403 }
        )
      }
    }

    // Verificar se há usuários associados
    const userAssignments = await pool.query(
      'SELECT COUNT(*) as count FROM user_role_assignments WHERE role_id = $1',
      [roleId]
    )

    const userCount = parseInt(userAssignments.rows[0].count)
    if (userCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Não é possível excluir o perfil. Há ${userCount} usuário(s) associado(s).` 
        },
        { status: 400 }
      )
    }

    if (isSystemRole === true && !isMasterAdmin) {
      return NextResponse.json(
        { success: false, message: 'Perfis do sistema não podem ser excluídos por inquilinos' },
        { status: 400 }
      )
    }

    // Iniciar transação para garantir consistência
    await pool.query('BEGIN')
    try {
      // Remover permissões associadas ao perfil
      await pool.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId])
      
      // Excluir role
      await pool.query('DELETE FROM user_roles WHERE id = $1', [roleId])
      
      await pool.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        message: 'Perfil excluído com sucesso'
      })
    } catch (transactionError) {
      await pool.query('ROLLBACK')
      throw transactionError
    }
  } catch (error) {
    console.error('Erro ao excluir role:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}