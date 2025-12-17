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
          WHEN preco IS NULL OR preco <= 0 THEN 'Sem preço informado'
          WHEN preco <= 100000 THEN 'Até R$ 100 mil'
          WHEN preco > 100000 AND preco <= 150000 THEN 'R$ 101 - 150 mil'
          WHEN preco > 150000 AND preco <= 200000 THEN 'R$ 151 - 200 mil'
          WHEN preco > 200000 AND preco <= 250000 THEN 'R$ 201 - 250 mil'
          WHEN preco > 250000 AND preco <= 300000 THEN 'R$ 251 - 300 mil'
          WHEN preco > 300000 AND preco <= 400000 THEN 'R$ 301 - 400 mil'
          WHEN preco > 400000 AND preco <= 500000 THEN 'R$ 401 - 500 mil'
          WHEN preco > 500000 AND preco <= 600000 THEN 'R$ 501 - 600 mil'
          WHEN preco > 600000 AND preco <= 700000 THEN 'R$ 601 - 700 mil'
          WHEN preco > 700000 AND preco <= 800000 THEN 'R$ 701 - 800 mil'
          WHEN preco > 800000 AND preco <= 900000 THEN 'R$ 801 - 900 mil'
          WHEN preco > 900000 AND preco <= 1000000 THEN 'R$ 901 mil - 1 milhão'
          WHEN preco > 1000000 AND preco <= 1500000 THEN 'R$ 1 - 1,5 milhão'
          WHEN preco > 1500000 AND preco <= 2000000 THEN 'R$ 1,5 - 2 milhões'
          WHEN preco > 2000000 AND preco <= 3000000 THEN 'R$ 2 - 3 milhões'
          ELSE 'Acima de R$ 3 milhões'
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
          WHEN MIN(CASE WHEN preco IS NULL OR preco <= 0 THEN 0 WHEN preco <= 100000 THEN 1 WHEN preco <= 150000 THEN 2 WHEN preco <= 200000 THEN 3 WHEN preco <= 250000 THEN 4 WHEN preco <= 300000 THEN 5 WHEN preco <= 400000 THEN 6 WHEN preco <= 500000 THEN 7 WHEN preco <= 600000 THEN 8 WHEN preco <= 700000 THEN 9 WHEN preco <= 800000 THEN 10 WHEN preco <= 900000 THEN 11 WHEN preco <= 1000000 THEN 12 WHEN preco <= 1500000 THEN 13 WHEN preco <= 2000000 THEN 14 WHEN preco <= 3000000 THEN 15 ELSE 16 END) < 1 THEN 0
          ELSE MIN(CASE WHEN preco IS NULL OR preco <= 0 THEN 0 WHEN preco <= 100000 THEN 1 WHEN preco <= 150000 THEN 2 WHEN preco <= 200000 THEN 3 WHEN preco <= 250000 THEN 4 WHEN preco <= 300000 THEN 5 WHEN preco <= 400000 THEN 6 WHEN preco <= 500000 THEN 7 WHEN preco <= 600000 THEN 8 WHEN preco <= 700000 THEN 9 WHEN preco <= 800000 THEN 10 WHEN preco <= 900000 THEN 11 WHEN preco <= 1000000 THEN 12 WHEN preco <= 1500000 THEN 13 WHEN preco <= 2000000 THEN 14 WHEN preco <= 3000000 THEN 15 ELSE 16 END)
        END
    `

    const result = await pool.query(query, params)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar imóveis por faixa de preço:', error)
    return NextResponse.json({ error: 'Erro ao carregar dados' }, { status: 500 })
  }
}

