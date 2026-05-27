export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { safeParseInt } from '@/lib/utils/safeParser'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { getTenantFilterFromRequest } from '@/lib/auth/get-tenant-from-token'

export async function GET(request: NextRequest) {
  // Verificar permissões via middleware unificado
  const permissionCheck = await unifiedPermissionMiddleware(request)
  if (permissionCheck) return permissionCheck

  try {
    // ✅ Isolamento multi-tenant
    const tenantId = await getTenantFilterFromRequest(request)
    if (tenantId === undefined) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 })
    }

    // Extrair parâmetros de filtro
    const { searchParams } = new URL(request.url)
    const page = safeParseInt(searchParams.get('page'), 1, 1)
    const limit = safeParseInt(searchParams.get('limit'), 50, 1, 100)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const search = searchParams.get('search')

    const params: any[] = []
    let paramCount = 0

    // ─── Construir query base com filtro de tenant ─────────────────────────
    // Master (tenantId=null) vê tudo; admin vê só o seu tenant
    let baseFilter = '1=1'
    if (tenantId !== null) {
      paramCount++
      baseFilter = `al.tenant_id = $${paramCount}`
      params.push(tenantId)
    }

    let query = `
      SELECT
        al.id,
        al.user_id,
        al.public_user_uuid,
        al.user_type,
        al.action,
        al.resource,
        al.resource_id,
        al.details,
        al.ip_address,
        al.user_agent,
        al.tenant_id,
        al.timestamp as created_at,
        u.username,
        u.nome
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE ${baseFilter}
    `

    // Aplicar filtros adicionais
    if (startDate) {
      paramCount++
      query += ` AND DATE(al.timestamp) >= $${paramCount}`
      params.push(startDate)
    }

    if (endDate) {
      paramCount++
      query += ` AND DATE(al.timestamp) <= $${paramCount}`
      params.push(endDate)
    }

    if (userId) {
      paramCount++
      query += ` AND al.user_id = $${paramCount}`
      params.push(userId)
    }

    if (action) {
      paramCount++
      query += ` AND al.action = $${paramCount}`
      params.push(action)
    }

    if (search) {
      paramCount++
      query += ` AND (
        al.action ILIKE $${paramCount} OR
        al.resource ILIKE $${paramCount} OR
        u.username ILIKE $${paramCount} OR
        u.nome ILIKE $${paramCount} OR
        al.details::text ILIKE $${paramCount}
      )`
      params.push(`%${search}%`)
    }

    // Paginação
    query += ` ORDER BY al.timestamp DESC`
    const offset = (page - 1) * limit

    paramCount++
    query += ` LIMIT $${paramCount}`
    params.push(limit)

    paramCount++
    query += ` OFFSET $${paramCount}`
    params.push(offset)

    const result = await pool.query(query, params)

    // ─── Contagem total ────────────────────────────────────────────────────
    let countParams: any[] = []
    let countParamCount = 0
    let countBaseFilter = '1=1'

    if (tenantId !== null) {
      countParamCount++
      countBaseFilter = `al.tenant_id = $${countParamCount}`
      countParams.push(tenantId)
    }

    let countQuery = `
      SELECT COUNT(*) as total
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE ${countBaseFilter}
    `

    if (startDate) { countParamCount++; countQuery += ` AND DATE(al.timestamp) >= $${countParamCount}`; countParams.push(startDate) }
    if (endDate) { countParamCount++; countQuery += ` AND DATE(al.timestamp) <= $${countParamCount}`; countParams.push(endDate) }
    if (userId) { countParamCount++; countQuery += ` AND al.user_id = $${countParamCount}`; countParams.push(userId) }
    if (action) { countParamCount++; countQuery += ` AND al.action = $${countParamCount}`; countParams.push(action) }
    if (search) { countParamCount++; countQuery += ` AND (al.action ILIKE $${countParamCount} OR al.resource ILIKE $${countParamCount} OR u.username ILIKE $${countParamCount} OR u.nome ILIKE $${countParamCount} OR al.details::text ILIKE $${countParamCount})`; countParams.push(`%${search}%`) }

    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    // ─── Estatísticas ──────────────────────────────────────────────────────
    let statsParams: any[] = []
    let statsParamCount = 0
    let statsBaseFilter = '1=1'

    if (tenantId !== null) {
      statsParamCount++
      statsBaseFilter = `al.tenant_id = $${statsParamCount}`
      statsParams.push(tenantId)
    }

    let statsQuery = `
      SELECT
        SUM(CASE WHEN al.user_type = 'admin' THEN 1 ELSE 0 END)::int AS admin,
        SUM(CASE WHEN al.user_type = 'cliente' THEN 1 ELSE 0 END)::int AS cliente,
        SUM(CASE WHEN al.user_type = 'proprietario' THEN 1 ELSE 0 END)::int AS proprietario,
        SUM(CASE WHEN al.user_type IS NULL OR TRIM(al.user_type) = '' THEN 1 ELSE 0 END)::int AS indefinido
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE ${statsBaseFilter}
    `

    if (startDate) { statsParamCount++; statsQuery += ` AND DATE(al.timestamp) >= $${statsParamCount}`; statsParams.push(startDate) }
    if (endDate) { statsParamCount++; statsQuery += ` AND DATE(al.timestamp) <= $${statsParamCount}`; statsParams.push(endDate) }
    if (userId) { statsParamCount++; statsQuery += ` AND al.user_id = $${statsParamCount}`; statsParams.push(userId) }
    if (action) { statsParamCount++; statsQuery += ` AND al.action = $${statsParamCount}`; statsParams.push(action) }
    if (search) { statsParamCount++; statsQuery += ` AND (al.action ILIKE $${statsParamCount} OR al.resource ILIKE $${statsParamCount} OR u.username ILIKE $${statsParamCount} OR u.nome ILIKE $${statsParamCount} OR al.details::text ILIKE $${statsParamCount})`; statsParams.push(`%${search}%`) }

    const statsResult = await pool.query(statsQuery, statsParams)
    const statsRow = statsResult.rows[0] || { admin: 0, cliente: 0, proprietario: 0, indefinido: 0 }

    const stats = {
      total,
      admin: Number(statsRow.admin ?? 0),
      cliente: Number(statsRow.cliente ?? 0),
      proprietario: Number(statsRow.proprietario ?? 0),
      indefinido: Number(statsRow.indefinido ?? 0)
    }

    return NextResponse.json({
      success: true,
      data: {
        logs: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        stats
      }
    })

  } catch (error) {
    console.error('❌ Erro na API de auditoria:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
