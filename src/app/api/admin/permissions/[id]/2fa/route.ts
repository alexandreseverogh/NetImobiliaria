import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import pool from '@/lib/database/connection'

/**
 * PUT - Atualizar configuração de 2FA de uma permissão
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissão (requer ADMIN em permissions)
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const permissionId = parseInt(params.id)
    const { requires_2fa } = await request.json()

    if (isNaN(permissionId)) {
      return NextResponse.json(
        { error: 'ID de permissão inválido' },
        { status: 400 }
      )
    }

    if (typeof requires_2fa !== 'boolean') {
      return NextResponse.json(
        { error: 'requires_2fa deve ser true ou false' },
        { status: 400 }
      )
    }

    // Buscar dados da permissão
    const permissionQuery = `
      SELECT 
        p.id, p.action, p.description,
        sf.name as feature_name, sf.slug as feature_slug
      FROM permissions p
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE p.id = $1
    `
    const permissionResult = await pool.query(permissionQuery, [permissionId])

    if (permissionResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Permissão não encontrada' },
        { status: 404 }
      )
    }

    const permission = permissionResult.rows[0]

    // Atualizar requires_2fa
    const updateQuery = `
      UPDATE permissions 
      SET requires_2fa = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, action, requires_2fa
    `
    
    const result = await pool.query(updateQuery, [requires_2fa, permissionId])

    // Log de auditoria
    const { logAuditEvent } = await import('@/lib/audit/auditLogger')
    const { extractUserIdFromToken, extractRequestData } = await import('@/lib/audit/auditLogger')
    
    try {
      const userId = extractUserIdFromToken(request)
      const { ipAddress, userAgent } = extractRequestData(request)
      
      await logAuditEvent({
        userId,
        action: 'UPDATE',
        resource: 'permissions-2fa-config',
        resourceId: permissionId.toString(),
        details: {
          permission: `${permission.feature_name} - ${permission.action}`,
          requires_2fa_old: !requires_2fa,
          requires_2fa_new: requires_2fa
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      console.error('Erro no log de auditoria (não crítico):', auditError)
    }

    console.log(`✅ 2FA ${requires_2fa ? 'ATIVADO' : 'DESATIVADO'} para: ${permission.feature_name} - ${permission.action}`)

    return NextResponse.json({
      success: true,
      message: `2FA ${requires_2fa ? 'ativado' : 'desativado'} com sucesso`,
      data: result.rows[0]
    })

  } catch (error) {
    console.error('❌ Erro ao atualizar 2FA:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}



