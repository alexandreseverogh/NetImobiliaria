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
        ti.nome as name,
        COUNT(i.id)::integer as value
      FROM imoveis i
      INNER JOIN tipos_imovel ti ON i.tipo_fk = ti.id
      WHERE i.ativo = true
    `

    const params: any[] = []
    let paramIndex = 1

    // Aplicar filtros
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
      GROUP BY ti.nome
      ORDER BY value DESC
    `

    const result = await pool.query(query, params)
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar imóveis por tipo:', error)
    return NextResponse.json({ error: 'Erro ao carregar dados' }, { status: 500 })
  }
}

