import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { safeParseInt } from '@/lib/utils/safeParser'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

// Interface para sessão
interface ActiveSession {
  id: number
  user_id: string
  username: string
  nome: string
  ip_address: string
  user_agent: string
  is_2fa_verified: boolean
  created_at: string
  expires_at: string
  time_remaining: string
}

// GET - Listar sessões ativas
export async function GET(request: NextRequest) {
  try {
    // Verificar permissão
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    // Extrair parâmetros de filtro
    const { searchParams } = new URL(request.url)
    const dateFilter = searchParams.get('date') || 'today' // today, week, month, custom
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = safeParseInt(searchParams.get('page'), 1, 1)
    const limit = safeParseInt(searchParams.get('limit'), 50, 1, 100)
    const offset = (page - 1) * limit

    // Construir filtro de data com parâmetros seguros
    const includeExpiredSessions = dateFilter !== 'today'
    const filters: string[] = []
    const queryParams: any[] = []
    let paramIndex = 1

    if (!includeExpiredSessions) {
      filters.push('us.expires_at > NOW()')
    }

    if (dateFilter === 'today') {
      filters.push('DATE(us.created_at) = CURRENT_DATE')
    } else if (dateFilter === 'week') {
      filters.push("us.created_at >= CURRENT_DATE - INTERVAL '7 days'")
    } else if (dateFilter === 'month') {
      filters.push("us.created_at >= CURRENT_DATE - INTERVAL '30 days'")
    } else if (dateFilter === 'custom' && startDate && endDate) {
      filters.push(`us.created_at >= $${paramIndex}::date`)
      filters.push(`us.created_at < ($${paramIndex + 1}::date + INTERVAL '1 day')`)
      queryParams.push(startDate, endDate)
      paramIndex += 2
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''

    // Query para buscar sessões ativas com dados do usuário
    const query = `
      SELECT 
        us.id,
        us.user_id,
        u.username,
        u.nome,
        COALESCE(us.ip_address::text, 'Desconhecido') as ip_address,
        'Desconhecido' as user_agent,
        false as is_2fa_verified,
        us.created_at,
        us.expires_at,
        EXTRACT(EPOCH FROM (us.expires_at - NOW())) / 60 as time_remaining_minutes
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      ${whereClause}
      ORDER BY us.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `

    // Query para contar total de registros
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      ${whereClause}
    `

    // Adicionar limit e offset aos parâmetros
    const finalParams = [...queryParams, limit, offset]

    console.log('🔍 Query params:', finalParams)

    const [result, countResult] = await Promise.all([
      pool.query(query, finalParams),
      pool.query(countQuery, queryParams)
    ])

    const total = parseInt(countResult.rows[0].total)

    // Formatar dados para o frontend
    const sessions: ActiveSession[] = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      username: row.username,
      nome: row.nome,
      ip_address: row.ip_address || 'Desconhecido',
      user_agent: row.user_agent || 'Desconhecido',
      is_2fa_verified: row.is_2fa_verified,
      created_at: row.created_at,
      expires_at: row.expires_at,
      time_remaining: formatTimeRemaining(row.time_remaining_minutes)
    }))

    return NextResponse.json({
      success: true,
      sessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      dateFilter
    })

  } catch (error) {
    console.error('Erro ao listar sessões ativas:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Função auxiliar para formatar tempo restante
function formatTimeRemaining(minutes: number): string {
  if (minutes < 0) return 'Expirada'
  if (minutes < 60) return `${Math.round(minutes)}min`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)

  if (hours < 24) {
    return `${hours}h ${remainingMinutes}min`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  return `${days}d ${remainingHours}h`
}
