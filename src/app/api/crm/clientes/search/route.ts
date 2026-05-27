import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''

    if (q.length < 3) {
      return NextResponse.json({ success: true, clientes: [] })
    }

    const query = `
      SELECT uuid, nome, email, telefone, cpf 
      FROM clientes 
      WHERE nome ILIKE $1 OR email ILIKE $1 OR telefone ILIKE $1 OR cpf ILIKE $1
      ORDER BY nome ASC
      LIMIT 10
    `
    const { rows } = await pool.query(query, [`%${q}%`])

    return NextResponse.json({ success: true, clientes: rows })

  } catch (error: any) {
    console.error('[CRM_CLIENTES_SEARCH]', error)
    return NextResponse.json({ success: false, error: 'Erro ao buscar clientes.' }, { status: 500 })
  }
}
