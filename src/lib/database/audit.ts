import { logAuditEvent as internalLog, findAuditLogs, AuditLog as Log } from '../audit/auditLogger'

export type AuditLog = Log

export interface AuditLogWithUser extends AuditLog {
  username: string | null
  nome: string | null
}

/**
 * Registrar log de auditoria (Wrapper para compatibilidade)
 */
export async function logAuditEvent(data: {
  userId?: string
  tenantId?: string | null
  action: string
  resourceType?: string
  resourceId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  return internalLog({
    userId: data.userId,
    tenantId: data.tenantId,
    action: data.action,
    resource: data.resourceType || 'UNKNOWN',
    resourceId: data.resourceId,
    details: data.details,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent
  })
}

/**
 * Buscar logs de auditoria com filtros (Refatorado para suportar tenant_id)
 */
export async function getAuditLogs(filters: {
  tenantId: string | null
  userId?: string
  action?: string
  resourceType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}): Promise<AuditLogWithUser[]> {
  const { logs } = await findAuditLogs({
    tenantId: filters.tenantId,
    userId: filters.userId,
    action: filters.action,
    resource: filters.resourceType,
    startDate: filters.startDate?.toISOString(),
    endDate: filters.endDate?.toISOString(),
    page: Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1,
    limit: filters.limit
  })
  
  return logs as AuditLogWithUser[]
}

/**
 * Buscar logs de um usuário específico (Refatorado com tenant_id)
 */
export async function getUserAuditLogs(
  userId: string, 
  tenantId: string | null,
  limit: number = 50
): Promise<AuditLogWithUser[]> {
  const { logs } = await findAuditLogs({
    tenantId,
    userId,
    limit
  })
  return logs as AuditLogWithUser[]
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

