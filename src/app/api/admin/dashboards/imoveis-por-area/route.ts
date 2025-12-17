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
        CASE 
          WHEN area_total IS NULL OR area_total <= 0 THEN 'Não informado'
          WHEN area_total <= 50 THEN 'Até 50 m²'
          WHEN area_total > 50 AND area_total <= 100 THEN '51 - 100 m²'
          WHEN area_total > 100 AND area_total <= 150 THEN '101 - 150 m²'
          WHEN area_total > 150 AND area_total <= 200 THEN '151 - 200 m²'
          ELSE 'Acima de 200 m²'
        END as name,
        COUNT(*)::integer as value
      FROM imoveis i
      WHERE i.ativo = true
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

    if (searchParams.get('estado_id')) {
      query += ` AND i.estado_fk = $${paramIndex}`
      params.push(searchParams.get('estado_id')!)
      paramIndex++
    }

    if (searchParams.get('cidade_id')) {
      query += ` AND i.cidade_fk = $${paramIndex}`
      params.push(searchParams.get('cidade_id')!)
      paramIndex++
    }

    if (searchParams.get('bairro')) {
      query += ` AND LOWER(i.bairro) LIKE LOWER($${paramIndex})`
      params.push(`%${searchParams.get('bairro')}%`)
      paramIndex++
    }

    query += `
      GROUP BY 1
      ORDER BY 
        CASE 
          WHEN MIN(CASE WHEN area_total IS NULL OR area_total <= 0 THEN 0 WHEN area_total <= 50 THEN 1 WHEN area_total <= 100 THEN 2 WHEN area_total <= 150 THEN 3 WHEN area_total <= 200 THEN 4 ELSE 5 END) < 1 THEN 0
          ELSE MIN(CASE WHEN area_total IS NULL OR area_total <= 0 THEN 0 WHEN area_total <= 50 THEN 1 WHEN area_total <= 100 THEN 2 WHEN area_total <= 150 THEN 3 WHEN area_total <= 200 THEN 4 ELSE 5 END)
        END
    `

    const result = await pool.query(query, params)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar imóveis por área:', error)
    return NextResponse.json({ error: 'Erro ao carregar dados' }, { status: 500 })
  }
}

