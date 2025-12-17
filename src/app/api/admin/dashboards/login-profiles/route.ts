import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

export async function GET(request: NextRequest) {
  // Verificar permissões
  const permissionCheck = await unifiedPermissionMiddleware(request)
  if (permissionCheck) return permissionCheck

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = `
      SELECT 
        COALESCE(ur.name, 'Sem Perfil') as name,
        COUNT(DISTINCT ll.user_id)::integer as value
      FROM login_logs ll
      LEFT JOIN users u ON ll.user_id = u.id
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ll.action = 'login' AND ll.success = true
    `

    const params: any[] = []
    let paramIndex = 1

    if (startDate) {
      query += ` AND ll.created_at >= $${paramIndex}::timestamp`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      query += ` AND ll.created_at <= $${paramIndex}::timestamp + interval '1 day'`
      params.push(endDate)
      paramIndex++
    }

    query += `
      GROUP BY ur.name
      ORDER BY value DESC
    `

    const result = await pool.query(query, params)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar perfis de login:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar dados de perfis de login' },
      { status: 500 }
    )
  }
}



