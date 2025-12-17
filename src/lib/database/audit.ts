import pool from './connection'
import { QueryResult } from 'pg'

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  details: any
  ip_address: string | null
  user_agent: string | null
  created_at: Date
}

export interface AuditLogWithUser extends AuditLog {
  username: string | null
  nome: string | null
  cargo: string | null
}

/**
 * Registrar log de auditoria
 */
export async function logAuditEvent(data: {
  userId?: string
  action: string
  resourceType?: string
  resourceId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  console.log('🔍 Audit log:', data.action, 'para usuário:', data.userId)
  
  // Sistema de auditoria reativado conforme Guardian Rules
  
  try {
    const query = `
      INSERT INTO audit_logs (
        user_id, action, resource, resource_id, 
        details, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `
    
    const values = [
      data.userId || null,
      data.action,
      data.resourceType || null,
      data.resourceId || null,
      data.details ? JSON.stringify(data.details) : null,
      data.ipAddress || null,
      data.userAgent || null
    ]
    
    await pool.query(query, values)
  } catch (error) {
    console.error('❌ Erro ao registrar log de auditoria:', error)
    // Não lançar erro para não interromper operações principais
  }
}

/**
 * Buscar logs de auditoria com filtros
 */
export async function getAuditLogs(filters: {
  userId?: string
  action?: string
  resourceType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
} = {}): Promise<AuditLogWithUser[]> {
  try {
    let query = `
      SELECT 
        al.id, al.user_id, al.action, al.resource_type, al.resource_id,
        al.details, al.ip_address, al.user_agent, al.created_at,
        u.username, u.nome
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `
    
    const values: any[] = []
    let paramIndex = 1
    
    if (filters.userId) {
      query += ` AND al.user_id = $${paramIndex}`
      values.push(filters.userId)
      paramIndex++
    }
    
    if (filters.action) {
      query += ` AND al.action = $${paramIndex}`
      values.push(filters.action)
      paramIndex++
    }
    
    if (filters.resourceType) {
      query += ` AND al.resource_type = $${paramIndex}`
      values.push(filters.resourceType)
      paramIndex++
    }
    
    if (filters.startDate) {
      query += ` AND al.created_at >= $${paramIndex}`
      values.push(filters.startDate)
      paramIndex++
    }
    
    if (filters.endDate) {
      query += ` AND al.created_at <= $${paramIndex}`
      values.push(filters.endDate)
      paramIndex++
    }
    
    query += ` ORDER BY al.created_at DESC`
    
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`
      values.push(filters.limit)
      paramIndex++
    }
    
    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`
      values.push(filters.offset)
      paramIndex++
    }
    
    const result: QueryResult<AuditLogWithUser> = await pool.query(query, values)
    return result.rows
  } catch (error) {
    console.error('❌ Erro ao buscar logs de auditoria:', error)
    throw new Error('Erro ao buscar logs de auditoria')
  }
}

/**
 * Buscar logs de um usuário específico
 */
export async function getUserAuditLogs(
  userId: string, 
  limit: number = 50
): Promise<AuditLogWithUser[]> {
  try {
    const query = `
      SELECT 
        al.id, al.user_id, al.action, al.resource_type, al.resource_id,
        al.details, al.ip_address, al.user_agent, al.created_at,
        u.username, u.nome
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.user_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2
    `
    
    const result: QueryResult<AuditLogWithUser> = await pool.query(query, [userId, limit])
    return result.rows
  } catch (error) {
    console.error('❌ Erro ao buscar logs do usuário:', error)
    throw new Error('Erro ao buscar logs do usuário')
  }
}

/**
 * Buscar logs de uma ação específica
 */
export async function getActionAuditLogs(
  action: string, 
  limit: number = 100
): Promise<AuditLogWithUser[]> {
  try {
    const query = `
      SELECT 
        al.id, al.user_id, al.action, al.resource_type, al.resource_id,
        al.details, al.ip_address, al.user_agent, al.created_at,
        u.username, u.nome
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.action = $1
      ORDER BY al.created_at DESC
      LIMIT $2
    `
    
    const result: QueryResult<AuditLogWithUser> = await pool.query(query, [action, limit])
    return result.rows
  } catch (error) {
    console.error('❌ Erro ao buscar logs da ação:', error)
    throw new Error('Erro ao buscar logs da ação')
  }
}

/**
 * Estatísticas de auditoria
 */
export async function getAuditStats(): Promise<{
  totalLogs: number
  todayLogs: number
  topActions: { action: string; count: number }[]
  topUsers: { username: string; count: number }[]
}> {
  try {
    // Total de logs
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM audit_logs')
    const totalLogs = parseInt(totalResult.rows[0].count)
    
    // Logs de hoje
    const todayResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM audit_logs 
      WHERE DATE(created_at) = CURRENT_DATE
    `)
    const todayLogs = parseInt(todayResult.rows[0].count)
    
    // Ações mais comuns
    const actionsResult = await pool.query(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      GROUP BY action
      ORDER BY count DESC
      LIMIT 5
    `)
    const topActions = actionsResult.rows.map(row => ({
      action: row.action,
      count: parseInt(row.count)
    }))
    
    // Usuários mais ativos
    const usersResult = await pool.query(`
      SELECT u.username, COUNT(*) as count
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      WHERE al.user_id IS NOT NULL
      GROUP BY u.username
      ORDER BY count DESC
      LIMIT 5
    `)
    const topUsers = usersResult.rows.map(row => ({
      username: row.username,
      count: parseInt(row.count)
    }))
    
    return {
      totalLogs,
      todayLogs,
      topActions,
      topUsers
    }
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas de auditoria:', error)
    throw new Error('Erro ao buscar estatísticas de auditoria')
  }
}

/**
 * Limpar logs antigos (manutenção)
 */
export async function cleanupOldAuditLogs(daysToKeep: number = 90): Promise<number> {
  try {
    const query = `
      DELETE FROM audit_logs 
      WHERE created_at < CURRENT_DATE - INTERVAL '${daysToKeep} days'
    `
    const result = await pool.query(query)
    return result.rowCount || 0
  } catch (error) {
    console.error('❌ Erro ao limpar logs antigos:', error)
    throw new Error('Erro ao limpar logs antigos')
  }
}

