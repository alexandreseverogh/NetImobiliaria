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
          WHEN quartos IS NULL THEN 'Não informado'
          WHEN quartos = 0 THEN '0 quartos'
          WHEN quartos = 1 THEN '1 quarto'
          WHEN quartos = 2 THEN '2 quartos'
          WHEN quartos = 3 THEN '3 quartos'
          WHEN quartos = 4 THEN '4 quartos'
          WHEN quartos > 4 THEN 'Acima de 4 quartos'
          ELSE 'Não informado'
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
      ORDER BY MIN(COALESCE(quartos, -1))
    `

    const result = await pool.query(query, params)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar imóveis por quartos:', error)
    return NextResponse.json({ error: 'Erro ao carregar dados' }, { status: 500 })
  }
}

