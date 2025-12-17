import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

export async function GET(request: NextRequest) {
  const permissionCheck = await unifiedPermissionMiddleware(request)
  if (permissionCheck) return permissionCheck

  try {
    const { searchParams } = new URL(request.url)
    
    let query = `
      SELECT 
        i.estado_fk as name,
        COUNT(i.id)::integer as value
      FROM imoveis i
      WHERE i.ativo = true AND i.estado_fk IS NOT NULL
    `

    const params: any[] = []
    let paramIndex = 1

    if (searchParams.get('tipo_id')) {
      query += ` AND i.tipo_fk = $${paramIndex}`
      params.push(parseInt(searchParams.get('tipo_id')!))
      paramIndex++
    }

    if (searchParams.get('finalidade_id')) {
      query += ` AND i.finalidade_fk = $${paramIndex}`
      params.push(parseInt(searchParams.get('finalidade_id')!))
      paramIndex++
    }

    if (searchParams.get('status_id')) {
      query += ` AND i.status_fk = $${paramIndex}`
      params.push(parseInt(searchParams.get('status_id')!))
      paramIndex++
    }

    query += `
      GROUP BY i.estado_fk
      ORDER BY value DESC
    `

    const result = await pool.query(query, params)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar imóveis por estado:', error)
    return NextResponse.json({ error: 'Erro ao carregar dados' }, { status: 500 })
  }
}

