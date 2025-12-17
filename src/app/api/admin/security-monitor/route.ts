import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import pool from '@/lib/database/connection'

/**
 * API de Monitoramento de Segurança
 * Retorna eventos de segurança e estatísticas do sistema
 */

// Interface para eventos de segurança
interface SecurityEvent {
  id: string
  timestamp: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  ipAddress?: string
  ip_address?: string
  userAgent?: string
  user_agent?: string
  endpoint?: string
  metadata?: Record<string, any>
  details?: Record<string, any>
  resolved?: boolean
}

export async function GET(request: NextRequest) {
  try {
    // Verificar permissões
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'events' // 'events' ou 'stats'
    const limit = parseInt(searchParams.get('limit') || '100')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('🔍 Security Monitor API:', { type, limit, startDate, endDate })

    if (type === 'stats') {
      // Retornar estatísticas
      const stats = await getSecurityStats(startDate, endDate)
      return NextResponse.json({
        success: true,
        data: stats
      })
    } else {
      // Retornar eventos
      const events = await getSecurityEvents(limit, startDate, endDate)
      return NextResponse.json({
        success: true,
        data: {
          events,
          total: events.length
        }
      })
    }
  } catch (error) {
    console.error('❌ Erro na API de Security Monitor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * Busca eventos de segurança da tabela audit_logs
 */
async function getSecurityEvents(
  limit: number,
  startDate?: string | null,
  endDate?: string | null
): Promise<SecurityEvent[]> {
  try {
    let query = `
      SELECT 
        id,
        timestamp,
        action,
        resource,
        resource_id,
        ip_address,
        user_agent,
        details,
        user_id
      FROM audit_logs
      WHERE 1=1
    `

    const params: any[] = []
    let paramIndex = 1

    // Filtro por data
    if (startDate) {
      query += ` AND timestamp >= $${paramIndex}::date`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      // Adicionar 1 dia para incluir todo o dia final
      query += ` AND timestamp < ($${paramIndex}::date + INTERVAL '1 day')`
      params.push(endDate)
      paramIndex++
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`
    params.push(limit)

    console.log('🔍 Query:', query)
    console.log('🔍 Params:', params)

    const result = await pool.query(query, params)

    // Mapear para o formato esperado pelo frontend
    const events: SecurityEvent[] = result.rows.map((row) => {
      const event = mapAuditLogToSecurityEvent(row)
      return event
    })

    console.log(`✅ ${events.length} eventos de segurança encontrados`)

    return events
  } catch (error) {
    console.error('❌ Erro ao buscar eventos de segurança:', error)
    throw error
  }
}

/**
 * Calcula estatísticas de segurança
 */
async function getSecurityStats(
  startDate?: string | null,
  endDate?: string | null
) {
  try {
    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (startDate) {
      whereClause += ` AND timestamp >= $${paramIndex}::date`
      params.push(startDate)
      paramIndex++
    }

    if (endDate) {
      whereClause += ` AND timestamp < ($${paramIndex}::date + INTERVAL '1 day')`
      params.push(endDate)
      paramIndex++
    }

    // Total de eventos
    const totalQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`
    const totalResult = await pool.query(totalQuery, params)
    const totalEvents = parseInt(totalResult.rows[0].total)

    // Eventos por tipo (baseado em action)
    const typeQuery = `
      SELECT 
        action,
        COUNT(*) as count
      FROM audit_logs
      ${whereClause}
      GROUP BY action
      ORDER BY count DESC
    `
    const typeResult = await pool.query(typeQuery, params)
    const eventsByType: Record<string, number> = {}
    typeResult.rows.forEach((row) => {
      const mappedType = mapActionToEventType(row.action)
      eventsByType[mappedType] = (eventsByType[mappedType] || 0) + parseInt(row.count)
    })

    // Eventos por severidade (baseado em action - não temos campo success)
    const severityQuery = `
      SELECT 
        CASE 
          WHEN action LIKE '%FAIL%' OR action LIKE '%ERROR%' THEN 'high'
          WHEN action IN ('DELETE', 'LOGOUT') THEN 'medium'
          ELSE 'low'
        END as severity,
        COUNT(*) as count
      FROM audit_logs
      ${whereClause}
      GROUP BY severity
    `
    const severityResult = await pool.query(severityQuery, params)
    const eventsBySeverity: Record<string, number> = {}
    severityResult.rows.forEach((row) => {
      eventsBySeverity[row.severity] = parseInt(row.count)
    })

    // Top IPs
    const ipQuery = `
      SELECT 
        ip_address::text as ip,
        COUNT(*) as count
      FROM audit_logs
      ${whereClause} AND ip_address IS NOT NULL
      GROUP BY ip_address
      ORDER BY count DESC
      LIMIT 10
    `
    const ipResult = await pool.query(ipQuery, params)
    const topIPs = ipResult.rows.map((row) => ({
      ip: row.ip,
      count: parseInt(row.count)
    }))

    // Top recursos
    const resourceQuery = `
      SELECT 
        resource as endpoint,
        COUNT(*) as count
      FROM audit_logs
      ${whereClause} AND resource IS NOT NULL
      GROUP BY resource
      ORDER BY count DESC
      LIMIT 10
    `
    const resourceResult = await pool.query(resourceQuery, params)
    const topEndpoints = resourceResult.rows.map((row) => ({
      endpoint: row.endpoint,
      count: parseInt(row.count)
    }))

    const stats = {
      totalEvents,
      eventsByType,
      eventsBySeverity,
      recentAlerts: eventsBySeverity['high'] || 0,
      topIPs,
      topEndpoints
    }

    console.log('📊 Estatísticas calculadas:', stats)

    return stats
  } catch (error) {
    console.error('❌ Erro ao calcular estatísticas:', error)
    throw error
  }
}

/**
 * Mapeia um registro de audit_log para SecurityEvent
 */
function mapAuditLogToSecurityEvent(row: any): SecurityEvent {
  // Determinar tipo de evento baseado na ação
  const type = mapActionToEventType(row.action)
  
  // Determinar severidade
  const severity = determineSeverity(row)
  
  // Criar descrição legível
  const description = createDescription(row)

  return {
    id: row.id.toString(),
    timestamp: row.timestamp,
    type,
    severity,
    description,
    ipAddress: row.ip_address ? row.ip_address.toString() : undefined,
    userAgent: row.user_agent || undefined,
    user_agent: row.user_agent || undefined,
    endpoint: row.resource,
    metadata: normalizeDetails(row.details),
    resolved: true // Todos os logs já foram processados
  }
}

function normalizeDetails(details: any): Record<string, any> {
  if (!details) {
    return {}
  }

  if (typeof details === 'object') {
    return details
  }

  if (typeof details === 'string') {
    const trimmed = details.trim()

    // Tentativa 1: JSON válido
    try {
      const parsed = JSON.parse(trimmed)
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, any>
      }
    } catch (error) {
      console.warn('⚠️ Não foi possível parsear detalhes do audit log como JSON:', error)
    }

    // Tentativa 2: formato chave: valor
    if (trimmed.includes(':')) {
    const keyValuePairs: Record<string, string> = {}
    const parts = trimmed.split(/;|\n|\|/).map((part) => part.trim()).filter(Boolean)

      parts.forEach((part) => {
        const [key, ...rest] = part.split(':')
        if (key && rest.length > 0) {
          keyValuePairs[key.trim()] = rest.join(':').trim()
        }
      })

      if (Object.keys(keyValuePairs).length > 0) {
        return keyValuePairs
      }
    }

    return { raw: trimmed }
  }

  return { raw: details }
}

/**
 * Mapeia action do audit_log para tipo de evento
 */
function mapActionToEventType(action: string): string {
  const actionLower = action.toLowerCase()
  
  if (actionLower.includes('login')) {
    return 'login_attempt'
  }
  if (actionLower.includes('logout')) {
    return 'login_attempt'
  }
  if (actionLower.includes('delete')) {
    return 'suspicious_activity'
  }
  if (actionLower.includes('update') || actionLower.includes('create')) {
    if (actionLower.includes('fail') || actionLower.includes('error')) {
      return 'invalid_input'
    }
    if (actionLower.includes('create')) {
      return 'resource_creation'
    }
    return 'resource_change'
  }
  if (actionLower.includes('error') || actionLower.includes('fail')) {
    return 'system_error'
  }
  
  return 'suspicious_activity'
}

/**
 * Determina a severidade de um evento
 */
function determineSeverity(row: any): 'low' | 'medium' | 'high' | 'critical' {
  const action = row.action.toUpperCase()
  
  // Ações com FAIL ou ERROR são de alta severidade
  if (action.includes('FAIL') || action.includes('ERROR')) {
    return 'high'
  }

  // Ações de DELETE são médias
  if (action === 'DELETE') {
    return 'medium'
  }

  // LOGIN são baixas (operação normal)
  if (action === 'LOGIN' || action === 'LOGOUT') {
    return 'low'
  }

  // Resto é baixo
  return 'low'
}

/**
 * Cria uma descrição legível para o evento
 */
function createDescription(row: any): string {
  const action = row.action
  const resource = row.resource || 'recurso'
  const resourceId = row.resource_id ? ` (ID: ${row.resource_id})` : ''
  
  if (action === 'LOGIN') {
    return 'Login realizado com sucesso'
  }
  
  if (action === 'LOGOUT') {
    return 'Usuário desconectado do sistema'
  }
  
  if (action === 'CREATE') {
    return `Criação de ${resource}${resourceId} realizada`
  }
  
  if (action === 'UPDATE') {
    return `Atualização de ${resource}${resourceId} realizada`
  }
  
  if (action === 'DELETE') {
    return `Exclusão de ${resource}${resourceId} realizada`
  }
  
  if (action.includes('FAIL') || action.includes('ERROR')) {
    return `Falha: ${action} em ${resource}`
  }
  
  return `Ação "${action}" em ${resource}`
}
