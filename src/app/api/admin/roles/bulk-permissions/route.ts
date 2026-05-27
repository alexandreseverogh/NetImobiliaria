import { NextRequest, NextResponse } from 'next/server'
import { requireApiPermission } from '@/lib/auth/apiPermissions'
import pool from '@/lib/database/connection';

// Função local para verificar se requer 2FA
function requiresTwoFactor(action: string, feature: string): boolean {
  const criticalActions = ['delete', 'update', 'create']
  const criticalFeatures = ['usuarios', 'sistema', 'roles']
  
  return criticalActions.includes(action.toLowerCase()) || 
         criticalFeatures.includes(feature.toLowerCase())
}

// POST - Operações em lote para permissões
export async function POST(request: Request) {
  try {
    const denied = await requireApiPermission(request as unknown as NextRequest, 'roles', 'UPDATE')
    if (denied) return denied
    const body = await request.json()
    const { operation, roleIds, permissions, template, options = {} } = body

    // Validar operação
    const validOperations = ['apply', 'copy', 'reset', 'template']
    if (!validOperations.includes(operation)) {
      return NextResponse.json(
        { success: false, message: 'Operação inválida' },
        { status: 400 }
      )
    }

    // Validar parâmetros obrigatórios
    if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'IDs dos perfis são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se todos os roles existem
    const roleIdsStr = roleIds.map(id => parseInt(id)).filter(id => !isNaN(id))
    if (roleIdsStr.length !== roleIds.length) {
      return NextResponse.json(
        { success: false, message: 'IDs de perfis inválidos' },
        { status: 400 }
      )
    }

    const rolesCheck = await pool.query(
      `SELECT id, name, level FROM user_roles WHERE id = ANY($1)`,
      [roleIdsStr]
    )

    if (rolesCheck.rows.length !== roleIdsStr.length) {
      return NextResponse.json(
        { success: false, message: 'Um ou mais perfis não foram encontrados' },
        { status: 404 }
      )
    }

    const roles = rolesCheck.rows

    // Buscar todas as permissões para validação 2FA
    const allPermissionsResult = await pool.query(`
      SELECT p.id, p.action, p.feature_id, sf.category as feature_category
      FROM permissions p
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE sf.is_active = true
    `)
    const allPermissions = allPermissionsResult.rows

    // TODO: Implementar verificação de hierarquia via middleware ou token
    // Por enquanto, a rota é protegida pelo UnifiedPermissionMiddleware

    // Iniciar transação
    await pool.query('BEGIN')

    try {
      let results = []
      let totalPermissionsProcessed = 0

      for (const role of roles) {
        // Validação de hierarquia - Será substituída pela nova arquitetura tenant-based baseada em role_hierarchies


        let rolePermissions = []

        // Determinar permissões baseado na operação
        switch (operation) {
          case 'apply':
            if (!permissions || !Array.isArray(permissions)) {
              throw new Error('Permissões são obrigatórias para operação apply')
            }
            rolePermissions = permissions
            break

          case 'copy':
            if (!options.sourceRoleId) {
              throw new Error('ID do perfil de origem é obrigatório para operação copy')
            }
            const sourcePermissions = await pool.query(
              'SELECT permission_id FROM role_permissions WHERE role_id = $1',
              [options.sourceRoleId]
            )
            rolePermissions = sourcePermissions.rows.map(row => ({
              permission_id: row.permission_id,
              granted: true
            }))
            break

          case 'reset':
            rolePermissions = []
            break

          case 'template':
            if (!template) {
              throw new Error('Template é obrigatório para operação template')
            }
            rolePermissions = await getTemplatePermissions(template)
            break
        }

        // Verificar se operação requer 2FA
        const criticalPermissions = rolePermissions.filter(perm => {
          // Buscar informações da permissão
          const permission = allPermissions.find(p => p.id === perm.permission_id)
          if (!permission) return false
          return requiresTwoFactor(permission.action, permission.feature_category)
        })

        if (criticalPermissions.length > 0 && !options.twoFactorValidated) {
          results.push({
            roleId: role.id,
            roleName: role.name,
            success: false,
            error: 'Operação requer validação 2FA',
            requiresTwoFactor: true,
            criticalPermissionsCount: criticalPermissions.length
          })
          continue
        }

        // Remover permissões existentes do role
        await pool.query(
          'DELETE FROM role_permissions WHERE role_id = $1',
          [role.id]
        )

        // Inserir novas permissões
        if (rolePermissions.length > 0) {
          const insertValues = rolePermissions.map((perm, index) => {
            const baseIndex = index * 3
            return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`
          }).join(', ')

          const insertQuery = `
            INSERT INTO role_permissions (role_id, permission_id, granted_by)
            VALUES ${insertValues}
          `

          const insertParams = rolePermissions.flatMap(perm => [
            role.id,
            perm.permission_id,
            null // granted_by - pode ser null ou o ID do usuário que concedeu
          ])

          await pool.query(insertQuery, insertParams)
        }

        results.push({
          roleId: role.id,
          roleName: role.name,
          success: true,
          permissionsCount: rolePermissions.length,
          criticalPermissionsCount: criticalPermissions.length
        })

        totalPermissionsProcessed += rolePermissions.length
      }

      // Commit da transação
      await pool.query('COMMIT')

      console.log(`🔄 Bulk operation ${operation} executada:`)
      console.log(`   📊 ${roles.length} perfis processados`)
      console.log(`   📋 ${totalPermissionsProcessed} permissões totais`)
      console.log(`   ✅ ${results.filter(r => r.success).length} sucessos`)
      console.log(`   ❌ ${results.filter(r => !r.success).length} falhas`)

      return NextResponse.json({
        success: true,
        message: `Operação ${operation} executada com sucesso`,
        results,
        summary: {
          totalRoles: roles.length,
          successfulRoles: results.filter(r => r.success).length,
          failedRoles: results.filter(r => !r.success).length,
          totalPermissionsProcessed
        }
      })

    } catch (error) {
      // Rollback em caso de erro
      await pool.query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Erro ao executar bulk operation:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', error: error instanceof Error ? error.message : undefined },
      { status: 500 }
    )
  }
}

// Função para obter permissões de um template
async function getTemplatePermissions(template: string): Promise<any[]> {
  if (template === 'master' || template === 'super_admin') {
    // Para Super Admin, buscar todas as permissões ativas
    const allPermissions = await pool.query(`
      SELECT p.id, p.action, p.feature_id, sf.category as feature_category
      FROM permissions p
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE sf.is_active = true
    `)
    
    return allPermissions.rows.map(perm => ({
      permission_id: perm.id,
      granted: true
    }))
  }

  // Buscar permissões específicas baseadas no template
  let permissionActions: string[] = []
  
  switch (template) {
    case 'read_only':
      permissionActions = ['list', 'read']
      break
    case 'basic_user':
      permissionActions = ['list', 'read', 'create']
      break
    case 'corretor':
      permissionActions = ['list', 'read', 'create', 'update']
      break
    case 'admin':
      permissionActions = ['list', 'read', 'create', 'update', 'delete']
      break
    default:
      return []
  }

  // Buscar permissões que correspondem às ações do template
  const templatePermissions = await pool.query(`
    SELECT p.id, p.action, p.feature_id, sf.category as feature_category
    FROM permissions p
    JOIN system_features sf ON p.feature_id = sf.id
    WHERE p.action = ANY($1) AND sf.is_active = true
    LIMIT 10
  `, [permissionActions])
  
  return templatePermissions.rows.map(perm => ({
    permission_id: perm.id,
    granted: true
  }))
}

// GET - Obter templates disponíveis
export async function GET() {
  try {
    const templates = {
      'read_only': {
        name: 'Somente Leitura',
        description: 'Apenas permissões para visualizar dados',
        permissions: ['list', 'read']
      },
      'basic_user': {
        name: 'Usuário Básico',
        description: 'Permissões básicas para usuários comuns',
        permissions: ['list', 'read', 'create']
      },
      'corretor': {
        name: 'Corretor',
        description: 'Permissões para corretores',
        permissions: ['list', 'read', 'create', 'update']
      },
      'admin': {
        name: 'Administrador',
        description: 'Permissões administrativas completas',
        permissions: ['list', 'read', 'create', 'update', 'delete']
      },
      'master': {
        name: 'Administrador Master',
        description: 'Todas as permissões do sistema (Apenas Global)',
        permissions: ['all']
      }
    }

    return NextResponse.json({
      success: true,
      templates
    })

  } catch (error) {
    console.error('Erro ao buscar templates:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
