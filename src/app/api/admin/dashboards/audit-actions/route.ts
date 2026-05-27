import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

export async function GET(request: NextRequest) {
  // Verificar permissões
  const permissionCheck = await unifiedPermissionMiddleware(request)
  if (permissionCheck) return permissionCheck

  const { getTenantContext } = await import('@/lib/auth/get-tenant-from-token')
  const { tenantId, isMaster } = await getTenantContext(request)

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = `
      SELECT 
        action as name,
        COUNT(*)::integer as value
      FROM audit_logs
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    if (startDate) {
      query += ` AND (created_at >= $${paramIndex}::timestamp OR timestamp >= $${paramIndex}::timestamp)`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      query += ` AND (created_at <= $${paramIndex}::timestamp + interval '1 day' OR timestamp <= $${paramIndex}::timestamp + interval '1 day')`
      params.push(endDate)
      paramIndex++
    }

    if (tenantId) {
      query += ` AND tenant_id = $${paramIndex}`
      params.push(tenantId)
      paramIndex++
    }

    query += `
      GROUP BY action
      ORDER BY value DESC
    `

    const result = await pool.query(query, params)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar ações do audit:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar dados de auditoria' },
      { status: 500 }
    )
  }
}



