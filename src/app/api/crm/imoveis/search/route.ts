import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''

    if (q.length < 2) {
      return NextResponse.json({ success: true, imoveis: [] })
    }

    const isNumeric = /^\d+$/.test(q);

    let query = ''
    let values: any[] = []

    if (isNumeric) {
        query = `
          SELECT id, titulo, bairro, preco 
          FROM imoveis 
          WHERE id::text = $1
          LIMIT 10
        `
        values = [q]
    } else {
        query = `
          SELECT id, titulo, bairro, preco 
          FROM imoveis 
          WHERE titulo ILIKE $1 OR bairro ILIKE $1
          ORDER BY titulo ASC
          LIMIT 10
        `
        values = [`%${q}%`]
    }

    const { rows } = await pool.query(query, values)

    return NextResponse.json({ success: true, imoveis: rows })

  } catch (error: any) {
    console.error('[CRM_IMOVEIS_SEARCH]', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar imóveis.' }, { status: 500 })
  }
}
